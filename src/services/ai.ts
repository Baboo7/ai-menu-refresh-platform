import { supabase } from '@/lib/supabase'
import type {
  AIRecommendationRequest,
  AIRecommendationResponse,
  Recommendation
} from '@/types/database'

export interface AIService {
  generateRecommendations(request: AIRecommendationRequest): Promise<{ success: boolean; recommendationId?: string; results?: AIRecommendationResponse; processing_time_ms?: number }>
  checkRecommendationStatus(recommendationId: string): Promise<{ success: boolean; status: string; results?: AIRecommendationResponse; metadata?: any }>
  getRecommendations(userId: string, menuId?: string): Promise<Recommendation[]>
  deleteRecommendation(recommendationId: string, userId: string): Promise<void>
}

class AIServiceImpl implements AIService {
  private baseUrl: string

  constructor() {
    this.baseUrl = import.meta.env.VITE_RECOMMENDATION_GENERATOR_URL ||
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recommendation-generator`
  }

  private async makeRequest(endpoint: string, data: any): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No active session')
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('AI service error:', error)
      throw error
    }
  }

  async generateRecommendations(request: AIRecommendationRequest): Promise<{ success: boolean; recommendationId?: string; results?: AIRecommendationResponse; processing_time_ms?: number }> {
    try {
      const response = await this.makeRequest('', {
        action: 'generate-recommendations',
        data: request
      })

      return response
    } catch (error) {
      console.error('Error generating recommendations:', error)
      throw error
    }
  }

  async checkRecommendationStatus(recommendationId: string): Promise<{ success: boolean; status: string; results?: AIRecommendationResponse; metadata?: any }> {
    try {
      const response = await this.makeRequest('', {
        action: 'check-status',
        data: { recommendationId }
      })

      return response
    } catch (error) {
      console.error('Error checking recommendation status:', error)
      throw error
    }
  }

  async getRecommendations(userId: string, menuId?: string): Promise<Recommendation[]> {
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // Filter by menuId if provided
      const filteredData = menuId
        ? data.filter(rec => rec.menu_id === menuId)
        : data

      return filteredData || []
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      throw error
    }
  }

  async deleteRecommendation(recommendationId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('recommendations')
        .delete()
        .eq('id', recommendationId)
        .eq('user_id', userId)

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error deleting recommendation:', error)
      throw error
    }
  }

  // Helper methods for creating recommendation requests
  createRecommendationRequest(
    menuId: string,
    options: Partial<AIRecommendationRequest> = {}
  ): AIRecommendationRequest {
    return {
      menuId,
      focusArea: options.focusArea || 'comprehensive',
      customPrompt: options.customPrompt,
      targetAudience: options.targetAudience,
      cuisineType: options.cuisineType,
      priceRange: options.priceRange,
      dietaryPreferences: options.dietaryPreferences,
      season: options.season,
    }
  }

  // Get default focus areas with descriptions
  getFocusAreaOptions(): Array<{ value: AIRecommendationRequest['focusArea']; label: string; description: string }> {
    return [
      {
        value: 'comprehensive',
        label: 'Comprehensive Analysis',
        description: 'Complete menu review covering all aspects: pricing, descriptions, new dishes, and optimization'
      },
      {
        value: 'pricing',
        label: 'Pricing Optimization',
        description: 'Strategic pricing suggestions based on market positioning and cost analysis'
      },
      {
        value: 'descriptions',
        label: 'Menu Descriptions',
        description: 'Enhanced, appealing descriptions that highlight ingredients and preparation methods'
      },
      {
        value: 'new_dishes',
        label: 'New Dish Ideas',
        description: 'Innovative dish suggestions that complement your existing menu and concept'
      },
      {
        value: 'seasonal',
        label: 'Seasonal Specials',
        description: 'Seasonal ingredients and limited-time offerings based on current trends'
      },
      {
        value: 'cost_optimization',
        label: 'Cost Optimization',
        description: 'Reduce food costs without compromising quality through strategic ingredient changes'
      }
    ]
  }

  // Get current season based on date
  getCurrentSeason(): string {
    const month = new Date().getMonth()
    const seasons = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Fall', 'Fall', 'Fall', 'Winter']
    return seasons[month]
  }

  // Validate recommendation request
  validateRecommendationRequest(request: AIRecommendationRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!request.menuId) {
      errors.push('Menu ID is required')
    }

    if (request.priceRange) {
      if (request.priceRange.min >= request.priceRange.max) {
        errors.push('Minimum price must be less than maximum price')
      }
      if (request.priceRange.min < 0 || request.priceRange.max < 0) {
        errors.push('Prices must be positive numbers')
      }
    }

    if (request.customPrompt && request.customPrompt.length > 1000) {
      errors.push('Custom prompt must be less than 1000 characters')
    }

    if (request.targetAudience && request.targetAudience.length > 200) {
      errors.push('Target audience must be less than 200 characters')
    }

    if (request.cuisineType && request.cuisineType.length > 100) {
      errors.push('Cuisine type must be less than 100 characters')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Format processing time for display
  formatProcessingTime(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`
    } else {
      return `${(ms / 60000).toFixed(1)}m`
    }
  }

  // Calculate estimated processing time
  estimateProcessingTime(request: AIRecommendationRequest): number {
    let baseTime = 30000 // 30 seconds base

    // Adjust based on focus area
    const focusMultipliers: Record<AIRecommendationRequest['focusArea'], number> = {
      comprehensive: 2.0,
      pricing: 0.8,
      descriptions: 1.2,
      new_dishes: 1.5,
      seasonal: 1.3,
      cost_optimization: 1.4
    }

    baseTime *= focusMultipliers[request.focusArea] || 1.0

    // Add time for custom prompts
    if (request.customPrompt) {
      baseTime += 5000
    }

    // Add time for multiple dietary preferences
    if (request.dietaryPreferences && request.dietaryPreferences.length > 0) {
      baseTime += request.dietaryPreferences.length * 2000
    }

    return Math.round(baseTime)
  }

  // Get confidence level from score
  getConfidenceLevel(score: number): { level: string; color: string } {
    if (score >= 0.8) {
      return { level: 'High', color: 'text-green-600' }
    } else if (score >= 0.6) {
      return { level: 'Medium', color: 'text-yellow-600' }
    } else {
      return { level: 'Low', color: 'text-red-600' }
    }
  }
}

