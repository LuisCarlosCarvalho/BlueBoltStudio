import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '../hooks/useAuth'

export const UnauthorizedPage: React.FC = () => {
  const { role } = useAuth()
  const homePath = role === 'admin' ? '/admin' : '/user'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-[16px] border border-slate-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5 border border-amber-100">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Acesso Não Autorizado
        </h1>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Esta área da plataforma está reservada exclusivamente a utilizadores com permissões de administração.
          Se necessita de acesso a este módulo, por favor contacte o administrador da agência Blue Bolt.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Voltar
          </Button>
          <Link to={homePath}>
            <Button
              variant="primary"
              leftIcon={<Home className="w-4 h-4" />}
            >
              Ir para o Painel
            </Button>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Blue Bolt Page Studio &bull; Segurança e Gestão de Permissões
          </p>
        </div>
      </div>
    </div>
  )
}
