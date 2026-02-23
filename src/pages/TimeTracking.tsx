import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  format, startOfWeek, endOfWeek, addWeeks, subWeeks,
  addYears, subYears, startOfYear, endOfYear,
  eachDayOfInterval, getISODay, parseISO,
} from 'date-fns'
import { nl, enUS, sv } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Printer, CheckCircle2, Clock, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { PageSpinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import {
  getWorkLogs, upsertWorkLog,
  computeWorkedMinutes, normMinutes, formatMinutes,
  type V2WorkLog,
} from '@/features/worktime/api'
import { getOvertimeCarryOver, upsertOvertimeCarryOver } from '@/features/worktime/overtime-carry'

type ViewTab = 'week' | 'year'

const localeMap: Record<string, typeof nl> = { nl, en: enUS, sv }

const DAY_NAMES_NL = ['Ma', 'Di', 'Wo', 'Do', 'Vr']
const DAY_NAMES_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const DAY_NAMES_SV = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre']

function getDayNames(lang: string) {
  if (lang === 'en') return DAY_NAMES_EN
  if (lang === 'sv') return DAY_NAMES_SV
  return DAY_NAMES_NL
}

/* ─── Per-row input state ─────────────────────────────────────────── */
interface RowState {
  start: string
  end: string
  breakMin: string
  notes: string
  saving: boolean
  saved: boolean
}

function emptyRow(): RowState {
  return { start: '', end: '', breakMin: '0', notes: '', saving: false, saved: false }
}

function rowFromLog(log: V2WorkLog): RowState {
  return {
    start:    log.start_time?.slice(0, 5) ?? '',
    end:      log.end_time?.slice(0, 5)   ?? '',
    breakMin: String(log.break_minutes ?? 0),
    notes:    log.notes ?? '',
    saving:   false,
    saved:    false,
  }
}

/* ─── Balance colours ─────────────────────────────────────────────── */
function deltaColor(delta: number | null, isPast: boolean): string {
  if (delta === null) return isPast ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)]'
  if (delta > 0)  return 'text-green-600 dark:text-green-400'
  if (delta < 0)  return 'text-red-500 dark:text-red-400'
  return 'text-[var(--text-secondary)]'
}

