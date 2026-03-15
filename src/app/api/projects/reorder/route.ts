import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 최상위 프로젝트 순서 일괄 업데이트
// body: { orderedIds: string[] }
export async function POST(request: NextRequest) {
  try {
    const { orderedIds } = await request.json()

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds must be an array' }, { status: 400 })
    }

    // 각 프로젝트의 sortOrder를 인덱스 값으로 업데이트
    await Promise.all(
      orderedIds.map((id: string, index: number) =>
        prisma.project.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to reorder projects:', error)
    return NextResponse.json({ error: 'Failed to reorder projects' }, { status: 500 })
  }
}
