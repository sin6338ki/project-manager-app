'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { Badge } from '../ui/Badge'
import { Project, User, STATUS_LABELS, PRIORITY_LABELS, PROJECT_LEVEL_LABELS, ProjectLevel } from '@/types'

interface ProjectFormProps {
  project?: Project
  parentId?: string
  parentProject?: Project | null
}

// 프로젝트 레벨 계산 함수
function calculateProjectLevel(parentProject: Project | null | undefined): ProjectLevel {
  if (!parentProject) return 0 // 최상위 프로젝트
  if (!parentProject.parentId) return 1 // 분기별 프로젝트 (부모가 최상위)
  return 2 // 하위 프로젝트
}

export function ProjectForm({ project, parentId, parentProject }: ProjectFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [fetchedParentProject, setFetchedParentProject] = useState<Project | null>(parentProject || null)

  // 현재 생성/수정할 프로젝트의 레벨 결정
  const projectLevel = calculateProjectLevel(fetchedParentProject)

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
    assigneeIds: project?.assignees?.map((a) => a.userId) || [],
  })

  useEffect(() => {
    fetchUsers()
    // parentId가 있고 parentProject가 없으면 부모 프로젝트 정보 가져오기
    if (parentId && !parentProject) {
      fetchParentProject(parentId)
    }
    // 수정 모드에서 project의 parentId로 부모 정보 가져오기
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

      // 레벨에 따라 필요한 필드만 전송
      const body: Record<string, unknown> = {
        name: formData.name,
        description: formData.description,
        goal: formData.goal,
        keyResults: formData.keyResults,
        parentId: parentId || project?.parentId || null,
      }

      // Level 1 이상: 우선순위, 담당자 포함
      if (projectLevel >= 1) {
        body.priority = formData.priority
        body.assigneeIds = formData.assigneeIds
      }

      // Level 2 이상: 상태, 기간 포함
      if (projectLevel >= 2) {
        body.status = formData.status
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
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value)
    setFormData((prev) => ({ ...prev, assigneeIds: selectedOptions }))
  }

  const getLevelBadgeColor = (level: ProjectLevel) => {
    switch (level) {
      case 0: return 'bg-purple-100 text-purple-800'
      case 1: return 'bg-blue-100 text-blue-800'
      case 2: return 'bg-green-100 text-green-800'
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 프로젝트 레벨 표시 */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <Badge className={getLevelBadgeColor(projectLevel)}>
          {PROJECT_LEVEL_LABELS[projectLevel]}
        </Badge>
        <span className="text-sm text-gray-600">
          {projectLevel === 0 && '목표와 성과만 관리합니다'}
          {projectLevel === 1 && '목표, 성과 + 우선순위, 담당자를 관리합니다'}
          {projectLevel === 2 && '모든 필드를 관리합니다'}
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

      {/* Level 1 이상: 우선순위 */}
      {projectLevel >= 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Level 2 이상: 상태 */}
          {projectLevel >= 2 && (
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
          )}
        </div>
      )}

      {/* Level 2 이상: 기간 */}
      {projectLevel >= 2 && (
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
      )}

      {/* Level 2 이상이고 수정 모드: 진행률 */}
      {projectLevel >= 2 && project && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            진행률: {formData.progress}%
          </label>
          <input
            type="range"
            name="progress"
            min="0"
            max="100"
            value={formData.progress}
            onChange={handleChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}

      {/* Level 1 이상: 담당자 */}
      {projectLevel >= 1 && users.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            담당자 (Ctrl/Cmd + 클릭으로 여러 명 선택)
          </label>
          <select
            multiple
            value={formData.assigneeIds}
            onChange={handleAssigneeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            size={Math.min(users.length, 5)}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
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
