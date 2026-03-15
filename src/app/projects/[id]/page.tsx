'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Calendar,
  MessageSquare,
  CheckSquare,
  Square,
  ClipboardList,
  Send,
  X,
  Target,
  KeyRound,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { ProjectCard } from '@/components/projects/ProjectCard'
import {
  Project,
  User,
  STATUS_LABELS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  ProjectStatus,
  ProjectPriority,
  PROJECT_LEVEL_LABELS,
  PROJECT_LEVEL_COLORS,
  getProjectLevel,
} from '@/types'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 코멘트
  const [users, setUsers] = useState<User[]>([])
  const [commentUserId, setCommentUserId] = useState<string>('')
  const [commentContent, setCommentContent] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  const fetchProject = useCallback(async () => {
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
  }, [params.id, router])

  useEffect(() => {
    if (params.id) {
      fetchProject()
    }
  }, [params.id, fetchProject])

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((data: User[]) => {
        setUsers(data)
        if (data.length > 0) setCommentUserId(data[0].id)
      })
      .catch(console.error)
  }, [])

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

  const handleCommentSubmit = async () => {
    if (!commentContent.trim() || !commentUserId) return
    setCommentSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${params.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentContent.trim(), userId: commentUserId }),
      })
      if (res.ok) {
        setCommentContent('')
        fetchProject()
      }
    } catch (error) {
      console.error('Failed to post comment:', error)
    } finally {
      setCommentSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      await fetch(`/api/projects/${params.id}/comments?commentId=${commentId}`, {
        method: 'DELETE',
      })
      fetchProject()
    } catch (error) {
      console.error('Failed to delete comment:', error)
    }
  }

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      })
      fetchProject()
    } catch (err) {
      console.error('Failed to toggle task:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!project) return null

  const projectLevel = getProjectLevel(project)

  // 서브 프로젝트 라벨
  const getSubProjectLabel = () => {
    if (projectLevel === 0) return '상위 프로젝트'
    if (projectLevel === 1) return '하위 프로젝트'
    return '최하위 프로젝트'
  }

  // 빵 부스러기 (breadcrumb)
  const breadcrumbs: { id: string; name: string }[] = []
  if (project.parent?.parent?.parent) {
    breadcrumbs.push({ id: project.parent.parent.parent.id, name: project.parent.parent.parent.name })
  }
  if (project.parent?.parent) {
    breadcrumbs.push({ id: project.parent.parent.id, name: project.parent.parent.name })
  }
  if (project.parent) {
    breadcrumbs.push({ id: project.parent.id, name: project.parent.name })
  }

  return (
    <div className="space-y-6">
      {/* 상단 네비게이션 */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          뒤로
        </Button>
        {breadcrumbs.map((bc, idx) => (
          <span key={bc.id} className="flex items-center gap-1 text-sm text-gray-500">
            {idx > 0 && <span>/</span>}
            <Link href={`/projects/${bc.id}`} className="hover:text-blue-600 transition-colors">
              {bc.name}
            </Link>
          </span>
        ))}
        {breadcrumbs.length > 0 && (
          <span className="text-sm text-gray-400">/</span>
        )}
        <span className="text-sm font-medium text-gray-900">{project.name}</span>
      </div>

      {/* 프로젝트 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <Badge className={PROJECT_LEVEL_COLORS[projectLevel]}>
              {PROJECT_LEVEL_LABELS[projectLevel]}
            </Badge>
            {/* 레벨 2/3: 직접 상태/우선순위 표시 */}
            {projectLevel >= 2 && (
              <>
                <Badge className={STATUS_COLORS[project.status as ProjectStatus]}>
                  {STATUS_LABELS[project.status as ProjectStatus]}
                </Badge>
                <Badge className={PRIORITY_COLORS[project.priority as ProjectPriority]}>
                  {PRIORITY_LABELS[project.priority as ProjectPriority]}
                </Badge>
              </>
            )}
            {/* 레벨 0/1: 자동 상태 배지 */}
            {projectLevel <= 1 && (
              <Badge className={`${STATUS_COLORS[project.status as ProjectStatus]} opacity-80`}>
                {STATUS_LABELS[project.status as ProjectStatus]}
                <span className="ml-1 text-xs opacity-60">(자동)</span>
              </Badge>
            )}
          </div>

          {/* 설명 - 마크다운 렌더링 */}
          {project.description && (
            <div className="prose prose-sm max-w-none text-gray-600 mt-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {project.description}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
            <Edit className="w-4 h-4 mr-1" />
            수정
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4 mr-1" />
            삭제
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 메인 컨텐츠 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 레벨 0: 목표 */}
          {projectLevel === 0 && project.goal && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  <h2 className="text-lg font-semibold text-gray-900">목표 (Goal)</h2>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{project.goal}</p>
              </CardContent>
            </Card>
          )}

          {/* 레벨 0: 핵심 성과 */}
          {projectLevel === 0 && project.keyResults && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-purple-500" />
                  <h2 className="text-lg font-semibold text-gray-900">핵심 성과 (Key Results)</h2>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{project.keyResults}</p>
              </CardContent>
            </Card>
          )}

          {/* 레벨 0: 기간 표시 */}
          {projectLevel === 0 && (project.startDate || project.endDate) && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <h2 className="text-lg font-semibold text-gray-900">프로젝트 기간</h2>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  {project.startDate
                    ? format(new Date(project.startDate), 'yyyy년 M월 d일', { locale: ko })
                    : '미정'}
                  {' ~ '}
                  {project.endDate
                    ? format(new Date(project.endDate), 'yyyy년 M월 d일', { locale: ko })
                    : '미정'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* 레벨 1: 자동 진행률 */}
          {projectLevel === 1 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">
                  진행 현황
                  <span className="ml-2 text-sm font-normal text-gray-400">(하위 프로젝트 기준 자동 계산)</span>
                </h2>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-3">
                  <span className="text-3xl font-bold text-gray-900">{project.progress}%</span>
                </div>
                <ProgressBar value={project.progress} size="lg" />
              </CardContent>
            </Card>
          )}

          {/* 레벨 2/3: 직접 진행 현황 */}
          {projectLevel >= 2 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">진행 현황</h2>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-3">
                  <span className="text-3xl font-bold text-gray-900">{project.progress}%</span>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {project.startDate
                        ? format(new Date(project.startDate), 'yyyy.M.d', { locale: ko })
                        : '미정'}
                      {' - '}
                      {project.endDate
                        ? format(new Date(project.endDate), 'yyyy.M.d', { locale: ko })
                        : '미정'}
                    </span>
                  </div>
                </div>
                <ProgressBar value={project.progress} size="lg" />
              </CardContent>
            </Card>
          )}

          {/* 하위 프로젝트 목록 (레벨 3은 하위 없음) */}
          {projectLevel < 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {getSubProjectLabel()} ({project.subProjects?.length || 0})
                </h2>
                <Link href={`/projects/new?parentId=${project.id}`}>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
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
                        <Plus className="w-4 h-4 mr-1" />
                        {getSubProjectLabel()} 추가
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* 코멘트 섹션 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">
                  코멘트 ({project.comments?.length || 0})
                </h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 코멘트 입력 */}
              <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center gap-2">
                  <select
                    value={commentUserId}
                    onChange={(e) => setCommentUserId(e.target.value)}
                    className="text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-400">로 코멘트 작성</span>
                </div>
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      handleCommentSubmit()
                    }
                  }}
                  placeholder="코멘트를 입력하세요... (Ctrl+Enter로 전송)"
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleCommentSubmit}
                    disabled={!commentContent.trim() || commentSubmitting}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    {commentSubmitting ? '전송 중...' : '전송'}
                  </Button>
                </div>
              </div>

              {/* 코멘트 목록 */}
              {project.comments && project.comments.length > 0 ? (
                <ul className="space-y-3">
                  {project.comments.map((comment) => (
                    <li
                      key={comment.id}
                      className="flex items-start gap-3 group p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Avatar
                        name={comment.user?.name || ''}
                        src={comment.user?.avatar}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-gray-900">
                            {comment.user?.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {format(new Date(comment.createdAt), 'M/d HH:mm', { locale: ko })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1 rounded flex-shrink-0"
                        title="삭제"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">아직 코멘트가 없습니다</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽: 사이드바 */}
        <div className="space-y-6">
          {/* 담당자 및 업무 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900">담당자</h2>
              </div>
            </CardHeader>
            <CardContent>
              {project.assignees && project.assignees.length > 0 ? (
                <div className="space-y-4">
                  {project.assignees.map((assignee) => {
                    const tasks = assignee.tasks || []
                    const completedCount = tasks.filter((t) => t.completed).length
                    const showTasks = projectLevel >= 2 && tasks.length > 0

                    return (
                      <div key={assignee.id} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar
                            name={assignee.user?.name || ''}
                            src={assignee.user?.avatar}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {assignee.user?.name}
                            </p>
                            {showTasks && (
                              <p className="text-xs text-gray-400">
                                업무 {completedCount}/{tasks.length} 완료
                              </p>
                            )}
                          </div>
                        </div>

                        {/* 업무 목록 (레벨 2/3만) */}
                        {showTasks && (
                          <div className="ml-11 space-y-1.5">
                            {tasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 cursor-pointer group/task"
                                onClick={() => handleToggleTask(task.id, !task.completed)}
                              >
                                {task.completed ? (
                                  <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-gray-300 group-hover/task:text-blue-500 flex-shrink-0 transition-colors" />
                                )}
                                <span
                                  className={`text-sm ${
                                    task.completed
                                      ? 'line-through text-gray-400'
                                      : 'text-gray-700'
                                  }`}
                                >
                                  {task.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">배정된 담당자가 없습니다</p>
              )}
            </CardContent>
          </Card>

          {/* 프로젝트 정보 */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">프로젝트 정보</h2>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">레벨</dt>
                  <dd>
                    <Badge className={PROJECT_LEVEL_COLORS[projectLevel]}>
                      {PROJECT_LEVEL_LABELS[projectLevel]}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-500">상태</dt>
                  <dd>
                    <Badge className={STATUS_COLORS[project.status as ProjectStatus]}>
                      {STATUS_LABELS[project.status as ProjectStatus]}
                      {projectLevel <= 1 && (
                        <span className="ml-1 opacity-60 text-xs">(자동)</span>
                      )}
                    </Badge>
                  </dd>
                </div>
                {projectLevel >= 2 && (
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500">우선순위</dt>
                    <dd>
                      <Badge className={PRIORITY_COLORS[project.priority as ProjectPriority]}>
                        {PRIORITY_LABELS[project.priority as ProjectPriority]}
                      </Badge>
                    </dd>
                  </div>
                )}
                {(project.startDate || project.endDate) && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">기간</dt>
                    <dd className="text-gray-700 text-right">
                      <div>{project.startDate ? format(new Date(project.startDate), 'yyyy.M.d', { locale: ko }) : '미정'}</div>
                      <div className="text-gray-400 text-xs">~ {project.endDate ? format(new Date(project.endDate), 'yyyy.M.d', { locale: ko }) : '미정'}</div>
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">생성일</dt>
                  <dd className="text-gray-700">
                    {format(new Date(project.createdAt), 'yyyy.M.d', { locale: ko })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">수정일</dt>
                  <dd className="text-gray-700">
                    {format(new Date(project.updatedAt), 'yyyy.M.d', { locale: ko })}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 수정 모달 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="프로젝트 수정"
        size="lg"
      >
        <ProjectForm
          project={project}
          parentProject={project.parent || null}
          onSuccess={() => {
            setShowEditModal(false)
            fetchProject()
          }}
        />
      </Modal>

      {/* 삭제 확인 모달 */}
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
