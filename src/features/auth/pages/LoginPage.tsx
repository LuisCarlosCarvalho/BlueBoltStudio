import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, Mail, AlertCircle, Database, CheckCircle2, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { loginSchema, type LoginFormData } from '@/types'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { api } from '@/lib/api'

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isInitializingDb, setIsInitializingDb] = useState<boolean>(false)
  const [dbInitMessage, setDbInitMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null)
    setIsSubmitting(true)

    try {
      const { error } = await signIn(data.email, data.password)

      if (error) {
        setAuthError(error.message || 'Erro ao autenticar. Por favor, tente novamente.')
        setIsSubmitting(false)
        return
      }

      // Redirect user
      const origin = (location.state as { from?: { pathname: string } })?.from?.pathname
      if (origin && origin !== '/login') {
        navigate(origin, { replace: true })
      } else {
        navigate('/user', { replace: true })
      }
    } catch (err: unknown) {
      console.error('Login error:', err)
      setAuthError('Ocorreu uma falha inesperada na autenticação. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInitDatabase = async () => {
    setIsInitializingDb(true)
    setDbInitMessage(null)
    setAuthError(null)

    try {
      const res = await api.initDatabase()
      setDbInitMessage(
        res.initialAdminCreated
          ? 'Base de dados inicializada! Utilizador inicial criado: admin@bluebolt.pt (Palavra-passe: BlueBoltAdmin2026!)'
          : 'Tabelas sincronizadas com sucesso!'
      )
      if (res.initialAdminCreated) {
        setValue('email', 'admin@bluebolt.pt')
        setValue('password', 'BlueBoltAdmin2026!')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao inicializar base de dados'
      setAuthError(message)
    } finally {
      setIsInitializingDb(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle background glow effect */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#064B88]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#1463FF]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 shadow-xl shadow-blue-950/60 p-2 mb-4 backdrop-blur-sm">
            <img
              src="/logo.png"
              alt="Blue Bolt Logo"
              className="w-full h-full object-contain drop-shadow"
            />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Blue Bolt <span className="text-[#1463FF]">Page Studio</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Plataforma interna de gestão e criação de páginas
          </p>
        </div>

        {dbInitMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-200">Sucesso na Base de Dados</p>
              <p className="mt-1 text-emerald-300/90 leading-relaxed">{dbInitMessage}</p>
            </div>
          </div>
        )}

        <Card className="bg-slate-800/90 border-slate-700 backdrop-blur-md shadow-2xl">
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {authError && (
                <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{authError}</span>
                </div>
              )}

              <Input
                label="E-mail profissional"
                type="email"
                placeholder="colaborador@bluebolt.pt"
                autoComplete="email"
                leftIcon={<Mail className="w-4 h-4" />}
                className="bg-slate-900/70 border-slate-700 text-white placeholder:text-slate-500 focus:border-[#1463FF]"
                error={errors.email?.message}
                {...register('email')}
              />

              <div className="space-y-1.5">
                <Input
                  label="Palavra-passe"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  leftIcon={<Lock className="w-4 h-4" />}
                  className="bg-slate-900/70 border-slate-700 text-white placeholder:text-slate-500 focus:border-[#1463FF]"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <div className="flex justify-end">
                  <span
                    className="text-xs text-slate-500 cursor-not-allowed select-none"
                    title="A recuperação de conta deve ser solicitada diretamente ao administrador da agência."
                  >
                    Esqueceu-se da palavra-passe?
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 text-sm font-semibold"
                  isLoading={isSubmitting}
                >
                  Entrar no Studio
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Database setup button if first run */}
        <div className="mt-4 text-center">
          <button
            onClick={handleInitDatabase}
            disabled={isInitializingDb}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors py-1 px-2.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800"
          >
            {isInitializingDb ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Database className="w-3.5 h-3.5 text-[#1463FF]" />
            )}
            <span>Sincronizar Tabelas da Base de Dados</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="text-center mt-4">
          <p className="text-xs text-slate-500">
            Acesso restrito à equipa da Blue Bolt Agency &bull; Versão 1.0.0
          </p>
        </div>
      </div>
    </div>
  )
}
