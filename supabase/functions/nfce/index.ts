import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NFE_NS = "http://www.portalfiscal.inf.br/nfe";
const HOMOLOGACAO_ITEM =
  "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";

type Perfil = {
  empresa_id: string;
  nome: string;
  perfil: string;
  ativo: boolean;
};

type Venda = {
  id: string;
  empresa_id: string;
  estabelecimento_id: string | null;
  total: number;
  subtotal: number | null;
  desconto: number | null;
  status: string | null;
  created_at: string;
};

type ItemVenda = {
  id: string;
  produto_id: string;
  quantidade: number;
  peso: number | null;
  preco_unitario: number;
  desconto: number | null;
  total: number;
};

type Produto = {
  id: string;
  codigo_barras: string | null;
  codigo_interno: string | null;
  nome: string;
  unidade: string | null;
  ncm: string | null;
  cest: string | null;
};

type Tributacao = {
  produto_id: string;
  estabelecimento_id: string;
  ncm: string | null;
  cest: string | null;
  origem_mercadoria: number | null;
  unidade_tributavel: string | null;
  fator_conversao: number | null;
  cfop_venda: string | null;
  cst_icms: string | null;
  csosn: string | null;
  cst_pis: string | null;
  aliquota_pis: number | null;
  cst_cofins: string | null;
  aliquota_cofins: number | null;
  cst_ibs_cbs: string | null;
  cclass_trib: string | null;
};

type Estabelecimento = {
  id: string;
  empresa_id: string;
  nome: string;
  cnpj: string | null;
  inscricao_estadual: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
};

type ConfigFiscal = {
  id: string;
  empresa_id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  regime_tributario: string | null;
  crt: number | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  ambiente: "homologacao" | "producao";
  modelo_documento: number;
  serie: number;
  proximo_numero: number;
  habilitada: boolean;
  codigo_municipio_ibge: string | null;
};

type Pagamento = {
  forma_pagamento: string;
  valor: number;
  troco: number | null;
};

function xmlEscape(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function onlyDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function money(value: number): string {
  return Number(value || 0).toFixed(2);
}

function quantity(value: number): string {
  return Number(value || 0).toFixed(4);
}

function number10(value: number): string {
  return Number(value || 0).toFixed(10);
}

function randomCode8(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 100000000).padStart(8, "0");
}

