'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Quote, X, Trash2, Calendar, Users, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar, AvatarGroup } from '@/components/ui/Avatar'
import { Project, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, ProjectStatus, ProjectPriority } from '@/types'
import { useAuth } from '@/lib/auth-context'

interface QuoteData {
  id: string
  content: string
  author: string | null
}

// 모든 하위 프로젝트를 재귀적으로 가져오는 함수
function getAllSubProjects(project: Project): Project[] {
  const result: Project[] = []

  if (project.subProjects) {
    for (const sub of project.subProjects) {
      result.push(sub)
      result.push(...getAllSubProjects(sub))
    }
  }

  return result
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [randomQuote, setRandomQuote] = useState<QuoteData | null>(null)
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [allQuotes, setAllQuotes] = useState<QuoteData[]>([])
  const [newQuoteContent, setNewQuoteContent] = useState('')
  const [newQuoteAuthor, setNewQuoteAuthor] = useState('')
  const { isAdmin } = useAuth()

  useEffect(() => {
    fetchProjects()
    fetchRandomQuote()
  }, [])

  const fetchRandomQuote = async () => {
    try {
      const res = await fetch('/api/quotes?random=true')
      const data = await res.json()
      setRandomQuote(data)
    } catch (error) {
      console.error('Failed to fetch random quote:', error)
    }
  }

  const fetchAllQuotes = async () => {
    try {
      const res = await fetch('/api/quotes')
      const data = await res.json()
      setAllQuotes(data)
    } catch (error) {
      console.error('Failed to fetch quotes:', error)
    }
  }

  const handleAddQuote = async () => {
    if (!newQuoteContent.trim()) return
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newQuoteContent,
          author: newQuoteAuthor || null,
        }),
      })
      if (res.ok) {
        setNewQuoteContent('')
        setNewQuoteAuthor('')
        fetchAllQuotes()
        if (!randomQuote) {
          fetchRandomQuote()
        }
      }
    } catch (error) {
      console.error('Failed to add quote:', error)
    }
  }

  const handleDeleteQuote = async (id: string) => {
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchAllQuotes()
        if (randomQuote?.id === id) {
          fetchRandomQuote()
        }
      }
    } catch (error) {
      console.error('Failed to delete quote:', error)
    }
  }

  const openQuoteModal = () => {
    fetchAllQuotes()
    setShowQuoteModal(true)
  }

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects?parentId=null')
      const data = await res.json()
      setProjects(data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
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
      {/* 명언 섹션 */}
      {randomQuote && (
        <div
          className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-4 ${
            isAdmin ? 'cursor-pointer hover:from-blue-100 hover:to-indigo-100' : ''
          } transition-colors`}
          onClick={isAdmin ? openQuoteModal : undefined}
        >
          <div className="flex items-start gap-3">
            <Quote className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-800 italic">&ldquo;{randomQuote.content}&rdquo;</p>
              {randomQuote.author && (
                <p className="text-sm text-gray-500 mt-1">- {randomQuote.author}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {!randomQuote && (
        <div
          className={`bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 ${
            isAdmin ? 'cursor-pointer hover:bg-gray-100' : ''
          } transition-colors`}
          onClick={isAdmin ? openQuoteModal : undefined}
        >
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Quote className="w-5 h-5" />
            <span>{isAdmin ? '클릭하여 명언을 등록하세요' : '등록된 명언이 없습니다'}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-500">프로젝트 현황을 한눈에 확인하세요</p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            새 프로젝트
          </Button>
        </Link>
      </div>

      {/* 명언 관리 모달 */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">명언 관리</h2>
              <button
                onClick={() => setShowQuoteModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isAdmin && (
              <div className="p-4 border-b">
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="명언 내용을 입력하세요"
                    value={newQuoteContent}
                    onChange={(e) => setNewQuoteContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="저자 (선택사항)"
                      value={newQuoteAuthor}
                      onChange={(e) => setNewQuoteAuthor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button onClick={handleAddQuote} disabled={!newQuoteContent.trim()}>
                      추가
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {allQuotes.length > 0 ? (
                <ul className="space-y-3">
                  {allQuotes.map((quote) => (
                    <li key={quote.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-gray-800">&ldquo;{quote.content}&rdquo;</p>
                        {quote.author && (
                          <p className="text-sm text-gray-500 mt-1">- {quote.author}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteQuote(quote.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  등록된 명언이 없습니다
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 트렐로 스타일 칸반 보드 */}
      {projects.length > 0 ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {projects.map((topProject) => (
              <div
                key={topProject.id}
                className="w-80 flex-shrink-0 bg-gray-100 rounded-lg"
              >
                {/* 최상위 프로젝트 헤더 */}
                <div className="p-3 border-b border-gray-200">
                  <Link href={`/projects/${topProject.id}`}>
                    <div className="flex items-center justify-between group">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {topProject.name}
                      </h3>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                    </div>
                  </Link>
                  {topProject.goal && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{topProject.goal}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span>{getAllSubProjects(topProject).length}개 하위 프로젝트</span>
                  </div>
                </div>

                {/* 하위 프로젝트 카드들 */}
                <div className="p-2 space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto">
                  {topProject.subProjects && topProject.subProjects.length > 0 ? (
                    <>
                      {topProject.subProjects.map((subProject) => (
                        <SubProjectCard key={subProject.id} project={subProject} depth={1} />
                      ))}
                    </>
                  ) : (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      하위 프로젝트가 없습니다
                    </div>
                  )}

                  {/* 하위 프로젝트 추가 버튼 */}
                  <Link href={`/projects/new?parentId=${topProject.id}`}>
                    <button className="w-full p-2 text-sm text-gray-500 hover:bg-gray-200 rounded-lg flex items-center justify-center gap-1 transition-colors">
                      <Plus className="w-4 h-4" />
                      분기별 프로젝트 추가
                    </button>
                  </Link>
                </div>
              </div>
            ))}

            {/* 새 최상위 프로젝트 추가 */}
            <Link href="/projects/new">
              <div className="w-80 flex-shrink-0 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer">
                <div className="text-center">
                  <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-gray-500">새 프로젝트 추가</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">아직 프로젝트가 없습니다</p>
            <Link href="/projects/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                첫 프로젝트 만들기
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// 하위 프로젝트 카드 컴포넌트
function SubProjectCard({ project, depth }: { project: Project; depth: number }) {
  const assignees = project.assignees?.map((a) => ({
    name: a.user?.name || '',
    avatar: a.user?.avatar,
  })) || []

  const isLevel2OrMore = depth >= 2

  return (
    <div className="space-y-2">
      <Link href={`/projects/${project.id}`}>
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-shadow cursor-pointer ${
          depth === 1 ? 'border-l-4 border-l-blue-400' : 'border-l-4 border-l-green-400'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
              {project.name}
            </h4>
          </div>

          {/* 상태 및 우선순위 배지 */}
          <div className="flex flex-wrap gap-1 mb-2">
            <Badge className={`${STATUS_COLORS[project.status as ProjectStatus]} text-xs`}>
              {STATUS_LABELS[project.status as ProjectStatus]}
            </Badge>
            <Badge className={`${PRIORITY_COLORS[project.priority as ProjectPriority]} text-xs`}>
              {project.priority}
            </Badge>
          </div>

          {/* 날짜 표시 (Level 2 이상) */}
          {isLevel2OrMore && (project.startDate || project.endDate) && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
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

          {/* 담당자 */}
          {assignees.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-gray-400" />
                <AvatarGroup users={assignees} max={3} size="sm" />
              </div>
              {project.subProjects && project.subProjects.length > 0 && (
                <span className="text-xs text-gray-400">
                  +{project.subProjects.length}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* 중첩된 하위 프로젝트 */}
      {project.subProjects && project.subProjects.length > 0 && (
        <div className="ml-3 space-y-2">
          {project.subProjects.map((sub) => (
            <SubProjectCard key={sub.id} project={sub} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
