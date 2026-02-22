import { supabase } from '@/lib/supabase'
import type { V2JournalEntry } from '@/types/database.types'

export async function getJournalEntries(userId: string): Promise<V2JournalEntry[]> {
  const { data, error } = await supabase
    .from('v2_journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
  if (error) throw error
  return (data || []) as V2JournalEntry[]
}

export async function getJournalEntry(userId: string, date: string): Promise<V2JournalEntry | null> {
  const { data, error } = await supabase
    .from('v2_journal_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('entry_date', date)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data as V2JournalEntry | null
}

export async function getJournalEntriesForWeek(userId: string, weekNumber: number, year: number): Promise<V2JournalEntry[]> {
  // Calculate the monday of the given week
  const jan4 = new Date(year, 0, 4)
  const startOfYear = new Date(jan4)
  startOfYear.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const weekStart = new Date(startOfYear.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000)
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)

  const startStr = weekStart.toISOString().split('T')[0]
  const endStr = weekEnd.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('v2_journal_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('entry_date', startStr)
    .lte('entry_date', endStr)
    .order('entry_date', { ascending: true })
  if (error) throw error
  return (data || []) as V2JournalEntry[]
}

export async function upsertJournalEntry(userId: string, date: string, content: string): Promise<V2JournalEntry> {
  const { data, error } = await supabase
    .from('v2_journal_entries')
    .upsert(
      { user_id: userId, entry_date: date, content, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,entry_date' }
    )
    .select()
    .single()
  if (error) throw error
  return data as V2JournalEntry
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const { error } = await supabase.from('v2_journal_entries').delete().eq('id', id)
  if (error) throw error
}
