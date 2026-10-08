import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  CheckCircle2,
  Filter,
  Printer,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type Sessao = {
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

type Caixa = {
  id: string
  numero: number
  descricao: string | null
}

type Fechamento = Sessao & {
  caixaNumero: number
  caixaDescricao: string
  operador: string
  dinheiro: number
  pix: number
  cartao: number
  debito: number
  credito: number
  valeAlimentacao: number
  valeRefeicao: number
  voucher: number
  convenio: number
  fiado: number
  outros: number
  vendas: number
  suprimentos: number
  sangrias: number
  devolucoes: number
  valorEsperado: number
  diferenca: number
  situacao: 'ok' | 'falta' | 'sobra'
}

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function dataBR(valor: string | null) {
  return valor ? new Date(valor).toLocaleString('pt-BR') : '-'
}

function inicioDoDia(valor: string) {
  if (!valor) return ''
  return `${valor}T00:00:00`
}

export default function HistoricoFechamentos() {
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [autorizado, setAutorizado] = useState<boolean | null>(null)
  const [detalhe, setDetalhe] = useState<Fechamento | null>(null)

  const [busca, setBusca] = useState('')
  const [caixaFiltro, setCaixaFiltro] = useState('todos')
  const [operadorFiltro, setOperadorFiltro] = useState('todos')
  const [situacaoFiltro, setSituacaoFiltro] = useState('todas')
  const [dataInicial, setDataInicial] = useState('')
  const [dataFinal, setDataFinal] = useState('')

  async function carregarHistorico() {
    try {
      setCarregando(true)
      setErro('')

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError
      if (!user) {
        setAutorizado(false)
        return
      }

      const { data: perfil, error: perfilAtualError } = await supabase
        .from('perfis')
        .select('perfil, empresa_id')
        .eq('id', user.id)
        .maybeSingle()

      if (perfilAtualError) throw perfilAtualError

      const isAdmin = perfil?.perfil === 'administrador'
      setAutorizado(isAdmin)

      if (!isAdmin || !perfil?.empresa_id) return

      const { data: caixas, error: caixasError } = await supabase
        .from('caixas')
        .select('id, numero, descricao')
        .eq('empresa_id', perfil.empresa_id)
        .order('numero', { ascending: true })

      if (caixasError) throw caixasError

      const { data: sessoes, error: sessoesError } = await supabase
        .from('sessoes_caixa')
        .select(
          'id, caixa_id, usuario_id, valor_inicial, valor_final, status, aberto_em, fechado_em, observacao',
        )
        .eq('empresa_id', perfil.empresa_id)
        .eq('status', 'fechado')
        .not('fechado_em', 'is', null)
        .order('fechado_em', { ascending: false })

      if (sessoesError) throw sessoesError

      const sessoesLista = (sessoes || []) as Sessao[]
      const caixasLista = (caixas || []) as Caixa[]
      const caixaMap = new Map(caixasLista.map((caixa) => [caixa.id, caixa]))

      const usuarioIds = Array.from(
        new Set(
          sessoesLista
            .map((sessao) => sessao.usuario_id)
            .filter((id): id is string => Boolean(id)),
        ),
      )

      let nomes: Record<string, string> = {}
      if (usuarioIds.length > 0) {
        const { data: perfis, error: perfisError } = await supabase
          .from('perfis')
          .select('id, nome, email')
          .in('id', usuarioIds)

        if (perfisError) throw perfisError
        nomes = Object.fromEntries(
          (perfis || []).map((item) => [
            item.id,
            item.nome || item.email || 'Operador',
          ]),
        )
      }

      const sessaoIds = sessoesLista.map((sessao) => sessao.id)

      let movimentos: Array<{
        sessao_caixa_id: string
        tipo: string
        valor: number
        descricao: string | null
      }> = []

      if (sessaoIds.length > 0) {
        const { data, error } = await supabase
          .from('movimentacoes_caixa')
          .select('sessao_caixa_id, tipo, valor, descricao')
          .in('sessao_caixa_id', sessaoIds)

        if (error) throw error
        movimentos = (data || []) as typeof movimentos
      }

      // Busca as vendas de cada sessão para identificar todas as formas
      // de pagamento, inclusive vendas com pagamento dividido.
      let pagamentos: Array<{
        venda_id: string
        forma_pagamento: string
        valor: number
        troco: number
      }> = []

      if (sessaoIds.length > 0) {
        const { data: vendas, error: vendasError } = await supabase
          .from('vendas')
          .select('id, sessao_caixa_id')
          .in('sessao_caixa_id', sessaoIds)
          .eq('status', 'finalizada')

        if (vendasError) throw vendasError

        const vendaIds = (vendas || []).map((venda) => venda.id)

        if (vendaIds.length > 0) {
          const { data: pagamentosData, error: pagamentosError } = await supabase
            .from('pagamentos')
            .select('venda_id, forma_pagamento, valor, troco')
            .in('venda_id', vendaIds)

          if (pagamentosError) throw pagamentosError

          pagamentos = (pagamentosData || []) as typeof pagamentos
        }
      }

      const porSessao = new Map<string, typeof movimentos>()
      for (const movimento of movimentos) {
        const lista = porSessao.get(movimento.sessao_caixa_id) || []
        lista.push(movimento)
        porSessao.set(movimento.sessao_caixa_id, lista)
      }

      // Mapeia venda -> sessão para distribuir os pagamentos corretamente.
      const vendaSessaoMap = new Map<string, string>()

      if (sessaoIds.length > 0) {
        const { data: vendas, error: vendasError } = await supabase
          .from('vendas')
          .select('id, sessao_caixa_id')
          .in('sessao_caixa_id', sessaoIds)
          .eq('status', 'finalizada')

        if (vendasError) throw vendasError

        for (const venda of vendas || []) {
          vendaSessaoMap.set(venda.id, venda.sessao_caixa_id)
        }
      }

      const pagamentosPorSessao = new Map<string, typeof pagamentos>()

      for (const pagamento of pagamentos) {
        const sessaoId = vendaSessaoMap.get(pagamento.venda_id)
        if (!sessaoId) continue

        const lista = pagamentosPorSessao.get(sessaoId) || []
        lista.push(pagamento)
        pagamentosPorSessao.set(sessaoId, lista)
      }

      const resultado: Fechamento[] = sessoesLista.map((sessao) => {
        const caixa = caixaMap.get(sessao.caixa_id)
        const listaMovimentos = porSessao.get(sessao.id) || []
        const listaPagamentos = pagamentosPorSessao.get(sessao.id) || []

        let dinheiro = 0
        let pix = 0
        let cartao = 0
        let debito = 0
        let credito = 0
        let valeAlimentacao = 0
        let valeRefeicao = 0
        let voucher = 0
        let convenio = 0
        let fiado = 0
        let outros = 0
        let suprimentos = 0
        let sangrias = 0
        let devolucoes = 0

        // Formas de pagamento: fonte oficial é a tabela pagamentos.
        // Isso permite visualizar corretamente pagamentos divididos.
        for (const pagamento of listaPagamentos) {
          const forma = String(pagamento.forma_pagamento || '').toLowerCase()
          const valorPagamento = Number(pagamento.valor || 0)
          const troco = Number(pagamento.troco || 0)

          if (forma === 'dinheiro') {
            dinheiro += Math.max(valorPagamento - troco, 0)
          } else if (forma === 'pix') {
            pix += valorPagamento
          } else if (forma === 'cartao') {
            cartao += valorPagamento
          } else if (forma === 'debito') {
            debito += valorPagamento
          } else if (forma === 'credito') {
            credito += valorPagamento
          } else if (forma === 'vale_alimentacao') {
            valeAlimentacao += valorPagamento
          } else if (forma === 'vale_refeicao') {
            valeRefeicao += valorPagamento
          } else if (forma === 'voucher') {
            voucher += valorPagamento
          } else if (forma === 'convenio') {
            convenio += valorPagamento
          } else if (forma === 'fiado') {
            fiado += valorPagamento
          } else if (forma === 'outros') {
            outros += valorPagamento
          }
        }

        // Movimentações continuam sendo usadas para o dinheiro físico,
        // suprimentos, sangrias e devoluções.
        for (const movimento of listaMovimentos) {
          const valor = Number(movimento.valor || 0)

          if (movimento.tipo === 'suprimento') {
            suprimentos += valor
          } else if (movimento.tipo === 'sangria') {
            sangrias += valor
          } else if (movimento.tipo === 'devolucao') {
            devolucoes += valor
          }
        }

        const totalVendas =
          dinheiro +
          pix +
          cartao +
          debito +
          credito +
          valeAlimentacao +
          valeRefeicao +
          voucher +
          convenio +
          fiado +
          outros

        const valorEsperado =
          Number(sessao.valor_inicial || 0) +
          dinheiro +
          suprimentos -
          sangrias -
          devolucoes

        const valorFinal = Number(sessao.valor_final || 0)
        const diferenca = valorFinal - valorEsperado

        const situacao: Fechamento['situacao'] =
          diferenca < -0.01 ? 'falta' : diferenca > 0.01 ? 'sobra' : 'ok'

        return {
          ...sessao,
          caixaNumero: caixa?.numero ?? 0,
          caixaDescricao: caixa?.descricao || 'Caixa operacional',
          operador: sessao.usuario_id
            ? nomes[sessao.usuario_id] || 'Não identificado'
            : 'Não identificado',
          dinheiro,
          pix,
          cartao,
          debito,
          credito,
          valeAlimentacao,
          valeRefeicao,
          voucher,
          convenio,
          fiado,
          outros,
          suprimentos,
          sangrias,
          devolucoes,
          valorEsperado,
          diferenca,
          situacao,
          vendas: totalVendas,
        }
      })

      setFechamentos(resultado)
    } catch (error: any) {
      console.error(error)
      setErro(error.message || 'Não foi possível carregar o histórico.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarHistorico()
  }, [])

  const caixasDisponiveis = useMemo(
    () =>
      Array.from(
        new Map(
          fechamentos.map((item) => [String(item.caixaNumero), item.caixaNumero]),
        ).values(),
      ).sort((a, b) => a - b),
    [fechamentos],
  )

  const operadoresDisponiveis = useMemo(
    () => Array.from(new Set(fechamentos.map((item) => item.operador))).sort(),
    [fechamentos],
  )

  const filtrados = useMemo(() => {
    const inicio = dataInicial ? new Date(inicioDoDia(dataInicial)).getTime() : null
    const fim = dataFinal
      ? new Date(`${dataFinal}T23:59:59.999`).getTime()
      : null

    return fechamentos.filter((item) => {
      const texto = `${item.caixaNumero} ${item.operador}`.toLowerCase()
      const buscaOk = texto.includes(busca.trim().toLowerCase())
      const caixaOk =
        caixaFiltro === 'todos' || String(item.caixaNumero) === caixaFiltro
      const operadorOk =
        operadorFiltro === 'todos' || item.operador === operadorFiltro
      const situacaoOk =
        situacaoFiltro === 'todas' || item.situacao === situacaoFiltro
      const dataFechamento = item.fechado_em
        ? new Date(item.fechado_em).getTime()
        : 0
      const dataOk =
        (inicio === null || dataFechamento >= inicio) &&
        (fim === null || dataFechamento <= fim)

      return buscaOk && caixaOk && operadorOk && situacaoOk && dataOk
    })
  }, [fechamentos, busca, caixaFiltro, operadorFiltro, situacaoFiltro, dataInicial, dataFinal])

  const resumo = useMemo(() => {
    return filtrados.reduce(
      (acc, item) => {
        acc.total += 1
        if (item.situacao === 'ok') acc.ok += 1
        if (item.situacao === 'falta') acc.falta += 1
        if (item.situacao === 'sobra') acc.sobra += 1
        acc.valorFaltas += item.situacao === 'falta' ? Math.abs(item.diferenca) : 0
        acc.valorSobras += item.situacao === 'sobra' ? item.diferenca : 0
        return acc
      },
      { total: 0, ok: 0, falta: 0, sobra: 0, valorFaltas: 0, valorSobras: 0 },
    )
  }, [filtrados])

  function exportarCSV() {
    const cabecalho = [
      'Data fechamento',
      'Caixa',
      'Operador',
      'Valor inicial',
      'Dinheiro vendas',
      'PIX vendas',
      'Cartão vendas',
      'Débito vendas',
      'Crédito vendas',
      'Vale Alimentação vendas',
      'Vale Refeição vendas',
      'Voucher vendas',
      'Convênio vendas',
      'Fiado vendas',
      'Outros vendas',
      'Suprimentos',
      'Sangrias',
      'Devoluções',
      'Valor esperado',
      'Valor contado',
      'Diferença',
      'Situação',
    ]

    const linhas = filtrados.map((item) => [
      dataBR(item.fechado_em),
      `Caixa #${String(item.caixaNumero).padStart(2, '0')}`,
      item.operador,
      item.valor_inicial,
      item.dinheiro,
      item.pix,
      item.cartao,
      item.debito,
      item.credito,
      item.valeAlimentacao,
      item.valeRefeicao,
      item.voucher,
      item.convenio,
      item.fiado,
      item.outros,
      item.suprimentos,
      item.sangrias,
      item.devolucoes,
      item.valorEsperado,
      Number(item.valor_final || 0),
      item.diferenca,
      item.situacao === 'falta' ? 'FALTA' : item.situacao === 'sobra' ? 'SOBRA' : 'OK',
    ])

    const csv = [cabecalho, ...linhas]
      .map((linha) => linha.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `historico-fechamentos-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (carregando || autorizado === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex items-center gap-3">
          <RefreshCw size={22} className="animate-spin" />
          Carregando histórico de fechamentos...
        </div>
      </div>
    )
  }

  if (!autorizado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <AlertTriangle size={42} className="mx-auto text-red-400" />
          <h1 className="mt-4 text-2xl font-bold">Acesso negado</h1>
          <p className="mt-2 text-slate-300">
            O Histórico de Fechamentos é exclusivo para administradores.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <style>{`@media print { .no-print { display: none !important; } body { background: white !important; } .print-area { color: black !important; background: white !important; } }`}</style>

      <div className="mx-auto max-w-7xl space-y-6 print-area">
        <div className="no-print flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-blue-400">Controle administrativo</p>
            <h1 className="mt-1 text-3xl font-bold">Histórico de Fechamentos</h1>
            <p className="mt-2 text-slate-400">
              Confira todos os turnos encerrados e identifique faltas ou sobras de caixa.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={carregarHistorico} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800">
              <RefreshCw size={17} /> Atualizar
            </button>
            <button onClick={exportarCSV} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-500">
              <ArrowDownToLine size={17} /> Exportar Excel (CSV)
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">
              <Printer size={17} /> Imprimir / PDF
            </button>
          </div>
        </div>

        {erro && (
          <div className="no-print rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {erro}
          </div>
        )}

        {resumo.falta > 0 && (
          <div className="no-print flex items-center gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <AlertTriangle className="shrink-0 text-red-400" size={30} />
            <div>
              <p className="font-bold text-red-300">ATENÇÃO: existem faltas de caixa</p>
              <p className="mt-1 text-sm text-red-200/80">
                {resumo.falta} fechamento(s) com falta, totalizando {moeda(resumo.valorFaltas)}.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Fechamentos</p>
            <p className="mt-1 text-3xl font-bold">{resumo.total}</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="text-sm text-slate-400">🟢 Sem diferença</p>
            <p className="mt-1 text-3xl font-bold text-emerald-400">{resumo.ok}</p>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
            <p className="text-sm text-slate-400">🔴 Com falta</p>
            <p className="mt-1 text-3xl font-bold text-red-400">{resumo.falta}</p>
            <p className="mt-1 text-xs text-red-300">{moeda(resumo.valorFaltas)}</p>
          </div>
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
            <p className="text-sm text-slate-400">🟡 Com sobra</p>
            <p className="mt-1 text-3xl font-bold text-yellow-400">{resumo.sobra}</p>
            <p className="mt-1 text-xs text-yellow-300">{moeda(resumo.valorSobras)}</p>
          </div>
        </div>

        <div className="no-print rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <Filter size={18} /> Filtros
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Caixa ou operador..." className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-white outline-none focus:border-blue-500" />
            </div>
            <select value={caixaFiltro} onChange={(e) => setCaixaFiltro(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white">
              <option value="todos">Todos os caixas</option>
              {caixasDisponiveis.map((numero) => <option key={numero} value={String(numero)}>Caixa #{String(numero).padStart(2, '0')}</option>)}
            </select>
            <select value={operadorFiltro} onChange={(e) => setOperadorFiltro(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white">
              <option value="todos">Todos os operadores</option>
              {operadoresDisponiveis.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
            </select>
            <select value={situacaoFiltro} onChange={(e) => setSituacaoFiltro(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white">
              <option value="todas">Todas as situações</option>
              <option value="ok">🟢 OK</option>
              <option value="falta">🔴 Falta</option>
              <option value="sobra">🟡 Sobra</option>
            </select>
            <div className="flex gap-2">
              <input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} className="w-1/2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white" />
              <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} className="w-1/2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white" />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Fechamento</th>
                  <th className="px-5 py-4">Caixa</th>
                  <th className="px-5 py-4">Operador</th>
                  <th className="px-5 py-4">Esperado</th>
                  <th className="px-5 py-4">Contado</th>
                  <th className="px-5 py-4">Diferença</th>
                  <th className="px-5 py-4">Situação</th>
                  <th className="px-5 py-4">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((item) => (
                  <tr key={item.id} className={`border-b border-slate-800 last:border-0 ${item.situacao === 'falta' ? 'bg-red-500/5' : item.situacao === 'sobra' ? 'bg-yellow-500/5' : ''}`}>
                    <td className="px-5 py-4 text-slate-300">{dataBR(item.fechado_em)}</td>
                    <td className="px-5 py-4 font-semibold">#{String(item.caixaNumero).padStart(2, '0')}</td>
                    <td className="px-5 py-4">{item.operador}</td>
                    <td className="px-5 py-4">{moeda(item.valorEsperado)}</td>
                    <td className="px-5 py-4">{moeda(Number(item.valor_final || 0))}</td>
                    <td className={`px-5 py-4 font-bold ${item.situacao === 'falta' ? 'text-red-400' : item.situacao === 'sobra' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {item.diferenca > 0 ? '+' : ''}{moeda(item.diferenca)}
                    </td>
                    <td className="px-5 py-4">
                      {item.situacao === 'falta' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-400"><AlertTriangle size={14} /> FALTA</span>
                      ) : item.situacao === 'sobra' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-3 py-1 text-xs font-bold text-yellow-400"><ArrowUpRight size={14} /> SOBRA</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400"><CheckCircle2 size={14} /> OK</span>
                      )}
                    </td>
                    <td className="px-5 py-4"><button onClick={() => setDetalhe(item)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-800">Ver</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtrados.length === 0 && (
            <div className="p-12 text-center text-slate-500">Nenhum fechamento encontrado com os filtros atuais.</div>
          )}
        </div>
      </div>

      {detalhe && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400">Detalhes do fechamento</p>
                <h2 className="mt-1 text-2xl font-bold">Caixa #{String(detalhe.caixaNumero).padStart(2, '0')}</h2>
                <p className="mt-1 text-sm text-slate-400">{detalhe.operador} • {dataBR(detalhe.fechado_em)}</p>
              </div>
              <button onClick={() => setDetalhe(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X size={20} /></button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ['Valor inicial', detalhe.valor_inicial],
                ['Dinheiro em vendas', detalhe.dinheiro],
                ['PIX em vendas', detalhe.pix],
                ['Cartão em vendas', detalhe.cartao],
                ['Débito em vendas', detalhe.debito],
                ['Crédito em vendas', detalhe.credito],
                ['Vale Alimentação', detalhe.valeAlimentacao],
                ['Vale Refeição', detalhe.valeRefeicao],
                ['Voucher', detalhe.voucher],
                ['Convênio', detalhe.convenio],
                ['Fiado', detalhe.fiado],
                ['Outros', detalhe.outros],
                ['Total de vendas', detalhe.vendas],
                ['Suprimentos', detalhe.suprimentos],
                ['Sangrias', -detalhe.sangrias],
                ['Devoluções', -detalhe.devolucoes],
                ['Dinheiro esperado', detalhe.valorEsperado],
                ['Dinheiro contado', Number(detalhe.valor_final || 0)],
                ['Diferença', detalhe.diferenca],
              ].map(([rotulo, valor]) => (
                <div key={String(rotulo)} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">{rotulo}</p>
                  <p className="mt-1 font-semibold">{moeda(Number(valor))}</p>
                </div>
              ))}
            </div>

            <div className={`mt-5 rounded-xl p-4 ${detalhe.situacao === 'falta' ? 'border border-red-500/30 bg-red-500/10 text-red-300' : detalhe.situacao === 'sobra' ? 'border border-yellow-500/30 bg-yellow-500/10 text-yellow-300' : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
              <p className="font-bold">
                {detalhe.situacao === 'falta' ? `🔴 FALTA DE ${moeda(Math.abs(detalhe.diferenca))}` : detalhe.situacao === 'sobra' ? `🟡 SOBRA DE ${moeda(detalhe.diferenca)}` : '🟢 CAIXA CONFERIDO — SEM DIFERENÇA'}
              </p>
              {detalhe.observacao && <p className="mt-1 text-sm opacity-80">{detalhe.observacao}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
