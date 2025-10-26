import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiService, type AIRecommendationRequest, type Recommendation, type AIRecommendationResponse } from '@/services/ai'
import { supabase } from '@/lib/supabase'

// Query keys for cache management
export const AI_QUERY_KEYS = {
  recommendations: (userId: string, menuId?: string) => ['ai', 'recommendations', userId, menuId],
  recommendationStatus: (recommendationId: string) => ['ai', 'recommendation-status', recommendationId],
  allRecommendations: (userId: string) => ['ai', 'all-recommendations', userId],
}

// Hook for generating AI recommendations
export const useGenerateRecommendations = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: AIRecommendationRequest) =>
      aiService.generateRecommendations(request),

    onSuccess: (data, variables) => {
      // Invalidate recommendations cache
      const { data: { user } } = supabase.auth.getUser()
      if (user) {
        queryClient.invalidateQueries({
          queryKey: AI_QUERY_KEYS.recommendations(user.id, variables.menuId)
        })
      }

      // If we have a recommendation ID, set up status polling
      if (data.recommendationId) {
        queryClient.setQueryData(
          AI_QUERY_KEYS.recommendationStatus(data.recommendationId),
          {
            status: 'processing',
            processing_time_ms: data.processing_time_ms,
            estimated_time: aiService.estimateProcessingTime(variables)
          }
        )
      }
    },

    onError: (error) => {
      console.error('Failed to generate recommendations:', error)
    },
  })
}

// Hook for checking recommendation status
export const useRecommendationStatus = (
  recommendationId: string,
  autoPoll: boolean = true,
  pollInterval: number = 5000 // 5 seconds
) => {
  return useQuery({
    queryKey: AI_QUERY_KEYS.recommendationStatus(recommendationId),
    queryFn: () => aiService.checkRecommendationStatus(recommendationId),
    enabled: !!recommendationId && autoPoll,
    refetchInterval: (data) => {
      // Only continue polling if still processing
      if (data?.status === 'processing' || data?.status === 'pending') {
        return pollInterval
      }
      return false
    },
    staleTime: 0, // Always fresh for status checks
    retry: 2,
  })
}

// Hook for getting user's recommendations
export const useUserRecommendations = (menuId?: string) => {
  const { data: { user } } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: () => supabase.auth.getUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return useQuery({
    queryKey: AI_QUERY_KEYS.recommendations(user?.user?.id || '', menuId),
    queryFn: () => {
      if (!user?.user?.id) return []
      return aiService.getRecommendations(user.user.id, menuId)
    },
    enabled: !!user?.user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  })
}

// Hook for deleting a recommendation
export const useDeleteRecommendation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ recommendationId, userId }: { recommendationId: string; userId: string }) =>
      aiService.deleteRecommendation(recommendationId, userId),

    onSuccess: (_, variables) => {
      // Invalidate recommendations cache
      queryClient.invalidateQueries({
        queryKey: AI_QUERY_KEYS.recommendations(variables.userId)
      })
      queryClient.invalidateQueries({
        queryKey: AI_QUERY_KEYS.allRecommendations(variables.userId)
      })

      // Also invalidate status query for this recommendation
      queryClient.removeQueries({
        queryKey: AI_QUERY_KEYS.recommendationStatus(variables.recommendationId)
      })
    },

    onError: (error) => {
      console.error('Failed to delete recommendation:', error)
    },
  })
}

