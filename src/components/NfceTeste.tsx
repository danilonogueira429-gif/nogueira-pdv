import { useState } from 'react'
import { AlertCircle, CheckCircle2, FileText, Loader2, Play } from 'lucide-react'
import { supabase } from '../lib/supabase'

const VENDA_TESTE_PADRAO = '90b1d032-512d-4966-91f5-c0e087b7b5ed'

type ResultadoNfce = {
  sucesso?: boolean
  existente?: boolean
  mensagem?: string
  erro?: string
  etapa?: string
  venda?: {
    id?: string
    total?: number
  }
  nfce?: {
    id?: string
    venda_id?: string
    ambiente?: string
    modelo?: number
    serie?: number
    numero?: number
    status?: string
    created_at?: string
  }
}

export default function NfceTeste() {
  const [vendaId, setVendaId] = useState(VENDA_TESTE_PADRAO)
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoNfce | null>(null)
  const [erro, setErro] = useState('')

  async function prepararNfce() {
    setErro('')
    setResultado(null)

    if (!vendaId.trim()) {
      setErro('Informe o ID de uma venda finalizada.')
      return
    }

    setCarregando(true)

    try {
      const { data, error } = await supabase.functions.invoke('nfce', {
        body: {
          venda_id: vendaId.trim(),
        },
      })

      if (error) {
        console.error('Erro ao chamar Edge Function nfce:', error)
        setErro(error.message || 'Não foi possível chamar a função NFC-e.')
        return
      }

      const resposta = data as ResultadoNfce

      if (!resposta?.sucesso) {
        setErro(resposta?.erro || 'A função NFC-e retornou um erro.')
        return
      }

      setResultado(resposta)
    } catch (error) {
      console.error(error)
      setErro(
        error instanceof Error
          ? error.message
          : 'Erro inesperado ao preparar a NFC-e.'
      )
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-400">Teste técnico</p>
          <h1 className="mt-1 text-3xl font-bold">Preparação de NFC-e</h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Este teste somente valida a comunicação entre o Nogueira PDV e a Edge Function
            e cria a NFC-e como <strong className="text-slate-200">pendente</strong>.
            Nenhum XML é enviado para a SEFAZ nesta etapa.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="font-semibold">Venda para teste</h2>
              <p className="text-sm text-slate-500">Use uma venda já finalizada.</p>
            </div>
          </div>

          <label className="mb-2 block text-sm font-medium text-slate-300">
            ID da venda
          </label>
          <input
            value={vendaId}
            onChange={(event) => setVendaId(event.target.value)}
            placeholder="UUID da venda"
            disabled={carregando}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
          />

          <button
            type="button"
            onClick={prepararNfce}
            disabled={carregando}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando ? (
              <>
                <Loader2 size={19} className="animate-spin" />
                Preparando NFC-e...
              </>
            ) : (
              <>
                <Play size={19} />
                Preparar NFC-e em homologação
              </>
            )}
          </button>
        </div>

        {erro && (
          <div className="mt-5 flex gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-semibold">Teste não concluído</p>
              <p className="mt-1 text-sm text-red-200/80">{erro}</p>
            </div>
          </div>
        )}

        {resultado && (
          <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <div className="flex items-center gap-3 text-emerald-300">
              <CheckCircle2 size={22} />
              <div>
                <p className="font-semibold">Comunicação funcionando</p>
                <p className="text-sm text-emerald-200/80">
                  {resultado.mensagem || 'NFC-e preparada com sucesso.'}
                </p>
              </div>
            </div>

            {resultado.nfce && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Status" value={resultado.nfce.status || '—'} />
                <Info label="Ambiente" value={resultado.nfce.ambiente || '—'} />
                <Info label="Modelo" value={String(resultado.nfce.modelo ?? '—')} />
                <Info
                  label="Número / Série"
                  value={`${resultado.nfce.numero ?? '—'} / ${resultado.nfce.serie ?? '—'}`}
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-200">
          <strong>Importante:</strong> esta tela é temporária. Ela não assina XML, não utiliza
          certificado digital e não envia documentos para a SEFAZ.
        </div>
      </div>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-100">{value}</p>
    </div>
  )
}
