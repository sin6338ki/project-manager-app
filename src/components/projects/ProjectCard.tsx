'use client'

import Link from 'next/link'
import { Calendar, ChevronRight, Users } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Card, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { ProgressBar } from '../ui/ProgressBar'
import { AvatarGroup } from '../ui/Avatar'
import {
  Project,
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

interface ProjectCardProps {
  project: Project
  showLevel?: boolean
}

export function ProjectCard({ project, showLevel = false }: ProjectCardProps) {
  const assignees = project.assignees?.map((a) => ({
    name: a.user?.name || '',
    avatar: a.user?.avatar,
  })) || []

  const projectLevel = getProjectLevel(project)

  // 하위 프로젝트 라벨
  const subLabel =
    projectLevel === 0
      ? '상위 프로젝트'
      : projectLevel === 1
      ? '하위 프로젝트'
      : '최하위 프로젝트'

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {project.name}
              </h3>
              {project.description && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {showLevel && (
              <Badge className={PROJECT_LEVEL_COLORS[projectLevel]}>
                {PROJECT_LEVEL_LABELS[projectLevel]}
              </Badge>
            )}
            {/* Level 2/3: 상태, 우선순위 표시 */}
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
          </div>

          {/* Level 2/3: 진행률 표시 */}
          {projectLevel >= 2 && (
            <div className="mb-3">
              <ProgressBar value={project.progress} showLabel size="sm" />
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              {/* Level 2/3: 기간 표시 */}
              {projectLevel >= 2 && (project.startDate || project.endDate) && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {project.startDate
                      ? format(new Date(project.startDate), 'M/d', { locale: ko })
                      : '미정'}
                    {' - '}
                    {project.endDate
                      ? format(new Date(project.endDate), 'M/d', { locale: ko })
                      : '미정'}
                  </span>
                </div>
              )}
              {project.subProjects && project.subProjects.length > 0 && (
                <span className="text-xs text-gray-400">
                  {subLabel} {project.subProjects.length}개
                </span>
              )}
            </div>

            {/* 담당자 표시 */}
            {assignees.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <AvatarGroup users={assignees} max={3} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
