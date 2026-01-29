'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'

interface User {
  id: string
  name: string
  email: string
  avatar?: string | null
  role: string
  _count?: {
    assignedProjects: number
    comments: number
  }
}

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'member',
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        await fetchUsers()
        handleCloseModal()
      } else {
        const err = await res.json()
        alert(err.error || '저장에 실패했습니다')
      }
    } catch (error) {
      console.error('Failed to save user:', error)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('정말 이 팀원을 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchUsers()
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
    })
    setShowUserModal(true)
  }

  const handleCloseModal = () => {
    setShowUserModal(false)
    setEditingUser(null)
    setFormData({ name: '', email: '', role: 'member' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-gray-500">팀원 및 시스템 설정을 관리합니다</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">팀원 관리</h2>
            <p className="text-sm text-gray-500">프로젝트에 배정할 팀원을 관리합니다</p>
          </div>
          <Button
            onClick={() => {
              setEditingUser(null)
              setFormData({ name: '', email: '', role: 'member' })
              setShowUserModal(true)
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            팀원 추가
          </Button>
        </CardHeader>
        <CardContent>
          {users.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <Avatar name={user.name} src={user.avatar} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <Badge variant={user.role === 'admin' ? 'info' : 'default'}>
                          {user.role === 'admin' ? '관리자' : '멤버'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {user._count?.assignedProjects || 0}개 프로젝트
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">아직 등록된 팀원이 없습니다</p>
              <Button
                onClick={() => {
                  setFormData({ name: '', email: '', role: 'member' })
                  setShowUserModal(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                첫 팀원 추가하기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showUserModal}
        onClose={handleCloseModal}
        title={editingUser ? '팀원 수정' : '팀원 추가'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="이름"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="이름을 입력하세요"
            required
          />
          <Input
            label="이메일"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="email@example.com"
            required
          />
          <Select
            label="역할"
            value={formData.role}
            onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
            options={[
              { value: 'member', label: '멤버' },
              { value: 'admin', label: '관리자' },
            ]}
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit">
              {editingUser ? '수정' : '추가'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              취소
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