// Create singleton instance
export const aiService: AIService = new AIServiceImpl()

// Export types for external use
export type { AIRecommendationRequest, AIRecommendationResponse, Recommendation }

// Utility functions
export const isRecommendationCompleted = (status: string): boolean => {
  return status === 'completed'
}

export const isRecommendationProcessing = (status: string): boolean => {
  return status === 'processing' || status === 'pending'
}

export const isRecommendationFailed = (status: string): boolean => {
  return status === 'failed'
}

export const formatRecommendationDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const getRecommendationSummary = (recommendations: AIRecommendationResponse['recommendations']): string => {
  if (!recommendations) return 'No recommendations available'

  const parts: string[] = []

  if (recommendations.new_dishes?.length) {
    parts.push(`${recommendations.new_dishes.length} new dish${recommendations.new_dishes.length !== 1 ? 'es' : ''}`)
  }

  if (recommendations.updated_descriptions?.length) {
    parts.push(`${recommendations.updated_descriptions.length} updated description${recommendations.updated_descriptions.length !== 1 ? 's' : ''}`)
  }

  if (recommendations.price_suggestions?.length) {
    parts.push(`${recommendations.price_suggestions.length} price suggestion${recommendations.price_suggestions.length !== 1 ? 's' : ''}`)
  }

  if (recommendations.seasonal_suggestions?.length) {
    parts.push(`${recommendations.seasonal_suggestions.length} seasonal special${recommendations.seasonal_suggestions.length !== 1 ? 's' : ''}`)
  }

  if (recommendations.cost_optimization?.length) {
    parts.push(`${recommendations.cost_optimization.length} cost optimization${recommendations.cost_optimization.length !== 1 ? 's' : ''}`)
  }

  return parts.length > 0 ? parts.join(', ') : 'No recommendations'
}