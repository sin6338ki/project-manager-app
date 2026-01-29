'use client'

import { CheckCircle, Clock, PlayCircle } from 'lucide-react'
import { Card, CardContent } from '../ui/Card'
import { Project } from '@/types'

interface StatusSummaryProps {
  projects: Project[]
}

export function StatusSummary({ projects }: StatusSummaryProps) {
  const notStarted = projects.filter((p) => p.status === 'NOT_STARTED').length
  const inProgress = projects.filter((p) => p.status === 'IN_PROGRESS').length
  const completed = projects.filter((p) => p.status === 'COMPLETED').length

  const stats = [
    {
      label: '시작 전',
      value: notStarted,
      icon: Clock,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    {
      label: '진행중',
      value: inProgress,
      icon: PlayCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: '완료',
      value: completed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
