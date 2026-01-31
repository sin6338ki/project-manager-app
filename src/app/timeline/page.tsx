'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
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

// 프로젝트와 모든 하위 프로젝트를 플랫 리스트로 변환 (계층 정보 포함)
interface TimelineProject {
  project: Project
  depth: number
}

function flattenProjects(projects: Project[]): TimelineProject[] {
  const result: TimelineProject[] = []

  function traverse(project: Project, depth: number) {
    result.push({ project, depth })
    if (project.subProjects && project.subProjects.length > 0) {
      for (const sub of project.subProjects) {
        traverse(sub, depth + 1)
      }
    }
  }

  for (const p of projects) {
    traverse(p, 0)
  }

  return result
}

export default function TimelinePage() {
  const [topProjects, setTopProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'quarter'>('month')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      // 최상위 프로젝트만 가져오기 (하위 프로젝트는 중첩으로 포함)
      const res = await fetch('/api/projects?parentId=null')
      const data = await res.json()
      setTopProjects(data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const scrollToToday = useCallback(() => {
    requestAnimationFrame(() => {
      const container = scrollContainerRef.current
      const todayEl = todayRef.current
      if (container && todayEl) {
        const containerRect = container.getBoundingClientRect()
        const todayRect = todayEl.getBoundingClientRect()
        const todayCenter = todayRect.left + todayRect.width / 2
        const containerCenter = containerRect.left + containerRect.width / 2
        container.scrollLeft += todayCenter - containerCenter
      }
    })
  }, [])

  // 데이터 로드 후 또는 뷰 모드 변경 시 오늘 날짜로 스크롤
  useEffect(() => {
    if (!loading) {
      scrollToToday()
    }
  }, [loading, viewMode, currentDate, scrollToToday])

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

  // 모든 프로젝트를 계층 순서로 플랫하게 만들기
  const flattenedProjects = useMemo(() => {
    return flattenProjects(topProjects)
  }, [topProjects])

  const getBarStyle = (project: Project) => {
    if (!project.startDate || !project.endDate) return null

    const start = new Date(project.startDate)
    const end = new Date(project.endDate)
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
    // currentDate 변경 시 useEffect에서 scrollToToday가 호출됨
  }

  // 깊이에 따른 색상
  const getDepthBarColor = (depth: number) => {
    switch (depth) {
      case 0: return 'bg-purple-500'
      case 1: return 'bg-blue-500'
      default: return 'bg-green-500'
    }
  }

  const getDepthLabel = (depth: number) => {
    switch (depth) {
      case 0: return '최상위'
      case 1: return '분기별'
      default: return '하위'
    }
  }

  const getDepthBadgeColor = (depth: number) => {
    switch (depth) {
      case 0: return 'bg-purple-100 text-purple-800'
      case 1: return 'bg-blue-100 text-blue-800'
      default: return 'bg-green-100 text-green-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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

        <div className="overflow-x-auto" ref={scrollContainerRef}>
          <div className="min-w-[800px]">
            <div className="flex border-b border-gray-200 bg-gray-50">
              <div className="w-72 flex-shrink-0 px-4 py-2 text-sm font-medium text-gray-700 border-r border-gray-200">
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
              <div className="w-72 flex-shrink-0 border-r border-gray-200" />
              <div className="flex-1 flex">
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    ref={isToday(day) ? todayRef : undefined}
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
              {flattenedProjects.length > 0 ? (
                flattenedProjects.map(({ project, depth }) => {
                  const bar = getBarStyle(project)
                  const hasDate = project.startDate && project.endDate
                  const barColorClass = hasDate
                    ? (bar?.className || 'bg-gray-400')
                    : ''

                  // 깊이에 따라 배경 색상 구분
                  const rowBg = depth === 0
                    ? 'bg-purple-50/30'
                    : depth === 1
                      ? 'bg-blue-50/20'
                      : ''

                  return (
                    <div key={project.id} className={`flex border-b border-gray-100 hover:bg-gray-50 group ${rowBg}`}>
                      <div
                        className="w-72 flex-shrink-0 px-4 py-3 border-r border-gray-200 flex items-center gap-2"
                        style={{ paddingLeft: `${16 + depth * 20}px` }}
                      >
                        {/* 깊이 표시 바 */}
                        <div className={`w-1 h-4 rounded ${getDepthBarColor(depth)}`} />
                        <Link
                          href={`/projects/${project.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
                        >
                          {project.name}
                        </Link>
                        <Badge className={`${getDepthBadgeColor(depth)} text-xs whitespace-nowrap`}>
                          {getDepthLabel(depth)}
                        </Badge>
                        <Badge className={`${STATUS_COLORS[project.status as ProjectStatus]} text-xs whitespace-nowrap`}>
                          {STATUS_LABELS[project.status as ProjectStatus]}
                        </Badge>
                      </div>
                      <div className="flex-1 relative py-3 px-1">
                        {bar && (
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 rounded opacity-80 hover:opacity-100 transition-opacity cursor-pointer ${barColorClass}`}
                            style={{
                              left: bar.left,
                              width: bar.width,
                              height: depth === 0 ? '28px' : depth === 1 ? '22px' : '18px',
                            }}
                            title={`${project.name}: ${format(new Date(project.startDate!), 'M/d')} - ${format(new Date(project.endDate!), 'M/d')}`}
                          >
                            <span className="text-white text-xs px-2 truncate block leading-6">
                              {project.name}
                            </span>
                          </div>
                        )}
                        {!hasDate && (
                          <div className="absolute top-1/2 -translate-y-1/2 left-2">
                            <span className="text-xs text-gray-400 italic">일정 미지정</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-12 text-gray-500">
                  프로젝트가 없습니다
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm text-gray-500">
        <span className="font-medium text-gray-700">상태:</span>
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
        <span className="mx-2">|</span>
        <span className="font-medium text-gray-700">레벨:</span>
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 rounded bg-purple-500" />
          <span>최상위</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 rounded bg-blue-500" />
          <span>분기별</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 rounded bg-green-500" />
          <span>하위</span>
        </div>
      </div>
    </div>
  )
}
