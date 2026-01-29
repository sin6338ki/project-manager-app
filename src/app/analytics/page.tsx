'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Project, STATUS_LABELS, PRIORITY_LABELS } from '@/types'

export default function AnalyticsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

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

  const stats = useMemo(() => {
    const total = projects.length
    const byStatus = {
      NOT_STARTED: projects.filter((p) => p.status === 'NOT_STARTED').length,
      IN_PROGRESS: projects.filter((p) => p.status === 'IN_PROGRESS').length,
      COMPLETED: projects.filter((p) => p.status === 'COMPLETED').length,
    }
    const byPriority = {
      LOW: projects.filter((p) => p.priority === 'LOW').length,
      MEDIUM: projects.filter((p) => p.priority === 'MEDIUM').length,
      HIGH: projects.filter((p) => p.priority === 'HIGH').length,
      URGENT: projects.filter((p) => p.priority === 'URGENT').length,
    }
    const avgProgress = total > 0
      ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / total)
      : 0
    const overdue = projects.filter(
      (p) =>
        p.status !== 'COMPLETED' &&
        p.endDate &&
        new Date(p.endDate) < new Date()
    ).length
    const parentProjects = projects.filter((p) => !p.parentId).length
    const subProjects = projects.filter((p) => p.parentId).length

    return { total, byStatus, byPriority, avgProgress, overdue, parentProjects, subProjects }
  }, [projects])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const statusColorMap: Record<string, string> = {
    NOT_STARTED: 'bg-gray-400',
    IN_PROGRESS: 'bg-blue-500',
    COMPLETED: 'bg-green-500',
  }

  const priorityColorMap: Record<string, string> = {
    LOW: 'bg-slate-400',
    MEDIUM: 'bg-yellow-500',
    HIGH: 'bg-orange-500',
    URGENT: 'bg-red-500',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">현황 분석</h1>
        <p className="text-gray-500">프로젝트 전체 현황을 분석합니다</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500">전체 프로젝트</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.avgProgress}%</p>
            <p className="text-sm text-gray-500">평균 진행률</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
            <p className="text-sm text-gray-500">기한 초과</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {stats.total > 0
                ? Math.round((stats.byStatus.COMPLETED / stats.total) * 100)
                : 0}
              %
            </p>
            <p className="text-sm text-gray-500">완료율</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">상태별 현황</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                  </span>
                  <span className="text-sm text-gray-500">
                    {count}개 ({stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${statusColorMap[status]}`}
                    style={{
                      width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">상위 프로젝트</span>
                <span className="font-medium">{stats.parentProjects}개</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-500">하위 프로젝트</span>
                <span className="font-medium">{stats.subProjects}개</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">우선순위별 현황</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.byPriority).map(([priority, count]) => (
              <div key={priority}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS]}
                  </span>
                  <span className="text-sm text-gray-500">
                    {count}개 ({stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${priorityColorMap[priority]}`}
                    style={{
                      width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {projects.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">프로젝트별 진행률</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects
              .filter((p) => !p.parentId)
              .sort((a, b) => b.progress - a.progress)
              .map((project) => (
                <div key={project.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{project.name}</span>
                    <span className="text-sm text-gray-500">{project.progress}%</span>
                  </div>
                  <ProgressBar value={project.progress} size="sm" />
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
