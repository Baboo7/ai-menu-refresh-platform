import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MenuData {
  id: string
  title: string
  content: Record<string, any>
  items?: MenuItem[]
}

interface MenuItem {
  id?: string
  name: string
  description?: string
  price?: number
  category?: string
  ingredients?: string[]
  dietary_restrictions?: string[]
  allergens?: string[]
  prep_time_minutes?: number
  cost_of_goods?: number
}

interface AIRecommendationRequest {
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

interface AIRecommendationResponse {
  success: boolean
  recommendations?: {
    new_dishes?: MenuItem[]
    updated_descriptions?: Array<{
      item_id: string
      item_name: string
      current_description: string
      suggested_description: string
      reasoning: string
    }>
    price_suggestions?: Array<{
      item_id: string
      item_name: string
      current_price: number
      suggested_price: number
      reasoning: string
      confidence_score: number
    }>
    seasonal_suggestions?: MenuItem[]
    cost_optimization?: Array<{
      item_id: string
      item_name: string
      current_cost: number
      optimized_cost: number
      suggestions: string[]
      estimated_savings: number
    }>
    menu_structure?: {
      categories: Array<{
        name: string
        items: string[]
        suggested_rearrangement?: string
      }>
    }
  }
  metadata?: {
    model: string
    tokens_used: number
    processing_time_ms: number
    prompt_tokens: number
    completion_tokens: number
  }
  error?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const startTime = Date.now()

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { action, data } = await req.json()

