import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Cliente = {
  id: string
  empresa_id: string
  nome: string
  cpf: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
  cep: string | null
  limite_credito: number
  ativo: boolean
  created_at: string
}

type FormularioCliente = {
  nome: string
  cpf: string
  telefone: string
  email: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  limite_credito: string
  ativo: boolean
}

const formularioInicial: FormularioCliente = {
  nome: '',
  cpf: '',
  telefone: '',
  email: '',
  endereco: '',
  cidade: '',
  estado: '',
  cep: '',
  limite_credito: '0',
  ativo: true,
}

function formatarMoeda(valor: number) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatarCpf(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11)

  if (numeros.length <= 3) return numeros
  if (numeros.length <= 6) {
    return `${numeros.slice(0, 3)}.${numeros.slice(3)}`
  }
  if (numeros.length <= 9) {
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`
  }

  return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`
}

function formatarTelefone(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11)

  if (numeros.length <= 2) return numeros
  if (numeros.length <= 7) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
  }

  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
}

function formatarCep(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 8)

  if (numeros.length <= 5) return numeros

  return `${numeros.slice(0, 5)}-${numeros.slice(5)}`
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  const [busca, setBusca] = useState('')
  const [mostrarInativos, setMostrarInativos] = useState(false)

  const [modalAberto, setModalAberto] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)

  const [formulario, setFormulario] =
    useState<FormularioCliente>(formularioInicial)

  async function carregarClientes() {
    try {
      setCarregando(true)
      setErro('')

      const { data, error } = await supabase
        .from('clientes')
        .select(
          `
          id,
          empresa_id,
          nome,
          cpf,
          telefone,
          email,
          endereco,
          cidade,
          estado,
          cep,
          limite_credito,
          ativo,
          created_at
        `
        )
        .order('nome', { ascending: true })

      if (error) {
        throw error
      }

      setClientes(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error)

      setErro(
        error?.message || 'Não foi possível carregar os clientes.'
      )
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarClientes()
  }, [])

  const clientesFiltrados = useMemo(() => {
    const texto = busca.trim().toLowerCase()

    return clientes.filter((cliente) => {
      if (!mostrarInativos && !cliente.ativo) {
        return false
      }

      if (!texto) {
        return true
      }

      return (
        cliente.nome.toLowerCase().includes(texto) ||
        (cliente.cpf || '').toLowerCase().includes(texto) ||
        (cliente.telefone || '').toLowerCase().includes(texto) ||
        (cliente.email || '').toLowerCase().includes(texto)
      )
    })
  }, [clientes, busca, mostrarInativos])

  function abrirNovoCliente() {
    setClienteEditando(null)
    setFormulario(formularioInicial)
    setErro('')
    setMensagem('')
    setModalAberto(true)
  }

  function abrirEdicao(cliente: Cliente) {
    setClienteEditando(cliente)

    setFormulario({
      nome: cliente.nome || '',
      cpf: cliente.cpf || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      endereco: cliente.endereco || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      cep: cliente.cep || '',
      limite_credito: String(cliente.limite_credito ?? 0),
      ativo: cliente.ativo,
    })

    setErro('')
    setMensagem('')
    setModalAberto(true)
  }

  function fecharModal() {
    if (salvando) return

    setModalAberto(false)
    setClienteEditando(null)
    setFormulario(formularioInicial)
    setErro('')
  }

  function atualizarCampo(
    campo: keyof FormularioCliente,
    valor: string | boolean
  ) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }))
  }

  async function salvarCliente(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!formulario.nome.trim()) {
      setErro('Informe o nome do cliente.')
      return
    }

    const limite = Number(
      formulario.limite_credito.replace(',', '.')
    )

    if (Number.isNaN(limite) || limite < 0) {
      setErro('Informe um limite de crédito válido.')
      return
    }

    try {
      setSalvando(true)
      setErro('')
      setMensagem('')

      const dadosCliente = {
        nome: formulario.nome.trim(),
        cpf: formulario.cpf.trim() || null,
        telefone: formulario.telefone.trim() || null,
        email: formulario.email.trim() || null,
        endereco: formulario.endereco.trim() || null,
        cidade: formulario.cidade.trim() || null,
        estado: formulario.estado.trim().toUpperCase() || null,
        cep: formulario.cep.trim() || null,
        limite_credito: limite,
        ativo: formulario.ativo,
      }

      if (clienteEditando) {
        const { error } = await supabase
          .from('clientes')
          .update(dadosCliente)
          .eq('id', clienteEditando.id)

        if (error) {
          throw error
        }

        setMensagem('Cliente atualizado com sucesso.')
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error('Usuário não autenticado.')
        }

        const { data: perfil, error: perfilError } = await supabase
          .from('perfis')
          .select('empresa_id')
          .eq('id', user.id)
          .maybeSingle()

        if (perfilError) {
          throw perfilError
        }

        if (!perfil?.empresa_id) {
          throw new Error(
            'Empresa do usuário não foi encontrada.'
          )
        }

        const { error } = await supabase.from('clientes').insert({
          ...dadosCliente,
          empresa_id: perfil.empresa_id,
        })

        if (error) {
          throw error
        }

        setMensagem('Cliente cadastrado com sucesso.')
      }

      await carregarClientes()

      setTimeout(() => {
        setModalAberto(false)
        setClienteEditando(null)
        setFormulario(formularioInicial)
        setMensagem('')
      }, 700)
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error)

      setErro(
        error?.message || 'Não foi possível salvar o cliente.'
      )
    } finally {
      setSalvando(false)
    }
  }

  async function alternarStatus(cliente: Cliente) {
    const acao = cliente.ativo ? 'desativar' : 'ativar'

    const confirmado = window.confirm(
      `Deseja ${acao} o cliente "${cliente.nome}"?`
    )

    if (!confirmado) {
      return
    }

    try {
      setErro('')
      setMensagem('')

      const { error } = await supabase
        .from('clientes')
        .update({
          ativo: !cliente.ativo,
        })
        .eq('id', cliente.id)

      if (error) {
        throw error
      }

      setMensagem(
        cliente.ativo
          ? 'Cliente desativado com sucesso.'
          : 'Cliente ativado com sucesso.'
      )

      await carregarClientes()

      setTimeout(() => {
        setMensagem('')
      }, 2500)
    } catch (error: any) {
      console.error('Erro ao alterar status:', error)

      setErro(
        error?.message ||
          'Não foi possível alterar o status do cliente.'
      )
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="text-center">
            <div className="mb-3 text-4xl">👥</div>
            <p className="text-slate-300">
              Carregando clientes...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        {/* CABEÇALHO */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              👥 Clientes
            </h1>

            <p className="mt-2 text-slate-400">
              Cadastre e gerencie os clientes do estabelecimento.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={carregarClientes}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              🔄 Atualizar
            </button>

            <button
              type="button"
              onClick={abrirNovoCliente}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
            >
              + Novo cliente
            </button>
          </div>
        </div>

        {/* MENSAGENS */}
        {erro && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <strong>Erro:</strong> {erro}
          </div>
        )}

        {mensagem && (
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {mensagem}
          </div>
        )}

        {/* RESUMO */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Clientes ativos
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {clientes.filter((cliente) => cliente.ativo).length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Clientes cadastrados
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-400">
              {clientes.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Resultado da pesquisa
            </p>

            <p className="mt-2 text-3xl font-bold text-white">
              {clientesFiltrados.length}
            </p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Pesquisar cliente
              </label>

              <input
                type="text"
                value={busca}
                onChange={(event) =>
                  setBusca(event.target.value)
                }
                placeholder="Nome, CPF, telefone ou e-mail..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
              <input
                type="checkbox"
                checked={mostrarInativos}
                onChange={(event) =>
                  setMostrarInativos(event.target.checked)
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-300">
                Mostrar inativos
              </span>
            </label>
          </div>
        </div>

        {/* LISTA */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead className="border-b border-slate-800 bg-slate-800">
                <tr>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">
                    Cliente
                  </th>

                  <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">
                    CPF
                  </th>

                  <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">
                    Telefone
                  </th>

                  <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">
                    Cidade
                  </th>

                  <th className="px-4 py-4 text-right text-sm font-semibold text-slate-300">
                    Limite
                  </th>

                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-300">
                    Status
                  </th>

                  <th className="px-4 py-4 text-center text-sm font-semibold text-slate-300">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {clientesFiltrados.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="transition hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-white">
                          {cliente.nome}
                        </p>

                        {cliente.email && (
                          <p className="mt-1 text-xs text-slate-500">
                            {cliente.email}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-300">
                      {cliente.cpf || '—'}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-300">
                      {cliente.telefone || '—'}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-300">
                      {cliente.cidade
                        ? `${cliente.cidade}${
                            cliente.estado
                              ? ` - ${cliente.estado}`
                              : ''
                          }`
                        : '—'}
                    </td>

                    <td className="px-4 py-4 text-right font-semibold text-emerald-400">
                      {formatarMoeda(
                        Number(cliente.limite_credito)
                      )}
                    </td>

                    <td className="px-4 py-4 text-center">
                      {cliente.ativo ? (
                        <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400">
                          Inativo
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            abrirEdicao(cliente)
                          }
                          className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-400 transition hover:bg-blue-500/20"
                        >
                          ✏️ Editar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            alternarStatus(cliente)
                          }
                          className={
                            cliente.ativo
                              ? 'rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20'
                              : 'rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20'
                          }
                        >
                          {cliente.ativo
                            ? 'Desativar'
                            : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {clientesFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-16 text-center"
                    >
                      <div className="text-5xl">👥</div>

                      <p className="mt-4 font-semibold text-white">
                        Nenhum cliente encontrado.
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        Cadastre um cliente ou altere os filtros.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {clienteEditando
                    ? 'Editar cliente'
                    : 'Novo cliente'}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  O cadastro de cliente é opcional para as vendas.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                className="rounded-lg px-3 py-2 text-xl text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={salvarCliente}
              className="space-y-5"
            >
              {erro && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {erro}
                </div>
              )}

              {mensagem && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {mensagem}
                </div>
              )}

              {/* DADOS PRINCIPAIS */}
              <div>
                <h3 className="mb-3 text-lg font-bold text-white">
                  Dados principais
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Nome *
                    </label>

                    <input
                      type="text"
                      value={formulario.nome}
                      onChange={(event) =>
                        atualizarCampo(
                          'nome',
                          event.target.value
                        )
                      }
                      placeholder="Nome completo ou razão social"
                      required
                      disabled={salvando}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      CPF
                    </label>

                    <input
                      type="text"
                      value={formulario.cpf}
                      onChange={(event) =>
                        atualizarCampo(
                          'cpf',
                          formatarCpf(event.target.value)
                        )
                      }
                      placeholder="000.000.000-00"
                      disabled={salvando}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Telefone
                    </label>

                    <input
                      type="text"
                      value={formulario.telefone}
                      onChange={(event) =>
                        atualizarCampo(
                          'telefone',
                          formatarTelefone(
                            event.target.value
                          )
                        )
                      }
                      placeholder="(71) 99999-9999"
                      disabled={salvando}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 disabled:opacity-60"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      E-mail
                    </label>

                    <input
                      type="email"
                      value={formulario.email}
                      onChange={(event) =>
                        atualizarCampo(
                          'email',
                          event.target.value
                        )
                      }
                      placeholder="cliente@email.com"
                      disabled={salvando}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              {/* ENDEREÇO */}
              <div>
                <h3 className="mb-3 text-lg font-bold text-white">
                  Endereço
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Endereço
                    </label>

                    <input
                      type="text"
                      value={formulario.endereco}
                      onChange={(event) =>
                        atualizarCampo(
                          'endereco',
                          event.target.value
                        )
                      }
                      placeholder="Rua, número, complemento..."
                      disabled={salvando}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Cidade
                    </label>

                    <input
                      type="text"
                      value={formulario.cidade}
                      onChange={(event) =>
                        atualizarCampo(
                          'cidade',
                          event.target.value
                        )
                      }
                      placeholder="Cidade"
                      disabled={salvando}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Estado
                    </label>

                    <input
                      type="text"
                      maxLength={2}
                      value={formulario.estado}
                      onChange={(event) =>
                        atualizarCampo(
                          'estado',
                          event.target.value
                            .replace(/[^a-zA-Z]/g, '')
                            .toUpperCase()
                        )
                      }
                      placeholder="BA"
                      disabled={salvando}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white uppercase outline-none transition placeholder:text-slate-600 focus:border-blue-500 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      CEP
                    </label>

                    <input
                      type="text"
                      value={formulario.cep}
                      onChange={(event) =>
                        atualizarCampo(
                          'cep',
                          formatarCep(event.target.value)
                        )
                      }
                      placeholder="00000-000"
                      disabled={salvando}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              {/* CRÉDITO */}
              <div>
                <h3 className="mb-3 text-lg font-bold text-white">
                  Crédito
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Limite de crédito
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formulario.limite_credito}
                      onChange={(event) =>
                        atualizarCampo(
                          'limite_credito',
                          event.target.value
                        )
                      }
                      disabled={salvando}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 disabled:opacity-60"
                    />
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={formulario.ativo}
                      onChange={(event) =>
                        atualizarCampo(
                          'ativo',
                          event.target.checked
                        )
                      }
                      disabled={salvando}
                      className="h-4 w-4"
                    />

                    <div>
                      <p className="font-semibold text-white">
                        Cliente ativo
                      </p>

                      <p className="text-xs text-slate-500">
                        Clientes inativos não aparecem na lista padrão.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* BOTÕES */}
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-5">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="rounded-xl bg-slate-800 px-5 py-3 font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando
                    ? 'Salvando...'
                    : clienteEditando
                      ? 'Salvar alterações'
                      : 'Cadastrar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}