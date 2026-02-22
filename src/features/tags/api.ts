import { supabase } from '@/lib/supabase'
import type { V2Tag } from '@/types/database.types'

export async function getTags(userId: string): Promise<V2Tag[]> {
  const { data, error } = await supabase
    .from('v2_tags')
    .select('*')
    .eq('user_id', userId)
    .order('name')
  if (error) throw error
  return data as V2Tag[]
}

export async function createTag(userId: string, name: string, color: string): Promise<V2Tag> {
  const { data, error } = await supabase
    .from('v2_tags')
    .insert({ user_id: userId, name, color })
    .select()
    .single()
  if (error) throw error
  return data as V2Tag
}

export async function updateTag(id: string, updates: { name?: string; color?: string }): Promise<V2Tag> {
  const { data, error } = await supabase
    .from('v2_tags')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as V2Tag
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from('v2_tags').delete().eq('id', id)
  if (error) throw error
}

// Helpers for linking/unlinking tags
export async function setActionTags(actionId: string, tagIds: string[]): Promise<void> {
  await supabase.from('v2_action_tags').delete().eq('action_id', actionId)
  if (tagIds.length > 0) {
    const { error } = await supabase.from('v2_action_tags').insert(
      tagIds.map(tag_id => ({ action_id: actionId, tag_id }))
    )
    if (error) throw error
  }
}

export async function setMeetingTags(meetingId: string, tagIds: string[]): Promise<void> {
  await supabase.from('v2_meeting_tags').delete().eq('meeting_id', meetingId)
  if (tagIds.length > 0) {
    const { error } = await supabase.from('v2_meeting_tags').insert(
      tagIds.map(tag_id => ({ meeting_id: meetingId, tag_id }))
    )
    if (error) throw error
  }
}

export async function setKnowledgeTags(knowledgeId: string, tagIds: string[]): Promise<void> {
  await supabase.from('v2_knowledge_tags').delete().eq('knowledge_id', knowledgeId)
  if (tagIds.length > 0) {
    const { error } = await supabase.from('v2_knowledge_tags').insert(
      tagIds.map(tag_id => ({ knowledge_id: knowledgeId, tag_id }))
    )
    if (error) throw error
  }
}
