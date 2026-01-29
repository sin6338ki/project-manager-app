'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  format,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  eachMonthOfInterval,
  isToday,
  isSameMonth,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Project,
  STATUS_COLORS,
  STATUS_LABELS,
  ProjectStatus,
} from '@/types'

export default function TimelinePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'quarter'>('month')

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const { rangeStart, rangeEnd, days } = useMemo(() => {
    let start: Date
    let end: Date

    if (viewMode === 'month') {
      start = startOfMonth(currentDate)
      end = endOfMonth(currentDate)
    } else {
      start = startOfMonth(currentDate)
      end = endOfMonth(addMonths(currentDate, 2))
    }

    const daysList = eachDayOfInterval({ start, end })

    return { rangeStart: start, rangeEnd: end, days: daysList }
  }, [currentDate, viewMode])

  const months = useMemo(() => {
    return eachMonthOfInterval({ start: rangeStart, end: rangeEnd })
  }, [rangeStart, rangeEnd])

  const projectsWithDates = useMemo(() => {
    return projects.filter((p) => p.startDate && p.endDate)
  }, [projects])

  const parentProjects = projectsWithDates.filter((p) => !p.parentId)
  const childProjects = projectsWithDates.filter((p) => p.parentId)

  const getBarStyle = (project: Project) => {
    const start = new Date(project.startDate!)
    const end = new Date(project.endDate!)
    const totalDays = days.length

    const startOffset = Math.max(0, differenceInDays(start, rangeStart))
    const endOffset = Math.min(totalDays - 1, differenceInDays(end, rangeStart))

    if (startOffset >= totalDays || endOffset < 0) return null

    const left = (startOffset / totalDays) * 100
    const width = ((endOffset - startOffset + 1) / totalDays) * 100

    const statusColors: Record<string, string> = {
      NOT_STARTED: 'bg-gray-400',
      IN_PROGRESS: 'bg-blue-500',
      COMPLETED: 'bg-green-500',
    }

    return {
      left: `${left}%`,
      width: `${Math.max(width, 1)}%`,
      backgroundColor: '',
      className: statusColors[project.status] || 'bg-gray-400',
    }
  }

  const handlePrev = () => {
    setCurrentDate((prev) =>
      viewMode === 'month' ? subMonths(prev, 1) : subMonths(prev, 3)
    )
  }

  const handleNext = () => {
    setCurrentDate((prev) =>
      viewMode === 'month' ? addMonths(prev, 1) : addMonths(prev, 3)
    )
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const renderTimelineRow = (project: Project, depth: number = 0) => {
    const bar = getBarStyle(project)
    const subs = childProjects.filter((p) => p.parentId === project.id)

    return (
      <div key={project.id}>
        <div className="flex border-b border-gray-100 hover:bg-gray-50 group">
          <div
            className="w-64 flex-shrink-0 px-4 py-3 border-r border-gray-200 flex items-center gap-2"
            style={{ paddingLeft: `${16 + depth * 20}px` }}
          >
            {subs.length > 0 && (
              <span className="text-xs text-gray-400">&#9660;</span>
            )}
            <Link
              href={`/projects/${project.id}`}
              className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
            >
              {project.name}
            </Link>
            <Badge className={`${STATUS_COLORS[project.status as ProjectStatus]} text-xs`}>
              {STATUS_LABELS[project.status as ProjectStatus]}
            </Badge>
          </div>
          <div className="flex-1 relative py-3 px-1">
            {bar && (
              <div
                className={`absolute top-1/2 -translate-y-1/2 h-6 rounded ${bar.className} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                style={{ left: bar.left, width: bar.width }}
                title={`${project.name}: ${format(new Date(project.startDate!), 'M/d')} - ${format(new Date(project.endDate!), 'M/d')}`}
              >
                <span className="text-white text-xs px-2 truncate block leading-6">
                  {project.name}
                </span>
              </div>
            )}
          </div>
        </div>
        {subs.map((sub) => renderTimelineRow(sub, depth + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">타임라인</h1>
          <p className="text-gray-500">프로젝트 일정을 한눈에 확인하세요</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handlePrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
              {viewMode === 'month'
                ? format(currentDate, 'yyyy년 M월', { locale: ko })
                : `${format(rangeStart, 'yyyy년 M월', { locale: ko })} - ${format(rangeEnd, 'M월', { locale: ko })}`}
            </h2>
            <Button variant="ghost" size="sm" onClick={handleNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleToday}>
              <Calendar className="w-4 h-4 mr-1" />
              오늘
            </Button>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              className={`px-3 py-1 text-sm rounded ${viewMode === 'month' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
              onClick={() => setViewMode('month')}
            >
              월간
            </button>
            <button
              className={`px-3 py-1 text-sm rounded ${viewMode === 'quarter' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
              onClick={() => setViewMode('quarter')}
            >
              분기
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="flex border-b border-gray-200 bg-gray-50">
              <div className="w-64 flex-shrink-0 px-4 py-2 text-sm font-medium text-gray-700 border-r border-gray-200">
                프로젝트
              </div>
              <div className="flex-1 flex">
                {months.map((month) => {
                  const monthDays = days.filter((d) => isSameMonth(d, month))
                  const widthPercent = (monthDays.length / days.length) * 100
                  return (
                    <div
                      key={month.toISOString()}
                      className="text-center text-sm font-medium text-gray-700 py-2 border-r border-gray-200 last:border-r-0"
                      style={{ width: `${widthPercent}%` }}
                    >
                      {format(month, 'M월', { locale: ko })}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex border-b border-gray-200 bg-gray-50">
              <div className="w-64 flex-shrink-0 border-r border-gray-200" />
              <div className="flex-1 flex">
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`flex-1 text-center text-xs py-1 border-r border-gray-100 last:border-r-0 ${
                      isToday(day) ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-500'
                    }`}
                    style={{ minWidth: viewMode === 'month' ? '24px' : '8px' }}
                  >
                    {viewMode === 'month' ? format(day, 'd') : ''}
                  </div>
                ))}
              </div>
            </div>

            <div>
              {parentProjects.length > 0 ? (
                parentProjects.map((project) => renderTimelineRow(project))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  일정이 지정된 프로젝트가 없습니다
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-400" />
          <span>시작 전</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>진행중</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>완료</span>
        </div>
      </div>
    </div>
  )
}
