import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'

import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Plus,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Grid3x3,
  List,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

import { RecommendationCard, getRecommendationType } from './RecommendationCard'
import type { AIRecommendationResponse } from '@/types/database'

interface RecommendationGridProps {
  recommendations: AIRecommendationResponse['recommendations']
  onAcceptRecommendation?: (recommendation: any, type: string) => void
  onRejectRecommendation?: (recommendation: any, type: string) => void
  onEditRecommendation?: (recommendation: any, type: string) => void
  onPreviewRecommendation?: (recommendation: any, type: string) => void
  onBulkAccept?: (selectedRecommendations: any[]) => void
  onBulkReject?: (selectedRecommendations: any[]) => void
  className?: string
}

interface FilterState {
  query: string
  types: string[]
  categories: string[]
  priceRange?: {
    min: number
    max: number
  }
  hasConfidenceScore: boolean
  minConfidence: number
}

interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

export function RecommendationGrid({
  recommendations,
  onAcceptRecommendation,
  onRejectRecommendation,
  onEditRecommendation,
  onPreviewRecommendation,
  onBulkAccept,
  onBulkReject,
  className
}: RecommendationGridProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    query: '',
    types: [],
    categories: [],
    hasConfidenceScore: false,
    minConfidence: 0
  })
  const [sort, setSort] = useState<SortState>({
    field: 'type',
    direction: 'desc'
  })

  // Flatten all recommendations into a single array with metadata
  const flattenedRecommendations = useMemo(() => {
    const flattened: Array<{
      id: string
      item: any
      type: string
      category?: string
      hasConfidenceScore?: boolean
      confidenceScore?: number
    }> = []

    if (!recommendations) return flattened

    Object.entries(recommendations).forEach(([type, items]) => {
      if (Array.isArray(items)) {
        items.forEach((item, index) => {
          flattened.push({
            id: `${type}-${index}`,
            item,
            type,
            category: item.category || type,
            hasConfidenceScore: !!item.confidence_score,
            confidenceScore: item.confidence_score
          })
        })
      }
    })

    return flattened
  }, [recommendations])

  // Get all available types and categories for filters
  const availableTypes = useMemo(() => {
    const types = new Set(flattenedRecommendations.map(r => r.type))
    return Array.from(types)
  }, [flattenedRecommendations])

  const availableCategories = useMemo(() => {
    const categories = new Set(flattenedRecommendations.map(r => r.category).filter(Boolean))
    return Array.from(categories)
  }, [flattenedRecommendations])

  // Filter recommendations
  const filteredRecommendations = useMemo(() => {
    return flattenedRecommendations.filter(rec => {
      // Text search
      if (filters.query) {
        const searchText = filters.query.toLowerCase()
        const itemText = JSON.stringify(rec.item).toLowerCase()
        if (!itemText.includes(searchText)) {
          return false
        }
      }

      // Type filter
      if (filters.types.length > 0 && !filters.types.includes(rec.type)) {
        return false
      }

      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(rec.category || '')) {
        return false
      }

      // Confidence score filter
      if (filters.hasConfidenceScore && (!rec.confidenceScore || rec.confidenceScore < filters.minConfidence)) {
        return false
      }

      // Price range filter
      if (filters.priceRange) {
        const price = rec.item.price || rec.item.suggested_price
        if (!price || price < filters.priceRange.min || price > filters.priceRange.max) {
          return false
        }
      }

      return true
    })
  }, [flattenedRecommendations, filters])

  // Sort recommendations
  const sortedRecommendations = useMemo(() => {
    return [...filteredRecommendations].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sort.field) {
        case 'type':
          aValue = a.type
          bValue = b.type
          break
        case 'name':
          aValue = a.item.name || a.item.item_name || ''
          bValue = b.item.name || b.item.item_name || ''
          break
        case 'price':
          aValue = a.item.price || a.item.suggested_price || 0
          bValue = b.item.price || b.item.suggested_price || 0
          break
        case 'confidence':
          aValue = a.confidenceScore || 0
          bValue = b.confidenceScore || 0
          break
        default:
          aValue = a.id
          bValue = b.id
      }

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredRecommendations, sort])

  // Handle selection
  const handleSelectRecommendation = useCallback((recId: string) => {
    setSelectedRecommendations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recId)) {
        newSet.delete(recId)
      } else {
        newSet.add(recId)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedRecommendations.size === sortedRecommendations.length) {
      setSelectedRecommendations(new Set())
    } else {
      setSelectedRecommendations(new Set(sortedRecommendations.map(rec => rec.id)))
    }
  }, [selectedRecommendations.size, sortedRecommendations])

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      query: '',
      types: [],
      categories: [],
      hasConfidenceScore: false,
      minConfidence: 0
    })
  }, [])

  // Export recommendations
  const exportRecommendations = useCallback(() => {
    const exportData = sortedRecommendations.map(rec => ({
      id: rec.id,
      type: rec.type,
      ...rec.item
    }))

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recommendations-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [sortedRecommendations])

  const typeConfig = {
    new_dish: { label: 'New Dishes', color: 'bg-blue-500' },
    updated_description: { label: 'Descriptions', color: 'bg-green-500' },
    price_suggestion: { label: 'Price Ideas', color: 'bg-amber-500' },
    seasonal_suggestion: { label: 'Seasonal', color: 'bg-purple-500' },
    cost_optimization: { label: 'Cost Savings', color: 'bg-red-500' }
  }

  if (!flattenedRecommendations.length) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Recommendations Available</h3>
            <p>Generate AI recommendations to see suggestions for your menu.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 w-full lg:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recommendations..."
              value={filters.query}
              onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
            {(filters.types.length > 0 || filters.categories.length > 0 || filters.query) && (
              <Badge className="ml-2" variant="secondary">
                {filters.types.length + filters.categories.length + (filters.query ? 1 : 0)}
              </Badge>
            )}
          </Button>

          <Select
            value={`${sort.field}-${sort.direction}`}
            onValueChange={(value) => {
              const [field, direction] = value.split('-')
              setSort({ field, direction: direction as 'asc' | 'desc' })
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="type-desc">Type (Newest)</SelectItem>
              <SelectItem value="type-asc">Type (Oldest)</SelectItem>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="price-desc">Price (High-Low)</SelectItem>
              <SelectItem value="price-asc">Price (Low-High)</SelectItem>
              <SelectItem value="confidence-desc">Confidence (High-Low)</SelectItem>
              <SelectItem value="confidence-asc">Confidence (Low-High)</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex rounded-md border">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={exportRecommendations}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Advanced Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Type Filters */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Recommendation Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(typeConfig).map(([type, config]) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={filters.types.includes(type)}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              types: checked
                                ? [...prev.types, type]
                                : prev.types.filter(t => t !== type)
                            }))
                          }}
                        />
                        <Label
                          htmlFor={`type-${type}`}
                          className="text-sm flex items-center gap-2 cursor-pointer"
                        >
                          <div className={`w-3 h-3 rounded-full ${config.color}`} />
                          {config.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category Filters */}
                {availableCategories.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Categories</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {availableCategories.map(category => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category}`}
                            checked={filters.categories.includes(category)}
                            onCheckedChange={(checked) => {
                              setFilters(prev => ({
                                ...prev,
                                categories: checked
                                  ? [...prev.categories, category]
                                  : prev.categories.filter(c => c !== category)
                              }))
                            }}
                          />
                          <Label
                            htmlFor={`category-${category}`}
                            className="text-sm cursor-pointer"
                          >
                            {category}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confidence Score Filter */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="confidence-filter"
                      checked={filters.hasConfidenceScore}
                      onCheckedChange={(checked) => {
                        setFilters(prev => ({
                          ...prev,
                          hasConfidenceScore: checked as boolean,
                          minConfidence: checked ? prev.minConfidence : 0
                        }))
                      }}
                    />
                    <Label htmlFor="confidence-filter" className="text-sm font-medium cursor-pointer">
                      Minimum Confidence Score
                    </Label>
                  </div>
                  {filters.hasConfidenceScore && (
                    <div className="ml-6 space-y-2">
                      <div className="flex items-center gap-4">
                        <Label className="text-sm text-muted-foreground">
                          {filters.minConfidence}%
                        </Label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={filters.minConfidence}
                          onChange={(e) => {
                            setFilters(prev => ({
                              ...prev,
                              minConfidence: parseInt(e.target.value)
                            }))
                          }}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground">100%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Clear Filters Button */}
                <div className="flex justify-end">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear All Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Actions */}
      {selectedRecommendations.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Alert className="bg-primary/10 border-primary/20">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">
                  {selectedRecommendations.size} recommendation{selectedRecommendations.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex gap-2">
                {onBulkAccept && (
                  <Button size="sm" onClick={() => onBulkAccept(Array.from(selectedRecommendations))}>
                    Accept Selected
                  </Button>
                )}
                {onBulkReject && (
                  <Button size="sm" variant="outline" onClick={() => onBulkReject(Array.from(selectedRecommendations))}>
                    Reject Selected
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSelectedRecommendations(new Set())}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </Alert>
        </motion.div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredRecommendations.length} of {flattenedRecommendations.length} recommendations
        </span>
        {selectedRecommendations.size < filteredRecommendations.length && (
          <Button size="sm" variant="ghost" onClick={handleSelectAll}>
            Select All
          </Button>
        )}
      </div>

      {/* Recommendations Grid/List */}
      {sortedRecommendations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Matching Recommendations</h3>
            <p>Try adjusting your filters or search terms.</p>
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          <AnimatePresence mode="popLayout">
            {sortedRecommendations.map((rec) => (
              <motion.div
                key={rec.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec.item}
                  type={getRecommendationType(rec.item)}
                  onAccept={onAcceptRecommendation ? (item) => onAcceptRecommendation(item, rec.type) : undefined}
                  onReject={onRejectRecommendation ? (item) => onRejectRecommendation(item, rec.type) : undefined}
                  onEdit={onEditRecommendation ? (item) => onEditRecommendation(item, rec.type) : undefined}
                  onPreview={onPreviewRecommendation ? (item) => onPreviewRecommendation(item, rec.type) : undefined}
                  onSelect={() => handleSelectRecommendation(rec.id)}
                  isSelected={selectedRecommendations.has(rec.id)}
                  className={viewMode === 'list' ? 'w-full' : ''}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}