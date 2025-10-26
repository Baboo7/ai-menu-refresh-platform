import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Database,
  FileText,
  Calendar,
  X
} from 'lucide-react'

import {
  useNotionIntegration,
  useDebouncedNotionSearch
} from '@/hooks/use-notion'

import { formatNotionPageTitle, formatDate, getNotionPageUrl } from '@/services/notion'

interface NotionConnectProps {
  onMenuImported?: (menuData: any) => void
  className?: string
}

export function NotionConnect({ onMenuImported, className }: NotionConnectProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPage, setSelectedPage] = useState<string | null>(null)

  const {
    isConnected,
    workspaceId,
    isLoadingConnection,
    connectionError,
    initiateOAuth,
    importPage,
    disconnect,
    isImporting,
    importError,
    importSuccess
  } = useNotionIntegration()

  // Debounced search hook
  const {
    data: searchResults = [],
    isLoading: isSearching,
    error: searchError
  } = useDebouncedNotionSearch(searchQuery, 300, 2)

  const handleConnect = () => {
    initiateOAuth()
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
      setSearchQuery('')
      setSelectedPage(null)
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  const handleImport = async (pageId: string, title: string) => {
    try {
      const result = await importPage({ pageId, title })

      if (result.success && onMenuImported) {
        onMenuImported(result.menu)
      }

      // Clear search and selection after successful import
      setSearchQuery('')
      setSelectedPage(null)
    } catch (error) {
      console.error('Failed to import page:', error)
    }
  }

  const handlePageClick = (pageId: string) => {
    setSelectedPage(selectedPage === pageId ? null : pageId)
  }

  const openNotionPage = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Handle OAuth callback
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')

    if (code && state) {
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  return (
    <Card className={`w-full max-w-4xl mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Notion Integration
        </CardTitle>
        <CardDescription>
          Connect your Notion workspace to import existing menus and recipes.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Connection Status Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Connection Status</h3>
              <p className="text-sm text-muted-foreground">
                {isConnected
                  ? `Connected to Notion workspace: ${workspaceId || 'Unknown'}`
                  : 'Not connected to Notion'}
              </p>
            </div>

            {isLoadingConnection ? (
              <Button disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </Button>
            ) : isConnected ? (
              <Button variant="outline" onClick={handleDisconnect}>
                Disconnect
              </Button>
            ) : (
              <Button onClick={handleConnect}>
                Connect Notion
              </Button>
            )}
          </div>

          {connectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Connection error: {connectionError.message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Search and Import Section */}
        {isConnected && (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Search Input */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Search Notion Pages</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search for menu pages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Search Results */}
              {searchQuery.length >= 2 && (
                <div className="space-y-3">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Searching...</span>
                    </div>
                  ) : searchError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Search error: {searchError.message}
                      </AlertDescription>
                    </Alert>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No pages found matching "{searchQuery}"</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {searchResults.map((page) => (
                        <motion.div
                          key={page.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              selectedPage === page.id ? 'ring-2 ring-primary' : ''
                            }`}
                            onClick={() => handlePageClick(page.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm mb-1">
                                    {formatNotionPageTitle(page)}
                                  </h4>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Created: {formatDate(page.created_time)}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Modified: {formatDate(page.last_edited_time)}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openNotionPage(getNotionPageUrl(page))
                                    }}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>

                                  {selectedPage === page.id && (
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleImport(page.id, formatNotionPageTitle(page))
                                      }}
                                      disabled={isImporting}
                                    >
                                      {isImporting ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Importing...
                                        </>
                                      ) : (
                                        <>
                                          <Database className="mr-2 h-4 w-4" />
                                          Import Menu
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Import Status */}
              {importError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Import failed: {importError.message}
                  </AlertDescription>
                </Alert>
              )}

              {importSuccess && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Successfully imported menu with {importSuccess.itemCount} items!
                  </AlertDescription>
                </Alert>
              )}

              {/* Instructions */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">How it works:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Connect your Notion workspace</li>
                  <li>Search for pages containing menu items</li>
                  <li>Select a page to preview</li>
                  <li>Click "Import Menu" to add it to your dashboard</li>
                  <li>The AI will parse headings, lists, and tables automatically</li>
                </ol>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  )
}