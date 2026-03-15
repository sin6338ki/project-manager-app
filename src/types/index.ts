export type ProjectStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type UserRole = 'admin' | 'member'

/**
 * 프로젝트 레벨 체계
 * Level 0: 최상위 프로젝트 (parentId = null)         - 담당자+기간 설정, 업무X, 목표/성과X
 * Level 1: 상위 프로젝트   (부모가 최상위)            - 담당자, 상태 자동, 진행률 자동, 목표/성과X, 업무X
 * Level 2: 하위 프로젝트   (부모가 상위)              - 담당자+업무, 상태/우선순위/기간 직접 설정, 목표/성과X
 * Level 3: 최하위 프로젝트 (부모가 하위)              - 담당자+업무, 상태/우선순위/기간 직접 설정, 목표/성과X
 */
export type ProjectLevel = 0 | 1 | 2 | 3

export const PROJECT_LEVEL_LABELS: Record<ProjectLevel, string> = {
  0: '최상위 프로젝트',
  1: '상위 프로젝트',
  2: '하위 프로젝트',
  3: '최하위 프로젝트',
}

export const PROJECT_LEVEL_COLORS: Record<ProjectLevel, string> = {
  0: 'bg-purple-100 text-purple-800',
  1: 'bg-blue-100 text-blue-800',
  2: 'bg-green-100 text-green-800',
  3: 'bg-orange-100 text-orange-800',
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string | null
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  name: string
  description?: string | null
  goal?: string | null
  keyResults?: string | null
  status: ProjectStatus
  priority: ProjectPriority
  startDate?: Date | null
  endDate?: Date | null
  progress: number
  sortOrder: number
  parentId?: string | null
  parent?: Project | null
  subProjects?: Project[]
  assignees?: ProjectAssignee[]
  comments?: Comment[]
  milestones?: Milestone[]
  createdAt: Date
  updatedAt: Date
}

export interface AssigneeTask {
  id: string
  title: string
  completed: boolean
  assigneeId: string
  createdAt: Date
  updatedAt: Date
}

export interface ProjectAssignee {
  id: string
  projectId: string
  userId: string
  role: string
  project?: Project
  user?: User
  tasks?: AssigneeTask[]
  createdAt: Date
}

export interface Comment {
  id: string
  content: string
  projectId: string
  userId: string
  project?: Project
  user?: User
  createdAt: Date
  updatedAt: Date
}

export interface Milestone {
  id: string
  name: string
  description?: string | null
  dueDate?: Date | null
  completed: boolean
  projectId: string
  project?: Project
  createdAt: Date
  updatedAt: Date
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  NOT_STARTED: '시작 전',
  IN_PROGRESS: '진행중',
  COMPLETED: '완료',
}

export const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
  URGENT: '긴급',
}

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
}

export const PRIORITY_COLORS: Record<ProjectPriority, string> = {
  LOW: 'bg-slate-100 text-slate-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
}

/** parentId 체인을 따라 레벨을 계산 */
export function getProjectLevel(project: Project): ProjectLevel {
  if (!project.parentId) return 0
  if (!project.parent?.parentId) return 1
  if (!project.parent?.parent?.parentId) return 2
  return 3
}

/** 하위 프로젝트들의 상태로 상위 상태 자동 계산 */
export function calcStatusFromChildren(subProjects: Project[]): ProjectStatus {
  if (!subProjects || subProjects.length === 0) return 'NOT_STARTED'
  const statuses = subProjects.map((s) => s.status)
  if (statuses.every((s) => s === 'COMPLETED')) return 'COMPLETED'
  if (statuses.every((s) => s === 'NOT_STARTED')) return 'NOT_STARTED'
  return 'IN_PROGRESS'
}

/** 하위 프로젝트들의 진행률 평균 계산 */
export function calcProgressFromChildren(subProjects: Project[]): number {
  if (!subProjects || subProjects.length === 0) return 0
  const total = subProjects.reduce((sum, s) => sum + (s.progress || 0), 0)
  return Math.round(total / subProjects.length)
}
