'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, CheckSquare } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { Badge } from '../ui/Badge'
import { Project, User, STATUS_LABELS, PRIORITY_LABELS, PROJECT_LEVEL_LABELS, ProjectLevel, AssigneeRole, ASSIGNEE_ROLE_LABELS } from '@/types'

interface AssigneeWithTasks {
  userId: string
  userName?: string
  role: AssigneeRole
  tasks: string[]
}

interface ProjectFormProps {
  project?: Project
  parentId?: string
  parentProject?: Project | null
  onSuccess?: () => void
}

// 프로젝트 레벨 계산 함수
function calculateProjectLevel(parentProject: Project | null | undefined, editingProject?: Project): ProjectLevel {
  // 수정 모드에서 부모 프로젝트를 아직 못 가져온 경우, 기존 프로젝트 정보로 레벨 추정
  if (!parentProject && editingProject) {
    if (!editingProject.parentId) return 0 // 최상위 프로젝트
    // parentId가 있으면 최소 Level 1 이상
    // parent 객체가 있으면 더 정확하게 판단
    if (editingProject.parent && !editingProject.parent.parentId) return 1
    if (editingProject.parent && editingProject.parent.parentId) return 2
    // parent 객체가 없으면 Level 1로 추정 (분기별)
    return 1
  }
  if (!parentProject) return 0 // 최상위 프로젝트
  if (!parentProject.parentId) return 1 // 분기별 프로젝트 (부모가 최상위)
  return 2 // 하위 프로젝트
}

