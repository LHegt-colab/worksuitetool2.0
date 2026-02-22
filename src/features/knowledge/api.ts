import { supabase } from '@/lib/supabase'
import { setKnowledgeTags } from '@/features/tags/api'
import type { V2KnowledgePage } from '@/types/database.types'

export async function getKnowledgePages(userId: string): Promise<V2KnowledgePage[]> {
  const { data, error } = await supabase
    .from('v2_knowledge_pages')
    .select(`
      *,
      tags:v2_knowledge_tags(
        v2_tags(*)
      )
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error

  return ((data || []) as unknown as Record<string, unknown>[]).map(row => ({
    ...(row as object),
    tags: (row.tags as { v2_tags: unknown }[] | undefined)?.map(t => t.v2_tags).filter(Boolean) || [],
  })) as V2KnowledgePage[]
}

export async function getKnowledgePage(id: string): Promise<V2KnowledgePage | null> {
  const { data, error } = await supabase
    .from('v2_knowledge_pages')
    .select(`
      *,
      tags:v2_knowledge_tags(
        v2_tags(*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return null
  const row = data as unknown as Record<string, unknown>
  return {
    ...(row as object),
    tags: (row.tags as { v2_tags: unknown }[] | undefined)?.map(t => t.v2_tags).filter(Boolean) || [],
  } as V2KnowledgePage
}

export interface CreateKnowledgeInput {
  user_id: string
  title: string
  content?: string
  url?: string
  category?: string
  tag_ids?: string[]
}

export async function createKnowledgePage(input: CreateKnowledgeInput): Promise<V2KnowledgePage> {
  const { tag_ids, ...pageData } = input
  const { data, error } = await supabase
    .from('v2_knowledge_pages')
    .insert(pageData)
    .select()
    .single()
  if (error) throw error

  const row = data as unknown as V2KnowledgePage
  if (tag_ids && tag_ids.length > 0) {
    await setKnowledgeTags(row.id, tag_ids)
  }

  return row
}

export interface UpdateKnowledgeInput {
  title?: string
  content?: string
  url?: string
  category?: string
  tag_ids?: string[]
}

export async function updateKnowledgePage(id: string, input: UpdateKnowledgeInput): Promise<V2KnowledgePage> {
  const { tag_ids, ...pageData } = input
  const { data, error } = await supabase
    .from('v2_knowledge_pages')
    .update({ ...(pageData as Record<string, unknown>), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  if (tag_ids !== undefined) {
    await setKnowledgeTags(id, tag_ids)
  }

  return data as unknown as V2KnowledgePage
}

export async function deleteKnowledgePage(id: string): Promise<void> {
  const { error } = await supabase.from('v2_knowledge_pages').delete().eq('id', id)
  if (error) throw error
}

export async function getKnowledgeCategories(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('v2_knowledge_pages')
    .select('category')
    .eq('user_id', userId)
    .not('category', 'is', null)
  if (error) return []
  const rows = (data || []) as unknown as { category: string | null }[]
  const cats = rows.map(d => d.category).filter(Boolean) as string[]
  return [...new Set(cats)].sort()
}
