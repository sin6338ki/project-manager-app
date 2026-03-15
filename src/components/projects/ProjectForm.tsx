'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, CheckSquare, Eye, Edit2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import {
  Project,
  User,
  STATUS_LABELS,
  PRIORITY_LABELS,
  PROJECT_LEVEL_LABELS,
  PROJECT_LEVEL_COLORS,
  ProjectLevel,
  getProjectLevel,
} from '@/types'

interface AssigneeWithTasks {
  userId: string
  userName?: string
  tasks: string[]
}

interface ProjectFormProps {
  project?: Project
  parentId?: string
  parentProject?: Project | null
  onSuccess?: () => void
}

function calculateLevel(
  parentProject: Project | null | undefined,
  editingProject?: Project
): ProjectLevel {
  if (!parentProject && editingProject) {
    return getProjectLevel(editingProject)
  }
  if (!parentProject) return 0
  return Math.min(3, getProjectLevel(parentProject) + 1) as ProjectLevel
}

export function ProjectForm({ project, parentId, parentProject, onSuccess }: ProjectFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [fetchedParent, setFetchedParent] = useState<Project | null>(parentProject || null)
  // parentId가 있는데 아직 부모를 못 가져온 경우 로딩 표시
  const [parentLoading, setParentLoading] = useState<boolean>(
    !!(parentId && !parentProject) || !!(project?.parentId && !parentProject)
  )
  const [descPreview, setDescPreview] = useState(false)

  const projectLevel = calculateLevel(fetchedParent, project)

  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    goal: project?.goal || '',
    keyResults: project?.keyResults || '',
    status: project?.status || 'NOT_STARTED',
    priority: project?.priority || 'MEDIUM',
    startDate: project?.startDate
      ? new Date(project.startDate).toISOString().split('T')[0]
      : '',
    endDate: project?.endDate
      ? new Date(project.endDate).toISOString().split('T')[0]
      : '',
    progress: project?.progress || 0,
  })

  const [assigneesWithTasks, setAssigneesWithTasks] = useState<AssigneeWithTasks[]>(() => {
    if (project?.assignees && project.assignees.length > 0) {
      return project.assignees.map((a) => ({
        userId: a.userId,
        userName: a.user?.name || '',
        tasks: a.tasks?.map((t) => t.title) || [],
      }))
    }
    return []
  })

  const [selectedUserId, setSelectedUserId] = useState('')
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchUsers()
    if (parentId && !parentProject) {
      fetchParent(parentId)
    } else if (project?.parentId && !parentProject) {
      fetchParent(project.parentId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, project?.parentId])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      setUsers(await res.json())
    } catch (e) {
      console.error(e)
    }
  }

  const fetchParent = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`)
      setFetchedParent(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setParentLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    if (name === 'status' && value === 'COMPLETED') {
      setFormData((prev) => ({ ...prev, [name]: value, progress: 100 }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const addAssignee = () => {
    if (!selectedUserId) return
    if (assigneesWithTasks.find((a) => a.userId === selectedUserId)) return
    const user = users.find((u) => u.id === selectedUserId)
    setAssigneesWithTasks((prev) => [
      ...prev,
      { userId: selectedUserId, userName: user?.name || '', tasks: [] },
    ])
    setSelectedUserId('')
  }

  const removeAssignee = (userId: string) => {
    setAssigneesWithTasks((prev) => prev.filter((a) => a.userId !== userId))
  }

  const addTask = (userId: string) => {
    const title = newTaskInputs[userId]?.trim()
    if (!title) return
    setAssigneesWithTasks((prev) =>
      prev.map((a) => (a.userId === userId ? { ...a, tasks: [...a.tasks, title] } : a))
    )
    setNewTaskInputs((prev) => ({ ...prev, [userId]: '' }))
  }

  const removeTask = (userId: string, idx: number) => {
    setAssigneesWithTasks((prev) =>
      prev.map((a) =>
        a.userId === userId ? { ...a, tasks: a.tasks.filter((_, i) => i !== idx) } : a
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // 입력 중인 할 일(아직 + 안 누른 것)을 assigneesWithTasks에 반영
    const finalAssignees = assigneesWithTasks.map((a) => {
      const pendingTask = newTaskInputs[a.userId]?.trim()
      if (pendingTask) {
        return { ...a, tasks: [...a.tasks, pendingTask] }
      }
      return a
    })

    try {
      const url = project ? `/api/projects/${project.id}` : '/api/projects'
      const method = project ? 'PATCH' : 'POST'

      const body: Record<string, unknown> = {
        name: formData.name,
        description: formData.description,
        parentId: parentId || project?.parentId || null,
      }

      // Level 0 (최상위): 목표, 핵심성과, 기간 + 담당자
      if (projectLevel === 0) {
        body.goal = formData.goal || null
        body.keyResults = formData.keyResults || null
        body.startDate = formData.startDate || null
        body.endDate = formData.endDate || null
        body.assigneeIds = finalAssignees.map((a) => a.userId)
      }

      // Level 1 (상위): 담당자만 (상태/진행률 자동)
      if (projectLevel === 1) {
        body.assigneeIds = finalAssignees.map((a) => a.userId)
      }

      // Level 2, 3 (하위/최하위): 담당자+업무, 상태/우선순위/기간/진행률
      if (projectLevel >= 2) {
        body.status = formData.status
        body.priority = formData.priority
        body.startDate = formData.startDate || null
        body.endDate = formData.endDate || null
        body.progress = formData.progress
        body.assigneesWithTasks = finalAssignees.map((a) => ({
          userId: a.userId,
          tasks: a.tasks.filter((t) => t.trim() !== ''),
        }))
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const saved = await res.json()
        if (onSuccess) onSuccess()
        router.push(`/projects/${saved.id}`)
        router.refresh()
      } else {
        throw new Error('Failed to save project')
      }
    } catch (err) {
      console.error(err)
      alert('프로젝트 저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const availableUsers = users.filter(
    (u) => !assigneesWithTasks.find((a) => a.userId === u.id)
  )

  const levelColor = PROJECT_LEVEL_COLORS[projectLevel as ProjectLevel] || 'bg-gray-100 text-gray-800'

  // 부모 프로젝트 로딩 중일 때 스피너 표시
  if (parentLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3" />
        <span className="text-sm text-gray-500">프로젝트 정보 불러오는 중...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 레벨 표시 */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Badge className={levelColor}>
          {PROJECT_LEVEL_LABELS[projectLevel as ProjectLevel]}
        </Badge>
        <span className="text-sm text-gray-500">
          {projectLevel === 0 && '목표, 핵심 성과, 기간, 담당자를 설정합니다'}
          {projectLevel === 1 && '담당자를 설정합니다. 상태와 진행률은 하위 프로젝트에 따라 자동 결정됩니다'}
          {projectLevel === 2 && '담당자, 업무, 상태, 우선순위, 기간을 설정합니다'}
          {projectLevel === 3 && '담당자, 업무, 상태, 우선순위, 기간을 설정합니다'}
        </span>
      </div>

      {/* 상위 프로젝트 표시 */}
      {fetchedParent && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <span className="font-medium">상위 프로젝트:</span> {fetchedParent.name}
        </div>
      )}

      {/* 프로젝트명 */}
      <Input
        label="프로젝트명 *"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="프로젝트 이름을 입력하세요"
        required
      />

      {/* 설명 - Markdown 에디터 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            프로젝트 설명 <span className="text-xs font-normal text-gray-400">(Markdown 지원)</span>
          </label>
          <button
            type="button"
            onClick={() => setDescPreview((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            {descPreview ? (
              <><Edit2 className="w-3 h-3" /> 편집</>
            ) : (
              <><Eye className="w-3 h-3" /> 미리보기</>
            )}
          </button>
        </div>
        {descPreview ? (
          <div className="min-h-[120px] p-4 border border-gray-200 rounded-lg bg-white prose prose-sm max-w-none">
            {formData.description ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {formData.description}
              </ReactMarkdown>
            ) : (
              <p className="text-gray-400 text-sm">내용이 없습니다</p>
            )}
          </div>
        ) : (
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder={`# 프로젝트 개요\n\n## 배경 및 목적\n\n## 주요 내용\n\n## 기대 효과`}
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono resize-y"
          />
        )}
        <p className="mt-1 text-xs text-gray-400">
          **굵게**, *기울임*, # 제목, - 목록, `코드`, | 표 등 Markdown 문법 사용 가능
        </p>
      </div>

      {/* Level 0 (최상위): 목표, 핵심 성과, 기간 */}
      {projectLevel === 0 && (
        <>
          {/* 목표 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              목표 <span className="text-xs font-normal text-gray-400">(Goal)</span>
            </label>
            <textarea
              name="goal"
              value={formData.goal}
              onChange={handleChange}
              placeholder="이 프로젝트를 통해 달성하고자 하는 목표를 입력하세요"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-y"
            />
          </div>

          {/* 핵심 성과 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              핵심 성과 <span className="text-xs font-normal text-gray-400">(Key Results)</span>
            </label>
            <textarea
              name="keyResults"
              value={formData.keyResults}
              onChange={handleChange}
              placeholder={`예시:\n- KR1: 월간 활성 사용자 20% 증가\n- KR2: 고객 만족도 4.5점 이상\n- KR3: 신규 기능 3개 출시`}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-y"
            />
          </div>

          {/* 기간 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="시작일"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
            />
            <Input
              label="종료일"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={handleChange}
            />
          </div>
        </>
      )}

      {/* Level 2, 3: 상태, 우선순위, 기간, 진행률 */}
      {projectLevel >= 2 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="상태"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Select
              label="우선순위"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="시작일"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
            />
            <Input
              label="종료일"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={handleChange}
            />
          </div>
          {/* 수정 모드에서 진행률 */}
          {project && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">진행률</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  name="progress"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={handleChange}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, Number(e.target.value) || 0))
                      setFormData((prev) => ({ ...prev, progress: val }))
                    }}
                    className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 담당자 섹션 (모든 레벨) */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          담당자
          {projectLevel >= 2 && (
            <span className="ml-1 text-xs font-normal text-gray-400">· 담당자별 할 일을 추가할 수 있습니다</span>
          )}
        </label>

        {availableUsers.length > 0 && (
          <div className="flex gap-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">담당자 선택...</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
            <Button type="button" size="sm" onClick={addAssignee} disabled={!selectedUserId}>
              <Plus className="w-4 h-4 mr-1" />
              추가
            </Button>
          </div>
        )}

        {assigneesWithTasks.length > 0 ? (
          <div className="space-y-2">
            {assigneesWithTasks.map((assignee) => {
              const user = users.find((u) => u.id === assignee.userId)
              // 하위(level 2), 최하위(level 3)에서만 할 일 표시
              const showTasks = projectLevel >= 2
              return (
                <div
                  key={assignee.userId}
                  className="border border-gray-200 rounded-lg p-3 bg-white"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-medium">
                        {(user?.name || assignee.userName || '?').charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900 text-sm">
                        {user?.name || assignee.userName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAssignee(assignee.userId)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 할 일 목록 - Level 2, 3만 */}
                  {showTasks && (
                    <div className="space-y-1.5 ml-9 mt-2">
                      {assignee.tasks.length > 0 && (
                        <div className="space-y-1">
                          {assignee.tasks.map((task, idx) => (
                            <div key={idx} className="flex items-center gap-2 group">
                              <CheckSquare className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="text-sm text-gray-700 flex-1">{task}</span>
                              <button
                                type="button"
                                onClick={() => removeTask(assignee.userId, idx)}
                                className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newTaskInputs[assignee.userId] || ''}
                          onChange={(e) =>
                            setNewTaskInputs((prev) => ({
                              ...prev,
                              [assignee.userId]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addTask(assignee.userId)
                            }
                          }}
                          placeholder="할 일 추가... (Enter)"
                          className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => addTask(assignee.userId)}
                          className="p-1 text-gray-400 hover:text-blue-500"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
            아직 배정된 담당자가 없습니다
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <Button type="submit" disabled={loading || parentLoading}>
          {loading ? '저장 중...' : project ? '수정하기' : '생성하기'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          취소
        </Button>
      </div>
    </form>
  )
}
