import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
  Database,
  Sparkles,
  BarChart3,
  User,
  Bell,
  HelpCircle
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { useUserRecommendations } from '@/hooks/use-ai-recommendations'
import type { User } from '@supabase/supabase-js'

interface SidebarNavigationProps {
  user: User | null
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  isMobile?: boolean
  onCloseMobile?: () => void
}

const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
    description: 'Overview and quick actions'
  },
  {
    id: 'menus',
    label: 'My Menus',
    icon: FileText,
    path: '/menus',
    description: 'Manage your menu items'
  },
  {
    id: 'ai-recommendations',
    label: 'AI Recommendations',
    icon: Sparkles,
    path: '/recommendations',
    description: 'Get AI-powered suggestions'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    path: '/analytics',
    description: 'Performance insights'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/settings',
    description: 'Account and preferences'
  }
]

export function SidebarNavigation({
  user,
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false,
  onCloseMobile
}: SidebarNavigationProps) {
  const location = useLocation()
  const navigate = useNavigate()

  // Get recent recommendations for badge count
  const { data: recommendations = [] } = useUserRecommendations()

  // Count unviewed recommendations (in a real app, you'd track viewed status)
  const newRecommendationsCount = recommendations.filter(rec => {
    const created = new Date(rec.created_at)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    return created > oneDayAgo
  }).length

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/auth')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const isActivePath = (path: string) => {
    return location.pathname === path
  }

  return (
    <div className={`
      flex flex-col h-full bg-background border-r transition-all duration-300
      ${isCollapsed ? 'w-16' : 'w-64'}
      ${isMobile ? 'fixed inset-y-0 left-0 z-50' : ''}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">MenuAI</h1>
              <p className="text-xs text-muted-foreground">Chef Assistant</p>
            </div>
          </motion.div>
        )}

        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCloseMobile}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* User Profile */}
      {!isCollapsed && user && (
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = isActivePath(item.path)
          const showBadge = item.id === 'ai-recommendations' && newRecommendationsCount > 0

          return (
            <Link key={item.id} to={item.path} onClick={isMobile ? onCloseMobile : undefined}>
              <motion.div
                whileHover={{ x: isCollapsed ? 4 : 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={`
                    w-full justify-start h-12
                    ${isCollapsed ? 'px-2' : 'px-3'}
                    ${isActive ? 'bg-primary/10 text-primary border-r-2 border-primary' : ''}
                  `}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="ml-3 flex-1 text-left">{item.label}</span>
                      {showBadge && (
                        <Badge variant="destructive" className="ml-auto">
                          {newRecommendationsCount}
                        </Badge>
                      )}
                    </>
                  )}
                </Button>

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover border rounded shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                )}
              </motion.div>
            </Link>
          )
        })}

        {!isCollapsed && (
          <Separator className="my-4" />
        )}

        {/* Quick Actions */}
        {!isCollapsed && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start h-10 px-3 text-sm"
              onClick={() => navigate('/recommendations/new')}
            >
              <Sparkles className="h-4 w-4" />
              <span className="ml-3">Quick Generate</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start h-10 px-3 text-sm"
              onClick={() => navigate('/menus/new')}
            >
              <FileText className="h-4 w-4" />
              <span className="ml-3">New Menu</span>
            </Button>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t space-y-2">
        {!isCollapsed && (
          <>
            <Button
              variant="ghost"
              className="w-full justify-start h-10 px-3 text-sm"
              onClick={() => window.open('https://docs.menuai.com', '_blank')}
            >
              <HelpCircle className="h-4 w-4" />
              <span className="ml-3">Help & Support</span>
            </Button>

            <Separator className="my-2" />
          </>
        )}

        {user && (
          <Button
            variant="ghost"
            className={`
              w-full justify-start h-10 text-sm text-muted-foreground hover:text-foreground
              ${isCollapsed ? 'px-2' : 'px-3'}
            `}
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-3">Sign Out</span>}
          </Button>
        )}
      </div>
    </div>
  )
}