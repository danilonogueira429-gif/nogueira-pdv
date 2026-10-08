import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  X,
} from 'lucide-react'

type Produto = {
  id: string
  codigo: string
  nome: string
  preco: number
  quantidade: number
}

type Cliente = {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  limite_credito: number
  ativo: boolean
}

function PDV() {
  const [codigo, setCodigo] = useState('')
  const codigoInputRef = useRef<HTMLInputElement>(null)
  const clienteSelectRef = useRef<HTMLSelectElement>(null)
  const valorPagamentoRef = useRef<HTMLInputElement>(null)
  const [itens, setItens] = useState<Produto[]>([])
  const [desconto, setDesconto] = useState(0)
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
const [clientes, setClientes] = useState<Cliente[]>([])
const [carregandoClientes, setCarregandoClientes] = useState(false)
  type FormaPagamento =
    | 'dinheiro'
    | 'pix'
    | 'cartao'
    | 'debito'
    | 'credito'
    | 'vale_alimentacao'
    | 'vale_refeicao'
    | 'voucher'
    | 'convenio'
    | 'fiado'
    | 'outros'

  type Pagamento = {
    forma_pagamento: FormaPagamento
    valor: number
    troco: number
  }

  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('dinheiro')
  const [valorPagamento, setValorPagamento] = useState('')
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [finalizando, setFinalizando] = useState(false)
 const [operadorNome, setOperadorNome] = useState('Operador')
const [caixaNumero, setCaixaNumero] = useState<number | null>(null)
const [carregandoCaixa, setCarregandoCaixa] = useState(true)

const [mostrarSelecaoCaixa, setMostrarSelecaoCaixa] = useState(false)
const [listaCaixas, setListaCaixas] = useState<
  {
    id: string
    numero: number
    descricao: string | null
    ocupado: boolean
  }[]
>([])

const [valorInicial, setValorInicial] = useState('')
const [caixaSelecionadoId, setCaixaSelecionadoId] = useState<string | null>(null)
const [abrindoTurno, setAbrindoTurno] = useState(false)
async function carregarClientes() {
  try {
    setCarregandoClientes(true)

    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome, cpf, telefone, limite_credito, ativo')
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (error) throw error

    setClientes(data || [])
  } catch (error) {
    console.error('Erro ao carregar clientes:', error)
    alert('Não foi possível carregar os clientes.')
  } finally {
    setCarregandoClientes(false)
  }
}

async function carregarCaixaAtual() {
  try {
    setCarregandoCaixa(true)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError

    if (!user) {
      setOperadorNome('Operador')
      setCaixaNumero(null)
      setMostrarSelecaoCaixa(true)
      return
    }

    // Busca os dados do operador logado
    const { data: perfil, error: perfilError } = await supabase
      .from('perfis')
      .select('empresa_id, nome')
      .eq('id', user.id)
      .maybeSingle()

    if (perfilError) throw perfilError

    setOperadorNome(perfil?.nome || user.email || 'Operador')

    if (!perfil?.empresa_id) {
      setCaixaNumero(null)
      setMostrarSelecaoCaixa(true)
      return
    }

    // Procura PRIMEIRO uma sessão aberta do próprio operador.
    // Isso evita pegar o caixa de outro funcionário.
    const { data: sessao, error: sessaoError } = await supabase
      .from('sessoes_caixa')
      .select('id, caixa_id')
      .eq('empresa_id', perfil.empresa_id)
      .eq('usuario_id', user.id)
      .eq('status', 'aberto')
      .order('aberto_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessaoError) throw sessaoError

    // O operador já possui um turno aberto
    if (sessao?.id && sessao?.caixa_id) {
      const { data: caixa, error: caixaError } = await supabase
        .from('caixas')
        .select('id, numero')
        .eq('id', sessao.caixa_id)
        .eq('empresa_id', perfil.empresa_id)
        .eq('ativo', true)
        .maybeSingle()

      if (caixaError) throw caixaError

      if (caixa) {
        setCaixaNumero(caixa.numero)
        setMostrarSelecaoCaixa(false)
        return
      }
    }

    // O operador não possui turno aberto.
    // Nesse caso, deverá selecionar um caixa.
    setCaixaNumero(null)
    setMostrarSelecaoCaixa(true)
  } catch (error) {
    console.error('Erro ao identificar caixa atual:', error)

    setCaixaNumero(null)
    setMostrarSelecaoCaixa(true)
  } finally {
    setCarregandoCaixa(false)
  }
}

  useEffect(() => {
    carregarCaixaAtual()
  }, [])
useEffect(() => {
  carregarClientes()
}, [])
useEffect(() => {
  function tratarTecla(event: KeyboardEvent) {
    if (
      event.key === 'F2' ||
      event.key === 'F4' ||
      event.key === 'F6' ||
      event.key === 'F7' ||
      event.key === 'F8' ||
      event.key === 'F10' ||
      event.key === 'Escape'
    ) {
      event.preventDefault()
    }

    switch (event.key) {
      case 'F2':
        codigoInputRef.current?.focus()
        break

      case 'F4':
        clienteSelectRef.current?.focus()
        break

      case 'F6':
        setFormaPagamento('dinheiro')
        valorPagamentoRef.current?.focus()
        break

      case 'F7':
        setFormaPagamento('pix')
        valorPagamentoRef.current?.focus()
        break

      case 'F8':
        setFormaPagamento('cartao')
        valorPagamentoRef.current?.focus()
        break

      case 'F10':
        finalizarVenda()
        break

      case 'Escape':
        limparVenda()
        break

      default:
        break
    }
  }

  window.addEventListener('keydown', tratarTecla)

  return () => {
    window.removeEventListener('keydown', tratarTecla)
  }
}, [itens, desconto, clienteSelecionado, pagamentos, finalizando, carregandoCaixa, caixaNumero, valorPagamento])
  async function carregarCaixasParaSelecao() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: perfil, error: perfilError } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .maybeSingle()

      if (perfilError) throw perfilError
      if (!perfil?.empresa_id) return

      const { data: caixas, error: caixasError } = await supabase
        .from('caixas')
        .select('id, numero, descricao, ativo')
        .eq('empresa_id', perfil.empresa_id)
        .eq('ativo', true)
        .order('numero', { ascending: true })

      if (caixasError) throw caixasError

      const { data: sessoesAbertas, error: sessoesError } = await supabase
        .from('sessoes_caixa')
        .select('caixa_id')
        .eq('empresa_id', perfil.empresa_id)
        .eq('status', 'aberto')

      if (sessoesError) throw sessoesError

      const ocupados = new Set((sessoesAbertas || []).map((s) => s.caixa_id))

      setListaCaixas((caixas || []).map((caixa) => ({
        id: caixa.id,
        numero: caixa.numero,
        descricao: caixa.descricao,
        ocupado: ocupados.has(caixa.id),
      })))
    } catch (error) {
      console.error('Erro ao carregar caixas:', error)
      alert('Não foi possível carregar os caixas.')
    }
  }

  async function abrirTurno() {
    if (!caixaSelecionadoId) {
      alert('Selecione um caixa.')
      return
    }

    const valor = Number(valorInicial.replace(/\./g, '').replace(',', '.'))

    if (Number.isNaN(valor) || valor < 0) {
      alert('Informe um valor inicial válido.')
      return
    }

    if (abrindoTurno) return

    try {
      setAbrindoTurno(true)

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) {
        alert('Usuário não autenticado.')
        return
      }

      const { data: perfil, error: perfilError } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .maybeSingle()

      if (perfilError) throw perfilError
      if (!perfil?.empresa_id) {
        alert('Empresa do usuário não encontrada.')
        return
      }

      const { data: sessaoExistente, error: sessaoError } = await supabase
        .from('sessoes_caixa')
        .select('id')
        .eq('caixa_id', caixaSelecionadoId)
        .eq('status', 'aberto')
        .maybeSingle()

      if (sessaoError) throw sessaoError

      if (sessaoExistente) {
        alert('Este caixa já está em uso por outro operador.')
        await carregarCaixasParaSelecao()
        return
      }

      const { data: novaSessao, error: abrirError } = await supabase
        .from('sessoes_caixa')
        .insert({
          empresa_id: perfil.empresa_id,
          caixa_id: caixaSelecionadoId,
          usuario_id: user.id,
          valor_inicial: valor,
          status: 'aberto',
          observacao: 'Turno aberto pelo operador',
        })
        .select('id, caixa_id')
        .single()

      if (abrirError) {
        console.error('Erro ao abrir turno:', abrirError)
        await carregarCaixasParaSelecao()

        if (
          abrirError.message.includes('idx_sessoes_caixa_aberta_unica') ||
          abrirError.message.toLowerCase().includes('duplicate key')
        ) {
          alert('Este caixa acabou de ser ocupado por outro operador.')
        } else {
          alert(`Não foi possível abrir o turno: ${abrirError.message}`)
        }

        return
      }

      const caixaSelecionado = listaCaixas.find(
        (caixa) => caixa.id === novaSessao.caixa_id,
      )

      setCaixaNumero(caixaSelecionado?.numero ?? null)
      setValorInicial('')
      setCaixaSelecionadoId(null)
      setMostrarSelecaoCaixa(false)

      alert(
        `Turno aberto com sucesso no Caixa #${String(
          caixaSelecionado?.numero ?? '',
        ).padStart(2, '0')}.`,
      )
    } catch (error) {
      console.error('Erro inesperado ao abrir turno:', error)
      alert('Ocorreu um erro inesperado ao abrir o turno.')
    } finally {
      setAbrindoTurno(false)
    }
  }

  useEffect(() => {
    if (mostrarSelecaoCaixa) {
      carregarCaixasParaSelecao()
    }
  }, [mostrarSelecaoCaixa])

  async function adicionarProduto() {
    const entrada = codigo.trim()

    if (!entrada) return

    // ==========================================
    // INTERPRETA CÓDIGO E QUANTIDADE
    // Exemplos:
    // 789100000001       → 1 unidade
    // 789100000001*3     → 3 unidades
    // 789100000001 *3    → 3 unidades
    // 789100000001 * 3  → 3 unidades
    // ==========================================

    const partes = entrada.split('*')

    if (partes.length > 2) {
      alert('Formato inválido. Use: código * quantidade')
      return
    }

    const codigoProduto = partes[0].trim()
    let quantidade = 1

    if (partes.length === 2) {
      const quantidadeInformada = Number(partes[1].trim())

      if (
        !Number.isInteger(quantidadeInformada) ||
        quantidadeInformada <= 0
      ) {
        alert('Quantidade inválida.')
        return
      }

      quantidade = quantidadeInformada
    }

    // ==========================================
    // PROCURA O PRODUTO REAL NO SUPABASE
    // ==========================================

    const { data, error } = await supabase
      .from('produtos')
      .select('id, codigo_barras, codigo_interno, nome, preco_venda, ativo')
      .or(
        `codigo_barras.eq.${codigoProduto},codigo_interno.eq.${codigoProduto}`
      )
      .eq('ativo', true)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar produto:', error)
      alert(`Erro ao buscar produto: ${error.message}`)
      return
    }

    if (!data) {
      alert('Produto não encontrado.')
      return
    }

    const produto: Produto = {
      id: data.id,
      codigo: data.codigo_barras || data.codigo_interno || codigoProduto,
      nome: data.nome,
      preco: Number(data.preco_venda) || 0,
      quantidade,
    }

    // ==========================================
    // ADICIONA OU SOMA NO CARRINHO
    // ==========================================

    setItens((itensAtuais) => {
      const itemExistente = itensAtuais.find(
        (item) => item.id === produto.id,
      )

      if (itemExistente) {
        return itensAtuais.map((item) =>
          item.id === produto.id
            ? {
                ...item,
                quantidade: item.quantidade + quantidade,
              }
            : item,
        )
      }

      return [...itensAtuais, produto]
    })

    setCodigo('')
  }

  function alterarQuantidade(
    id: string,
    quantidade: number,
  ) {
    if (quantidade <= 0) {
      removerItem(id)
      return
    }

    setItens(
      itens.map((item) =>
        item.id === id
          ? {
              ...item,
              quantidade,
            }
          : item,
      ),
    )
  }

  function removerItem(id: string) {
    setItens(itens.filter((item) => item.id !== id))
  }

  function limparVenda() {
    if (itens.length === 0) return

    if (
      confirm(
        'Deseja realmente cancelar todos os itens da venda?',
      )
    ) {
      setItens([])
      setDesconto(0)
    }
  }

  const subtotal = itens.reduce(
    (total, item) =>
      total + item.preco * item.quantidade,
    0,
  )

  const total = Math.max(subtotal - desconto, 0)

  const nomesFormasPagamento: Record<FormaPagamento, string> = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao: 'Cartão',
    debito: 'Débito',
    credito: 'Crédito',
    vale_alimentacao: 'Vale Alimentação',
    vale_refeicao: 'Vale Refeição',
    voucher: 'Voucher',
    convenio: 'Convênio',
    fiado: 'Fiado',
    outros: 'Outros',
  }

  const formasPagamento: {
    valor: FormaPagamento
    nome: string
    icone: string
  }[] = [
    { valor: 'dinheiro', nome: 'Dinheiro', icone: '💵' },
    { valor: 'pix', nome: 'PIX', icone: '📱' },
    { valor: 'debito', nome: 'Débito', icone: '💳' },
    { valor: 'credito', nome: 'Crédito', icone: '💳' },
    { valor: 'vale_alimentacao', nome: 'Vale Alimentação', icone: '🍽️' },
    { valor: 'vale_refeicao', nome: 'Vale Refeição', icone: '🍴' },
    { valor: 'voucher', nome: 'Voucher', icone: '🎟️' },
    { valor: 'convenio', nome: 'Convênio', icone: '🤝' },
    { valor: 'fiado', nome: 'Fiado', icone: '📝' },
    { valor: 'outros', nome: 'Outros', icone: '💰' },
  ]

  const totalPagamentos = pagamentos.reduce(
    (soma, pagamento) => soma + pagamento.valor - pagamento.troco,
    0,
  )
  const restantePagamento = Math.max(total - totalPagamentos, 0)

  function adicionarPagamento() {
    const valorDigitado = Number(
      valorPagamento.replace(/\./g, '').replace(',', '.'),
    )

    if (!Number.isFinite(valorDigitado) || valorDigitado <= 0) {
      alert('Informe um valor de pagamento válido.')
      return
    }

    if (restantePagamento <= 0) {
      alert('O total da venda já foi coberto.')
      return
    }

    const valorAplicado = Math.min(valorDigitado, restantePagamento)
    const troco =
      formaPagamento === 'dinheiro' && valorDigitado > restantePagamento
        ? valorDigitado - restantePagamento
        : 0

    setPagamentos((atuais) => [
      ...atuais,
      {
        forma_pagamento: formaPagamento,
        valor: valorAplicado,
        troco,
      },
    ])

    setValorPagamento('')
  }

  function removerPagamento(index: number) {
    setPagamentos((atuais) => atuais.filter((_, i) => i !== index))
  }

  async function finalizarVenda() {
    if (carregandoCaixa) {
      alert('Aguarde o sistema identificar o caixa aberto.')
      return
    }

    if (caixaNumero === null) {
      alert('Não existe um caixa aberto para realizar a venda. Abra um caixa antes de continuar.')
      return
    }

    if (itens.length === 0) {
      alert('Adicione pelo menos um produto.')
      return
    }

    if (finalizando) return

    if (pagamentos.length === 0) {
      alert('Adicione pelo menos uma forma de pagamento.')
      return
    }

    if (Math.abs(totalPagamentos - total) > 0.009) {
      alert(`Ainda falta R$ ${restantePagamento.toFixed(2)} para completar a venda.`)
      return
    }

    const resumoPagamentos = pagamentos
      .map((pagamento) =>
        `${nomesFormasPagamento[pagamento.forma_pagamento]}: R$ ${pagamento.valor.toFixed(2)}`,
      )
      .join('\n')

    const confirmar = confirm(
      `Finalizar venda de R$ ${total.toFixed(2)}?\n\n${resumoPagamentos}`,
    )

    if (!confirmar) return

    setFinalizando(true)

    try {
      const itensVenda = itens.map((item) => ({
        produto_id: item.id,
        quantidade: item.quantidade,
        preco_unitario: item.preco,
        desconto: 0,
        total: item.preco * item.quantidade,
      }))

      const { data, error } = await supabase.rpc(
        'finalizar_venda_multiplos_pagamentos',
        {
          p_subtotal: subtotal,
          p_desconto: desconto,
          p_total: total,
          p_pagamentos: pagamentos,
          p_itens: itensVenda,
          p_cliente_id: clienteSelecionado?.id || null,
        },
      )

      if (error) {
        console.error('Erro ao finalizar venda:', error)
        alert(`Não foi possível finalizar a venda: ${error.message}`)
        return
      }

      setItens([])
      setDesconto(0)
      setFormaPagamento('dinheiro')
      setPagamentos([])
      setValorPagamento('')
      setCodigo('')
      setClienteSelecionado(null)

      alert(`Venda finalizada com sucesso! ID: ${data}`)
    } catch (erro) {
      console.error('Erro inesperado ao finalizar venda:', erro)
      alert('Ocorreu um erro inesperado ao finalizar a venda.')
    } finally {
      setFinalizando(false)
    }
  }

  return (

    <div className="min-h-screen bg-slate-950 text-white">

      {mostrarSelecaoCaixa && !carregandoCaixa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-6">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
                <Barcode size={32} />
              </div>
              <h2 className="text-2xl font-bold">Selecionar Caixa</h2>
              <p className="mt-2 text-slate-400">
                Operador: {operadorNome}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {listaCaixas.map((caixa) => (
                <button
                  key={caixa.id}
                  type="button"
                  disabled={caixa.ocupado}
                  onClick={() => setCaixaSelecionadoId(caixa.id)}
                  className={`rounded-2xl border p-5 text-left transition ${
                    caixa.ocupado
                      ? 'cursor-not-allowed border-red-900 bg-red-950/30 opacity-60'
                      : caixaSelecionadoId === caixa.id
                        ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                        : 'border-slate-700 bg-slate-950 hover:border-blue-500 hover:bg-blue-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold">
                        Caixa #{String(caixa.numero).padStart(2, '0')}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {caixa.descricao || 'Caixa operacional'}
                      </p>
                    </div>
                    <div className={`h-3 w-3 rounded-full ${
                      caixa.ocupado ? 'bg-red-500' : 'bg-green-500'
                    }`} />
                  </div>

                  <p className={`mt-4 text-sm font-semibold ${
                    caixa.ocupado ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {caixa.ocupado ? '🔴 Em uso' : '🟢 Disponível'}
                  </p>
                </button>
              ))}
            </div>

            {listaCaixas.length === 0 && (
              <div className="rounded-xl border border-yellow-800 bg-yellow-950/30 p-5 text-center text-yellow-300">
                Nenhum caixa ativo foi encontrado.
              </div>
            )}

            {caixaSelecionadoId && (
              <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950 p-5">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Valor inicial do caixa
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valorInicial}
                    onChange={(event) => setValorInicial(event.target.value)}
                    placeholder="0,00"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <button
                  type="button"
                  onClick={abrirTurno}
                  disabled={abrindoTurno}
                  className="mt-4 w-full rounded-xl bg-blue-600 py-4 font-bold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {abrindoTurno ? 'Abrindo turno...' : 'Abrir Turno e Entrar no PDV'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900">

        <div className="flex h-16 items-center justify-between px-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <Barcode size={22} />
            </div>

            <div>
              <h1 className="font-bold">
                Nogueira PDV
              </h1>

              <p className="text-xs text-slate-400">
                Caixa Operacional
              </p>
            </div>

          </div>

          <div className="flex items-center gap-6 text-sm">

            <div>
              <span className="text-slate-500">
                Caixa
              </span>

              <span className="ml-2 font-semibold">
                {carregandoCaixa
                  ? '...'
                  : caixaNumero !== null
                    ? `#${String(caixaNumero).padStart(2, '0')}`
                    : 'Sem caixa'}
              </span>
            </div>

            <div>
              <span className="text-slate-500">
                Operador
              </span>

              <span className="ml-2 font-semibold">
  {operadorNome || 'Operador'}
</span>
            </div>

          </div>

        </div>

      </header>

      {/* CONTEÚDO */}
      <main className="grid h-[calc(100vh-64px)] min-h-0 overflow-hidden lg:grid-cols-[1fr_380px]">

        {/* ÁREA DOS PRODUTOS */}
        <section className="border-r border-slate-800 p-6">

          {/* BUSCA */}
          <div className="mb-6">

            <label className="mb-2 block text-sm font-medium text-slate-300">
              Código de barras / Produto
            </label>

            <div className="flex gap-3">

              <div className="relative flex-1">

                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  ref={codigoInputRef}
                  autoFocus
                  value={codigo}
                  onChange={(event) =>
                    setCodigo(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      adicionarProduto()
                    }
                  }}
                  placeholder="Bipe ou digite o código do produto..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-4 pl-12 pr-4 text-white outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />

              </div>

              <button
                onClick={adicionarProduto}
                className="rounded-xl bg-blue-600 px-6 font-semibold transition hover:bg-blue-500"
              >
                Adicionar
              </button>

            </div>

          </div>

{/* CLIENTE + DESCONTO */}
<div className="mb-6 grid gap-4 md:grid-cols-[1fr_220px]">

  {/* CLIENTE */}
  <div>
    <label className="mb-2 block text-sm font-medium text-slate-300">
      Cliente
    </label>

    <select
      ref={clienteSelectRef}
      value={clienteSelecionado?.id || ''}
      onChange={(event) => {
        const cliente = clientes.find(
          (item) => item.id === event.target.value
        )

        setClienteSelecionado(cliente || null)
      }}
      disabled={carregandoClientes}
      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
    >
      <option value="">
        {carregandoClientes
          ? 'Carregando clientes...'
          : 'Venda sem cliente'}
      </option>

      {clientes.map((cliente) => (
        <option key={cliente.id} value={cliente.id}>
          {cliente.nome}
          {cliente.cpf ? ` - ${cliente.cpf}` : ''}
        </option>
      ))}
    </select>

    {clienteSelecionado && (
      <div className="mt-2 text-xs text-slate-500">
        Limite de crédito: R${' '}
        {Number(clienteSelecionado.limite_credito || 0).toFixed(2)}
      </div>
    )}
  </div>

  {/* DESCONTO */}
  <div>
    <label className="mb-2 block text-sm font-medium text-slate-300">
      Desconto
    </label>

    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
        R$
      </span>

      <input
        type="number"
        min="0"
        step="0.01"
        value={desconto}
        onChange={(event) =>
          setDesconto(Number(event.target.value))
        }
        className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-12 pr-4 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  </div>

</div>


          {/* TABELA */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

            <div className="grid grid-cols-[1fr_100px_130px_130px_60px] border-b border-slate-800 px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">

              <span>Produto</span>
              <span>Qtd.</span>
              <span>Unitário</span>
              <span>Total</span>
              <span></span>

            </div>

            {itens.length === 0 ? (

              <div className="flex min-h-[350px] flex-col items-center justify-center text-center">

                <Barcode
                  size={48}
                  className="mb-4 text-slate-700"
                />

                <p className="font-medium text-slate-400">
                  Nenhum produto adicionado
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  Bipe o código de barras ou digite o código acima.
                </p>

              </div>

            ) : (

              <div>

                {itens.map((item) => (

                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_100px_130px_130px_60px] items-center border-b border-slate-800 px-5 py-4 last:border-b-0"
                  >

                    <div>
                      <p className="font-medium">
                        {item.nome}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Código: {item.codigo}
                      </p>
                    </div>

                    {/* QUANTIDADE */}
                    <div className="flex items-center gap-2">

                      <button
                        onClick={() =>
                          alterarQuantidade(
                            item.id,
                            item.quantidade - 1,
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700"
                      >
                        <Minus size={14} />
                      </button>

                      <span className="w-6 text-center">
                        {item.quantidade}
                      </span>

                      <button
                        onClick={() =>
                          alterarQuantidade(
                            item.id,
                            item.quantidade + 1,
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700"
                      >
                        <Plus size={14} />
                      </button>

                    </div>

                    <span>
                      R$ {item.preco.toFixed(2)}
                    </span>

                    <span className="font-semibold">
                      R${' '}
                      {(
                        item.preco *
                        item.quantidade
                      ).toFixed(2)}
                    </span>

                    <button
                      onClick={() =>
                        removerItem(item.id)
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={17} />
                    </button>

                  </div>

                ))}

              </div>

            )}

          </div>

          {/* LIMPAR */}
          {itens.length > 0 && (

            <button
              onClick={limparVenda}
              className="mt-4 flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
            >
              <X size={16} />
              Cancelar venda
            </button>

          )}

        </section>

        {/* RESUMO */}
       <aside className="flex min-h-0 flex-col overflow-y-auto bg-slate-900/50">

          <div className="flex-1 p-6">

            <h2 className="mb-6 text-xl font-bold">
              Resumo da venda
            </h2>

            <div className="space-y-4">

              <div className="flex justify-between text-slate-400">
                <span>Itens</span>
                <span>
                  {itens.reduce(
                    (total, item) =>
                      total + item.quantidade,
                    0,
                  )}
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>
                  R$ {subtotal.toFixed(2)}
                </span>
              </div>


              <div className="my-6 border-t border-slate-800" />

              <div className="flex items-end justify-between">

                <span className="text-slate-400">
                  Total
                </span>

                <span className="text-4xl font-bold text-blue-400">
                  R$ {total.toFixed(2)}
                </span>

              </div>

            </div>

          </div>

         {/* PAGAMENTO */}
<div className="border-t border-slate-800 p-4">

  <div className="mb-3 flex items-center justify-between">
    <p className="text-sm font-bold text-slate-200">
      Forma de pagamento
    </p>

    {restantePagamento > 0 ? (
      <span className="text-xs font-semibold text-yellow-400">
        Restante: R$ {restantePagamento.toFixed(2)}
      </span>
    ) : (
      <span className="text-xs font-semibold text-green-400">
        Pagamento completo
      </span>
    )}
  </div>

  {/* FORMAS DE PAGAMENTO */}
  <div className="grid grid-cols-3 gap-2">
    {formasPagamento.map((forma) => {
      const nomeCurto =
        forma.valor === 'vale_alimentacao'
          ? 'VA'
          : forma.valor === 'vale_refeicao'
            ? 'VR'
            : forma.valor === 'convenio'
              ? 'Convênio'
              : forma.nome

      return (
        <button
          key={forma.valor}
          type="button"
          onClick={() => setFormaPagamento(forma.valor)}
          className={`flex h-10 items-center justify-center gap-1 rounded-lg border px-2 text-xs font-medium transition ${
            formaPagamento === forma.valor
              ? 'border-blue-500 bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500 hover:bg-blue-500/10'
          }`}
          title={forma.nome}
        >
          <span>{forma.icone}</span>
          <span>{nomeCurto}</span>
        </button>
      )
    })}
  </div>

  {/* VALOR */}
  <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950 p-3">

    <label className="mb-2 block text-xs text-slate-400">
      Valor recebido
    </label>

    <div className="flex gap-2">

      <input
        ref={valorPagamentoRef}
        type="text"
        inputMode="decimal"
        value={valorPagamento}
        onChange={(event) => setValorPagamento(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            adicionarPagamento()
          }
        }}
        placeholder={
          restantePagamento > 0
            ? restantePagamento.toFixed(2).replace('.', ',')
            : '0,00'
        }
        className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
      />

      <button
        type="button"
        onClick={adicionarPagamento}
        disabled={restantePagamento <= 0}
        className="rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-bold transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Adicionar
      </button>

    </div>

  </div>

  {/* PAGAMENTOS ADICIONADOS */}
  {pagamentos.length > 0 && (
    <div className="mt-3 space-y-1.5">

      {pagamentos.map((pagamento, index) => (
        <div
          key={`${pagamento.forma_pagamento}-${index}`}
          className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
        >

          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-300">
              {nomesFormasPagamento[pagamento.forma_pagamento]}
            </p>

            {pagamento.troco > 0 && (
              <p className="text-[10px] text-slate-500">
                Troco: R$ {pagamento.troco.toFixed(2)}
              </p>
            )}
          </div>

          <div className="ml-2 flex items-center gap-2">
            <span className="text-sm font-bold text-white">
              R$ {pagamento.valor.toFixed(2)}
            </span>

            <button
              type="button"
              onClick={() => removerPagamento(index)}
              className="text-[10px] font-semibold text-red-400 hover:text-red-300"
            >
              Remover
            </button>
          </div>

        </div>
      ))}

    </div>
  )}

  {/* TOTAL PAGO */}
  <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5">

    <span className="text-xs text-slate-400">
      Total pago
    </span>

    <span className="text-lg font-bold text-blue-400">
      R$ {totalPagamentos.toFixed(2)}
    </span>

  </div>

  {/* FINALIZAR */}
  <button
    onClick={finalizarVenda}
    disabled={
      finalizando ||
      carregandoCaixa ||
      caixaNumero === null ||
      pagamentos.length === 0 ||
      Math.abs(totalPagamentos - total) > 0.009
    }
    className="mt-3 sticky bottom-0 z-10 w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold shadow-lg transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {finalizando
      ? 'Finalizando venda...'
      : '✓ Finalizar venda'}
  </button>

</div>

        </aside>

      </main>

    </div>
  )
}

export default PDV