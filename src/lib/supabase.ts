import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Helper functions for common database operations
export const db = {
  // Profile operations
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  },

  async updateProfile(userId: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Menu operations
  async getMenus(userId: string) {
    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getMenu(menuId: string, userId: string) {
    const { data, error } = await supabase
      .from('menus')
      .select(`
        *,
        menu_items (
          id,
          name,
          description,
          price,
          category,
          ingredients,
          dietary_restrictions,
          allergens,
          prep_time_minutes,
          cost_of_goods,
          is_active,
          sort_order
        )
      `)
      .eq('id', menuId)
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data
  },

  async createMenu(menuData: any) {
    const { data, error } = await supabase
      .from('menus')
      .insert(menuData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateMenu(menuId: string, userId: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from('menus')
      .update(updates)
      .eq('id', menuId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteMenu(menuId: string, userId: string) {
    const { error } = await supabase
      .from('menus')
      .update({ is_active: false })
      .eq('id', menuId)
      .eq('user_id', userId)

    if (error) throw error
  },

  // Menu items operations
  async createMenuItem(itemData: any) {
    const { data, error } = await supabase
      .from('menu_items')
      .insert(itemData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateMenuItem(itemId: string, userId: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', itemId)
      .eq('menu_id', (await supabase.from('menus').select('id').eq('user_id', userId)))
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteMenuItem(itemId: string, userId: string) {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_active: false })
      .eq('id', itemId)
      .eq('menu_id', (await supabase.from('menus').select('id').eq('user_id', userId)))

    if (error) throw error
  },

  // Recommendations operations
  async getRecommendations(userId: string, menuId?: string) {
    let query = supabase
      .from('recommendations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (menuId) {
      query = query.eq('menu_id', menuId)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  },

  async createRecommendation(recData: any) {
    const { data, error } = await supabase
      .from('recommendations')
      .insert(recData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateRecommendation(recId: string, userId: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from('recommendations')
      .update(updates)
      .eq('id', recId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Analytics operations
  async trackEvent(eventData: any) {
    const { data, error } = await supabase
      .from('analytics_events')
      .insert(eventData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Export types for TypeScript
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          notion_token: string | null
          notion_workspace_id: string | null
          preferences: Record<string, any>
          subscription_tier: 'free' | 'pro' | 'enterprise'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          notion_token?: string | null
          notion_workspace_id?: string | null
          preferences?: Record<string, any>
          subscription_tier?: 'free' | 'pro' | 'enterprise'
        }
        Update: {
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          notion_token?: string | null
          notion_workspace_id?: string | null
          preferences?: Record<string, any>
          subscription_tier?: 'free' | 'pro' | 'enterprise'
        }
      }
      menus: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          content: Record<string, any>
          notion_page_id: string | null
          is_active: boolean
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          content?: Record<string, any>
          notion_page_id?: string | null
          is_active?: boolean
          metadata?: Record<string, any>
        }
        Update: {
          title?: string
          description?: string | null
          content?: Record<string, any>
          notion_page_id?: string | null
          is_active?: boolean
          metadata?: Record<string, any>
        }
      }
      menu_items: {
        Row: {
          id: string
          menu_id: string
          name: string
          description: string | null
          price: number | null
          category: string | null
          ingredients: any[]
          dietary_restrictions: any[]
          allergens: any[]
          prep_time_minutes: number | null
          cost_of_goods: number | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          menu_id: string
          name: string
          description?: string | null
          price?: number | null
          category?: string | null
          ingredients?: any[]
          dietary_restrictions?: any[]
          allergens?: any[]
          prep_time_minutes?: number | null
          cost_of_goods?: number | null
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          name?: string
          description?: string | null
          price?: number | null
          category?: string | null
          ingredients?: any[]
          dietary_restrictions?: any[]
          allergens?: any[]
          prep_time_minutes?: number | null
          cost_of_goods?: number | null
          is_active?: boolean
          sort_order?: number
        }
      }
      recommendations: {
        Row: {
          id: string
          menu_id: string
          user_id: string
          generated_content: Record<string, any>
          prompt_data: Record<string, any>
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired'
          model_name: string | null
          tokens_used: number
          processing_time_ms: number | null
          error_message: string | null
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          menu_id: string
          user_id: string
          generated_content: Record<string, any>
          prompt_data: Record<string, any>
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'expired'
          model_name?: string | null
          tokens_used?: number
          processing_time_ms?: number | null
          error_message?: string | null
          expires_at?: string
        }
        Update: {
          generated_content?: Record<string, any>
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'expired'
          model_name?: string | null
          tokens_used?: number
          processing_time_ms?: number | null
          error_message?: string | null
        }
      }
      analytics_events: {
        Row: {
          id: string
          user_id: string | null
          event_type: string
          event_data: Record<string, any>
          session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: string
          event_data?: Record<string, any>
          session_id?: string | null
        }
        Update: {
          user_id?: string | null
          event_type?: string
          event_data?: Record<string, any>
          session_id?: string | null
        }
      }
    }
  }
}