import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Venda = {
  id: string;
  created_at: string;
  usuario_id: string | null;
  sessao_caixa_id: string | null;
  subtotal: number;
  desconto: number;
  total: number;
  status: string;
};

type ItemVenda = {
  venda_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  total: number;
  produto_nome?: string;
};

type Pagamento = {
  venda_id: string;
  forma_pagamento: string;
  valor: number;
  troco: number;
};

type Perfil = {
  id: string;
  nome: string;
};

type SessaoCaixa = {
  id: string;
  caixa_id: string;
  usuario_id: string;
};

type Caixa = {
  id: string;
  numero: number;
  descricao: string;
};

const nomesPagamento: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao: "Cartão",
  debito: "Débito",
  credito: "Crédito",
  vale_alimentacao: "Vale Alimentação",
  vale_refeicao: "Vale Refeição",
  voucher: "Voucher",
  convenio: "Convênio",
  fiado: "Fiado",
  outros: "Outros",
};

function dinheiro(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataHora(data: string) {
  return new Date(data).toLocaleString("pt-BR");
}

export default function HistoricoVendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [sessoes, setSessoes] = useState<SessaoCaixa[]>([]);
  const [caixas, setCaixas] = useState<Caixa[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [busca, setBusca] = useState("");
  const [filtroPagamento, setFiltroPagamento] = useState("todos");
  const [filtroCaixa, setFiltroCaixa] = useState("todos");
  const [filtroOperador, setFiltroOperador] = useState("todos");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");

  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(
    null
  );

  async function carregarDados() {
    try {
      setCarregando(true);
      setErro("");

      const [
        vendasResult,
        itensResult,
        pagamentosResult,
        perfisResult,
        sessoesResult,
        caixasResult,
      ] = await Promise.all([
        supabase
          .from("vendas")
          .select(
            "id, created_at, usuario_id, sessao_caixa_id, subtotal, desconto, total, status"
          )
          .order("created_at", { ascending: false })
          .limit(500),

        supabase
          .from("itens_venda")
          .select(
            "venda_id, produto_id, quantidade, preco_unitario, desconto, total"
          ),

        supabase
          .from("pagamentos")
          .select("venda_id, forma_pagamento, valor, troco"),

        supabase.from("perfis").select("id, nome"),

        supabase
          .from("sessoes_caixa")
          .select("id, caixa_id, usuario_id"),

        supabase.from("caixas").select("id, numero, descricao").order("numero"),
      ]);

      if (vendasResult.error) throw vendasResult.error;
      if (itensResult.error) throw itensResult.error;
      if (pagamentosResult.error) throw pagamentosResult.error;
      if (perfisResult.error) throw perfisResult.error;
      if (sessoesResult.error) throw sessoesResult.error;
      if (caixasResult.error) throw caixasResult.error;

      const vendasData = vendasResult.data || [];
      const itensData = itensResult.data || [];

      /*
       * Busca os nomes dos produtos separadamente.
       * Assim evitamos depender de relacionamentos automáticos
       * configurados no Supabase.
       */
      const produtoIds = [
        ...new Set(itensData.map((item) => item.produto_id)),
      ];

      let produtosData: {
        id: string;
        nome: string;
      }[] = [];

      if (produtoIds.length > 0) {
        const produtosResult = await supabase
          .from("produtos")
          .select("id, nome")
          .in("id", produtoIds);

        if (produtosResult.error) throw produtosResult.error;

        produtosData = produtosResult.data || [];
      }

      const mapaProdutos = new Map(
        produtosData.map((produto) => [produto.id, produto.nome])
      );

      const itensComNome = itensData.map((item) => ({
        ...item,
        produto_nome: mapaProdutos.get(item.produto_id) || "Produto",
      }));

      setVendas(vendasData);
      setItens(itensComNome);
      setPagamentos(pagamentosResult.data || []);
      setPerfis(perfisResult.data || []);
      setSessoes(sessoesResult.data || []);
      setCaixas(caixasResult.data || []);
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.message ||
          "Não foi possível carregar o histórico de vendas."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const mapaPerfis = useMemo(
    () => new Map(perfis.map((perfil) => [perfil.id, perfil.nome])),
    [perfis]
  );

  const mapaSessoes = useMemo(
    () => new Map(sessoes.map((sessao) => [sessao.id, sessao])),
    [sessoes]
  );

  const mapaCaixas = useMemo(
    () => new Map(caixas.map((caixa) => [caixa.id, caixa])),
    [caixas]
  );

  function pagamentosDaVenda(vendaId: string) {
    return pagamentos.filter((pagamento) => pagamento.venda_id === vendaId);
  }

  function itensDaVenda(vendaId: string) {
    return itens.filter((item) => item.venda_id === vendaId);
  }

  function operadorDaVenda(venda: Venda) {
    return (
      mapaPerfis.get(venda.usuario_id || "") ||
      "Operador não identificado"
    );
  }

  function caixaDaVenda(venda: Venda) {
    const sessao = mapaSessoes.get(venda.sessao_caixa_id || "");

    if (!sessao) {
      return "Não identificado";
    }

    const caixa = mapaCaixas.get(sessao.caixa_id);

    if (!caixa) {
      return "Não identificado";
    }

    return `Caixa #${String(caixa.numero).padStart(2, "0")}`;
  }

  function formasDaVenda(vendaId: string) {
    const lista = pagamentosDaVenda(vendaId);

    if (lista.length === 0) {
      return "Não informado";
    }

    return lista
      .map(
        (pagamento) =>
          `${nomesPagamento[pagamento.forma_pagamento] ||
            pagamento.forma_pagamento} ${dinheiro(pagamento.valor)}`
      )
      .join(" + ");
  }

  const vendasFiltradas = useMemo(() => {
    const texto = busca.trim().toLowerCase();

    return vendas.filter((venda) => {
      const operador = operadorDaVenda(venda).toLowerCase();
      const caixa = caixaDaVenda(venda).toLowerCase();

      const vendaItens = itensDaVenda(venda.id);

      const produtos = vendaItens
        .map((item) => item.produto_nome || "")
        .join(" ")
        .toLowerCase();

      const pagamentosVenda = pagamentosDaVenda(venda.id);

      const temPagamento =
        filtroPagamento === "todos" ||
        pagamentosVenda.some(
          (pagamento) =>
            pagamento.forma_pagamento === filtroPagamento
        );

      const sessao = mapaSessoes.get(venda.sessao_caixa_id || "");

      const temCaixa =
        filtroCaixa === "todos" ||
        sessao?.caixa_id === filtroCaixa;

      const temOperador =
        filtroOperador === "todos" ||
        venda.usuario_id === filtroOperador;

      const dataVenda = new Date(venda.created_at);
      const dataVendaString = dataVenda.toISOString().slice(0, 10);

      const dentroDataInicial =
        !dataInicial || dataVendaString >= dataInicial;

      const dentroDataFinal =
        !dataFinal || dataVendaString <= dataFinal;

      const correspondeBusca =
        !texto ||
        venda.id.toLowerCase().includes(texto) ||
        operador.includes(texto) ||
        caixa.includes(texto) ||
        produtos.includes(texto);

      return (
        correspondeBusca &&
        temPagamento &&
        temCaixa &&
        temOperador &&
        dentroDataInicial &&
        dentroDataFinal
      );
    });
  }, [
    vendas,
    itens,
    pagamentos,
    busca,
    filtroPagamento,
    filtroCaixa,
    filtroOperador,
    dataInicial,
    dataFinal,
    mapaSessoes,
  ]);

  const totalVendido = useMemo(
    () =>
      vendasFiltradas.reduce(
        (total, venda) => total + Number(venda.total || 0),
        0
      ),
    [vendasFiltradas]
  );

  const quantidadeVendas = vendasFiltradas.length;

  function exportarCSV() {
    const cabecalho = [
      "Data",
      "Venda",
      "Caixa",
      "Operador",
      "Subtotal",
      "Desconto",
      "Total",
      "Pagamento",
      "Status",
    ];

    const linhas = vendasFiltradas.map((venda) => [
      dataHora(venda.created_at),
      venda.id,
      caixaDaVenda(venda),
      operadorDaVenda(venda),
      Number(venda.subtotal || 0).toFixed(2).replace(".", ","),
      Number(venda.desconto || 0).toFixed(2).replace(".", ","),
      Number(venda.total || 0).toFixed(2).replace(".", ","),
      formasDaVenda(venda.id),
      venda.status,
    ]);

    const csv = [cabecalho, ...linhas]
      .map((linha) =>
        linha
          .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `historico-vendas-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  }

  function imprimir() {
    window.print();
  }

  function limparFiltros() {
    setBusca("");
    setFiltroPagamento("todos");
    setFiltroCaixa("todos");
    setFiltroOperador("todos");
    setDataInicial("");
    setDataFinal("");
  }

  if (carregando) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <div className="mb-3 text-4xl">🧾</div>
          <p className="text-slate-300">
            Carregando histórico de vendas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:bg-white print:text-black">
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white print:text-black">
            Histórico de Vendas
          </h1>

          <p className="mt-1 text-slate-400 print:text-slate-700">
            Consulte as vendas realizadas, produtos, pagamentos e operadores.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={carregarDados}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            🔄 Atualizar
          </button>

          <button
            onClick={exportarCSV}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            📥 Exportar CSV
          </button>

          <button
            onClick={imprimir}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {/* ERRO */}
      {erro && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">
          <strong>Erro:</strong> {erro}
        </div>
      )}

      {/* RESUMO */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Vendas encontradas</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {quantidadeVendas}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Total vendido</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">
            {dinheiro(totalVendido)}
          </p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            🔎 Filtros
          </h2>

          <button
            onClick={limparFiltros}
            className="text-sm font-semibold text-blue-400 hover:text-blue-300"
          >
            Limpar filtros
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Pesquisar
            </label>

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Venda, produto, operador..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Forma de pagamento
            </label>

            <select
              value={filtroPagamento}
              onChange={(e) => setFiltroPagamento(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
            >
              <option value="todos">Todos</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="cartao">Cartão</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
              <option value="vale_alimentacao">
                Vale Alimentação
              </option>
              <option value="vale_refeicao">
                Vale Refeição
              </option>
              <option value="voucher">Voucher</option>
              <option value="convenio">Convênio</option>
              <option value="fiado">Fiado</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Caixa
            </label>

            <select
              value={filtroCaixa}
              onChange={(e) => setFiltroCaixa(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
            >
              <option value="todos">Todos os caixas</option>

              {caixas.map((caixa) => (
                <option key={caixa.id} value={caixa.id}>
                  Caixa #{String(caixa.numero).padStart(2, "0")} -{" "}
                  {caixa.descricao}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Operador
            </label>

            <select
              value={filtroOperador}
              onChange={(e) => setFiltroOperador(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
            >
              <option value="todos">Todos os operadores</option>

              {perfis.map((perfil) => (
                <option key={perfil.id} value={perfil.id}>
                  {perfil.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Data inicial
            </label>

            <input
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Data final
            </label>

            <input
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* TABELA */}
      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="border-b border-slate-700 bg-slate-800">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">
                  Data/Hora
                </th>

                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">
                  Venda
                </th>

                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">
                  Caixa
                </th>

                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">
                  Operador
                </th>

                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">
                  Pagamento
                </th>

                <th className="px-4 py-4 text-right text-sm font-semibold text-slate-300">
                  Total
                </th>

                <th className="px-4 py-4 text-center text-sm font-semibold text-slate-300">
                  Ação
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {vendasFiltradas.map((venda) => (
                <tr
                  key={venda.id}
                  className="transition hover:bg-slate-800/60"
                >
                  <td className="px-4 py-4 text-sm text-slate-300">
                    {dataHora(venda.created_at)}
                  </td>

                  <td className="px-4 py-4">
                    <span className="font-mono text-xs text-slate-400">
                      {venda.id.substring(0, 8)}...
                    </span>
                  </td>

                  <td className="px-4 py-4 text-sm font-semibold text-white">
                    {caixaDaVenda(venda)}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-300">
                    {operadorDaVenda(venda)}
                  </td>

                  <td className="max-w-[260px] px-4 py-4 text-sm text-slate-300">
                    {formasDaVenda(venda.id)}
                  </td>

                  <td className="px-4 py-4 text-right font-bold text-emerald-400">
                    {dinheiro(Number(venda.total))}
                  </td>

                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => setVendaSelecionada(venda)}
                      className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-400 hover:bg-blue-500/20"
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}

              {vendasFiltradas.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    <div className="text-4xl">🧾</div>
                    <p className="mt-3 font-semibold">
                      Nenhuma venda encontrada.
                    </p>
                    <p className="mt-1 text-sm">
                      Tente alterar ou limpar os filtros.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALHES */}
      {vendaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Detalhes da Venda
                </h2>

                <p className="mt-1 font-mono text-xs text-slate-500">
                  {vendaSelecionada.id}
                </p>
              </div>

              <button
                onClick={() => setVendaSelecionada(null)}
                className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* INFORMAÇÕES */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-slate-800 p-4">
                <p className="text-xs text-slate-400">Data/Hora</p>
                <p className="mt-1 font-semibold text-white">
                  {dataHora(vendaSelecionada.created_at)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-800 p-4">
                <p className="text-xs text-slate-400">Operador</p>
                <p className="mt-1 font-semibold text-white">
                  {operadorDaVenda(vendaSelecionada)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-800 p-4">
                <p className="text-xs text-slate-400">Caixa</p>
                <p className="mt-1 font-semibold text-white">
                  {caixaDaVenda(vendaSelecionada)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-800 p-4">
                <p className="text-xs text-slate-400">Status</p>
                <p className="mt-1 font-semibold text-emerald-400">
                  {vendaSelecionada.status}
                </p>
              </div>
            </div>

            {/* PRODUTOS */}
            <div className="mt-6">
              <h3 className="mb-3 text-lg font-bold text-white">
                🛒 Produtos
              </h3>

              <div className="overflow-hidden rounded-xl border border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="px-3 py-3 text-left text-sm text-slate-300">
                        Produto
                      </th>

                      <th className="px-3 py-3 text-center text-sm text-slate-300">
                        Qtd.
                      </th>

                      <th className="px-3 py-3 text-right text-sm text-slate-300">
                        Unitário
                      </th>

                      <th className="px-3 py-3 text-right text-sm text-slate-300">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {itensDaVenda(vendaSelecionada.id).map(
                      (item, index) => (
                        <tr key={`${item.produto_id}-${index}`}>
                          <td className="px-3 py-3 text-sm text-white">
                            {item.produto_nome}
                          </td>

                          <td className="px-3 py-3 text-center text-sm text-slate-300">
                            {item.quantidade}
                          </td>

                          <td className="px-3 py-3 text-right text-sm text-slate-300">
                            {dinheiro(Number(item.preco_unitario))}
                          </td>

                          <td className="px-3 py-3 text-right text-sm font-semibold text-white">
                            {dinheiro(Number(item.total))}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PAGAMENTOS */}
            <div className="mt-6">
              <h3 className="mb-3 text-lg font-bold text-white">
                💳 Pagamentos
              </h3>

              <div className="space-y-2">
                {pagamentosDaVenda(vendaSelecionada.id).map(
                  (pagamento, index) => (
                    <div
                      key={`${pagamento.forma_pagamento}-${index}`}
                      className="flex items-center justify-between rounded-xl bg-slate-800 p-4"
                    >
                      <div>
                        <p className="font-semibold text-white">
                          {nomesPagamento[pagamento.forma_pagamento] ||
                            pagamento.forma_pagamento}
                        </p>

                        {Number(pagamento.troco || 0) > 0 && (
                          <p className="text-xs text-slate-400">
                            Troco: {dinheiro(Number(pagamento.troco))}
                          </p>
                        )}
                      </div>

                      <p className="font-bold text-emerald-400">
                        {dinheiro(Number(pagamento.valor))}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* TOTAIS */}
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800 p-5">
              <div className="flex justify-between py-1 text-sm text-slate-300">
                <span>Subtotal</span>
                <span>
                  {dinheiro(Number(vendaSelecionada.subtotal))}
                </span>
              </div>

              <div className="flex justify-between py-1 text-sm text-slate-300">
                <span>Desconto</span>
                <span>
                  {dinheiro(Number(vendaSelecionada.desconto))}
                </span>
              </div>

              <div className="mt-3 flex justify-between border-t border-slate-700 pt-3 text-lg font-bold">
                <span className="text-white">TOTAL</span>
                <span className="text-emerald-400">
                  {dinheiro(Number(vendaSelecionada.total))}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setVendaSelecionada(null)}
                className="rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-600"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}