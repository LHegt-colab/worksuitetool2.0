import { supabase } from '@/lib/supabase'
import type { V2LeaveBalance, V2LeaveEntry } from '@/types/database.types'

// ─── Leave Balance ────────────────────────────────────────────────────────────

/** Fetch the leave balance for a given year (returns null if not set yet). */
export async function getLeaveBalance(year: number): Promise<V2LeaveBalance | null> {
  const { data, error } = await supabase
    .from('v2_leave_balances')
    .select('*')
    .eq('year', year)
    .maybeSingle()

  if (error) throw error
  return data
}

/** Upsert the leave balance for a given year. */
export async function upsertLeaveBalance(
  year: number,
  input: {
    base_days?: number
    purchased_days?: number
    carry_over_hours?: number
    manual_adjustment_hours?: number
    hours_per_day?: number
    notes?: string | null
  },
): Promise<V2LeaveBalance> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('v2_leave_balances')
    .upsert(
      {
        user_id: user.id,
        year,
        ...input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,year' },
    )
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Leave Entries ────────────────────────────────────────────────────────────

/** Fetch all leave entries for a given year. */
export async function getLeaveEntries(year: number): Promise<V2LeaveEntry[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('v2_leave_entries')
    .select('*')
    .eq('user_id', user.id)
    .gte('entry_date', `${year}-01-01`)
    .lte('entry_date', `${year}-12-31`)
    .order('entry_date')

  if (error) throw error
  return (data ?? []) as V2LeaveEntry[]
}

/** Create a new leave entry. */
export async function createLeaveEntry(input: {
  entry_date: string
  hours: number
  description?: string | null
}): Promise<V2LeaveEntry> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('v2_leave_entries')
    .insert({ user_id: user.id, ...input })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Update an existing leave entry. */
export async function updateLeaveEntry(
  id: string,
  input: {
    entry_date?: string
    hours?: number
    description?: string | null
  },
): Promise<V2LeaveEntry> {
  const { data, error } = await supabase
    .from('v2_leave_entries')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/** Delete a leave entry. */
export async function deleteLeaveEntry(id: string): Promise<void> {
  const { error } = await supabase.from('v2_leave_entries').delete().eq('id', id)
  if (error) throw error
}

// ─── Calculations ─────────────────────────────────────────────────────────────

export interface LeaveStats {
  /** Total entitlement in hours */
  totalEntitlementHours: number
  /** Hours actually taken */
  takenHours: number
  /** Remaining hours */
  remainingHours: number
  /** Total entitlement in days (based on hours_per_day) */
  totalEntitlementDays: number
  /** Days taken */
  takenDays: number
  /** Days remaining */
  remainingDays: number
}

export function computeLeaveStats(
  balance: V2LeaveBalance | null,
  entries: V2LeaveEntry[],
): LeaveStats {
  const hoursPerDay          = balance?.hours_per_day           ?? 8
  const baseDays             = balance?.base_days               ?? 25
  const purchasedDays        = balance?.purchased_days          ?? 0
  const carryOverHours       = balance?.carry_over_hours        ?? 0
  const manualAdjHours       = balance?.manual_adjustment_hours ?? 0

  const totalEntitlementDays  = baseDays + purchasedDays
  const totalEntitlementHours = totalEntitlementDays * hoursPerDay + carryOverHours + manualAdjHours

  const takenHours  = entries.reduce((s, e) => s + (e.hours ?? 0), 0)
  const takenDays   = takenHours / hoursPerDay

  const remainingHours = totalEntitlementHours - takenHours
  const remainingDays  = remainingHours / hoursPerDay

  return {
    totalEntitlementHours,
    takenHours,
    remainingHours,
    totalEntitlementDays,
    takenDays,
    remainingDays,
  }
}
