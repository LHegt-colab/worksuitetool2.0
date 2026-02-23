import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Upload, AlertTriangle, CheckCircle2, Package, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'exporting' | 'importing' | 'success' | 'error'

const EXPORT_TS_KEY = 'wst_last_export_ts'

export default function DataManagement() {
  const { t }    = useTranslation()
  const { user } = useAuth()

  const [status,  setStatus]  = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [confirmImport, setConfirmImport] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const lastExport = localStorage.getItem(EXPORT_TS_KEY)

  // ── Export ──────────────────────────────────────────────────────────────
  async function handleExport() {
    if (!user) return
    setStatus('exporting')
    setMessage('')
    try {
      const uid = user.id

      const [
        { data: tags },
        { data: actions },
        { data: actionTags },
        { data: meetings },
        { data: meetingTags },
        { data: decisions },
        { data: journal },
        { data: knowledge },
        { data: knowledgeTags },
        { data: events },
        { data: workLogs },
      ] = await Promise.all([
        supabase.from('v2_tags').select('*').eq('user_id', uid),
        supabase.from('v2_actions').select('*').eq('user_id', uid),
        supabase.from('v2_action_tags').select('*'),
        supabase.from('v2_meetings').select('*').eq('user_id', uid),
        supabase.from('v2_meeting_tags').select('*'),
        supabase.from('v2_decisions').select('*').eq('user_id', uid),
        supabase.from('v2_journal_entries').select('*').eq('user_id', uid),
        supabase.from('v2_knowledge_pages').select('*').eq('user_id', uid),
        supabase.from('v2_knowledge_tags').select('*'),
        supabase.from('v2_calendar_events').select('*').eq('user_id', uid),
        supabase.from('v2_work_logs').select('*').eq('user_id', uid),
      ])

      const payload = {
        version: '2.0',
        exported_at: new Date().toISOString(),
        user_id: uid,
        data: {
          tags:           tags           ?? [],
          actions:        actions        ?? [],
          action_tags:    actionTags     ?? [],
          meetings:       meetings       ?? [],
          meeting_tags:   meetingTags    ?? [],
          decisions:      decisions      ?? [],
          journal_entries: journal       ?? [],
          knowledge_pages: knowledge     ?? [],
          knowledge_tags:  knowledgeTags ?? [],
          calendar_events: events        ?? [],
          work_logs:       workLogs      ?? [],
        },
      }

      const json = JSON.stringify(payload, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const ts   = new Date().toISOString().slice(0, 10)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `worksuite-backup-${ts}.json`
      a.click()
      URL.revokeObjectURL(url)

      const now = new Date().toLocaleString()
      localStorage.setItem(EXPORT_TS_KEY, now)
      setStatus('success')
      setMessage(t('dataManagement.exportSuccess'))
    } catch (err: unknown) {
      console.error(err)
      setStatus('error')
      setMessage(String(err))
    }
  }

  // ── Import – step 1: choose file ─────────────────────────────────────────
  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setConfirmImport(true)
    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Import – step 2: confirmed, do the restore ───────────────────────────
  async function doImport() {
    if (!user || !pendingFile) return
    setConfirmImport(false)
    setStatus('importing')
    setMessage('')

    try {
      const text = await pendingFile.text()
      const json = JSON.parse(text)

      if (!json.data || !json.version) {
        throw new Error('Ongeldig backup-bestand (geen version/data veld)')
      }

      const uid = user.id
      const d   = json.data

      // Re-assign user_id to current user for all rows (handles cross-account imports)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function withUid(rows: unknown[], userId: string): any[] {
        return (rows ?? []).map((r: unknown) => ({ ...(r as object), user_id: userId }))
      }

      // 1. Delete all existing user data (order matters for FK constraints)
      await supabase.from('v2_action_tags').delete().in(
        'action_id',
        (await supabase.from('v2_actions').select('id').eq('user_id', uid)).data?.map(r => r.id) ?? [],
      )
      await supabase.from('v2_meeting_tags').delete().in(
        'meeting_id',
        (await supabase.from('v2_meetings').select('id').eq('user_id', uid)).data?.map(r => r.id) ?? [],
      )
      await supabase.from('v2_knowledge_tags').delete().in(
        'knowledge_id',
        (await supabase.from('v2_knowledge_pages').select('id').eq('user_id', uid)).data?.map(r => r.id) ?? [],
      )
      await supabase.from('v2_decisions').delete().eq('user_id', uid)
      await supabase.from('v2_actions').delete().eq('user_id', uid)
      await supabase.from('v2_meetings').delete().eq('user_id', uid)
      await supabase.from('v2_journal_entries').delete().eq('user_id', uid)
      await supabase.from('v2_knowledge_pages').delete().eq('user_id', uid)
      await supabase.from('v2_calendar_events').delete().eq('user_id', uid)
      await supabase.from('v2_work_logs').delete().eq('user_id', uid)
      await supabase.from('v2_tags').delete().eq('user_id', uid)

      // 2. Re-insert — keep original IDs so junction tables still resolve correctly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      if (d.tags?.length)            await sb.from('v2_tags').insert(withUid(d.tags, uid))
      if (d.actions?.length)         await sb.from('v2_actions').insert(withUid(d.actions, uid))
      if (d.meetings?.length)        await sb.from('v2_meetings').insert(withUid(d.meetings, uid))
      if (d.decisions?.length)       await sb.from('v2_decisions').insert(withUid(d.decisions, uid))
      if (d.journal_entries?.length) await sb.from('v2_journal_entries').insert(withUid(d.journal_entries, uid))
      if (d.knowledge_pages?.length) await sb.from('v2_knowledge_pages').insert(withUid(d.knowledge_pages, uid))
      if (d.calendar_events?.length) await sb.from('v2_calendar_events').insert(withUid(d.calendar_events, uid))
      if (d.work_logs?.length)       await sb.from('v2_work_logs').insert(withUid(d.work_logs, uid))

      // Junction tables (no user_id column)
      if (d.action_tags?.length)    await sb.from('v2_action_tags').insert(d.action_tags)
      if (d.meeting_tags?.length)   await sb.from('v2_meeting_tags').insert(d.meeting_tags)
      if (d.knowledge_tags?.length) await sb.from('v2_knowledge_tags').insert(d.knowledge_tags)

      setStatus('success')
      setMessage(t('dataManagement.importSuccess'))
      setPendingFile(null)
    } catch (err: unknown) {
      console.error(err)
      setStatus('error')
      setMessage(String(err))
      setPendingFile(null)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">{t('dataManagement.title')}</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        {t('dataManagement.whatIsExported')}: <span className="text-[var(--text-secondary)]">{t('dataManagement.exportedItems')}</span>
      </p>

      <div className="space-y-6">

        {/* ── Export card ────────────────────────────────────────────────── */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl shrink-0">
              <Download className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[var(--text-primary)] mb-1">{t('dataManagement.exportTitle')}</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-1">{t('dataManagement.exportDesc')}</p>
              {lastExport && (
                <p className="text-xs text-[var(--text-muted)]">
                  {t('dataManagement.lastExport')}: {lastExport}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={status === 'exporting'}
              icon={status === 'exporting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            >
              {status === 'exporting' ? t('dataManagement.exporting') : t('dataManagement.exportButton')}
            </Button>
          </div>
        </div>

        {/* ── Import card ────────────────────────────────────────────────── */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl shrink-0">
              <Upload className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[var(--text-primary)] mb-1">{t('dataManagement.importTitle')}</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-3">{t('dataManagement.importDesc')}</p>

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300">{t('dataManagement.importWarning')}</p>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChosen}
              className="hidden"
            />
            <Button
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={status === 'importing'}
              icon={status === 'importing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            >
              {status === 'importing' ? t('dataManagement.importing') : t('dataManagement.importButton')}
            </Button>
          </div>
        </div>

        {/* ── Status message ──────────────────────────────────────────────── */}
        {(status === 'success' || status === 'error') && (
          <div className={cn(
            'flex items-start gap-3 p-4 rounded-xl border',
            status === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
          )}>
            {status === 'success'
              ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              : <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            }
            <div>
              <p className={cn(
                'text-sm font-medium',
                status === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300',
              )}>
                {message}
              </p>
            </div>
            <button
              onClick={() => { setStatus('idle'); setMessage('') }}
              className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* ── Import Confirm Dialog ──────────────────────────────────────────── */}
      {confirmImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl border border-[var(--border)] p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)]">{t('dataManagement.importTitle')}</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              <strong>{pendingFile?.name}</strong>
            </p>
            <p className="text-sm text-[var(--text-secondary)] mb-5">
              {t('dataManagement.confirmImport')}
            </p>
            <div className="flex gap-3">
              <Button
                variant="danger"
                className="flex-1"
                onClick={doImport}
                icon={<Package className="h-4 w-4" />}
              >
                {t('common.confirm')}
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { setConfirmImport(false); setPendingFile(null) }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
