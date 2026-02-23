import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { nl, enUS, sv } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Printer, Plus, Pencil, Trash2,
  CheckCircle2, Settings2, Sun,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { PageSpinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import {
  getLeaveBalance, upsertLeaveBalance,
  getLeaveEntries, createLeaveEntry, updateLeaveEntry, deleteLeaveEntry,
  computeLeaveStats,
} from '@/features/leave/api'
import type { V2LeaveBalance, V2LeaveEntry } from '@/types/database.types'

const localeMap: Record<string, typeof nl> = { nl, en: enUS, sv }

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt2(n: number, decimals = 1): string {
  return Number(n.toFixed(decimals)).toString()
}

// ─── Entry form state ─────────────────────────────────────────────────────────
interface EntryForm {
  entry_date: string
  hours: string
  description: string
}

function emptyForm(defaultDate = ''): EntryForm {
  return { entry_date: defaultDate, hours: '8', description: '' }
}

function formFromEntry(e: V2LeaveEntry): EntryForm {
  return {
    entry_date:  e.entry_date,
    hours:       String(e.hours),
    description: e.description ?? '',
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Vacation() {
  const { t, i18n } = useTranslation()
  const { user }    = useAuth()
  const locale      = localeMap[i18n.language] || nl

  const [yearRef,  setYearRef]  = useState(new Date())
  const [loading,  setLoading]  = useState(true)

  const [balance,  setBalance]  = useState<V2LeaveBalance | null>(null)
  const [entries,  setEntries]  = useState<V2LeaveEntry[]>([])

  // ── Balance settings form ─────────────────────────────────────────────────
  const [settingsOpen,   setSettingsOpen]   = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savedSettings,  setSavedSettings]  = useState(false)

  // editable balance fields
  const [baseDays,    setBaseDays]    = useState('25')
  const [purchased,   setPurchased]   = useState('0')
  const [carryHours,  setCarryHours]  = useState('0')
  const [manualAdj,   setManualAdj]   = useState('0')
  const [hoursPerDay, setHoursPerDay] = useState('8')

  // ── Entry modal ───────────────────────────────────────────────────────────
  const [entryModal,  setEntryModal]  = useState(false)
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [entryForm,   setEntryForm]   = useState<EntryForm>(emptyForm())
  const [savingEntry, setSavingEntry] = useState(false)

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [deleteId,    setDeleteId]    = useState<string | null>(null)
  const [deleting,    setDeleting]    = useState(false)

  const year = parseInt(format(yearRef, 'yyyy'))

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [bal, ents] = await Promise.all([
        getLeaveBalance(year),
        getLeaveEntries(year),
      ])
      setBalance(bal)
      setEntries(ents)
      // Sync settings form
      setBaseDays(String(bal?.base_days               ?? 25))
      setPurchased(String(bal?.purchased_days         ?? 0))
      setCarryHours(String(bal?.carry_over_hours      ?? 0))
      setManualAdj(String(bal?.manual_adjustment_hours ?? 0))
      setHoursPerDay(String(bal?.hours_per_day        ?? 8))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user, year])

  useEffect(() => { load() }, [load])

  // ── Save balance settings ─────────────────────────────────────────────────
  async function saveSettings() {
    setSavingSettings(true)
    try {
      const updated = await upsertLeaveBalance(year, {
        base_days:               parseFloat(baseDays)    || 25,
        purchased_days:          parseFloat(purchased)   || 0,
        carry_over_hours:        parseFloat(carryHours)  || 0,
        manual_adjustment_hours: parseFloat(manualAdj)   || 0,
        hours_per_day:           parseFloat(hoursPerDay) || 8,
      })
      setBalance(updated)
      setSavedSettings(true)
      setTimeout(() => setSavedSettings(false), 2000)
      setSettingsOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingSettings(false)
    }
  }

  // ── Open entry modal ──────────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null)
    setEntryForm(emptyForm(format(new Date(), 'yyyy-MM-dd')))
    setEntryModal(true)
  }

  function openEdit(e: V2LeaveEntry) {
    setEditingId(e.id)
    setEntryForm(formFromEntry(e))
    setEntryModal(true)
  }

  // ── Save entry ────────────────────────────────────────────────────────────
  async function saveEntry() {
    if (!entryForm.entry_date) return
    setSavingEntry(true)
    try {
      const payload = {
        entry_date:  entryForm.entry_date,
        hours:       parseFloat(entryForm.hours) || 8,
        description: entryForm.description || null,
      }
      if (editingId) {
        const updated = await updateLeaveEntry(editingId, payload)
        setEntries(prev => prev.map(e => e.id === editingId ? updated : e))
      } else {
        const created = await createLeaveEntry(payload)
        setEntries(prev => [...prev, created].sort((a, b) => a.entry_date.localeCompare(b.entry_date)))
      }
      setEntryModal(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingEntry(false)
    }
  }

  // ── Delete entry ──────────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteLeaveEntry(deleteId)
      setEntries(prev => prev.filter(e => e.id !== deleteId))
      setDeleteId(null)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = computeLeaveStats(balance, entries)
  const hoursPerDayNum = balance?.hours_per_day ?? 8

  if (loading) return <PageSpinner />

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-4 md:p-6 max-w-4xl mx-auto w-full">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{t('vacation.title')}</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{t('vacation.notesHint', { year })}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors print:hidden"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {t('vacation.balanceSettings')}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors print:hidden"
            >
              <Printer className="h-3.5 w-3.5" />
              {t('vacation.print')}
            </button>
          </div>
        </div>

        {/* ── Year navigation ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setYearRef(d => { const n = new Date(d); n.setFullYear(n.getFullYear() - 1); return n })}
            className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-[var(--text-primary)] min-w-[60px] text-center">
            {year}
          </span>
          <button
            onClick={() => setYearRef(d => { const n = new Date(d); n.setFullYear(n.getFullYear() + 1); return n })}
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

        {/* ── Summary cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
            <p className="text-xs text-[var(--text-muted)] mb-1">{t('vacation.totalEntitlement')}</p>
            <p className="text-2xl font-bold font-mono text-primary-600 dark:text-primary-400">
              {fmt2(stats.totalEntitlementDays, 1)} <span className="text-sm font-normal text-[var(--text-muted)]">{t('vacation.days')}</span>
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">
              {fmt2(stats.totalEntitlementHours, 1)} {t('vacation.hours_suffix')}
            </p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
            <p className="text-xs text-[var(--text-muted)] mb-1">{t('vacation.taken')}</p>
            <p className={cn('text-2xl font-bold font-mono', stats.takenDays > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-primary)]')}>
              {fmt2(stats.takenDays, 1)} <span className="text-sm font-normal text-[var(--text-muted)]">{t('vacation.days')}</span>
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">
              {fmt2(stats.takenHours, 1)} {t('vacation.hours_suffix')}
            </p>
          </div>

          <div className={cn(
            'col-span-2 md:col-span-1 border rounded-xl p-4 shadow-sm',
            stats.remainingHours >= 0
              ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
          )}>
            <p className="text-xs text-[var(--text-muted)] mb-1">{t('vacation.remaining')}</p>
            <p className={cn('text-2xl font-bold font-mono', stats.remainingHours >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
              {fmt2(stats.remainingDays, 1)} <span className="text-sm font-normal text-[var(--text-muted)]">{t('vacation.days')}</span>
            </p>
            <p className={cn('text-xs mt-0.5 font-mono', stats.remainingHours >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-500')}>
              {fmt2(stats.remainingHours, 1)} {t('vacation.hours_suffix')}
            </p>
          </div>
        </div>

        {/* ── Leave entries ────────────────────────────────────────────────── */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-page)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-500" />
              {t('vacation.notesHint', { year })}
            </h3>
            <button
              onClick={openAdd}
              className="print:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('vacation.addEntry')}
            </button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[120px_80px_70px_1fr_72px] gap-0 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-page)] text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide print:grid-cols-[120px_80px_70px_1fr]">
            <div>{t('vacation.entryDate')}</div>
            <div>{t('vacation.hours')}</div>
            <div>{t('vacation.days')}</div>
            <div>{t('vacation.description')}</div>
            <div className="print:hidden" />
          </div>

          {/* Entries */}
          {entries.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              {t('vacation.noEntries')}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {entries.map((entry, idx) => {
                const days = entry.hours / hoursPerDayNum
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'grid grid-cols-[120px_80px_70px_1fr_72px] gap-0 px-4 py-2.5 items-center text-sm',
                      'print:grid-cols-[120px_80px_70px_1fr]',
                      idx % 2 === 1 && 'bg-[var(--bg-page)]',
                    )}
                  >
                    <div className="text-[var(--text-primary)] font-medium">
                      {format(parseISO(entry.entry_date), 'd MMM yyyy', { locale })}
                    </div>
                    <div className="font-mono text-[var(--text-primary)]">
                      {fmt2(entry.hours, 1)}h
                    </div>
                    <div className="font-mono text-[var(--text-secondary)] text-xs">
                      {fmt2(days, 2)}d
                    </div>
                    <div className="text-[var(--text-secondary)] truncate pr-2">
                      {entry.description || <span className="text-[var(--text-muted)] italic">—</span>}
                    </div>
                    <div className="print:hidden flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(entry)}
                        className="p-1 rounded hover:bg-[var(--bg-page)] text-[var(--text-muted)] hover:text-primary-500 transition-colors"
                        title={t('vacation.editEntry')}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(entry.id)}
                        className="p-1 rounded hover:bg-[var(--bg-page)] text-[var(--text-muted)] hover:text-red-500 transition-colors"
                        title={t('vacation.deleteEntry')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Totals footer */}
          {entries.length > 0 && (
            <div className="grid grid-cols-[120px_80px_70px_1fr_72px] gap-0 px-4 py-3 border-t-2 border-[var(--border)] bg-[var(--bg-page)] print:grid-cols-[120px_80px_70px_1fr]">
              <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                {t('common.all')}
              </div>
              <div className="font-mono font-bold text-[var(--text-primary)]">
                {fmt2(stats.takenHours, 1)}h
              </div>
              <div className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                {fmt2(stats.takenDays, 2)}d
              </div>
              <div />
              <div className="print:hidden" />
            </div>
          )}
        </div>

        {/* ── Balance details (print-only compact) ─────────────────────────── */}
        <div className="hidden print:block mt-6 text-xs text-[var(--text-muted)]">
          <p>
            {t('vacation.baseDays')}: {balance?.base_days ?? 25} |{' '}
            {t('vacation.purchasedDays')}: {balance?.purchased_days ?? 0} |{' '}
            {t('vacation.carryOverHours')}: {balance?.carry_over_hours ?? 0}h |{' '}
            {t('vacation.manualAdjustment')}: {balance?.manual_adjustment_hours ?? 0}h |{' '}
            {t('vacation.hoursPerDay')}: {balance?.hours_per_day ?? 8}h
          </p>
        </div>
      </div>

      {/* ── Balance settings modal ──────────────────────────────────────────── */}
      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={t('vacation.balanceSettings')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSettingsOpen(false)}>{t('common.cancel')}</Button>
            <Button
              variant="primary"
              onClick={saveSettings}
              loading={savingSettings}
            >
              {savedSettings ? <><CheckCircle2 className="h-4 w-4 mr-1" />{t('common.saved')}</> : t('vacation.saveSettings')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                {t('vacation.baseDays')}
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={baseDays}
                onChange={e => setBaseDays(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                {t('vacation.purchasedDays')}
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={purchased}
                onChange={e => setPurchased(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                {t('vacation.carryOverHours')}
              </label>
              <input
                type="number"
                step={0.5}
                value={carryHours}
                onChange={e => setCarryHours(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {t('vacation.hours_suffix')} — {t('vacation.hoursPerDay')}: {hoursPerDay}h →{' '}
                {fmt2((parseFloat(carryHours) || 0) / (parseFloat(hoursPerDay) || 8), 2)}d
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                {t('vacation.manualAdjustment')}
              </label>
              <input
                type="number"
                step={0.5}
                value={manualAdj}
                onChange={e => setManualAdj(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t('vacation.hoursPerDay')}
            </label>
            <input
              type="number"
              min={1}
              max={24}
              step={0.5}
              value={hoursPerDay}
              onChange={e => setHoursPerDay(e.target.value)}
              className="w-32 text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>

          {/* Live preview */}
          <div className="bg-[var(--bg-page)] border border-[var(--border)] rounded-xl p-3">
            <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">{t('vacation.totalEntitlement')}</p>
            {(() => {
              const bd   = parseFloat(baseDays)    || 0
              const pd   = parseFloat(purchased)   || 0
              const ch   = parseFloat(carryHours)  || 0
              const ma   = parseFloat(manualAdj)   || 0
              const hpd  = parseFloat(hoursPerDay) || 8
              const totalDays  = bd + pd
              const totalHours = totalDays * hpd + ch + ma
              return (
                <p className="text-sm font-mono text-[var(--text-primary)]">
                  ({bd} + {pd}) × {hpd}h + {ch}h + {ma}h ={' '}
                  <span className="font-bold text-primary-600 dark:text-primary-400">
                    {fmt2(totalHours, 1)}h / {fmt2(totalDays, 1)}d
                  </span>
                </p>
              )
            })()}
          </div>
        </div>
      </Modal>

      {/* ── Add / Edit entry modal ──────────────────────────────────────────── */}
      <Modal
        open={entryModal}
        onClose={() => setEntryModal(false)}
        title={editingId ? t('vacation.editEntry') : t('vacation.addEntry')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEntryModal(false)}>{t('common.cancel')}</Button>
            <Button
              variant="primary"
              onClick={saveEntry}
              loading={savingEntry}
              disabled={!entryForm.entry_date}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t('vacation.entryDate')} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={entryForm.entry_date}
              onChange={e => setEntryForm(f => ({ ...f, entry_date: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t('vacation.hours')}
            </label>
            <input
              type="number"
              min={0.5}
              max={24}
              step={0.5}
              value={entryForm.hours}
              onChange={e => setEntryForm(f => ({ ...f, hours: e.target.value }))}
              className="w-32 text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
            <span className="ml-2 text-xs text-[var(--text-muted)]">
              = {fmt2((parseFloat(entryForm.hours) || 0) / hoursPerDayNum, 2)} {t('vacation.days')}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t('vacation.description')}
            </label>
            <input
              type="text"
              value={entryForm.description}
              onChange={e => setEntryForm(f => ({ ...f, description: e.target.value }))}
              placeholder={t('vacation.descriptionPlaceholder')}
              className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>
        </div>
      </Modal>

      {/* ── Delete confirm modal ─────────────────────────────────────────────── */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title={t('vacation.deleteEntry')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-[var(--text-secondary)]">{t('vacation.deleteEntryConfirm')}</p>
      </Modal>

      {/* ── Print styles ─────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
