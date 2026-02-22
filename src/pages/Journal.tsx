import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns'
import { nl, enUS, sv } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, BookOpen, Printer, FileDown, Calendar } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useAuth } from '@/contexts/AuthContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import { PageSpinner } from '@/components/ui/Spinner'
import { getJournalEntriesForWeek, upsertJournalEntry } from '@/features/journal/api'
import type { V2JournalEntry } from '@/types/database.types'
import { cn, getWeekNumber } from '@/lib/utils'

const localeMap: Record<string, typeof nl> = { nl, en: enUS, sv }

export default function Journal() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const locale = localeMap[i18n.language] || nl

  const [currentDate, setCurrentDate] = useState(new Date())
  const [entries, setEntries] = useState<Map<string, V2JournalEntry>>(new Map())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekNumber = getWeekNumber(currentDate)
  const year = currentDate.getFullYear()

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const loadWeek = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const weekEntries = await getJournalEntriesForWeek(user.id, weekNumber, year)
      const map = new Map<string, V2JournalEntry>()
      weekEntries.forEach(e => map.set(e.entry_date, e))
      setEntries(map)

      // Load content for selected date
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      setContent(map.get(dateStr)?.content || '')
    } finally {
      setLoading(false)
    }
  }, [user, weekNumber, year, selectedDate])

  useEffect(() => { loadWeek() }, [loadWeek])

  function selectDay(date: Date) {
    setSelectedDate(date)
    const dateStr = format(date, 'yyyy-MM-dd')
    setContent(entries.get(dateStr)?.content || '')
  }

  // Auto-save with debounce
  function handleContentChange(val: string) {
    setContent(val)
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    const timer = setTimeout(() => autoSave(val), 1500)
    setAutoSaveTimer(timer)
  }

  async function autoSave(val: string) {
    if (!user) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    try {
      const saved = await upsertJournalEntry(user.id, dateStr, val)
      setEntries(prev => new Map(prev).set(dateStr, saved))
    } catch (err) {
      console.error('Autosave error:', err)
    }
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const saved = await upsertJournalEntry(user.id, dateStr, content)
      setEntries(prev => new Map(prev).set(dateStr, saved))
    } finally {
      setSaving(false)
    }
  }

  function prevWeek() {
    const newDate = subDays(currentDate, 7)
    setCurrentDate(newDate)
    setSelectedDate(newDate)
  }

  function nextWeek() {
    const newDate = addDays(currentDate, 7)
    setCurrentDate(newDate)
    setSelectedDate(newDate)
  }

  function goToToday() {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  function printWeek() {
    window.print()
  }

  async function exportWeekPDF() {
    const doc = new jsPDF()
    const title = `${t('journal.weekNumber')} ${weekNumber} - ${year}`
    const range = `${format(weekStart, 'd MMM', { locale })} - ${format(weekEnd, 'd MMM yyyy', { locale })}`

    doc.setFontSize(18)
    doc.text(title, 20, 20)
    doc.setFontSize(12)
    doc.text(range, 20, 30)

    let y = 45
    weekDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const entry = entries.get(dateStr)
      const dayName = format(day, 'EEEE d MMMM', { locale })

      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(dayName, 20, y)
      y += 8

      if (entry?.content) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        const lines = doc.splitTextToSize(entry.content, 170)
        lines.forEach((line: string) => {
          if (y > 270) {
            doc.addPage()
            y = 20
          }
          doc.text(line, 20, y)
          y += 6
        })
      } else {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'italic')
        doc.text('(geen notitie)', 20, y)
        y += 6
      }
      y += 6
      if (y > 270) { doc.addPage(); y = 20 }
    })

    doc.save(`dagboek-week${weekNumber}-${year}.pdf`)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: week navigator */}
        <div className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--bg-card)] flex flex-col">
          {/* Week header */}
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex items-center justify-between mb-2">
              <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-[var(--bg-page)] text-[var(--text-secondary)] transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <p className="font-semibold text-sm text-[var(--text-primary)]">
                  {t('journal.weekNumber')} {weekNumber}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {format(weekStart, 'd MMM', { locale })} – {format(weekEnd, 'd MMM', { locale })}
                </p>
              </div>
              <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-[var(--bg-page)] text-[var(--text-secondary)] transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={goToToday} icon={<Calendar className="h-3.5 w-3.5" />}>
              {t('common.today')}
            </Button>
          </div>

          {/* Day list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {weekDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const hasEntry = !!entries.get(dateStr)?.content
              const isSelected = isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())

              return (
                <button
                  key={dateStr}
                  onClick={() => selectDay(day)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left',
                    isSelected
                      ? 'bg-primary-500 text-white'
                      : 'hover:bg-[var(--bg-page)] text-[var(--text-primary)]',
                  )}
                >
                  <div className={cn('text-center w-8 shrink-0', isSelected ? 'text-white' : '')}>
                    <p className={cn('text-xs', isSelected ? 'text-white/80' : 'text-[var(--text-muted)]')}>
                      {format(day, 'EEE', { locale }).toUpperCase().slice(0, 2)}
                    </p>
                    <p className={cn('text-sm font-bold leading-tight', isToday && !isSelected && 'text-primary-500')}>
                      {format(day, 'd')}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs truncate', isSelected ? 'text-white/80' : 'text-[var(--text-secondary)]')}>
                      {format(day, 'MMMM', { locale })}
                    </p>
                  </div>
                  {hasEntry && (
                    <div className={cn('w-2 h-2 rounded-full shrink-0', isSelected ? 'bg-white/60' : 'bg-primary-400')} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Export buttons */}
          <div className="p-3 border-t border-[var(--border)] space-y-2">
            <Button variant="secondary" size="sm" className="w-full" onClick={exportWeekPDF} icon={<FileDown className="h-4 w-4" />}>
              {t('journal.exportWeek')}
            </Button>
            <Button variant="secondary" size="sm" className="w-full no-print" onClick={printWeek} icon={<Printer className="h-4 w-4" />}>
              {t('journal.printWeek')}
            </Button>
          </div>
        </div>

        {/* Right: editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {loading ? (
            <PageSpinner />
          ) : (
            <>
              {/* Editor header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
                <div>
                  <h2 className="font-semibold text-[var(--text-primary)]">
                    {format(selectedDate, 'EEEE d MMMM yyyy', { locale })}
                  </h2>
                  {isSameDay(selectedDate, new Date()) && (
                    <span className="text-xs text-primary-500 font-medium">{t('common.today')}</span>
                  )}
                </div>
                <Button onClick={handleSave} loading={saving} size="sm">
                  {t('common.save')}
                </Button>
              </div>

              {/* Textarea */}
              <div className="flex-1 overflow-hidden p-6">
                <textarea
                  value={content}
                  onChange={e => handleContentChange(e.target.value)}
                  placeholder={t('journal.contentPlaceholder')}
                  className={cn(
                    'w-full h-full resize-none bg-transparent text-[var(--text-primary)]',
                    'placeholder:text-[var(--text-muted)] text-sm leading-relaxed',
                    'focus:outline-none',
                  )}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
