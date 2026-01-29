'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Calendar,
  Target,
  Trophy,
  MessageSquare,
  Milestone as MilestoneIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Avatar, AvatarGroup } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { ProjectCard } from '@/components/projects/ProjectCard'
import {
  Project,
  STATUS_LABELS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  ProjectStatus,
  ProjectPriority,
  PROJECT_LEVEL_LABELS,
  ProjectLevel,
} from '@/types'

// 프로젝트 레벨 계산 함수
function getProjectLevel(project: Project): ProjectLevel {
  if (!project.parentId) return 0 // 최상위 프로젝트
  if (project.parent && !project.parent.parentId) return 1 // 분기별 프로젝트
  return 2 // 하위 프로젝트
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchProject()
    }
  }, [params.id])

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setProject(data)
      } else {
        router.push('/projects')
      }
    } catch (error) {
      console.error('Failed to fetch project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/projects/${params.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push(project?.parentId ? `/projects/${project.parentId}` : '/projects')
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!project) {
    return null
  }

  const assignees = project.assignees?.map((a) => ({
    name: a.user?.name || '',
    avatar: a.user?.avatar,
  })) || []

  const projectLevel = getProjectLevel(project)

  const getLevelBadgeColor = (level: ProjectLevel) => {
    switch (level) {
      case 0: return 'bg-purple-100 text-purple-800'
      case 1: return 'bg-blue-100 text-blue-800'
      case 2: return 'bg-green-100 text-green-800'
    }
  }

  // 하위 프로젝트 추가 시 텍스트 결정
  const getSubProjectLabel = () => {
    if (projectLevel === 0) return '분기별 프로젝트'
    return '하위 프로젝트'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로
        </Button>
        {project.parent && (
          <span className="text-sm text-gray-500">
            <Link href={`/projects/${project.parent.id}`} className="hover:text-blue-600">
              {project.parent.name}
            </Link>
            {' > '}{project.name}
          </span>
        )}
      </div>

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <Badge className={getLevelBadgeColor(projectLevel)}>
              {PROJECT_LEVEL_LABELS[projectLevel]}
            </Badge>
            {/* Level 2 이상: 상태 표시 */}
            {projectLevel >= 2 && (
              <Badge className={STATUS_COLORS[project.status as ProjectStatus]}>
                {STATUS_LABELS[project.status as ProjectStatus]}
              </Badge>
            )}
            {/* Level 1 이상: 우선순위 표시 */}
            {projectLevel >= 1 && (
              <Badge className={PRIORITY_COLORS[project.priority as ProjectPriority]}>
                {PRIORITY_LABELS[project.priority as ProjectPriority]}
              </Badge>
            )}
          </div>
          {project.description && (
            <p className="text-gray-600">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowEditModal(true)}>
            <Edit className="w-4 h-4 mr-2" />
            수정
          </Button>
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            삭제
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Level 2 이상: 진행 현황 표시 */}
          {projectLevel >= 2 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">진행 현황</h2>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-4">
                  <span className="text-3xl font-bold text-gray-900">{project.progress}%</span>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {project.startDate
                        ? format(new Date(project.startDate), 'yyyy.M.d', { locale: ko })
                        : '미정'}
                      {' - '}
                      {project.endDate
                        ? format(new Date(project.endDate), 'yyyy.M.d', { locale: ko })
                        : '미정'}
                    </div>
                  </div>
                </div>
                <ProgressBar value={project.progress} size="lg" />
              </CardContent>
            </Card>
          )}

          {(project.goal || project.keyResults) && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">목표 및 주요 성과</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.goal && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <h3 className="font-medium text-gray-900">목표</h3>
                    </div>
                    <p className="text-gray-600 whitespace-pre-wrap">{project.goal}</p>
                  </div>
                )}
                {project.keyResults && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-4 h-4 text-amber-600" />
                      <h3 className="font-medium text-gray-900">주요 성과 (Key Results)</h3>
                    </div>
                    <p className="text-gray-600 whitespace-pre-wrap">{project.keyResults}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {getSubProjectLabel()} ({project.subProjects?.length || 0})
              </h2>
              <Link href={`/projects/new?parentId=${project.id}`}>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {getSubProjectLabel()} 추가
                </Button>
              </Link>
            </div>
            {project.subProjects && project.subProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.subProjects.map((subProject) => (
                  <ProjectCard key={subProject.id} project={subProject} showLevel />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500 mb-4">{getSubProjectLabel()}가 없습니다</p>
                  <Link href={`/projects/new?parentId=${project.id}`}>
                    <Button variant="secondary" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      {getSubProjectLabel()} 추가
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {project.milestones && project.milestones.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MilestoneIcon className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900">마일스톤</h2>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {project.milestones.map((milestone) => (
                    <li key={milestone.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={milestone.completed}
                          readOnly
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className={milestone.completed ? 'line-through text-gray-400' : ''}>
                          {milestone.name}
                        </span>
                      </div>
                      {milestone.dueDate && (
                        <span className="text-sm text-gray-500">
                          {format(new Date(milestone.dueDate), 'M/d', { locale: ko })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Level 1 이상: 담당자 표시 */}
          {projectLevel >= 1 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">담당자</h2>
              </CardHeader>
              <CardContent>
                {assignees.length > 0 ? (
                  <ul className="space-y-3">
                    {project.assignees?.map((assignee) => (
                      <li key={assignee.id} className="flex items-center gap-3">
                        <Avatar
                          name={assignee.user?.name || ''}
                          src={assignee.user?.avatar}
                          size="md"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{assignee.user?.name}</p>
                          <p className="text-sm text-gray-500">
                            {assignee.role === 'lead' ? '프로젝트 리드' : '멤버'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">배정된 담당자가 없습니다</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">
                  코멘트 ({project.comments?.length || 0})
                </h2>
              </div>
            </CardHeader>
            <CardContent>
              {project.comments && project.comments.length > 0 ? (
                <ul className="space-y-4">
                  {project.comments.slice(0, 5).map((comment) => (
                    <li key={comment.id} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar
                          name={comment.user?.name || ''}
                          src={comment.user?.avatar}
                          size="sm"
                        />
                        <span className="font-medium">{comment.user?.name}</span>
                        <span className="text-gray-400">
                          {format(new Date(comment.createdAt), 'M/d HH:mm', { locale: ko })}
                        </span>
                      </div>
                      <p className="text-gray-600 ml-8">{comment.content}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">아직 코멘트가 없습니다</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="프로젝트 수정"
        size="lg"
      >
        <ProjectForm
          project={project}
        />
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="프로젝트 삭제"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            정말 이 프로젝트를 삭제하시겠습니까? 하위 프로젝트도 함께 삭제됩니다.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              취소
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              삭제
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
