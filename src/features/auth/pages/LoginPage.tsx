import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { loginSchema, type LoginFormData } from '@/types'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [showPassword, setShowPassword] = useState<boolean>(false)

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
        setAuthError(error.message || 'Credenciais inválidas. Verifique o seu e-mail e palavra-passe.')
        setIsSubmitting(false)
        return
      }

      // Redirect user upon successful authentication
      const origin = (location.state as { from?: { pathname: string } })?.from?.pathname
      if (origin && origin !== '/login') {
        navigate(origin, { replace: true })
      } else {
        navigate('/user', { replace: true })
      }
    } catch (err: unknown) {
      if (import.meta.env.DEV) {
        console.error('Technical login error details:', err)
      }
      setAuthError('Não foi possível iniciar sessão. Tente novamente ou contacte o administrador.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#05192D] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle background glow effect */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#064B88]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#1463FF]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-18 h-18 rounded-2xl bg-white/10 border border-white/20 shadow-2xl p-2.5 mb-4 backdrop-blur-md">
            <img
              src="/logo.png"
              alt="Blue Bolt Logo"
              className="w-full h-full object-contain filter drop-shadow-md"
            />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Blue Bolt <span className="text-[#1463FF]">Page Studio</span>
          </h1>
          <p className="text-xs text-slate-300 font-medium mt-1.5">
            Plataforma interna de gestão e criação de páginas
          </p>
        </div>

        {/* Clean, high-contrast white card */}
        <Card className="bg-white border-slate-200 shadow-2xl rounded-[16px]">
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {authError && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{authError}</span>
                </div>
              )}

              <Input
                label="E-mail profissional"
                type="email"
                placeholder="colaborador@bluebolt.pt"
                autoComplete="email"
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                className="bg-slate-50 border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-[#1463FF] focus:ring-[#1463FF]/20"
                error={errors.email?.message}
                {...register('email')}
              />

              <div className="space-y-1.5">
                <Input
                  label="Palavra-passe"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-slate-400 hover:text-slate-700 focus:outline-none focus:text-[#1463FF] transition-colors p-1"
                      aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                      title={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  }
                  className="bg-slate-50 border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-[#1463FF] focus:ring-[#1463FF]/20"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <div className="flex justify-end pt-0.5">
                  <span
                    className="text-xs text-slate-500 cursor-not-allowed select-none font-medium hover:text-slate-700 transition-colors"
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
                  className="w-full py-3 text-sm font-bold bg-[#1463FF] hover:bg-[#0D4ED8] shadow-md hover:shadow-lg transition-all"
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
          <p className="text-xs text-slate-400">
            Acesso restrito à equipa da Blue Bolt Agency &bull; Versão 1.0.0
          </p>
        </div>
      </div>
    </div>
  )
}
