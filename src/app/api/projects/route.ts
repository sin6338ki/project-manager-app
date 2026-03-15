import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 담당자 include (tasks 포함)
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const parentId = searchParams.get('parentId')
    const userId = searchParams.get('userId')
    const allFlat = searchParams.get('allFlat')

    const where: Record<string, unknown> = {}

    if (status) where.status = status

    if (!allFlat) {
      if (parentId === 'null') {
        where.parentId = null
      } else if (parentId) {
        where.parentId = parentId
      }
    }

    if (userId) {
      where.assignees = { some: { userId } }
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        parent: {
          include: {
            parent: {
              include: { parent: true },
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
        milestones: true,
        _count: {
          select: { subProjects: true, comments: true },
        },
      },
      orderBy: parentId === 'null'
        ? [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }]
        : { createdAt: 'desc' as const },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

interface AssigneeInput {
  userId: string
  tasks?: string[]
}

export async function POST(request: NextRequest) {
  try {
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
      parentId,
      assigneeIds,
      assigneesWithTasks,
    } = body

    // assigneesWithTasks가 있으면 tasks 포함 생성, 아니면 assigneeIds 방식
    let assigneesCreate
    if (assigneesWithTasks?.length) {
      assigneesCreate = {
        create: assigneesWithTasks.map((a: AssigneeInput) => ({
          userId: a.userId,
          role: 'member',
          tasks: a.tasks?.length
            ? { create: a.tasks.map((title: string) => ({ title })) }
            : undefined,
        })),
      }
    } else if (assigneeIds?.length) {
      assigneesCreate = {
        create: assigneeIds.map((userId: string) => ({
          userId,
          role: 'member',
        })),
      }
    }

    // 최상위 프로젝트(parentId 없음)이면 sortOrder를 현재 최대값+1로 설정
    let sortOrder = 0
    if (!parentId) {
      const last = await prisma.project.findFirst({
        where: { parentId: null },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      })
      sortOrder = (last?.sortOrder ?? -1) + 1
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        goal: goal || null,
        keyResults: keyResults || null,
        status: status || 'NOT_STARTED',
        priority: priority || 'MEDIUM',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        parentId: parentId || null,
        sortOrder,
        assignees: assigneesCreate,
      },
      include: {
        parent: {
          include: { parent: { include: { parent: true } } },
        },
        subProjects: true,
        assignees: assigneesInclude,
        milestones: true,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
