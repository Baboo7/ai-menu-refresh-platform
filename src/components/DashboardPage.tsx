import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

import {
  LayoutDashboard,
  FileText,
  Sparkles,
  TrendingUp,
  Plus,
  Database,
  Clock,
  Target,
  DollarSign,
  Users,
  ArrowRight,
  Star,
  Activity,
  Calendar,
  ChevronRight,
  BarChart3,
  Settings,
  Bell,
  HelpCircle,
  ExternalLink
} from 'lucide-react'

import { SidebarNavigation } from './SidebarNavigation'
import { NotionConnect } from './NotionConnect'
import { AIRecommendationForm } from './AIRecommendationForm'
import { RecommendationGrid } from './RecommendationGrid'

import { supabase } from '@/lib/supabase'
import { useUserRecommendations, useRecommendationAnalytics } from '@/hooks/use-ai-recommendations'
import { db } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface DashboardPageProps {
  user: User | null
  isSidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export function DashboardPage({ user, isSidebarCollapsed, onToggleSidebar }: DashboardPageProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'notion' | 'ai' | 'recommendations'>('overview')
  const [selectedMenu, setSelectedMenu] = useState<any>(null)

  // Fetch user's data
  const { data: menus = [], isLoading: isLoadingMenus } = db.getMenus(user?.id || '').then(data => data || []).catch(() => [])
  const { data: recommendations = [] } = useUserRecommendations()
  const { data: analytics } = useRecommendationAnalytics(user?.id || '')

  // Calculate quick stats
  const totalMenuItems = menus.reduce((total, menu) => {
    return total + (menu.content?.items?.length || 0)
  }, 0)

  const recentRecommendations = recommendations.filter(rec => {
    const created = new Date(rec.created_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return created > weekAgo
  })

  const handleMenuImported = useCallback((menuData: any) => {
    setActiveSection('overview')
    // Refresh menus data
    window.location.reload()
  }, [])

  const handleRecommendationsGenerated = useCallback((results: any) => {
    setActiveSection('recommendations')
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to access the dashboard</h1>
          <Link to="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <SidebarNavigation
        user={user}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={onToggleSidebar}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-6">
            <div className="flex items-center gap-4 flex-1">
              <h1 className="text-lg font-semibold">
                {activeSection === 'overview' && 'Dashboard'}
                {activeSection === 'notion' && 'Notion Integration'}
                {activeSection === 'ai' && 'AI Recommendations'}
                {activeSection === 'recommendations' && 'My Recommendations'}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container-fluid p-6 max-w-7xl">
            {/* Overview Section */}
            {activeSection === 'overview' && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <motion.div variants={itemVariants}>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Menus</p>
                            <p className="text-2xl font-bold">{menus.length}</p>
                          </div>
                          <FileText className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Menu Items</p>
                            <p className="text-2xl font-bold">{totalMenuItems}</p>
                          </div>
                          <Database className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">AI Recommendations</p>
                            <p className="text-2xl font-bold">{recommendations.length}</p>
                          </div>
                          <Sparkles className="h-8 w-8 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">This Week</p>
                            <p className="text-2xl font-bold">{recentRecommendations.length}</p>
                          </div>
                          <Activity className="h-8 w-8 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Quick Actions */}
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                      <CardDescription>
                        Get started with the most common tasks
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button
                          variant="outline"
                          className="h-20 flex-col gap-2"
                          onClick={() => setActiveSection('ai')}
                        >
                          <Sparkles className="h-6 w-6" />
                          <span>Generate Recommendations</span>
                        </Button>

                        <Button
                          variant="outline"
                          className="h-20 flex-col gap-2"
                          onClick={() => setActiveSection('notion')}
                        >
                          <Database className="h-6 w-6" />
                          <span>Import from Notion</span>
                        </Button>

                        <Button
                          variant="outline"
                          className="h-20 flex-col gap-2"
                          onClick={() => window.location.href = '/menus/new'}
                        >
                          <Plus className="h-6 w-6" />
                          <span>Create New Menu</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Recent Activity */}
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Recent Activity</CardTitle>
                          <CardDescription>
                            Your latest AI recommendations and menu updates
                          </CardDescription>
                        </div>
                        <Link to="/recommendations">
                          <Button variant="outline" size="sm">
                            View All
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {recentRecommendations.length > 0 ? (
                        <div className="space-y-4">
                          {recentRecommendations.slice(0, 3).map((rec) => (
                            <div key={rec.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <div>
                                  <p className="font-medium text-sm">
                                    {rec.prompt_data?.focusArea || 'Comprehensive'} recommendations
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(rec.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary">
                                {rec.tokens_used || 0} tokens
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-semibold mb-2">No Recent Activity</h3>
                          <p>Generate your first AI recommendations to see activity here.</p>
                          <Button
                            className="mt-4"
                            onClick={() => setActiveSection('ai')}
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Get Started
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}

            {/* Notion Integration Section */}
            {activeSection === 'notion' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveSection('overview')}
                    className="mb-4"
                  >
                    ← Back to Dashboard
                  </Button>
                </div>

                <NotionConnect onMenuImported={handleMenuImported} />
              </motion.div>
            )}

            {/* AI Recommendations Form Section */}
            {activeSection === 'ai' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveSection('overview')}
                    className="mb-4"
                  >
                    ← Back to Dashboard
                  </Button>
                </div>

                {selectedMenu ? (
                  <AIRecommendationForm
                    menuId={selectedMenu.id}
                    menuTitle={selectedMenu.title}
                    onRecommendationsGenerated={handleRecommendationsGenerated}
                  />
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Select a Menu</h3>
                      <p className="text-muted-foreground mb-4">
                        Choose a menu to generate AI recommendations for.
                      </p>
                      <Link to="/menus">
                        <Button>
                          <FileText className="mr-2 h-4 w-4" />
                          Browse Menus
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {/* Recommendations Display Section */}
            {activeSection === 'recommendations' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveSection('overview')}
                    className="mb-4"
                  >
                    ← Back to Dashboard
                  </Button>
                </div>

                {recommendations.length > 0 ? (
                  <RecommendationGrid
                    recommendations={recommendations[recommendations.length - 1]?.generated_content?.recommendations}
                  />
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Recommendations Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Generate AI recommendations to see personalized suggestions for your menu.
                      </p>
                      <Button onClick={() => setActiveSection('ai')}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Recommendations
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}