import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/quotes - 모든 명언 조회 또는 랜덤 명언 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const random = searchParams.get('random')

    if (random === 'true') {
      // 랜덤 명언 1개 조회
      const count = await prisma.quote.count()
      if (count === 0) {
        return NextResponse.json(null)
      }
      const skip = Math.floor(Math.random() * count)
      const quote = await prisma.quote.findFirst({
        skip,
      })
      return NextResponse.json(quote)
    }

    // 모든 명언 조회
    const quotes = await prisma.quote.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(quotes)
  } catch (error) {
    console.error('Failed to fetch quotes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    )
  }
}

// POST /api/quotes - 새 명언 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, author } = body

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const quote = await prisma.quote.create({
      data: {
        content,
        author,
      },
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error('Failed to create quote:', error)
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    )
  }
}
