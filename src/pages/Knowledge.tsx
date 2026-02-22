import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Library, ExternalLink, Pencil, Trash2, Filter } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import { TagBadge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import Select from '@/components/ui/Select'
import TagSelector from '@/features/tags/TagSelector'
import {
  getKnowledgePages, createKnowledgePage, updateKnowledgePage,
  deleteKnowledgePage, getKnowledgeCategories, type CreateKnowledgeInput
} from '@/features/knowledge/api'
import { getTags } from '@/features/tags/api'
import type { V2KnowledgePage, V2Tag } from '@/types/database.types'
import { cn, formatDate } from '@/lib/utils'

export default function Knowledge() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()

  const [pages, setPages] = useState<V2KnowledgePage[]>([])
  const [tags, setTags] = useState<V2Tag[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPage, setEditingPage] = useState<V2KnowledgePage | null>(null)
  const [viewPage, setViewPage] = useState<V2KnowledgePage | null>(null)
  const [deleteModal, setDeleteModal] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState({
    title: '',
    content: '',
    url: '',
    category: '',
    tag_ids: [] as string[],
  })

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [p, tgs, cats] = await Promise.all([
        getKnowledgePages(user.id),
        getTags(user.id),
        getKnowledgeCategories(user.id),
      ])
      setPages(p)
      setTags(tgs)
      setCategories(cats)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditingPage(null)
    setForm({ title: '', content: '', url: '', category: '', tag_ids: [] })
    setModalOpen(true)
  }

  function openEdit(page: V2KnowledgePage) {
    setEditingPage(page)
    setForm({
      title: page.title,
      content: page.content || '',
      url: page.url || '',
      category: page.category || '',
      tag_ids: page.tags?.map(t => t.id) || [],
    })
    setModalOpen(true)
    setViewPage(null)
  }

  async function handleSave() {
    if (!user || !form.title.trim()) return
    setSaving(true)
    try {
      if (editingPage) {
        await updateKnowledgePage(editingPage.id, {
          ...form,
          url: form.url || undefined,
          category: form.category || undefined,
        })
      } else {
        await createKnowledgePage({
          user_id: user.id,
          ...form,
          url: form.url || undefined,
          category: form.category || undefined,
        } as CreateKnowledgeInput)
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
      await deleteKnowledgePage(deleteModal)
      setDeleteModal(null)
      if (viewPage?.id === deleteModal) setViewPage(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  const categoryOptions = [
    { value: '', label: t('common.all') },
    ...categories.map(c => ({ value: c, label: c })),
  ]

  const filtered = pages.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) &&
        !p.content?.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter && p.category !== categoryFilter) return false
    return true
  })

  if (loading) return <PageSpinner />

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('knowledge.search') + '...'}
          icon={<Search className="h-4 w-4" />}
          containerClassName="flex-1"
        />
        {categories.length > 0 && (
          <Select
            options={categoryOptions}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            containerClassName="w-full sm:w-48"
          />
        )}
        <Button onClick={openNew} icon={<Plus className="h-4 w-4" />}>
          {t('knowledge.newPage')}
        </Button>
      </div>

      {/* Pages grid */}
      {filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Library className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-muted)]">{t('knowledge.noPages')}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={openNew}>
              + {t('knowledge.newPage')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(page => (
            <Card
              key={page.id}
              hover
              className="flex flex-col cursor-default group"
              onClick={() => setViewPage(page)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-tight flex-1 pr-2">
                  {page.title}
                </h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={e => { e.stopPropagation(); openEdit(page) }}
                    className="p-1 rounded hover:bg-[var(--bg-page)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); setDeleteModal(page.id) }}
                    className="p-1 rounded hover:bg-[var(--bg-page)] text-[var(--text-muted)] hover:text-red-500 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {page.content && (
                <p className="text-xs text-[var(--text-secondary)] line-clamp-3 mb-3 flex-1">
                  {page.content}
                </p>
              )}

              <div className="mt-auto space-y-2">
                {page.category && (
                  <span className="text-xs bg-[var(--bg-page)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full">
                    {page.category}
                  </span>
                )}

                {page.url && (
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 transition-colors truncate"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{page.url}</span>
                  </a>
                )}

                {page.tags && page.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {page.tags.map(tag => (
                      <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />
                    ))}
                  </div>
                )}

                <p className="text-xs text-[var(--text-muted)]">
                  {formatDate(page.updated_at, 'dd MMM yyyy', i18n.language)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View modal */}
      {viewPage && (
        <Modal
          open={!!viewPage}
          onClose={() => setViewPage(null)}
          title={viewPage.title}
          size="lg"
          footer={
            <Button variant="secondary" onClick={() => openEdit(viewPage)} icon={<Pencil className="h-4 w-4" />}>
              {t('common.edit')}
            </Button>
          }
        >
          <div className="space-y-4">
            {viewPage.category && (
              <span className="inline-block text-xs bg-[var(--bg-page)] text-[var(--text-secondary)] px-2 py-1 rounded-full">
                {viewPage.category}
              </span>
            )}
            {viewPage.url && (
              <a href={viewPage.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary-500 hover:underline">
                <ExternalLink className="h-4 w-4" />
                {viewPage.url}
              </a>
            )}
            {viewPage.content && (
              <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                {viewPage.content}
              </div>
            )}
            {viewPage.tags && viewPage.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {viewPage.tags.map(tag => <TagBadge key={tag.id} name={tag.name} color={tag.color} />)}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Edit/Create modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPage ? t('knowledge.editPage') : t('knowledge.newPage')}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.title.trim()}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label={t('knowledge.pageTitle')} value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('knowledge.url')} value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder={t('knowledge.urlPlaceholder')} type="url" />
            <Input label={t('common.category')} value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              placeholder="bijv. Werk, Persoonlijk, Techniek" />
          </div>
          <Textarea label={t('knowledge.content')} value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder={t('knowledge.contentPlaceholder')} rows={8} />
          <div className="relative">
            <TagSelector allTags={tags} selectedTagIds={form.tag_ids}
              onChange={ids => setForm(f => ({ ...f, tag_ids: ids }))} label={t('common.labels')} />
          </div>
        </div>
      </Modal>

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
