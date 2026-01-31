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
    const allFlat = searchParams.get('allFlat') // 모든 프로젝트를 플랫하게 반환

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (!allFlat) {
      if (parentId === 'null') {
        where.parentId = null
      } else if (parentId) {
        where.parentId = parentId
      }
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
            assignees: assigneesInclude,
            subProjects: {
              include: {
                assignees: assigneesInclude,
                subProjects: {
                  include: {
                    assignees: assigneesInclude,
                  },
                },
              },
            },
          },
        },
        assignees: assigneesInclude,
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

interface AssigneeInput {
  userId: string
  role?: string
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

    // assigneesWithTasks가 있으면 tasks 포함 생성, 아니면 기존 방식
    let assigneesCreate
    if (assigneesWithTasks?.length) {
      assigneesCreate = {
        create: assigneesWithTasks.map((a: AssigneeInput) => ({
          userId: a.userId,
          role: a.role || 'support',
          tasks: a.tasks?.length
            ? {
                create: a.tasks.map((title: string) => ({
                  title,
                })),
              }
            : undefined,
        })),
      }
    } else if (assigneeIds?.length) {
      assigneesCreate = {
        create: assigneeIds.map((userId: string, index: number) => ({
          userId,
          role: index === 0 ? 'lead' : 'support',
        })),
      }
    }

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
        assignees: assigneesCreate,
      },
      include: {
        parent: true,
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
