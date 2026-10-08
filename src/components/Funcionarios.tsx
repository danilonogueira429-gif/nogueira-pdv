import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Funcionario = {
  id: string
  nome: string
  email: string | null
  perfil: string
  ativo: boolean
}

export default function Funcionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [mostrarFormulario, setMostrarFormulario] = useState(false)

const [nome, setNome] = useState('')
const [email, setEmail] = useState('')
const [senha, setSenha] = useState('')
const [perfil, setPerfil] = useState('operador')
const [ativo, setAtivo] = useState(true)
  async function carregarFuncionarios() {
    setCarregando(true)
    setErro('')

    const { data, error } = await supabase
      .from('perfis')
      .select('id, nome, email, perfil, ativo')
      .order('nome')

    if (error) {
      console.error(error)
      setErro('Não foi possível carregar os funcionários.')
      setFuncionarios([])
    } else {
      setFuncionarios(data || [])
    }

    setCarregando(false)
  }

  useEffect(() => {
    carregarFuncionarios()
  }, [])

  function limparFormulario() {
  setNome('')
  setEmail('')
  setSenha('')
  setPerfil('operador')
  setAtivo(true)
}

  function abrirNovoFuncionario() {
    limparFormulario()
    setMostrarFormulario(true)
  }

  function fecharFormulario() {
    limparFormulario()
    setMostrarFormulario(false)
  }

  async function salvarFuncionario(e: React.FormEvent) {
    e.preventDefault()

    setErro('')

    if (!nome.trim()) {
      setErro('Informe o nome do funcionário.')
      return
    }

    if (!email.trim()) {
      setErro('Informe o e-mail do funcionário.')
      return
    }

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        'rapid-service',
        {
          body: {
            nome: nome.trim(),
            email: email.trim().toLowerCase(),
            senha,
            perfil,
            ativo,
          },
        }
      )

      if (error) {
        console.error('Erro na Edge Function:', error)
        setErro(error.message || 'Não foi possível criar o funcionário.')
        return
      }

      if (!data?.success) {
        setErro(
          data?.error || 'Não foi possível criar o funcionário.'
        )
        return
      }

      fecharFormulario()
      await carregarFuncionarios()
    } catch (error) {
      console.error('Erro:', error)

      setErro(
        error instanceof Error
          ? error.message
          : 'Ocorreu um erro ao criar o funcionário.'
      )
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Cabeçalho */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              👥 Funcionários
            </h1>

            <p className="mt-2 text-slate-400">
              Gerencie os usuários e operadores da empresa.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNovoFuncionario}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500"
          >
            + Novo funcionário
          </button>
        </div>

        {/* Erro */}
        {erro && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {erro}
          </div>
        )}

        {/* Estatísticas */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Total
            </p>

            <p className="mt-2 text-3xl font-bold">
              {funcionarios.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Ativos
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {funcionarios.filter((f) => f.ativo).length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Inativos
            </p>

            <p className="mt-2 text-3xl font-bold text-red-400">
              {funcionarios.filter((f) => !f.ativo).length}
            </p>
          </div>
        </div>

        {/* Lista */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="text-xl font-semibold">
              Lista de funcionários
            </h2>
          </div>

          {carregando ? (
            <div className="p-8 text-center text-slate-400">
              Carregando funcionários...
            </div>
          ) : funcionarios.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              Nenhum funcionário cadastrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-sm text-slate-400">
                    <th className="px-6 py-4">Nome</th>
                    <th className="px-6 py-4">E-mail</th>
                    <th className="px-6 py-4">Perfil</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {funcionarios.map((funcionario) => (
                    <tr
                      key={funcionario.id}
                      className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50"
                    >
                      <td className="px-6 py-4 font-medium">
                        {funcionario.nome}
                      </td>

                      <td className="px-6 py-4 text-slate-400">
                        {funcionario.email || '-'}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-blue-500/10 px-3 py-1 text-sm text-blue-300">
                          {funcionario.perfil}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {funcionario.ativo ? (
                          <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
                            Ativo
                          </span>
                        ) : (
                          <span className="rounded-lg bg-red-500/10 px-3 py-1 text-sm text-red-300">
                            Inativo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {mostrarFormulario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  Novo funcionário
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Cadastre os dados básicos do funcionário.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharFormulario}
                className="text-2xl text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <form onSubmit={salvarFuncionario} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Nome
                </label>

                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  E-mail
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="funcionario@email.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
                />
            <div>
  <label className="mb-2 block text-sm text-slate-300">
    Senha inicial
  </label>

  <input
    type="password"
    value={senha}
    onChange={(e) => setSenha(e.target.value)}
    placeholder="Digite uma senha inicial"
    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500"
  />
</div>

              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Perfil
                </label>

                <select
                  value={perfil}
                  onChange={(e) => setPerfil(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="operador">Operador</option>
                  <option value="caixa">Caixa</option>
                  <option value="gerente">Gerente</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="h-5 w-5"
                />

                <span className="text-slate-300">
                  Funcionário ativo
                </span>
              </label>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={fecharFormulario}
                  className="flex-1 rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold transition hover:bg-blue-500"
                >
                  Salvar funcionário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}