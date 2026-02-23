import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  format, startOfWeek, endOfWeek, addDays, subDays,
  addWeeks, subWeeks, addMonths, subMonths, addYears, subYears,
  startOfMonth, endOfMonth, isSameMonth, isSameDay,
  startOfYear, endOfYear, eachMonthOfInterval,
} from 'date-fns'
import { nl, enUS, sv } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Users, CheckSquare, Pencil, Trash2, Clock, MapPin, Check, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import { TagBadge } from '@/components/ui/Badge'
import { getMeetings, createMeeting, deleteMeeting } from '@/features/meetings/api'
import { getActions, createAction, deleteAction, markActionDone } from '@/features/actions/api'
import type { V2Meeting, V2Action } from '@/types/database.types'
import { cn, formatDate, priorityBgColor, statusBgColor } from '@/lib/utils'

type AgendaView = 'day' | 'week' | 'month' | 'year'

/** px per 30-minute slot; 1 hour = 2 * SLOT_H = 64px */
const SLOT_H = 32
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const localeMap: Record<string, typeof nl> = { nl, en: enUS, sv }

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}
function minToTop(min: number): number {
  return (min / 30) * SLOT_H
}
function priorityColor(p: string): string {
  switch (p) {
    case 'urgent': return 'bg-red-500'
    case 'high':   return 'bg-orange-500'
    case 'medium': return 'bg-yellow-400'
    default:       return 'bg-green-500'
  }
}

/** Small colored dots showing the tag colors on a calendar event pill */
function TagDots({ tags, max = 3, dotSize = 7 }: {
  tags?: Array<{ id: string; name: string; color: string }>
  max?: number
  dotSize?: number
}) {
  if (!tags || tags.length === 0) return null
  return (
    <span className="flex gap-0.5 shrink-0">
      {tags.slice(0, max).map(tag => (
        <span
          key={tag.id}
          className="rounded-full shrink-0"
          style={{ backgroundColor: tag.color, width: dotSize, height: dotSize }}
          title={tag.name}
        />
      ))}
    </span>
  )
}

