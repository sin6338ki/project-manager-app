import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const body = await request.json()
    const { content, userId } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // userId가 없으면 첫 번째 유저를 기본값으로 사용 (임시)
    let resolvedUserId = userId
    if (!resolvedUserId) {
      const firstUser = await prisma.user.findFirst()
      if (!firstUser) {
        return NextResponse.json({ error: 'No user found' }, { status: 400 })
      }
      resolvedUserId = firstUser.id
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        projectId,
        userId: resolvedUserId,
      },
      include: { user: true },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Failed to create comment:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json({ error: 'commentId is required' }, { status: 400 })
    }

    await prisma.comment.delete({ where: { id: commentId, projectId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete comment:', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
