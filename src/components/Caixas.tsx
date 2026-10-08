import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  LockKeyhole,
  UnlockKeyhole,
  Wallet,
  User,
  RefreshCw,
  X,
} from 'lucide-react'

type Caixa = {
  id: string
  numero: number
  descricao: string | null
  ativo: boolean
  estabelecimento_id: string | null
  estabelecimento: {
    id: string
    nome: string
  } | null
}

type SessaoCaixa = {
  id: string
  caixa_id: string
  usuario_id: string | null
  valor_inicial: number
  valor_final: number | null
  status: string
  aberto_em: string
  fechado_em: string | null
  observacao: string | null
}

export default function Caixas() {
  const [caixas, setCaixas] = useState<Caixa[]>([])
  const [sessoes, setSessoes] = useState<SessaoCaixa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [modalAbrir, setModalAbrir] = useState(false)
  const [caixaSelecionado, setCaixaSelecionado] = useState<Caixa | null>(null)
  const [valorInicial, setValorInicial] = useState('')
  const [abrindo, setAbrindo] = useState(false)

  const [modalFechar, setModalFechar] = useState(false)
  const [sessaoParaFechar, setSessaoParaFechar] =
    useState<SessaoCaixa | null>(null)
  const [valorContado, setValorContado] = useState('')
  const [fechando, setFechando] = useState(false)
  const [usuarioAtualId, setUsuarioAtualId] = useState<string | null>(null)
const [usuarioEhAdministrador, setUsuarioEhAdministrador] = useState(false)
  const [carregandoResumo, setCarregandoResumo] = useState(false)

  const [modalSangria, setModalSangria] = useState(false)
  const [sessaoParaSangria, setSessaoParaSangria] =
    useState<SessaoCaixa | null>(null)
  const [valorSangria, setValorSangria] = useState('')
  const [motivoSangria, setMotivoSangria] = useState('')
  const [sangrando, setSangrando] = useState(false)
const [resumoFechamento, setResumoFechamento] = useState({
  dinheiro: 0,
  pix: 0,
  cartao: 0,
  vendas: 0,
  suprimentos: 0,
  sangrias: 0,
  valorEsperado: 0,
})


  async function carregarCaixas() {
    try {
      setCarregando(true)
      setErro('')

      const { data: caixasData, error: caixasError } = await supabase
        .from('caixas')
        .select(`
          id,
          numero,
          descricao,
          ativo,
          estabelecimento_id,
          estabelecimento:estabelecimentos (
            id,
            nome
          )
        `)
        .order('numero', { ascending: true })

      if (caixasError) throw caixasError

      const { data: sessoesData, error: sessoesError } = await supabase
        .from('sessoes_caixa')
        .select(
          'id, caixa_id, usuario_id, valor_inicial, valor_final, status, aberto_em, fechado_em, observacao'
        )
        .order('aberto_em', { ascending: false })

      if (sessoesError) throw sessoesError

      const caixasNormalizados = (caixasData || []).map((caixa: any) => ({
        ...caixa,
        estabelecimento: Array.isArray(caixa.estabelecimento)
          ? caixa.estabelecimento[0] || null
          : caixa.estabelecimento || null,
      }))

      setCaixas(caixasNormalizados)
      setSessoes(sessoesData || [])
    } catch (error: any) {
      console.error(error)
      setErro(error.message || 'Erro ao carregar os caixas.')
    } finally {
      setCarregando(false)
    }
  }

 useEffect(() => {
  async function carregarUsuarioAtual() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) return

    setUsuarioAtualId(user.id)

    const { data: administrador, error: adminError } =
      await supabase.rpc('eh_administrador')

    if (!adminError) {
      setUsuarioEhAdministrador(administrador === true)
    }
  }

  carregarUsuarioAtual()
  carregarCaixas()
}, [])

  function sessaoAtual(caixaId: string) {
    return sessoes.find(
      (sessao) =>
        sessao.caixa_id === caixaId &&
        sessao.status === 'aberto'
    )
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleString('pt-BR')
  }

  function formatarMoeda(valor: number | null) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  function abrirModal(caixa: Caixa) {
    setCaixaSelecionado(caixa)
    setValorInicial('')
    setErro('')
    setModalAbrir(true)
  }

  function fecharModal() {
    if (abrindo) return

    setModalAbrir(false)
    setCaixaSelecionado(null)
    setValorInicial('')
  }

 async function abrirModalFechamento(sessao: SessaoCaixa) {
  setSessaoParaFechar(sessao)
  setValorContado('')
  setErro('')

  setResumoFechamento({
    dinheiro: 0,
    pix: 0,
    cartao: 0,
    vendas: 0,
    suprimentos: 0,
    sangrias: 0,
    valorEsperado: Number(sessao.valor_inicial || 0),
  })

  setModalFechar(true)
  setCarregandoResumo(true)

  try {
    const { data: vendas, error: vendasError } = await supabase
      .from('vendas')
      .select('id')
      .eq('sessao_caixa_id', sessao.id)
      .eq('status', 'finalizada')

    if (vendasError) throw vendasError

    const vendaIds = (vendas || []).map((venda) => venda.id)

    let dinheiro = 0
    let pix = 0
    let cartao = 0

    if (vendaIds.length > 0) {
      const { data: pagamentos, error: pagamentosError } =
        await supabase
          .from('pagamentos')
          .select('forma_pagamento, valor, troco')
          .in('venda_id', vendaIds)

      if (pagamentosError) throw pagamentosError

      for (const pagamento of pagamentos || []) {
        const forma = String(pagamento.forma_pagamento || '').toLowerCase()
        const valorPagamento = Number(pagamento.valor || 0)
        const troco = Number(pagamento.troco || 0)

        if (forma === 'dinheiro') {
          dinheiro += Math.max(valorPagamento - troco, 0)
        } else if (forma === 'pix') {
          pix += valorPagamento
        } else if (forma === 'cartao') {
          cartao += valorPagamento
        }
      }
    }

    const { data: movimentos, error: movimentosError } =
      await supabase
        .from('movimentacoes_caixa')
        .select('tipo, valor')
        .eq('sessao_caixa_id', sessao.id)
        .in('tipo', ['suprimento', 'sangria'])

    if (movimentosError) throw movimentosError

    let suprimentos = 0
    let sangrias = 0

    for (const movimento of movimentos || []) {
      const valorMovimento = Number(movimento.valor || 0)

      if (movimento.tipo === 'suprimento') {
        suprimentos += valorMovimento
      } else if (movimento.tipo === 'sangria') {
        sangrias += valorMovimento
      }
    }

    setResumoFechamento({
      dinheiro,
      pix,
      cartao,
      vendas: dinheiro + pix + cartao,
      suprimentos,
      sangrias,
      valorEsperado:
        Number(sessao.valor_inicial || 0) +
        dinheiro +
        suprimentos -
        sangrias,
    })
  } catch (error: any) {
    console.error(error)
    setErro(error.message || 'Não foi possível calcular o resumo do caixa.')
  } finally {
    setCarregandoResumo(false)
  }
}

 function fecharModalFechamento() {
  if (fechando) return

  setModalFechar(false)
  setSessaoParaFechar(null)
  setValorContado('')
  setCarregandoResumo(false)

  setResumoFechamento({
    dinheiro: 0,
    pix: 0,
    cartao: 0,
    vendas: 0,
    suprimentos: 0,
    sangrias: 0,
    valorEsperado: 0,
  })
}

  async function confirmarAbertura() {
    if (!caixaSelecionado) return

    const valor = Number(
      valorInicial.replace(/\./g, '').replace(',', '.')
    )

    if (!Number.isFinite(valor) || valor < 0) {
      setErro('Informe um valor inicial válido.')
      return
    }

    try {
      setAbrindo(true)
      setErro('')

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError
      if (!user) throw new Error('Usuário não autenticado.')

      const { data: perfil, error: perfilError } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .maybeSingle()

      if (perfilError) throw perfilError
      if (!perfil?.empresa_id) {
        throw new Error('Empresa do usuário não encontrada.')
      }

      if (!caixaSelecionado.estabelecimento_id) {
        throw new Error(
          'Este caixa ainda não está vinculado a um estabelecimento.'
        )
      }

      const { data: sessaoExistente, error: sessaoError } = await supabase
        .from('sessoes_caixa')
        .select('id')
        .eq('caixa_id', caixaSelecionado.id)
        .eq('status', 'aberto')
        .limit(1)

      if (sessaoError) throw sessaoError

      if (sessaoExistente && sessaoExistente.length > 0) {
        throw new Error('Este caixa já possui uma sessão aberta.')
      }

      const { error: insertError } = await supabase
        .from('sessoes_caixa')
        .insert({
          empresa_id: perfil.empresa_id,
          caixa_id: caixaSelecionado.id,
          usuario_id: user.id,
          valor_inicial: valor,
          status: 'aberto',
          aberto_em: new Date().toISOString(),
        })

      if (insertError) throw insertError

      fecharModal()
      await carregarCaixas()
    } catch (error: any) {
      console.error(error)
      setErro(error.message || 'Não foi possível abrir o caixa.')
    } finally {
      setAbrindo(false)
    }
  }

  function abrirModalSangria(sessao: SessaoCaixa) {
    setSessaoParaSangria(sessao)
    setValorSangria('')
    setMotivoSangria('')
    setErro('')
    setModalSangria(true)
  }

  function fecharModalSangria() {
    if (sangrando) return

    setModalSangria(false)
    setSessaoParaSangria(null)
    setValorSangria('')
    setMotivoSangria('')
  }

  async function confirmarSangria() {
    if (!sessaoParaSangria) return

    const valor = Number(
      valorSangria.replace(/\./g, '').replace(',', '.')
    )

    if (!Number.isFinite(valor) || valor <= 0) {
      setErro('Informe um valor de sangria válido.')
      return
    }

    const motivo = motivoSangria.trim()

    if (!motivo) {
      setErro('Informe o motivo da sangria.')
      return
    }

    try {
      setSangrando(true)
      setErro('')

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError
      if (!user) throw new Error('Usuário não autenticado.')

      const { data: perfil, error: perfilError } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .maybeSingle()

      if (perfilError) throw perfilError
      if (!perfil?.empresa_id) {
        throw new Error('Empresa do usuário não encontrada.')
      }

      const { data: administrador, error: adminError } = await supabase
        .rpc('eh_administrador')

      if (adminError) throw adminError

      if (sessaoParaSangria.usuario_id !== user.id && !administrador) {
        throw new Error(
          'Somente o operador responsável pelo turno ou um administrador pode registrar a sangria.'
        )
      }

      const { error: sangriaError } = await supabase
        .from('movimentacoes_caixa')
        .insert({
          empresa_id: perfil.empresa_id,
          sessao_caixa_id: sessaoParaSangria.id,
          usuario_id: user.id,
          tipo: 'sangria',
          descricao: `Sangria - ${motivo}`,
          valor,
        })

      if (sangriaError) throw sangriaError

      fecharModalSangria()
      await carregarCaixas()
    } catch (error: any) {
      console.error(error)
      setErro(error.message || 'Não foi possível registrar a sangria.')
    } finally {
      setSangrando(false)
    }
  }

  async function confirmarFechamento() {
    if (!sessaoParaFechar) return

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      setErro(authError.message || 'Não foi possível validar o usuário.')
      return
    }

    if (!user) {
      setErro('Usuário não autenticado.')
      return
    }

    const { data: administrador, error: adminError } =
      await supabase.rpc('eh_administrador')

    if (adminError) {
      setErro(adminError.message || 'Não foi possível validar a permissão.')
      return
    }

    if (
      sessaoParaFechar.usuario_id !== user.id &&
      administrador !== true
    ) {
      setErro(
        'Somente o operador responsável pelo turno ou um administrador pode fechar este caixa.'
      )
      return
    }

    const valor = Number(
      valorContado.replace(/\\./g, '').replace(',', '.')
    )

    if (!Number.isFinite(valor) || valor < 0) {
      setErro('Informe um valor contado válido.')
      return
    }

    if (carregandoResumo) {
      setErro('Aguarde o sistema calcular o resumo do caixa.')
      return
    }

    try {
      setFechando(true)
      setErro('')

      const diferenca = valor - resumoFechamento.valorEsperado

      const observacao =
        Math.abs(diferenca) < 0.01
          ? 'Caixa conferido. Sem diferença.'
          : diferenca > 0
            ? `Sobra de ${formatarMoeda(diferenca)}`
            : `Falta de ${formatarMoeda(Math.abs(diferenca))}`

      const { error: fechamentoError } = await supabase
        .from('sessoes_caixa')
        .update({
          valor_final: valor,
          status: 'fechado',
          fechado_em: new Date().toISOString(),
          observacao,
        })
        .eq('id', sessaoParaFechar.id)

      if (fechamentoError) throw fechamentoError

      fecharModalFechamento()
      await carregarCaixas()
    } catch (error: any) {
      console.error(error)
      setErro(
        error.message || 'Não foi possível fechar o caixa.'
      )
    } finally {
      setFechando(false)
    }
  }


  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-300">
          <RefreshCw className="animate-spin" size={22} />
          Carregando caixas...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Caixas</h1>
            <p className="mt-1 text-sm text-slate-400">
              Gerencie os caixas e sessões de atendimento por estabelecimento.
            </p>
          </div>

          <button
            onClick={carregarCaixas}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw size={18} />
            Atualizar
          </button>
        </div>

        {erro && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {erro}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total de caixas</p>
            <p className="mt-1 text-3xl font-bold">{caixas.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Caixas abertos</p>
            <p className="mt-1 text-3xl font-bold text-emerald-400">
              {caixas.filter((caixa) => !!sessaoAtual(caixa.id)).length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Caixas fechados</p>
            <p className="mt-1 text-3xl font-bold text-slate-300">
              {caixas.filter((caixa) => !sessaoAtual(caixa.id)).length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {caixas.map((caixa) => {
            const sessao = sessaoAtual(caixa.id)
            const aberto = !!sessao

            return (
              <div
                key={caixa.id}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-slate-800 p-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Caixa
                    </p>
                    <h2 className="mt-1 text-xl font-bold">
                      #{String(caixa.numero).padStart(2, '0')}
                    </h2>
                    <p className="text-sm text-slate-400">
                      {caixa.descricao || 'Sem descrição'}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-blue-300">
                      <span>🏪</span>
                      <span className="truncate">
                        {caixa.estabelecimento?.nome || 'Estabelecimento não vinculado'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      aberto
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {aberto ? 'ABERTO' : 'FECHADO'}
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      Valor inicial
                    </span>
                    <span className="font-semibold">
                      {formatarMoeda(sessao?.valor_inicial ?? 0)}
                    </span>
                  </div>

                  {sessao && (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm text-slate-400">
                          <User size={16} />
                          Operador
                        </span>
                        <span className="max-w-[180px] truncate text-sm text-slate-300">
                          {sessao.usuario_id || 'Não identificado'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-400">
                          Aberto em
                        </span>
                        <span className="text-sm text-slate-300">
                          {formatarData(sessao.aberto_em)}
                        </span>
                      </div>
                    </>
                  )}

                 {aberto ? (
  usuarioEhAdministrador ||
  sessao.usuario_id === usuarioAtualId ? (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => abrirModalSangria(sessao)}
        className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
      >
        💸
        Sangria
      </button>

      <button
        type="button"
        onClick={() => abrirModalFechamento(sessao)}
        className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
      >
        <LockKeyhole size={18} />
        Fechar caixa
      </button>
    </div>
  ) : (
    <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-sm text-slate-500">
      🔒 Caixa em uso por outro operador
    </div>
  )
) : (
                    <button
                      onClick={() => abrirModal(caixa)}
                      disabled={!caixa.ativo}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <UnlockKeyhole size={18} />
                      Abrir caixa
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {caixas.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center">
            <Wallet size={40} className="mx-auto text-slate-600" />
            <h3 className="mt-4 font-semibold text-slate-300">
              Nenhum caixa cadastrado
            </h3>
          </div>
        )}
      </div>

      {modalAbrir && caixaSelecionado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Abrir caixa</p>
                <h2 className="mt-1 text-2xl font-bold">
                  Caixa #{String(caixaSelecionado.numero).padStart(2, '0')}
                </h2>
                <p className="mt-1 text-sm text-blue-300">
                  🏪 {caixaSelecionado.estabelecimento?.nome || 'Estabelecimento não vinculado'}
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                disabled={abrindo}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Valor inicial
              </label>

              <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 px-4">
                <span className="text-slate-500">R$</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={valorInicial}
                  onChange={(event) => setValorInicial(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      confirmarAbertura()
                    }
                  }}
                  placeholder="0,00"
                  className="w-full bg-transparent px-3 py-3.5 text-white outline-none"
                  disabled={abrindo}
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Informe o dinheiro disponível no caixa no início do turno.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={fecharModal}
                disabled={abrindo}
                className="flex-1 rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarAbertura}
                disabled={abrindo}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {abrindo ? 'Abrindo...' : 'Confirmar abertura'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalSangria && sessaoParaSangria && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Movimentação de caixa</p>
                <h2 className="mt-1 text-2xl font-bold">Registrar sangria</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Retirada de dinheiro do Caixa #
                  {String(
                    caixas.find(
                      (caixa) => caixa.id === sessaoParaSangria.caixa_id
                    )?.numero ?? ''
                  ).padStart(2, '0')}
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModalSangria}
                disabled={sangrando}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Valor da sangria
                </label>

                <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 px-4">
                  <span className="text-slate-500">R$</span>
                  <input
                    autoFocus
                    type="text"
                    inputMode="decimal"
                    value={valorSangria}
                    onChange={(event) => setValorSangria(event.target.value)}
                    placeholder="0,00"
                    className="w-full bg-transparent px-3 py-3.5 text-white outline-none"
                    disabled={sangrando}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Motivo
                </label>

                <select
                  value={motivoSangria}
                  onChange={(event) => setMotivoSangria(event.target.value)}
                  disabled={sangrando}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-white outline-none focus:border-amber-500"
                >
                  <option value="">Selecione o motivo</option>
                  <option value="Depósito bancário">Depósito bancário</option>
                  <option value="Retirada do proprietário">
                    Retirada do proprietário
                  </option>
                  <option value="Segurança">Segurança</option>
                  <option value="Pagamento de despesa">
                    Pagamento de despesa
                  </option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              {erro && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {erro}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={fecharModalSangria}
                disabled={sangrando}
                className="flex-1 rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarSangria}
                disabled={sangrando}
                className="flex-1 rounded-xl bg-amber-600 px-4 py-3 font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sangrando ? 'Registrando...' : 'Confirmar sangria'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalFechar && sessaoParaFechar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Fechar caixa</p>
                <h2 className="mt-1 text-2xl font-bold">
                  Conferência do caixa
                </h2>
              </div>

              <button
                type="button"
                onClick={fecharModalFechamento}
                disabled={fechando}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {carregandoResumo && (
              <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-300">
                Calculando vendas e formas de pagamento...
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-sm text-slate-400">💵 Dinheiro</p>
                <p className="mt-1 text-xl font-bold text-emerald-400">
                  {formatarMoeda(resumoFechamento.dinheiro)}
                </p>
              </div>

              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <p className="text-sm text-slate-400">📱 PIX</p>
                <p className="mt-1 text-xl font-bold text-cyan-400">
                  {formatarMoeda(resumoFechamento.pix)}
                </p>
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                <p className="text-sm text-slate-400">💳 Cartão</p>
                <p className="mt-1 text-xl font-bold text-blue-400">
                  {formatarMoeda(resumoFechamento.cartao)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">🧾 Total de vendas</p>
                <p className="mt-1 text-xl font-bold">
                  {formatarMoeda(resumoFechamento.vendas)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Valor inicial</span>
                <span className="font-semibold">
                  {formatarMoeda(sessaoParaFechar.valor_inicial)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Suprimentos</span>
                <span className="font-semibold text-emerald-400">
                  + {formatarMoeda(resumoFechamento.suprimentos)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Sangrias</span>
                <span className="font-semibold text-red-400">
                  - {formatarMoeda(resumoFechamento.sangrias)}
                </span>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    💰 Dinheiro esperado
                  </span>
                  <span className="text-xl font-bold text-emerald-400">
                    {formatarMoeda(resumoFechamento.valorEsperado)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Dinheiro contado
              </label>

              <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 px-4">
                <span className="text-slate-500">R$</span>

                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={valorContado}
                  onChange={(event) => setValorContado(event.target.value)}
                  placeholder="0,00"
                  className="w-full bg-transparent px-3 py-3.5 text-white outline-none"
                  disabled={fechando}
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                O operador informa somente o dinheiro físico contado no caixa.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={fecharModalFechamento}
                disabled={fechando}
                className="flex-1 rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={fechando || carregandoResumo}
                onClick={confirmarFechamento}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {fechando ? 'Fechando...' : 'Confirmar fechamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
