import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const assigneesInclude = {
  include: {
    user: true,
    tasks: {
      orderBy: {
        createdAt: 'asc' as const,
      },
    },
  },
}

// 상위 프로젝트 상태/진행률 재귀 업데이트
async function propagateToParent(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { subProjects: true },
  })
  if (!project || !project.parentId) return

  const siblings = await prisma.project.findMany({
    where: { parentId: project.parentId },
  })

  if (siblings.length === 0) return

  const statuses = siblings.map((s) => s.status)
  let newStatus: string
  if (statuses.every((s) => s === 'COMPLETED')) newStatus = 'COMPLETED'
  else if (statuses.every((s) => s === 'NOT_STARTED')) newStatus = 'NOT_STARTED'
  else newStatus = 'IN_PROGRESS'

  const total = siblings.reduce((sum, s) => sum + (s.progress || 0), 0)
  const newProgress = Math.round(total / siblings.length)

  await prisma.project.update({
    where: { id: project.parentId },
    data: { status: newStatus, progress: newProgress },
  })

  // 재귀: 부모의 부모도 업데이트
  await propagateToParent(project.parentId)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        parent: {
          include: {
            parent: {
              include: {
                parent: true,
              },
            },
          },
        },
        subProjects: {
          include: {
            parent: { select: { id: true, parentId: true } },
            assignees: assigneesInclude,
            subProjects: {
              include: {
                parent: { select: { id: true, parentId: true } },
                assignees: assigneesInclude,
                subProjects: {
                  include: {
                    parent: { select: { id: true, parentId: true } },
                    assignees: assigneesInclude,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        assignees: assigneesInclude,
        comments: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
        milestones: {
          orderBy: { dueDate: 'asc' },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Failed to fetch project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

interface AssigneeWithTasksInput {
  userId: string
  role?: string
  tasks?: string[]
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      description,
      goal,
      keyResults,
      status,
      priority,
      startDate,
      endDate,
      progress,
      parentId,
      assigneeIds,
      assigneesWithTasks,
    } = body

    const updateData: Record<string, unknown> = {}

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (goal !== undefined) updateData.goal = goal
    if (keyResults !== undefined) updateData.keyResults = keyResults
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (parentId !== undefined) updateData.parentId = parentId || null
    if (startDate !== undefined)
      updateData.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined)
      updateData.endDate = endDate ? new Date(endDate) : null
    if (progress !== undefined) updateData.progress = parseInt(String(progress), 10)

    // assigneesWithTasks가 있으면 tasks 포함 업데이트
    if (assigneesWithTasks !== undefined) {
      await prisma.projectAssignee.deleteMany({ where: { projectId: id } })
      if (assigneesWithTasks.length > 0) {
        for (const a of assigneesWithTasks as AssigneeWithTasksInput[]) {
          await prisma.projectAssignee.create({
            data: {
              projectId: id,
              userId: a.userId,
              role: 'member',
              tasks: a.tasks?.length
                ? { create: a.tasks.map((title: string) => ({ title })) }
                : undefined,
            },
          })
        }
      }
    } else if (assigneeIds !== undefined) {
      await prisma.projectAssignee.deleteMany({ where: { projectId: id } })
      if (assigneeIds.length > 0) {
        await prisma.projectAssignee.createMany({
          data: assigneeIds.map((userId: string) => ({
            projectId: id,
            userId,
            role: 'member',
          })),
        })
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
          include: { parent: { include: { parent: true } } },
        },
        subProjects: true,
        assignees: assigneesInclude,
        milestones: true,
      },
    })

    // 하위→상위 상태/진행률 자동 전파
    await propagateToParent(id)

    return NextResponse.json(project)
  } catch (error) {
    console.error('Failed to update project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 삭제 전 부모 ID 확인 (삭제 후 전파용)
    const project = await prisma.project.findUnique({
      where: { id },
      select: { parentId: true },
    })

    await prisma.project.delete({ where: { id } })

    // 삭제 후 남은 형제 기준으로 부모 업데이트
    if (project?.parentId) {
      const siblings = await prisma.project.findMany({
        where: { parentId: project.parentId },
      })
      if (siblings.length > 0) {
        const statuses = siblings.map((s) => s.status)
        let newStatus: string
        if (statuses.every((s) => s === 'COMPLETED')) newStatus = 'COMPLETED'
        else if (statuses.every((s) => s === 'NOT_STARTED')) newStatus = 'NOT_STARTED'
        else newStatus = 'IN_PROGRESS'
        const total = siblings.reduce((sum, s) => sum + (s.progress || 0), 0)
        const newProgress = Math.round(total / siblings.length)
        await prisma.project.update({
          where: { id: project.parentId },
          data: { status: newStatus, progress: newProgress },
        })
        await propagateToParent(project.parentId)
      } else {
        // 자식이 없어지면 부모 상태 초기화
        await prisma.project.update({
          where: { id: project.parentId },
          data: { status: 'NOT_STARTED', progress: 0 },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
