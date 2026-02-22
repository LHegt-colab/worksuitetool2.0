import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isTomorrow, isPast, startOfWeek, endOfWeek, getISOWeek, getYear } from 'date-fns'
import { nl, enUS, sv } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDateFnsLocale(lang: string) {
  switch (lang) {
    case 'en': return enUS
    case 'sv': return sv
    default: return nl
  }
}

export function formatDate(date: string | Date, formatStr: string, lang = 'nl') {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, formatStr, { locale: getDateFnsLocale(lang) })
}

export function formatDateRelative(dateStr: string, lang = 'nl'): string {
  const date = new Date(dateStr)
  if (isToday(date)) return lang === 'nl' ? 'Vandaag' : lang === 'sv' ? 'Idag' : 'Today'
  if (isTomorrow(date)) return lang === 'nl' ? 'Morgen' : lang === 'sv' ? 'Imorgon' : 'Tomorrow'
  return formatDate(date, 'dd MMM yyyy', lang)
}

export function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  return isPast(new Date(dateStr + 'T23:59:59'))
}

export function getWeekNumber(date: Date): number {
  return getISOWeek(date)
}

export function getWeekYear(date: Date): number {
  return getYear(date)
}

export function getWeekRange(weekNumber: number, year: number, lang = 'nl') {
  // Get the monday of week
  const jan4 = new Date(year, 0, 4)
  const startOfFirstWeek = startOfWeek(jan4, { weekStartsOn: 1 })
  const weekStart = new Date(startOfFirstWeek.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000)
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  return {
    start: weekStart,
    end: weekEnd,
    label: `${formatDate(weekStart, 'dd MMM', lang)} - ${formatDate(weekEnd, 'dd MMM yyyy', lang)}`,
  }
}

export function priorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'text-red-600 dark:text-red-400'
    case 'high': return 'text-orange-600 dark:text-orange-400'
    case 'medium': return 'text-yellow-600 dark:text-yellow-400'
    case 'low': return 'text-green-600 dark:text-green-400'
    default: return 'text-gray-500 dark:text-gray-400'
  }
}

export function priorityBgColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  }
}

export function statusBgColor(status: string): string {
  switch (status) {
    case 'done': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'cancelled': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 line-through'
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return `rgba(99,102,241,${alpha})`
  return `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${alpha})`
}
