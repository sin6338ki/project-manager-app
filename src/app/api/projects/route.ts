import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const parentId = searchParams.get('parentId')
    const userId = searchParams.get('userId')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (parentId === 'null') {
      where.parentId = null
    } else if (parentId) {
      where.parentId = parentId
    }

    if (userId) {
      where.assignees = {
        some: {
          userId: userId,
        },
      }
    }

    const projects = await prisma.project.findMany({
      where,
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
        milestones: true,
        _count: {
          select: {
            subProjects: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
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
    } = body

    const project = await prisma.project.create({
      data: {
        name,
        description,
        goal,
        keyResults,
        status: status || 'NOT_STARTED',
        priority: priority || 'MEDIUM',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        parentId: parentId || null,
        assignees: assigneeIds?.length
          ? {
              create: assigneeIds.map((userId: string, index: number) => ({
                userId,
                role: index === 0 ? 'lead' : 'member',
              })),
            }
          : undefined,
      },
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

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
