'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  Plus,
  Shield,
  LogOut,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { useAuth } from '@/lib/auth-context'
import { AdminLoginModal } from '@/components/auth/AdminLoginModal'

const navigation = [
  { name: '대시보드', href: '/', icon: LayoutDashboard },
  { name: '프로젝트', href: '/projects', icon: FolderKanban },
  { name: '타임라인', href: '/timeline', icon: Calendar },
  { name: '캘린더', href: '/calendar', icon: CalendarDays },
  { name: '담당자별 업무', href: '/members', icon: Users },
  { name: '현황 분석', href: '/analytics', icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isAdmin, logout } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)

  return (
    <>
      <AdminLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200">
      <div className="flex flex-col h-full">
        <div className="flex items-center h-16 px-6 border-b border-gray-200">
          <FolderKanban className="w-8 h-8 text-blue-600" />
          <span className="ml-2 text-xl font-bold text-gray-900">ProjectHub</span>
        </div>

        <div className="p-4">
          <Link href="/projects/new">
            <Button className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              새 프로젝트
            </Button>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-2">
          <Link
            href="/settings"
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <Settings className="w-5 h-5 mr-3 text-gray-400" />
            설정
          </Link>

          {isAdmin ? (
            <button
              onClick={logout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <LogOut className="w-5 h-5 mr-3 text-gray-400" />
              로그아웃
            </button>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <Shield className="w-5 h-5 mr-3 text-gray-400" />
              관리자 로그인
            </button>
          )}

          {isAdmin && (
            <div className="flex items-center px-3 py-2 text-xs text-green-600 bg-green-50 rounded-lg">
              <Shield className="w-4 h-4 mr-2" />
              관리자 모드
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  )
}
