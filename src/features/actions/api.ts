import { supabase } from '@/lib/supabase'
import { setActionTags } from '@/features/tags/api'
import type { V2Action } from '@/types/database.types'

export async function getActions(userId: string): Promise<V2Action[]> {
  const { data, error } = await supabase
    .from('v2_actions')
    .select(`
      *,
      tags:v2_action_tags(
        v2_tags(*)
      )
    `)
    .eq('user_id', userId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data || []) as unknown as Record<string, unknown>[]).map(row => ({
    ...(row as object),
    tags: (row.tags as { v2_tags: unknown }[] | undefined)?.map(t => t.v2_tags).filter(Boolean) || [],
  })) as V2Action[]
}

export async function getAction(id: string): Promise<V2Action | null> {
  const { data, error } = await supabase
    .from('v2_actions')
    .select(`
      *,
      tags:v2_action_tags(
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
  } as V2Action
}

export interface CreateActionInput {
  user_id: string
  title: string
  description?: string
  status?: string
  priority?: string
  start_date?: string | null
  due_date?: string | null
  meeting_id?: string | null
  tag_ids?: string[]
}

export async function createAction(input: CreateActionInput): Promise<V2Action> {
  const { tag_ids, ...actionData } = input
  const { data, error } = await supabase
    .from('v2_actions')
    .insert(actionData)
    .select()
    .single()
  if (error) throw error

  const row = data as unknown as V2Action
  if (tag_ids && tag_ids.length > 0) {
    await setActionTags(row.id, tag_ids)
  }

  return row
}

export interface UpdateActionInput {
  title?: string
  description?: string
  status?: string
  priority?: string
  start_date?: string | null
  due_date?: string | null
  meeting_id?: string | null
  completed_at?: string | null
  tag_ids?: string[]
}

export async function updateAction(id: string, input: UpdateActionInput): Promise<V2Action> {
  const { tag_ids, ...actionData } = input
  const { data, error } = await supabase
    .from('v2_actions')
    .update({ ...(actionData as Record<string, unknown>), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  if (tag_ids !== undefined) {
    await setActionTags(id, tag_ids)
  }

  return data as unknown as V2Action
}

export async function deleteAction(id: string): Promise<void> {
  const { error } = await supabase.from('v2_actions').delete().eq('id', id)
  if (error) throw error
}

export async function markActionDone(id: string): Promise<void> {
  await supabase
    .from('v2_actions')
    .update({ status: 'done', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Record<string, unknown>)
    .eq('id', id)
}

export async function getUpcomingActions(userId: string, limit = 10): Promise<V2Action[]> {
  const { data, error } = await supabase
    .from('v2_actions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['open', 'in_progress'])
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as unknown as V2Action[]
}

export async function getOverdueActions(userId: string): Promise<V2Action[]> {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('v2_actions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['open', 'in_progress'])
    .not('due_date', 'is', null)
    .lt('due_date', today)
    .order('due_date', { ascending: true })
  if (error) throw error
  return (data || []) as unknown as V2Action[]
}
