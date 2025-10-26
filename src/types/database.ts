// TypeScript types for the AI Menu Refresh Platform database entities

// Base entity with common fields
interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

// Profile/User entity
export interface Profile extends BaseEntity {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  notion_token: string | null
  notion_workspace_id: string | null
  preferences: Record<string, any>
  subscription_tier: 'free' | 'pro' | 'enterprise'
}

// Menu entity
export interface Menu extends BaseEntity {
  id: string
  user_id: string
  title: string
  description: string | null
  content: MenuContent
  notion_page_id: string | null
  is_active: boolean
  metadata: Record<string, any>
}

// Menu content structure
export interface MenuContent {
  categories?: MenuCategory[]
  items?: MenuItem[]
  metadata?: Record<string, any>
}

// Menu category
export interface MenuCategory {
  id?: string
  name: string
  description?: string
  sort_order?: number
  items?: string[] // Array of item IDs
}

// Menu item
export interface MenuItem extends BaseEntity {
  id: string
  menu_id: string
  name: string
  description: string | null
  price: number | null
  category: string | null
  ingredients: string[]
  dietary_restrictions: string[]
  allergens: string[]
  prep_time_minutes: number | null
  cost_of_goods: number | null
  is_active: boolean
  sort_order: number
}

// Recommendation entity
export interface Recommendation extends BaseEntity {
  id: string
  menu_id: string
  user_id: string
  generated_content: AIRecommendationResponse
  prompt_data: AIRecommendationRequest
  status: RecommendationStatus
  model_name: string | null
  tokens_used: number
  processing_time_ms: number | null
  error_message: string | null
  expires_at: string
}

// Recommendation status
export type RecommendationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired'

// AI Recommendation Request
export interface AIRecommendationRequest {
  menuId: string
  focusArea?: 'pricing' | 'descriptions' | 'new_dishes' | 'seasonal' | 'cost_optimization'
  customPrompt?: string
  targetAudience?: string
  cuisineType?: string
  priceRange?: {
    min: number
    max: number
  }
  dietaryPreferences?: string[]
  season?: string
}

// AI Recommendation Response
export interface AIRecommendationResponse {
  success: boolean
  recommendations?: {
    new_dishes?: AIGeneratedDish[]
    updated_descriptions?: DescriptionUpdate[]
    price_suggestions?: PriceSuggestion[]
    seasonal_suggestions?: AIGeneratedDish[]
    cost_optimization?: CostOptimization[]
    menu_structure?: MenuStructureSuggestion[]
  }
  metadata?: AIMetadata
  error?: string
}

// AI Generated Dish
export interface AIGeneratedDish {
  name: string
  description: string
  price?: number | null
  category: string | null
  ingredients: string[]
  reasoning?: string
  seasonal_ingredients?: string[]
  availability_months?: string[]
}

// Description Update
export interface DescriptionUpdate {
  item_id: string
  item_name: string
  current_description: string
  suggested_description: string
  reasoning: string
}

// Price Suggestion
export interface PriceSuggestion {
  item_id: string
  item_name: string
  current_price: number
  suggested_price: number
  reasoning: string
  confidence_score: number
}

// Cost Optimization
export interface CostOptimization {
  item_id: string
  item_name: string
  current_cost: number
  optimized_cost: number
  suggestions: string[]
  estimated_savings: number
}

// Menu Structure Suggestion
export interface MenuStructureSuggestion {
  categories: Array<{
    name: string
    items: string[]
    suggested_rearrangement?: string
  }>
}

// AI Metadata
export interface AIMetadata {
  model: string
  tokens_used: number
  processing_time_ms: number
  prompt_tokens?: number
  completion_tokens?: number
}

// Analytics Event
export interface AnalyticsEvent extends BaseEntity {
  id: string
  user_id: string | null
  event_type: string
  event_data: Record<string, any>
  session_id: string | null
}

// Notion Integration Types
export interface NotionPage {
  id: string
  title: string
  created_time: string
  last_edited_time: string
  url: string
  properties?: Record<string, any>
}

export interface NotionSearchResponse {
  results: NotionPage[]
  has_more: boolean
  next_cursor?: string
}

// UI State Types
export interface DashboardState {
  currentMenu: Menu | null
  menus: Menu[]
  recommendations: Recommendation[]
  isLoading: boolean
  error: string | null
  selectedCategory?: string
  searchQuery?: string
}

export interface MenuEditorState {
  isEditing: boolean
  editingItem?: MenuItem
  isCreating: boolean
  unsavedChanges: boolean
}

export interface AIRecommendationState {
  isGenerating: boolean
  currentRequestId?: string
  progress?: number
  lastResults?: AIRecommendationResponse
  focusArea: AIRecommendationRequest['focusArea']
}

// Form Types
export interface MenuItemForm {
  name: string
  description: string
  price: string
  category: string
  ingredients: string[]
  dietary_restrictions: string[]
  allergens: string[]
  prep_time_minutes: string
  cost_of_goods: string
  is_active: boolean
}

export interface MenuForm {
  title: string
  description: string
  category: string
}

export interface AIRecommendationForm {
  focusArea: AIRecommendationRequest['focusArea']
  customPrompt: string
  targetAudience: string
  cuisineType: string
  priceRangeMin: string
  priceRangeMax: string
  dietaryPreferences: string[]
  season: string
}

// Settings/Preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  currency: string
  notifications: {
    email: boolean
    push: boolean
    marketing: boolean
  }
  ai: {
    preferredModel: string
    temperature: number
    maxTokens: number
  }
  menu: {
    defaultCategory?: string
    showCosts: boolean
    showMargins: boolean
  }
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

// Error Types
export interface AppError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
}

// Export type guards
export const isMenuItem = (obj: any): obj is MenuItem => {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string'
}

export const isMenu = (obj: any): obj is Menu => {
  return obj && typeof obj.id === 'string' && typeof obj.title === 'string' && typeof obj.user_id === 'string'
}

export const isRecommendation = (obj: any): obj is Recommendation => {
  return obj && typeof obj.id === 'string' && typeof obj.menu_id === 'string' && typeof obj.status === 'string'
}

// Database table names
export const DATABASE_TABLES = {
  PROFILES: 'profiles',
  MENUS: 'menus',
  MENU_ITEMS: 'menu_items',
  RECOMMENDATIONS: 'recommendations',
  ANALYTICS_EVENTS: 'analytics_events'
} as const

// Helper types for Supabase queries
export type Tables = {
  profiles: Profile
  menus: Menu
  menu_items: MenuItem
  recommendations: Recommendation
  analytics_events: AnalyticsEvent
}

export type TableNames = keyof Tables