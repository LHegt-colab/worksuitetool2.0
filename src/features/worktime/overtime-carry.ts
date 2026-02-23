import { supabase } from '@/lib/supabase'
import type { V2OvertimeCarryOver } from '@/types/database.types'

/** Fetch the carry-over record for a given year (returns null if not set). */
export async function getOvertimeCarryOver(year: number): Promise<V2OvertimeCarryOver | null> {
  const { data, error } = await supabase
    .from('v2_overtime_carry_over')
    .select('*')
    .eq('year', year)
    .maybeSingle()

  if (error) throw error
  return data
}

/** Upsert (create or update) the carry-over for a given year. */
export async function upsertOvertimeCarryOver(
  year: number,
  minutes: number,
  notes?: string | null,
): Promise<V2OvertimeCarryOver> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('v2_overtime_carry_over')
    .upsert(
      { user_id: user.id, year, minutes, notes: notes ?? null, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,year' },
    )
    .select()
    .single()

  if (error) throw error
  return data
}
