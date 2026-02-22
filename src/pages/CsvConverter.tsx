import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, Download, X, CheckCircle2, AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Card from '@/components/ui/Card'
import { cn } from '@/lib/utils'

type Separator = ',' | ';' | '\t' | '|'

function parseCsv(text: string, sep: Separator): string[][] {
  return text.split('\n')
    .filter(line => line.trim())
    .map(line => {
      // Handle quoted fields
      const result: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          inQuotes = !inQuotes
        } else if (ch === sep && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
      result.push(current.trim())
      return result
    })
}

export default function CsvConverter() {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState('')
  const [parsed, setParsed] = useState<string[][]>([])
  const [separator, setSeparator] = useState<Separator>(';')
  const [converting, setConverting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  function detectSeparator(text: string): Separator {
    const firstLine = text.split('\n')[0] || ''
    const counts: Record<string, number> = {
      ',': (firstLine.match(/,/g) || []).length,
      ';': (firstLine.match(/;/g) || []).length,
      '\t': (firstLine.match(/\t/g) || []).length,
      '|': (firstLine.match(/\|/g) || []).length,
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as Separator
  }

  function loadFile(f: File) {
    setFile(f)
    setSuccess(false)
    setError('')
    const reader = new FileReader()
    reader.onload = e => {
      const text = (e.target?.result as string) || ''
      setCsvText(text)
      const detectedSep = detectSeparator(text)
      setSeparator(detectedSep)
      const rows = parseCsv(text, detectedSep)
      setParsed(rows)
    }
    reader.readAsText(f, 'UTF-8')
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) loadFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) {
      loadFile(f)
    } else {
      setError('Alleen CSV bestanden worden ondersteund')
    }
  }

  function handleSeparatorChange(sep: Separator) {
    setSeparator(sep)
    if (csvText) {
      setParsed(parseCsv(csvText, sep))
    }
  }

  function convertAndDownload() {
    if (!parsed.length) return
    setConverting(true)
    setError('')
    try {
      const ws = XLSX.utils.aoa_to_sheet(parsed)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
      const filename = file ? file.name.replace(/\.csv$/i, '.xlsx') : 'converted.xlsx'
      XLSX.writeFile(wb, filename)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(t('csvConverter.error'))
    } finally {
      setConverting(false)
    }
  }

  function clearFile() {
    setFile(null)
    setCsvText('')
    setParsed([])
    setSuccess(false)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const sepOptions = [
    { value: ',', label: t('csvConverter.separators.comma') },
    { value: ';', label: t('csvConverter.separators.semicolon') },
    { value: '\t', label: t('csvConverter.separators.tab') },
    { value: '|', label: t('csvConverter.separators.pipe') },
  ]

  const headers = parsed[0] || []
  const rows = parsed.slice(1)

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      {/* Upload area */}
      {!file ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors',
            dragging
              ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/10'
              : 'border-[var(--border)] hover:border-primary-300 hover:bg-[var(--bg-card)]',
          )}
        >
          <Upload className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="font-medium text-[var(--text-primary)] mb-1">{t('csvConverter.uploadDesc')}</p>
          <p className="text-sm text-[var(--text-muted)]">CSV-bestanden worden automatisch herkend</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      ) : (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)] text-sm">{file.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {rows.length} {t('csvConverter.rows')} · {headers.length} {t('csvConverter.columns')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                options={sepOptions}
                value={separator}
                onChange={e => handleSeparatorChange(e.target.value as Separator)}
                containerClassName="w-44"
              />
              <button onClick={clearFile} className="p-1.5 rounded-lg hover:bg-[var(--bg-page)] text-[var(--text-muted)] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Status messages */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">{t('csvConverter.success')}</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          {/* Preview table */}
          {parsed.length > 0 && (
            <div className="overflow-auto max-h-72 rounded-xl border border-[var(--border)] mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--bg-page)] sticky top-0">
                    {headers.map((h, i) => (
                      <th key={i} className="text-left px-3 py-2 font-semibold text-[var(--text-primary)] border-b border-[var(--border)] whitespace-nowrap">
                        {h || `Kolom ${i + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((row, ri) => (
                    <tr key={ri} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-page)]">
                      {headers.map((_, ci) => (
                        <td key={ci} className="px-3 py-1.5 text-[var(--text-secondary)] whitespace-nowrap max-w-48 overflow-hidden text-ellipsis">
                          {row[ci] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rows.length > 20 && (
                    <tr>
                      <td colSpan={headers.length} className="px-3 py-2 text-center text-[var(--text-muted)]">
                        + {rows.length - 20} meer rijen...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <Button
            onClick={convertAndDownload}
            loading={converting}
            disabled={!parsed.length}
            icon={<Download className="h-4 w-4" />}
            size="lg"
          >
            {t('csvConverter.downloadButton')}
          </Button>
        </Card>
      )}
    </div>
  )
}