export default function Agenda() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const locale = localeMap[i18n.language] || nl

  const [view, setView]         = useState<AgendaView>('week')
  const [current, setCurrent]   = useState(new Date())
  const [meetings, setMeetings] = useState<V2Meeting[]>([])
  const [actions, setActions]   = useState<V2Action[]>([])
  const [loading, setLoading]   = useState(true)
  const [selDay, setSelDay]     = useState<Date | null>(null) // month-view detail

  // Quick-create modal state
  const [qcOpen,     setQcOpen]     = useState(false)
  const [qcDate,     setQcDate]     = useState('')
  const [qcTime,     setQcTime]     = useState('')
  const [qcType,     setQcType]     = useState<'meeting' | 'action'>('meeting')
  const [qcTitle,    setQcTitle]    = useState('')
  const [qcPriority, setQcPriority] = useState('medium')
  const [qcSaving,   setQcSaving]   = useState(false)

  // Event detail modal
  const [evtOpen,    setEvtOpen]    = useState(false)
  const [evtType,    setEvtType]    = useState<'meeting' | 'action'>('meeting')
  const [evtMeeting, setEvtMeeting] = useState<V2Meeting | null>(null)
  const [evtAction,  setEvtAction]  = useState<V2Action | null>(null)
  const [evtDeleteConfirm, setEvtDeleteConfirm] = useState(false)
  const [evtDeleting,      setEvtDeleting]      = useState(false)
  const [evtMarkingDone,   setEvtMarkingDone]   = useState(false)

  const navigate  = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Data loading ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [m, a] = await Promise.all([getMeetings(user.id), getActions(user.id)])
      setMeetings(m)
      setActions(a)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  // ── Auto-scroll to current time when entering day/week view ──────────────
  useEffect(() => {
    if ((view === 'day' || view === 'week') && scrollRef.current) {
      const now = new Date()
      const topPx = minToTop(now.getHours() * 60 + now.getMinutes()) - 160
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, topPx)
      }, 60)
    }
  }, [view])

  // ── Navigation ────────────────────────────────────────────────────────────
  function prev() {
    if (view === 'day')   setCurrent(d => subDays(d, 1))
    else if (view === 'week')  setCurrent(d => subWeeks(d, 1))
    else if (view === 'month') setCurrent(d => subMonths(d, 1))
    else                       setCurrent(d => subYears(d, 1))
  }
  function next() {
    if (view === 'day')   setCurrent(d => addDays(d, 1))
    else if (view === 'week')  setCurrent(d => addWeeks(d, 1))
    else if (view === 'month') setCurrent(d => addMonths(d, 1))
    else                       setCurrent(d => addYears(d, 1))
  }
  function goToday() { setCurrent(new Date()) }

  // ── Header title ──────────────────────────────────────────────────────────
  function headerTitle(): string {
    if (view === 'day')   return format(current, 'EEEE d MMMM yyyy', { locale })
    if (view === 'week') {
      const ws = startOfWeek(current, { weekStartsOn: 1 })
      const we = endOfWeek(current, { weekStartsOn: 1 })
      return `${format(ws, 'd MMM', { locale })} – ${format(we, 'd MMM yyyy', { locale })}`
    }
    if (view === 'month') return format(current, 'MMMM yyyy', { locale })
    return format(current, 'yyyy')
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const now     = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const nowTop   = minToTop(now.getHours() * 60 + now.getMinutes())

  function meetingsOn(date: Date): V2Meeting[] {
    const ds = format(date, 'yyyy-MM-dd')
    return meetings.filter(m => m.date === ds)
  }
  function actionsOn(date: Date): V2Action[] {
    const ds = format(date, 'yyyy-MM-dd')
    return actions.filter(a =>
      (a.start_date === ds || a.due_date === ds) &&
      a.status !== 'done' && a.status !== 'cancelled',
    )
  }

  // ── Quick-create ──────────────────────────────────────────────────────────
  function openQC(date: Date, hour: number, half = false) {
    setQcDate(format(date, 'yyyy-MM-dd'))
    setQcTime(`${String(hour).padStart(2, '0')}:${half ? '30' : '00'}`)
    setQcTitle('')
    setQcType('meeting')
    setQcPriority('medium')
    setQcOpen(true)
  }

  async function saveQC() {
    if (!user || !qcTitle.trim()) return
    setQcSaving(true)
    try {
      if (qcType === 'meeting') {
        await createMeeting({
          user_id: user.id,
          title: qcTitle.trim(),
          date: qcDate,
          start_time: qcTime || null,
          end_time: null,
          location: null,
          participants: null,
          notes: null,
        })
      } else {
        await createAction({
          user_id: user.id,
          title: qcTitle.trim(),
          status: 'open',
          priority: qcPriority,
          start_date: qcDate,
          due_date: qcDate,
        })
      }
      setQcOpen(false)
      load()
    } finally {
      setQcSaving(false)
    }
  }

  // ── Event detail handlers ─────────────────────────────────────────────────
  function openMeeting(m: V2Meeting, e: React.MouseEvent) {
    e.stopPropagation()
    setEvtType('meeting')
    setEvtMeeting(m)
    setEvtAction(null)
    setEvtOpen(true)
  }

  function openAction(a: V2Action, e: React.MouseEvent) {
    e.stopPropagation()
    setEvtType('action')
    setEvtAction(a)
    setEvtMeeting(null)
    setEvtOpen(true)
  }

  async function handleEvtDelete() {
    setEvtDeleting(true)
    try {
      if (evtType === 'meeting' && evtMeeting) {
        await deleteMeeting(evtMeeting.id)
      } else if (evtType === 'action' && evtAction) {
        await deleteAction(evtAction.id)
      }
      setEvtOpen(false)
      setEvtDeleteConfirm(false)
      load()
    } finally {
      setEvtDeleting(false)
    }
  }

  async function handleEvtMarkDone() {
    if (!evtAction) return
    setEvtMarkingDone(true)
    try {
      await markActionDone(evtAction.id)
      setEvtOpen(false)
      load()
    } finally {
      setEvtMarkingDone(false)
    }
  }

  if (loading) return <PageSpinner />

  // ── Week days for week view ───────────────────────────────────────────────
  const weekStart = startOfWeek(current, { weekStartsOn: 1 })
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // ── Shared time-column (renders hour labels + grid lines) ─────────────────
  // Used by both day and week views. The caller is responsible for the
  // scrollable wrapper that contains both this label column and the day columns.

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)] shrink-0 flex-wrap">
        {/* View tabs */}
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-xs font-medium">
          {(['day', 'week', 'month', 'year'] as AgendaView[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1.5 transition-colors',
                view === v
                  ? 'bg-primary-500 text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]',
              )}
            >
              {t(`agenda.${v}View`)}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={prev}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-[var(--text-primary)] min-w-52 text-center select-none">
            {headerTitle()}
          </span>
          <button
            onClick={next}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <Button variant="secondary" size="sm" onClick={goToday} icon={<Calendar className="h-4 w-4" />}>
          {t('common.today')}
        </Button>
      </div>

      {/* ── Legend + hint ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] px-4 py-1.5 border-b border-[var(--border)] shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 opacity-90 border border-blue-600" />
          {t('agenda.meetings')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 opacity-80" />
          {t('agenda.actions')}
        </span>
        {(view === 'day' || view === 'week') && (
          <span className="ml-auto text-[var(--text-muted)] italic hidden sm:inline">
            {t('agenda.doubleClickHint')}
          </span>
        )}
      </div>

      {/* ── View content ────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* ════════════════ DAY VIEW ════════════════ */}
        {view === 'day' && (
          <div className="flex flex-col h-full">
            {/* Day header: name + all-day actions */}
            <div className="flex items-start gap-3 px-4 py-2 border-b border-[var(--border)] shrink-0">
              <div className={cn(
                'text-sm font-semibold shrink-0',
                isSameDay(current, now) && 'text-primary-500',
              )}>
                {format(current, 'EEEE d MMMM', { locale })}
              </div>
              <div className="flex flex-wrap gap-1 min-w-0">
                {actionsOn(current).map(a => (
                  <div
                    key={a.id}
                    onClick={e => openAction(a, e)}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', priorityColor(a.priority))} />
                    <span className="truncate max-w-32">{a.title}</span>
                    <TagDots tags={a.tags} max={3} dotSize={10} />
                  </div>
                ))}
              </div>
            </div>

            {/* Time grid */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="relative flex" style={{ height: SLOT_H * 48 }}>
                {/* Hour labels */}
                <div className="w-14 shrink-0 relative select-none">
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className="absolute right-2 text-xs text-[var(--text-muted)]"
                      style={{ top: minToTop(h * 60) - 6 }}
                    >
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                {/* Single day column */}
                <div
                  className={cn(
                    'flex-1 relative border-l border-[var(--border)]',
                    isSameDay(current, now) && 'bg-primary-50/20 dark:bg-primary-900/5',
                  )}
                >
                  {/* Hour lines */}
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-[var(--border)] pointer-events-none"
                      style={{ top: minToTop(h * 60) }}
                    />
                  ))}
                  {HOURS.map(h => (
                    <div
                      key={`half${h}`}
                      className="absolute left-0 right-0 border-t border-[var(--border)] opacity-30 pointer-events-none"
                      style={{ top: minToTop(h * 60 + 30) }}
                    />
                  ))}

                  {/* Clickable 30-min slots */}
                  {HOURS.map(h => (
                    <div
                      key={`slot${h}`}
                      className="absolute left-0 right-0"
                      style={{ top: minToTop(h * 60), height: SLOT_H * 2 }}
                    >
                      <div
                        className="h-1/2 hover:bg-primary-50 dark:hover:bg-primary-900/15 cursor-pointer transition-colors"
                        onDoubleClick={() => openQC(current, h, false)}
                      />
                      <div
                        className="h-1/2 hover:bg-primary-50 dark:hover:bg-primary-900/15 cursor-pointer transition-colors"
                        onDoubleClick={() => openQC(current, h, true)}
                      />
                    </div>
                  ))}

                  {/* Current time line */}
                  {isSameDay(current, now) && (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none"
                      style={{ top: nowTop }}
                    >
                      <div className="flex items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 -ml-1.5" />
                        <div className="flex-1 border-t-2 border-red-500" />
                      </div>
                    </div>
                  )}

                  {/* Meeting events */}
                  {meetingsOn(current).map(m => {
                    if (!m.start_time) return null
                    const top = minToTop(timeToMin(m.start_time))
                    const ht  = m.end_time
                      ? Math.max(SLOT_H, minToTop(timeToMin(m.end_time)) - top)
                      : SLOT_H * 2
                    return (
                      <div
                        key={m.id}
                        onClick={e => openMeeting(m, e)}
                        onDoubleClick={e => e.stopPropagation()}
                        className="absolute left-2 right-2 z-10 rounded-md px-2 py-1 bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 overflow-hidden cursor-pointer hover:brightness-95 transition-all"
                        style={{ top, height: ht }}
                        title={m.title}
                      >
                        <div className="flex items-start gap-1">
                          <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 leading-tight truncate flex-1">
                            {m.title}
                          </p>
                          <TagDots tags={m.tags} max={3} dotSize={11} />
                        </div>
                        {ht > SLOT_H && m.location && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 truncate">{m.location}</p>
                        )}
                        <p className="text-xs text-blue-500 dark:text-blue-400">
                          {m.start_time.slice(0, 5)}{m.end_time && ` – ${m.end_time.slice(0, 5)}`}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ WEEK VIEW ════════════════ */}
        {view === 'week' && (
          <div className="flex flex-col h-full">
            {/* Week header: day names + all-day actions */}
            <div className="flex border-b border-[var(--border)] shrink-0">
              <div className="w-14 shrink-0" /> {/* gutter */}
              {weekDays.map(day => {
                const isToday   = isSameDay(day, now)
                const dayActions = actionsOn(day)
                return (
                  <div
                    key={format(day, 'yyyy-MM-dd')}
                    className="flex-1 min-w-0 border-l border-[var(--border)] px-1 py-1.5"
                    onDoubleClick={() => openQC(day, 9)}
                  >
                    <div className="text-center">
                      <div className={cn(
                        'text-xs font-medium uppercase tracking-wide',
                        isToday ? 'text-primary-500' : 'text-[var(--text-muted)]',
                      )}>
                        {format(day, 'EEE', { locale })}
                      </div>
                      <div className={cn(
                        'w-6 h-6 mx-auto flex items-center justify-center rounded-full text-sm font-semibold',
                        isToday ? 'bg-primary-500 text-white' : 'text-[var(--text-primary)]',
                      )}>
                        {format(day, 'd')}
                      </div>
                    </div>
                    {dayActions.length > 0 && (
                      <div className="mt-0.5 space-y-0.5 px-0.5">
                        {dayActions.slice(0, 2).map(a => (
                          <div
                            key={a.id}
                            onClick={e => openAction(a, e)}
                            className="text-xs flex items-center gap-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded px-1 py-0.5 overflow-hidden cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', priorityColor(a.priority))} />
                            <span className="truncate flex-1">{a.title}</span>
                            <TagDots tags={a.tags} max={2} dotSize={9} />
                          </div>
                        ))}
                        {dayActions.length > 2 && (
                          <div className="text-xs text-[var(--text-muted)] pl-1">+{dayActions.length - 2}</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Time grid */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="relative flex" style={{ height: SLOT_H * 48 }}>
                {/* Hour labels */}
                <div className="w-14 shrink-0 relative select-none">
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className="absolute right-2 text-xs text-[var(--text-muted)]"
                      style={{ top: minToTop(h * 60) - 6 }}
                    >
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                {/* Horizontal grid lines (span all columns) */}
                <div className="absolute pointer-events-none" style={{ left: 56, right: 0, top: 0, bottom: 0 }}>
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-[var(--border)]"
                      style={{ top: minToTop(h * 60) }}
                    />
                  ))}
                  {HOURS.map(h => (
                    <div
                      key={`half${h}`}
                      className="absolute left-0 right-0 border-t border-[var(--border)] opacity-30"
                      style={{ top: minToTop(h * 60 + 30) }}
                    />
                  ))}
                </div>

                {/* Current time line */}
                {weekDays.some(d => isSameDay(d, now)) && (
                  <div
                    className="absolute z-20 pointer-events-none"
                    style={{ left: 56, right: 0, top: nowTop }}
                  >
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 -ml-1.5" />
                      <div className="flex-1 border-t-2 border-red-500" />
                    </div>
                  </div>
                )}

                {/* Day columns */}
                {weekDays.map(day => {
                  const dayMeetings = meetingsOn(day)
                  const isToday     = isSameDay(day, now)
                  return (
                    <div
                      key={format(day, 'yyyy-MM-dd')}
                      className={cn(
                        'flex-1 relative border-l border-[var(--border)]',
                        isToday && 'bg-primary-50/20 dark:bg-primary-900/5',
                      )}
                    >
                      {/* Clickable 30-min slots */}
                      {HOURS.map(h => (
                        <div
                          key={h}
                          className="absolute left-0 right-0"
                          style={{ top: minToTop(h * 60), height: SLOT_H * 2 }}
                        >
                          <div
                            className="h-1/2 hover:bg-primary-50/60 dark:hover:bg-primary-900/20 cursor-pointer transition-colors"
                            onDoubleClick={() => openQC(day, h, false)}
                          />
                          <div
                            className="h-1/2 hover:bg-primary-50/60 dark:hover:bg-primary-900/20 cursor-pointer transition-colors"
                            onDoubleClick={() => openQC(day, h, true)}
                          />
                        </div>
                      ))}

                      {/* Meeting events */}
                      {dayMeetings.map(m => {
                        if (!m.start_time) return null
                        const top = minToTop(timeToMin(m.start_time))
                        const ht  = m.end_time
                          ? Math.max(SLOT_H, minToTop(timeToMin(m.end_time)) - top)
                          : SLOT_H * 2
                        return (
                          <div
                            key={m.id}
                            onClick={e => openMeeting(m, e)}
                            onDoubleClick={e => e.stopPropagation()}
                            className="absolute left-0.5 right-0.5 z-10 rounded px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 overflow-hidden cursor-pointer hover:brightness-95 transition-all"
                            style={{ top, height: ht }}
                            title={m.title}
                          >
                            <div className="flex items-start gap-1">
                              <p className="text-xs font-medium text-blue-800 dark:text-blue-200 leading-tight truncate flex-1">
                                {m.title}
                              </p>
                              <TagDots tags={m.tags} max={2} dotSize={10} />
                            </div>
                            {ht > SLOT_H && (
                              <p className="text-xs text-blue-500 dark:text-blue-400">
                                {m.start_time.slice(0, 5)}{m.end_time && `–${m.end_time.slice(0, 5)}`}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ MONTH VIEW ════════════════ */}
        {view === 'month' && (() => {
          const mStart   = startOfMonth(current)
          const mEnd     = endOfMonth(current)
          const calStart = startOfWeek(mStart, { weekStartsOn: 1 })
          const calEnd   = endOfWeek(mEnd, { weekStartsOn: 1 })
          const days: Date[] = []
          let d = calStart
          while (d <= calEnd) { days.push(d); d = addDays(d, 1) }
          const dayNames = Array.from({ length: 7 }, (_, i) =>
            format(addDays(calStart, i), 'EEE', { locale }),
          )
          return (
            <div className="flex flex-col h-full p-3 gap-1">
              {/* Day-name row */}
              <div className="grid grid-cols-7 gap-1 shrink-0">
                {dayNames.map(n => (
                  <div key={n} className="text-center text-xs font-medium text-[var(--text-muted)] py-1">{n}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr">
                {days.map(day => {
                  const ds          = format(day, 'yyyy-MM-dd')
                  const dayMeetings = meetingsOn(day)
                  const dayActions  = actionsOn(day)
                  const isToday     = isSameDay(day, now)
                  const isCurrMonth = isSameMonth(day, current)
                  const isSelected  = selDay && isSameDay(day, selDay)
                  return (
                    <div
                      key={ds}
                      onClick={() => setSelDay(isSelected ? null : day)}
                      onDoubleClick={() => openQC(day, 9)}
                      className={cn(
                        'rounded-xl p-1.5 cursor-pointer transition-all min-h-14 border',
                        isCurrMonth ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-page)] opacity-50',
                        isSelected
                          ? 'border-primary-400 ring-2 ring-primary-200 dark:ring-primary-800'
                          : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                        isToday && !isSelected && 'border-primary-300 dark:border-primary-700',
                      )}
                    >
                      <div className={cn(
                        'text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full',
                        isToday       ? 'bg-primary-500 text-white'
                          : isCurrMonth ? 'text-[var(--text-primary)]'
                          : 'text-[var(--text-muted)]',
                      )}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-0.5 mt-0.5 overflow-hidden">
                        {dayMeetings.slice(0, 2).map(m => (
                          <div
                            key={m.id}
                            onClick={e => openMeeting(m, e)}
                            onDoubleClick={e => e.stopPropagation()}
                            className="calendar-event text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-1 py-0.5 rounded flex items-center gap-0.5 overflow-hidden cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                            title={m.title}
                          >
                            {m.start_time && (
                              <span className="font-medium shrink-0">{m.start_time.slice(0, 5)}</span>
                            )}
                            <span className="truncate flex-1">{m.title}</span>
                            <TagDots tags={m.tags} max={2} dotSize={9} />
                          </div>
                        ))}
                        {dayActions.slice(0, 2).map(a => (
                          <div
                            key={a.id}
                            onClick={e => openAction(a, e)}
                            onDoubleClick={e => e.stopPropagation()}
                            className="calendar-event text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded flex items-center gap-0.5 overflow-hidden cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                            title={a.title}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', priorityColor(a.priority))} />
                            <span className="truncate flex-1">{a.title}</span>
                            <TagDots tags={a.tags} max={2} dotSize={9} />
                          </div>
                        ))}
                        {(dayMeetings.length + dayActions.length) > 4 && (
                          <div className="text-xs text-[var(--text-muted)] pl-1">
                            +{dayMeetings.length + dayActions.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Selected-day detail panel */}
              {selDay && (
                <div className="shrink-0 mt-1 p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
                  <p className="font-semibold text-sm text-[var(--text-primary)] mb-2">
                    {format(selDay, 'EEEE d MMMM', { locale })}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {meetingsOn(selDay).length > 0 && (
                      <div>
                        <p className="text-xs text-[var(--text-muted)] mb-1 flex items-center gap-1">
                          <Users className="h-3 w-3" /> {t('agenda.meetings')}
                        </p>
                        {meetingsOn(selDay).map(m => (
                          <div
                            key={m.id}
                            onClick={e => openMeeting(m, e)}
                            className="text-sm text-[var(--text-primary)] flex items-center gap-2 py-0.5 px-1 rounded cursor-pointer hover:bg-[var(--bg-page)] transition-colors"
                          >
                            {m.start_time && (
                              <span className="text-xs text-[var(--text-muted)] font-mono shrink-0">{m.start_time.slice(0, 5)}</span>
                            )}
                            <span className="truncate flex-1">{m.title}</span>
                            <TagDots tags={m.tags} max={3} dotSize={12} />
                          </div>
                        ))}
                      </div>
                    )}
                    {actionsOn(selDay).length > 0 && (
                      <div>
                        <p className="text-xs text-[var(--text-muted)] mb-1 flex items-center gap-1">
                          <CheckSquare className="h-3 w-3" /> {t('agenda.actions')}
                        </p>
                        {actionsOn(selDay).map(a => (
                          <div
                            key={a.id}
                            onClick={e => openAction(a, e)}
                            className="text-sm text-[var(--text-primary)] flex items-center gap-2 py-0.5 px-1 rounded cursor-pointer hover:bg-[var(--bg-page)] transition-colors"
                          >
                            <span className={cn('w-2 h-2 rounded-full shrink-0', priorityColor(a.priority))} />
                            <span className="truncate flex-1">{a.title}</span>
                            <TagDots tags={a.tags} max={3} dotSize={12} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* ════════════════ YEAR VIEW ════════════════ */}
        {view === 'year' && (() => {
          const yearStart = startOfYear(current)
          const yearEnd   = endOfYear(current)
          const months    = eachMonthOfInterval({ start: yearStart, end: yearEnd })
          return (
            <div className="h-full overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {months.map(month => {
                  const mS    = startOfMonth(month)
                  const mE    = endOfMonth(month)
                  const cS    = startOfWeek(mS, { weekStartsOn: 1 })
                  const cE    = endOfWeek(mE, { weekStartsOn: 1 })
                  const mDays: Date[] = []
                  let d = cS
                  while (d <= cE) { mDays.push(d); d = addDays(d, 1) }
                  return (
                    <div
                      key={format(month, 'yyyy-MM')}
                      className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border)] cursor-pointer hover:border-primary-400 transition-colors"
                      onClick={() => { setCurrent(month); setView('month') }}
                    >
                      <p className="text-xs font-semibold text-[var(--text-primary)] mb-2 text-center">
                        {format(month, 'MMMM', { locale })}
                      </p>
                      <div className="grid grid-cols-7">
                        {/* Day-name row (single letter) */}
                        {Array.from({ length: 7 }, (_, i) => (
                          <div key={i} className="text-center text-xs text-[var(--text-muted)] pb-0.5 select-none">
                            {format(addDays(cS, i), 'EEEEE', { locale })}
                          </div>
                        ))}
                        {mDays.map(day => {
                          const hasMeet = meetingsOn(day).length > 0
                          const hasAct  = actionsOn(day).length > 0
                          const isToday = isSameDay(day, now)
                          const inMonth = isSameMonth(day, month)
                          return (
                            <div
                              key={format(day, 'yyyyMMdd')}
                              className={cn(
                                'relative text-center text-xs py-0.5 rounded',
                                !inMonth && 'opacity-25',
                                isToday && 'bg-primary-500 text-white font-bold rounded-full',
                                !isToday && (hasMeet || hasAct) && 'font-semibold',
                              )}
                              title={
                                (hasMeet || hasAct)
                                  ? `${meetingsOn(day).length} vergadering(en), ${actionsOn(day).length} actie(s)`
                                  : undefined
                              }
                            >
                              {format(day, 'd')}
                              {!isToday && (hasMeet || hasAct) && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-500" />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Event Detail Modal ──────────────────────────────────────────── */}
      <Modal
        open={evtOpen}
        onClose={() => setEvtOpen(false)}
        title={evtType === 'meeting' ? t('agenda.typeMeeting') : t('agenda.typeAction')}
        size="md"
        footer={
          <div className="flex items-center gap-2 w-full">
            {/* Left side: delete */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEvtDeleteConfirm(true)}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              icon={<Trash2 className="h-4 w-4" />}
            >
              {t('common.delete')}
            </Button>
            <div className="flex-1" />
            {/* Right side: mark done (actions only) + edit + close */}
            {evtType === 'action' && evtAction && evtAction.status !== 'done' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleEvtMarkDone}
                loading={evtMarkingDone}
                icon={<Check className="h-4 w-4" />}
              >
                {t('actions.markDone')}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEvtOpen(false)
                if (evtType === 'meeting' && evtMeeting) navigate(`/meetings?id=${evtMeeting.id}`)
                else if (evtType === 'action' && evtAction) navigate(`/actions?id=${evtAction.id}`)
              }}
              icon={<Pencil className="h-4 w-4" />}
            >
              {t('common.edit')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEvtOpen(false)} icon={<X className="h-4 w-4" />}>
              {t('common.close')}
            </Button>
          </div>
        }
      >
        {evtType === 'meeting' && evtMeeting && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{evtMeeting.title}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Calendar className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                {formatDate(evtMeeting.date, 'EEE dd MMM yyyy', i18n.language)}
              </div>
              {(evtMeeting.start_time || evtMeeting.end_time) && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Clock className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  {evtMeeting.start_time?.slice(0, 5)}
                  {evtMeeting.end_time && ` – ${evtMeeting.end_time.slice(0, 5)}`}
                </div>
              )}
              {evtMeeting.location && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)] col-span-2">
                  <MapPin className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  {evtMeeting.location}
                </div>
              )}
              {evtMeeting.participants && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)] col-span-2">
                  <Users className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  {evtMeeting.participants}
                </div>
              )}
            </div>
            {evtMeeting.notes && (
              <div className="bg-[var(--bg-page)] rounded-lg p-3 text-sm text-[var(--text-primary)] whitespace-pre-wrap max-h-40 overflow-y-auto">
                {evtMeeting.notes}
              </div>
            )}
            {evtMeeting.tags && evtMeeting.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {evtMeeting.tags.map(tag => (
                  <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />
                ))}
              </div>
            )}
          </div>
        )}
        {evtType === 'action' && evtAction && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className={cn(
                'mt-1 w-3 h-3 rounded-full shrink-0',
                evtAction.priority === 'urgent' ? 'bg-red-500'
                  : evtAction.priority === 'high' ? 'bg-orange-500'
                  : evtAction.priority === 'medium' ? 'bg-yellow-400'
                  : 'bg-green-500',
              )} />
              <h3 className={cn(
                'text-base font-semibold text-[var(--text-primary)]',
                evtAction.status === 'done' && 'line-through text-[var(--text-muted)]',
              )}>
                {evtAction.title}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={cn('text-xs px-2 py-0.5 rounded-full', priorityBgColor(evtAction.priority))}>
                {t(`actions.priority.${evtAction.priority}`)}
              </span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', statusBgColor(evtAction.status))}>
                {t(`actions.status.${evtAction.status}`)}
              </span>
              {evtAction.tags?.map(tag => (
                <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />
              ))}
            </div>
            {evtAction.description && (
              <p className="text-sm text-[var(--text-secondary)]">{evtAction.description}</p>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm text-[var(--text-secondary)]">
              {evtAction.start_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                  <span>{t('actions.startDate')}: {formatDate(evtAction.start_date, 'dd MMM yyyy', i18n.language)}</span>
                </div>
              )}
              {evtAction.due_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                  <span>{t('actions.dueDate')}: {formatDate(evtAction.due_date, 'dd MMM yyyy', i18n.language)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirm Modal ─────────────────────────────────────────── */}
      <ConfirmModal
        open={evtDeleteConfirm}
        onClose={() => setEvtDeleteConfirm(false)}
        onConfirm={handleEvtDelete}
        title={t('common.delete')}
        message={t('common.deleteConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={evtDeleting}
      />

      {/* ── Quick-Create Modal ───────────────────────────────────────────── */}
      <Modal
        open={qcOpen}
        onClose={() => setQcOpen(false)}
        title={t('agenda.newItem')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setQcOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveQC} loading={qcSaving} disabled={!qcTitle.trim()}>
              {t('common.add')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {/* Type toggle */}
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-sm font-medium">
            <button
              onClick={() => setQcType('meeting')}
              className={cn(
                'flex-1 py-2 flex items-center justify-center gap-2 transition-colors',
                qcType === 'meeting'
                  ? 'bg-blue-500 text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-page)]',
              )}
            >
              <Users className="h-4 w-4" />
              {t('agenda.typeMeeting')}
            </button>
            <button
              onClick={() => setQcType('action')}
              className={cn(
                'flex-1 py-2 flex items-center justify-center gap-2 transition-colors',
                qcType === 'action'
                  ? 'bg-blue-500 text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-page)]',
              )}
            >
              <CheckSquare className="h-4 w-4" />
              {t('agenda.typeAction')}
            </button>
          </div>

          <Input
            label={t('common.title')}
            value={qcTitle}
            onChange={e => setQcTitle(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && !qcSaving && saveQC()}
            placeholder={qcType === 'meeting' ? 'Vergaderingtitel...' : 'Actietitel...'}
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              label={t('common.date')}
              type="date"
              value={qcDate}
              onChange={e => setQcDate(e.target.value)}
            />
            {qcType === 'meeting' ? (
              <Input
                label={t('meetings.startTime')}
                type="time"
                value={qcTime}
                onChange={e => setQcTime(e.target.value)}
              />
            ) : (
              <Select
                label={t('common.priority')}
                value={qcPriority}
                onChange={e => setQcPriority(e.target.value)}
                options={[
                  { value: 'low',    label: t('actions.priority.low') },
                  { value: 'medium', label: t('actions.priority.medium') },
                  { value: 'high',   label: t('actions.priority.high') },
                  { value: 'urgent', label: t('actions.priority.urgent') },
                ]}
              />
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
