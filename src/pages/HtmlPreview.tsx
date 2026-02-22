import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Code2, Copy, Trash2, Check, Maximize2, Minimize2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export default function HtmlPreview() {
  const { t } = useTranslation()
  const [html, setHtml] = useState('')
  const [copied, setCopied] = useState(false)
  const [previewFull, setPreviewFull] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  async function copyCode() {
    await navigator.clipboard.writeText(html)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const previewDoc = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui, sans-serif; padding: 16px; margin: 0; color: #1e293b; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
${html}
</body>
</html>`

  if (previewFull) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)] shrink-0">
          <h2 className="font-semibold text-[var(--text-primary)]">{t('htmlPreview.previewLabel')}</h2>
          <Button variant="ghost" size="sm" onClick={() => setPreviewFull(false)}
            icon={<Minimize2 className="h-4 w-4" />}>
            {t('common.close')}
          </Button>
        </div>
        <iframe
          ref={iframeRef}
          srcDoc={previewDoc}
          title="HTML Preview"
          className="flex-1 w-full bg-white"
          sandbox="allow-scripts"
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PanelGroup direction="horizontal" className="flex-1">
        {/* Left: Code input */}
        <Panel defaultSize={50} minSize={20}>
          <div className="h-full flex flex-col border-r border-[var(--border)]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)] shrink-0">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">{t('htmlPreview.inputLabel')}</span>
              </div>
              <div className="flex items-center gap-2">
                {html && (
                  <Button variant="ghost" size="sm" onClick={copyCode}
                    icon={copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}>
                    {copied ? t('htmlPreview.copied') : t('htmlPreview.copyCode')}
                  </Button>
                )}
                {html && (
                  <Button variant="ghost" size="sm" onClick={() => setHtml('')}
                    icon={<Trash2 className="h-4 w-4" />}>
                    {t('htmlPreview.clear')}
                  </Button>
                )}
              </div>
            </div>

            {/* Textarea */}
            <div className="flex-1 overflow-hidden">
              <textarea
                value={html}
                onChange={e => setHtml(e.target.value)}
                placeholder={t('htmlPreview.placeholder')}
                spellCheck={false}
                className={cn(
                  'w-full h-full resize-none font-mono text-sm',
                  'bg-[var(--bg-page)] text-[var(--text-primary)]',
                  'placeholder:text-[var(--text-muted)]',
                  'p-4 focus:outline-none',
                  'border-0',
                )}
                style={{ tabSize: 2 }}
              />
            </div>
          </div>
        </Panel>

        <PanelResizeHandle />

        {/* Right: Preview */}
        <Panel defaultSize={50} minSize={20}>
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)] shrink-0">
              <span className="text-sm font-medium text-[var(--text-primary)]">{t('htmlPreview.previewLabel')}</span>
              <Button variant="ghost" size="sm" onClick={() => setPreviewFull(true)}
                icon={<Maximize2 className="h-4 w-4" />}>
                {t('htmlPreview.fullscreen')}
              </Button>
            </div>

            {/* iFrame preview */}
            {html ? (
              <iframe
                ref={iframeRef}
                srcDoc={previewDoc}
                title="HTML Preview"
                className="flex-1 w-full bg-white"
                sandbox="allow-scripts"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-[var(--bg-page)]">
                <div className="text-center">
                  <Code2 className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-muted)]">
                    Plak HTML code links om een voorbeeld te zien
                  </p>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}