    if (action === 'generate-recommendations') {
      return await handleGenerateRecommendations(data, supabaseClient, user.id, startTime)
    } else if (action === 'check-status') {
      return await handleCheckStatus(data, supabaseClient, user.id)
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Error in recommendation-generator:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function handleGenerateRecommendations(
  request: AIRecommendationRequest,
  supabaseClient: any,
  userId: string,
  startTime: number
) {
  try {
    // Create initial recommendation record
    const { data: recommendation, error: recError } = await supabaseClient
      .from('recommendations')
      .insert({
        menu_id: request.menuId,
        user_id: userId,
        status: 'processing',
        prompt_data: request,
        generated_content: {},
        model_name: 'claude-sonnet-4-5-20250929'
      })
      .select()
      .single()

    if (recError) {
      throw new Error(`Failed to create recommendation record: ${recError.message}`)
    }

    // Get menu data
    const { data: menu, error: menuError } = await supabaseClient
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
          cost_of_goods
        )
      `)
      .eq('id', request.menuId)
      .eq('user_id', userId)
      .single()

    if (menuError || !menu) {
      throw new Error(`Menu not found: ${menuError?.message || 'Unknown error'}`)
    }

    // Generate AI recommendations
    const aiResponse = await callAIRecommendationAPI(menu as MenuData, request)

    const processingTime = Date.now() - startTime

    // Update recommendation with results
    const { data: updatedRec, error: updateError } = await supabaseClient
      .from('recommendations')
      .update({
        status: aiResponse.success ? 'completed' : 'failed',
        generated_content: aiResponse,
        tokens_used: aiResponse.metadata?.tokens_used || 0,
        processing_time_ms: processingTime,
        error_message: aiResponse.error || null
      })
      .eq('id', recommendation.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update recommendation:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        recommendationId: recommendation.id,
        results: aiResponse,
        processing_time_ms: processingTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error generating recommendations:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

async function handleCheckStatus(data: { recommendationId: string }, supabaseClient: any, userId: string) {
  try {
    const { recommendationId } = data

    const { data: recommendation, error } = await supabaseClient
      .from('recommendations')
      .select('*')
      .eq('id', recommendationId)
      .eq('user_id', userId)
      .single()

    if (error || !recommendation) {
      return new Response(
        JSON.stringify({ error: 'Recommendation not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: recommendation.status,
        results: recommendation.generated_content,
        metadata: {
          model: recommendation.model_name,
          tokens_used: recommendation.tokens_used,
          processing_time_ms: recommendation.processing_time_ms,
          created_at: recommendation.created_at
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error checking status:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

async function callAIRecommendationAPI(menu: MenuData, request: AIRecommendationRequest): Promise<AIRecommendationResponse> {
  try {
    // Build the prompt based on request parameters
    const prompt = buildRecommendationPrompt(menu, request)

    // Call Claude API (you could also use OpenAI or other providers)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') || '',
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.7,
        system: `You are an expert restaurant consultant and menu analyst. You specialize in helping chefs optimize their menus for better profitability, customer satisfaction, and operational efficiency. Always provide specific, actionable recommendations with clear reasoning.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AI API error: ${response.status} ${errorText}`)
    }

    const aiData = await response.json()
    const responseContent = aiData.content[0]?.text || ''

    // Parse the AI response
    const recommendations = parseAIResponse(responseContent, menu.items || [])

    return {
      success: true,
      recommendations,
      metadata: {
        model: 'claude-3-5-sonnet-20241022',
        tokens_used: aiData.usage?.total_tokens || 0,
        processing_time_ms: 0, // Will be set by caller
        prompt_tokens: aiData.usage?.input_tokens || 0,
        completion_tokens: aiData.usage?.output_tokens || 0
      }
    }

  } catch (error) {
    console.error('Error calling AI API:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

function buildRecommendationPrompt(menu: MenuData, request: AIRecommendationRequest): string {
  const { focusArea = 'comprehensive', customPrompt } = request

  let prompt = `I need you to analyze this restaurant menu and provide expert recommendations.\n\n`
  prompt += `MENU TITLE: ${menu.title}\n\n`
  prompt += `CURRENT MENU ITEMS:\n`

  if (menu.items && menu.items.length > 0) {
    menu.items.forEach((item, index) => {
      prompt += `${index + 1}. ${item.name}`
      if (item.price) prompt += ` - $${item.price}`
      if (item.category) prompt += ` (${item.category})`
      prompt += `\n`
      if (item.description) prompt += `   Description: ${item.description}\n`
      if (item.ingredients && item.ingredients.length > 0) {
        prompt += `   Ingredients: ${item.ingredients.join(', ')}\n`
      }
      if (item.cost_of_goods) prompt += `   Cost: $${item.cost_of_goods}\n`
      prompt += `\n`
    })
  } else {
    prompt += `(No menu items found)\n`
  }

  // Add context from the request
  if (request.targetAudience) {
    prompt += `TARGET AUDIENCE: ${request.targetAudience}\n\n`
  }

  if (request.cuisineType) {
    prompt += `CUISINE TYPE: ${request.cuisineType}\n\n`
  }

  if (request.priceRange) {
    prompt += `PRICE RANGE: $${request.priceRange.min} - $${request.priceRange.max}\n\n`
  }

  if (request.dietaryPreferences && request.dietaryPreferences.length > 0) {
    prompt += `DIETARY PREFERENCES: ${request.dietaryPreferences.join(', ')}\n\n`
  }

  if (request.season) {
    prompt += `SEASON: ${request.season}\n\n`
  }

  // Focus area specific instructions
  prompt += `RECOMMENDATION FOCUS: ${focusArea}\n\n`

  switch (focusArea) {
    case 'pricing':
      prompt += `Please provide specific price optimization recommendations. For each item, suggest a new price with reasoning about market positioning, cost structure, and perceived value. Include confidence scores for your suggestions.\n\n`
      break
    case 'descriptions':
      prompt += `Please rewrite menu descriptions to be more appealing and accurate. Focus on sensory details, sourcing information, and selling points. Provide reasoning for each change.\n\n`
      break
    case 'new_dishes':
      prompt += `Please suggest 3-5 new dishes that would complement this menu. Consider the existing categories, flavor profiles, and target audience. Include detailed descriptions and suggested pricing.\n\n`
      break
    case 'seasonal':
      prompt += `Please suggest seasonal modifications for ${request.season || 'current season'}. Include seasonal ingredients, limited-time offerings, and marketing angles.\n\n`
      break
    case 'cost_optimization':
      prompt += `Please identify opportunities to reduce food costs without compromising quality. Suggest ingredient substitutions, portion optimizations, and recipe adjustments with estimated savings.\n\n`
      break
    default:
      prompt += `Please provide comprehensive recommendations covering all aspects: pricing optimization, menu descriptions, new dish suggestions, seasonal opportunities, and cost optimization.\n\n`
  }

  if (customPrompt) {
    prompt += `ADDITIONAL REQUEST: ${customPrompt}\n\n`
  }

  prompt += `RESPONSE FORMAT: Please provide your recommendations in the following JSON structure:
{
  "new_dishes": [
    {
      "name": "Dish Name",
      "description": "Appetizing description",
      "price": 24.99,
      "category": "Category",
      "ingredients": ["ingredient1", "ingredient2"],
      "reasoning": "Why this dish would work well"
    }
  ],
  "updated_descriptions": [
    {
      "item_id": "or item_name",
      "current_description": "Current text",
      "suggested_description": "New description",
      "reasoning": "Why this is better"
    }
  ],
  "price_suggestions": [
    {
      "item_id": "or item_name",
      "item_name": "Dish Name",
      "current_price": 18.99,
      "suggested_price": 21.99,
      "reasoning": "Market and cost analysis",
      "confidence_score": 0.8
    }
  ],
  "seasonal_suggestions": [
    {
      "name": "Seasonal Dish",
      "description": "Seasonal description",
      "price": 26.99,
      "category": "Specials",
      "seasonal_ingredients": ["pumpkin", "sage"],
      "availability_months": ["October", "November"]
    }
  ],
  "cost_optimization": [
    {
      "item_id": "or item_name",
      "item_name": "Dish Name",
      "current_cost": 8.50,
      "optimized_cost": 7.25,
      "suggestions": ["Use seasonal ingredients", "Adjust portion sizes"],
      "estimated_savings": 1.25
    }
  ]
}

Please ensure your response is valid JSON that can be parsed.`

  return prompt
}

function parseAIResponse(aiResponse: string, menuItems: MenuItem[]): AIRecommendationResponse['recommendations'] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate and structure the response
    const recommendations: AIRecommendationResponse['recommendations'] = {}

    if (parsed.new_dishes && Array.isArray(parsed.new_dishes)) {
      recommendations.new_dishes = parsed.new_dishes.map((dish: any) => ({
        name: dish.name,
        description: dish.description,
        price: dish.price || null,
        category: dish.category || null,
        ingredients: dish.ingredients || [],
        reasoning: dish.reasoning || ''
      }))
    }

    if (parsed.updated_descriptions && Array.isArray(parsed.updated_descriptions)) {
      recommendations.updated_descriptions = parsed.updated_descriptions.map((desc: any) => {
        // Map item names to IDs if possible
        const item = menuItems.find(item =>
          item.name.toLowerCase() === (desc.item_name || '').toLowerCase()
        )

        return {
          item_id: item?.id || desc.item_id || desc.item_name,
          item_name: item?.name || desc.item_name || 'Unknown Item',
          current_description: desc.current_description || '',
          suggested_description: desc.suggested_description || '',
          reasoning: desc.reasoning || ''
        }
      })
    }

    if (parsed.price_suggestions && Array.isArray(parsed.price_suggestions)) {
      recommendations.price_suggestions = parsed.price_suggestions.map((price: any) => {
        const item = menuItems.find(item =>
          item.name.toLowerCase() === (price.item_name || '').toLowerCase()
        )

        return {
          item_id: item?.id || price.item_id || price.item_name,
          item_name: item?.name || price.item_name || 'Unknown Item',
          current_price: price.current_price || item?.price || 0,
          suggested_price: price.suggested_price || 0,
          reasoning: price.reasoning || '',
          confidence_score: price.confidence_score || 0.5
        }
      })
    }

    if (parsed.seasonal_suggestions && Array.isArray(parsed.seasonal_suggestions)) {
      recommendations.seasonal_suggestions = parsed.seasonal_suggestions.map((seasonal: any) => ({
        name: seasonal.name,
        description: seasonal.description,
        price: seasonal.price || null,
        category: seasonal.category || 'Seasonal Special',
        ingredients: seasonal.seasonal_ingredients || seasonal.ingredients || []
      }))
    }

    if (parsed.cost_optimization && Array.isArray(parsed.cost_optimization)) {
      recommendations.cost_optimization = parsed.cost_optimization.map((opt: any) => {
        const item = menuItems.find(item =>
          item.name.toLowerCase() === (opt.item_name || '').toLowerCase()
        )

        return {
          item_id: item?.id || opt.item_id || opt.item_name,
          item_name: item?.name || opt.item_name || 'Unknown Item',
          current_cost: opt.current_cost || item?.cost_of_goods || 0,
          optimized_cost: opt.optimized_cost || 0,
          suggestions: opt.suggestions || [],
          estimated_savings: opt.estimated_savings || 0
        }
      })
    }

    return recommendations

  } catch (error) {
    console.error('Error parsing AI response:', error)
    console.log('Raw AI response:', aiResponse)

    // Return empty recommendations if parsing fails
    return {
      new_dishes: [],
      updated_descriptions: [],
      price_suggestions: [],
      seasonal_suggestions: [],
      cost_optimization: []
    }
  }
}