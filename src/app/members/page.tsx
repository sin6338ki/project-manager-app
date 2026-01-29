'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Plus, Trash2, X } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import {
  STATUS_COLORS,
  STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  ProjectStatus,
  ProjectPriority,
} from '@/types'
import { useAuth } from '@/lib/auth-context'

interface UserWithProjects {
  id: string
  name: string
  email: string
  avatar?: string | null
  role: string
  assignedProjects: {
    id: string
    role: string
    project: {
      id: string
      name: string
      status: string
      priority: string
      progress: number
      startDate?: string | null
      endDate?: string | null
      parentId?: string | null
      parent?: { name: string } | null
    }
  }[]
  _count: {
    assignedProjects: number
    comments: number
  }
}

export default function MembersPage() {
  const [users, setUsers] = useState<UserWithProjects[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const { isAdmin } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data)
      if (data.length > 0) {
        setSelectedUser(data[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedUserData = users.find((u) => u.id === selectedUser)

  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) return
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
        }),
      })
      if (res.ok) {
        setNewUserName('')
        setNewUserEmail('')
        setShowAddModal(false)
        fetchUsers()
      }
    } catch (error) {
      console.error('Failed to add user:', error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteConfirmId(null)
        if (selectedUser === userId) {
          setSelectedUser(null)
        }
        fetchUsers()
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
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
          <h1 className="text-2xl font-bold text-gray-900">담당자별 업무</h1>
          <p className="text-gray-500">팀원별 배정된 프로젝트를 확인하세요</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            담당자 추가
          </Button>
        )}
      </div>

      {/* 담당자 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">새 담당자 추가</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  placeholder="홍길동"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                  취소
                </Button>
                <Button
                  onClick={handleAddUser}
                  disabled={!newUserName.trim() || !newUserEmail.trim()}
                >
                  추가
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-4">
            <h3 className="text-lg font-semibold mb-2">담당자 삭제</h3>
            <p className="text-gray-600 mb-4">
              이 담당자를 삭제하시겠습니까? 관련 프로젝트 배정도 함께 삭제됩니다.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
                취소
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDeleteUser(deleteConfirmId)}
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}

      {users.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-2">등록된 팀원이 없습니다</p>
            <p className="text-sm text-gray-400">설정에서 팀원을 추가하세요</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className={`p-3 rounded-lg transition-colors flex items-center gap-3 group ${
                  selectedUser === user.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-white border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => setSelectedUser(user.id)}
                >
                  <Avatar name={user.name} src={user.avatar} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500">
                      {user._count.assignedProjects}개 프로젝트
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirmId(user.id)
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="lg:col-span-3">
            {selectedUserData ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar name={selectedUserData.name} src={selectedUserData.avatar} size="lg" />
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedUserData.name}
                        </h2>
                        <p className="text-sm text-gray-500">{selectedUserData.email}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedUserData.assignedProjects.length}
                        </p>
                        <p className="text-sm text-gray-500">전체 프로젝트</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedUserData.assignedProjects.filter(
                            (a) => a.project.status === 'IN_PROGRESS'
                          ).length}
                        </p>
                        <p className="text-sm text-gray-500">진행중</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {selectedUserData.assignedProjects.filter(
                            (a) => a.project.status === 'COMPLETED'
                          ).length}
                        </p>
                        <p className="text-sm text-gray-500">완료</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  {selectedUserData.assignedProjects.length > 0 ? (
                    selectedUserData.assignedProjects.map((assignment) => (
                      <Link key={assignment.id} href={`/projects/${assignment.project.id}`}>
                        <Card className="hover:shadow-md transition-shadow mb-3">
                          <CardContent>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                {assignment.project.parent && (
                                  <p className="text-xs text-gray-400 mb-1">
                                    {assignment.project.parent.name}
                                  </p>
                                )}
                                <h3 className="font-medium text-gray-900">
                                  {assignment.project.name}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <Badge className={STATUS_COLORS[assignment.project.status as ProjectStatus]}>
                                  {STATUS_LABELS[assignment.project.status as ProjectStatus]}
                                </Badge>
                                <Badge className={PRIORITY_COLORS[assignment.project.priority as ProjectPriority]}>
                                  {PRIORITY_LABELS[assignment.project.priority as ProjectPriority]}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <ProgressBar value={assignment.project.progress} size="sm" />
                              </div>
                              <span className="text-sm text-gray-500">
                                {assignment.project.progress}%
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                              <span>
                                역할: {assignment.role === 'lead' ? '리드' : '멤버'}
                              </span>
                              {(assignment.project.startDate || assignment.project.endDate) && (
                                <span>
                                  {assignment.project.startDate
                                    ? format(new Date(assignment.project.startDate), 'M/d', { locale: ko })
                                    : '미정'}
                                  {' - '}
                                  {assignment.project.endDate
                                    ? format(new Date(assignment.project.endDate), 'M/d', { locale: ko })
                                    : '미정'}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="text-center py-8">
                        <p className="text-gray-500">배정된 프로젝트가 없습니다</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">팀원을 선택하세요</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
