import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notionService, type NotionPage } from '@/services/notion'

// Query keys for cache management
export const NOTION_QUERY_KEYS = {
  connectionStatus: ['notion', 'connection-status'],
  searchPages: (query: string) => ['notion', 'search-pages', query],
  importPage: (pageId: string) => ['notion', 'import-page', pageId],
}

// Hook for checking Notion connection status
export const useNotionConnectionStatus = () => {
  return useQuery({
    queryKey: NOTION_QUERY_KEYS.connectionStatus,
    queryFn: () => notionService.getConnectionStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

// Hook for searching Notion pages
export const useNotionSearchPages = (query: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: NOTION_QUERY_KEYS.searchPages(query),
    queryFn: () => notionService.searchPages(query),
    enabled: enabled && query.length >= 2, // Only search with 2+ characters
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
    retryDelay: 1000,
  })
}

// Hook for importing a Notion page
export const useNotionImportPage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pageId, title }: { pageId: string; title: string }) =>
      notionService.importPage(pageId, title),

    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      queryClient.invalidateQueries({ queryKey: ['notion', 'search-pages'] })

      // Optionally trigger a toast notification
      if (data.success) {
        console.log(`Successfully imported menu with ${data.itemCount} items`)
      }
    },

    onError: (error) => {
      console.error('Failed to import Notion page:', error)
    },
  })
}

// Hook for storing Notion token
export const useNotionStoreToken = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ token, workspaceId }: { token: string; workspaceId?: string }) =>
      notionService.storeToken(token, workspaceId),

    onSuccess: () => {
      // Invalidate connection status
      queryClient.invalidateQueries({ queryKey: NOTION_QUERY_KEYS.connectionStatus })
    },

    onError: (error) => {
      console.error('Failed to store Notion token:', error)
    },
  })
}

// Hook for disconnecting Notion
export const useNotionDisconnect = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => notionService.disconnectNotion(),

    onSuccess: () => {
      // Invalidate connection status
      queryClient.invalidateQueries({ queryKey: NOTION_QUERY_KEYS.connectionStatus })

      // Clear all Notion-related queries
      queryClient.removeQueries({ queryKey: ['notion'] })
    },

    onError: (error) => {
      console.error('Failed to disconnect Notion:', error)
    },
  })
}

// Hook for handling OAuth callback
export const useNotionOAuthCallback = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ code, state }: { code: string; state: string }) =>
      notionService.handleOAuthCallback(code, state),

    onSuccess: () => {
      // Invalidate connection status
      queryClient.invalidateQueries({ queryKey: NOTION_QUERY_KEYS.connectionStatus })
    },

    onError: (error) => {
      console.error('Failed to handle OAuth callback:', error)
    },
  })
}

// Hook for initiating OAuth flow
export const useNotionOAuthFlow = () => {
  const initiateOAuth = () => {
    notionService.initiateOAuth()
  }

  return { initiateOAuth }
}

// Combined hook for Notion integration state
export const useNotionIntegration = () => {
  const connectionStatus = useNotionConnectionStatus()
  const importMutation = useNotionImportPage()
  const disconnectMutation = useNotionDisconnect()
  const storeTokenMutation = useNotionStoreToken()
  const { initiateOAuth } = useNotionOAuthFlow()

  return {
    // Connection status
    isConnected: connectionStatus.data?.connected ?? false,
    workspaceId: connectionStatus.data?.workspaceId,
    isLoadingConnection: connectionStatus.isLoading,
    connectionError: connectionStatus.error,

    // Actions
    initiateOAuth,
    importPage: importMutation.mutateAsync,
    disconnect: disconnectMutation.mutateAsync,
    storeToken: storeTokenMutation.mutateAsync,

    // Loading states
    isImporting: importMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isStoringToken: storeTokenMutation.isPending,

    // Errors
    importError: importMutation.error,
    disconnectError: disconnectMutation.error,
    storeTokenError: storeTokenMutation.error,

    // Success states
    importSuccess: importMutation.data,
    disconnectSuccess: disconnectMutation.data,
    storeTokenSuccess: storeTokenMutation.data,

    // Refetch connection status
    refetchConnection: connectionStatus.refetch,
  }
}

// Hook for Notion page search with debouncing
export const useDebouncedNotionSearch = (
  searchQuery: string,
  debounceMs: number = 300,
  minQueryLength: number = 2
) => {
  const [debouncedQuery, setDebouncedQuery] = React.useState(searchQuery)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [searchQuery, debounceMs])

  return useNotionSearchPages(debouncedQuery, debouncedQuery.length >= minQueryLength)
}

// Hook for checking if OAuth callback is needed
export const useNotionOAuthCallbackCheck = () => {
  const queryClient = useQueryClient()

  React.useEffect(() => {
    // Check if we're in an OAuth callback
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    const error = urlParams.get('error')

    if (error) {
      console.error('Notion OAuth error:', error)
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    if (code && state) {
      // Handle OAuth callback
      const handleCallback = async () => {
        try {
          const mutation = useNotionOAuthCallback()
          await mutation.mutateAsync({ code, state })

          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname)
        } catch (error) {
          console.error('Failed to handle OAuth callback:', error)
        }
      }

      handleCallback()
    }
  }, [queryClient])
}

// Import React for hooks that need it
import React from 'react'