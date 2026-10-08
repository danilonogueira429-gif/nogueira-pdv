import { useEffect, useState } from 'react'
import {
  Search,
  Plus,
  Package,
  Pencil,
  Power,
  X,
  Save,
  Store,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type Produto = {
  id: string
  estabelecimento_id: string | null
  empresa_id: string
  codigo_barras: string | null
  codigo_interno: string | null
  nome: string
  descricao: string | null
  categoria: string | null
  marca: string | null
  unidade: string
  preco_custo: number
  preco_venda: number
  estoque: number
  estoque_minimo: number
  produto_pesavel: boolean
  ativo: boolean
}


type FormProduto = {
  estabelecimento_id: string
  codigo_barras: string
  codigo_interno: string
  nome: string
  descricao: string
  categoria: string
  marca: string
  unidade: string
  preco_custo: string
  preco_venda: string
  estoque: string
  estoque_minimo: string
  produto_pesavel: boolean

  ncm: string
  cest: string
  origem_mercadoria: string
  unidade_tributavel: string
  fator_conversao: string
  cfop_venda: string
  cst_icms: string
  csosn: string
  cst_pis: string
  aliquota_pis: string
  cst_cofins: string
  aliquota_cofins: string
  cst_ibs_cbs: string
  cclass_trib: string
}

const formularioInicial: FormProduto = {
  estabelecimento_id: '',
  codigo_barras: '',
  codigo_interno: '',
  nome: '',
  descricao: '',
  categoria: '',
  marca: '',
  unidade: 'UN',
  preco_custo: '',
  preco_venda: '',
  estoque: '0',
  estoque_minimo: '0',
  produto_pesavel: false,

  ncm: '',
  cest: '',
  origem_mercadoria: '',
  unidade_tributavel: '',
  fator_conversao: '1',
  cfop_venda: '',
  cst_icms: '',
  csosn: '',
  cst_pis: '',
  aliquota_pis: '',
  cst_cofins: '',
  aliquota_cofins: '',
  cst_ibs_cbs: '',
  cclass_trib: '',
}

function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([])
  const [estabelecimentoFiltro, setEstabelecimentoFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [carregandoFiscal, setCarregandoFiscal] = useState(false)

  const [modalAberto, setModalAberto] = useState(false)
  const [produtoEditando, setProdutoEditando] =
    useState<Produto | null>(null)

  const [form, setForm] =
    useState<FormProduto>(formularioInicial)

  const [erro, setErro] = useState('')

  type Estabelecimento = {
    id: string
    nome: string
    ativo: boolean
  }

  type EstoqueEstabelecimento = {
    produto_id: string
    estabelecimento_id: string
    estoque: number
    estoque_minimo: number
  }

  // ==========================================================
  // CARREGAR PRODUTOS
  // ==========================================================

  async function carregarEstabelecimentos() {
    const { data, error } = await supabase
      .from('estabelecimentos')
      .select('id, nome, ativo')
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao carregar estabelecimentos:', error)
      setEstabelecimentos([])
      return
    }

    setEstabelecimentos(data || [])

    if (!produtoEditando && !form.estabelecimento_id && data?.length === 1) {
      setForm((anterior) => ({
        ...anterior,
        estabelecimento_id: data[0].id,
      }))
    }
  }

  async function carregarProdutos() {
    setCarregando(true)
    setErro('')

    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao carregar produtos:', error)
      setErro('Não foi possível carregar os produtos.')
      setProdutos([])
      setCarregando(false)
      return
    }

    const produtosBase = data || []

    const { data: estoques, error: estoqueError } = await supabase
      .from('estoques_estabelecimentos')
      .select('produto_id, estabelecimento_id, estoque, estoque_minimo')

    if (estoqueError) {
      console.error('Erro ao carregar estoques por estabelecimento:', estoqueError)
      setErro('Não foi possível carregar os estoques por estabelecimento.')
      setProdutos([])
      setCarregando(false)
      return
    }

    const mapaEstoque = new Map(
      (estoques || []).map((item: EstoqueEstabelecimento) => [
        `${item.produto_id}:${item.estabelecimento_id}`,
        item,
      ]),
    )

    const produtosComEstoque = produtosBase.map((produto) => {
      if (!produto.estabelecimento_id) return produto

      const estoque = mapaEstoque.get(
        `${produto.id}:${produto.estabelecimento_id}`,
      )

      if (!estoque) return produto

      return {
        ...produto,
        estoque: Number(estoque.estoque),
        estoque_minimo: Number(estoque.estoque_minimo),
      }
    })

    setProdutos(produtosComEstoque)
    setCarregando(false)
  }

  useEffect(() => {
    carregarEstabelecimentos()
    carregarProdutos()
  }, [])

  // ==========================================================
  // ABRIR NOVO PRODUTO
  // ==========================================================

  function novoProduto() {
    setProdutoEditando(null)
    setForm({
      ...formularioInicial,
      estabelecimento_id:
        estabelecimentoFiltro !== 'todos'
          ? estabelecimentoFiltro
          : estabelecimentos.length === 1
            ? estabelecimentos[0].id
            : '',
    })
    setErro('')
    setModalAberto(true)
  }

  // ==========================================================
  // EDITAR PRODUTO
  // ==========================================================

  async function editarProduto(produto: Produto) {
    setProdutoEditando(produto)

    setForm({
      estabelecimento_id: produto.estabelecimento_id || '',
      codigo_barras: produto.codigo_barras || '',
      codigo_interno: produto.codigo_interno || '',
      nome: produto.nome,
      descricao: produto.descricao || '',
      categoria: produto.categoria || '',
      marca: produto.marca || '',
      unidade: produto.unidade,
      preco_custo: String(produto.preco_custo ?? ''),
      preco_venda: String(produto.preco_venda ?? ''),
      estoque: String(produto.estoque ?? '0'),
      estoque_minimo: String(produto.estoque_minimo ?? '0'),
      produto_pesavel: produto.produto_pesavel,

      ncm: '',
      cest: '',
      origem_mercadoria: '',
      unidade_tributavel: '',
      fator_conversao: '1',
      cfop_venda: '',
      cst_icms: '',
      csosn: '',
      cst_pis: '',
      aliquota_pis: '',
      cst_cofins: '',
      aliquota_cofins: '',
      cst_ibs_cbs: '',
      cclass_trib: '',
    })

    setErro('')
    setModalAberto(true)

    await carregarTributacaoProduto(
      produto.id,
      produto.estabelecimento_id || '',
    )
  }

  async function carregarTributacaoProduto(
    produtoId: string,
    estabelecimentoId: string,
  ) {
    if (!estabelecimentoId) return

    setCarregandoFiscal(true)

    const { data, error } = await supabase
      .from('tributacoes_produtos')
      .select('*')
      .eq('produto_id', produtoId)
      .eq('estabelecimento_id', estabelecimentoId)
      .maybeSingle()

    setCarregandoFiscal(false)

    if (error) {
      console.error('Erro ao carregar dados fiscais:', error)
      setErro('Não foi possível carregar os dados fiscais do produto.')
      return
    }

    if (!data) return

    setForm((anterior) => ({
      ...anterior,
      ncm: data.ncm || '',
      cest: data.cest || '',
      origem_mercadoria:
        data.origem_mercadoria === null || data.origem_mercadoria === undefined
          ? ''
          : String(data.origem_mercadoria),
      unidade_tributavel: data.unidade_tributavel || '',
      fator_conversao: String(data.fator_conversao ?? 1),
      cfop_venda: data.cfop_venda || '',
      cst_icms: data.cst_icms || '',
      csosn: data.csosn || '',
      cst_pis: data.cst_pis || '',
      aliquota_pis:
        data.aliquota_pis === null || data.aliquota_pis === undefined
          ? ''
          : String(data.aliquota_pis),
      cst_cofins: data.cst_cofins || '',
      aliquota_cofins:
        data.aliquota_cofins === null || data.aliquota_cofins === undefined
          ? ''
          : String(data.aliquota_cofins),
      cst_ibs_cbs: data.cst_ibs_cbs || '',
      cclass_trib: data.cclass_trib || '',
    }))
  }

  // ==========================================================
  // ATUALIZAR CAMPO
  // ==========================================================

  function atualizarCampo(
    campo: keyof FormProduto,
    valor: string | boolean,
  ) {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor,
    }))
  }

  // ==========================================================
  // SALVAR
  // ==========================================================

  async function salvarProduto(
    event: React.FormEvent,
  ) {
    event.preventDefault()

    setErro('')

    if (!form.nome.trim()) {
      setErro('Informe o nome do produto.')
      return
    }

    if (!form.preco_venda) {
      setErro('Informe o preço de venda.')
      return
    }

    setSalvando(true)

    try {
      // ------------------------------------------------------
      // BUSCAR EMPRESA DO USUÁRIO LOGADO
      // ------------------------------------------------------

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Usuário não autenticado.')
      }

      const { data: perfil, error: perfilError } =
        await supabase
          .from('perfis')
          .select('empresa_id')
          .eq('id', user.id)
          .single()

      if (perfilError || !perfil?.empresa_id) {
        throw new Error(
          'Não foi possível identificar a empresa do usuário.',
        )
      }

      // ------------------------------------------------------
      // DADOS DO PRODUTO
      // ------------------------------------------------------

      if (!form.estabelecimento_id) {
        throw new Error('Selecione o estabelecimento do produto.')
      }

      const estabelecimentoPertenceEmpresa = estabelecimentos.some(
        (estabelecimento) => estabelecimento.id === form.estabelecimento_id,
      )

      if (!estabelecimentoPertenceEmpresa) {
        throw new Error('O estabelecimento selecionado não pertence à empresa.')
      }

      const dados = {
        empresa_id: perfil.empresa_id,
        estabelecimento_id: form.estabelecimento_id,

        codigo_barras:
          form.codigo_barras.trim() || null,

        codigo_interno:
          form.codigo_interno.trim() || null,

        nome: form.nome.trim(),

        descricao:
          form.descricao.trim() || null,

        categoria:
          form.categoria.trim() || null,

        marca:
          form.marca.trim() || null,

        unidade: form.unidade,

        preco_custo:
          Number(form.preco_custo) || 0,

        preco_venda:
          Number(form.preco_venda) || 0,

        estoque:
          Number(form.estoque) || 0,

        estoque_minimo:
          Number(form.estoque_minimo) || 0,

        produto_pesavel:
          form.produto_pesavel,
      }

      // ------------------------------------------------------
      // EDITAR / NOVO PRODUTO
      // ------------------------------------------------------

      let produtoId = produtoEditando?.id || ''

      if (produtoEditando) {
        const { error } = await supabase
          .from('produtos')
          .update(dados)
          .eq('id', produtoEditando.id)

        if (error) {
          throw error
        }
      } else {
        const { data: produtoCriado, error } = await supabase
          .from('produtos')
          .insert(dados)
          .select('id')
          .single()

        if (error) {
          throw error
        }

        produtoId = produtoCriado.id
      }

      // ------------------------------------------------------
      // ESTOQUE POR ESTABELECIMENTO
      // ------------------------------------------------------

      const { error: estoqueError } = await supabase
        .from('estoques_estabelecimentos')
        .upsert(
          {
            empresa_id: perfil.empresa_id,
            estabelecimento_id: form.estabelecimento_id,
            produto_id: produtoId,
            estoque: Number(form.estoque) || 0,
            estoque_minimo: Number(form.estoque_minimo) || 0,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'estabelecimento_id,produto_id',
          },
        )

      if (estoqueError) {
        throw estoqueError
      }

      // ------------------------------------------------------
      // DADOS FISCAIS DO PRODUTO
      // ------------------------------------------------------

      const { error: tributacaoError } = await supabase
        .from('tributacoes_produtos')
        .upsert(
          {
            empresa_id: perfil.empresa_id,
            estabelecimento_id: form.estabelecimento_id,
            produto_id: produtoId,
            ncm: form.ncm.trim() || null,
            cest: form.cest.trim() || null,
            origem_mercadoria:
              form.origem_mercadoria.trim() === ''
                ? null
                : Number(form.origem_mercadoria),
            unidade_tributavel:
              form.unidade_tributavel.trim() || null,
            fator_conversao: Number(form.fator_conversao) || 1,
            cfop_venda: form.cfop_venda.trim() || null,
            cst_icms: form.cst_icms.trim() || null,
            csosn: form.csosn.trim() || null,
            cst_pis: form.cst_pis.trim() || null,
            aliquota_pis:
              form.aliquota_pis.trim() === ''
                ? null
                : Number(form.aliquota_pis),
            cst_cofins: form.cst_cofins.trim() || null,
            aliquota_cofins:
              form.aliquota_cofins.trim() === ''
                ? null
                : Number(form.aliquota_cofins),
            cst_ibs_cbs: form.cst_ibs_cbs.trim() || null,
            cclass_trib: form.cclass_trib.trim() || null,
            ativo: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'estabelecimento_id,produto_id',
          },
        )

      if (tributacaoError) {
        throw tributacaoError
      }

      setModalAberto(false)
      setProdutoEditando(null)
      setForm(formularioInicial)

      await carregarProdutos()
    } catch (error: any) {
      console.error(
        'Erro ao salvar produto:',
        error,
      )

      setErro(
        error?.message ||
          'Não foi possível salvar o produto.',
      )
    } finally {
      setSalvando(false)
    }
  }

  // ==========================================================
  // ATIVAR / DESATIVAR
  // ==========================================================

  async function alternarStatus(produto: Produto) {
    const novoStatus = !produto.ativo

    const { error } = await supabase
      .from('produtos')
      .update({
        ativo: novoStatus,
      })
      .eq('id', produto.id)

    if (error) {
      console.error(
        'Erro ao alterar status:',
        error,
      )

      alert(
        'Não foi possível alterar o status do produto.',
      )

      return
    }

    await carregarProdutos()
  }

  // ==========================================================
  // FILTRO
  // ==========================================================

  const produtosFiltrados = produtos.filter(
    (produto) => {
      const texto = busca
        .toLowerCase()
        .trim()

      const pertenceAoEstabelecimento =
        estabelecimentoFiltro === 'todos' ||
        produto.estabelecimento_id === estabelecimentoFiltro

      if (!pertenceAoEstabelecimento) return false
      if (!texto) return true

      return (
        produto.nome
          .toLowerCase()
          .includes(texto) ||
        produto.codigo_barras
          ?.toLowerCase()
          .includes(texto) ||
        produto.codigo_interno
          ?.toLowerCase()
          .includes(texto) ||
        produto.categoria
          ?.toLowerCase()
          .includes(texto)
      )
    },
  )

  // ==========================================================
  // FORMATAÇÃO
  // ==========================================================

  function moeda(valor: number) {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <header className="border-b border-slate-800 bg-slate-900">

        <div className="flex min-h-20 items-center justify-between gap-4 px-6">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <Package size={25} />
            </div>

            <div>
              <h1 className="text-xl font-bold">
                Produtos
              </h1>

              <p className="text-sm text-slate-400">
                Cadastro e controle de produtos
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={novoProduto}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500"
          >
            <Plus size={19} />
            Novo produto
          </button>

        </div>

      </header>

      {/* =====================================================
          CONTEÚDO
      ====================================================== */}

      <main className="p-6">

        <div className="mx-auto max-w-7xl">

          {/* FILTRO DE ESTABELECIMENTO */}

          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Store size={18} className="text-blue-400" />
              <span>Estabelecimento</span>
            </div>

            <select
              value={estabelecimentoFiltro}
              onChange={(event) => setEstabelecimentoFiltro(event.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500 md:max-w-md"
            >
              <option value="todos">Todos os estabelecimentos</option>
              {estabelecimentos.map((estabelecimento) => (
                <option key={estabelecimento.id} value={estabelecimento.id}>
                  {estabelecimento.nome}
                </option>
              ))}
            </select>

          </div>

          {/* BUSCA */}

          <div className="mb-6">

            <div className="relative max-w-xl">

              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={busca}
                onChange={(event) =>
                  setBusca(event.target.value)
                }
                placeholder="Pesquisar por nome, código ou categoria..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3.5 pl-12 pr-4 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
              />

            </div>

          </div>

          {/* =================================================
              TABELA
          ================================================== */}

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1000px]">

                <thead>

                  <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">

                    <th className="px-5 py-4">
                      Produto
                    </th>

                    <th className="px-5 py-4">
                      Estabelecimento
                    </th>

                    <th className="px-5 py-4">
                      Código
                    </th>

                    <th className="px-5 py-4">
                      Unidade
                    </th>

                    <th className="px-5 py-4">
                      Preço
                    </th>

                    <th className="px-5 py-4">
                      Estoque
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right">
                      Ações
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {carregando ? (

                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-16 text-center text-slate-500"
                      >
                        Carregando produtos...
                      </td>
                    </tr>

                  ) : produtosFiltrados.length === 0 ? (

                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-16 text-center"
                      >

                        <Package
                          size={42}
                          className="mx-auto mb-4 text-slate-700"
                        />

                        <p className="font-medium text-slate-400">
                          Nenhum produto encontrado
                        </p>

                        <p className="mt-2 text-sm text-slate-600">
                          Cadastre seu primeiro produto.
                        </p>

                      </td>
                    </tr>

                  ) : (

                    produtosFiltrados.map(
                      (produto) => (

                        <tr
                          key={produto.id}
                          className="border-b border-slate-800 last:border-0 hover:bg-slate-800/40"
                        >

                          <td className="px-5 py-4">

                            <div>
                              <p className="font-medium">
                                {produto.nome}
                              </p>

                              {produto.marca && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {produto.marca}
                                </p>
                              )}

                              {produto.produto_pesavel && (
                                <span className="mt-2 inline-flex rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-400">
                                  Pesável
                                </span>
                              )}

                            </div>

                          </td>

                          <td className="px-5 py-4 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                              <Store size={15} className="text-blue-400" />
                              <span>
                                {estabelecimentos.find(
                                  (estabelecimento) =>
                                    estabelecimento.id === produto.estabelecimento_id,
                                )?.nome || 'Sem estabelecimento'}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-400">

                            {produto.codigo_barras ||
                              produto.codigo_interno ||
                              '—'}

                          </td>

                          <td className="px-5 py-4 text-sm">
                            {produto.unidade}
                          </td>

                          <td className="px-5 py-4 font-semibold">
                            {moeda(
                              Number(
                                produto.preco_venda,
                              ),
                            )}
                          </td>

                          <td className="px-5 py-4">

                            <span
                              className={
                                Number(
                                  produto.estoque,
                                ) <=
                                Number(
                                  produto.estoque_minimo,
                                )
                                  ? 'font-semibold text-red-400'
                                  : 'text-slate-300'
                              }
                            >
                              {Number(
                                produto.estoque,
                              ).toLocaleString(
                                'pt-BR',
                              )}
                            </span>

                          </td>

                          <td className="px-5 py-4">

                            {produto.ativo ? (

                              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                                Ativo
                              </span>

                            ) : (

                              <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
                                Inativo
                              </span>

                            )}

                          </td>

                          <td className="px-5 py-4">

                            <div className="flex justify-end gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  editarProduto(
                                    produto,
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-500/10 hover:text-blue-400"
                                title="Editar"
                              >
                                <Pencil size={17} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  alternarStatus(
                                    produto,
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
                                title={
                                  produto.ativo
                                    ? 'Desativar'
                                    : 'Ativar'
                                }
                              >
                                <Power size={17} />
                              </button>

                            </div>

                          </td>

                        </tr>

                      ),
                    )

                  )}

                </tbody>

              </table>

            </div>

          </div>

          {/* CONTADOR */}

          <div className="mt-4 text-sm text-slate-500">
            {produtosFiltrados.length}{' '}
            {produtosFiltrados.length === 1
              ? 'produto encontrado'
              : 'produtos encontrados'}
          </div>

        </div>

      </main>

      {/* =====================================================
          MODAL
      ====================================================== */}

      {modalAberto && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">

              <div>

                <h2 className="text-xl font-bold">
                  {produtoEditando
                    ? 'Editar produto'
                    : 'Novo produto'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Preencha os dados do produto.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setModalAberto(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={salvarProduto}
              className="space-y-6 p-6"
            >

              {/* ESTABELECIMENTO */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Estabelecimento *
                </label>

                <div className="relative">
                  <Store
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <select
                    value={form.estabelecimento_id}
                    onChange={(event) =>
                      atualizarCampo(
                        'estabelecimento_id',
                        event.target.value,
                      )
                    }
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione o estabelecimento</option>
                    {estabelecimentos.map((estabelecimento) => (
                      <option key={estabelecimento.id} value={estabelecimento.id}>
                        {estabelecimento.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {estabelecimentos.length === 0 && (
                  <p className="mt-2 text-sm text-amber-400">
                    Cadastre um estabelecimento antes de cadastrar produtos.
                  </p>
                )}
              </div>

              {/* CÓDIGOS */}

              <div className="grid gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Código de barras
                  </label>

                  <input
                    value={form.codigo_barras}
                    onChange={(event) =>
                      atualizarCampo(
                        'codigo_barras',
                        event.target.value,
                      )
                    }
                    placeholder="Ex.: 7891234567890"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Código interno
                  </label>

                  <input
                    value={form.codigo_interno}
                    onChange={(event) =>
                      atualizarCampo(
                        'codigo_interno',
                        event.target.value,
                      )
                    }
                    placeholder="Código próprio da loja"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

              </div>

              {/* NOME */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Nome do produto *
                </label>

                <input
                  value={form.nome}
                  onChange={(event) =>
                    atualizarCampo(
                      'nome',
                      event.target.value,
                    )
                  }
                  placeholder="Ex.: Arroz Tipo 1 5kg"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              {/* DESCRIÇÃO */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Descrição
                </label>

                <textarea
                  value={form.descricao}
                  onChange={(event) =>
                    atualizarCampo(
                      'descricao',
                      event.target.value,
                    )
                  }
                  rows={3}
                  placeholder="Descrição opcional"
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              {/* CATEGORIA / MARCA / UNIDADE */}

              <div className="grid gap-4 md:grid-cols-3">

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Categoria
                  </label>

                  <input
                    value={form.categoria}
                    onChange={(event) =>
                      atualizarCampo(
                        'categoria',
                        event.target.value,
                      )
                    }
                    placeholder="Ex.: Alimentos"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Marca
                  </label>

                  <input
                    value={form.marca}
                    onChange={(event) =>
                      atualizarCampo(
                        'marca',
                        event.target.value,
                      )
                    }
                    placeholder="Ex.: Nogueira"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Unidade
                  </label>

                  <select
                    value={form.unidade}
                    onChange={(event) =>
                      atualizarCampo(
                        'unidade',
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="UN">
                      UN - Unidade
                    </option>

                    <option value="KG">
                      KG - Quilograma
                    </option>

                    <option value="G">
                      G - Grama
                    </option>

                    <option value="L">
                      L - Litro
                    </option>

                    <option value="ML">
                      ML - Mililitro
                    </option>

                    <option value="M">
                      M - Metro
                    </option>
                  </select>

                </div>

              </div>

              {/* PREÇOS */}

              <div className="grid gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Preço de custo
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.preco_custo}
                    onChange={(event) =>
                      atualizarCampo(
                        'preco_custo',
                        event.target.value,
                      )
                    }
                    placeholder="0,00"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Preço de venda *
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.preco_venda}
                    onChange={(event) =>
                      atualizarCampo(
                        'preco_venda',
                        event.target.value,
                      )
                    }
                    placeholder="0,00"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

              </div>

              {/* ESTOQUE */}

              <div className="grid gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Estoque inicial
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.estoque}
                    onChange={(event) =>
                      atualizarCampo(
                        'estoque',
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Estoque mínimo
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.estoque_minimo}
                    onChange={(event) =>
                      atualizarCampo(
                        'estoque_minimo',
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

              </div>

              {/* DADOS FISCAIS */}

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <div className="mb-5">
                  <h3 className="text-base font-semibold text-white">
                    📋 Dados fiscais
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Informações utilizadas na preparação da emissão fiscal da NFC-e.
                  </p>
                </div>

                {carregandoFiscal ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-4 text-sm text-slate-400">
                    Carregando dados fiscais...
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">NCM</label>
                        <input
                          value={form.ncm}
                          onChange={(event) => atualizarCampo('ncm', event.target.value)}
                          placeholder="Ex.: 19059090"
                          maxLength={8}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">CEST</label>
                        <input
                          value={form.cest}
                          onChange={(event) => atualizarCampo('cest', event.target.value)}
                          placeholder="Ex.: 1703200"
                          maxLength={7}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">Origem da mercadoria</label>
                        <select
                          value={form.origem_mercadoria}
                          onChange={(event) => atualizarCampo('origem_mercadoria', event.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500"
                        >
                          <option value="">Selecione</option>
                          <option value="0">0 - Nacional</option>
                          <option value="1">1 - Estrangeira - importação direta</option>
                          <option value="2">2 - Estrangeira - adquirida no mercado interno</option>
                          <option value="3">3 - Nacional com conteúdo de importação superior a 40%</option>
                          <option value="4">4 - Nacional - produção conforme processos básicos</option>
                          <option value="5">5 - Nacional com conteúdo de importação inferior ou igual a 40%</option>
                          <option value="6">6 - Estrangeira - importação direta, sem similar nacional</option>
                          <option value="7">7 - Estrangeira - adquirida no mercado interno, sem similar nacional</option>
                          <option value="8">8 - Nacional - mercadoria ou bem com conteúdo de importação superior a 70%</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">Unidade tributável</label>
                        <input
                          value={form.unidade_tributavel}
                          onChange={(event) => atualizarCampo('unidade_tributavel', event.target.value.toUpperCase())}
                          placeholder="Ex.: UN"
                          maxLength={6}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">Fator de conversão</label>
                        <input
                          type="number"
                          min="0.000001"
                          step="0.000001"
                          value={form.fator_conversao}
                          onChange={(event) => atualizarCampo('fator_conversao', event.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-5">
                      <h4 className="mb-4 text-sm font-semibold text-blue-400">ICMS</h4>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">CFOP de venda</label>
                          <input
                            value={form.cfop_venda}
                            onChange={(event) => atualizarCampo('cfop_venda', event.target.value)}
                            placeholder="Ex.: 5102"
                            maxLength={4}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">CST ICMS</label>
                          <input
                            value={form.cst_icms}
                            onChange={(event) => atualizarCampo('cst_icms', event.target.value)}
                            placeholder="Ex.: 00"
                            maxLength={3}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">CSOSN</label>
                          <input
                            value={form.csosn}
                            onChange={(event) => atualizarCampo('csosn', event.target.value)}
                            placeholder="Ex.: 102"
                            maxLength={3}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-5">
                      <h4 className="mb-4 text-sm font-semibold text-blue-400">PIS / COFINS</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">CST PIS</label>
                          <input
                            value={form.cst_pis}
                            onChange={(event) => atualizarCampo('cst_pis', event.target.value)}
                            placeholder="Ex.: 01"
                            maxLength={2}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">Alíquota PIS (%)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.aliquota_pis}
                            onChange={(event) => atualizarCampo('aliquota_pis', event.target.value)}
                            placeholder="0,00"
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">CST COFINS</label>
                          <input
                            value={form.cst_cofins}
                            onChange={(event) => atualizarCampo('cst_cofins', event.target.value)}
                            placeholder="Ex.: 01"
                            maxLength={2}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">Alíquota COFINS (%)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.aliquota_cofins}
                            onChange={(event) => atualizarCampo('aliquota_cofins', event.target.value)}
                            placeholder="0,00"
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-5">
                      <h4 className="mb-4 text-sm font-semibold text-blue-400">Reforma Tributária</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">CST IBS/CBS</label>
                          <input
                            value={form.cst_ibs_cbs}
                            onChange={(event) => atualizarCampo('cst_ibs_cbs', event.target.value)}
                            placeholder="Código conforme tabela vigente"
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">cClassTrib</label>
                          <input
                            value={form.cclass_trib}
                            onChange={(event) => atualizarCampo('cclass_trib', event.target.value)}
                            placeholder="Classificação tributária"
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-amber-300">
                      Não preencha códigos fiscais por tentativa. Os códigos devem corresponder ao produto e ao enquadramento fiscal do estabelecimento.
                    </div>
                  </div>
                )}
              </div>

              {/* PESÁVEL */}

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4">

                <input
                  type="checkbox"
                  checked={form.produto_pesavel}
                  onChange={(event) =>
                    atualizarCampo(
                      'produto_pesavel',
                      event.target.checked,
                    )
                  }
                  className="h-5 w-5 accent-blue-600"
                />

                <div>

                  <p className="font-medium">
                    Produto vendido por peso
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Usado para produtos que utilizam balança.
                  </p>

                </div>

              </label>

              {/* ERRO */}

              {erro && (

                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {erro}
                </div>

              )}

              {/* BOTÕES */}

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-5">

                <button
                  type="button"
                  onClick={() =>
                    setModalAberto(false)
                  }
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

                  {salvando
                    ? 'Salvando...'
                    : 'Salvar produto'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  )
}

export default Produtos