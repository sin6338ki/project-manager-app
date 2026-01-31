import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const attendeesInclude = {
  include: {
    user: true,
  },
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    const where: Record<string, unknown> = {}

    if (year && month) {
      const startDate = new Date(Number(year), Number(month) - 1, 1)
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59)
      where.date = {
        gte: startDate,
        lte: endDate,
      }
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        attendees: attendeesInclude,
      },
      orderBy: {
        date: 'asc',
      },
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Failed to fetch calendar events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    )
  }
}

interface AttendeeInput {
  userId: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      type,
      title,
      date,
      startTime,
      endTime,
      location,
      content,
      purpose,
      result,
      attendeeIds,
    } = body

    const event = await prisma.calendarEvent.create({
      data: {
        type,
        title,
        date: new Date(date),
        startTime: startTime || null,
        endTime: endTime || null,
        location: location || null,
        content: content || null,
        purpose: purpose || null,
        result: result || null,
        attendees: attendeeIds?.length
          ? {
              create: attendeeIds.map((userId: string) => ({
                userId,
              })),
            }
          : undefined,
      },
      include: {
        attendees: attendeesInclude,
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Failed to create calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    )
  }
}
