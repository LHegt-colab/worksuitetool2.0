import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Delete, RotateCcw, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

type CalcOp = '+' | '-' | '*' | '/'

const NOTES_KEY   = 'wst_calc_notes'
const HISTORY_KEY = 'wst_calc_history'

export default function Calculator() {
  const { t } = useTranslation()

  // ── Calculator state ─────────────────────────────────────────────────────
  const [display,        setDisplay]        = useState('0')
  const [prevValue,      setPrevValue]      = useState<number | null>(null)
  const [operation,      setOperation]      = useState<CalcOp | null>(null)
  const [waitForOperand, setWaitForOperand] = useState(false)
  const [memory,         setMemory]         = useState(0)
  const [historyLines,   setHistoryLines]   = useState<string[]>([])
  const [notes,          setNotes]          = useState('')
  const [justCopied,     setJustCopied]     = useState(false)

  useEffect(() => {
    const n = localStorage.getItem(NOTES_KEY)
    if (n) setNotes(n)
    try {
      const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
      if (Array.isArray(h)) setHistoryLines(h)
    } catch { /* ignore */ }
  }, [])

  function saveNotes(val: string) {
    setNotes(val)
    localStorage.setItem(NOTES_KEY, val)
  }

  function pushHistory(line: string) {
    setHistoryLines(prev => {
      const next = [line, ...prev].slice(0, 50)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      return next
    })
  }

  function clearHistory() {
    setHistoryLines([])
    localStorage.removeItem(HISTORY_KEY)
  }

  // ── Arithmetic ────────────────────────────────────────────────────────────
  function calc(a: number, b: number, op: CalcOp): number {
    switch (op) {
      case '+': return Math.round((a + b) * 1e10) / 1e10
      case '-': return Math.round((a - b) * 1e10) / 1e10
      case '*': return Math.round((a * b) * 1e10) / 1e10
      case '/': return b !== 0 ? Math.round((a / b) * 1e10) / 1e10 : 0
    }
  }

  const inputDigit = useCallback((d: string) => {
    setDisplay(prev => {
      if (waitForOperand) { setWaitForOperand(false); return d }
      return prev === '0' ? d : prev + d
    })
  }, [waitForOperand])

  function inputDecimal() {
    if (waitForOperand) { setDisplay('0.'); setWaitForOperand(false); return }
    if (!display.includes('.')) setDisplay(p => p + '.')
  }

  function handleOp(op: CalcOp) {
    const cur = parseFloat(display)
    if (prevValue !== null && !waitForOperand) {
      const result = calc(prevValue, cur, operation!)
      pushHistory(`${prevValue} ${operation} ${cur} = ${result}`)
      setDisplay(String(result))
      setPrevValue(result)
    } else {
      setPrevValue(cur)
    }
    setOperation(op)
    setWaitForOperand(true)
  }

  function handleEquals() {
    if (prevValue === null || operation === null) return
    const cur    = parseFloat(display)
    const result = calc(prevValue, cur, operation)
    pushHistory(`${prevValue} ${operation} ${cur} = ${result}`)
    setDisplay(String(result))
    setPrevValue(null)
    setOperation(null)
    setWaitForOperand(true)
  }

  function handleClear()     { setDisplay('0'); setPrevValue(null); setOperation(null); setWaitForOperand(false) }
  function handleBackspace()  { if (!waitForOperand) setDisplay(p => p.length > 1 ? p.slice(0, -1) : '0') }
  function handleNegate()     { setDisplay(p => String(parseFloat(p) * -1)) }
  function handlePercent()    { setDisplay(p => String(parseFloat(p) / 100)) }

  function memAdd()    { setMemory(m => m + parseFloat(display)) }
  function memSub()    { setMemory(m => m - parseFloat(display)) }
  function memRecall() { setDisplay(String(memory)); setWaitForOperand(false) }
  function memClear()  { setMemory(0) }

  function copyDisplayToNotes() {
    saveNotes(notes + (notes ? '\n' : '') + display)
    setJustCopied(true)
    setTimeout(() => setJustCopied(false), 1200)
  }

  // ── Keyboard support ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement) return
      if ('0123456789'.includes(e.key)) { inputDigit(e.key); return }
      if (e.key === '.')  { inputDecimal(); return }
      if (e.key === '+')  { handleOp('+'); return }
      if (e.key === '-')  { handleOp('-'); return }
      if (e.key === '*')  { handleOp('*'); return }
      if (e.key === '/')  { e.preventDefault(); handleOp('/'); return }
      if (e.key === 'Enter' || e.key === '=') { handleEquals(); return }
      if (e.key === 'Backspace') { handleBackspace(); return }
      if (e.key === 'Escape') { handleClear(); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display, prevValue, operation, waitForOperand, memory, inputDigit])

  // ── Button helpers ────────────────────────────────────────────────────────
  const base = 'flex items-center justify-center rounded-xl text-sm font-semibold h-12 transition-all active:scale-95 select-none cursor-pointer border border-transparent'
  const num  = `${base} bg-[var(--bg-page)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--border)]`
  const op   = `${base} bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50`
  const fn2  = `${base} bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600`
  const mem  = `${base} bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:bg-slate-200 text-xs`
  const eq   = `${base} bg-primary-500 hover:bg-primary-600 text-white`
  const del2 = `${base} bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200`

  const opSymbol = operation ? { '+': '+', '-': '−', '*': '×', '/': '÷' }[operation] : ''

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">{t('calculator.title')}</h2>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Calculator panel ─────────────────────────────────────────────── */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm w-full lg:w-72 shrink-0">

          {/* Display */}
          <div className="bg-[var(--bg-page)] rounded-xl px-4 py-3 mb-3 text-right">
            <div className="text-xs text-[var(--text-muted)] h-4 font-mono">
              {prevValue !== null ? `${prevValue} ${opSymbol}` : '\u00a0'}
            </div>
            <div
              className="text-3xl font-mono font-bold text-[var(--text-primary)] truncate mt-0.5"
              title={display}
            >
              {display}
            </div>
          </div>

          {/* Memory row */}
          <div className="grid grid-cols-4 gap-1.5 mb-1.5">
            {[
              { label: 'MC', fn: memClear },
              { label: 'MR', fn: memRecall },
              { label: 'M−', fn: memSub },
              { label: 'M+', fn: memAdd },
            ].map(b => (
              <button key={b.label} onClick={b.fn} className={mem}>{b.label}</button>
            ))}
          </div>
          {memory !== 0 && (
            <div className="text-center text-xs text-[var(--text-muted)] mb-1 font-mono">
              {t('calculator.memory')}: {memory}
            </div>
          )}

          {/* Main grid */}
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={handleClear}           className={del2}>AC</button>
            <button onClick={handleNegate}           className={fn2}>+/−</button>
            <button onClick={handlePercent}          className={fn2}>%</button>
            <button onClick={() => handleOp('/')}    className={op}>÷</button>

            <button onClick={() => inputDigit('7')}  className={num}>7</button>
            <button onClick={() => inputDigit('8')}  className={num}>8</button>
            <button onClick={() => inputDigit('9')}  className={num}>9</button>
            <button onClick={() => handleOp('*')}    className={op}>×</button>

            <button onClick={() => inputDigit('4')}  className={num}>4</button>
            <button onClick={() => inputDigit('5')}  className={num}>5</button>
            <button onClick={() => inputDigit('6')}  className={num}>6</button>
            <button onClick={() => handleOp('-')}    className={op}>−</button>

            <button onClick={() => inputDigit('1')}  className={num}>1</button>
            <button onClick={() => inputDigit('2')}  className={num}>2</button>
            <button onClick={() => inputDigit('3')}  className={num}>3</button>
            <button onClick={() => handleOp('+')}    className={op}>+</button>

            <button onClick={() => inputDigit('0')}  className={cn(num, 'col-span-2')}>0</button>
            <button onClick={inputDecimal}           className={num}>.</button>
            <button onClick={handleEquals}           className={eq}>=</button>
          </div>

          {/* Utility row */}
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            <button
              onClick={handleBackspace}
              className={cn(fn2, 'gap-1.5 text-xs')}
            >
              <Delete className="h-3.5 w-3.5" /> ⌫
            </button>
            <button
              onClick={copyDisplayToNotes}
              className={cn(
                base,
                'text-xs gap-1',
                justCopied
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100',
              )}
            >
              <Copy className="h-3 w-3" />
              {justCopied ? '✓' : t('calculator.copyToNotes')}
            </button>
          </div>
        </div>

        {/* ── Right panel: Notes + History ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Notes */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[var(--text-primary)] text-sm">{t('calculator.notes')}</h3>
              <button
                onClick={() => saveNotes('')}
                className="text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                {t('calculator.clearNotes')}
              </button>
            </div>
            <textarea
              value={notes}
              onChange={e => saveNotes(e.target.value)}
              placeholder={t('calculator.notesPlaceholder')}
              className={cn(
                'w-full resize-none text-sm p-3 rounded-lg font-mono',
                'border border-[var(--border)] bg-[var(--bg-page)]',
                'text-[var(--text-primary)] placeholder-[var(--text-muted)]',
                'focus:outline-none focus:ring-2 focus:ring-primary-500/40',
                'min-h-[180px]',
              )}
              style={{ height: 'calc(100% - 2.5rem)', minHeight: '180px' }}
            />
          </div>

          {/* History */}
          {historyLines.length > 0 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-[var(--text-primary)] text-sm">{t('calculator.history')}</h3>
                <button
                  onClick={clearHistory}
                  className="text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors"
                >
                  {t('calculator.clearHistory')}
                </button>
              </div>
              <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
                {historyLines.map((line, i) => (
                  <div
                    key={i}
                    className="text-xs font-mono text-[var(--text-secondary)] py-1 border-b border-[var(--border)] last:border-0"
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
