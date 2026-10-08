import { useEffect, useState } from 'react'
import {
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  Store,
  LogOut,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import PDV from './components/PDV'
import Produtos from './components/Produtos'
import Caixas from './components/Caixas'
import HistoricoFechamentos from './components/HistoricoFechamentos'
import HistoricoVendas from './components/HistoricoVendas'
import Clientes from './components/Clientes'
import ConfiguracoesFiscais from './components/ConfiguracoesFiscais'
import Estabelecimentos from './components/Estabelecimentos'
import NfceTeste from './components/NfceTeste'
type PerfilUsuario = {
  nome: string
  email: string | null
  perfil: string
  empresa_id: string | null
}

function App() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [usuario, setUsuario] = useState<PerfilUsuario | null>(null)

  const [loading, setLoading] = useState(true)
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')
 const [pagina, setPagina] = useState<
  'dashboard' | 'pdv' | 'produtos' | 'caixas' | 'historicoFechamentos' | 'historicoVendas'
  | 'clientes' | 'configuracoes-fiscais' | 'estabelecimentos' | 'nfce-teste'>('dashboard')

  // ============================================================
  // VERIFICAR SE JÁ EXISTE UMA SESSÃO
  // ============================================================

  useEffect(() => {
    verificarSessao()
  }, [])

  async function verificarSessao() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        await carregarPerfil(session.user.id)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // CARREGAR PERFIL
  // ============================================================

 async function carregarPerfil(userId: string) {
  console.log('Usuário autenticado:', userId)

  const { data, error } = await supabase
    .from('perfis')
    .select('nome, email, perfil, empresa_id')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('ERRO AO BUSCAR PERFIL:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })

    setErro(
      `Erro ao carregar perfil: ${error.message}`
    )

    await supabase.auth.signOut()
    setUsuario(null)

    return
  }

  if (!data) {
    console.error(
      'Nenhum perfil encontrado para o usuário:',
      userId
    )

    setErro(
      'Nenhum perfil foi encontrado para este usuário.'
    )

    await supabase.auth.signOut()
    setUsuario(null)

    return
  }

  console.log('PERFIL ENCONTRADO:', data)

  setUsuario(data)
}

  // ============================================================
  // LOGIN
  // ============================================================

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setErro('')
    setEntrando(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setErro('E-mail ou senha incorretos.')
        return
      }

      if (!data.user) {
        setErro('Não foi possível identificar o usuário.')
        return
      }

      await carregarPerfil(data.user.id)
    } catch (error) {
      console.error(error)
      setErro('Ocorreu um erro ao entrar no sistema.')
    } finally {
      setEntrando(false)
    }
  }

  // ============================================================
  // RECUPERAR SENHA
  // ============================================================

  async function recuperarSenha() {
    if (!email.trim()) {
      setErro('Digite seu e-mail para recuperar a senha.')
      return
    }

    setErro('')

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: window.location.origin,
      }
    )

    if (error) {
      setErro('Não foi possível enviar o e-mail de recuperação.')
      return
    }

    alert('E-mail de recuperação enviado!')
  }

  // ============================================================
  // SAIR
  // ============================================================

  async function handleLogout() {
    await supabase.auth.signOut()

    setUsuario(null)
    setEmail('')
    setPassword('')
  }

  // ============================================================
  // CARREGANDO
  // ============================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2
            size={40}
            className="animate-spin text-blue-500"
          />

          <p>Carregando Nogueira PDV...</p>
        </div>
      </main>
    )
  }

  // ============================================================
  // DASHBOARD TEMPORÁRIO
  // ============================================================

  if (usuario) {
    // ============================================================
    // TELA DO PDV
    // ============================================================
    if (pagina === 'produtos') {
  return (
    <div className="min-h-screen bg-slate-950">
      <button
        type="button"
        onClick={() => setPagina('dashboard')}
        className="fixed left-4 top-4 z-50 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 shadow-lg transition hover:bg-slate-800"
      >
        ← Voltar
      </button>

      <Produtos />
    </div>
  )
}
    if (pagina === 'pdv') {
      return (
        <div className="min-h-screen bg-slate-950 text-white">
          <button
            type="button"
            onClick={() => setPagina('dashboard')}
            className="fixed left-4 top-4 z-50 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 shadow-lg transition hover:bg-slate-800"
          >
            ← Voltar
          </button>

          <PDV />
        </div>
      )
    }

    if (pagina === 'caixas') {
      return (
        <div className="min-h-screen bg-slate-950">
          <button
            type="button"
            onClick={() => setPagina('dashboard')}
            className="fixed left-4 top-4 z-50 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 shadow-lg transition hover:bg-slate-800"
          >
            ← Voltar
          </button>

          <Caixas />
        </div>
      )
    }

    if (pagina === 'historicoVendas') {
      return (
        <div className="min-h-screen bg-slate-950">
          <button
            type="button"
            onClick={() => setPagina('dashboard')}
            className="fixed left-4 top-4 z-50 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 shadow-lg transition hover:bg-slate-800 no-print"
          >
            ← Voltar
          </button>
          <HistoricoVendas />
        </div>
      )
    }
    if (pagina === 'clientes') {
  return (
    <div className="min-h-screen bg-slate-950">
      <button
        type="button"
        onClick={() => setPagina('dashboard')}
        className="fixed left-4 top-4 z-50 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 shadow-lg transition hover:bg-slate-800 no-print"
      >
        ← Voltar
      </button>

      <Clientes />
    </div>
  )
}
    if (pagina === 'estabelecimentos') {
      if (usuario.perfil !== 'administrador') {
        return (
          <div className="min-h-screen bg-slate-950 p-6 text-white">
            <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
              <h1 className="text-2xl font-bold text-red-300">Acesso negado</h1>
              <p className="mt-2 text-slate-300">Os Estabelecimentos são exclusivos para administradores.</p>
              <button
                type="button"
                onClick={() => setPagina('dashboard')}
                className="mt-6 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700"
              >
                Voltar
              </button>
            </div>
          </div>
        )
      }

      return (
        <div className="min-h-screen bg-slate-950">
          <button
            type="button"
            onClick={() => setPagina('dashboard')}
            className="fixed left-4 top-4 z-50 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 shadow-lg transition hover:bg-slate-800 no-print"
          >
            ← Voltar
          </button>
          <Estabelecimentos />
        </div>
      )
    }

    if (pagina === 'nfce-teste') {
      if (usuario.perfil !== 'administrador') {
        return (
          <div className="min-h-screen bg-slate-950 p-6 text-white">
            <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
              <h1 className="text-2xl font-bold text-red-300">Acesso negado</h1>
              <p className="mt-2 text-slate-300">O teste de NFC-e é exclusivo para administradores.</p>
              <button type="button" onClick={() => setPagina('dashboard')} className="mt-6 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700">Voltar</button>
            </div>
          </div>
        )
      }

      return (
        <div className="min-h-screen bg-slate-950">
          <button
            type="button"
            onClick={() => setPagina('dashboard')}
            className="fixed left-4 top-4 z-50 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 shadow-lg transition hover:bg-slate-800 no-print"
          >
            ← Voltar
          </button>
          <NfceTeste />
        </div>
      )
    }

    if (pagina === 'configuracoes-fiscais') {
      if (usuario.perfil !== 'administrador') {
        return (
          <div className="min-h-screen bg-slate-950 p-6 text-white">
            <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
              <h1 className="text-2xl font-bold text-red-300">Acesso negado</h1>
              <p className="mt-2 text-slate-300">As Configurações Fiscais são exclusivas para administradores.</p>
              <button type="button" onClick={() => setPagina('dashboard')} className="mt-6 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700">Voltar</button>
            </div>
          </div>
        )
      }

      return (
        <div className="min-h-screen bg-slate-950">
          <button
            type="button"
            onClick={() => setPagina('dashboard')}
            className="fixed left-4 top-4 z-50 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 shadow-lg transition hover:bg-slate-800 no-print"
          >
            ← Voltar
          </button>
          <ConfiguracoesFiscais />
        </div>
      )
    }

    if (pagina === 'historicoFechamentos') {
      if (usuario.perfil !== 'administrador') {
        return (
          <div className="min-h-screen bg-slate-950 p-6 text-white">
            <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
              <h1 className="text-2xl font-bold text-red-300">Acesso negado</h1>
              <p className="mt-2 text-slate-300">O Histórico de Fechamentos é exclusivo para administradores.</p>
              <button type="button" onClick={() => setPagina('dashboard')} className="mt-6 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700">Voltar</button>
            </div>
          </div>
        )
      }

      return (
        <div className="min-h-screen bg-slate-950">
          <button
            type="button"
            onClick={() => setPagina('dashboard')}
            className="fixed left-4 top-4 z-50 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 shadow-lg transition hover:bg-slate-800 no-print"
          >
            ← Voltar
          </button>
          <HistoricoFechamentos />
        </div>
      )
    }

    return (
      <main className="min-h-screen bg-slate-950 text-white">

        {/* HEADER */}
        <header className="border-b border-slate-800 bg-slate-900">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
                <Store size={23} />
              </div>

              <div>
                <h1 className="font-bold">
                  Nogueira PDV
                </h1>

                <p className="text-xs text-slate-400">
                  Gestão comercial inteligente
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              <LogOut size={17} />
              Sair
            </button>

          </div>
        </header>

        {/* CONTEÚDO */}
        <section className="mx-auto max-w-7xl px-6 py-10">

          <div className="mb-8">
            <p className="text-sm text-blue-400">
              Painel administrativo
            </p>

            <h2 className="mt-1 text-3xl font-bold">
              Olá, {usuario.nome}! 👋
            </h2>

            <p className="mt-2 text-slate-400">
              Bem-vindo ao Nogueira PDV.
            </p>
          </div>

          {/* INFORMAÇÕES DO USUÁRIO */}
          <div className="mb-8 grid gap-5 md:grid-cols-3">

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">
                Usuário
              </p>

              <p className="mt-2 font-semibold">
                {usuario.nome}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">
                Perfil
              </p>

              <p className="mt-2 font-semibold capitalize text-blue-400">
                {usuario.perfil}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">
                Status
              </p>

              <p className="mt-2 flex items-center gap-2 font-semibold text-emerald-400">
                <ShieldCheck size={18} />
                Autenticado
              </p>
            </div>

          </div>

          {/* MÓDULOS */}
          <h3 className="mb-4 text-xl font-bold">
            Módulos do sistema
          </h3>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            {[
              ['🛒', 'PDV / Vendas'],
              ['📦', 'Estoque'],
              ['💰', 'Caixas'],
              ['🧾', 'Histórico de Vendas'],
              ['👥', 'Clientes'],
              ...(usuario.perfil === 'administrador'
                ? [
                    ['📋', 'Histórico de Fechamentos'],
                    ['🏪', 'Estabelecimentos'],
                    ['🧾', 'Configurações Fiscais'],
                    ['🧪', 'Teste NFC-e'],
                  ]
                : []),
              ['📊', 'Relatórios'],
            ].map(([icone, titulo]) => (
              <button
                key={titulo}
                type="button"
               onClick={() => {
  if (titulo === 'PDV / Vendas') {
    setPagina('pdv')
  }

  if (titulo === 'Estoque') {
    setPagina('produtos')
  }

                  if (titulo === 'Caixas') {
                    setPagina('caixas')
                  }

                  if (titulo === 'Histórico de Vendas') {
                    setPagina('historicoVendas')
                  }
                  if (titulo === 'Clientes') {
                    setPagina('clientes')
}
                  if (titulo === 'Histórico de Fechamentos' && usuario.perfil === 'administrador') {
                    setPagina('historicoFechamentos')
                  }

                  if (titulo === 'Estabelecimentos' && usuario.perfil === 'administrador') {
                    setPagina('estabelecimentos')
                  }

                  if (titulo === 'Configurações Fiscais' && usuario.perfil === 'administrador') {
                    setPagina('configuracoes-fiscais')
                  }

                  if (titulo === 'Teste NFC-e' && usuario.perfil === 'administrador') {
                    setPagina('nfce-teste')
                  }
}}
                className="text-left rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-blue-500/50 hover:bg-slate-800"
              >
                <div className="text-3xl">
                  {icone}
                </div>

                <h4 className="mt-4 font-semibold">
                  {titulo}
                </h4>

                <p className="mt-2 text-sm text-slate-500">
                  {titulo === 'PDV / Vendas'
                    ? 'Abrir caixa de vendas.'
                    : titulo === 'Caixas'
                      ? 'Gerenciar caixas e sessões.'
                      : titulo === 'Histórico de Vendas'
                      ? 'Consultar vendas, produtos e pagamentos.'
                      : titulo === 'Histórico de Fechamentos'
                        ? 'Conferir turnos, faltas e sobras.'
                        : titulo === 'Estabelecimentos'
                          ? 'Cadastrar e gerenciar lojas e filiais.'
                          : titulo === 'Configurações Fiscais'
                            ? 'Configurar os dados fiscais para NFC-e.'
                            : titulo === 'Teste NFC-e'
                              ? 'Testar a comunicação com a Edge Function fiscal.'
                          : 'Módulo disponível em breve.'}
                </p>
              </button>
            ))}

          </div>

        </section>
      </main>
    )
  }

  // ============================================================
  // LOGIN
  // ============================================================

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">

      <div className="w-full max-w-5xl min-h-[600px] grid md:grid-cols-2 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">

        {/* LADO ESQUERDO */}
        <section className="hidden md:flex flex-col justify-between bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 p-10 text-white">

          <div>
            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <Store size={26} />
              </div>

              <div>
                <h1 className="text-xl font-bold">
                  Nogueira PDV
                </h1>

                <p className="text-sm text-blue-200">
                  Gestão comercial inteligente
                </p>
              </div>

            </div>
          </div>

          <div>

            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-blue-200">
              Sistema de gestão
            </p>

            <h2 className="text-4xl font-bold leading-tight">
              Controle seu negócio
              <br />
              em um só lugar.
            </h2>

            <p className="mt-5 max-w-md text-blue-100 leading-relaxed">
              PDV, estoque, caixa, vendas, clientes e relatórios
              para mercados, padarias, lojas, farmácias e muito mais.
            </p>

          </div>

          <div className="text-sm text-blue-200">
            © 2026 Nogueira PDV
          </div>

        </section>

        {/* LADO DIREITO */}
        <section className="flex items-center justify-center p-8 md:p-12">

          <div className="w-full max-w-md">

            {/* LOGO MOBILE */}
            <div className="mb-10 flex items-center gap-3 md:hidden">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Store size={23} />
              </div>

              <div>
                <h1 className="font-bold text-white">
                  Nogueira PDV
                </h1>

                <p className="text-xs text-slate-400">
                  Gestão comercial
                </p>
              </div>

            </div>

            <div className="mb-8">

              <h2 className="text-3xl font-bold text-white">
                Bem-vindo!
              </h2>

              <p className="mt-2 text-slate-400">
                Entre na sua conta para acessar o sistema.
              </p>

            </div>

            {/* ERRO */}
            {erro && (
              <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {erro}
              </div>
            )}

            <form
              onSubmit={handleLogin}
              className="space-y-5"
            >

              {/* EMAIL */}
              <div>

                <label className="mb-2 block text-sm font-medium text-slate-300">
                  E-mail
                </label>

                <div className="relative">

                  <Mail
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="seu@email.com"
                    required
                    disabled={entrando}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3.5 pl-12 pr-4 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                  />

                </div>

              </div>

              {/* SENHA */}
              <div>

                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Senha
                </label>

                <div className="relative">

                  <LockKeyhole
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Digite sua senha"
                    required
                    disabled={entrando}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3.5 pl-12 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={entrando}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>

                </div>

              </div>

              {/* ESQUECI SENHA */}
              <div className="flex justify-end">

                <button
                  type="button"
                  onClick={recuperarSenha}
                  disabled={entrando}
                  className="text-sm font-medium text-blue-400 hover:text-blue-300 disabled:opacity-50"
                >
                  Esqueci minha senha
                </button>

              </div>

              {/* LOGIN */}
              <button
                type="submit"
                disabled={entrando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >

                {entrando ? (
                  <>
                    <Loader2
                      size={20}
                      className="animate-spin"
                    />

                    Entrando...
                  </>
                ) : (
                  'Entrar no sistema'
                )}

              </button>

            </form>

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
              <LockKeyhole size={14} />
              Ambiente protegido
            </div>

          </div>

        </section>

      </div>

    </main>
  )
}

export default App