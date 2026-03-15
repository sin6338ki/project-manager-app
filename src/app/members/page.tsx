'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Plus,
  Trash2,
  X,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  FolderOpen,
} from 'lucide-react'
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

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

interface AssigneeTask {
  id: string
  title: string
  completed: boolean
}

interface AssignedProject {
  id: string           // ProjectAssignee.id
  role: string
  tasks: AssigneeTask[]
  project: {
    id: string
    name: string
    status: string
    priority: string
    progress: number
    startDate?: string | null
    endDate?: string | null
    parentId?: string | null
    parent?: {
      id: string
      name: string
      parentId?: string | null
      parent?: {
        id: string
        name: string
        parentId?: string | null
        parent?: { id: string; name: string } | null
      } | null
    } | null
  }
}

interface UserWithProjects {
  id: string
  name: string
  email: string
  avatar?: string | null
  role: string
  assignedProjects: AssignedProject[]
  _count: { assignedProjects: number; comments: number }
}

// ─── 트리 노드 타입 ───────────────────────────────────────────────────────────

interface TreeNode {
  assignment: AssignedProject        // 이 레벨에 담당자로 지정된 경우
  projectId: string
  projectName: string
  children: TreeNode[]               // 하위 트리 노드
}

// ─── 최상위 프로젝트 찾기 헬퍼 ───────────────────────────────────────────────

function getTopAncestor(project: AssignedProject['project']): { id: string; name: string } {
  if (!project.parentId) return { id: project.id, name: project.name }
  const p1 = project.parent
  if (!p1) return { id: project.id, name: project.name }
  if (!p1.parentId) return { id: p1.id, name: p1.name }
  const p2 = p1.parent
  if (!p2) return { id: p1.id, name: p1.name }
  if (!p2.parentId) return { id: p2.id, name: p2.name }
  const p3 = p2.parent
  if (!p3) return { id: p2.id, name: p2.name }
  return { id: p3.id, name: p3.name }
}

// project.parent 체인에서 depth 계산 (depth=0: 최상위, 1: 상위, 2: 하위, 3: 최하위)
function getProjectDepth(project: AssignedProject['project']): number {
  if (!project.parentId) return 0
  if (!project.parent?.parentId) return 1
  if (!project.parent?.parent?.parentId) return 2
  return 3
}

// ─── 트리 구성 헬퍼 ───────────────────────────────────────────────────────────

// depth별 조상 ID 추출
function getAncestorId(project: AssignedProject['project'], targetDepth: number): string | null {
  const depth = getProjectDepth(project)
  if (depth === targetDepth) return project.id
  if (depth === targetDepth + 1) return project.parent?.id ?? null
  if (depth === targetDepth + 2) return project.parent?.parent?.id ?? null
  if (depth === targetDepth + 3) return project.parent?.parent?.parent?.id ?? null
  return null
}

function getAncestorName(project: AssignedProject['project'], targetDepth: number): string | null {
  const depth = getProjectDepth(project)
  if (depth === targetDepth) return project.name
  if (depth === targetDepth + 1) return project.parent?.name ?? null
  if (depth === targetDepth + 2) return project.parent?.parent?.name ?? null
  if (depth === targetDepth + 3) return project.parent?.parent?.parent?.name ?? null
  return null
}

