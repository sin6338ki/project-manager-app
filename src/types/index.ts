export type ProjectStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type UserRole = 'admin' | 'member'
export type AssigneeRole = 'lead' | 'main' | 'support'

// 프로젝트 레벨 타입
// Level 0: 최상위 프로젝트 (연간/대형) - 목표, 성과만
// Level 1: 분기별 프로젝트 - 목표, 성과 + 우선순위, 담당자
// Level 2+: 하위 프로젝트 - 모든 필드
export type ProjectLevel = 0 | 1 | 2

export const PROJECT_LEVEL_LABELS: Record<ProjectLevel, string> = {
  0: '최상위 프로젝트',
  1: '분기별 프로젝트',
  2: '하위 프로젝트',
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
  role: AssigneeRole
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

export const ASSIGNEE_ROLE_LABELS: Record<AssigneeRole, string> = {
  lead: '리더',
  main: '메인',
  support: '보조',
}

export const ASSIGNEE_ROLE_COLORS: Record<AssigneeRole, string> = {
  lead: 'bg-purple-100 text-purple-800',
  main: 'bg-blue-100 text-blue-800',
  support: 'bg-gray-100 text-gray-700',
}

export const PRIORITY_COLORS: Record<ProjectPriority, string> = {
  LOW: 'bg-slate-100 text-slate-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
}
