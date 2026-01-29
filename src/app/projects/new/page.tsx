'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { ProjectForm } from '@/components/projects/ProjectForm'

function NewProjectContent() {
  const searchParams = useSearchParams()
  const parentId = searchParams.get('parentId') || undefined

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold text-gray-900">
            {parentId ? '하위 프로젝트 생성' : '새 프로젝트 생성'}
          </h1>
          <p className="text-sm text-gray-500">
            프로젝트 정보를 입력하세요
          </p>
        </CardHeader>
        <CardContent>
          <ProjectForm parentId={parentId} />
        </CardContent>
      </Card>
    </div>
  )
}

export default function NewProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }
    >
      <NewProjectContent />
    </Suspense>
  )
}
