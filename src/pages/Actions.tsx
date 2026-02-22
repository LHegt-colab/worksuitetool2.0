import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Filter, CheckSquare2, Circle, AlertCircle, Pencil, Trash2, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import { TagBadge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import Textarea from '@/components/ui/Textarea'
import { getActions, createAction, updateAction, deleteAction, markActionDone, type CreateActionInput } from '@/features/actions/api'
import { getTags } from '@/features/tags/api'
import TagSelector from '@/features/tags/TagSelector'
import type { V2Action, V2Tag } from '@/types/database.types'
import { cn, priorityBgColor, statusBgColor, formatDate, isOverdue } from '@/lib/utils'

export default function Actions() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const [actions, setActions] = useState<V2Action[]>([])
  const [tags, setTags] = useState<V2Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAction, setEditingAction] = useState<V2Action | null>(null)
  const [deleteModal, setDeleteModal] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    start_date: '',
    due_date: '',
    tag_ids: [] as string[],
  })

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [a, tgs] = await Promise.all([getActions(user.id), getTags(user.id)])
      setActions(a)
      setTags(tgs)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  // Open edit modal if id in URL
  useEffect(() => {
    const id = searchParams.get('id')
    if (id && actions.length > 0) {
      const action = actions.find(a => a.id === id)
      if (action) openEdit(action)
    }
  }, [searchParams, actions])

  function openNew() {
    setEditingAction(null)
    setForm({ title: '', description: '', status: 'open', priority: 'medium', start_date: '', due_date: '', tag_ids: [] })
    setModalOpen(true)
  }

  function openEdit(action: V2Action) {
    setEditingAction(action)
    setForm({
      title: action.title,
      description: action.description || '',
      status: action.status,
      priority: action.priority,
      start_date: action.start_date || '',
      due_date: action.due_date || '',
      tag_ids: action.tags?.map(t => t.id) || [],
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!user || !form.title.trim()) return
    setSaving(true)
    try {
      if (editingAction) {
        await updateAction(editingAction.id, {
          ...form,
          start_date: form.start_date || null,
          due_date: form.due_date || null,
        })
      } else {
        await createAction({
          user_id: user.id,
          ...form,
          start_date: form.start_date || null,
          due_date: form.due_date || null,
        } as CreateActionInput)
      }
      setModalOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteModal) return
    setDeleting(true)
    try {
      await deleteAction(deleteModal)
      setDeleteModal(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  async function handleMarkDone(id: string) {
    await markActionDone(id)
    load()
  }

  const filtered = actions.filter(a => {
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && a.status !== statusFilter) return false
    if (priorityFilter && a.priority !== priorityFilter) return false
    return true
  })

  const statusOptions = [
    { value: '', label: t('common.all') },
    { value: 'open', label: t('actions.status.open') },
    { value: 'in_progress', label: t('actions.status.in_progress') },
    { value: 'done', label: t('actions.status.done') },
    { value: 'cancelled', label: t('actions.status.cancelled') },
  ]

  const priorityOptions = [
    { value: '', label: t('common.all') },
    { value: 'urgent', label: t('actions.priority.urgent') },
    { value: 'high', label: t('actions.priority.high') },
    { value: 'medium', label: t('actions.priority.medium') },
    { value: 'low', label: t('actions.priority.low') },
  ]

  if (loading) return <PageSpinner />

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('common.search') + '...'}
          icon={<Search className="h-4 w-4" />}
          containerClassName="flex-1"
        />
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          containerClassName="w-full sm:w-40"
        />
        <Select
          options={priorityOptions}
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          containerClassName="w-full sm:w-40"
        />
        <Button onClick={openNew} icon={<Plus className="h-4 w-4" />}>
          {t('actions.newAction')}
        </Button>
      </div>

      {/* Actions list */}
      {filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <CheckSquare2 className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-muted)]">{t('actions.noActions')}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={openNew}>
              + {t('actions.newAction')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(action => {
            const overdue = isOverdue(action.due_date) && action.status !== 'done' && action.status !== 'cancelled'
            return (
              <Card key={action.id} padding="sm" className="group">
                <div className="flex items-start gap-3">
                  {/* Status checkbox */}
                  <button
                    onClick={() => action.status !== 'done' && handleMarkDone(action.id)}
                    className={cn(
                      'mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                      action.status === 'done'
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-[var(--border-strong)] hover:border-green-400',
                    )}
                    title={action.status === 'done' ? '' : t('actions.markDone')}
                  >
                    {action.status === 'done' && <Check className="h-3 w-3" />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        'font-medium text-sm text-[var(--text-primary)]',
                        action.status === 'done' && 'line-through text-[var(--text-muted)]',
                      )}>
                        {action.title}
                      </p>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="xs" onClick={() => openEdit(action)}
                          className="h-6 w-6 p-0">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="xs" onClick={() => setDeleteModal(action.id)}
                          className="h-6 w-6 p-0 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {action.description && (
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{action.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded-full', priorityBgColor(action.priority))}>
                        {t(`actions.priority.${action.priority}`)}
                      </span>
                      <span className={cn('text-xs px-1.5 py-0.5 rounded-full', statusBgColor(action.status))}>
                        {t(`actions.status.${action.status}`)}
                      </span>
                      {action.due_date && (
                        <span className={cn(
                          'text-xs flex items-center gap-1',
                          overdue ? 'text-red-500 font-medium' : 'text-[var(--text-muted)]',
                        )}>
                          {overdue && <AlertCircle className="h-3 w-3" />}
                          {formatDate(action.due_date, 'dd MMM yyyy', i18n.language)}
                        </span>
                      )}
                      {action.tags?.map(tag => (
                        <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Action Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAction ? t('actions.editAction') : t('actions.newAction')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.title.trim()}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('common.title')}
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
            autoFocus
          />
          <Textarea
            label={t('common.description')}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('common.status')}
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              options={[
                { value: 'open', label: t('actions.status.open') },
                { value: 'in_progress', label: t('actions.status.in_progress') },
                { value: 'done', label: t('actions.status.done') },
                { value: 'cancelled', label: t('actions.status.cancelled') },
              ]}
            />
            <Select
              label={t('common.priority')}
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              options={[
                { value: 'low', label: t('actions.priority.low') },
                { value: 'medium', label: t('actions.priority.medium') },
                { value: 'high', label: t('actions.priority.high') },
                { value: 'urgent', label: t('actions.priority.urgent') },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('actions.startDate')}
              type="date"
              value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
            />
            <Input
              label={t('actions.dueDate')}
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            />
          </div>
          <div className="relative">
            <TagSelector
              allTags={tags}
              selectedTagIds={form.tag_ids}
              onChange={ids => setForm(f => ({ ...f, tag_ids: ids }))}
              label={t('common.labels')}
            />
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
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
