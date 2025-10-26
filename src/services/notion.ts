import { supabase } from '@/lib/supabase'
import type { NotionPage, NotionSearchResponse } from '@/types/database'

export interface NotionService {
  searchPages(query: string): Promise<NotionPage[]>
  importPage(pageId: string, title: string): Promise<{ success: boolean; menu?: any; itemCount?: number }>
  storeToken(token: string, workspaceId?: string): Promise<{ success: boolean }>
  disconnectNotion(): Promise<{ success: boolean }>
  getConnectionStatus(): Promise<{ connected: boolean; workspaceId?: string | null }>
}

class NotionServiceImpl implements NotionService {
  private baseUrl: string

  constructor() {
    this.baseUrl = import.meta.env.VITE_NOTION_IMPORTER_URL ||
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notion-importer`
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
      console.error('Notion service error:', error)
      throw error
    }
  }

  async searchPages(query: string = ''): Promise<NotionPage[]> {
    try {
      const response = await this.makeRequest('', {
        action: 'search-pages',
        data: { query, filter: { property: 'object', value: 'page' } }
      })

      return response.pages || []
    } catch (error) {
      console.error('Error searching Notion pages:', error)
      throw error
    }
  }

  async importPage(pageId: string, title: string): Promise<{ success: boolean; menu?: any; itemCount?: number }> {
    try {
      const response = await this.makeRequest('', {
        action: 'import-page',
        data: { pageId, title }
      })

      return response
    } catch (error) {
      console.error('Error importing Notion page:', error)
      throw error
    }
  }

  async storeToken(token: string, workspaceId?: string): Promise<{ success: boolean }> {
    try {
      const response = await this.makeRequest('', {
        action: 'store-token',
        data: { notionToken: token, workspaceId }
      })

      return response
    } catch (error) {
      console.error('Error storing Notion token:', error)
      throw error
    }
  }

  async disconnectNotion(): Promise<{ success: boolean }> {
    try {
      // Remove Notion credentials from user profile
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          notion_token: null,
          notion_workspace_id: null
        })
        .eq('id', user.id)

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('Error disconnecting Notion:', error)
      throw error
    }
  }

  async getConnectionStatus(): Promise<{ connected: boolean; workspaceId?: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return { connected: false }
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('notion_token, notion_workspace_id')
        .eq('id', user.id)
        .single()

      if (error || !profile) {
        return { connected: false }
      }

      return {
        connected: !!profile.notion_token,
        workspaceId: profile.notion_workspace_id
      }
    } catch (error) {
      console.error('Error checking Notion connection status:', error)
      return { connected: false }
    }
  }

  // Helper method to initiate Notion OAuth flow
  initiateOAuth(): void {
    const clientId = import.meta.env.VITE_NOTION_CLIENT_ID
    const redirectUri = `${window.location.origin}/auth/notion/callback`
    const state = crypto.randomUUID() // Generate random state for security

    // Store state in sessionStorage for verification
    sessionStorage.setItem('notion_oauth_state', state)

    const authUrl = new URL('https://api.notion.com/v1/oauth/authorize')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('owner', 'user')
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)

    window.location.href = authUrl.toString()
  }

  // Handle OAuth callback
  async handleOAuthCallback(code: string, state: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify state
      const storedState = sessionStorage.getItem('notion_oauth_state')

      if (state !== storedState) {
        throw new Error('Invalid OAuth state')
      }

      // Exchange code for token
      const clientId = import.meta.env.VITE_NOTION_CLIENT_ID
      const clientSecret = import.meta.env.VITE_NOTION_CLIENT_SECRET
      const redirectUri = `${window.location.origin}/auth/notion/callback`

      const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri
        })
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token')
      }

      const tokenData = await tokenResponse.json()

      // Store the token
      await this.storeToken(
        tokenData.access_token,
        tokenData.workspace_id || tokenData.owner?.workspace?.id
      )

      // Clean up
      sessionStorage.removeItem('notion_oauth_state')

      return { success: true }
    } catch (error) {
      console.error('Error handling Notion OAuth callback:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Create singleton instance
export const notionService: NotionService = new NotionServiceImpl()

// Export types for external use
export type { NotionPage, NotionSearchResponse }

// Utility functions
export const isNotionConnected = async (): Promise<boolean> => {
  const status = await notionService.getConnectionStatus()
  return status.connected
}

export const formatNotionPageTitle = (page: NotionPage): string => {
  return page.title || 'Untitled Page'
}

export const getNotionPageUrl = (page: NotionPage): string => {
  return page.url || `https://notion.so/${page.id.replace(/-/g, '')}`
}

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}