// Hook for real-time recommendation generation with progress tracking
export const useRealTimeRecommendations = () => {
  const queryClient = useQueryClient()
  const generateMutation = useGenerateRecommendations()

  const generateRecommendations = async (request: AIRecommendationRequest) => {
    // Start generation
    const result = await generateMutation.mutateAsync(request)

    if (!result.success || !result.recommendationId) {
      throw new Error('Failed to start recommendation generation')
    }

    const recommendationId = result.recommendationId
    const estimatedTime = aiService.estimateProcessingTime(request)

    // Track progress
    const startTime = Date.now()
    const progressInterval = 1000 // Update every second

    const progressTracker = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / estimatedTime) * 100, 90) // Cap at 90% until complete

      // Update progress in cache
      queryClient.setQueryData(
        AI_QUERY_KEYS.recommendationStatus(recommendationId),
        (prev: any) => ({
          ...prev,
          progress,
          elapsed_time: elapsed,
          estimated_time: estimatedTime
        })
      )
    }, progressInterval)

    // Wait for completion or timeout
    const timeout = setTimeout(() => {
      clearInterval(progressTracker)
    }, Math.max(estimatedTime * 2, 60000)) // Double estimated time or 1 minute minimum

    // Poll for completion
    const pollForCompletion = async (): Promise<AIRecommendationResponse> => {
      try {
        const status = await aiService.checkRecommendationStatus(recommendationId)

        if (status.status === 'completed') {
          clearInterval(progressTracker)
          clearTimeout(timeout)

          // Set final progress
          queryClient.setQueryData(
            AI_QUERY_KEYS.recommendationStatus(recommendationId),
            {
              ...status,
              progress: 100,
              elapsed_time: Date.now() - startTime
            }
          )

          return status.results || { success: false }
        } else if (status.status === 'failed') {
          clearInterval(progressTracker)
          clearTimeout(timeout)
          throw new Error('Recommendation generation failed')
        } else {
          // Still processing, continue polling
          await new Promise(resolve => setTimeout(resolve, 2000))
          return pollForCompletion()
        }
      } catch (error) {
        clearInterval(progressTracker)
        clearTimeout(timeout)
        throw error
      }
    }

    return pollForCompletion()
  }

  return {
    generateRecommendations,
    isGenerating: generateMutation.isPending,
    generationError: generateMutation.error,
    generationSuccess: generateMutation.data,
  }
}

// Hook for recommendation analytics
export const useRecommendationAnalytics = (userId: string) => {
  return useQuery({
    queryKey: ['ai', 'analytics', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')

      if (error) throw error

      const recommendations = data || []

      // Calculate analytics
      const totalRecommendations = recommendations.length
      const totalTokensUsed = recommendations.reduce((sum, rec) => sum + (rec.tokens_used || 0), 0)
      const averageProcessingTime = recommendations.length > 0
        ? recommendations.reduce((sum, rec) => sum + (rec.processing_time_ms || 0), 0) / recommendations.length
        : 0

      // Focus area breakdown
      const focusAreaBreakdown = recommendations.reduce((acc, rec) => {
        const focusArea = rec.prompt_data?.focusArea || 'unknown'
        acc[focusArea] = (acc[focusArea] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Recent activity (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const recentRecommendations = recommendations.filter(rec =>
        new Date(rec.created_at) >= thirtyDaysAgo
      )

      return {
        totalRecommendations,
        totalTokensUsed,
        averageProcessingTime: Math.round(averageProcessingTime),
        focusAreaBreakdown,
        recentActivity: recentRecommendations.length,
        mostPopularFocusArea: Object.entries(focusAreaBreakdown)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none'
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook for recommendation form validation
export const useRecommendationForm = () => {
  const validateForm = (request: AIRecommendationRequest): { isValid: boolean; errors: string[] } => {
    return aiService.validateRecommendationRequest(request)
  }

  const createRequest = (baseRequest: Partial<AIRecommendationRequest>): AIRecommendationRequest => {
    return aiService.createRecommendationRequest(baseRequest.menuId!, baseRequest)
  }

  return {
    validateForm,
    createRequest,
    getFocusAreaOptions: aiService.getFocusAreaOptions(),
    getCurrentSeason: aiService.getCurrentSeason(),
    estimateProcessingTime: aiService.estimateProcessingTime,
  }
}

// Hook for recommendation history with pagination
export const useRecommendationHistory = (
  userId: string,
  page: number = 1,
  limit: number = 10
) => {
  return useQuery({
    queryKey: ['ai', 'history', userId, page, limit],
    queryFn: async () => {
      const offset = (page - 1) * limit

      const { data, error, count } = await supabase
        .from('recommendations')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      return {
        recommendations: data || [],
        totalCount: count || 0,
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit),
        hasNextPage: (offset + limit) < (count || 0),
        hasPreviousPage: page > 1
      }
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// React import for effects
import React from 'react'