function buildTree(assignments: AssignedProject[]): {
  topId: string
  topName: string
  upperNodes: TreeNode[]
}[] {
  // projectId → assignment 맵
  const assignmentMap = new Map<string, AssignedProject>()
  for (const a of assignments) {
    assignmentMap.set(a.project.id, a)
  }

  // 최상위별로 그룹화
  const groupMap = new Map<string, {
    topId: string
    topName: string
    // 상위(depth=1) ID → { 이름, 하위(depth=2) ID 셋 }
    upper1Map: Map<string, { name: string; lower2Set: Set<string> }>
    // 하위(depth=2) ID → { 이름, parentId(=상위ID), 최하위(depth=3) ID 셋 }
    lower2Map: Map<string, { name: string; parentId: string; lower3Set: Set<string> }>
    // 최하위(depth=3) ID → { 이름, parentId(=하위ID) }
    lower3Map: Map<string, { name: string; parentId: string }>
  }>()

  for (const a of assignments) {
    const top = getTopAncestor(a.project)
    if (!groupMap.has(top.id)) {
      groupMap.set(top.id, {
        topId: top.id,
        topName: top.name,
        upper1Map: new Map(),
        lower2Map: new Map(),
        lower3Map: new Map(),
      })
    }
    const group = groupMap.get(top.id)!
    const depth = getProjectDepth(a.project)

    // depth=1: 상위 프로젝트 자신
    if (depth === 1) {
      if (!group.upper1Map.has(a.project.id)) {
        group.upper1Map.set(a.project.id, { name: a.project.name, lower2Set: new Set() })
      }
    }

    // depth=2: 하위 프로젝트 자신 + 상위(depth=1) 조상 등록
    if (depth === 2) {
      const parentId = a.project.parentId ?? ''  // 상위(depth=1) ID
      const parentName = a.project.parent?.name ?? ''
      // 상위 조상 등록
      if (!group.upper1Map.has(parentId)) {
        group.upper1Map.set(parentId, { name: parentName, lower2Set: new Set() })
      }
      group.upper1Map.get(parentId)!.lower2Set.add(a.project.id)
      // 자신(depth=2) 등록
      if (!group.lower2Map.has(a.project.id)) {
        group.lower2Map.set(a.project.id, { name: a.project.name, parentId, lower3Set: new Set() })
      }
    }

    // depth=3: 최하위 프로젝트 자신 + 하위(depth=2) 조상 + 상위(depth=1) 조상 등록
    if (depth === 3) {
      const p1Id = a.project.parent?.parent?.id ?? ''   // 상위(depth=1) ID
      const p1Name = a.project.parent?.parent?.name ?? ''
      const p2Id = a.project.parent?.id ?? ''            // 하위(depth=2) ID
      const p2Name = a.project.parent?.name ?? ''
      // 상위(depth=1) 조상 등록
      if (!group.upper1Map.has(p1Id)) {
        group.upper1Map.set(p1Id, { name: p1Name, lower2Set: new Set() })
      }
      group.upper1Map.get(p1Id)!.lower2Set.add(p2Id)
      // 하위(depth=2) 조상 등록
      if (!group.lower2Map.has(p2Id)) {
        group.lower2Map.set(p2Id, { name: p2Name, parentId: p1Id, lower3Set: new Set() })
      }
      group.lower2Map.get(p2Id)!.lower3Set.add(a.project.id)
      // 자신(depth=3) 등록
      if (!group.lower3Map.has(a.project.id)) {
        group.lower3Map.set(a.project.id, { name: a.project.name, parentId: p2Id })
      }
    }
  }

  // 각 그룹에서 트리 구성
  return Array.from(groupMap.values())
    .sort((a, b) => a.topName.localeCompare(b.topName, 'ko'))
    .map((group) => {
      const upperNodes: TreeNode[] = []

      for (const [u1Id, u1Info] of group.upper1Map) {
        const u1Assignment = assignmentMap.get(u1Id)

        // 하위(depth=2) 노드 구성
        const children2: TreeNode[] = []
        for (const u2Id of u1Info.lower2Set) {
          const u2Info = group.lower2Map.get(u2Id)
          if (!u2Info) continue
          const u2Assignment = assignmentMap.get(u2Id)

          // 최하위(depth=3) 노드 구성
          const children3: TreeNode[] = []
          for (const u3Id of u2Info.lower3Set) {
            const u3Info = group.lower3Map.get(u3Id)
            if (!u3Info) continue
            const u3Assignment = assignmentMap.get(u3Id)
            if (u3Assignment) {
              children3.push({
                assignment: u3Assignment,
                projectId: u3Id,
                projectName: u3Info.name,
                children: [],
              })
            }
          }

          children2.push({
            assignment: u2Assignment!,
            projectId: u2Id,
            projectName: u2Info.name,
            children: children3,
          })
        }

        upperNodes.push({
          assignment: u1Assignment!,
          projectId: u1Id,
          projectName: u1Info.name,
          children: children2,
        })
      }

      return {
        topId: group.topId,
        topName: group.topName,
        upperNodes,
      }
    })
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function MembersPage() {
  const [users, setUsers] = useState<UserWithProjects[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ALL'>('ACTIVE')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const { isAdmin } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async (preserveSelection = false) => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data)
      // 선택 유지 모드가 아닐 때만 첫 번째 유저로 초기화
      if (!preserveSelection && data.length > 0) setSelectedUser(data[0].id)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) return
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName, email: newUserEmail }),
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
        if (selectedUser === userId) setSelectedUser(null)
        fetchUsers()
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      })
      fetchUsers(true)  // 선택된 유저 유지
    } catch (err) {
      console.error('Failed to toggle task:', err)
    }
  }

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const selectedUserData = users.find((u) => u.id === selectedUser)

  // ─── 트리 데이터 구성 ────────────────────────────────────────────────────────
  const treeGroups = (() => {
    if (!selectedUserData) return []
    const filtered = selectedUserData.assignedProjects.filter((a) => {
      if (statusFilter === 'ACTIVE') return a.project.status !== 'COMPLETED'
      return true
    })
    return buildTree(filtered)
  })()

  // 통계
  const totalCount = selectedUserData?.assignedProjects.length ?? 0
  const activeCount = selectedUserData?.assignedProjects.filter(
    (a) => a.project.status !== 'COMPLETED'
  ).length ?? 0
  const completedCount = selectedUserData?.assignedProjects.filter(
    (a) => a.project.status === 'COMPLETED'
  ).length ?? 0

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
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  placeholder="홍길동"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowAddModal(false)}>취소</Button>
                <Button onClick={handleAddUser} disabled={!newUserName.trim() || !newUserEmail.trim()}>추가</Button>
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
              <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>취소</Button>
              <Button variant="danger" onClick={() => handleDeleteUser(deleteConfirmId)}>삭제</Button>
            </div>
          </div>
        </div>
      )}

      {users.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-2">등록된 팀원이 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 왼쪽: 담당자 목록 */}
          <div className="lg:col-span-1 space-y-2">
            {users.map((user) => {
              const userActiveCount = user.assignedProjects.filter(
                (a) => a.project.status !== 'COMPLETED'
              ).length
              return (
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
                      <p className="text-xs text-gray-500">진행중 {userActiveCount}개</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(user.id) }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* 오른쪽: 선택된 담당자 상세 */}
          <div className="lg:col-span-3">
            {selectedUserData ? (
              <div className="space-y-4">
                {/* 프로필 + 통계 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar name={selectedUserData.name} src={selectedUserData.avatar} size="lg" />
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">{selectedUserData.name}</h2>
                        <p className="text-sm text-gray-500">{selectedUserData.email}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                        <p className="text-sm text-gray-500">전체</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{activeCount}</p>
                        <p className="text-sm text-gray-500">진행중+시작전</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                        <p className="text-sm text-gray-500">완료</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 상태 필터 */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
                  {([
                    { value: 'ACTIVE', label: '시작전 + 진행중' },
                    { value: 'ALL',    label: '전체' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStatusFilter(opt.value)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        statusFilter === opt.value
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* 최상위 프로젝트별 트리 */}
                {treeGroups.length > 0 ? (
                  <div className="space-y-4">
                    {treeGroups.map((group) => {
                      const isCollapsed = collapsedGroups.has(group.topId)
                      return (
                        <div key={group.topId} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                          {/* 최상위 프로젝트 헤더 */}
                          <div
                            className="flex items-center justify-between px-4 py-3 bg-purple-50 border-b border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors"
                            onClick={() => toggleGroup(group.topId)}
                          >
                            <div className="flex items-center gap-2">
                              {isCollapsed
                                ? <ChevronRight className="w-4 h-4 text-purple-500" />
                                : <ChevronDown className="w-4 h-4 text-purple-500" />
                              }
                              <FolderOpen className="w-4 h-4 text-purple-500" />
                              <Link
                                href={`/projects/${group.topId}`}
                                className="font-semibold text-purple-900 hover:text-purple-600 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {group.topName}
                              </Link>
                            </div>
                            <span className="text-xs text-purple-500">
                              {group.upperNodes.length}개 상위 프로젝트
                            </span>
                          </div>

                          {/* 상위 프로젝트 트리 */}
                          {!isCollapsed && (
                            <div className="divide-y divide-gray-100">
                              {group.upperNodes.map((upperNode) => (
                                <UpperProjectSection
                                  key={upperNode.projectId}
                                  node={upperNode}
                                  onToggleTask={handleToggleTask}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <p className="text-gray-500">
                        {statusFilter === 'ACTIVE'
                          ? '진행중인 프로젝트가 없습니다'
                          : '배정된 프로젝트가 없습니다'}
                      </p>
                    </CardContent>
                  </Card>
                )}
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

// ─── 상위 프로젝트 섹션 (파란 헤더 + 하위 목록) ──────────────────────────────

function UpperProjectSection({
  node,
  onToggleTask,
}: {
  node: TreeNode
  onToggleTask: (taskId: string, completed: boolean) => void
}) {
  return (
    <div>
      {/* 상위 프로젝트 행 */}
      <div className="px-4 py-2.5 bg-blue-50 border-l-4 border-l-blue-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${node.projectId}`}
            className="font-semibold text-blue-900 hover:text-blue-600 transition-colors text-sm"
          >
            {node.projectName}
          </Link>
          <Badge className="bg-blue-100 text-blue-700 text-xs">상위</Badge>
          {node.assignment && (
            <Badge className={`${STATUS_COLORS[node.assignment.project.status as ProjectStatus]} text-xs`}>
              {STATUS_LABELS[node.assignment.project.status as ProjectStatus]}
            </Badge>
          )}
        </div>
        {node.assignment?.tasks && node.assignment.tasks.length > 0 && (
          <span className="text-xs text-blue-400">
            업무 {node.assignment.tasks.filter(t => t.completed).length}/{node.assignment.tasks.length}
          </span>
        )}
      </div>

      {/* 상위 프로젝트 자체 업무 (담당자로 지정된 경우) */}
      {node.assignment?.tasks && node.assignment.tasks.length > 0 && (
        <div className="px-6 py-2 bg-blue-50/40 border-l-4 border-l-blue-200 space-y-1">
          {node.assignment.tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 cursor-pointer group/task"
              onClick={() => onToggleTask(task.id, !task.completed)}
            >
              {task.completed ? (
                <CheckSquare className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <Square className="w-3.5 h-3.5 text-gray-300 group-hover/task:text-blue-500 flex-shrink-0 transition-colors" />
              )}
              <span className={`text-xs ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {task.title}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 하위 프로젝트 목록 */}
      {node.children.map((lowerNode) => (
        <LowerProjectRow
          key={lowerNode.projectId}
          node={lowerNode}
          onToggleTask={onToggleTask}
        />
      ))}
    </div>
  )
}

// ─── 하위/최하위 프로젝트 행 ──────────────────────────────────────────────────

function LowerProjectRow({
  node,
  onToggleTask,
}: {
  node: TreeNode
  onToggleTask: (taskId: string, completed: boolean) => void
}) {
  const { assignment } = node
  const isLeaf = node.children.length === 0

  // assignment가 없으면 자식 노드를 보여주는 컨테이너 역할만
  const borderColor = 'border-l-green-400'

  return (
    <div>
      {/* 하위 프로젝트 행 */}
      <div className={`pl-8 pr-4 py-2.5 border-l-4 ${borderColor} border-l-green-400 hover:bg-gray-50 transition-colors`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/projects/${node.projectId}`}
                className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-sm"
              >
                {node.projectName}
              </Link>
              <Badge className="bg-green-100 text-green-700 text-xs">하위</Badge>
              {assignment && (
                <Badge className={`${STATUS_COLORS[assignment.project.status as ProjectStatus]} text-xs`}>
                  {STATUS_LABELS[assignment.project.status as ProjectStatus]}
                </Badge>
              )}
              {assignment?.project.priority && (
                <Badge className={`${PRIORITY_COLORS[assignment.project.priority as ProjectPriority]} text-xs`}>
                  {PRIORITY_LABELS[assignment.project.priority as ProjectPriority]}
                </Badge>
              )}
            </div>
            {/* 기간 */}
            {assignment && (assignment.project.startDate || assignment.project.endDate) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {assignment.project.startDate
                  ? format(new Date(assignment.project.startDate), 'M/d', { locale: ko })
                  : '미정'}
                {' ~ '}
                {assignment.project.endDate
                  ? format(new Date(assignment.project.endDate), 'M/d', { locale: ko })
                  : '미정'}
              </p>
            )}
          </div>
          {/* 진행률 */}
          {assignment && assignment.project.progress > 0 && (
            <div className="w-20 flex-shrink-0">
              <ProgressBar value={assignment.project.progress} size="sm" showLabel />
            </div>
          )}
        </div>

        {/* 업무 목록 */}
        {assignment?.tasks && assignment.tasks.length > 0 && (
          <div className="mt-2 space-y-1 pl-1">
            <p className="text-xs text-gray-400 mb-1">
              업무 {assignment.tasks.filter(t => t.completed).length}/{assignment.tasks.length}
            </p>
            {assignment.tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 cursor-pointer group/task"
                onClick={() => onToggleTask(task.id, !task.completed)}
              >
                {task.completed ? (
                  <CheckSquare className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-gray-300 group-hover/task:text-blue-500 flex-shrink-0 transition-colors" />
                )}
                <span className={`text-xs ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 최하위 프로젝트들 */}
      {!isLeaf && node.children.map((leafNode) => (
        <LeafProjectRow
          key={leafNode.projectId}
          node={leafNode}
          onToggleTask={onToggleTask}
        />
      ))}
    </div>
  )
}

// ─── 최하위 프로젝트 행 ───────────────────────────────────────────────────────

function LeafProjectRow({
  node,
  onToggleTask,
}: {
  node: TreeNode
  onToggleTask: (taskId: string, completed: boolean) => void
}) {
  const { assignment } = node
  if (!assignment) return null

  return (
    <div className="pl-14 pr-4 py-2.5 border-l-4 border-l-orange-400 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/projects/${node.projectId}`}
              className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-sm"
            >
              {node.projectName}
            </Link>
            <Badge className="bg-orange-100 text-orange-700 text-xs">최하위</Badge>
            <Badge className={`${STATUS_COLORS[assignment.project.status as ProjectStatus]} text-xs`}>
              {STATUS_LABELS[assignment.project.status as ProjectStatus]}
            </Badge>
            {assignment.project.priority && (
              <Badge className={`${PRIORITY_COLORS[assignment.project.priority as ProjectPriority]} text-xs`}>
                {PRIORITY_LABELS[assignment.project.priority as ProjectPriority]}
              </Badge>
            )}
          </div>
          {(assignment.project.startDate || assignment.project.endDate) && (
            <p className="text-xs text-gray-400 mt-0.5">
              {assignment.project.startDate
                ? format(new Date(assignment.project.startDate), 'M/d', { locale: ko })
                : '미정'}
              {' ~ '}
              {assignment.project.endDate
                ? format(new Date(assignment.project.endDate), 'M/d', { locale: ko })
                : '미정'}
            </p>
          )}
        </div>
        {assignment.project.progress > 0 && (
          <div className="w-20 flex-shrink-0">
            <ProgressBar value={assignment.project.progress} size="sm" showLabel />
          </div>
        )}
      </div>

      {/* 업무 목록 */}
      {assignment.tasks.length > 0 && (
        <div className="mt-2 space-y-1 pl-1">
          <p className="text-xs text-gray-400 mb-1">
            업무 {assignment.tasks.filter(t => t.completed).length}/{assignment.tasks.length}
          </p>
          {assignment.tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 cursor-pointer group/task"
              onClick={() => onToggleTask(task.id, !task.completed)}
            >
              {task.completed ? (
                <CheckSquare className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <Square className="w-3.5 h-3.5 text-gray-300 group-hover/task:text-blue-500 flex-shrink-0 transition-colors" />
              )}
              <span className={`text-xs ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {task.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
