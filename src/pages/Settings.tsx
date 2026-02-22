import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Sun, Moon, Monitor, Globe, Plus, Pencil, Trash2, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { changeLanguage, supportedLanguages, type SupportedLanguage } from '@/i18n/index'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import { TagBadge } from '@/components/ui/Badge'
import { getTags, createTag, updateTag, deleteTag } from '@/features/tags/api'
import type { V2Tag } from '@/types/database.types'
import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#f59e0b', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6',
]

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { user, profile, updateProfile } = useAuth()
  const { theme, setTheme } = useTheme()

  const [tags, setTags] = useState<V2Tag[]>([])
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Tag modal
  const [tagModal, setTagModal] = useState(false)
  const [editingTag, setEditingTag] = useState<V2Tag | null>(null)
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState('#6366f1')
  const [savingTag, setSavingTag] = useState(false)
  const [deleteTagModal, setDeleteTagModal] = useState<string | null>(null)
  const [deletingTag, setDeletingTag] = useState(false)

  useEffect(() => {
    if (user) loadTags()
    if (profile?.full_name) setFullName(profile.full_name)
  }, [user, profile])

  async function loadTags() {
    if (!user) return
    const t = await getTags(user.id)
    setTags(t)
  }

  async function saveProfile() {
    setSaving(true)
    try {
      await updateProfile({ full_name: fullName, language: i18n.language, theme })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  function handleLangChange(lang: SupportedLanguage) {
    changeLanguage(lang)
    updateProfile({ language: lang })
  }

  function handleThemeChange(t: Theme) {
    setTheme(t)
    updateProfile({ theme: t })
  }

  function openNewTag() {
    setEditingTag(null)
    setTagName('')
    setTagColor('#6366f1')
    setTagModal(true)
  }

  function openEditTag(tag: V2Tag) {
    setEditingTag(tag)
    setTagName(tag.name)
    setTagColor(tag.color)
    setTagModal(true)
  }

  async function handleSaveTag() {
    if (!user || !tagName.trim()) return
    setSavingTag(true)
    try {
      if (editingTag) {
        await updateTag(editingTag.id, { name: tagName.trim(), color: tagColor })
      } else {
        await createTag(user.id, tagName.trim(), tagColor)
      }
      setTagModal(false)
      loadTags()
    } finally {
      setSavingTag(false)
    }
  }

  async function handleDeleteTag() {
    if (!deleteTagModal) return
    setDeletingTag(true)
    try {
      await deleteTag(deleteTagModal)
      setDeleteTagModal(null)
      loadTags()
    } finally {
      setDeletingTag(false)
    }
  }

  const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: t('settings.themes.light') },
    { value: 'dark', icon: Moon, label: t('settings.themes.dark') },
    { value: 'system', icon: Monitor, label: t('settings.themes.system') },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      {/* Profile */}
      <Card>
        <h2 className="font-semibold text-[var(--text-primary)] mb-4">{t('settings.profile')}</h2>
        <div className="space-y-4">
          <Input
            label={t('settings.fullName')}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
          />
          <Input
            label={t('settings.email')}
            value={user?.email || ''}
            disabled
            hint="E-mailadres kan niet worden gewijzigd"
          />
          <Button onClick={saveProfile} loading={saving} icon={saved ? <Check className="h-4 w-4 text-green-500" /> : undefined}>
            {saved ? t('settings.settingsSaved') : t('settings.saveSettings')}
          </Button>
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <h2 className="font-semibold text-[var(--text-primary)] mb-4">{t('settings.appearance')}</h2>

        {/* Theme */}
        <div className="mb-5">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-2">{t('settings.theme')}</p>
          <p className="text-xs text-[var(--text-muted)] mb-3">{t('settings.themeDesc')}</p>
          <div className="flex gap-3">
            {themeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleThemeChange(opt.value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-all',
                  theme === opt.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                )}
              >
                <opt.icon className={cn('h-5 w-5', theme === opt.value ? 'text-primary-500' : 'text-[var(--text-secondary)]')} />
                <span className={cn('text-xs font-medium', theme === opt.value ? 'text-primary-600 dark:text-primary-400' : 'text-[var(--text-secondary)]')}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)] mb-2">{t('settings.language')}</p>
          <p className="text-xs text-[var(--text-muted)] mb-3">{t('settings.languageDesc')}</p>
          <div className="flex gap-3">
            {supportedLanguages.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleLangChange(lang.code)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-all',
                  i18n.language === lang.code
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                )}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className={cn(
                  'text-xs font-medium',
                  i18n.language === lang.code ? 'text-primary-600 dark:text-primary-400' : 'text-[var(--text-secondary)]',
                )}>
                  {lang.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Labels */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">{t('settings.manageLabels')}</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{t('settings.labelsDesc')}</p>
          </div>
          <Button size="sm" onClick={openNewTag} icon={<Plus className="h-4 w-4" />}>
            {t('tags.newTag')}
          </Button>
        </div>

        {tags.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-[var(--text-muted)]">{t('tags.noTags')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center gap-3 py-2 px-1 group">
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                <TagBadge name={tag.name} color={tag.color} />
                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="xs" onClick={() => openEditTag(tag)} className="h-6 w-6 p-0">
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="xs" onClick={() => setDeleteTagModal(tag.id)}
                    className="h-6 w-6 p-0 hover:text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tag modal */}
      <Modal
        open={tagModal}
        onClose={() => setTagModal(false)}
        title={editingTag ? t('tags.editTag') : t('tags.newTag')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTagModal(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveTag} loading={savingTag} disabled={!tagName.trim()}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('tags.tagName')}
            value={tagName}
            onChange={e => setTagName(e.target.value)}
            required autoFocus
          />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-2">{t('tags.tagColor')}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setTagColor(color)}
                  className={cn(
                    'w-7 h-7 rounded-full transition-transform hover:scale-110',
                    tagColor === color && 'ring-2 ring-offset-2 ring-[var(--border-strong)] scale-110',
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={tagColor}
                onChange={e => setTagColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border)]"
              />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: tagColor }} />
                <span className="text-sm text-[var(--text-secondary)]">{tagName || 'Voorbeeld'}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTagModal}
        onClose={() => setDeleteTagModal(null)}
        onConfirm={handleDeleteTag}
        title={t('common.delete')}
        message={t('common.deleteConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deletingTag}
      />
    </div>
  )
}
