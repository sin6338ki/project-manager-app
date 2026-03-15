import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 이번 주 월요일 날짜 반환 (시간은 00:00:00 UTC)
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getUTCDay() // 0=일, 1=월 ...
  const diff = (day === 0 ? -6 : 1 - day)
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

// GET /api/books - 이번 주 책 추천 조회 (없으면 가장 최근 주차 것 반환)
// GET /api/books?all=true - 전체 책 추천 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all')

    if (all === 'true') {
      const books = await prisma.bookRecommendation.findMany({
        orderBy: { weekStart: 'desc' },
      })
      return NextResponse.json(books)
    }

    const thisWeek = getWeekStart(new Date())

    // 이번 주 책 추천 조회
    let book = await prisma.bookRecommendation.findFirst({
      where: { weekStart: thisWeek },
    })

    // 없으면 가장 최근 것 반환
    if (!book) {
      book = await prisma.bookRecommendation.findFirst({
        orderBy: { weekStart: 'desc' },
      })
    }

    return NextResponse.json(book)
  } catch (error) {
    console.error('Failed to fetch book recommendation:', error)
    return NextResponse.json({ error: 'Failed to fetch book recommendation' }, { status: 500 })
  }
}

// POST /api/books - 이번 주 책 추천 등록/수정
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, author, description } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const weekStart = getWeekStart(new Date())

    // upsert: 이번 주 것이 있으면 업데이트, 없으면 생성
    const book = await prisma.bookRecommendation.upsert({
      where: { weekStart },
      update: { title, author: author || null, description: description || null },
      create: { title, author: author || null, description: description || null, weekStart },
    })

    return NextResponse.json(book, { status: 201 })
  } catch (error) {
    console.error('Failed to save book recommendation:', error)
    return NextResponse.json({ error: 'Failed to save book recommendation' }, { status: 500 })
  }
}