function modulo11NFe(value: string): number {
  let peso = 2;
  let soma = 0;

  for (let i = value.length - 1; i >= 0; i--) {
    soma += Number(value[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }

  const resto = soma % 11;
  const digito = 11 - resto;

  return digito === 10 || digito === 11 ? 0 : digito;
}

function gerarChaveAcesso(params: {
  cnpj: string;
  dataEmissao: string;
  serie: number;
  numero: number;
  cNF: string;
}): string {
  const cUF = "29"; // Bahia
  const aamm = params.dataEmissao.slice(2, 4) + params.dataEmissao.slice(5, 7);
  const cnpj = onlyDigits(params.cnpj).padStart(14, "0");
  const mod = "65";
  const serie = String(params.serie).padStart(3, "0");
  const numero = String(params.numero).padStart(9, "0");
  const tpEmis = "1";
  const base =
    cUF +
    aamm +
    cnpj +
    mod +
    serie +
    numero +
    tpEmis +
    params.cNF;

  return base + modulo11NFe(base);
}

function mapPagamento(forma: string): string {
  switch (forma) {
    case "dinheiro":
      return "01";
    case "cheque":
      return "02";
    case "credito":
    case "cartao":
      return "03";
    case "debito":
      return "04";
    case "pix":
      return "17";
    case "vale_alimentacao":
      return "10";
    case "vale_refeicao":
      return "11";
    case "fiado":
      return "05";
    case "outros":
    case "voucher":
    case "convenio":
    default:
      return "99";
  }
}

function enderecoXml(
  estabelecimento: Estabelecimento,
  config: ConfigFiscal,
  codigoMunicipio: string,
): string {
  const logradouro = estabelecimento.logradouro || config.logradouro || "";
  const numero = estabelecimento.numero || config.numero || "S/N";
  const complemento =
    estabelecimento.complemento || config.complemento || "";
  const bairro = estabelecimento.bairro || config.bairro || "";
  const cidade = estabelecimento.cidade || config.cidade || "";
  const uf = (estabelecimento.uf || config.uf || "BA").toUpperCase();
  const cep = onlyDigits(estabelecimento.cep || config.cep || "");

  return `
    <enderEmit>
      <xLgr>${xmlEscape(logradouro)}</xLgr>
      <nro>${xmlEscape(numero)}</nro>
      ${complemento ? `<xCpl>${xmlEscape(complemento)}</xCpl>` : ""}
      <xBairro>${xmlEscape(bairro)}</xBairro>
      <cMun>${xmlEscape(codigoMunicipio)}</cMun>
      <xMun>${xmlEscape(cidade)}</xMun>
      <UF>${xmlEscape(uf)}</UF>
      ${cep ? `<CEP>${xmlEscape(cep)}</CEP>` : ""}
      <cPais>1058</cPais>
      <xPais>BRASIL</xPais>
    </enderEmit>`;
}

function impostoXml(
  tributacao: Tributacao,
  valorItem: number,
): string {
  const orig = Number(tributacao.origem_mercadoria ?? 0);
  const csosn = tributacao.csosn || "102";
  const cstPis = tributacao.cst_pis || "49";
  const cstCofins = tributacao.cst_cofins || "49";
  const aliquotaPis = Number(tributacao.aliquota_pis ?? 0);
  const aliquotaCofins = Number(tributacao.aliquota_cofins ?? 0);

  return `
      <imposto>
        <ICMS>
          <ICMSSN102>
            <orig>${orig}</orig>
            <CSOSN>${xmlEscape(csosn)}</CSOSN>
          </ICMSSN102>
        </ICMS>
        <PIS>
          <PISOutr>
            <CST>${xmlEscape(cstPis)}</CST>
            <vBC>${money(valorItem)}</vBC>
            <pPIS>${money(aliquotaPis)}</pPIS>
            <vPIS>${money(valorItem * aliquotaPis / 100)}</vPIS>
          </PISOutr>
        </PIS>
        <COFINS>
          <COFINSOutr>
            <CST>${xmlEscape(cstCofins)}</CST>
            <vBC>${money(valorItem)}</vBC>
            <pCOFINS>${money(aliquotaCofins)}</pCOFINS>
            <vCOFINS>${money(valorItem * aliquotaCofins / 100)}</vCOFINS>
          </COFINSOutr>
        </COFINS>
      </imposto>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });

  try {
    if (req.method !== "POST") {
      return json(
        {
          sucesso: false,
          erro: "Método não permitido. Use POST.",
        },
        405,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return json(
        {
          sucesso: false,
          erro: "Variáveis SUPABASE_URL/SUPABASE_ANON_KEY não configuradas.",
        },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return json(
        {
          sucesso: false,
          erro: "Usuário não autenticado.",
        },
        401,
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json(
        {
          sucesso: false,
          erro: "Sessão de usuário inválida.",
        },
        401,
      );
    }

    const body = await req.json().catch(() => null);
    const vendaId = body?.venda_id;

    if (typeof vendaId !== "string" || !vendaId.trim()) {
      return json(
        {
          sucesso: false,
          erro: "venda_id é obrigatório.",
        },
        400,
      );
    }

    const { data: perfil, error: perfilError } = await supabase
      .from("perfis")
      .select("empresa_id, nome, perfil, ativo")
      .eq("id", user.id)
      .single<Perfil>();

    if (perfilError || !perfil) {
      return json(
        {
          sucesso: false,
          erro: "Perfil do usuário não encontrado.",
        },
        403,
      );
    }

    if (!perfil.ativo) {
      return json(
        {
          sucesso: false,
          erro: "Usuário está inativo.",
        },
        403,
      );
    }

    const empresaId = perfil.empresa_id;

    const { data: venda, error: vendaError } = await supabase
      .from("vendas")
      .select(
        "id, empresa_id, estabelecimento_id, total, subtotal, desconto, status, created_at",
      )
      .eq("id", vendaId)
      .eq("empresa_id", empresaId)
      .single<Venda>();

    if (vendaError || !venda) {
      return json(
        {
          sucesso: false,
          erro:
            "Venda não encontrada ou não pertence à empresa do usuário.",
        },
        404,
      );
    }

    if (!venda.estabelecimento_id) {
      return json(
        {
          sucesso: false,
          erro: "A venda não possui estabelecimento vinculado.",
        },
        400,
      );
    }

    const { data: estabelecimento, error: estabelecimentoError } =
      await supabase
        .from("estabelecimentos")
        .select(
          "id, empresa_id, nome, cnpj, inscricao_estadual, logradouro, numero, complemento, bairro, cidade, uf, cep",
        )
        .eq("id", venda.estabelecimento_id)
        .eq("empresa_id", empresaId)
        .single<Estabelecimento>();

    if (estabelecimentoError || !estabelecimento) {
      return json(
        {
          sucesso: false,
          erro: "Estabelecimento da venda não foi encontrado.",
        },
        400,
      );
    }

    const { data: configuracao, error: configuracaoError } =
      await supabase
        .from("configuracoes_fiscais")
        .select(
          "id, empresa_id, razao_social, nome_fantasia, cnpj, inscricao_estadual, regime_tributario, crt, logradouro, numero, complemento, bairro, cidade, uf, cep, ambiente, modelo_documento, serie, proximo_numero, habilitada, codigo_municipio_ibge",
        )
        .eq("empresa_id", empresaId)
        .eq("ambiente", "homologacao")
        .maybeSingle<ConfigFiscal>();

    if (configuracaoError) {
      throw configuracaoError;
    }

    if (!configuracao) {
      return json(
        {
          sucesso: false,
          erro: "Configuração fiscal de homologação não encontrada.",
        },
        400,
      );
    }

    if (Number(configuracao.modelo_documento) !== 65) {
      return json(
        {
          sucesso: false,
          erro:
            "A configuração fiscal não está definida para NFC-e modelo 65.",
        },
        400,
      );
    }

    const cnpj = onlyDigits(
      estabelecimento.cnpj || configuracao.cnpj || "",
    );

    const inscricaoEstadual =
      onlyDigits(
        estabelecimento.inscricao_estadual ||
          configuracao.inscricao_estadual ||
          "",
      );

    const codigoMunicipio = onlyDigits(
      configuracao.codigo_municipio_ibge || "",
    );

    const crt = Number(configuracao.crt || 0);

    if (cnpj.length !== 14) {
      return json(
        {
          sucesso: false,
          erro:
            "Antes de gerar o XML, informe um CNPJ válido de 14 dígitos em Configurações Fiscais ou no estabelecimento.",
        },
        400,
      );
    }

    if (!inscricaoEstadual) {
      return json(
        {
          sucesso: false,
          erro:
            "Antes de gerar o XML, informe a Inscrição Estadual do estabelecimento.",
        },
        400,
      );
    }

    if (!codigoMunicipio) {
      return json(
        {
          sucesso: false,
          erro:
            "Antes de gerar o XML, informe o Código IBGE do município nas Configurações Fiscais.",
        },
        400,
      );
    }

    if (![1, 2, 3, 4].includes(crt)) {
      return json(
        {
          sucesso: false,
          erro:
            "Antes de gerar o XML, informe um CRT válido nas Configurações Fiscais.",
        },
        400,
      );
    }

    const { data: itens, error: itensError } = await supabase
      .from("itens_venda")
      .select(
        "id, produto_id, quantidade, peso, preco_unitario, desconto, total",
      )
      .eq("venda_id", vendaId)
      .order("created_at", { ascending: true })
      .returns<ItemVenda[]>();

    if (itensError) {
      throw itensError;
    }

    if (!itens?.length) {
      return json(
        {
          sucesso: false,
          erro: "A venda não possui itens.",
        },
        400,
      );
    }

    const produtoIds = [...new Set(itens.map((item) => item.produto_id))];

    const { data: produtos, error: produtosError } = await supabase
      .from("produtos")
      .select(
        "id, codigo_barras, codigo_interno, nome, unidade, ncm, cest",
      )
      .in("id", produtoIds)
      .returns<Produto[]>();

    if (produtosError) {
      throw produtosError;
    }

    const produtoMap = new Map(
      (produtos || []).map((produto) => [produto.id, produto]),
    );

    const { data: tributacoes, error: tributacoesError } = await supabase
      .from("tributacoes_produtos")
      .select(
        "produto_id, estabelecimento_id, ncm, cest, origem_mercadoria, unidade_tributavel, fator_conversao, cfop_venda, cst_icms, csosn, cst_pis, aliquota_pis, cst_cofins, aliquota_cofins, cst_ibs_cbs, cclass_trib",
      )
      .eq("estabelecimento_id", venda.estabelecimento_id)
      .in("produto_id", produtoIds)
      .eq("ativo", true)
      .returns<Tributacao[]>();

    if (tributacoesError) {
      throw tributacoesError;
    }

    const tributacaoMap = new Map(
      (tributacoes || []).map((tributacao) => [
        tributacao.produto_id,
        tributacao,
      ]),
    );

    for (const item of itens) {
      const produto = produtoMap.get(item.produto_id);
      const tributacao = tributacaoMap.get(item.produto_id);

      if (!produto) {
        throw new Error(
          `Produto ${item.produto_id} não encontrado.`,
        );
      }

      if (!tributacao) {
        throw new Error(
          `O produto "${produto.nome}" não possui tributação cadastrada para este estabelecimento.`,
        );
      }

      if (!tributacao.ncm) {
        throw new Error(
          `O produto "${produto.nome}" está sem NCM.`,
        );
      }

      if (!tributacao.cfop_venda) {
        throw new Error(
          `O produto "${produto.nome}" está sem CFOP de venda.`,
        );
      }

      if (!tributacao.csosn && crt !== 3) {
        throw new Error(
          `O produto "${produto.nome}" está sem CSOSN para o regime informado.`,
        );
      }

      if (!tributacao.cst_pis) {
        throw new Error(
          `O produto "${produto.nome}" está sem CST PIS.`,
        );
      }

      if (!tributacao.cst_cofins) {
        throw new Error(
          `O produto "${produto.nome}" está sem CST COFINS.`,
        );
      }
    }

    const { data: pagamentos, error: pagamentosError } = await supabase
      .from("pagamentos")
      .select("forma_pagamento, valor, troco")
      .eq("venda_id", vendaId)
      .returns<Pagamento[]>();

    if (pagamentosError) {
      throw pagamentosError;
    }

    if (!pagamentos?.length) {
      return json(
        {
          sucesso: false,
          erro: "A venda não possui pagamentos registrados.",
        },
        400,
      );
    }

    let nfceExistente: {
      id: string;
      status: string;
      numero: number;
      serie: number;
      ambiente: string;
      xml_envio: string | null;
      chave_acesso: string | null;
    } | null = null;

    const { data: documentoExistente, error: documentoExistenteError } =
      await supabase
        .from("nfce_documentos")
        .select(
          "id, status, numero, serie, ambiente, xml_envio, chave_acesso",
        )
        .eq("venda_id", vendaId)
        .maybeSingle();

    if (documentoExistenteError) {
      throw documentoExistenteError;
    }

    if (documentoExistente) {
      nfceExistente = documentoExistente;
    }

    let numero: number;
    let serie: number;
    let nfceId: string;
    let documentoNovo = false;

    if (nfceExistente?.xml_envio) {
      return json({
        sucesso: true,
        existente: true,
        mensagem: "Esta venda já possui XML de NFC-e preparado.",
        etapa: "xml_gerado",
        nfce: nfceExistente,
      });
    }

    if (nfceExistente) {
      numero = Number(nfceExistente.numero);
      serie = Number(nfceExistente.serie);
      nfceId = nfceExistente.id;
    } else {
      numero = Number(configuracao.proximo_numero);
      serie = Number(configuracao.serie);

      if (!Number.isInteger(numero) || numero < 1) {
        return json(
          {
            sucesso: false,
            erro: "Próximo número da NFC-e é inválido.",
          },
          400,
        );
      }

      if (!Number.isInteger(serie) || serie < 1) {
        return json(
          {
            sucesso: false,
            erro: "Série da NFC-e é inválida.",
          },
          400,
        );
      }

      const { data: nfce, error: nfceError } = await supabase
        .from("nfce_documentos")
        .insert({
          empresa_id: empresaId,
          estabelecimento_id: venda.estabelecimento_id,
          venda_id: venda.id,
          ambiente: "homologacao",
          modelo: 65,
          serie,
          numero,
          status: "gerando",
        })
        .select("id")
        .single();

      if (nfceError) {
        throw nfceError;
      }

      nfceId = nfce.id;
      documentoNovo = true;

      await supabase
        .from("configuracoes_fiscais")
        .update({
          proximo_numero: numero + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", configuracao.id);
    }

    const agora = new Date(venda.created_at);
    const dhEmi = agora.toISOString();
    const dataEmissao = dhEmi.slice(0, 10);
    const cNF = randomCode8();

    const chaveAcesso =
      nfceExistente?.chave_acesso ||
      gerarChaveAcesso({
        cnpj,
        dataEmissao,
        serie,
        numero,
        cNF,
      });

    const xNome =
      configuracao.razao_social ||
      estabelecimento.nome ||
      "EMITENTE NFC-E";

    const xFant =
      configuracao.nome_fantasia ||
      estabelecimento.nome ||
      xNome;

    const primeiroItemId = itens[0].id;

    const detalhesItens = itens.map((item, index) => {
      const produto = produtoMap.get(item.produto_id)!;
      const tributacao = tributacaoMap.get(item.produto_id)!;

      const quantidadeBase =
        Number(item.quantidade || 0) > 0
          ? Number(item.quantidade)
          : Number(item.peso || 0);

      const fator = Number(tributacao.fator_conversao || 1);
      const qTrib = quantidadeBase * fator;
      const vUnTrib =
        qTrib > 0 ? Number(item.total) / qTrib : Number(item.preco_unitario);

      const descricao =
        index === 0 && configuracao.ambiente === "homologacao"
          ? HOMOLOGACAO_ITEM
          : produto.nome;

      const codigo = (
        produto.codigo_interno ||
        produto.codigo_barras ||
        produto.id
      ).slice(0, 60);

      const codigoBarras = onlyDigits(produto.codigo_barras || "");
      const cEAN = codigoBarras ? codigoBarras : "SEM GTIN";

      const ncm = onlyDigits(tributacao.ncm || produto.ncm || "");
      const cfop = onlyDigits(tributacao.cfop_venda || "");
      const unidade = tributacao.unidade_tributavel ||
        produto.unidade ||
        "UN";

      if (ncm.length !== 8) {
        throw new Error(
          `NCM inválido no produto "${produto.nome}".`,
        );
      }

      if (cfop.length !== 4) {
        throw new Error(
          `CFOP inválido no produto "${produto.nome}".`,
        );
      }

      return `
      <det nItem="${index + 1}">
        <prod>
          <cProd>${xmlEscape(codigo)}</cProd>
          <cEAN>${xmlEscape(cEAN)}</cEAN>
          <xProd>${xmlEscape(descricao)}</xProd>
          <NCM>${ncm}</NCM>
          ${
            tributacao.cest
              ? `<CEST>${onlyDigits(tributacao.cest)}</CEST>`
              : ""
          }
          <CFOP>${cfop}</CFOP>
          <uCom>${xmlEscape(unidade)}</uCom>
          <qCom>${quantity(quantidadeBase)}</qCom>
          <vUnCom>${number10(Number(item.preco_unitario))}</vUnCom>
          <vProd>${money(Number(item.preco_unitario) * quantidadeBase)}</vProd>
          <cEANTrib>${xmlEscape(cEAN)}</cEANTrib>
          <uTrib>${xmlEscape(unidade)}</uTrib>
          <qTrib>${quantity(qTrib)}</qTrib>
          <vUnTrib>${number10(vUnTrib)}</vUnTrib>
          <indTot>1</indTot>
        </prod>
        ${impostoXml(tributacao, Number(item.total))}
      </det>`;
    });

    const vProd = itens.reduce(
      (total, item) =>
        total +
        Number(item.preco_unitario || 0) * Number(item.quantidade || 0),
      0,
    );

    const vDesc = itens.reduce(
      (total, item) => total + Number(item.desconto || 0),
      0,
    );

    const vPIS = itens.reduce((total, item) => {
      const tributacao = tributacaoMap.get(item.produto_id)!;
      const aliquota = Number(tributacao.aliquota_pis || 0);
      return total + Number(item.total || 0) * aliquota / 100;
    }, 0);

    const vCOFINS = itens.reduce((total, item) => {
      const tributacao = tributacaoMap.get(item.produto_id)!;
      const aliquota = Number(tributacao.aliquota_cofins || 0);
      return total + Number(item.total || 0) * aliquota / 100;
    }, 0);

    const pagamentosXml = pagamentos
      .map(
        (pagamento) => `
        <detPag>
          <tPag>${mapPagamento(pagamento.forma_pagamento)}</tPag>
          <vPag>${money(Number(pagamento.valor))}</vPag>
        </detPag>`,
      )
      .join("");

    const primeiroItem = itens.find((item) => item.id === primeiroItemId);

    if (!primeiroItem) {
      throw new Error("Não foi possível identificar o primeiro item da venda.");
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="${NFE_NS}">
  <infNFe Id="NFe${chaveAcesso}" versao="4.00">
    <ide>
      <cUF>29</cUF>
      <cNF>${cNF}</cNF>
      <natOp>VENDA</natOp>
      <mod>65</mod>
      <serie>${serie}</serie>
      <nNF>${numero}</nNF>
      <dhEmi>${dhEmi}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>${codigoMunicipio}</cMunFG>
      <tpImp>4</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${chaveAcesso.slice(-1)}</cDV>
      <tpAmb>2</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>NogueiraPDV-1.0</verProc>
    </ide>
    <emit>
      <CNPJ>${cnpj}</CNPJ>
      <xNome>${xmlEscape(xNome)}</xNome>
      <xFant>${xmlEscape(xFant)}</xFant>
      ${enderecoXml(estabelecimento, configuracao, codigoMunicipio)}
      <IE>${xmlEscape(inscricaoEstadual)}</IE>
      <CRT>${crt}</CRT>
    </emit>
    ${detalhesItens.join("")}
    <total>
      <ICMSTot>
        <vBC>0.00</vBC>
        <vICMS>0.00</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${money(vProd)}</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>${money(vDesc)}</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>${money(vPIS)}</vPIS>
        <vCOFINS>${money(vCOFINS)}</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${money(Number(venda.total))}</vNF>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>9</modFrete>
    </transp>
    <pag>
      ${pagamentosXml}
    </pag>
    <infAdic>
      <infCpl>NFC-e preparada em ambiente de homologação pelo Nogueira PDV. Documento sem valor fiscal.</infCpl>
    </infAdic>
  </infNFe>
</NFe>`;

    const { error: atualizarError } = await supabase
      .from("nfce_documentos")
      .update({
        chave_acesso: chaveAcesso,
        xml_envio: xml,
        status: "pendente",
        dh_emissao: dhEmi,
        updated_at: new Date().toISOString(),
      })
      .eq("id", nfceId);

    if (atualizarError) {
      throw atualizarError;
    }

    const { data: nfceFinal, error: nfceFinalError } = await supabase
      .from("nfce_documentos")
      .select(
        "id, empresa_id, estabelecimento_id, venda_id, ambiente, modelo, serie, numero, chave_acesso, status, dh_emissao, xml_envio, created_at, updated_at",
      )
      .eq("id", nfceId)
      .single();

    if (nfceFinalError) {
      throw nfceFinalError;
    }

    return json({
      sucesso: true,
      mensagem: documentoNovo
        ? "NFC-e criada e XML de homologação gerado."
        : "XML de homologação gerado para a NFC-e existente.",
      etapa: "xml_gerado",
      sem_assinatura: true,
      sem_envio_sefaz: true,
      usuario: {
        id: user.id,
        nome: perfil.nome,
        perfil: perfil.perfil,
      },
      venda: {
        id: venda.id,
        total: venda.total,
      },
      nfce: {
        ...nfceFinal,
        xml_envio: undefined,
      },
    });
  } catch (error) {
    console.error("Erro na função NFC-e:", error);

    return json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : "Erro interno ao preparar NFC-e.",
      },
      500,
    );
  }
});
