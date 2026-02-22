import { supabase } from '@/lib/supabase'
import { setMeetingTags } from '@/features/tags/api'
import type { V2Meeting, V2Decision } from '@/types/database.types'

export async function getMeetings(userId: string): Promise<V2Meeting[]> {
  const { data, error } = await supabase
    .from('v2_meetings')
    .select(`
      *,
      tags:v2_meeting_tags(
        v2_tags(*)
      )
    `)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })

  if (error) throw error

  return ((data || []) as unknown as Record<string, unknown>[]).map(row => ({
    ...(row as object),
    tags: (row.tags as { v2_tags: unknown }[] | undefined)?.map(t => t.v2_tags).filter(Boolean) || [],
  })) as V2Meeting[]
}

export async function getMeeting(id: string): Promise<V2Meeting | null> {
  const { data, error } = await supabase
    .from('v2_meetings')
    .select(`
      *,
      tags:v2_meeting_tags(
        v2_tags(*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return null

  const decisions = await getDecisions(id)
  const actions = await getMeetingActions(id)
  const row = data as unknown as Record<string, unknown>

  return {
    ...(row as object),
    tags: (row.tags as { v2_tags: unknown }[] | undefined)?.map(t => t.v2_tags).filter(Boolean) || [],
    decisions,
    actions,
  } as V2Meeting
}

export interface CreateMeetingInput {
  user_id: string
  title: string
  date: string
  start_time?: string | null
  end_time?: string | null
  location?: string | null
  participants?: string | null
  notes?: string | null
  tag_ids?: string[]
}

export async function createMeeting(input: CreateMeetingInput): Promise<V2Meeting> {
  const { tag_ids, ...meetingData } = input
  const { data, error } = await supabase
    .from('v2_meetings')
    .insert(meetingData)
    .select()
    .single()
  if (error) throw error

  const row = data as unknown as V2Meeting
  if (tag_ids && tag_ids.length > 0) {
    await setMeetingTags(row.id, tag_ids)
  }

  return row
}

export interface UpdateMeetingInput {
  title?: string
  date?: string
  start_time?: string | null
  end_time?: string | null
  location?: string | null
  participants?: string | null
  notes?: string | null
  tag_ids?: string[]
}

export async function updateMeeting(id: string, input: UpdateMeetingInput): Promise<V2Meeting> {
  const { tag_ids, ...meetingData } = input
  const { data, error } = await supabase
    .from('v2_meetings')
    .update({ ...(meetingData as Record<string, unknown>), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  if (tag_ids !== undefined) {
    await setMeetingTags(id, tag_ids)
  }

  return data as unknown as V2Meeting
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from('v2_meetings').delete().eq('id', id)
  if (error) throw error
}

export async function getDecisions(meetingId: string): Promise<V2Decision[]> {
  const { data, error } = await supabase
    .from('v2_decisions')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as unknown as V2Decision[]
}

export async function createDecision(userId: string, meetingId: string, title: string, description?: string): Promise<V2Decision> {
  const { data, error } = await supabase
    .from('v2_decisions')
    .insert({ user_id: userId, meeting_id: meetingId, title, description })
    .select()
    .single()
  if (error) throw error
  return data as unknown as V2Decision
}

export async function updateDecision(id: string, updates: { title?: string; description?: string }): Promise<V2Decision> {
  const { data, error } = await supabase
    .from('v2_decisions')
    .update(updates as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as unknown as V2Decision
}

export async function deleteDecision(id: string): Promise<void> {
  const { error } = await supabase.from('v2_decisions').delete().eq('id', id)
  if (error) throw error
}

export async function getMeetingActions(meetingId: string) {
  const { data, error } = await supabase
    .from('v2_actions')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getUpcomingMeetings(userId: string, limit = 5) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('v2_meetings')
    .select('*')
    .eq('user_id', userId)
    .gte('date', today)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data || []) as unknown as V2Meeting[]
}
