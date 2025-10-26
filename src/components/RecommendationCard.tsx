import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

import {
  Plus,
  DollarSign,
  TrendingUp,
  Calendar,
  Star,
  Info,
  Check,
  X,
  Eye,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Clock,
  Users,
  Target
} from 'lucide-react'

import type { AIRecommendationResponse } from '@/types/database'

interface RecommendationCardProps {
  recommendation: AIRecommendationResponse['recommendations'][keyof AIRecommendationResponse['recommendations']][0]
  type: 'new_dish' | 'updated_description' | 'price_suggestion' | 'seasonal_suggestion' | 'cost_optimization'
  onAccept?: (recommendation: any) => void
  onReject?: (recommendation: any) => void
  onEdit?: (recommendation: any) => void
  onPreview?: (recommendation: any) => void
  className?: string
  isSelected?: boolean
  onSelect?: (recommendation: any) => void
}

export function RecommendationCard({
  recommendation,
  type,
  onAccept,
  onReject,
  onEdit,
  onPreview,
  className,
  isSelected,
  onSelect
}: RecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Type-specific configuration
  const typeConfig = {
    new_dish: {
      icon: <Plus className="h-4 w-4" />,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      title: 'New Dish Suggestion',
      actionLabel: 'Add to Menu'
    },
    updated_description: {
      icon: <Edit className="h-4 w-4" />,
      color: 'bg-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      borderColor: 'border-green-200 dark:border-green-800',
      title: 'Updated Description',
      actionLabel: 'Update Description'
    },
    price_suggestion: {
      icon: <DollarSign className="h-4 w-4" />,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      title: 'Price Optimization',
      actionLabel: 'Update Price'
    },
    seasonal_suggestion: {
      icon: <Calendar className="h-4 w-4" />,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      borderColor: 'border-purple-200 dark:border-purple-800',
      title: 'Seasonal Special',
      actionLabel: 'Add as Seasonal'
    },
    cost_optimization: {
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'bg-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-800',
      title: 'Cost Optimization',
      actionLabel: 'Apply Optimization'
    }
  }

  const config = typeConfig[type]

  // Format price
  const formatPrice = (price: number | undefined | null) => {
    if (!price) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  // Get confidence level color
  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100 dark:bg-green-900/20'
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
    return 'text-red-600 bg-red-100 dark:bg-red-900/20'
  }

  // Render type-specific content
  const renderContent = () => {
    const rec = recommendation as any

    switch (type) {
      case 'new_dish':
      case 'seasonal_suggestion':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">{rec.name}</h3>
              <p className="text-muted-foreground leading-relaxed">{rec.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {rec.price && (
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Suggested Price</span>
                  <div className="font-semibold text-lg">{formatPrice(rec.price)}</div>
                </div>
              )}
              {rec.category && (
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <div className="font-medium">{rec.category}</div>
                </div>
              )}
            </div>

            {rec.ingredients && rec.ingredients.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Key Ingredients</span>
                <div className="flex flex-wrap gap-1">
                  {rec.ingredients.slice(0, 6).map((ingredient: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {ingredient}
                    </Badge>
                  ))}
                  {rec.ingredients.length > 6 && (
                    <Badge variant="outline" className="text-xs">
                      +{rec.ingredients.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {rec.reasoning && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Why this works:</strong> {rec.reasoning}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )

      case 'updated_description':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">{rec.item_name}</h3>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-red-600">Current Description</span>
                <p className="text-sm text-muted-foreground bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-200 dark:border-red-800">
                  {rec.current_description}
                </p>
              </div>

              <div>
                <span className="text-sm font-medium text-green-600">Suggested Description</span>
                <p className="text-sm leading-relaxed bg-green-50 dark:bg-green-950/20 p-3 rounded border border-green-200 dark:border-green-800">
                  {rec.suggested_description}
                </p>
              </div>

              {rec.reasoning && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Improvement:</strong> {rec.reasoning}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )

      case 'price_suggestion':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">{rec.item_name}</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Current Price</span>
                <div className="font-semibold text-lg text-red-600">
                  {formatPrice(rec.current_price)}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Suggested Price</span>
                <div className="font-semibold text-lg text-green-600">
                  {formatPrice(rec.suggested_price)}
                </div>
              </div>
            </div>

            {rec.confidence_score && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Confidence Level:</span>
                <Badge className={getConfidenceColor(rec.confidence_score)}>
                  {Math.round(rec.confidence_score * 100)}%
                </Badge>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Price Change</span>
                <span className={`font-medium ${
                  rec.suggested_price > rec.current_price ? 'text-green-600' : 'text-red-600'
                }`}>
                  {rec.suggested_price > rec.current_price ? '+' : ''}
                  {((rec.suggested_price - rec.current_price) / rec.current_price * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {rec.reasoning && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Rationale:</strong> {rec.reasoning}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )

      case 'cost_optimization':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">{rec.item_name}</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Current Cost</span>
                <div className="font-semibold text-lg text-red-600">
                  {formatPrice(rec.current_cost)}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Optimized Cost</span>
                <div className="font-semibold text-lg text-green-600">
                  {formatPrice(rec.optimized_cost)}
                </div>
              </div>
            </div>

            {rec.estimated_savings && (
              <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>Estimated Savings:</strong> {formatPrice(rec.estimated_savings)} per item
                </AlertDescription>
              </Alert>
            )}

            {rec.suggestions && rec.suggestions.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Optimization Suggestions</span>
                <ul className="space-y-1">
                  {rec.suggestions.map((suggestion: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )

      default:
        return <div>Unknown recommendation type</div>
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={className}
    >
      <Card className={`
        transition-all duration-200 hover:shadow-lg cursor-pointer
        ${isSelected ? 'ring-2 ring-primary' : ''}
        ${config.bgColor} ${config.borderColor}
      `}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded ${config.color} text-white`}>
                {config.icon}
              </div>
              <div>
                <CardTitle className="text-base">{config.title}</CardTitle>
                <CardDescription className="text-xs">
                  AI-generated suggestion
                </CardDescription>
              </div>
            </div>

            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-1"
              >
                {onPreview && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      onPreview(recommendation)
                    }}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                )}
                {onEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(recommendation)
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(recommendation, null, 2))}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </motion.div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {renderContent()}

          <Separator />

          <div className="flex gap-2">
            {onAccept && (
              <Button
                size="sm"
                onClick={() => onAccept(recommendation)}
                className="flex-1"
              >
                <Check className="mr-2 h-4 w-4" />
                {config.actionLabel}
              </Button>
            )}

            {onReject && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(recommendation)}
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Dismiss
              </Button>
            )}
          </div>

          {onSelect && (
            <div className="pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSelect(recommendation)}
                className="w-full"
              >
                {isSelected ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Deselect
                  </>
                ) : (
                  <>
                    <Target className="mr-2 h-4 w-4" />
                    Select for Batch Action
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Helper function to get recommendation type from object
export function getRecommendationType(recommendation: any): RecommendationCardProps['type'] {
  if (recommendation.ingredients || recommendation.seasonal_ingredients) {
    return 'new_dish'
  }
  if (recommendation.current_description && recommendation.suggested_description) {
    return 'updated_description'
  }
  if (recommendation.current_price && recommendation.suggested_price) {
    return 'price_suggestion'
  }
  if (recommendation.current_cost && recommendation.optimized_cost) {
    return 'cost_optimization'
  }
  if (recommendation.seasonal_ingredients) {
    return 'seasonal_suggestion'
  }
  return 'new_dish' // default
}