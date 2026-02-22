import type { ReactNode, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4 md:p-5',
  lg: 'p-5 md:p-6',
}

export default function Card({ children, padding = 'md', hover = false, className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        'bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-[var(--shadow)]',
        paddingClasses[padding],
        hover && 'transition-shadow hover:shadow-[var(--shadow-md)] cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  icon?: ReactNode
  iconColor?: string
}

export function CardHeader({ title, subtitle, action, icon, iconColor = 'bg-primary-600' }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className={cn('p-2 rounded-lg text-white', iconColor)}>
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  iconBg?: string
  trend?: { value: number; label: string }
}

export function StatCard({ title, value, subtitle, icon, iconBg = 'bg-primary-600' }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4">
      {icon && (
        <div className={cn('p-3 rounded-xl text-white shrink-0', iconBg)}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm text-[var(--text-secondary)] truncate">{title}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)] mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
      </div>
    </Card>
  )
}

export function EmptyCard({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <p className="text-[var(--text-muted)] text-sm mb-3">{message}</p>
      {action}
    </div>
  )
}
