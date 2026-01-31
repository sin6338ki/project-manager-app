'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Filter, ChevronRight, ChevronDown, Calendar, Users, GripVertical } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { AvatarGroup } from '@/components/ui/Avatar'
import { ProgressBar } from '@/components/ui/ProgressBar'
import {
  Project,
  STATUS_LABELS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  ProjectStatus,
  ProjectPriority,
} from '@/types'

interface DragState {
  draggedId: string | null
  draggedName: string | null
  dropTargetId: string | null
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [dragState, setDragState] = useState<DragState>({
    draggedId: null,
    draggedName: null,
    dropTargetId: null,
  })
  const [moving, setMoving] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [statusFilter])

  const fetchProjects = async () => {
    try {
      let url = '/api/projects?parentId=null'
      if (statusFilter) url += `&status=${statusFilter}`
      const res = await fetch(url)
      const data = await res.json()
      setProjects(data)
      const allIds = new Set<string>()
      function collectIds(projects: Project[]) {
        for (const p of projects) {
          allIds.add(p.id)
          if (p.subProjects && p.subProjects.length > 0) {
            collectIds(p.subProjects)
          }
        }
      }
      collectIds(data)
      setExpandedProjects(allIds)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = priorityFilter
    ? projects.filter((p) => p.priority === priorityFilter)
    : projects

  const toggleExpand = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 자기 자신의 하위인지 체크 (순환 참조 방지)
  const isDescendantOf = (draggedId: string, targetId: string): boolean => {
    function findAndCheck(list: Project[]): boolean {
      for (const p of list) {
        if (p.id === draggedId) {
          return hasChild(p, targetId)
        }
        if (p.subProjects && findAndCheck(p.subProjects)) return true
      }
      return false
    }
    function hasChild(project: Project, id: string): boolean {
      if (project.id === id) return true
      if (project.subProjects) {
        for (const sub of project.subProjects) {
          if (hasChild(sub, id)) return true
        }
      }
      return false
    }
    return findAndCheck(projects)
  }

  const canDropOn = (targetId: string) => {
    if (!dragState.draggedId) return false
    if (dragState.draggedId === targetId) return false
    if (isDescendantOf(dragState.draggedId, targetId)) return false
    return true
  }

  const handleDragStart = (e: React.DragEvent, id: string, name: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    // setTimeout으로 비동기 상태 업데이트하여 현재 렌더링이 끝난 뒤 적용
    setTimeout(() => {
      setDragState({ draggedId: id, draggedName: name, dropTargetId: null })
    }, 0)
  }

  const handleDragEnd = () => {
    setDragState({ draggedId: null, draggedName: null, dropTargetId: null })
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragState((prev) => ({ ...prev, dropTargetId: targetId }))
  }

  const handleDragLeave = (e: React.DragEvent, targetId: string) => {
    e.stopPropagation()
    setDragState((prev) =>
      prev.dropTargetId === targetId ? { ...prev, dropTargetId: null } : prev
    )
  }

  const handleDrop = async (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault()
    e.stopPropagation()

    const draggedId = dragState.draggedId
    if (!draggedId || draggedId === targetId) {
      handleDragEnd()
      return
    }
    if (targetId && !canDropOn(targetId)) {
      handleDragEnd()
      return
    }

    setMoving(true)
    handleDragEnd()

    try {
      const res = await fetch(`/api/projects/${draggedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: targetId }),
      })
      if (res.ok) {
        await fetchProjects()
      }
    } catch (error) {
      console.error('Failed to move project:', error)
    } finally {
      setMoving(false)
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
          <h1 className="text-2xl font-bold text-gray-900">프로젝트</h1>
          <p className="text-gray-500">모든 프로젝트를 관리하세요 · 드래그하여 위치를 이동할 수 있습니다</p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            새 프로젝트
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
        <Filter className="w-5 h-5 text-gray-400" />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: '모든 상태' },
            ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          className="w-40"
        />
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          options={[
            { value: '', label: '모든 우선순위' },
            ...Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          className="w-40"
        />
      </div>

      {moving && (
        <div className="fixed inset-0 bg-black/10 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg px-6 py-4 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            <span className="text-sm text-gray-700">프로젝트 이동 중...</span>
          </div>
        </div>
      )}

      {filteredProjects.length > 0 ? (
        <div className="space-y-4">
          {filteredProjects.map((topProject) => (
            <TopProjectCard
              key={topProject.id}
              project={topProject}
              expandedProjects={expandedProjects}
              toggleExpand={toggleExpand}
              dragState={dragState}
              canDropOn={canDropOn}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          ))}

          {/* 최상위로 이동 드롭존 */}
          {dragState.draggedId && (
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                dragState.dropTargetId === '__root__'
                  ? 'border-purple-400 bg-purple-50 text-purple-700'
                  : 'border-gray-300 text-gray-400'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragState((prev) => ({ ...prev, dropTargetId: '__root__' }))
              }}
              onDragLeave={() => {
                setDragState((prev) =>
                  prev.dropTargetId === '__root__' ? { ...prev, dropTargetId: null } : prev
                )
              }}
              onDrop={(e) => handleDrop(e, null)}
            >
              <span className="text-sm font-medium">여기에 놓으면 최상위 프로젝트로 이동합니다</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">
            {statusFilter || priorityFilter
              ? '조건에 맞는 프로젝트가 없습니다'
              : '아직 프로젝트가 없습니다'}
          </p>
          <Link href="/projects/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              첫 프로젝트 만들기
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

// 공통 Props
interface DragProps {
  dragState: DragState
  canDropOn: (targetId: string) => boolean
  onDragStart: (e: React.DragEvent, id: string, name: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, targetId: string) => void
  onDragLeave: (e: React.DragEvent, targetId: string) => void
  onDrop: (e: React.DragEvent, targetId: string | null) => void
}

function TopProjectCard({
  project,
  expandedProjects,
  toggleExpand,
  ...drag
}: {
  project: Project
  expandedProjects: Set<string>
  toggleExpand: (id: string) => void
} & DragProps) {
  const isExpanded = expandedProjects.has(project.id)
  const subCount = project.subProjects?.length || 0
  const isDragging = drag.dragState.draggedId === project.id
  const isOver = drag.dragState.dropTargetId === project.id
  const droppable = drag.canDropOn(project.id)

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-150 ${
        isDragging
          ? 'opacity-40 scale-[0.98]'
          : isOver && droppable
          ? 'border-purple-400 ring-2 ring-purple-200 shadow-lg'
          : 'border-gray-200'
      }`}
      draggable
      onDragStart={(e) => drag.onDragStart(e, project.id, project.name)}
      onDragEnd={drag.onDragEnd}
      onDragOver={(e) => { if (droppable) drag.onDragOver(e, project.id) }}
      onDragLeave={(e) => drag.onDragLeave(e, project.id)}
      onDrop={(e) => { e.stopPropagation(); if (droppable) drag.onDrop(e, project.id) }}
    >
      <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-white/50">
              <GripVertical className="w-4 h-4" />
            </div>
            {subCount > 0 && (
              <button
                onClick={() => toggleExpand(project.id)}
                className="p-1 hover:bg-white/50 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
              </button>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/projects/${project.id}`}
                  className="text-lg font-bold text-gray-900 hover:text-purple-700 transition-colors truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {project.name}
                </Link>
                <Badge className="bg-purple-100 text-purple-800 text-xs">최상위</Badge>
              </div>
              {project.goal && (
                <p className="text-sm text-gray-500 mt-1 truncate">{project.goal}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm text-gray-500">{subCount}개 하위 프로젝트</span>
            <Link href={`/projects/new?parentId=${project.id}`}>
              <Button size="sm" variant="secondary">
                <Plus className="w-3 h-3 mr-1" />
                추가
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {isOver && droppable && (
        <div className="px-4 py-2 bg-purple-50 text-purple-700 text-sm text-center border-b border-purple-200">
          <strong>{drag.dragState.draggedName}</strong>을(를) <strong>{project.name}</strong>의 하위로 이동
        </div>
      )}

      {isExpanded && project.subProjects && project.subProjects.length > 0 && (
        <div className="p-4 space-y-3">
          {project.subProjects.map((subProject) => (
            <SubProjectNestedCard
              key={subProject.id}
              project={subProject}
              depth={1}
              expandedProjects={expandedProjects}
              toggleExpand={toggleExpand}
              {...drag}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SubProjectNestedCard({
  project,
  depth,
  expandedProjects,
  toggleExpand,
  ...drag
}: {
  project: Project
  depth: number
  expandedProjects: Set<string>
  toggleExpand: (id: string) => void
} & DragProps) {
  const isExpanded = expandedProjects.has(project.id)
  const subCount = project.subProjects?.length || 0
  const assignees =
    project.assignees?.map((a) => ({
      name: a.user?.name || '',
      avatar: a.user?.avatar,
    })) || []

  const borderColor = depth === 1 ? 'border-l-blue-400' : 'border-l-green-400'
  const levelLabel = depth === 1 ? '분기별' : '하위'
  const levelBadgeColor =
    depth === 1 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'

  const isDragging = drag.dragState.draggedId === project.id
  const isOver = drag.dragState.dropTargetId === project.id
  const droppable = drag.canDropOn(project.id)

  return (
    <div
      className={`border rounded-lg ${borderColor} border-l-4 bg-white overflow-hidden transition-all duration-150 ${
        isDragging
          ? 'opacity-40 scale-[0.98]'
          : isOver && droppable
          ? 'ring-2 ring-blue-300 shadow-md border-blue-400'
          : 'border-gray-200'
      }`}
      style={{ marginLeft: `${(depth - 1) * 16}px` }}
      draggable
      onDragStart={(e) => {
        e.stopPropagation()
        drag.onDragStart(e, project.id, project.name)
      }}
      onDragEnd={drag.onDragEnd}
      onDragOver={(e) => { if (droppable) drag.onDragOver(e, project.id) }}
      onDragLeave={(e) => drag.onDragLeave(e, project.id)}
      onDrop={(e) => { e.stopPropagation(); if (droppable) drag.onDrop(e, project.id) }}
    >
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="cursor-grab active:cursor-grabbing p-0.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
              <GripVertical className="w-3.5 h-3.5" />
            </div>
            {subCount > 0 && (
              <button
                onClick={() => toggleExpand(project.id)}
                className="p-0.5 hover:bg-gray-100 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
            )}
            <Link
              href={`/projects/${project.id}`}
              className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-sm truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {project.name}
            </Link>
            <Badge className={`${levelBadgeColor} text-xs`}>{levelLabel}</Badge>
            {depth >= 2 && (
              <>
                <Badge className={`${STATUS_COLORS[project.status as ProjectStatus]} text-xs`}>
                  {STATUS_LABELS[project.status as ProjectStatus]}
                </Badge>
                <Badge className={`${PRIORITY_COLORS[project.priority as ProjectPriority]} text-xs`}>
                  {PRIORITY_LABELS[project.priority as ProjectPriority]}
                </Badge>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 ml-2 flex-shrink-0">
            {(project.startDate || project.endDate) && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>
                  {project.startDate
                    ? format(new Date(project.startDate), 'M/d', { locale: ko })
                    : ''}
                  {project.startDate && project.endDate && ' - '}
                  {project.endDate
                    ? format(new Date(project.endDate), 'M/d', { locale: ko })
                    : ''}
                </span>
              </div>
            )}

            {project.progress > 0 && (
              <div className="w-20">
                <ProgressBar value={project.progress} showLabel size="sm" />
              </div>
            )}

            {assignees.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-gray-400" />
                <AvatarGroup users={assignees} max={3} size="sm" />
              </div>
            )}

            {subCount > 0 && (
              <span className="text-xs text-gray-400">+{subCount}</span>
            )}

            <Link href={`/projects/new?parentId=${project.id}`}>
              <button className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      {isOver && droppable && (
        <div className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs text-center border-t border-blue-200">
          <strong>{drag.dragState.draggedName}</strong>을(를) <strong>{project.name}</strong>의 하위로 이동
        </div>
      )}

      {isExpanded && project.subProjects && project.subProjects.length > 0 && (
        <div className="px-3 pb-3 space-y-2">
          {project.subProjects.map((sub) => (
            <SubProjectNestedCard
              key={sub.id}
              project={sub}
              depth={depth + 1}
              expandedProjects={expandedProjects}
              toggleExpand={toggleExpand}
              {...drag}
            />
          ))}
        </div>
      )}
    </div>
  )
}
