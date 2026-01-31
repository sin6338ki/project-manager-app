import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const attendeesInclude = {
  include: {
    user: true,
  },
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const updateData: Record<string, unknown> = {}

    if (type !== undefined) updateData.type = type
    if (title !== undefined) updateData.title = title
    if (date !== undefined) updateData.date = new Date(date)
    if (startTime !== undefined) updateData.startTime = startTime || null
    if (endTime !== undefined) updateData.endTime = endTime || null
    if (location !== undefined) updateData.location = location || null
    if (content !== undefined) updateData.content = content || null
    if (purpose !== undefined) updateData.purpose = purpose || null
    if (result !== undefined) updateData.result = result || null

    if (attendeeIds !== undefined) {
      await prisma.calendarAttendee.deleteMany({
        where: { eventId: id },
      })

      if (attendeeIds.length > 0) {
        await prisma.calendarAttendee.createMany({
          data: attendeeIds.map((userId: string) => ({
            eventId: id,
            userId,
          })),
        })
      }
    }

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        attendees: attendeesInclude,
      },
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('Failed to update calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to update calendar event' },
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
    await prisma.calendarEvent.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to delete calendar event' },
      { status: 500 }
    )
  }
}
