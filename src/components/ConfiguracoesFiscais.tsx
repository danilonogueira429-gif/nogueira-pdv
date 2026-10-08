import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'

type ConfigFiscal = {
  id?: string
  empresa_id: string
  razao_social: string
  nome_fantasia: string
  cnpj: string
  inscricao_estadual: string
  inscricao_municipal: string
  regime_tributario: string
  crt: number | null
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  cep: string
  ambiente: 'homologacao' | 'producao'
  modelo_documento: number
  serie: number
  proximo_numero: number
  habilitada: boolean
  csc_id: string
  csc_token: string
  codigo_municipio_ibge: string
}

const configInicial: ConfigFiscal = {
  empresa_id: '',
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  inscricao_estadual: '',
  inscricao_municipal: '',
  regime_tributario: '',
  crt: null,
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: 'BA',
  cep: '',
  ambiente: 'homologacao',
  modelo_documento: 65,
  serie: 1,
  proximo_numero: 1,
  habilitada: false,
  csc_id: '',
  csc_token: '',
  codigo_municipio_ibge: '',
}

export default function ConfiguracoesFiscais() {
  const [config, setConfig] = useState<ConfigFiscal>(configInicial)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [mostrarCscToken, setMostrarCscToken] = useState(false)

  useEffect(() => {
    carregarConfiguracao()
  }, [])

  async function carregarConfiguracao() {
    setCarregando(true)
    setErro('')

    try {
      const {
        data: { user },
        error: erroUsuario,
      } = await supabase.auth.getUser()

      if (erroUsuario) throw erroUsuario
      if (!user) throw new Error('Usuário não autenticado.')

      const { data: perfil, error: erroPerfil } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .single()

      if (erroPerfil) throw erroPerfil

      const empresaId = perfil.empresa_id

      const { data, error } = await supabase
        .from('configuracoes_fiscais')
        .select('*')
        .eq('empresa_id', empresaId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setConfig({
          ...configInicial,
          ...data,
        })
      } else {
        setConfig({
          ...configInicial,
          empresa_id: empresaId,
        })
      }
    } catch (error: any) {
      console.error(error)
      setErro(error.message || 'Não foi possível carregar as configurações fiscais.')
    } finally {
      setCarregando(false)
    }
  }

  function atualizarCampo(
    campo: keyof ConfigFiscal,
    valor: string | number | boolean | null
  ) {
    setConfig((atual) => ({
      ...atual,
      [campo]: valor,
    }))
  }

  async function salvarConfiguracao(event: React.FormEvent) {
    event.preventDefault()

    setSalvando(true)
    setMensagem('')
    setErro('')

    try {
      const dados = {
        empresa_id: config.empresa_id,
        razao_social: config.razao_social || null,
        nome_fantasia: config.nome_fantasia || null,
        cnpj: config.cnpj || null,
        inscricao_estadual: config.inscricao_estadual || null,
        inscricao_municipal: config.inscricao_municipal || null,
        regime_tributario: config.regime_tributario || null,
        crt: config.crt || null,
        logradouro: config.logradouro || null,
        numero: config.numero || null,
        complemento: config.complemento || null,
        bairro: config.bairro || null,
        cidade: config.cidade || null,
        uf: config.uf || null,
        cep: config.cep || null,
        ambiente: config.ambiente,
        modelo_documento: 65,
        serie: Number(config.serie) || 1,
        proximo_numero: Number(config.proximo_numero) || 1,
        habilitada: config.habilitada,
        csc_id: config.csc_id || null,
        csc_token: config.csc_token || null,
        codigo_municipio_ibge: config.codigo_municipio_ibge || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('configuracoes_fiscais')
        .upsert(dados, {
          onConflict: 'empresa_id',
        })

      if (error) throw error

      setMensagem('Configurações fiscais salvas com sucesso!')

      await carregarConfiguracao()
    } catch (error: any) {
      console.error(error)
      setErro(error.message || 'Não foi possível salvar as configurações fiscais.')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
        Carregando configurações fiscais...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            🧾 Configurações Fiscais
          </h1>

          <p className="mt-2 text-slate-400">
            Configure os dados necessários para a emissão de NFC-e.
          </p>
        </div>

        {mensagem && (
          <div className="mb-6 rounded-xl border border-emerald-700 bg-emerald-950/40 p-4 text-emerald-300">
            ✅ {mensagem}
          </div>
        )}

        {erro && (
          <div className="mb-6 rounded-xl border border-red-700 bg-red-950/40 p-4 text-red-300">
            ❌ {erro}
          </div>
        )}

        <form onSubmit={salvarConfiguracao} className="space-y-6">

          {/* DADOS DA EMPRESA */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-5 text-xl font-semibold">
              🏢 Dados da empresa
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Campo
                label="Razão Social"
                value={config.razao_social}
                onChange={(valor) =>
                  atualizarCampo('razao_social', valor)
                }
              />

              <Campo
                label="Nome Fantasia"
                value={config.nome_fantasia}
                onChange={(valor) =>
                  atualizarCampo('nome_fantasia', valor)
                }
              />

              <Campo
                label="CNPJ"
                value={config.cnpj}
                onChange={(valor) =>
                  atualizarCampo('cnpj', valor)
                }
              />

              <Campo
                label="Inscrição Estadual"
                value={config.inscricao_estadual}
                onChange={(valor) =>
                  atualizarCampo('inscricao_estadual', valor)
                }
              />

              <Campo
                label="Inscrição Municipal"
                value={config.inscricao_municipal}
                onChange={(valor) =>
                  atualizarCampo('inscricao_municipal', valor)
                }
              />

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Regime Tributário
                </label>

                <select
                  value={config.regime_tributario}
                  onChange={(e) =>
                    atualizarCampo(
                      'regime_tributario',
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                >
                  <option value="">Selecione</option>
                  <option value="simples_nacional">
                    Simples Nacional
                  </option>
                  <option value="simples_nacional_excesso">
                    Simples Nacional - Excesso de sublimite
                  </option>
                  <option value="regime_normal">
                    Regime Normal
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  CRT
                </label>

                <select
                  value={config.crt ?? ''}
                  onChange={(e) =>
                    atualizarCampo(
                      'crt',
                      e.target.value
                        ? Number(e.target.value)
                        : null
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                >
                  <option value="">Selecione</option>
                  <option value="1">1 - Simples Nacional</option>
                  <option value="2">
                    2 - Simples Nacional - Excesso
                  </option>
                  <option value="3">3 - Regime Normal</option>
                </select>
              </div>
            </div>
          </section>

          {/* ENDEREÇO */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-5 text-xl font-semibold">
              📍 Endereço
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <Campo
                  label="Logradouro"
                  value={config.logradouro}
                  onChange={(valor) =>
                    atualizarCampo('logradouro', valor)
                  }
                />
              </div>

              <Campo
                label="Número"
                value={config.numero}
                onChange={(valor) =>
                  atualizarCampo('numero', valor)
                }
              />

              <Campo
                label="Complemento"
                value={config.complemento}
                onChange={(valor) =>
                  atualizarCampo('complemento', valor)
                }
              />

              <Campo
                label="Bairro"
                value={config.bairro}
                onChange={(valor) =>
                  atualizarCampo('bairro', valor)
                }
              />

              <Campo
                label="Cidade"
                value={config.cidade}
                onChange={(valor) =>
                  atualizarCampo('cidade', valor)
                }
              />

              <Campo
                label="UF"
                value={config.uf}
                onChange={(valor) =>
                  atualizarCampo('uf', valor.toUpperCase())
                }
              />

              <Campo
                label="CEP"
                value={config.cep}
                onChange={(valor) =>
                  atualizarCampo('cep', valor)
                }
              />
            </div>
          </section>

          {/* NFC-E */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-5 text-xl font-semibold">
              🧾 NFC-e
            </h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Ambiente
                </label>

                <select
                  value={config.ambiente}
                  onChange={(e) =>
                    atualizarCampo(
                      'ambiente',
                      e.target.value as
                        | 'homologacao'
                        | 'producao'
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                >
                  <option value="homologacao">
                    Homologação
                  </option>

                  <option value="producao">
                    Produção
                  </option>
                </select>
              </div>

              <Campo
                label="Modelo"
                value="65 - NFC-e"
                onChange={() => {}}
                disabled
              />

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Série
                </label>

                <input
                  type="number"
                  min="1"
                  value={config.serie}
                  onChange={(e) =>
                    atualizarCampo(
                      'serie',
                      Number(e.target.value)
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Próximo número
                </label>

                <input
                  type="number"
                  min="1"
                  value={config.proximo_numero}
                  onChange={(e) =>
                    atualizarCampo(
                      'proximo_numero',
                      Number(e.target.value)
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Campo
                label="Código IBGE do município"
                value={config.codigo_municipio_ibge}
                onChange={(valor) =>
                  atualizarCampo('codigo_municipio_ibge', valor.replace(/\D/g, ''))
                }
              />

              <Campo
                label="CSC ID"
                value={config.csc_id}
                onChange={(valor) =>
                  atualizarCampo('csc_id', valor)
                }
              />

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  CSC Token
                </label>

                <div className="relative">
                  <input
                    type={mostrarCscToken ? 'text' : 'password'}
                    value={config.csc_token}
                    onChange={(e) =>
                      atualizarCampo('csc_token', e.target.value)
                    }
                    autoComplete="off"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-12 outline-none transition focus:border-cyan-500"
                    placeholder="Informe somente quando possuir o CSC"
                  />

                  <button
                    type="button"
                    onClick={() => setMostrarCscToken((atual) => !atual)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                    aria-label={mostrarCscToken ? 'Ocultar CSC Token' : 'Mostrar CSC Token'}
                  >
                    {mostrarCscToken ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-cyan-800/50 bg-cyan-950/20 p-4">
              <p className="text-sm text-cyan-300">
                🔐 O CSC Token é uma informação sensível. Não compartilhe esse código e não habilite a emissão de NFC-e em produção antes de concluir o credenciamento e a configuração fiscal.
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-amber-700/50 bg-amber-950/20 p-4">
              <p className="text-sm text-amber-300">
                ⚠️ O ambiente de produção só deverá ser utilizado
                depois que certificado digital, CSC, credenciamento
                e demais requisitos fiscais estiverem configurados.
              </p>
            </div>

            <label className="mt-6 flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={config.habilitada}
                onChange={(e) =>
                  atualizarCampo(
                    'habilitada',
                    e.target.checked
                  )
                }
                className="h-5 w-5"
              />

              <span>
                Habilitar emissão de NFC-e
              </span>
            </label>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-xl bg-cyan-600 px-8 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando
                ? 'Salvando...'
                : '💾 Salvar configurações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type CampoProps = {
  label: string
  value: string
  onChange: (valor: string) => void
  disabled?: boolean
}

function Campo({
  label,
  value,
  onChange,
  disabled = false,
}: CampoProps) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-300">
        {label}
      </label>

      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  )
}