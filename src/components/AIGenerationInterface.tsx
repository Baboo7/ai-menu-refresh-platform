import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

import {
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  Timer,
  Brain,
  FileText,
  DollarSign,
  TrendingUp,
  Calendar,
  X,
  RefreshCw,
  Download,
  Share
} from 'lucide-react'

import { useRecommendationStatus } from '@/hooks/use-ai-recommendations'
import type { AIRecommendationResponse } from '@/types/database'

interface AIGenerationInterfaceProps {
  recommendationId?: string
  onComplete?: (results: AIRecommendationResponse) => void
  onCancel?: () => void
  className?: string
}

interface GenerationStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  duration: number // in milliseconds
}

export function AIGenerationInterface({
  recommendationId,
  onComplete,
  onCancel,
  className
}: AIGenerationInterfaceProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Generation steps for user-facing progress
  const generationSteps: GenerationStep[] = [
    {
      id: 'analyzing',
      title: 'Analyzing Menu',
      description: 'Examining your menu structure, ingredients, and pricing',
      icon: <FileText className="h-4 w-4" />,
      duration: 8000
    },
    {
      id: 'market-research',
      title: 'Market Research',
      description: 'Analyzing current food trends and competitor offerings',
      icon: <TrendingUp className="h-4 w-4" />,
      duration: 6000
    },
    {
      id: 'ai-processing',
      title: 'AI Analysis',
      description: 'Generating personalized recommendations using advanced AI',
      icon: <Brain className="h-4 w-4" />,
      duration: 15000
    },
    {
      id: 'optimization',
      title: 'Optimization',
      description: 'Fine-tuning recommendations based on your specifications',
      icon: <Sparkles className="h-4 w-4" />,
      duration: 5000
    }
  ]

  // Use the status hook for real-time updates
  const {
    data: statusData,
    isLoading: isStatusLoading,
    error: statusError
  } = useRecommendationStatus(recommendationId || '', !!recommendationId, 3000)

  // Calculate current step based on progress
  const getCurrentStep = useCallback(() => {
    if (!statusData) return 0

    const progress = statusData.progress || 0
    const stepIndex = Math.floor((progress / 100) * generationSteps.length)
    return Math.min(stepIndex, generationSteps.length - 1)
  }, [statusData])

  const currentStepIndex = getCurrentStep()
  const currentStep = generationSteps[currentStepIndex]
  const isCompleted = statusData?.status === 'completed'
  const isFailed = statusData?.status === 'failed'
  const isProcessing = statusData?.status === 'processing' || statusData?.status === 'pending'

  // Handle completion
  React.useEffect(() => {
    if (isCompleted && statusData?.results && onComplete) {
      onComplete(statusData.results)
    }
  }, [isCompleted, statusData, onComplete])

  // Format elapsed time
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  // Get status color
  const getStatusColor = () => {
    if (isCompleted) return 'text-green-600'
    if (isFailed) return 'text-red-600'
    if (isProcessing) return 'text-blue-600'
    return 'text-gray-600'
  }

  // Get status icon
  const getStatusIcon = () => {
    if (isCompleted) return <CheckCircle className="h-5 w-5" />
    if (isFailed) return <AlertCircle className="h-5 w-5" />
    if (isProcessing) return <Loader2 className="h-5 w-5 animate-spin" />
    return <Timer className="h-5 w-5" />
  }

  if (!recommendationId) {
    return (
      <Card className={`w-full max-w-2xl mx-auto ${className}`}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Active Generation</h3>
          <p className="text-muted-foreground">
            Start a new recommendation generation to see real-time progress.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full bg-muted ${getStatusColor()}`}>
              {getStatusIcon()}
            </div>
            <div>
              <CardTitle className="text-lg">
                {isCompleted ? 'Recommendations Ready!' :
                 isFailed ? 'Generation Failed' :
                 isProcessing ? 'Generating Recommendations' : 'Initializing...'}
              </CardTitle>
              <CardDescription>
                {isCompleted ? 'Your personalized menu recommendations are ready to review' :
                 isFailed ? 'There was an error generating your recommendations' :
                 'AI is analyzing your menu and creating personalized recommendations'}
              </CardDescription>
            </div>
          </div>

          {onCancel && !isCompleted && !isFailed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Badge */}
        <div className="flex items-center justify-center">
          <Badge
            variant={isCompleted ? 'default' : isFailed ? 'destructive' : 'secondary'}
            className="text-sm px-3 py-1"
          >
            {statusData?.status || 'Unknown'}
          </Badge>
        </div>

        {/* Progress Bar */}
        <AnimatePresence mode="wait">
          <motion.div
            key={statusData?.status}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">
                {Math.round(statusData?.progress || 0)}%
              </span>
            </div>
            <Progress value={statusData?.progress || 0} className="h-3" />

            {statusData?.elapsed_time && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Time elapsed: {formatTime(statusData.elapsed_time)}</span>
                {statusData.estimated_time && (
                  <span>Estimated: {formatTime(statusData.estimated_time)}</span>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Generation Steps */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <h4 className="font-medium text-center text-muted-foreground">Generation Steps</h4>
            <div className="space-y-3">
              {generationSteps.map((step, index) => {
                const isActive = index === currentStepIndex
                const isCompletedStep = index < currentStepIndex

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg transition-all
                      ${isActive ? 'bg-primary/10 border border-primary/20' :
                        isCompletedStep ? 'bg-green-50 dark:bg-green-950/20' :
                        'bg-muted/30'}
                    `}
                  >
                    <div className={`
                      p-2 rounded-full
                      ${isActive ? 'bg-primary text-primary-foreground' :
                        isCompletedStep ? 'bg-green-600 text-white' :
                        'bg-muted text-muted-foreground'}
                    `}>
                      {isCompletedStep ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        step.icon
                      )}
                    </div>

                    <div className="flex-1">
                      <h5 className="font-medium text-sm">{step.title}</h5>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>

                    {isActive && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Completed State */}
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Success! Your AI recommendations have been generated and are ready for review.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              {statusData?.metadata && (
                <>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {statusData.metadata.tokens_used?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Tokens Used</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {formatTime(statusData.processing_time_ms || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Processing Time</div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-center">
              <Button onClick={() => setShowDetails(!showDetails)} variant="outline">
                {showDetails ? 'Hide' : 'Show'} Technical Details
              </Button>
            </div>
          </motion.div>
        )}

        {/* Failed State */}
        {isFailed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {statusData?.error || 'An unexpected error occurred while generating recommendations.'}
              </AlertDescription>
            </Alert>

            <div className="flex justify-center gap-2">
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download Error Log
              </Button>
            </div>
          </motion.div>
        )}

        {/* Technical Details */}
        <AnimatePresence>
          {showDetails && statusData?.metadata && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <Separator />
              <div>
                <h4 className="font-medium mb-3">Technical Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AI Model:</span>
                    <span className="font-mono">{statusData.metadata.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prompt Tokens:</span>
                    <span className="font-mono">{statusData.metadata.prompt_tokens?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completion Tokens:</span>
                    <span className="font-mono">{statusData.metadata.completion_tokens?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Tokens:</span>
                    <span className="font-mono">{statusData.metadata.tokens_used?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processing Time:</span>
                    <span className="font-mono">{formatTime(statusData.processing_time_ms || 0)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Error */}
        {statusError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Status check error: {statusError.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}