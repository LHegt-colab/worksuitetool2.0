import { supabase } from '@/lib/supabase'

export interface V2WorkLog {
  id: string
  user_id: string
  log_date: string        // yyyy-MM-dd
  start_time: string | null  // HH:mm
  end_time: string | null    // HH:mm
  break_minutes: number
  notes: string | null
  created_at: string
  updated_at: string
}

export async function getWorkLogs(
  userId: string,
  fromDate: string,
  toDate: string,
): Promise<V2WorkLog[]> {
  const { data, error } = await supabase
    .from('v2_work_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', fromDate)
    .lte('log_date', toDate)
    .order('log_date')
  if (error) throw error
  return (data || []) as V2WorkLog[]
}

export async function upsertWorkLog(
  userId: string,
  logDate: string,
  input: {
    start_time?: string | null
    end_time?: string | null
    break_minutes?: number
    notes?: string | null
  },
): Promise<V2WorkLog> {
  const { data, error } = await supabase
    .from('v2_work_logs')
    .upsert(
      {
        user_id: userId,
        log_date: logDate,
        ...input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,log_date' },
    )
    .select()
    .single()
  if (error) throw error
  return data as V2WorkLog
}

export async function deleteWorkLog(id: string): Promise<void> {
  const { error } = await supabase.from('v2_work_logs').delete().eq('id', id)
  if (error) throw error
}

/** Compute minutes worked from start/end time strings (HH:mm) minus break */
export function computeWorkedMinutes(
  start: string | null,
  end: string | null,
  breakMin: number,
): number {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const total = (eh * 60 + em) - (sh * 60 + sm)
  return Math.max(0, total - breakMin)
}

/** Norm minutes for a given ISO weekday (1=Mon..5=Fri, 6/7=0) */
export function normMinutes(isoWeekday: number): number {
  if (isoWeekday >= 1 && isoWeekday <= 4) return 540 // 9 hours
  if (isoWeekday === 5) return 240                    // 4 hours
  return 0
}

/** Format minutes as h:mm */
export function formatMinutes(min: number): string {
  const sign = min < 0 ? '-' : ''
  const abs  = Math.abs(min)
  const h    = Math.floor(abs / 60)
  const m    = abs % 60
  return `${sign}${h}:${String(m).padStart(2, '0')}`
}
