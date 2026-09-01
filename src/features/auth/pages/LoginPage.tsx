import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Zap, Lock, Mail, AlertCircle, Info } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { loginSchema, type LoginFormData } from '@/types'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

export const LoginPage: React.FC = () => {
  const { signIn, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const {
    register,
    handleSubmit,
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
        // Humanized Portuguese error messages
        const message = error.message.toLowerCase()
        if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
          setAuthError('Credenciais inválidas. Verifique o seu e-mail e palavra-passe.')
        } else if (message.includes('email not confirmed')) {
          setAuthError('O e-mail da sua conta ainda não foi confirmado no Supabase.')
        } else {
          setAuthError(error.message || 'Erro ao autenticar. Por favor, tente novamente.')
        }
        setIsSubmitting(false)
        return
      }

      // Check if user came from a protected route
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

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle background glow effect */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#064B88]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#1463FF]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#064B88] text-[#1463FF] border border-[#1463FF]/30 shadow-lg shadow-blue-950/50 mb-4">
            <Zap className="w-7 h-7 fill-[#1463FF] text-[#1463FF]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Blue Bolt <span className="text-[#1463FF]">Page Studio</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Plataforma interna de gestão e criação de páginas
          </p>
        </div>

        {!isConfigured && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Configuração do Supabase Pendente</p>
              <p className="mt-1 text-amber-200/90 leading-relaxed">
                As variáveis de ambiente no ficheiro <code className="px-1 py-0.5 bg-amber-950/60 rounded">.env</code> ainda não contêm as credenciais do seu projeto Supabase. Configure <code className="px-1 py-0.5 bg-amber-950/60 rounded">VITE_SUPABASE_URL</code> e <code className="px-1 py-0.5 bg-amber-950/60 rounded">VITE_SUPABASE_ANON_KEY</code>.
              </p>
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

        {/* Footer info */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-500">
            Acesso restrito à equipa da Blue Bolt Agency &bull; Versão 1.0.0
          </p>
        </div>
      </div>
    </div>
  )
}
