'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import { Project, ProjectAssignee, STATUS_LABELS, PRIORITY_LABELS, STATUS_COLORS, ProjectStatus } from '@/types'

// 모든 프로젝트를 재귀적으로 플랫하게 펼치기
function flattenAllProjects(projects: Project[]): Project[] {
  const result: Project[] = []
  function traverse(project: Project) {
    result.push(project)
    if (project.subProjects) {
      for (const sub of project.subProjects) {
        traverse(sub)
      }
    }
  }
  for (const p of projects) {
    traverse(p)
  }
  return result
}

// 모든 담당자를 재귀적으로 수집
function collectAllAssignees(projects: Project[]): ProjectAssignee[] {
  const all: ProjectAssignee[] = []
  function traverse(project: Project) {
    if (project.assignees) {
      all.push(...project.assignees)
    }
    if (project.subProjects) {
      for (const sub of project.subProjects) {
        traverse(sub)
      }
    }
  }
  for (const p of projects) {
    traverse(p)
  }
  return all
}

export default function AnalyticsPage() {
  const [topProjects, setTopProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects?parentId=null')
      const data = await res.json()
      setTopProjects(data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  // 모든 프로젝트 (계층 포함) 플랫 리스트
  const allProjects = useMemo(() => flattenAllProjects(topProjects), [topProjects])
  const allAssignees = useMemo(() => collectAllAssignees(topProjects), [topProjects])

  const stats = useMemo(() => {
    const total = allProjects.length
    const topLevel = topProjects.length
    const byStatus = {
      NOT_STARTED: allProjects.filter((p) => p.status === 'NOT_STARTED').length,
      IN_PROGRESS: allProjects.filter((p) => p.status === 'IN_PROGRESS').length,
      COMPLETED: allProjects.filter((p) => p.status === 'COMPLETED').length,
    }
    const byPriority = {
      LOW: allProjects.filter((p) => p.priority === 'LOW').length,
      MEDIUM: allProjects.filter((p) => p.priority === 'MEDIUM').length,
      HIGH: allProjects.filter((p) => p.priority === 'HIGH').length,
      URGENT: allProjects.filter((p) => p.priority === 'URGENT').length,
    }
    const avgProgress = total > 0
      ? Math.round(allProjects.reduce((sum, p) => sum + p.progress, 0) / total)
      : 0
    const overdue = allProjects.filter(
      (p) =>
        p.status !== 'COMPLETED' &&
        p.endDate &&
        new Date(p.endDate) < new Date()
    ).length
    const subProjects = total - topLevel

    // 업무(task) 통계
    let totalTasks = 0
    let completedTasks = 0
    for (const assignee of allAssignees) {
      if (assignee.tasks) {
        totalTasks += assignee.tasks.length
        completedTasks += assignee.tasks.filter((t) => t.completed).length
      }
    }
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // 담당자별 통계
    const memberMap = new Map<string, { name: string; totalTasks: number; completedTasks: number; projectCount: number }>()
    for (const assignee of allAssignees) {
      const name = assignee.user?.name || '미지정'
      const userId = assignee.userId
      if (!memberMap.has(userId)) {
        memberMap.set(userId, { name, totalTasks: 0, completedTasks: 0, projectCount: 0 })
      }
      const entry = memberMap.get(userId)!
      entry.projectCount++
      if (assignee.tasks) {
        entry.totalTasks += assignee.tasks.length
        entry.completedTasks += assignee.tasks.filter((t) => t.completed).length
      }
    }
    const memberStats = Array.from(memberMap.values()).sort((a, b) => b.projectCount - a.projectCount)

    return {
      total, topLevel, byStatus, byPriority, avgProgress, overdue, subProjects,
      totalTasks, completedTasks, taskCompletionRate, memberStats,
    }
  }, [allProjects, allAssignees, topProjects])

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
        <h1 className="text-2xl font-bold text-gray-900">현황 통계</h1>
        <p className="text-gray-500">프로젝트 전체 현황을 분석합니다</p>
      </div>

      {/* 주요 지표 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500">전체 프로젝트</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-3xl font-bold text-purple-600">{stats.topLevel}</p>
            <p className="text-sm text-gray-500">최상위 프로젝트</p>
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
            <p className="text-3xl font-bold text-green-600">
              {stats.total > 0 ? Math.round((stats.byStatus.COMPLETED / stats.total) * 100) : 0}%
            </p>
            <p className="text-sm text-gray-500">프로젝트 완료율</p>
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
            <p className="text-3xl font-bold text-amber-600">{stats.taskCompletionRate}%</p>
            <p className="text-sm text-gray-500">업무 완료율</p>
          </CardContent>
        </Card>
      </div>

      {/* 업무 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.totalTasks}</p>
            <p className="text-sm text-gray-500">전체 업무</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completedTasks}</p>
            <p className="text-sm text-gray-500">완료된 업무</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.totalTasks - stats.completedTasks}</p>
            <p className="text-sm text-gray-500">미완료 업무</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 상태별 현황 */}
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
                <span className="text-gray-500">최상위 프로젝트</span>
                <span className="font-medium">{stats.topLevel}개</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-500">하위 프로젝트</span>
                <span className="font-medium">{stats.subProjects}개</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 우선순위별 현황 */}
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

      {/* 담당자별 현황 */}
      {stats.memberStats.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">담당자별 현황</h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">담당자</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">참여 프로젝트</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">전체 업무</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">완료 업무</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">업무 완료율</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.memberStats.map((member, idx) => {
                    const rate = member.totalTasks > 0
                      ? Math.round((member.completedTasks / member.totalTasks) * 100)
                      : 0
                    return (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-medium">
                              {member.name.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-900">{member.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4 text-gray-600">{member.projectCount}개</td>
                        <td className="text-center py-3 px-4 text-gray-600">{member.totalTasks}개</td>
                        <td className="text-center py-3 px-4 text-gray-600">{member.completedTasks}개</td>
                        <td className="text-center py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16">
                              <ProgressBar value={rate} size="sm" />
                            </div>
                            <span className="text-gray-600">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 최상위 프로젝트별 현황 */}
      {topProjects.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">최상위 프로젝트별 현황</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {topProjects.map((project) => {
              const allSubs = flattenAllProjects([project])
              const totalSubs = allSubs.length - 1
              const completedSubs = allSubs.filter((p) => p.status === 'COMPLETED').length
              const completionRate = allSubs.length > 0
                ? Math.round((completedSubs / allSubs.length) * 100)
                : 0

              // 프로젝트 내 업무 통계
              const projectAssignees = collectAllAssignees([project])
              let projTotalTasks = 0
              let projCompletedTasks = 0
              for (const a of projectAssignees) {
                if (a.tasks) {
                  projTotalTasks += a.tasks.length
                  projCompletedTasks += a.tasks.filter((t) => t.completed).length
                }
              }

              return (
                <div key={project.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{project.name}</span>
                      <Badge className="bg-purple-100 text-purple-800 text-xs">최상위</Badge>
                      <Badge className={`${STATUS_COLORS[project.status as ProjectStatus]} text-xs`}>
                        {STATUS_LABELS[project.status as ProjectStatus]}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">{totalSubs}개 하위 프로젝트</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">프로젝트 완료율</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1">
                          <ProgressBar value={completionRate} size="sm" />
                        </div>
                        <span className="font-medium">{completionRate}%</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">전체 업무</span>
                      <p className="font-medium mt-1">{projTotalTasks}개</p>
                    </div>
                    <div>
                      <span className="text-gray-500">완료 업무</span>
                      <p className="font-medium text-green-600 mt-1">{projCompletedTasks}개</p>
                    </div>
                    <div>
                      <span className="text-gray-500">업무 완료율</span>
                      <p className="font-medium mt-1">
                        {projTotalTasks > 0 ? Math.round((projCompletedTasks / projTotalTasks) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