export default function TimeTracking() {
  const { t, i18n } = useTranslation()
  const { user }    = useAuth()
  const locale      = localeMap[i18n.language] || nl

  const [tab,     setTab]     = useState<ViewTab>('week')
  const [weekRef, setWeekRef] = useState(new Date())
  const [yearRef, setYearRef] = useState(new Date())
  const [loading, setLoading] = useState(true)

  /* rows[dateStr] → RowState */
  const [rows, setRows] = useState<Record<string, RowState>>({})
  /* allLogs for year view */
  const [yearLogs, setYearLogs] = useState<V2WorkLog[]>([])

  /* overtime carry-over */
  const [carryOverMinutes, setCarryOverMinutes] = useState(0)
  const [carryOverInput,   setCarryOverInput]   = useState('')    // decimal hours string
  const [savingCarryOver,  setSavingCarryOver]  = useState(false)
  const [savedCarryOver,   setSavedCarryOver]   = useState(false)

  // ── Current week days (Mon–Fri) ──────────────────────────────────────────
  const weekStart = startOfWeek(weekRef, { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(weekRef,   { weekStartsOn: 1 })
  const weekDays  = eachDayOfInterval({ start: weekStart, end: weekEnd })
    .filter(d => getISODay(d) <= 5) // Mon–Fri

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // ── Load week logs ───────────────────────────────────────────────────────
  const loadWeek = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const from = format(weekStart, 'yyyy-MM-dd')
      const to   = format(weekEnd,   'yyyy-MM-dd')
      const logs = await getWorkLogs(user.id, from, to)
      const map: Record<string, RowState> = {}
      logs.forEach(l => { map[l.log_date] = rowFromLog(l) })
      setRows(map)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, weekRef])

  useEffect(() => { if (tab === 'week') loadWeek() }, [loadWeek, tab])

  // ── Load year logs ───────────────────────────────────────────────────────
  const loadYear = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const year = parseInt(format(yearRef, 'yyyy'))
      const from = format(startOfYear(yearRef), 'yyyy-MM-dd')
      const to   = format(endOfYear(yearRef),   'yyyy-MM-dd')
      const [logs, carryOver] = await Promise.all([
        getWorkLogs(user.id, from, to),
        getOvertimeCarryOver(year),
      ])
      setYearLogs(logs)
      const mins = carryOver?.minutes ?? 0
      setCarryOverMinutes(mins)
      setCarryOverInput(mins === 0 ? '' : String((mins / 60).toFixed(2)).replace(/\.?0+$/, ''))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user, yearRef])

  useEffect(() => { if (tab === 'year') loadYear() }, [loadYear, tab])

  // ── Save carry-over ──────────────────────────────────────────────────────
  async function saveCarryOver() {
    setSavingCarryOver(true)
    try {
      const hours   = parseFloat(carryOverInput || '0')
      const minutes = isNaN(hours) ? 0 : Math.round(hours * 60)
      await upsertOvertimeCarryOver(parseInt(format(yearRef, 'yyyy')), minutes)
      setCarryOverMinutes(minutes)
      setSavedCarryOver(true)
      setTimeout(() => setSavedCarryOver(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingCarryOver(false)
    }
  }

  // ── Auto-save debounce ───────────────────────────────────────────────────
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function updateRow(dateStr: string, patch: Partial<RowState>) {
    setRows(prev => ({ ...prev, [dateStr]: { ...(prev[dateStr] ?? emptyRow()), ...patch } }))
  }

  // Pass the latest row snapshot directly to avoid stale-closure over `rows` state
  function scheduleAutosave(dateStr: string, latestRow: RowState) {
    clearTimeout(saveTimers.current[dateStr])
    saveTimers.current[dateStr] = setTimeout(() => doSaveRow(dateStr, latestRow), 900)
  }

  async function doSaveRow(dateStr: string, r: RowState) {
    if (!user) return
    // Nothing to save if both start and end are empty
    if (!r.start && !r.end) return
    updateRow(dateStr, { saving: true, saved: false })
    try {
      await upsertWorkLog(user.id, dateStr, {
        start_time:    r.start || null,
        end_time:      r.end   || null,
        break_minutes: parseInt(r.breakMin) || 0,
        notes:         r.notes || null,
      })
      updateRow(dateStr, { saving: false, saved: true })
      setTimeout(() => updateRow(dateStr, { saved: false }), 2000)
    } catch {
      updateRow(dateStr, { saving: false })
    }
  }

  function handleChange(dateStr: string, field: keyof RowState, value: string) {
    // Build the updated row first, then pass it along so the timer never reads stale state
    const updated: RowState = { ...(rows[dateStr] ?? emptyRow()), [field]: value }
    setRows(prev => ({ ...prev, [dateStr]: updated }))
    scheduleAutosave(dateStr, updated)
  }

  // ── Calculations ─────────────────────────────────────────────────────────
  function workedForDate(dateStr: string): number {
    const r = rows[dateStr]
    if (!r) return 0
    return computeWorkedMinutes(r.start || null, r.end || null, parseInt(r.breakMin) || 0)
  }

  function deltaForDate(dateStr: string, isoDay: number): number | null {
    const r = rows[dateStr]
    if (!r || (!r.start && !r.end)) return null
    const worked = computeWorkedMinutes(r.start || null, r.end || null, parseInt(r.breakMin) || 0)
    return worked - normMinutes(isoDay)
  }

  const weekWorked     = weekDays.reduce((s, d) => s + workedForDate(format(d, 'yyyy-MM-dd')), 0)
  const weekNorm       = weekDays.reduce((s, d) => s + normMinutes(getISODay(d)), 0)
  const weekDelta      = weekWorked - weekNorm
  const weekHasEntries = weekDays.some(d => {
    const r = rows[format(d, 'yyyy-MM-dd')]
    return r && (r.start || r.end)
  })

  // ── Year overview calculations ────────────────────────────────────────────
  const yearByWeek = (() => {
    const logMap: Record<string, V2WorkLog> = {}
    yearLogs.forEach(l => { logMap[l.log_date] = l })

    // Group all working days of the year into ISO weeks
    const allDays = eachDayOfInterval({
      start: startOfYear(yearRef),
      end:   endOfYear(yearRef),
    }).filter(d => getISODay(d) <= 5)

    const weeks: { weekNum: string; days: { date: string; worked: number; norm: number }[] }[] = []
    const weekMap: Record<string, typeof weeks[0]> = {}

    allDays.forEach(d => {
      const ds  = format(d, 'yyyy-MM-dd')
      const wk  = format(d, 'RRRR-II', { locale })   // ISO year-week
      const log = logMap[ds]
      const worked = log ? computeWorkedMinutes(log.start_time, log.end_time, log.break_minutes) : 0
      const norm   = normMinutes(getISODay(d))

      if (!weekMap[wk]) {
        weekMap[wk] = { weekNum: format(d, 'II', { locale }), days: [] }
        weeks.push(weekMap[wk])
      }
      weekMap[wk].days.push({ date: ds, worked, norm })
    })

    return weeks.map(w => {
      const totalWorked = w.days.reduce((s, d) => s + d.worked, 0)
      const totalNorm   = w.days.reduce((s, d) => s + d.norm, 0)
      const hasEntries  = w.days.some(d => d.worked > 0)
      const delta       = hasEntries ? totalWorked - totalNorm : null
      return { ...w, totalWorked, totalNorm, delta, hasEntries }
    })
  })()

  // Cumulative balance per week (carry-over minutes added as starting point)
  const cumulativeByWeek = yearByWeek.map((_, i) => {
    return carryOverMinutes + yearByWeek.slice(0, i + 1).reduce((s, w) => s + (w.delta ?? 0), 0)
  })

  const totalWorked = yearByWeek.reduce((s, w) => s + w.totalWorked, 0)
  const totalNorm   = yearByWeek.filter(w => w.hasEntries || w.days.some(d => d.date <= todayStr)).reduce((s, w) => s + w.totalNorm, 0)

  // Chart dimensions
  const CHART_W = 640
  const CHART_H = 120
  const BAR_W   = Math.max(4, Math.floor(CHART_W / yearByWeek.length) - 2)
  const maxDelta = Math.max(60, ...yearByWeek.map(w => Math.abs(w.delta ?? 0)))

  const dayNames = getDayNames(i18n.language)

  // ── Print ─────────────────────────────────────────────────────────────────
  function handlePrint() { window.print() }

  if (loading) return <PageSpinner />

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{t('timeTracking.title')}</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{t('timeTracking.normsInfo')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-xs font-medium">
              {(['week', 'year'] as ViewTab[]).map(v => (
                <button
                  key={v}
                  onClick={() => setTab(v)}
                  className={cn(
                    'px-3 py-1.5 transition-colors',
                    tab === v ? 'bg-primary-500 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]',
                  )}
                >
                  {t(`timeTracking.${v}View`)}
                </button>
              ))}
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors print:hidden"
            >
              <Printer className="h-3.5 w-3.5" />
              {t('timeTracking.print')}
            </button>
          </div>
        </div>

        {/* ── WEEK VIEW ────────────────────────────────────────────────────── */}
        {tab === 'week' && (
          <>
            {/* Week navigation */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setWeekRef(d => subWeeks(d, 1))}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-[var(--text-primary)] min-w-[200px] text-center">
                {format(weekStart, 'EEEE d MMM', { locale })} – {format(weekEnd, 'd MMM yyyy', { locale })}
              </span>
              <button
                onClick={() => setWeekRef(d => addWeeks(d, 1))}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setWeekRef(new Date())}
                className="ml-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] hover:bg-primary-50 text-primary-600 dark:text-primary-400 font-medium transition-colors"
              >
                {t('common.today')}
              </button>
            </div>

            {/* Week table */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
              {/* Header */}
              <div className="grid grid-cols-[100px_1fr_1fr_90px_90px_80px_32px] gap-0 border-b border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                <div>{t('common.date')}</div>
                <div>{t('timeTracking.startTime')}</div>
                <div>{t('timeTracking.endTime')}</div>
                <div>{t('timeTracking.breakMin')}</div>
                <div>{t('timeTracking.worked')}</div>
                <div>{t('timeTracking.balance')}</div>
                <div />
              </div>

              {weekDays.map((day, idx) => {
                const ds      = format(day, 'yyyy-MM-dd')
                const isoDay  = getISODay(day)
                const isToday = ds === todayStr
                const isPast  = ds < todayStr
                const r       = rows[ds] ?? emptyRow()
                const worked  = workedForDate(ds)
                const delta   = deltaForDate(ds, isoDay)
                const norm    = normMinutes(isoDay)

                return (
                  <div
                    key={ds}
                    className={cn(
                      'grid grid-cols-[100px_1fr_1fr_90px_90px_80px_32px] gap-0 px-4 py-2 items-center border-b border-[var(--border)] last:border-0',
                      isToday && 'bg-primary-50/50 dark:bg-primary-900/10',
                      idx % 2 === 0 && !isToday && 'bg-[var(--bg-card)]',
                    )}
                  >
                    {/* Day label */}
                    <div>
                      <span className={cn('text-sm font-semibold', isToday ? 'text-primary-600 dark:text-primary-400' : 'text-[var(--text-primary)]')}>
                        {dayNames[idx]}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] ml-1.5">
                        {format(day, 'd MMM', { locale })}
                      </span>
                    </div>

                    {/* Start time */}
                    <input
                      type="time"
                      value={r.start}
                      onChange={e => handleChange(ds, 'start', e.target.value)}
                      className="w-28 text-sm px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    />

                    {/* End time */}
                    <input
                      type="time"
                      value={r.end}
                      onChange={e => handleChange(ds, 'end', e.target.value)}
                      className="w-28 text-sm px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    />

                    {/* Break */}
                    <input
                      type="number"
                      min={0}
                      max={480}
                      value={r.breakMin}
                      onChange={e => handleChange(ds, 'breakMin', e.target.value)}
                      className="w-20 text-sm px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    />

                    {/* Worked */}
                    <div className="text-sm text-[var(--text-primary)] font-mono">
                      {worked > 0 ? formatMinutes(worked) : (
                        <span className="text-[var(--text-muted)] text-xs">
                          {normMinutes(isoDay) > 0 ? `${norm / 60}:00` : '—'}
                        </span>
                      )}
                    </div>

                    {/* Delta */}
                    <div className={cn('text-sm font-mono font-semibold', deltaColor(delta, isPast))}>
                      {delta !== null
                        ? (delta > 0 ? '+' : '') + formatMinutes(delta)
                        : isPast && normMinutes(isoDay) > 0
                          ? <span className="text-xs font-normal text-red-400">—</span>
                          : <span className="text-xs text-[var(--text-muted)]">—</span>
                      }
                    </div>

                    {/* Save indicator */}
                    <div className="flex justify-center">
                      {r.saving && <Clock className="h-3.5 w-3.5 text-[var(--text-muted)] animate-pulse" />}
                      {r.saved  && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                    </div>
                  </div>
                )
              })}

              {/* Week totals row */}
              <div className="grid grid-cols-[100px_1fr_1fr_90px_90px_80px_32px] gap-0 px-4 py-3 bg-[var(--bg-page)] border-t-2 border-[var(--border)]">
                <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide col-span-4">
                  {t('timeTracking.weekBalance')}
                </div>
                <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                  {weekHasEntries ? formatMinutes(weekWorked) : '—'}
                </div>
                <div className={cn('text-sm font-mono font-bold', weekHasEntries ? deltaColor(weekDelta, true) : 'text-[var(--text-muted)]')}>
                  {weekHasEntries
                    ? (weekDelta > 0 ? '+' : '') + formatMinutes(weekDelta)
                    : '—'
                  }
                </div>
                <div />
              </div>
            </div>

            {/* Notes row per day (collapsible) */}
            <div className="mt-4 space-y-2">
              {weekDays.filter(d => {
                const ds = format(d, 'yyyy-MM-dd')
                return rows[ds]?.notes
              }).map((day, idx) => {
                const ds = format(day, 'yyyy-MM-dd')
                const r  = rows[ds]
                return (
                  <div key={ds} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="font-medium shrink-0 w-12">{dayNames[idx]}</span>
                    <span>{r?.notes}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── YEAR VIEW ────────────────────────────────────────────────────── */}
        {tab === 'year' && (
          <>
            {/* Year navigation */}
            <div className="flex items-center gap-2 mb-5">
              <button
                onClick={() => setYearRef(d => subYears(d, 1))}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-[var(--text-primary)] min-w-[80px] text-center">
                {format(yearRef, 'yyyy')}
              </span>
              <button
                onClick={() => setYearRef(d => addYears(d, 1))}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setYearRef(new Date())}
                className="ml-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] hover:bg-primary-50 text-primary-600 dark:text-primary-400 font-medium transition-colors"
              >
                {t('common.today')}
              </button>
            </div>

            {/* Carry-over input card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 shadow-sm mb-4">
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{t('timeTracking.carryOver')}</p>
              <p className="text-xs text-[var(--text-muted)] mb-3">{t('timeTracking.carryOverHint')}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.25"
                    placeholder="0"
                    value={carryOverInput}
                    onChange={e => setCarryOverInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveCarryOver() }}
                    className="w-28 text-sm px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono"
                  />
                  <span className="text-sm text-[var(--text-muted)]">{t('timeTracking.hours')}</span>
                </div>
                {carryOverInput && !isNaN(parseFloat(carryOverInput)) && (
                  <span className="text-xs text-[var(--text-secondary)] font-mono bg-[var(--bg-page)] border border-[var(--border)] rounded px-2 py-1">
                    = {(() => { const m = Math.round(parseFloat(carryOverInput) * 60); return (m >= 0 ? '+' : '') + formatMinutes(m) })()}
                  </span>
                )}
                <button
                  onClick={saveCarryOver}
                  disabled={savingCarryOver}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-50"
                >
                  {savingCarryOver
                    ? <Clock className="h-3.5 w-3.5 animate-pulse" />
                    : savedCarryOver
                    ? <CheckCircle2 className="h-3.5 w-3.5" />
                    : <Save className="h-3.5 w-3.5" />
                  }
                  {savedCarryOver ? t('common.saved') : t('common.save')}
                </button>
                {carryOverMinutes !== 0 && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {t('timeTracking.carryOverCurrent')}: <span className={cn('font-mono font-semibold', carryOverMinutes >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
                      {(carryOverMinutes >= 0 ? '+' : '') + formatMinutes(carryOverMinutes)}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: t('timeTracking.totalWorked'), value: formatMinutes(totalWorked), color: 'text-primary-600 dark:text-primary-400' },
                { label: t('timeTracking.yearBalance'), value: (cumulativeByWeek[cumulativeByWeek.length - 1] ?? 0) >= 0 ? '+' + formatMinutes(cumulativeByWeek[cumulativeByWeek.length - 1] ?? 0) : formatMinutes(cumulativeByWeek[cumulativeByWeek.length - 1] ?? 0), color: (cumulativeByWeek[cumulativeByWeek.length - 1] ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500' },
                { label: t('timeTracking.weekBalance'), value: `${yearByWeek.filter(w => w.hasEntries).length} / ${yearByWeek.length}`, color: 'text-[var(--text-primary)]' },
                { label: t('common.overdue'), value: String(yearByWeek.filter(w => w.delta !== null && w.delta < 0).length), color: 'text-amber-600 dark:text-amber-400' },
              ].map(card => (
                <div key={card.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 shadow-sm">
                  <p className="text-xs text-[var(--text-muted)] mb-1">{card.label}</p>
                  <p className={cn('text-xl font-bold font-mono', card.color)}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Weekly balance chart (SVG) */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm mb-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{t('timeTracking.yearChartTitle')}</h3>
              <div className="overflow-x-auto">
                <svg width={CHART_W} height={CHART_H + 24} viewBox={`0 0 ${CHART_W} ${CHART_H + 24}`} className="min-w-full">
                  {/* Zero line */}
                  <line x1={0} y1={CHART_H / 2} x2={CHART_W} y2={CHART_H / 2} stroke="currentColor" strokeWidth={1} className="text-[var(--border)]" />
                  {yearByWeek.map((w, i) => {
                    if (!w.hasEntries) return null
                    const delta  = w.delta ?? 0
                    const bh     = Math.max(2, Math.abs(delta) / maxDelta * (CHART_H / 2 - 4))
                    const x      = i * (BAR_W + 2) + 1
                    const y      = delta >= 0 ? CHART_H / 2 - bh : CHART_H / 2
                    const fill   = delta >= 0 ? '#22c55e' : '#ef4444'
                    return (
                      <g key={i}>
                        <rect x={x} y={y} width={BAR_W} height={bh} fill={fill} opacity={0.7} rx={1} />
                        <title>W{w.weekNum}: {delta >= 0 ? '+' : ''}{formatMinutes(delta)}</title>
                      </g>
                    )
                  })}
                  {/* Week number labels (every 4th) */}
                  {yearByWeek.map((w, i) => {
                    if (i % 4 !== 0) return null
                    return (
                      <text key={i} x={i * (BAR_W + 2) + BAR_W / 2} y={CHART_H + 16} textAnchor="middle" fontSize={9} className="fill-[var(--text-muted)]">
                        {w.weekNum}
                      </text>
                    )
                  })}
                </svg>
              </div>
              <div className="flex gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> {t('timeTracking.over')}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> {t('timeTracking.under')}
                </span>
              </div>
            </div>

            {/* Week table */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr] gap-0 border-b border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                <div>Wk</div>
                <div>{t('timeTracking.worked')}</div>
                <div>{t('timeTracking.norm')}</div>
                <div>{t('timeTracking.balance')}</div>
                <div>{t('timeTracking.cumulative')}</div>
              </div>
              <div className="max-h-[400px] overflow-y-auto divide-y divide-[var(--border)]">
                {yearByWeek.map((w, i) => {
                  const cumul  = cumulativeByWeek[i] ?? 0
                  const isCurrentWeek = w.days.some(d => d.date === todayStr)
                  return (
                    <div
                      key={i}
                      className={cn(
                        'grid grid-cols-[60px_1fr_1fr_1fr_1fr] gap-0 px-4 py-1.5 text-sm items-center',
                        isCurrentWeek && 'bg-primary-50/50 dark:bg-primary-900/10',
                        !w.hasEntries && 'opacity-50',
                      )}
                    >
                      <div className="font-medium text-[var(--text-muted)] text-xs">W{w.weekNum}</div>
                      <div className="font-mono text-[var(--text-primary)]">
                        {w.hasEntries ? formatMinutes(w.totalWorked) : '—'}
                      </div>
                      <div className="font-mono text-[var(--text-secondary)]">
                        {formatMinutes(w.totalNorm)}
                      </div>
                      <div className={cn('font-mono font-semibold', deltaColor(w.delta, true))}>
                        {w.delta !== null
                          ? (w.delta >= 0 ? '+' : '') + formatMinutes(w.delta)
                          : '—'}
                      </div>
                      <div className={cn('font-mono text-xs', deltaColor(cumul, true))}>
                        {w.hasEntries ? (cumul >= 0 ? '+' : '') + formatMinutes(cumul) : '—'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Print styles ─────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
