'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Clock,
  Users,
  Target,
  FileText,
  X,
  Edit,
  Trash2,
  CalendarIcon,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { User } from '@/types'

interface CalendarAttendee {
  id: string
  userId: string
  user?: User
}

interface CalendarEvent {
  id: string
  type: 'schedule' | 'meeting'
  title: string
  date: string
  startTime?: string | null
  endTime?: string | null
  location?: string | null
  content?: string | null
  purpose?: string | null
  result?: string | null
  attendees?: CalendarAttendee[]
  createdAt: string
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  schedule: '일정',
  meeting: '회의',
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  schedule: 'bg-blue-100 text-blue-800',
  meeting: 'bg-purple-100 text-purple-800',
}

const EVENT_DOT_COLORS: Record<string, string> = {
  schedule: 'bg-blue-500',
  meeting: 'bg-purple-500',
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  const [formData, setFormData] = useState({
    type: 'schedule' as 'schedule' | 'meeting',
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    content: '',
    purpose: '',
    result: '',
    attendeeIds: [] as string[],
  })

  useEffect(() => {
    fetchEvents()
    fetchUsers()
  }, [currentMonth])

  const fetchEvents = async () => {
    try {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1
      const res = await fetch(`/api/calendar?year=${year}&month=${month}`)
      const data = await res.json()
      setEvents(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const getEventsForDay = (day: Date) => {
    return events.filter((e) => isSameDay(new Date(e.date), day))
  }

  const resetForm = () => {
    setFormData({
      type: 'schedule',
      title: '',
      date: '',
      startTime: '',
      endTime: '',
      location: '',
      content: '',
      purpose: '',
      result: '',
      attendeeIds: [],
    })
    setEditingEvent(null)
  }

  const openCreateModal = (date?: Date) => {
    resetForm()
    if (date) {
      setFormData((prev) => ({
        ...prev,
        date: format(date, 'yyyy-MM-dd'),
      }))
    }
    setShowEventModal(true)
  }

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event)
    setFormData({
      type: event.type,
      title: event.title,
      date: format(new Date(event.date), 'yyyy-MM-dd'),
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      location: event.location || '',
      content: event.content || '',
      purpose: event.purpose || '',
      result: event.result || '',
      attendeeIds: event.attendees?.map((a) => a.userId) || [],
    })
    setShowDetailModal(false)
    setShowEventModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingEvent
        ? `/api/calendar/${editingEvent.id}`
        : '/api/calendar'
      const method = editingEvent ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setShowEventModal(false)
        resetForm()
        fetchEvents()
      }
    } catch (error) {
      console.error('Failed to save event:', error)
    }
  }

  const handleDelete = async (eventId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/calendar/${eventId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setShowDetailModal(false)
        setSelectedEvent(null)
        fetchEvents()
      }
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  const toggleAttendee = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(userId)
        ? prev.attendeeIds.filter((id) => id !== userId)
        : [...prev.attendeeIds, userId],
    }))
  }

  const openDetail = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowDetailModal(true)
  }

  // 시간 문자열 → { period, hour, minute } 파싱
  const parseTime = (time: string) => {
    if (!time) return { period: '오전', hour: '9', minute: '00' }
    const [hStr, mStr] = time.split(':')
    const h = parseInt(hStr, 10)
    return {
      period: h < 12 ? '오전' : '오후',
      hour: String(h === 0 ? 12 : h > 12 ? h - 12 : h),
      minute: mStr || '00',
    }
  }

  // { period, hour, minute } → "HH:mm" 문자열
  const buildTime = (period: string, hour: string, minute: string): string => {
    let h = parseInt(hour, 10)
    if (period === '오전') {
      if (h === 12) h = 0
    } else {
      if (h !== 12) h += 12
    }
    return `${String(h).padStart(2, '0')}:${minute}`
  }

  const addOneHour = (time: string): string => {
    const [hStr, mStr] = time.split(':')
    let h = parseInt(hStr, 10)
    h = (h + 1) % 24
    return `${String(h).padStart(2, '0')}:${mStr}`
  }

  const updateTime = (field: 'startTime' | 'endTime', part: 'period' | 'hour' | 'minute', value: string) => {
    setFormData((prev) => {
      const current = parseTime(prev[field])
      const updated = { ...current, [part]: value }
      const newTime = buildTime(updated.period, updated.hour, updated.minute)

      if (field === 'startTime') {
        return { ...prev, startTime: newTime, endTime: addOneHour(newTime) }
      }
      return { ...prev, [field]: newTime }
    })
  }

  const hourOptions = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']
  const minuteOptions = ['00', '10', '20', '30', '40', '50']

  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">캘린더</h1>
          <p className="text-gray-500">일정과 회의를 관리하세요</p>
        </div>
        <Button onClick={() => openCreateModal()}>
          <Plus className="w-4 h-4 mr-2" />
          일정 등록
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* 헤더: 월 네비게이션 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold text-gray-900 min-w-[160px] text-center">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
              오늘
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>일정</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>회의</span>
            </div>
          </div>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map((day, i) => (
            <div
              key={day}
              className={`py-2 text-center text-sm font-medium ${
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-700'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 캘린더 그리드 */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const dayOfWeek = day.getDay()

            return (
              <div
                key={idx}
                className={`min-h-[120px] border-b border-r border-gray-100 p-1.5 cursor-pointer hover:bg-gray-50 transition-colors ${
                  !isCurrentMonth ? 'bg-gray-50/50' : ''
                } ${dayOfWeek === 6 ? 'border-r-0' : ''}`}
                onClick={() => openCreateModal(day)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm inline-flex items-center justify-center w-7 h-7 rounded-full ${
                      isToday(day)
                        ? 'bg-blue-600 text-white font-bold'
                        : !isCurrentMonth
                        ? 'text-gray-300'
                        : dayOfWeek === 0
                        ? 'text-red-500'
                        : dayOfWeek === 6
                        ? 'text-blue-500'
                        : 'text-gray-900'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${
                        event.type === 'meeting'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        openDetail(event)
                      }}
                    >
                      {event.startTime && (
                        <span className="font-medium">{event.startTime} </span>
                      )}
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-400 px-1.5">
                      +{dayEvents.length - 3}개 더
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 일정/회의 등록/수정 모달 */}
      <Modal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false)
          resetForm()
        }}
        title={editingEvent ? '일정 수정' : '일정 등록'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 타입 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              유형
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                  formData.type === 'schedule'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                onClick={() => setFormData((prev) => ({ ...prev, type: 'schedule' }))}
              >
                <CalendarIcon className="w-4 h-4" />
                일정
              </button>
              <button
                type="button"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                  formData.type === 'meeting'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                onClick={() => setFormData((prev) => ({ ...prev, type: 'meeting' }))}
              >
                <Video className="w-4 h-4" />
                회의
              </button>
            </div>
          </div>

          {/* 제목 */}
          <Input
            label="제목 *"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            placeholder={formData.type === 'schedule' ? '일정 제목을 입력하세요' : '회의 제목을 입력하세요'}
            required
          />

          {/* 날짜 */}
          <Input
            label="날짜 *"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
            required
          />

          {/* 시작 시간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">시작 시간</label>
            {!formData.startTime ? (
              <button
                type="button"
                onClick={() => {
                  const now = new Date()
                  const h = now.getHours()
                  const rounded = Math.ceil(now.getMinutes() / 10) * 10
                  const m = rounded >= 60 ? 0 : rounded
                  const finalH = rounded >= 60 ? (h + 1) % 24 : h
                  const time = `${String(finalH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
                  setFormData((prev) => ({ ...prev, startTime: time, endTime: addOneHour(time) }))
                }}
                className="px-4 py-2 text-sm border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                + 시간 추가
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  {['오전', '오후'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => updateTime('startTime', 'period', p)}
                      className={`px-3 py-2 text-sm font-medium transition-colors ${
                        parseTime(formData.startTime).period === p
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <select
                  value={parseTime(formData.startTime).hour}
                  onChange={(e) => updateTime('startTime', 'hour', e.target.value)}
                  className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {hourOptions.map((h) => (
                    <option key={h} value={h}>{h}시</option>
                  ))}
                </select>
                <span className="text-gray-400">:</span>
                <select
                  value={parseTime(formData.startTime).minute}
                  onChange={(e) => updateTime('startTime', 'minute', e.target.value)}
                  className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {minuteOptions.map((m) => (
                    <option key={m} value={m}>{m}분</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, startTime: '', endTime: '' }))}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 종료 시간 */}
          {formData.startTime && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">종료 시간</label>
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  {['오전', '오후'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => updateTime('endTime', 'period', p)}
                      className={`px-3 py-2 text-sm font-medium transition-colors ${
                        parseTime(formData.endTime).period === p
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <select
                  value={parseTime(formData.endTime).hour}
                  onChange={(e) => updateTime('endTime', 'hour', e.target.value)}
                  className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {hourOptions.map((h) => (
                    <option key={h} value={h}>{h}시</option>
                  ))}
                </select>
                <span className="text-gray-400">:</span>
                <select
                  value={parseTime(formData.endTime).minute}
                  onChange={(e) => updateTime('endTime', 'minute', e.target.value)}
                  className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {minuteOptions.map((m) => (
                    <option key={m} value={m}>{m}분</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 일정 전용 필드 */}
          {formData.type === 'schedule' && (
            <>
              <Input
                label="장소"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="장소를 입력하세요"
              />
              <Textarea
                label="내용"
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="일정 상세 내용을 입력하세요"
                rows={3}
              />
            </>
          )}

          {/* 회의 전용 필드 */}
          {formData.type === 'meeting' && (
            <>
              <Textarea
                label="회의 목적"
                value={formData.purpose}
                onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value }))}
                placeholder="회의 목적을 입력하세요"
                rows={2}
              />
              <Textarea
                label="회의 결과"
                value={formData.result}
                onChange={(e) => setFormData((prev) => ({ ...prev, result: e.target.value }))}
                placeholder="회의 결과를 입력하세요 (회의 후 작성)"
                rows={3}
              />
            </>
          )}

          {/* 참석자 선택 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                참석자
              </label>
              <button
                type="button"
                onClick={() => {
                  const allSelected = users.length > 0 && formData.attendeeIds.length === users.length
                  setFormData((prev) => ({
                    ...prev,
                    attendeeIds: allSelected ? [] : users.map((u) => u.id),
                  }))
                }}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  users.length > 0 && formData.attendeeIds.length === users.length
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {users.length > 0 && formData.attendeeIds.length === users.length ? '전체 해제' : '전체 선택'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {users.map((user) => {
                const isSelected = formData.attendeeIds.includes(user.id)
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleAttendee(user.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                        isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {user.name.charAt(0)}
                    </div>
                    {user.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit">
              {editingEvent ? '수정하기' : '등록하기'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowEventModal(false)
                resetForm()
              }}
            >
              취소
            </Button>
          </div>
        </form>
      </Modal>

      {/* 일정 상세 보기 모달 */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedEvent(null)
        }}
        title="일정 상세"
        size="md"
      >
        {selectedEvent && (
          <div className="space-y-4">
            {/* 헤더 */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={EVENT_TYPE_COLORS[selectedEvent.type]}>
                    {EVENT_TYPE_LABELS[selectedEvent.type]}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedEvent.title}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(selectedEvent)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(selectedEvent.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>

            {/* 날짜/시간 */}
            <div className="flex items-center gap-2 text-gray-600">
              <CalendarIcon className="w-4 h-4" />
              <span>
                {format(new Date(selectedEvent.date), 'yyyy년 M월 d일 (EEE)', { locale: ko })}
              </span>
              {selectedEvent.startTime && (
                <>
                  <Clock className="w-4 h-4 ml-2" />
                  <span>
                    {selectedEvent.startTime}
                    {selectedEvent.endTime && ` ~ ${selectedEvent.endTime}`}
                  </span>
                </>
              )}
            </div>

            {/* 일정 필드 */}
            {selectedEvent.type === 'schedule' && (
              <>
                {selectedEvent.location && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
                {selectedEvent.content && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="whitespace-pre-wrap">{selectedEvent.content}</p>
                  </div>
                )}
              </>
            )}

            {/* 회의 필드 */}
            {selectedEvent.type === 'meeting' && (
              <>
                {selectedEvent.purpose && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">회의 목적</span>
                    </div>
                    <p className="text-gray-600 ml-6 whitespace-pre-wrap">{selectedEvent.purpose}</p>
                  </div>
                )}
                {selectedEvent.result && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">회의 결과</span>
                    </div>
                    <p className="text-gray-600 ml-6 whitespace-pre-wrap">{selectedEvent.result}</p>
                  </div>
                )}
              </>
            )}

            {/* 참석자 */}
            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    참석자 ({selectedEvent.attendees.length}명)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 ml-6">
                  {selectedEvent.attendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-sm text-gray-700"
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-medium">
                        {(attendee.user?.name || '?').charAt(0)}
                      </div>
                      {attendee.user?.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