export function ProjectForm({ project, parentId, parentProject, onSuccess }: ProjectFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [fetchedParentProject, setFetchedParentProject] = useState<Project | null>(parentProject || null)

  // 현재 생성/수정할 프로젝트의 레벨 결정
  const projectLevel = calculateProjectLevel(fetchedParentProject, project)

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

  // 담당자 + 업무 관리
  const [assigneesWithTasks, setAssigneesWithTasks] = useState<AssigneeWithTasks[]>(() => {
    if (project?.assignees && project.assignees.length > 0) {
      return project.assignees.map((a) => ({
        userId: a.userId,
        userName: a.user?.name || '',
        role: (a.role as AssigneeRole) || 'support',
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
      fetchParentProject(parentId)
    }
    if (project?.parentId && !parentProject) {
      fetchParentProject(project.parentId)
    }
  }, [parentId, project?.parentId, parentProject])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchParentProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`)
      const data = await res.json()
      setFetchedParentProject(data)
    } catch (error) {
      console.error('Failed to fetch parent project:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = project ? `/api/projects/${project.id}` : '/api/projects'
      const method = project ? 'PATCH' : 'POST'

      const body: Record<string, unknown> = {
        name: formData.name,
        description: formData.description,
        goal: formData.goal,
        keyResults: formData.keyResults,
        parentId: parentId || project?.parentId || null,
      }

      // Level 1 이상: 담당자 포함
      if (projectLevel >= 1) {
        body.assigneesWithTasks = assigneesWithTasks.map((a) => ({
          userId: a.userId,
          role: a.role,
          tasks: a.tasks.filter((t) => t.trim() !== ''),
        }))
      }

      // Level 2 이상: 상태, 우선순위, 기간 포함
      if (projectLevel >= 2) {
        body.status = formData.status
        body.priority = formData.priority
        body.startDate = formData.startDate || null
        body.endDate = formData.endDate || null
        body.progress = formData.progress
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const savedProject = await res.json()
        if (onSuccess) {
          onSuccess()
        }
        router.push(`/projects/${savedProject.id}`)
        router.refresh()
      } else {
        throw new Error('Failed to save project')
      }
    } catch (error) {
      console.error('Failed to save project:', error)
      alert('프로젝트 저장에 실패했습니다')
    } finally {
      setLoading(false)
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

  // 담당자 추가
  const addAssignee = () => {
    if (!selectedUserId) return
    if (assigneesWithTasks.find((a) => a.userId === selectedUserId)) return

    const user = users.find((u) => u.id === selectedUserId)
    setAssigneesWithTasks((prev) => [
      ...prev,
      { userId: selectedUserId, userName: user?.name || '', role: 'support', tasks: [] },
    ])
    setSelectedUserId('')
  }

  // 담당자 제거
  const removeAssignee = (userId: string) => {
    setAssigneesWithTasks((prev) => prev.filter((a) => a.userId !== userId))
  }

  // 업무 추가
  const addTask = (userId: string) => {
    const taskTitle = newTaskInputs[userId]?.trim()
    if (!taskTitle) return

    setAssigneesWithTasks((prev) =>
      prev.map((a) =>
        a.userId === userId ? { ...a, tasks: [...a.tasks, taskTitle] } : a
      )
    )
    setNewTaskInputs((prev) => ({ ...prev, [userId]: '' }))
  }

  // 업무 삭제
  const removeTask = (userId: string, taskIndex: number) => {
    setAssigneesWithTasks((prev) =>
      prev.map((a) =>
        a.userId === userId
          ? { ...a, tasks: a.tasks.filter((_, i) => i !== taskIndex) }
          : a
      )
    )
  }

  const getLevelBadgeColor = (level: ProjectLevel) => {
    switch (level) {
      case 0: return 'bg-purple-100 text-purple-800'
      case 1: return 'bg-blue-100 text-blue-800'
      case 2: return 'bg-green-100 text-green-800'
    }
  }

  // 아직 배정되지 않은 사용자 목록
  const availableUsers = users.filter(
    (u) => !assigneesWithTasks.find((a) => a.userId === u.id)
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 프로젝트 레벨 표시 */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <Badge className={getLevelBadgeColor(projectLevel)}>
          {PROJECT_LEVEL_LABELS[projectLevel]}
        </Badge>
        <span className="text-sm text-gray-600">
          {projectLevel === 0 && '목표와 성과를 관리합니다'}
          {projectLevel === 1 && '목표, 성과 + 담당자를 관리합니다'}
          {projectLevel === 2 && '모든 필드를 관리합니다 (상태, 우선순위, 일정, 진행률 포함)'}
        </span>
      </div>

      {/* 부모 프로젝트 정보 */}
      {fetchedParentProject && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-medium">상위 프로젝트:</span> {fetchedParentProject.name}
          </p>
        </div>
      )}

      <Input
        label="프로젝트명 *"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="프로젝트 이름을 입력하세요"
        required
      />

      <Textarea
        label="상세 설명"
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="프로젝트에 대한 상세 설명을 입력하세요"
        rows={4}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Textarea
          label="목표"
          name="goal"
          value={formData.goal}
          onChange={handleChange}
          placeholder="프로젝트 목표를 입력하세요"
          rows={3}
        />

        <Textarea
          label="주요 성과 (Key Results)"
          name="keyResults"
          value={formData.keyResults}
          onChange={handleChange}
          placeholder="주요 성과 지표를 입력하세요"
          rows={3}
        />
      </div>

      {/* Level 2 이상: 상태, 우선순위, 기간 */}
      {projectLevel >= 2 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="상태"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />

            <Select
              label="우선순위"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
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
        </>
      )}

      {/* Level 2 이상이고 수정 모드: 진행률 */}
      {projectLevel >= 2 && project && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            진행률
          </label>
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
                name="progress"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, Number(e.target.value) || 0))
                  setFormData((prev) => ({ ...prev, progress: val }))
                }}
                className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
        </div>
      )}

      {/* Level 1 이상: 담당자 + 업무 관리 */}
      {projectLevel >= 1 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            담당자 및 업무 배정
          </label>

          {/* 담당자 추가 */}
          {availableUsers.length > 0 && (
            <div className="flex gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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

          {/* 배정된 담당자 목록 + 업무 */}
          {assigneesWithTasks.length > 0 ? (
            <div className="space-y-3">
              {assigneesWithTasks.map((assignee, idx) => {
                const user = users.find((u) => u.id === assignee.userId)
                return (
                  <div
                    key={assignee.userId}
                    className="border border-gray-200 rounded-lg p-4 bg-white"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-medium">
                          {(user?.name || assignee.userName || '?').charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">
                          {user?.name || assignee.userName}
                        </span>
                        <select
                          value={assignee.role}
                          onChange={(e) => {
                            const newRole = e.target.value as AssigneeRole
                            setAssigneesWithTasks((prev) =>
                              prev.map((a) =>
                                a.userId === assignee.userId ? { ...a, role: newRole } : a
                              )
                            )
                          }}
                          className="px-2 py-0.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          {Object.entries(ASSIGNEE_ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAssignee(assignee.userId)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 업무 목록 */}
                    <div className="space-y-2 ml-10">
                      {assignee.tasks.map((task, taskIdx) => (
                        <div
                          key={taskIdx}
                          className="flex items-center gap-2 group"
                        >
                          <CheckSquare className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700 flex-1">{task}</span>
                          <button
                            type="button"
                            onClick={() => removeTask(assignee.userId, taskIdx)}
                            className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {/* 새 업무 입력 */}
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
                          placeholder="업무 추가... (Enter로 추가)"
                          className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => addTask(assignee.userId)}
                          className="p-1 text-gray-400 hover:text-blue-500"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
              아직 배정된 담당자가 없습니다. 위에서 담당자를 선택하고 추가해주세요.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? '저장 중...' : project ? '수정하기' : '생성하기'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          취소
        </Button>
      </div>
    </form>
  )
}
