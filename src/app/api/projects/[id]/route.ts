import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        parent: true,
        subProjects: {
          include: {
            assignees: {
              include: {
                user: true,
              },
            },
          },
        },
        assignees: {
          include: {
            user: true,
          },
        },
        comments: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        milestones: {
          orderBy: {
            dueDate: 'asc',
          },
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
      assigneeIds,
    } = body

    const updateData: Record<string, unknown> = {}

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (goal !== undefined) updateData.goal = goal
    if (keyResults !== undefined) updateData.keyResults = keyResults
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (startDate !== undefined)
      updateData.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined)
      updateData.endDate = endDate ? new Date(endDate) : null
    if (progress !== undefined) updateData.progress = progress

    if (assigneeIds !== undefined) {
      await prisma.projectAssignee.deleteMany({
        where: { projectId: id },
      })

      if (assigneeIds.length > 0) {
        await prisma.projectAssignee.createMany({
          data: assigneeIds.map((userId: string, index: number) => ({
            projectId: id,
            userId,
            role: index === 0 ? 'lead' : 'member',
          })),
        })
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        subProjects: true,
        assignees: {
          include: {
            user: true,
          },
        },
        milestones: true,
      },
    })

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
    await prisma.project.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
