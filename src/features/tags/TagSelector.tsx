import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Tag, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TagBadge } from '@/components/ui/Badge'
import type { V2Tag } from '@/types/database.types'

interface TagSelectorProps {
  allTags: V2Tag[]
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  label?: string
  onManageTags?: () => void
}

export default function TagSelector({ allTags, selectedTagIds, onChange, label, onManageTags }: TagSelectorProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id))

  function toggle(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
          {onManageTags && (
            <button
              type="button"
              onClick={onManageTags}
              className="text-xs text-primary-500 hover:text-primary-600 transition-colors"
            >
              {t('tags.manageLabels')}
            </button>
          )}
        </div>
      )}

      {/* Selected tags */}
      <div className="flex flex-wrap gap-1.5 min-h-8">
        {selectedTags.map(tag => (
          <TagBadge
            key={tag.id}
            name={tag.name}
            color={tag.color}
            onRemove={() => toggle(tag.id)}
          />
        ))}

        {/* Add tag button */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
            'border border-dashed border-[var(--border-strong)] text-[var(--text-muted)]',
            'hover:border-primary-400 hover:text-primary-500 transition-colors',
          )}
        >
          <Plus className="h-3 w-3" />
          <span>{t('tags.addLabel')}</span>
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          'absolute z-20 mt-1 bg-[var(--bg-card)] border border-[var(--border)]',
          'rounded-xl shadow-[var(--shadow-lg)] py-1 min-w-44 max-h-48 overflow-y-auto',
        )}
        style={{ top: '100%', left: 0 }}
        >
          {allTags.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[var(--text-muted)]">
              {t('tags.noTags')}
            </div>
          ) : (
            allTags.map(tag => {
              const selected = selectedTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggle(tag.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-page)] transition-colors text-left"
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="flex-1 text-sm text-[var(--text-primary)]">{tag.name}</span>
                  {selected && <Check className="h-3.5 w-3.5 text-primary-500 shrink-0" />}
                </button>
              )
            })
          )}
          {onManageTags && (
            <>
              <div className="border-t border-[var(--border)] my-1" />
              <button
                type="button"
                onClick={() => { onManageTags(); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-page)] transition-colors text-xs text-primary-500"
              >
                <Tag className="h-3.5 w-3.5" />
                {t('tags.manageLabels')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
