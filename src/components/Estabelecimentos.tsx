import { useEffect, useMemo, useState } from 'react'
import { Building2, Plus, Pencil, Power, Search, X, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Estabelecimento = {
  id: string
  empresa_id: string
  nome: string
  cnpj: string | null
  inscricao_estadual: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  ativo: boolean
}

type FormEstabelecimento = {
  nome: string
  cnpj: string
  inscricao_estadual: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  cep: string
}

const formularioInicial: FormEstabelecimento = {
  nome: '',
  cnpj: '',
  inscricao_estadual: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: 'BA',
  cep: '',
}

export default function Estabelecimentos() {
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Estabelecimento | null>(null)
  const [form, setForm] = useState<FormEstabelecimento>(formularioInicial)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    carregarEstabelecimentos()
  }, [])

  async function obterEmpresaId() {
    const {
      data: { user },
      error: erroUsuario,
    } = await supabase.auth.getUser()

    if (erroUsuario) throw erroUsuario
    if (!user) throw new Error('Usuário não autenticado.')

    const { data: perfil, error } = await supabase
      .from('perfis')
      .select('empresa_id, perfil')
      .eq('id', user.id)
      .single()

    if (error) throw error
    if (!perfil?.empresa_id) {
      throw new Error('Não foi possível identificar a empresa do usuário.')
    }

    if (perfil.perfil !== 'administrador') {
      throw new Error('Acesso restrito ao administrador.')
    }

    return perfil.empresa_id
  }

  async function carregarEstabelecimentos() {
    setCarregando(true)
    setErro('')

    try {
      const empresaId = await obterEmpresaId()

      const { data, error } = await supabase
        .from('estabelecimentos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome', { ascending: true })

      if (error) throw error

      setEstabelecimentos(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar estabelecimentos:', error)
      setErro(error?.message || 'Não foi possível carregar os estabelecimentos.')
    } finally {
      setCarregando(false)
    }
  }

  function novoEstabelecimento() {
    setEditando(null)
    setForm(formularioInicial)
    setErro('')
    setSucesso('')
    setModalAberto(true)
  }

  function editarEstabelecimento(estabelecimento: Estabelecimento) {
    setEditando(estabelecimento)
    setForm({
      nome: estabelecimento.nome || '',
      cnpj: estabelecimento.cnpj || '',
      inscricao_estadual: estabelecimento.inscricao_estadual || '',
      logradouro: estabelecimento.logradouro || '',
      numero: estabelecimento.numero || '',
      complemento: estabelecimento.complemento || '',
      bairro: estabelecimento.bairro || '',
      cidade: estabelecimento.cidade || '',
      uf: estabelecimento.uf || 'BA',
      cep: estabelecimento.cep || '',
    })
    setErro('')
    setSucesso('')
    setModalAberto(true)
  }

  function atualizarCampo(campo: keyof FormEstabelecimento, valor: string) {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor,
    }))
  }

  async function salvarEstabelecimento(event: React.FormEvent) {
    event.preventDefault()
    setErro('')
    setSucesso('')

    if (!form.nome.trim()) {
      setErro('Informe o nome do estabelecimento.')
      return
    }

    setSalvando(true)

    try {
      const empresaId = await obterEmpresaId()

      const dados = {
        empresa_id: empresaId,
        nome: form.nome.trim(),
        cnpj: form.cnpj.trim() || null,
        inscricao_estadual: form.inscricao_estadual.trim() || null,
        logradouro: form.logradouro.trim() || null,
        numero: form.numero.trim() || null,
        complemento: form.complemento.trim() || null,
        bairro: form.bairro.trim() || null,
        cidade: form.cidade.trim() || null,
        uf: form.uf.trim().toUpperCase() || null,
        cep: form.cep.trim() || null,
        updated_at: new Date().toISOString(),
      }

      if (editando) {
        const { error } = await supabase
          .from('estabelecimentos')
          .update(dados)
          .eq('id', editando.id)
          .eq('empresa_id', empresaId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('estabelecimentos')
          .insert(dados)

        if (error) throw error
      }

      setModalAberto(false)
      setEditando(null)
      setForm(formularioInicial)
      setSucesso(
        editando
          ? 'Estabelecimento atualizado com sucesso!'
          : 'Estabelecimento cadastrado com sucesso!'
      )

      await carregarEstabelecimentos()
    } catch (error: any) {
      console.error('Erro ao salvar estabelecimento:', error)
      setErro(error?.message || 'Não foi possível salvar o estabelecimento.')
    } finally {
      setSalvando(false)
    }
  }

  async function alternarStatus(estabelecimento: Estabelecimento) {
    try {
      const empresaId = await obterEmpresaId()

      const { error } = await supabase
        .from('estabelecimentos')
        .update({
          ativo: !estabelecimento.ativo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', estabelecimento.id)
        .eq('empresa_id', empresaId)

      if (error) throw error

      setSucesso(
        !estabelecimento.ativo
          ? 'Estabelecimento ativado.'
          : 'Estabelecimento desativado.'
      )

      await carregarEstabelecimentos()
    } catch (error: any) {
      console.error('Erro ao alterar status:', error)
      setErro(error?.message || 'Não foi possível alterar o status.')
    }
  }

  const filtrados = useMemo(() => {
    const texto = busca.toLowerCase().trim()

    if (!texto) return estabelecimentos

    return estabelecimentos.filter((item) =>
      [
        item.nome,
        item.cnpj,
        item.inscricao_estadual,
        item.cidade,
        item.uf,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(texto)
    )
  }, [estabelecimentos, busca])

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
        Carregando estabelecimentos...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="flex min-h-20 items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <Building2 size={25} />
            </div>

            <div>
              <h1 className="text-xl font-bold">Estabelecimentos</h1>
              <p className="text-sm text-slate-400">
                Gerencie lojas e filiais da empresa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={novoEstabelecimento}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500"
          >
            <Plus size={19} />
            Novo estabelecimento
          </button>
        </div>
      </header>

      <main className="p-6">
        <div className="mx-auto max-w-7xl">
          {sucesso && (
            <div className="mb-5 rounded-xl border border-emerald-700 bg-emerald-950/30 px-4 py-3 text-emerald-300">
              ✅ {sucesso}
            </div>
          )}

          {erro && (
            <div className="mb-5 rounded-xl border border-red-700 bg-red-950/30 px-4 py-3 text-red-300">
              ❌ {erro}
            </div>
          )}

          <div className="mb-6">
            <div className="relative max-w-xl">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Pesquisar por nome, CNPJ ou cidade..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3.5 pl-12 pr-4 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtrados.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 size={19} className="text-blue-400" />
                      <h2 className="font-semibold">{item.nome}</h2>
                    </div>

                    <p className="mt-2 text-sm text-slate-400">
                      {item.cidade || 'Cidade não informada'}
                      {item.uf ? ` - ${item.uf}` : ''}
                    </p>
                  </div>

                  <span
                    className={
                      item.ativo
                        ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400'
                        : 'rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400'
                    }
                  >
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="mt-5 space-y-2 text-sm text-slate-400">
                  <p>
                    <span className="text-slate-500">CNPJ:</span>{' '}
                    {item.cnpj || 'Não informado'}
                  </p>
                  <p>
                    <span className="text-slate-500">IE:</span>{' '}
                    {item.inscricao_estadual || 'Não informada'}
                  </p>
                  <p>
                    <span className="text-slate-500">Endereço:</span>{' '}
                    {[item.logradouro, item.numero, item.bairro]
                      .filter(Boolean)
                      .join(', ') || 'Não informado'}
                  </p>
                </div>

                <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() => editarEstabelecimento(item)}
                    className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-slate-400 transition hover:bg-blue-500/10 hover:text-blue-400"
                  >
                    <Pencil size={16} />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => alternarStatus(item)}
                    className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  >
                    <Power size={16} />
                    {item.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            ))}

            {filtrados.length === 0 && (
              <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
                <Building2
                  size={44}
                  className="mx-auto mb-4 text-slate-700"
                />
                <p className="font-medium text-slate-400">
                  Nenhum estabelecimento encontrado
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Cadastre a primeira loja ou filial.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editando ? 'Editar estabelecimento' : 'Novo estabelecimento'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Cadastre os dados da loja ou filial.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={salvarEstabelecimento} className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Campo
                  label="Nome do estabelecimento *"
                  value={form.nome}
                  onChange={(valor) => atualizarCampo('nome', valor)}
                />

                <Campo
                  label="CNPJ"
                  value={form.cnpj}
                  onChange={(valor) => atualizarCampo('cnpj', valor)}
                />

                <Campo
                  label="Inscrição Estadual"
                  value={form.inscricao_estadual}
                  onChange={(valor) =>
                    atualizarCampo('inscricao_estadual', valor)
                  }
                />
              </div>

              <div>
                <h3 className="mb-4 text-lg font-semibold">📍 Endereço</h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <Campo
                      label="Logradouro"
                      value={form.logradouro}
                      onChange={(valor) =>
                        atualizarCampo('logradouro', valor)
                      }
                    />
                  </div>

                  <Campo
                    label="Número"
                    value={form.numero}
                    onChange={(valor) => atualizarCampo('numero', valor)}
                  />

                  <Campo
                    label="Complemento"
                    value={form.complemento}
                    onChange={(valor) =>
                      atualizarCampo('complemento', valor)
                    }
                  />

                  <Campo
                    label="Bairro"
                    value={form.bairro}
                    onChange={(valor) => atualizarCampo('bairro', valor)}
                  />

                  <Campo
                    label="Cidade"
                    value={form.cidade}
                    onChange={(valor) => atualizarCampo('cidade', valor)}
                  />

                  <Campo
                    label="UF"
                    value={form.uf}
                    onChange={(valor) =>
                      atualizarCampo('uf', valor.toUpperCase())
                    }
                  />

                  <Campo
                    label="CEP"
                    value={form.cep}
                    onChange={(valor) => atualizarCampo('cep', valor)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-5">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={18} />
                  {salvando ? 'Salvando...' : 'Salvar estabelecimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

type CampoProps = {
  label: string
  value: string
  onChange: (valor: string) => void
}

function Campo({ label, value, onChange }: CampoProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
      />
    </div>
  )
}
