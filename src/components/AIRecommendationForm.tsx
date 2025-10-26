import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

import {
  Sparkles,
  TrendingUp,
  DollarSign,
  FileText,
  Plus,
  Calendar,
  DollarSignIcon,
  Users,
  ChefHat,
  Timer,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react'

import { useRecommendationForm, useRealTimeRecommendations } from '@/hooks/use-ai-recommendations'
import type { AIRecommendationRequest } from '@/types/database'

interface AIRecommendationFormProps {
  menuId: string
  menuTitle?: string
  onRecommendationsGenerated?: (results: any) => void
  className?: string
}

export function AIRecommendationForm({
  menuId,
  menuTitle,
  onRecommendationsGenerated,
  className
}: AIRecommendationFormProps) {
  const [formData, setFormData] = useState<Partial<AIRecommendationRequest>>({
    menuId,
    focusArea: 'comprehensive',
    season: 'current'
  })

  const [errors, setErrors] = useState<string[]>([])

  const {
    validateForm,
    createRequest,
    getFocusAreaOptions,
    getCurrentSeason,
    estimateProcessingTime
  } = useRecommendationForm()

  const {
    generateRecommendations,
    isGenerating,
    generationError
  } = useRealTimeRecommendations()

  // Dietary preferences options
  const dietaryOptions = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Nut-Free',
    'Halal',
    'Kosher',
    'Keto',
    'Paleo',
    'Low-Carb',
    'Low-Sodium',
    'Sugar-Free'
  ]

  // Focus area icons
  const getFocusAreaIcon = (value: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      comprehensive: <Sparkles className="h-4 w-4" />,
      pricing: <DollarSign className="h-4 w-4" />,
      descriptions: <FileText className="h-4 w-4" />,
      new_dishes: <Plus className="h-4 w-4" />,
      seasonal: <Calendar className="h-4 w-4" />,
      cost_optimization: <TrendingUp className="h-4 w-4" />
    }
    return iconMap[value] || <Sparkles className="h-4 w-4" />
  }

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors([])
  }, [])

  const handleDietaryChange = useCallback((option: string, checked: boolean) => {
    setFormData(prev => {
      const current = prev.dietaryPreferences || []
      const updated = checked
        ? [...current, option]
        : current.filter(item => item !== option)
      return { ...prev, dietaryPreferences: updated }
    })
    setErrors([])
  }, [])

  const validateAndSubmit = useCallback(async () => {
    const request = createRequest(formData)
    const validation = validateForm(request)

    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setErrors([])

    try {
      const results = await generateRecommendations(request)

      if (onRecommendationsGenerated) {
        onRecommendationsGenerated(results)
      }
    } catch (error) {
      console.error('Generation failed:', error)
    }
  }, [formData, createRequest, validateForm, generateRecommendations, onRecommendationsGenerated])

  const estimatedTime = estimateProcessingTime(createRequest(formData))

  return (
    <Card className={`w-full max-w-4xl mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Menu Recommendations
        </CardTitle>
        <CardDescription>
          Get personalized AI-powered recommendations to enhance your menu.
          {menuTitle && ` Currently analyzing: "${menuTitle}"`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Focus Area Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">What would you like to focus on?</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {getFocusAreaOptions.map((option) => (
              <motion.div
                key={option.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    formData.focusArea === option.value
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleInputChange('focusArea', option.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {getFocusAreaIcon(option.value)}
                      <h4 className="font-medium text-sm">{option.label}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {option.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="targetAudience">Target Audience</Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="targetAudience"
                placeholder="e.g., Young professionals, families, foodies"
                value={formData.targetAudience || ''}
                onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                className="pl-10"
                disabled={isGenerating}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cuisineType">Cuisine Type</Label>
            <div className="relative">
              <ChefHat className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="cuisineType"
                placeholder="e.g., Italian, Asian, Fusion, Comfort Food"
                value={formData.cuisineType || ''}
                onChange={(e) => handleInputChange('cuisineType', e.target.value)}
                className="pl-10"
                disabled={isGenerating}
              />
            </div>
          </div>
        </div>

        {/* Price Range */}
        <div className="space-y-2">
          <Label>Price Range (Optional)</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minPrice" className="text-sm text-muted-foreground">Minimum Price</Label>
              <div className="relative">
                <DollarSignIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="minPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.priceRange?.min || ''}
                  onChange={(e) => handleInputChange('priceRange', {
                    ...formData.priceRange,
                    min: parseFloat(e.target.value) || 0
                  })}
                  className="pl-10"
                  disabled={isGenerating}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPrice" className="text-sm text-muted-foreground">Maximum Price</Label>
              <div className="relative">
                <DollarSignIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="maxPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="100.00"
                  value={formData.priceRange?.max || ''}
                  onChange={(e) => handleInputChange('priceRange', {
                    ...formData.priceRange,
                    max: parseFloat(e.target.value) || 0
                  })}
                  className="pl-10"
                  disabled={isGenerating}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Season */}
        <div className="space-y-2">
          <Label htmlFor="season">Season (Optional)</Label>
          <Select
            value={formData.season === 'current' ? getCurrentSeason() : formData.season || ''}
            onValueChange={(value) => handleInputChange('season', value)}
            disabled={isGenerating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Season ({getCurrentSeason()})</SelectItem>
              <SelectItem value="Spring">Spring</SelectItem>
              <SelectItem value="Summer">Summer</SelectItem>
              <SelectItem value="Fall">Fall</SelectItem>
              <SelectItem value="Winter">Winter</SelectItem>
              <SelectItem value="year-round">Year-Round</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dietary Preferences */}
        <div className="space-y-2">
          <Label>Dietary Preferences (Optional)</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {dietaryOptions.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`dietary-${option}`}
                  checked={formData.dietaryPreferences?.includes(option) || false}
                  onCheckedChange={(checked) => handleDietaryChange(option, checked as boolean)}
                  disabled={isGenerating}
                />
                <Label
                  htmlFor={`dietary-${option}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Prompt */}
        <div className="space-y-2">
          <Label htmlFor="customPrompt">Additional Instructions (Optional)</Label>
          <Textarea
            id="customPrompt"
            placeholder="Any specific requirements, goals, or constraints you'd like the AI to consider..."
            value={formData.customPrompt || ''}
            onChange={(e) => handleInputChange('customPrompt', e.target.value)}
            className="min-h-[80px]"
            disabled={isGenerating}
          />
        </div>

        {/* Processing Time Estimate */}
        {formData.focusArea && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>Estimated processing time: <span className="font-medium">{Math.round(estimatedTime / 1000)} seconds</span></span>
                <Timer className="h-4 w-4 text-muted-foreground" />
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Generation Error */}
        {generationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to generate recommendations: {generationError.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button
            onClick={validateAndSubmit}
            disabled={isGenerating || !formData.focusArea}
            size="lg"
            className="min-w-[200px]"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Recommendations
              </>
            )}
          </Button>
        </div>

        {/* Loading Progress */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">AI is analyzing your menu...</span>
              <span className="font-medium">Processing</span>
            </div>
            <Progress value={66} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              This may take a moment while our AI generates personalized recommendations.
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}