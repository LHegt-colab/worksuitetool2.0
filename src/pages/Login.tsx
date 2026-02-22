import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BriefcaseBusiness, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export default function Login() {
  const { t } = useTranslation()
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error)
        } else {
          navigate('/')
        }
      } else {
        const { error } = await signUp(email, password, fullName)
        if (error) {
          setError(error)
        } else {
          setSuccess('Account aangemaakt! Controleer je e-mail om je account te bevestigen.')
          setMode('login')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg-page)]">
      {/* Left panel - branding */}
      <div className="hidden lg:flex w-1/2 bg-[var(--bg-sidebar)] flex-col items-center justify-center p-12">
        <div className="max-w-sm text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-primary-500 rounded-xl p-3">
              <BriefcaseBusiness className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">WorkSuite</h1>
          <p className="text-xl text-white/80 mb-2">Tool 2.0</p>
          <p className="text-white/50 text-sm leading-relaxed">
            {t('auth.workSuiteDesc')}
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4 text-left">
            {[
              { icon: '📅', label: 'Agenda & Vergaderingen' },
              { icon: '✅', label: 'Acties bijhouden' },
              { icon: '📖', label: 'Dagboek & Weekrapport' },
              { icon: '📚', label: 'Kennisbank' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 text-white/70">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="bg-primary-600 rounded-xl p-2.5">
              <BriefcaseBusiness className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-[var(--text-primary)]">WorkSuite 2.0</span>
          </div>

          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-lg)] p-8">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
              {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
            </h2>
            <p className="text-[var(--text-secondary)] mb-6 text-sm">
              {mode === 'login' ? t('auth.workSuiteDesc') : 'Maak een nieuw account aan om te beginnen.'}
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <Input
                  label={t('auth.fullName')}
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  icon={<User className="h-4 w-4" />}
                  required
                  autoComplete="name"
                />
              )}

              <Input
                label={t('auth.email')}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
                required
                autoComplete="email"
              />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  {t('auth.password')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    minLength={6}
                    className={cn(
                      'w-full rounded-lg border bg-[var(--bg-card)] text-[var(--text-primary)]',
                      'border-[var(--border)] pl-9 pr-9 py-2 text-sm h-9',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" loading={loading} className="w-full mt-6" size="lg">
                {mode === 'login' ? t('auth.login') : t('auth.createAccount')}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-[var(--text-secondary)]">
              {mode === 'login' ? (
                <>
                  {t('auth.noAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError('') }}
                    className="text-primary-500 hover:text-primary-600 font-medium transition-colors"
                  >
                    {t('auth.register')}
                  </button>
                </>
              ) : (
                <>
                  {t('auth.hasAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError('') }}
                    className="text-primary-500 hover:text-primary-600 font-medium transition-colors"
                  >
                    {t('auth.login')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
