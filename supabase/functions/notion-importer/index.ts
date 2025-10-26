import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotionPage {
  id: string
  properties: {
    title?: {
      title: Array<{ plain_text: string }>
    }
    [key: string]: any
  }
  content?: any[]
}

interface NotionDatabase {
  id: string
  title: Array<{ plain_text: string }>
  properties: Record<string, any>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { method, url } = req
    const urlPath = new URL(url).pathname

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

    // Get the user
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

    // Get user's Notion token from profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('notion_token, notion_workspace_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.notion_token) {
      return new Response(
        JSON.stringify({ error: 'Notion integration not configured' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (method === 'POST') {
      const { action, data } = await req.json()

      switch (action) {
        case 'search-pages':
          return await handleSearchPages(data, profile.notion_token)
        case 'import-page':
          return await handleImportPage(data, profile.notion_token, supabaseClient, user.id)
        case 'store-token':
          return await handleStoreToken(data, supabaseClient, user.id)
        default:
          return new Response(
            JSON.stringify({ error: 'Invalid action' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in notion-importer:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function handleSearchPages(data: any, notionToken: string) {
  try {
    const { query = '', filter = {} } = data

    // Search for pages and databases
    const searchResponse = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        query,
        filter: {
          property: 'object',
          value: 'page'
        },
        page_size: 20
      })
    })

    if (!searchResponse.ok) {
      throw new Error(`Notion API error: ${searchResponse.statusText}`)
    }

    const searchData = await searchResponse.json()

    // Format results for frontend
    const pages = searchData.results.map((page: NotionPage) => ({
      id: page.id,
      title: page.properties.title?.title?.[0]?.plain_text || 'Untitled Page',
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
      url: page.url
    }))

    return new Response(
      JSON.stringify({ pages }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error searching pages:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to search pages' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

async function handleImportPage(
  data: any,
  notionToken: string,
  supabaseClient: any,
  userId: string
) {
  try {
    const { pageId, title } = data

    // Get page content from Notion
    const pageResponse = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
      }
    })

    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch page content: ${pageResponse.statusText}`)
    }

    const pageData = await pageResponse.json()

    // Parse page content and extract menu items
    const menuContent = parseNotionContentToMenu(pageData.results)

    // Create menu in database
    const { data: menu, error: menuError } = await supabaseClient
      .from('menus')
      .insert({
        user_id: userId,
        title: title || 'Imported Menu',
        content: menuContent,
        notion_page_id: pageId
      })
      .select()
      .single()

    if (menuError) {
      throw new Error(`Failed to create menu: ${menuError.message}`)
    }

    // Create individual menu items
    if (menuContent.items && menuContent.items.length > 0) {
      const menuItemsData = menuContent.items.map((item: any, index: number) => ({
        menu_id: menu.id,
        name: item.name,
        description: item.description,
        price: item.price || null,
        category: item.category || null,
        ingredients: item.ingredients || [],
        sort_order: index
      }))

      const { error: itemsError } = await supabaseClient
        .from('menu_items')
        .insert(menuItemsData)

      if (itemsError) {
        console.error('Failed to create menu items:', itemsError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        menu,
        itemCount: menuContent.items?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error importing page:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to import page' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

async function handleStoreToken(data: any, supabaseClient: any, userId: string) {
  try {
    const { notionToken, workspaceId } = data

    // Validate token with Notion API
    const validationResponse = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
      }
    })

    if (!validationResponse.ok) {
      throw new Error('Invalid Notion token')
    }

    // Store encrypted token in profile
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        notion_token: notionToken, // In production, this should be encrypted
        notion_workspace_id: workspaceId
      })
      .eq('id', userId)

    if (updateError) {
      throw new Error(`Failed to store token: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error storing token:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to store Notion token' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

function parseNotionContentToMenu(blocks: any[]): { items: any[] } {
  const items: any[] = []
  let currentItem: any = {}
  let currentCategory = 'Uncategorized'

  for (const block of blocks) {
    switch (block.type) {
      case 'heading_1':
        // If we have a current item, save it before starting new
        if (currentItem.name) {
          items.push({ ...currentItem, category: currentCategory })
          currentItem = {}
        }
        currentCategory = block.heading_1?.rich_text?.[0]?.plain_text || 'Uncategorized'
        break

      case 'heading_2':
      case 'heading_3':
        if (block.heading_2?.rich_text?.[0]?.plain_text || block.heading_3?.rich_text?.[0]?.plain_text) {
          const heading = block.heading_2?.rich_text?.[0]?.plain_text || block.heading_3?.rich_text?.[0]?.plain_text

          // If this looks like a dish name (contains common food indicators)
          if (/\$|price|serve|portion/i.test(heading) || /^[A-Z][a-z\s]+$/.test(heading)) {
            // Save previous item if exists
            if (currentItem.name) {
              items.push({ ...currentItem, category: currentCategory })
            }

            // Extract price if present
            const priceMatch = heading.match(/\$(\d+\.?\d*)/)
            currentItem = {
              name: heading.replace(/\$\d+\.?\d*/, '').trim(),
              price: priceMatch ? parseFloat(priceMatch[1]) : null,
              description: '',
              ingredients: []
            }
          }
        }
        break

      case 'paragraph':
        const text = block.paragraph?.rich_text?.map((rt: any) => rt.plain_text).join('') || ''

        // If we have a current item and this paragraph looks like description
        if (currentItem.name && text.length > 10) {
          if (currentItem.description) {
            currentItem.description += ' ' + text
          } else {
            currentItem.description = text
          }
        } else if (!currentItem.name && text.length > 5) {
          // This might be a standalone dish name
          const priceMatch = text.match(/\$(\d+\.?\d*)/)
          currentItem = {
            name: text.replace(/\$\d+\.?\d*/, '').trim(),
            price: priceMatch ? parseFloat(priceMatch[1]) : null,
            description: '',
            ingredients: []
          }
        }
        break

      case 'bulleted_list_item':
        const bulletText = block.bulleted_list_item?.rich_text?.map((rt: any) => rt.plain_text).join('') || ''

        if (bulletText && currentItem.name) {
          // This might be an ingredient or additional info
          currentItem.ingredients = currentItem.ingredients || []
          currentItem.ingredients.push(bulletText)
        }
        break

      case 'to_do':
        const todoText = block.to_do?.rich_text?.map((rt: any) => rt.plain_text).join('') || ''

        if (todoText && currentItem.name) {
          // This might be an ingredient
          currentItem.ingredients = currentItem.ingredients || []
          currentItem.ingredients.push(todoText)
        }
        break
    }
  }

  // Don't forget the last item
  if (currentItem.name) {
    items.push({ ...currentItem, category: currentCategory })
  }

  return { items }
}