import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Plus, Search, Users, Calendar, Clock, MapPin, Pencil, Trash2, ChevronRight, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import { TagBadge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import TagSelector from '@/features/tags/TagSelector'
import {
  getMeetings, getMeeting, createMeeting, updateMeeting, deleteMeeting,
  createDecision, deleteDecision, type CreateMeetingInput
} from '@/features/meetings/api'
import { getTags } from '@/features/tags/api'
import { getActions, createAction } from '@/features/actions/api'
import type { V2Meeting, V2Action, V2Tag, V2Decision } from '@/types/database.types'
import { cn, formatDate } from '@/lib/utils'

export default function Meetings() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [meetings, setMeetings] = useState<V2Meeting[]>([])
  const [tags, setTags] = useState<V2Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<V2Meeting | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<V2Meeting | null>(null)
  const [deleteModal, setDeleteModal] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newDecisionTitle, setNewDecisionTitle] = useState('')
  const [addingDecision, setAddingDecision] = useState(false)
  const [newActionTitle, setNewActionTitle] = useState('')
  const [addingAction, setAddingAction] = useState(false)

  // Form state (for the left panel edit mode)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({
    title: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    participants: '',
    notes: '',
    tag_ids: [] as string[],
  })

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [m, tgs] = await Promise.all([getMeetings(user.id), getTags(user.id)])
      setMeetings(m)
      setTags(tgs)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  // Select from URL
  useEffect(() => {
    const id = searchParams.get('id')
    if (id && meetings.length > 0) {
      const m = meetings.find(m => m.id === id)
      if (m) selectMeeting(m)
    }
  }, [searchParams, meetings])

  async function selectMeeting(meeting: V2Meeting) {
    setSelected(meeting)
    setEditMode(false)
    setForm({
      title: meeting.title,
      date: meeting.date,
      start_time: meeting.start_time || '',
      end_time: meeting.end_time || '',
      location: meeting.location || '',
      participants: meeting.participants || '',
      notes: meeting.notes || '',
      tag_ids: meeting.tags?.map(t => t.id) || [],
    })
    // Load full details
    const detail = await getMeeting(meeting.id)
    setSelectedDetail(detail)
  }

  function openNew() {
    setSelected(null)
    setSelectedDetail(null)
    setEditMode(true)
    const today = new Date().toISOString().split('T')[0]
    setForm({ title: '', date: today, start_time: '', end_time: '', location: '', participants: '', notes: '', tag_ids: [] })
  }

  async function handleSave() {
    if (!user || !form.title || !form.date) return
    setSaving(true)
    try {
      if (selected) {
        const updated = await updateMeeting(selected.id, {
          ...form,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          location: form.location || null,
          participants: form.participants || null,
          notes: form.notes || null,
        })
        load()
        const detail = await getMeeting(updated.id)
        setSelected({ ...updated, tags: detail?.tags || [] })
        setSelectedDetail(detail)
        setEditMode(false)
      } else {
        const created = await createMeeting({
          user_id: user.id,
          ...form,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          location: form.location || null,
          participants: form.participants || null,
          notes: form.notes || null,
        } as CreateMeetingInput)
        load()
        const detail = await getMeeting(created.id)
        setSelected({ ...created, tags: detail?.tags || [] })
        setSelectedDetail(detail)
        setEditMode(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteModal) return
    setDeleting(true)
    try {
      await deleteMeeting(deleteModal)
      setDeleteModal(null)
      setSelected(null)
      setSelectedDetail(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  async function handleAddDecision() {
    if (!user || !selectedDetail || !newDecisionTitle.trim()) return
    setAddingDecision(true)
    try {
      const d = await createDecision(user.id, selectedDetail.id, newDecisionTitle.trim())
      setSelectedDetail(prev => prev ? { ...prev, decisions: [...(prev.decisions || []), d] } : prev)
      setNewDecisionTitle('')
    } finally {
      setAddingDecision(false)
    }
  }

  async function handleDeleteDecision(id: string) {
    await deleteDecision(id)
    setSelectedDetail(prev => prev ? { ...prev, decisions: prev.decisions?.filter(d => d.id !== id) } : prev)
  }

  async function handleAddAction() {
    if (!user || !selectedDetail || !newActionTitle.trim()) return
    setAddingAction(true)
    try {
      const a = await createAction({
        user_id: user.id,
        title: newActionTitle.trim(),
        meeting_id: selectedDetail.id,
        status: 'open',
        priority: 'medium',
      })
      setSelectedDetail(prev => prev ? { ...prev, actions: [...(prev.actions || []), a as V2Action] } : prev)
      setNewActionTitle('')
    } finally {
      setAddingAction(false)
    }
  }

  const filtered = meetings.filter(m => !search || m.title.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <PageSpinner />

  return (
    <div className="h-full flex flex-col">
      <PanelGroup direction="horizontal" className="flex-1">
        {/* Left: List */}
        <Panel defaultSize={35} minSize={20} maxSize={60}>
          <div className="h-full flex flex-col border-r border-[var(--border)]">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] space-y-3 shrink-0">
              <div className="flex items-center gap-2">
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('common.search') + '...'}
                  icon={<Search className="h-4 w-4" />}
                  containerClassName="flex-1"
                />
                <Button onClick={openNew} size="sm" icon={<Plus className="h-4 w-4" />}>
                  {t('common.new')}
                </Button>
              </div>
            </div>

            {/* Meeting list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-muted)]">{t('meetings.noMeetings')}</p>
                </div>
              ) : (
                filtered.map(meeting => (
                  <button
                    key={meeting.id}
                    onClick={() => selectMeeting(meeting)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl transition-colors',
                      selected?.id === meeting.id
                        ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                        : 'hover:bg-[var(--bg-page)] border border-transparent',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm text-[var(--text-primary)] truncate">{meeting.title}</p>
                      <ChevronRight className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(meeting.date, 'EEE dd MMM yyyy', i18n.language)}</span>
                      {meeting.start_time && (
                        <>
                          <Clock className="h-3 w-3" />
                          <span>{meeting.start_time.slice(0, 5)}</span>
                        </>
                      )}
                    </div>
                    {meeting.tags && meeting.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {meeting.tags.slice(0, 3).map(tag => (
                          <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />
                        ))}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </Panel>

        <PanelResizeHandle />

        {/* Right: Detail / Edit */}
        <Panel defaultSize={65} minSize={40}>
          <div className="h-full flex flex-col overflow-hidden">
            {selected || editMode ? (
              <div className="h-full flex flex-col">
                {/* Detail header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
                  <h2 className="font-semibold text-[var(--text-primary)] truncate">
                    {editMode ? (selected ? t('meetings.editMeeting') : t('meetings.newMeeting')) : selected?.title}
                  </h2>
                  <div className="flex items-center gap-2 shrink-0">
                    {selected && !editMode && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setEditMode(true)} icon={<Pencil className="h-4 w-4" />}>
                          {t('common.edit')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteModal(selected.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {selected && (
                      <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setSelectedDetail(null); setEditMode(false) }}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {editMode ? (
                    /* Edit form */
                    <div className="p-6 space-y-4">
                      <Input
                        label={t('meetings.meetingTitle')}
                        value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        required autoFocus
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <Input label={t('meetings.date')} type="date" value={form.date}
                          onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                        <Input label={t('meetings.startTime')} type="time" value={form.start_time}
                          onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
                        <Input label={t('meetings.endTime')} type="time" value={form.end_time}
                          onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
                      </div>
                      <Input
                        label={t('meetings.location')}
                        value={form.location}
                        onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                        placeholder={t('meetings.locationPlaceholder')}
                      />
                      <Input
                        label={t('meetings.participants')}
                        value={form.participants}
                        onChange={e => setForm(f => ({ ...f, participants: e.target.value }))}
                        placeholder={t('meetings.participantsPlaceholder')}
                      />
                      <div className="relative">
                        <TagSelector
                          allTags={tags}
                          selectedTagIds={form.tag_ids}
                          onChange={ids => setForm(f => ({ ...f, tag_ids: ids }))}
                          label={t('common.labels')}
                        />
                      </div>
                      <Textarea
                        label={t('meetings.notes')}
                        value={form.notes}
                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        rows={6}
                        placeholder={t('meetings.notesPlaceholder')}
                        className="min-h-40"
                      />
                      <div className="flex gap-2 justify-end pt-2">
                        <Button variant="secondary" onClick={() => { setEditMode(false); if (!selected) { setSelected(null) } }}>
                          {t('common.cancel')}
                        </Button>
                        <Button onClick={handleSave} loading={saving} disabled={!form.title || !form.date}>
                          {t('common.save')}
                        </Button>
                      </div>
                    </div>
                  ) : selectedDetail ? (
                    /* View mode with decisions + actions */
                    <PanelGroup direction="vertical" className="h-full">
                      <Panel defaultSize={60} minSize={30}>
                        <div className="h-full overflow-y-auto p-6 space-y-4">
                          {/* Meeting info */}
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <div>
                              <p className="text-xs text-[var(--text-muted)] mb-0.5">{t('meetings.date')}</p>
                              <p className="text-[var(--text-primary)] flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                                {formatDate(selectedDetail.date, 'EEEE dd MMMM yyyy', i18n.language)}
                              </p>
                            </div>
                            {(selectedDetail.start_time || selectedDetail.end_time) && (
                              <div>
                                <p className="text-xs text-[var(--text-muted)] mb-0.5">{t('common.time')}</p>
                                <p className="text-[var(--text-primary)] flex items-center gap-1.5">
                                  <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                                  {selectedDetail.start_time?.slice(0, 5)}
                                  {selectedDetail.end_time && ` - ${selectedDetail.end_time.slice(0, 5)}`}
                                </p>
                              </div>
                            )}
                            {selectedDetail.location && (
                              <div>
                                <p className="text-xs text-[var(--text-muted)] mb-0.5">{t('meetings.location')}</p>
                                <p className="text-[var(--text-primary)] flex items-center gap-1.5">
                                  <MapPin className="h-4 w-4 text-[var(--text-muted)]" />
                                  {selectedDetail.location}
                                </p>
                              </div>
                            )}
                            {selectedDetail.participants && (
                              <div>
                                <p className="text-xs text-[var(--text-muted)] mb-0.5">{t('meetings.participants')}</p>
                                <p className="text-[var(--text-primary)] flex items-center gap-1.5">
                                  <Users className="h-4 w-4 text-[var(--text-muted)]" />
                                  {selectedDetail.participants}
                                </p>
                              </div>
                            )}
                          </div>

                          {selectedDetail.tags && selectedDetail.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {selectedDetail.tags.map(tag => (
                                <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                              ))}
                            </div>
                          )}

                          {selectedDetail.notes && (
                            <div>
                              <p className="text-xs text-[var(--text-muted)] mb-1">{t('meetings.notes')}</p>
                              <div className="bg-[var(--bg-page)] rounded-lg p-3 text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                                {selectedDetail.notes}
                              </div>
                            </div>
                          )}
                        </div>
                      </Panel>

                      <PanelResizeHandle />

                      <Panel defaultSize={40} minSize={20}>
                        <div className="h-full overflow-y-auto p-6">
                          <PanelGroup direction="horizontal">
                            {/* Decisions */}
                            <Panel defaultSize={50} minSize={30}>
                              <div className="pr-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">{t('meetings.decisions')}</h3>
                                </div>
                                <div className="flex gap-1.5">
                                  <Input
                                    value={newDecisionTitle}
                                    onChange={e => setNewDecisionTitle(e.target.value)}
                                    placeholder={t('meetings.addDecision') + '...'}
                                    onKeyDown={e => e.key === 'Enter' && handleAddDecision()}
                                    className="text-xs h-8"
                                  />
                                  <Button size="sm" onClick={handleAddDecision} loading={addingDecision}
                                    disabled={!newDecisionTitle.trim()} className="h-8 px-2">
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="space-y-1.5">
                                  {(selectedDetail.decisions || []).length === 0 ? (
                                    <p className="text-xs text-[var(--text-muted)]">{t('meetings.noDecisions')}</p>
                                  ) : (
                                    (selectedDetail.decisions || []).map((d: V2Decision) => (
                                      <div key={d.id} className="flex items-start gap-2 group">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                                        <p className="flex-1 text-sm text-[var(--text-primary)]">{d.title}</p>
                                        <button onClick={() => handleDeleteDecision(d.id)}
                                          className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-500 transition-all">
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </Panel>

                            <PanelResizeHandle />

                            {/* Actions */}
                            <Panel defaultSize={50} minSize={30}>
                              <div className="pl-4 space-y-3">
                                <h3 className="font-semibold text-sm text-[var(--text-primary)]">{t('meetings.linkedActions')}</h3>
                                <div className="flex gap-1.5">
                                  <Input
                                    value={newActionTitle}
                                    onChange={e => setNewActionTitle(e.target.value)}
                                    placeholder={t('actions.newAction') + '...'}
                                    onKeyDown={e => e.key === 'Enter' && handleAddAction()}
                                    className="text-xs h-8"
                                  />
                                  <Button size="sm" onClick={handleAddAction} loading={addingAction}
                                    disabled={!newActionTitle.trim()} className="h-8 px-2">
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="space-y-1.5">
                                  {(selectedDetail.actions || []).length === 0 ? (
                                    <p className="text-xs text-[var(--text-muted)]">{t('meetings.noLinkedActions')}</p>
                                  ) : (
                                    (selectedDetail.actions || []).map((a: V2Action) => (
                                      <div key={a.id} className="flex items-center gap-2">
                                        <div className={cn(
                                          'w-1.5 h-1.5 rounded-full shrink-0',
                                          a.status === 'done' ? 'bg-green-500' : 'bg-amber-500',
                                        )} />
                                        <p className={cn(
                                          'text-sm text-[var(--text-primary)]',
                                          a.status === 'done' && 'line-through text-[var(--text-muted)]',
                                        )}>{a.title}</p>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </Panel>
                          </PanelGroup>
                        </div>
                      </Panel>
                    </PanelGroup>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <PageSpinner />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Users className="h-16 w-16 text-[var(--text-muted)] mb-4" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  {t('meetings.title')}
                </h3>
                <p className="text-[var(--text-muted)] text-sm mb-4 max-w-xs">
                  Selecteer een vergadering uit de lijst of maak een nieuwe aan.
                </p>
                <Button onClick={openNew} icon={<Plus className="h-4 w-4" />}>
                  {t('meetings.newMeeting')}
                </Button>
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>

      <ConfirmModal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title={t('common.delete')}
        message={t('common.deleteConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleting}
      />
    </div>
  )
}
