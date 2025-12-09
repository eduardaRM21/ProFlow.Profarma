"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Package,
  LogOut,
  Camera,
  CameraOff,
  Scan,
  CheckCircle,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Eye,
  Truck,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
} from "lucide-react"
import BarcodeScanner from "./components/barcode-scanner"
import ConfirmacaoModal from "./components/confirmacao-modal"
import DivergenciaModal from "./components/divergencia-modal"
import AlterarStatusModal from "./components/alterar-status-modal"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import RelatoriosModal from "./components/relatorios-modal"
import SelecaoTransportadoraModal from "./components/selecao-transportadora-modal"
import ConsultarNfsFaltantesModal from "./components/consultar-nfs-faltantes-modal"
import { useSession, useRecebimento, useConnectivity, useRelatorios as useRelatoriosOriginal } from "@/hooks/use-database"
import { useRelatorios } from "@/hooks/use-relatorios-optimized"
import { useDivergenciasCache } from "@/hooks/use-divergencias-cache"
import { useRealtimeMonitoring } from "@/hooks/use-realtime-monitoring"
import { useNotasBipadas } from "@/lib/notas-bipadas-service"
import type { SessionData, NotaFiscal, Relatorio } from "@/lib/database-service"
import { LocalAuthService } from "@/lib/local-auth-service"
import { getSupabase } from "@/lib/supabase-client"
import { ErrorHandler } from "@/lib/error-handler"
import { useIsColetor } from "@/hooks/use-coletor"
import { useTheme } from "@/contexts/theme-context"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import ColetorView from "./components/coletor-view"
import DarEntrada from "./components/dar-entrada"
import VerConsolidado from "./components/ver-consolidado"
import { Loader } from "@/components/ui/loader"

// Componente para nota com duplo clique
function NotaItemComLongPress({ nota, onLongPress }: { nota: NotaFiscal; onLongPress: () => void }) {
  return (
    <div
      onDoubleClick={onLongPress}
      className={`p-4 border-l-4 rounded-r-lg cursor-pointer transition-all hover:shadow-md ${
        nota.status === "ok" 
          ? "border-l-green-500 bg-green-50 dark:bg-green-900/20 dark:border-l-green-400" 
          : "border-l-orange-500 bg-orange-50 dark:bg-orange-900/20 dark:border-l-orange-400"
      }`}
      title="Duplo clique para alterar o status da nota"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {nota.status === "ok" ? (
            <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-1" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-4 mb-2">
              <div className="font-semibold text-gray-900 dark:text-gray-200">NF: {nota.numeroNF}</div>
              <Badge variant="outline" className="bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                Vol: {nota.divergencia?.volumesInformados || nota.volumes}
              </Badge>
              <Badge variant="outline" className="bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                {nota.destino}
              </Badge>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <div>
                <strong>Fornecedor:</strong> {nota.fornecedor} | <strong>Cliente:</strong>{" "}
                {nota.clienteDestino}
              </div>
              <div>
                <strong>Tipo:</strong> {nota.tipoCarga} | <strong>Data:</strong> {nota.data}
              </div>
              {nota.divergencia && (
                <div className="text-orange-600 dark:text-orange-400 font-medium">
                  🔸 {nota.divergencia.observacoes}
                  {nota.divergencia.volumesInformados !== nota.volumes && (
                    <span>
                      {" "}
                      (Volumes alterados: {nota.volumes} → {nota.divergencia.volumesInformados})
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              {new Date(nota.timestamp).toLocaleString("pt-BR")}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const TIPOS_DIVERGENCIA = [
  { codigo: "0063", descricao: "Avaria transportadora" },
  { codigo: "0068", descricao: "Falta transportadora" },
  { codigo: "0083", descricao: "Falta fornecedor" },
  { codigo: "0000", descricao: "Sem divergência" },
  { codigo: "0001", descricao: "Sobra" },
  { codigo: "L062", descricao: "Falta/Avaria" },
  { codigo: "L063", descricao: "Avaria Locafarma" },
  { codigo: "L068", descricao: "Falta Locafarma" },
]

export default function RecebimentoPage() {
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [codigoInput, setCodigoInput] = useState("")
  const [scannerAtivo, setScannerAtivo] = useState(false)
  const [modalConfirmacao, setModalConfirmacao] = useState(false)
  const [modalDivergencia, setModalDivergencia] = useState(false)
  const [notaAtual, setNotaAtual] = useState<NotaFiscal | null>(null)
  const [scannerParaBipar, setScannerParaBipar] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  
  // Hook para detectar se é um coletor
  const isColetor = useIsColetor()

  // Hook do tema
  const { theme, setTheme } = useTheme()

  // Hooks do banco de dados
  const { getSession } = useSession()
  const { isFullyConnected } = useConnectivity()
  const { addRealtimeEvent } = useRealtimeMonitoring()
  const notasBipadasService = useNotasBipadas()
  const { toast } = useToast()
  
  // Hook otimizado para relatórios com cache
  const { data: relatorios, refresh: refreshRelatorios } = useRelatorios('recebimento', {
    refreshInterval: 0, // Desabilitar refresh automático
    revalidateOnFocus: false, // Desabilitar revalidação ao focar
    revalidateOnReconnect: true // Manter revalidação ao reconectar
  })
  
  // Hook para salvar relatórios
  const { saveRelatorio } = useRelatoriosOriginal()

  // Estados para o modal de seleção de transportadora
  const [modalSelecaoTransportadora, setModalSelecaoTransportadora] = useState(false)
  const [modalRelatorios, setModalRelatorios] = useState(false)
  const [modalConsultarNfsFaltantes, setModalConsultarNfsFaltantes] = useState(false)
  const [modalAlterarStatus, setModalAlterarStatus] = useState(false)
  const [notaParaAlterarStatus, setNotaParaAlterarStatus] = useState<NotaFiscal | null>(null)
  const [modalSenha, setModalSenha] = useState(false)
  const [senhaInput, setSenhaInput] = useState("")
  const [senhaErrada, setSenhaErrada] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [telaAtiva, setTelaAtiva] = useState("bipagem")
  const [transportadoraSelecionada, setTransportadoraSelecionada] = useState("")
  const [progressoTransportadora, setProgressoTransportadora] = useState({ bipadas: 0, total: 0, percentual: 0 })
  const [sessaoIniciada, setSessaoIniciada] = useState(false)
  const [bipagemIniciada, setBipagemIniciada] = useState(false)
  const [notasTransportadoraCache, setNotasTransportadoraCache] = useState<any[]>([])
  const [problemasSalvamento, setProblemasSalvamento] = useState<string[]>([])

  // Lógica de sessão e carregamento inicial
  useEffect(() => {
    const verificarSessao = async () => {
      try {
        console.log('🔍 Verificando sessão para área recebimento...')
        console.log('🌐 Status da conectividade:', { isFullyConnected })
        
        const session = await getSession("current")
        console.log('📊 Sessão retornada:', session)
        
        if (!session) {
          console.log('⚠️ Nenhuma sessão encontrada, redirecionando...')
          router.push("/")
          return
        }
        
        if (session.area !== "recebimento") {
          console.log('❌ Sessão não é de recebimento:', session.area, 'redirecionando...')
          router.push("/")
          return
        }
        
        console.log('✅ Sessão válida encontrada para recebimento:', session)
        setSessionData(session)
      } catch (error) {
        console.error("❌ Erro ao verificar sessão:", error)
        console.log('⚠️ Usando fallback para localStorage...')
        
        // Fallback para localStorage
        try {
          const sessionLocal = localStorage.getItem("sistema_session")
          if (sessionLocal) {
            const sessionObj = JSON.parse(sessionLocal)
            console.log('📋 Sessão local encontrada:', sessionObj)
            
            if (sessionObj.area === "recebimento") {
              console.log('✅ Usando sessão local de recebimento')
              setSessionData(sessionObj)
            } else {
              console.log('❌ Sessão local não é de recebimento, redirecionando...')
              router.push("/")
            }
          } else {
            console.log('❌ Nenhuma sessão local disponível, redirecionando...')
            router.push("/")
          }
        } catch (fallbackError) {
          console.error('❌ Erro no fallback:', fallbackError)
          router.push("/")
        }
      }
    }
    verificarSessao()
  }, [router, getSession, isFullyConnected])

  // Restrição do botão voltar do navegador
  useEffect(() => {
    if (!sessionData) return

    // Função para interceptar tentativas de saída da página
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = 'Você tem certeza que deseja sair? Use o botão "Sair" para sair corretamente.'
      return 'Você tem certeza que deseja sair? Use o botão "Sair" para sair corretamente.'
    }

    // Função para interceptar navegação do botão voltar
    const handlePopState = (event: PopStateEvent) => {
      // Adiciona uma nova entrada no histórico para manter o usuário na página
      window.history.pushState(null, '', window.location.href)
      
      // Mostra um alerta informativo
      alert('Para sair do setor de Recebimento, use o botão "Sair" no canto superior direito.')
    }

    // Adiciona uma entrada no histórico para interceptar o botão voltar
    window.history.pushState(null, '', window.location.href)

    // Adiciona os event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    // Cleanup dos event listeners
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [sessionData])
  
  // O hook `useRecebimento` deve ser chamado após `sessionData` ser definido.
  const chaveNotas = sessionData
    ? `recebimento_${Array.isArray(sessionData.colaboradores) && sessionData.colaboradores.length > 0 
        ? sessionData.colaboradores.join('_') 
        : 'sem_colaborador'}_${sessionData.data}_${sessionData.turno}`
    : ''
  const { notas, saveNotas, clearNotas } = useRecebimento(chaveNotas)

  const validarCodigo = async (codigo: string): Promise<{ valido: boolean; nota?: NotaFiscal; erro?: string }> => {
    const partes = codigo.split("|")
    if (partes.length !== 7) {
      return { valido: false, erro: `Código deve ter 7 partes. Encontradas: ${partes.length}` }
    }
    const [data, numeroNF, volumesStr, destino, fornecedor, clienteDestino, tipoCarga] = partes
    const volumes = parseInt(volumesStr, 10)

    if (isNaN(volumes) || volumes <= 0) {
      return { valido: false, erro: `Volumes deve ser um número válido maior que 0. Recebido: "${volumesStr}"` }
    }

    console.log(`🔍 Validando NF ${numeroNF} com fornecedor ${fornecedor} e volume ${volumes}...`)

    // 1. Verificar se a nota já foi bipada na sessão atual com mesmo fornecedor e volume (OTIMIZADO)
    const notaNaSessao = notas.find((nota) => 
      nota.numeroNF === numeroNF && 
      nota.fornecedor === fornecedor && 
      nota.volumes === volumes
    )
    if (notaNaSessao) {
      console.log(`⚠️ NF ${numeroNF} já bipada na sessão atual com mesmo fornecedor e volume`)
      return { 
        valido: false, 
        erro: `NF ${numeroNF} já foi bipada nesta sessão com o mesmo fornecedor (${fornecedor}) e volume (${volumes}) em ${notaNaSessao.timestamp ? new Date(notaNaSessao.timestamp).toLocaleString('pt-BR') : 'agora'}. Duplicatas com mesmo fornecedor e volume não são permitidas.` 
      }
    }

    // 1.1. Verificar se a nota já foi bipada na tabela notas_bipadas para esta sessão (OTIMIZADO)
    console.log(`🔍 Verificando se NF ${numeroNF} já foi bipada na tabela notas_bipadas...`)
    try {
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      // Usar consulta otimizada com timeout reduzido
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na verificação de duplicatas')), 5000) // 5s timeout
      })

      const verificarDuplicataPromise = (async () => {
        const { data: notasBipadasExistentes, error: erroVerificacao } = await supabase
          .from('notas_bipadas')
          .select('id, numero_nf, timestamp_bipagem, session_id, fornecedor, volumes')
          .eq('numero_nf', numeroNF)
          .eq('fornecedor', fornecedor)
          .eq('volumes', volumes)
          .eq('area_origem', 'recebimento')
          .limit(5) // Reduzido de 10 para 5 para melhor performance
        
        if (erroVerificacao && erroVerificacao.code !== 'PGRST116') {
          throw erroVerificacao
        }
        
        if (notasBipadasExistentes && notasBipadasExistentes.length > 0) {
          // Nota duplicada encontrada (já filtrada pela query com numero_nf, fornecedor e volumes)
          return notasBipadasExistentes[0] || null
        }
        
        return null
      })()

      const notaBipadaExistente = await Promise.race([verificarDuplicataPromise, timeoutPromise])
      
      if (notaBipadaExistente) {
        const timestampFormatado = (notaBipadaExistente as any).timestamp_bipagem 
          ? new Date((notaBipadaExistente as any).timestamp_bipagem as string).toLocaleString('pt-BR')
          : 'agora'
        
        console.log(`⚠️ NF ${numeroNF} já bipada com mesmo fornecedor e volume (${timestampFormatado})`)
        return {
          valido: false,
          erro: `NF ${numeroNF} já foi bipada com o mesmo fornecedor (${fornecedor}) e volume (${volumes}) em ${timestampFormatado}. Duplicatas com mesmo fornecedor e volume não são permitidas.`
        }
      }
      
      console.log(`✅ NF ${numeroNF} não encontrada com mesmo fornecedor (${fornecedor}) e volume (${volumes}) na tabela notas_bipadas`)
    } catch (error) {
      console.error(`❌ Erro ao verificar duplicata na tabela notas_bipadas:`, error)
      // Em caso de erro, continuar com a validação para não bloquear o usuário
      console.log(`⚠️ Continuando validação mesmo com erro na verificação de duplicatas`)
    }

    // 2. Verificar se a nota está em algum relatório existente (OTIMIZADO)
    console.log(`🔍 Verificando se NF ${numeroNF} está em relatórios existentes...`)
    try {
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      // Usar timeout para evitar demora excessiva
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na verificação de relatórios')), 3000) // 3s timeout
      })

      const verificarRelatorioPromise = (async () => {
        // Buscar diretamente na tabela notas_fiscais pelo numero_nf, fornecedor e volumes
        const { data: notaFiscalData, error: notaFiscalError } = await supabase
          .from('notas_fiscais')
          .select('id')
          .eq('numero_nf', numeroNF)
          .eq('fornecedor', fornecedor)
          .eq('volumes', volumes)
          .limit(1)
        
        if (!notaFiscalError && notaFiscalData && notaFiscalData.length > 0) {
          console.log(`⚠️ NF ${numeroNF} encontrada na tabela notas_fiscais com mesmo fornecedor e volume`)
          
          // Buscar o relatório relacionado através da tabela relatorio_notas
          const { data: relatorioNotaData, error: relatorioNotaError } = await supabase
            .from('relatorio_notas')
            .select('relatorio_id')
            .eq('nota_fiscal_id', notaFiscalData[0].id as string)
            .limit(1)
          
          if (!relatorioNotaError && relatorioNotaData && relatorioNotaData.length > 0) {
            // Buscar detalhes do relatório
            const { data: relatorioData, error: relatorioError } = await supabase
              .from('relatorios')
              .select('id, nome, area, data')
              .eq('id', relatorioNotaData[0].relatorio_id as string)
              .limit(1)
            
            if (!relatorioError && relatorioData && relatorioData.length > 0) {
              console.log(`⚠️ NF ${numeroNF} encontrada no relatório:`, relatorioData[0].nome)
              
              const setorRelatorio = (relatorioData[0] as any).area || 'setor não informado'
              const dataRelatorio = (relatorioData[0] as any).data || 'data não informada'
              
              return {
                valido: false,
                erro: `NF ${numeroNF} já foi bipada com o mesmo fornecedor (${fornecedor}) e volume (${volumes}) e está no relatório "${(relatorioData[0] as any).nome}" (${setorRelatorio}) em ${dataRelatorio}`,
              }
            }
          }
          
          // Se não encontrar o relatório, mas a nota está na tabela notas_fiscais
          console.log(`⚠️ NF ${numeroNF} encontrada na tabela notas_fiscais com mesmo fornecedor e volume mas sem relatório associado`)
          return {
            valido: false,
            erro: `NF ${numeroNF} já foi bipada com o mesmo fornecedor (${fornecedor}) e volume (${volumes}) e está registrada no sistema.`,
          }
        }
        
        return null
      })()

      const resultadoRelatorio = await Promise.race([verificarRelatorioPromise, timeoutPromise])
      
      if (resultadoRelatorio && typeof resultadoRelatorio === 'object' && 'valido' in resultadoRelatorio) {
        return resultadoRelatorio as { valido: boolean; nota?: NotaFiscal; erro?: string }
      }

      console.log(`✅ NF ${numeroNF} não encontrada em relatórios existentes`)
    } catch (error) {
      console.error(`❌ Erro ao verificar relatórios existentes:`, error)
      // Em caso de erro, continuar com a validação para não bloquear o usuário
    }

    // 3. Verificar se a nota está em alguma sessão ativa de outros setores (SIMPLIFICADO)
    console.log(`🔍 Verificando sessões ativas de outros setores...`)
    try {
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      // Usar timeout para evitar demora excessiva
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na verificação de sessões')), 2000) // 2s timeout
      })

      const verificarSessoesPromise = (async () => {
        // Buscar sessões ativas de hoje (limitado para performance)
        const hoje = new Date().toISOString().split('T')[0]
        const { data: sessoesAtivas, error: sessoesError } = await supabase
          .from('sessions')
          .select('area, colaboradores, data, turno')
          .gte('data', hoje)
          .neq('area', 'recebimento') // Excluir sessões do próprio setor
          .limit(10) // Limitar para melhor performance

        if (!sessoesError && sessoesAtivas && sessoesAtivas.length > 0) {
          console.log(`📊 Sessões ativas encontradas:`, sessoesAtivas.length)
          
          // Verificar se alguma sessão tem a nota bipada (simplificado)
          for (const sessao of sessoesAtivas) {
            const chaveSessao = `${sessao.area}_${Array.isArray(sessao.colaboradores) && sessao.colaboradores.length > 0 
              ? sessao.colaboradores.join('_') 
              : 'sem_colaborador'}_${sessao.data}_${sessao.turno}`
            
            // Buscar notas da sessão no localStorage
            const notasSessao = localStorage.getItem(chaveSessao)
            if (notasSessao) {
              try {
                const notasParsed = JSON.parse(notasSessao)
                if (Array.isArray(notasParsed)) {
                  const notaNaSessaoOutroSetor = notasParsed.find((n: any) => n.numeroNF === numeroNF)
                  if (notaNaSessaoOutroSetor) {
                    console.log(`⚠️ NF ${numeroNF} encontrada em sessão ativa de ${sessao.area}`)
                    return {
                      valido: false,
                      erro: `NF ${numeroNF} já foi bipada na sessão ativa de ${sessao.area} por ${Array.isArray(sessao.colaboradores) ? sessao.colaboradores.join(', ') : 'colaborador não informado'}`,
                    }
                  }
                }
              } catch (parseError) {
                console.error(`❌ Erro ao parsear notas da sessão ${chaveSessao}:`, parseError)
              }
            }
          }
        }
        
        return null
      })()

      const resultadoSessoes = await Promise.race([verificarSessoesPromise, timeoutPromise])
      
      if (resultadoSessoes && typeof resultadoSessoes === 'object' && 'valido' in resultadoSessoes) {
        return resultadoSessoes as { valido: boolean; nota?: NotaFiscal; erro?: string }
      }
      
      console.log(`✅ NF ${numeroNF} não encontrada em sessões ativas de outros setores`)
    } catch (error) {
      console.error(`❌ Erro ao verificar sessões ativas:`, error)
      // Em caso de erro, continuar com a validação
    }

    // 4. Verificar se a nota está em alguma tabela de divergências (SIMPLIFICADO)
    console.log(`🔍 Verificando se NF ${numeroNF} está em divergências...`)
    try {
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      // Usar timeout para evitar demora excessiva
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na verificação de divergências')), 2000) // 2s timeout
      })

      const verificarDivergenciasPromise = (async () => {
        // Buscar a nota na tabela notas_fiscais primeiro para obter o ID
        const { data: notaFiscalData, error: notaFiscalError } = await supabase
          .from('notas_fiscais')
          .select('id')
          .eq('numero_nf', numeroNF)
          .limit(1)
        
        if (!notaFiscalError && notaFiscalData && notaFiscalData.length > 0) {
          // Buscar divergências diretamente (sem usar hook de cache para evitar overhead)
          const { data: divergencias, error: divergenciasError } = await supabase
            .from('divergencias')
            .select('id')
            .eq('nota_fiscal_id', notaFiscalData[0].id as string)
            .limit(1)
          
          if (!divergenciasError && divergencias && divergencias.length > 0) {
            console.log(`⚠️ NF ${numeroNF} encontrada em divergências`)
            return {
              valido: false,
              erro: `NF ${numeroNF} possui divergência registrada e não pode ser bipada novamente.`,
            }
          }
        }
        
        return null
      })()

      const resultadoDivergencias = await Promise.race([verificarDivergenciasPromise, timeoutPromise])
      
      if (resultadoDivergencias && typeof resultadoDivergencias === 'object' && 'valido' in resultadoDivergencias) {
        return resultadoDivergencias as { valido: boolean; nota?: NotaFiscal; erro?: string }
      }
      
      console.log(`✅ NF ${numeroNF} não encontrada em divergências`)
    } catch (error) {
      console.error(`❌ Erro ao verificar divergências:`, error)
      // Em caso de erro, continuar com a validação
    }

    // 5. Verificar se a nota pertence à transportadora selecionada
    if (transportadoraSelecionada) {
      console.log(`🔍 Verificando se NF ${numeroNF} pertence à transportadora ${transportadoraSelecionada}`)
      console.log(`📋 Dados da nota: Fornecedor="${fornecedor}", Cliente="${clienteDestino}"`)
      
      // Primeiro verificar se a nota está no cache da transportadora selecionada
      const notaNoCache = notasTransportadoraCache.find(nota => 
        nota.numero_nf === numeroNF
      )
      
      if (notaNoCache) {
        console.log(`✅ NF ${numeroNF} encontrada no cache da transportadora ${transportadoraSelecionada} - permitindo bipagem`)
        console.log(`📋 Nota no cache:`, notaNoCache)
      } else {
        // Se não está no cache, verificar se o fornecedor ou cliente destino corresponde à transportadora selecionada
        const pertenceTransportadora = 
          fornecedor === transportadoraSelecionada || 
          clienteDestino === transportadoraSelecionada
        
        console.log(`🔍 Comparação: fornecedor === transportadora: ${fornecedor === transportadoraSelecionada}`)
        console.log(`🔍 Comparação: cliente === transportadora: ${clienteDestino === transportadoraSelecionada}`)
        console.log(`🔍 Resultado final: pertenceTransportadora = ${pertenceTransportadora}`)
        
        if (!pertenceTransportadora) {
          console.log(`❌ NF ${numeroNF} não pertence à transportadora ${transportadoraSelecionada}`)
          return {
            valido: false,
            erro: `NF ${numeroNF} não pertence à transportadora "${transportadoraSelecionada}".\n\nFornecedor: ${fornecedor}\nCliente: ${clienteDestino}\n\nEsta nota não está no consolidado para a transportadora selecionada.\n\nSelecione a transportadora correta ou verifique se a nota está no consolidado.`
          }
        }
        
        console.log(`⚠️ NF ${numeroNF} não encontrada no cache da transportadora ${transportadoraSelecionada}, mas pertence à transportadora - permitindo bipagem`)
      }
      
      console.log(`✅ NF ${numeroNF} pertence à transportadora ${transportadoraSelecionada}`)
    }

    console.log(`✅ NF ${numeroNF} validada com sucesso - pode ser bipada`)

    const nota: NotaFiscal = {
      id: `${Date.now()}-${numeroNF}`,
      codigoCompleto: codigo,
      data,
      numeroNF,
      volumes,
      destino,
      fornecedor,
      clienteDestino,
      tipoCarga,
      timestamp: new Date().toISOString(),
      status: "ok",
    }
    return { valido: true, nota }
  }

  const handleBipagem = async () => {
    if (!codigoInput.trim()) return

    if (!sessaoIniciada) {
      alert("Selecione uma transportadora primeiro!")
      setModalSelecaoTransportadora(true)
      return
    }

    if (!bipagemIniciada) {
      alert("Inicie a bipagem primeiro!")
      return
    }

    console.log(`🚀 Iniciando validação da NF: ${codigoInput.trim()}`)
    console.log(`📱 Scanner ativo: ${scannerAtivo}, Scanner para bipar: ${scannerParaBipar}`)
    
    // Se for bipagem manual (não via scanner), limpar a flag
    if (!scannerAtivo) {
      console.log('📝 Bipagem manual detectada - limpando flag scannerParaBipar')
      setScannerParaBipar(false)
    }

    const resultado = await validarCodigo(codigoInput.trim())

    if (resultado.valido && resultado.nota) {
      console.log(`✅ NF ${resultado.nota.numeroNF} validada com sucesso`)
      setNotaAtual(resultado.nota)
      setModalConfirmacao(true)
      setCodigoInput("")
    } else {
      console.log(`❌ NF rejeitada:`, resultado.erro)
      
      // Criar mensagem mais informativa
      let mensagem = `❌ Nota Fiscal não pode ser bipada:\n\n${resultado.erro}`
      
      // Adicionar informações adicionais baseadas no tipo de erro
      if (resultado.erro?.includes('já foi bipada nesta sessão')) {
        mensagem += '\n\n💡 Dica: Esta nota já foi processada na sessão atual.'
      } else if (resultado.erro?.includes('já utilizada no relatório')) {
        mensagem += '\n\n💡 Dica: Esta nota já foi finalizada em outro relatório.'
      } else if (resultado.erro?.includes('sessão ativa de')) {
        mensagem += '\n\n💡 Dica: Esta nota está sendo processada em outro setor.'
      } else if (resultado.erro?.includes('divergência registrada')) {
        mensagem += '\n\n💡 Dica: Esta nota possui divergência e não pode ser reprocessada.'
      }
      
      alert(mensagem)
      setCodigoInput("")
      
      // Reativar a câmera automaticamente apenas se foi aberta para bipar via scanner
      if (scannerParaBipar) {
        setTimeout(() => {
          setScannerAtivo(true)
          console.log('📷 Câmera reativada automaticamente após rejeição da nota (bipagem via scanner)')
        }, 1000) // Delay maior para dar tempo do usuário ler o alerta
      } else {
        console.log('📝 Bipagem manual - scanner não será reativado automaticamente')
      }
    }
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleCodigoEscaneado = async (codigo: string) => {
    setCodigoInput(codigo)
    setScannerAtivo(false)
    
    if (!sessaoIniciada) {
      alert("Selecione uma transportadora primeiro!")
      setModalSelecaoTransportadora(true)
      return
    }

    if (!bipagemIniciada) {
      alert("Inicie a bipagem primeiro!")
      return
    }
    
    console.log(`📱 Código escaneado: ${codigo}`)
    
    const resultado = await validarCodigo(codigo.trim())

    if (resultado.valido && resultado.nota) {
      console.log(`✅ NF ${resultado.nota.numeroNF} validada com sucesso via scanner`)
      setNotaAtual(resultado.nota)
      setModalConfirmacao(true)
      setCodigoInput("")
    } else {
      console.log(`❌ NF rejeitada via scanner:`, resultado.erro)
      
      // Criar mensagem mais informativa
      let mensagem = `❌ Nota Fiscal não pode ser bipada:\n\n${resultado.erro}`
      
      // Adicionar informações adicionais baseadas no tipo de erro
      if (resultado.erro?.includes('já foi bipada nesta sessão')) {
        mensagem += '\n\n💡 Dica: Esta nota já foi processada na sessão atual.'
      } else if (resultado.erro?.includes('já utilizada no relatório')) {
        mensagem += '\n\n💡 Dica: Esta nota já foi finalizada em outro relatório.'
      } else if (resultado.erro?.includes('sessão ativa de')) {
        mensagem += '\n\n💡 Dica: Esta nota está sendo processada em outro setor.'
      } else if (resultado.erro?.includes('divergência registrada')) {
        mensagem += '\n\n💡 Dica: Esta nota possui divergência e não pode ser reprocessada.'
      }
      
      alert(mensagem)
      setCodigoInput("")
      
      // Reativar a câmera automaticamente apenas se foi aberta para bipar via scanner
      if (scannerParaBipar) {
        setTimeout(() => {
          setScannerAtivo(true)
          console.log('📷 Câmera reativada automaticamente após rejeição da nota via scanner')
        }, 1000) // Delay maior para dar tempo do usuário ler o alerta
      } else {
        console.log('📝 Nota rejeitada via scanner mas scanner não foi aberto para bipar - não reativando')
      }
    }
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const carregarNotasTransportadora = async (transportadora: string) => {
    try {
      console.log(`🔄 Carregando notas da transportadora: ${transportadora}`)
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      // Buscar notas da transportadora no consolidado (por campo transportadora)
      // IMPORTANTE: Filtrar apenas notas com status "deu entrada"
      const { data: consolidadoData, error: errorConsolidado } = await supabase
        .from('notas_consolidado')
        .select('*')
        .eq('transportadora', transportadora)
        .eq('status', 'deu entrada') // FILTRO CRÍTICO: Apenas notas com status "deu entrada"
        .order('numero_nf', { ascending: true })

      if (errorConsolidado) {
        console.error('❌ Erro ao carregar notas do consolidado:', errorConsolidado)
      }

      // Buscar notas por fornecedor (caso a transportadora seja o fornecedor)
      // IMPORTANTE: Filtrar apenas notas com status "deu entrada"
      const { data: fornecedorData, error: errorFornecedor } = await supabase
        .from('notas_consolidado')
        .select('*')
        .eq('fornecedor', transportadora)
        .eq('status', 'deu entrada') // FILTRO CRÍTICO: Apenas notas com status "deu entrada"
        .order('numero_nf', { ascending: true })

      if (errorFornecedor) {
        console.error('❌ Erro ao carregar notas por fornecedor:', errorFornecedor)
      }

      // Buscar notas por cliente destino (caso a transportadora seja o cliente destino)
      // IMPORTANTE: Filtrar apenas notas com status "deu entrada"
      const { data: clienteData, error: errorCliente } = await supabase
        .from('notas_consolidado')
        .select('*')
        .eq('cliente_destino', transportadora)
        .eq('status', 'deu entrada') // FILTRO CRÍTICO: Apenas notas com status "deu entrada"
        .order('numero_nf', { ascending: true })

      if (errorCliente) {
        console.error('❌ Erro ao carregar notas por cliente destino:', errorCliente)
      }

      // Combinar todas as notas e remover duplicatas
      const todasNotas = [
        ...(consolidadoData || []),
        ...(fornecedorData || []),
        ...(clienteData || [])
      ]

      // Remover duplicatas baseado no numero_nf
      const notasUnicas = todasNotas.filter((nota, index, self) => 
        index === self.findIndex(n => n.numero_nf === nota.numero_nf)
      )

      // Buscar notas já bipadas (liberadas) para esta transportadora
      // IMPORTANTE: Buscar também fornecedor e volumes para comparação correta
      const { data: notasBipadasData, error: errorBipadas } = await supabase
        .from('notas_bipadas')
        .select('numero_nf, fornecedor, volumes')
        .eq('area_origem', 'recebimento')
        .in('numero_nf', notasUnicas.map(n => n.numero_nf))

      if (errorBipadas) {
        console.warn('⚠️ Erro ao carregar notas bipadas:', errorBipadas)
      }

      // Criar Set com chave composta (numero_nf|fornecedor|volumes) das notas já bipadas
      const notasBipadasSet = new Set(
        notasBipadasData?.map((item: any) => 
          `${item.numero_nf}|${item.fornecedor || ''}|${item.volumes || 0}`
        ) || []
      )

      // Filtrar apenas as notas que ainda não foram bipadas
      // Comparar usando os três critérios: numero_nf, fornecedor e volumes
      const notasRestantes = notasUnicas.filter(nota => {
        const chaveNota = `${nota.numero_nf}|${nota.fornecedor || ''}|${nota.volumes || 0}`
        return !notasBipadasSet.has(chaveNota)
      })

      setNotasTransportadoraCache(notasRestantes)
      
      console.log(`✅ ${notasRestantes.length} notas restantes carregadas para ${transportadora}`)
      console.log(`📋 Notas restantes no cache:`, notasRestantes.map(n => n.numero_nf))
      console.log(`📊 Total original: ${notasUnicas.length}, Já bipadas: ${notasUnicas.length - notasRestantes.length}, Restantes: ${notasRestantes.length}`)
      
      return notasRestantes
    } catch (error) {
      console.error('❌ Erro ao carregar notas da transportadora:', error)
      return []
    }
  }

  const calcularProgressoTransportadoraComNotas = async (transportadora: string, notasAtualizadas: any[]) => {
    try {
      // Usar o cache da transportadora em vez de buscar no banco
      const totalNotas = notasTransportadoraCache.length
      
      // Contar todas as notas bipadas que pertencem à transportadora selecionada
      // Como as notas já foram validadas como pertencentes à transportadora, contamos todas
      const notasBipadas = notasAtualizadas.length

      const percentual = totalNotas > 0 ? Math.round((notasBipadas / totalNotas) * 100) : 0

      console.log(`📊 Progresso atualizado para ${transportadora}: ${notasBipadas}/${totalNotas} (${percentual}%)`)
      console.log(`📋 Notas bipadas:`, notasAtualizadas.map(n => n.numeroNF))

      setProgressoTransportadora({
        bipadas: notasBipadas,
        total: totalNotas,
        percentual
      })
    } catch (error) {
      console.error('❌ Erro ao calcular progresso:', error)
    }
  }

  const confirmarNota = async () => {
    if (!notaAtual) return
    
    // Validação inicial: verificar se a nota não foi adicionada enquanto processávamos
    const notaJaExiste = notas.find(n => n.numeroNF === notaAtual.numeroNF)
    if (notaJaExiste) {
      console.log(`⚠️ NF ${notaAtual.numeroNF} já foi adicionada durante o processamento - evitando duplicação`)
      setModalConfirmacao(false)
      setNotaAtual(null)
      toast({
        title: "Nota já processada",
        description: `NF ${notaAtual.numeroNF} já foi processada. Duplicação evitada.`,
        variant: "destructive",
      })
      return
    }
    
    // Garantir que a nota tenha status "ok"
    const notaComStatus: NotaFiscal = {
      ...notaAtual,
      status: "ok"
    }
    
    // Atualizar status da nota na tabela notas_fiscais se conectado
    try {
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      // Buscar a nota na tabela notas_fiscais
      // Usar apenas numero_nf para busca mais confiável
      const { data: notaExistente, error: buscaError } = await supabase
        .from('notas_fiscais')
        .select('id')
        .eq('numero_nf', notaAtual.numeroNF)
        .limit(1)
      
      if (!buscaError && notaExistente && notaExistente.length > 0) {
        // Atualizar o status da nota para "ok"
        const { error: updateError } = await supabase
          .from('notas_fiscais')
          .update({ status: 'ok' })
          .eq('id', notaExistente[0].id as string)
        
        if (updateError) {
          console.error('❌ Erro ao atualizar status da nota:', updateError)
        } else {
          console.log('✅ Status da nota atualizado para "ok" na tabela notas_fiscais')
        }
      } else {
        console.log('ℹ️ Nota não existe na tabela notas_fiscais - será criada apenas quando o relatório for finalizado')
        // ❌ NÃO CRIAR NOTA AQUI! Ela só deve ser criada quando o relatório for finalizado
      }
    } catch (error) {
      console.error('❌ Erro ao verificar nota existente:', error)
    }
    
    // Atualizar status da nota no consolidado para "recebida"
    try {
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      // Atualizar status da nota no consolidado
      const { error: updateError } = await supabase
        .from('notas_consolidado')
        .update({ status: 'recebida' })
        .eq('numero_nf', notaAtual.numeroNF)

      if (updateError) {
        console.error('❌ Erro ao atualizar status da nota no consolidado:', updateError)
      } else {
        console.log(`✅ Status da nota ${notaAtual.numeroNF} atualizado para "recebida" no consolidado`)
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status da nota no consolidado:', error)
    }

    // Salvar nota bipada na tabela centralizada
    let salvamentoCentralizadoSucesso = false;
    try {
      const notaBipada = {
        numero_nf: notaAtual.numeroNF,
        codigo_completo: notaAtual.codigoCompleto,
        area_origem: 'recebimento' as const,
        session_id: `recebimento_${Array.isArray(sessionData?.colaboradores) && sessionData?.colaboradores.length > 0 
          ? sessionData?.colaboradores.join('_') 
          : 'sem_colaborador'}_${sessionData?.data}_${sessionData?.turno}`,
        colaboradores: Array.isArray(sessionData?.colaboradores) && sessionData?.colaboradores.length > 0
          ? sessionData.colaboradores
          : ['Não informado'],
        data: sessionData?.data || new Date().toISOString().split('T')[0],
        turno: sessionData?.turno || '',
        volumes: notaAtual.volumes,
        destino: notaAtual.destino,
        fornecedor: notaAtual.fornecedor,
        cliente_destino: notaAtual.clienteDestino,
        tipo_carga: notaAtual.tipoCarga,
        status: 'ok',
        observacoes: 'NF recebida no setor de Recebimento',
        timestamp_bipagem: new Date().toISOString()
      };

      await notasBipadasService.salvarNotaBipada(notaBipada);
      console.log('✅ Nota bipada salva na tabela centralizada');
      salvamentoCentralizadoSucesso = true;
    } catch (error) {
      console.error('❌ Erro ao salvar nota bipada na tabela centralizada:', error);
      // Mostrar alerta para o usuário sobre o problema
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.warn(`⚠️ ATENÇÃO: NF ${notaAtual.numeroNF} foi processada localmente mas NÃO foi salva na tabela centralizada. Erro: ${errorMessage}`);
      
      // Registrar problema de salvamento
      setProblemasSalvamento(prev => [...prev, `NF ${notaAtual.numeroNF}: ${errorMessage}`]);
      
      // Adicionar uma observação na nota local indicando o problema
      (notaComStatus as any).observacoes = `NF processada localmente - Erro ao salvar na tabela centralizada: ${errorMessage}`;
    }
    
    const notasAtualizadas = [notaComStatus, ...notas]
    await saveNotas(chaveNotas, notasAtualizadas)
    
    // Disparar evento em tempo real
    addRealtimeEvent({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      sector: 'recebimento',
      type: 'nf_scanned',
      message: `NF ${notaAtual.numeroNF} recebida`,
      data: { numeroNF: notaAtual.numeroNF, fornecedor: notaAtual.fornecedor, volumes: notaAtual.volumes }
    });
    
    setModalConfirmacao(false)
    setNotaAtual(null)
    
    // Recalcular progresso se houver transportadora selecionada
    // Usar as notas atualizadas em vez do estado antigo
    if (transportadoraSelecionada) {
      await calcularProgressoTransportadoraComNotas(transportadoraSelecionada, notasAtualizadas)
    }
    
    // Reativar a câmera automaticamente apenas se foi aberta para bipar via scanner
    if (scannerParaBipar) {
      setTimeout(() => {
        setScannerAtivo(true)
        console.log('📷 Câmera reativada automaticamente após confirmação da nota (scanner para bipar)')
      }, 500) // Pequeno delay para garantir que o modal foi fechado
    } else {
      console.log('📝 Nota confirmada mas scanner não foi aberto para bipar - não reativando')
    }
    
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const abrirDivergencia = () => {
    setModalConfirmacao(false)
    setModalDivergencia(true)
  }

  const alterarStatusNota = async (nota: NotaFiscal, novoStatus: "ok" | "divergencia") => {
    try {
      // Atualizar status da nota na tabela notas_fiscais se conectado
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      // Buscar a nota na tabela notas_fiscais
      const { data: notaExistente, error: buscaError } = await supabase
        .from('notas_fiscais')
        .select('id')
        .eq('numero_nf', nota.numeroNF)
        .limit(1)
      
      if (!buscaError && notaExistente && notaExistente.length > 0) {
        const notaFiscalId = notaExistente[0].id as string
        
        // Atualizar o status da nota
        const { error: updateError } = await supabase
          .from('notas_fiscais')
          .update({ status: novoStatus })
          .eq('id', notaFiscalId)
        
        if (updateError) {
          console.error('❌ Erro ao atualizar status da nota:', updateError)
        } else {
          console.log(`✅ Status da nota atualizado para "${novoStatus}" na tabela notas_fiscais`)
        }
        
        // Se estiver alterando para "ok", excluir a divergência da tabela divergencias
        if (novoStatus === "ok") {
          try {
            // Buscar divergências relacionadas a esta nota fiscal
            const { data: divergencias, error: divergenciasError } = await supabase
              .from('divergencias')
              .select('id')
              .eq('nota_fiscal_id', notaFiscalId)
            
            if (!divergenciasError && divergencias && divergencias.length > 0) {
              // Excluir todas as divergências relacionadas
              const idsDivergencias = divergencias.map(d => d.id as string)
              const { error: deleteError } = await supabase
                .from('divergencias')
                .delete()
                .in('id', idsDivergencias)
              
              if (deleteError) {
                console.error('❌ Erro ao excluir divergência da tabela divergencias:', deleteError)
              } else {
                console.log(`✅ ${divergencias.length} divergência(s) excluída(s) da tabela divergencias`)
              }
            } else {
              console.log('ℹ️ Nenhuma divergência encontrada para excluir')
            }
          } catch (error) {
            console.error('❌ Erro ao excluir divergência:', error)
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status da nota:', error)
    }

    // Atualizar status na tabela notas_bipadas (apenas a mais recente da sessão atual)
    try {
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      // Buscar a nota mais recente da sessão atual
      const sessionId = sessionData
        ? `recebimento_${Array.isArray(sessionData.colaboradores) && sessionData.colaboradores.length > 0 
            ? sessionData.colaboradores.join('_') 
            : 'sem_colaborador'}_${sessionData.data}_${sessionData.turno}`
        : ''
      
      if (sessionId) {
        // Buscar todas as notas bipadas desta sessão com este número de NF
        const { data: notasBipadas, error: buscaError } = await supabase
          .from('notas_bipadas')
          .select('id')
          .eq('numero_nf', nota.numeroNF)
          .eq('area_origem', 'recebimento')
          .eq('session_id', sessionId)
          .order('timestamp_bipagem', { ascending: false })

        if (!buscaError && notasBipadas && notasBipadas.length > 0) {
          // Atualizar todas as ocorrências desta nota na sessão (normalmente será apenas uma)
          const ids = notasBipadas.map(nb => nb.id as string)
          const { error: updateError } = await supabase
            .from('notas_bipadas')
            .update({ status: novoStatus })
            .in('id', ids)

          if (updateError) {
            console.error('❌ Erro ao atualizar status na tabela notas_bipadas:', updateError)
          } else {
            console.log(`✅ Status atualizado na tabela notas_bipadas para ${notasBipadas.length} registro(s)`)
          }
        } else {
          console.warn(`⚠️ Nota ${nota.numeroNF} não encontrada na tabela notas_bipadas para atualização de status`)
        }
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status na tabela notas_bipadas:', error)
    }

    // Atualizar nota localmente
    console.log('🔄 Iniciando atualização local...', { 
      notaId: nota.id, 
      numeroNF: nota.numeroNF,
      novoStatus, 
      totalNotasAtuais: notas.length,
      notaEncontrada: notas.find(n => n.id === nota.id || n.numeroNF === nota.numeroNF)
    })
    
    const notasAtualizadas = notas.map((n) => {
      // Comparar por ID ou número da NF para garantir que encontramos a nota correta
      if (n.id === nota.id || n.numeroNF === nota.numeroNF) {
        console.log('✅ Nota encontrada para atualização:', { 
          id: n.id, 
          numeroNF: n.numeroNF, 
          statusAtual: n.status, 
          novoStatus 
        })
        
        if (novoStatus === "ok") {
          // Remover divergência se mudar para OK
          const { divergencia, ...notaSemDivergencia } = n
          const notaAtualizada = { ...notaSemDivergencia, status: "ok" as const }
          console.log('✅ Nota atualizada para OK:', notaAtualizada)
          return notaAtualizada
        } else {
          // Se mudar para divergência, manter a divergência existente ou criar uma padrão
          const notaAtualizada = {
            ...n,
            status: "divergencia" as const,
            divergencia: n.divergencia || {
              observacoes: "0000 - Sem divergência (alterado posteriormente)",
              volumesInformados: n.volumes,
            },
          }
          console.log('✅ Nota atualizada para Divergência:', notaAtualizada)
          return notaAtualizada
        }
      }
      return n
    })

    console.log('🔄 Salvando notas atualizadas...', { 
      totalNotas: notasAtualizadas.length,
      notasComNovoStatus: notasAtualizadas.filter(n => 
        (n.id === nota.id || n.numeroNF === nota.numeroNF) && n.status === novoStatus
      )
    })
    await saveNotas(chaveNotas, notasAtualizadas)
    console.log('✅ Notas salvas com sucesso')
    
    // Mostrar toast de confirmação
    toast({
      title: "Status alterado",
      description: `NF ${nota.numeroNF} alterada para ${novoStatus === "ok" ? "OK" : "Divergência"}.`,
      variant: novoStatus === "ok" ? "default" : "destructive",
    })
    
    setModalAlterarStatus(false)
    setNotaParaAlterarStatus(null)
    
    // Recalcular progresso se houver transportadora selecionada
    if (transportadoraSelecionada) {
      await calcularProgressoTransportadoraComNotas(transportadoraSelecionada, notasAtualizadas)
    }
  }

  const handleAlterarParaDivergencia = () => {
    if (!notaParaAlterarStatus) return
    // Se a nota já tem divergência, apenas atualizar o status
    if (notaParaAlterarStatus.status === "divergencia") {
      toast({
        title: "Status já é divergência",
        description: "Esta nota já está marcada como divergência.",
        variant: "destructive",
      })
      setModalAlterarStatus(false)
      setNotaParaAlterarStatus(null)
      return
    }
    // Abrir modal de divergência para registrar os detalhes
    setModalAlterarStatus(false)
    setNotaAtual(notaParaAlterarStatus)
    setModalDivergencia(true)
    setNotaParaAlterarStatus(null)
  }

  const handleAlterarParaOk = async () => {
    if (!notaParaAlterarStatus) return
    await alterarStatusNota(notaParaAlterarStatus, "ok")
  }

  const handleLongPressNota = (nota: NotaFiscal) => {
    setNotaParaAlterarStatus(nota)
    setSenhaInput("")
    setSenhaErrada(false)
    setModalSenha(true)
  }

  const validarSenha = () => {
    const SENHA_CORRETA = "rec2026"
    if (senhaInput === SENHA_CORRETA) {
      setModalSenha(false)
      setSenhaInput("")
      setSenhaErrada(false)
      setModalAlterarStatus(true)
    } else {
      setSenhaErrada(true)
      setSenhaInput("")
    }
  }

  const fecharModalSenha = () => {
    setModalSenha(false)
    setSenhaInput("")
    setSenhaErrada(false)
    setNotaParaAlterarStatus(null)
  }

  const confirmarDivergencia = async (tipoDivergencia: string, volumesInformados: number) => {
    if (!notaAtual) return
    
    const tipoObj = TIPOS_DIVERGENCIA.find((t) => t.codigo === tipoDivergencia)
    
    // Verificar se a nota já existe (pode ser uma atualização de status via duplo clique)
    const notaExistente = notas.find(n => n.numeroNF === notaAtual.numeroNF)
    const isAtualizacao = !!notaExistente
    
    if (isAtualizacao) {
      console.log(`🔄 Atualizando status da nota ${notaAtual.numeroNF} para divergência`)
    } else {
      console.log(`➕ Adicionando nova nota ${notaAtual.numeroNF} com divergência`)
    }
    
    const notaComDivergencia: NotaFiscal = {
      ...notaAtual,
      status: "divergencia",
      divergencia: {
        observacoes: `${tipoDivergencia} - ${tipoObj?.descricao || "Divergência não identificada"}`,
        volumesInformados,
      },
    }
    
    // Atualizar status da nota na tabela notas_fiscais se conectado
    try {
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      // Buscar a nota na tabela notas_fiscais
      // Usar apenas numero_nf para busca mais confiável
      const { data: notaExistente, error: buscaError } = await supabase
        .from('notas_fiscais')
        .select('id')
        .eq('numero_nf', notaAtual.numeroNF)
        .limit(1)
      
      if (!buscaError && notaExistente && notaExistente.length > 0) {
        // Atualizar o status da nota para "divergencia"
        const { error: updateError } = await supabase
          .from('notas_fiscais')
          .update({ status: 'divergencia' })
          .eq('id', notaExistente[0].id as string)
        
        if (updateError) {
          console.error('❌ Erro ao atualizar status da nota na tabela notas_fiscais:', updateError)
        } else {
          console.log('✅ Status da nota atualizado para "divergencia" na tabela notas_fiscais')
        }
        
        // Salvar divergência na tabela divergencias
        try {
          const divergenciaData = {
            nota_fiscal_id: notaExistente[0].id,
            tipo: 'volumes',
            descricao: 'Divergência de volumes',
            volumes_informados: volumesInformados,
            volumes_reais: notaAtual.volumes,
            observacoes: `${tipoDivergencia} - ${tipoObj?.descricao || "Divergência não identificada"}`
          }
          
          console.log('🔍 Tentando inserir divergência com dados:', divergenciaData)
          
          const { data: divergenciaResult, error: divergenciaError } = await supabase
            .from('divergencias')
            .insert(divergenciaData)
            .select()
          
          if (divergenciaError) {
            console.error('❌ Erro ao salvar divergência na tabela divergencias:', divergenciaError)
            console.error('❌ Detalhes do erro:', {
              message: divergenciaError.message,
              details: divergenciaError.details,
              hint: divergenciaError.hint,
              code: divergenciaError.code
            })
          } else {
            console.log('✅ Divergência salva na tabela divergencias com ID:', divergenciaResult?.[0]?.id)
            
                // Verificar se a divergência foi realmente salva (aguardar um pouco para garantir commit)
                const divergenciaId = divergenciaResult?.[0]?.id
                if (divergenciaId) {
                  // Aguardar 1 segundo para garantir que a transação foi commitada
                  await new Promise(resolve => setTimeout(resolve, 1000))
                  
                  const { data: verificacao, error: erroVerificacao } = await supabase
                    .from('divergencias')
                    .select('id')
                    .eq('id', divergenciaId)
                    .single()
                  
                  if (erroVerificacao || !verificacao) {
                    console.error('❌ ERRO CRÍTICO: Divergência não foi encontrada após inserção!', erroVerificacao)
                  } else {
                    console.log('✅ CONFIRMADO: Divergência existe na tabela com ID:', verificacao.id)
                  }
                }
          }
        } catch (error) {
          console.error('❌ Erro ao salvar divergência:', error)
        }
      } else {
        console.log('⚠️ Nota não encontrada na tabela notas_fiscais para atualização de status')
        
        // Se a nota não existe, criar na tabela notas_fiscais
        try {
          const novaNota = {
            codigo_completo: notaAtual.codigoCompleto,
            numero_nf: notaAtual.numeroNF,
            data: sessionData?.data || new Date().toISOString().split('T')[0],
            volumes: notaAtual.volumes,
            destino: notaAtual.destino,
            fornecedor: notaAtual.fornecedor,
            cliente_destino: notaAtual.clienteDestino,
            tipo_carga: notaAtual.tipoCarga,
            status: 'divergencia'
          }
          
          const { data: notaCriada, error: createError } = await supabase
            .from('notas_fiscais')
            .insert(novaNota)
            .select()
            .limit(1)
          
          if (createError) {
            console.error('❌ Erro ao criar nota na tabela notas_fiscais:', createError)
          } else {
            console.log('✅ Nota criada na tabela notas_fiscais com ID:', (notaCriada[0] as any).id)
            
            // Salvar divergência na tabela divergencias
            try {
              const divergenciaData = {
                nota_fiscal_id: (notaCriada[0] as any).id,
                tipo: 'volumes',
                descricao: 'Divergência de volumes',
                volumes_informados: volumesInformados,
                volumes_reais: notaAtual.volumes,
                observacoes: `${tipoDivergencia} - ${tipoObj?.descricao || "Divergência não identificada"}`
              }
              
              console.log('🔍 Tentando inserir divergência (nota nova) com dados:', divergenciaData)
              
              const { data: divergenciaResult, error: divergenciaError } = await supabase
                .from('divergencias')
                .insert(divergenciaData)
                .select()
              
              if (divergenciaError) {
                console.error('❌ Erro ao salvar divergência na tabela divergencias:', divergenciaError)
                console.error('❌ Detalhes do erro:', {
                  message: divergenciaError.message,
                  details: divergenciaError.details,
                  hint: divergenciaError.hint,
                  code: divergenciaError.code
                })
              } else {
                console.log('✅ Divergência salva na tabela divergencias com ID:', divergenciaResult?.[0]?.id)
                
                // Verificar se a divergência foi realmente salva (aguardar um pouco para garantir commit)
                const divergenciaId = divergenciaResult?.[0]?.id
                if (divergenciaId) {
                  // Aguardar 1 segundo para garantir que a transação foi commitada
                  await new Promise(resolve => setTimeout(resolve, 1000))
                  
                  const { data: verificacao, error: erroVerificacao } = await supabase
                    .from('divergencias')
                    .select('id')
                    .eq('id', divergenciaId)
                    .single()
                  
                  if (erroVerificacao || !verificacao) {
                    console.error('❌ ERRO CRÍTICO: Divergência não foi encontrada após inserção!', erroVerificacao)
                  } else {
                    console.log('✅ CONFIRMADO: Divergência existe na tabela com ID:', verificacao.id)
                  }
                }
              }
            } catch (error) {
              console.error('❌ Erro ao salvar divergência:', error)
            }
          }
        } catch (error) {
          console.error('❌ Erro ao criar nota:', error)
        }
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status da nota:', error)
    }
    
    // Atualizar status da nota no consolidado para "recebida"
    try {
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      // Atualizar status da nota no consolidado
      const { error: updateError } = await supabase
        .from('notas_consolidado')
        .update({ status: 'recebida' })
        .eq('numero_nf', notaAtual.numeroNF)

      if (updateError) {
        console.error('❌ Erro ao atualizar status da nota no consolidado:', updateError)
      } else {
        console.log(`✅ Status da nota ${notaAtual.numeroNF} atualizado para "recebida" no consolidado`)
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status da nota no consolidado:', error)
    }
    
    // Atualizar ou salvar nota bipada na tabela centralizada
    let salvamentoCentralizadoSucesso = false;
    try {
      const sessionId = `recebimento_${Array.isArray(sessionData?.colaboradores) && sessionData?.colaboradores.length > 0 
        ? sessionData?.colaboradores.join('_') 
        : 'sem_colaborador'}_${sessionData?.data}_${sessionData?.turno}`
      
      // Verificar se a nota já existe na tabela notas_bipadas
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      const { data: notaBipadaExistente, error: buscaError } = await supabase
        .from('notas_bipadas')
        .select('id')
        .eq('numero_nf', notaAtual.numeroNF)
        .eq('area_origem', 'recebimento')
        .eq('session_id', sessionId)
        .order('timestamp_bipagem', { ascending: false })
        .limit(1)

      if (!buscaError && notaBipadaExistente && notaBipadaExistente.length > 0) {
        // Atualizar a nota existente
        const { error: updateError } = await supabase
          .from('notas_bipadas')
          .update({ 
            status: 'divergencia',
            observacoes: `NF recebida com divergência: ${tipoDivergencia} - ${tipoObj?.descricao || "Divergência não identificada"}`
          })
          .eq('id', notaBipadaExistente[0].id as string)

        if (updateError) {
          console.error('❌ Erro ao atualizar nota bipada na tabela centralizada:', updateError)
        } else {
          console.log('✅ Nota bipada atualizada para divergência na tabela centralizada')
          salvamentoCentralizadoSucesso = true
        }
      } else {
        // Inserir nova nota
        const notaBipada = {
          numero_nf: notaAtual.numeroNF,
          codigo_completo: notaAtual.codigoCompleto,
          area_origem: 'recebimento' as const,
          session_id: sessionId,
          colaboradores: Array.isArray(sessionData?.colaboradores) && sessionData?.colaboradores.length > 0
            ? sessionData.colaboradores
            : ['Não informado'],
          data: sessionData?.data || new Date().toISOString().split('T')[0],
          turno: sessionData?.turno || '',
          volumes: notaAtual.volumes,
          destino: notaAtual.destino,
          fornecedor: notaAtual.fornecedor,
          cliente_destino: notaAtual.clienteDestino,
          tipo_carga: notaAtual.tipoCarga,
          status: 'divergencia',
          observacoes: `NF recebida com divergência: ${tipoDivergencia} - ${tipoObj?.descricao || "Divergência não identificada"}`,
          timestamp_bipagem: new Date().toISOString()
        };

        await notasBipadasService.salvarNotaBipada(notaBipada);
        console.log('✅ Nota bipada com divergência salva na tabela centralizada');
        salvamentoCentralizadoSucesso = true;
      }
    } catch (error) {
      console.error('❌ Erro ao salvar nota bipada com divergência na tabela centralizada:', error);
      // Mostrar alerta para o usuário sobre o problema
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.warn(`⚠️ ATENÇÃO: NF ${notaAtual.numeroNF} com divergência foi processada localmente mas NÃO foi salva na tabela centralizada. Erro: ${errorMessage}`);
      
      // Registrar problema de salvamento
      setProblemasSalvamento(prev => [...prev, `NF ${notaAtual.numeroNF} (divergência): ${errorMessage}`]);
      
      // Adicionar uma observação na nota local indicando o problema
      (notaComDivergencia as any).observacoes = `NF processada localmente com divergência - Erro ao salvar na tabela centralizada: ${errorMessage}`;
    }
    
    // Se for atualização, substituir a nota existente; se for nova, adicionar
    const notasAtualizadas = isAtualizacao
      ? notas.map(n => n.numeroNF === notaAtual.numeroNF ? notaComDivergencia : n)
      : [notaComDivergencia, ...notas]
    
    console.log('🔄 Salvando notas atualizadas...', { 
      isAtualizacao, 
      totalNotas: notasAtualizadas.length,
      notaAtualizada: notasAtualizadas.find(n => n.numeroNF === notaAtual.numeroNF)
    })
    await saveNotas(chaveNotas, notasAtualizadas)
    console.log('✅ Notas salvas com sucesso')
    
    // Disparar evento em tempo real
    addRealtimeEvent({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      sector: 'recebimento',
      type: 'nf_scanned',
      message: `NF ${notaAtual.numeroNF} recebida com divergência`,
      data: { numeroNF: notaAtual.numeroNF, fornecedor: notaAtual.fornecedor, volumes: notaAtual.volumes, divergencia: tipoDivergencia }
    });
    
    setModalDivergencia(false)
    setNotaAtual(null)
    
    // Recalcular progresso se houver transportadora selecionada
    // Usar as notas atualizadas em vez do estado antigo
    if (transportadoraSelecionada) {
      await calcularProgressoTransportadoraComNotas(transportadoraSelecionada, notasAtualizadas)
    }
    
    // Não reativar a câmera automaticamente após confirmar divergência
    
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const finalizarRelatorio = async () => {
    if (!sessaoIniciada) {
      alert("Selecione uma transportadora primeiro!")
      setModalSelecaoTransportadora(true)
      return
    }
    
    if (notas.length === 0) {
      alert("Não há notas para finalizar o relatório!")
      return
    }

    if (!sessionData) {
      alert("Erro de sessão. Faça o login novamente.")
      return
    }

    // Ativar estado de loading
    setFinalizando(true)

    try {
      const somaVolumes = notas.reduce((sum, nota) => sum + (nota.divergencia?.volumesInformados || nota.volumes), 0)
      
      // Calcular total de divergências
      const totalDivergencias = notas.filter(nota => 
        nota.status === 'divergencia' || 
        (nota.divergencia && nota.divergencia.observacoes)
      ).length
      
      console.log('🔍 Debug antes de criar relatório:')
      console.log('🔍 sessionData:', sessionData)
      console.log('🔍 sessionData.colaboradores:', sessionData.colaboradores)
      console.log('🔍 notas:', notas)
      console.log('🔍 totalDivergencias calculado:', totalDivergencias)
      
      // Determinar status baseado no progresso
      const statusRelatorio = progressoTransportadora.percentual === 100 ? "liberado" : "liberado_parcialmente"
      
      console.log('🔍 Status do relatório determinado:', statusRelatorio)
      console.log('🔍 Progresso da transportadora:', progressoTransportadora.percentual)
      
      const relatorio: Relatorio = {
        nome: transportadoraSelecionada, // Usar a transportadora selecionada
        colaboradores: sessionData.colaboradores,
        data: sessionData.data,
        turno: sessionData.turno,
        area: "recebimento",
        quantidadeNotas: notas.length,
        somaVolumes: somaVolumes,
        totalDivergencias: totalDivergencias,
        notas: notas,
        dataFinalizacao: new Date().toISOString(),
        status: statusRelatorio,
      }
      
      console.log('🔍 Relatório criado:', relatorio)
      console.log('🔍 Relatório.colaboradores:', relatorio.colaboradores)
      console.log('🔍 Relatório.notas:', relatorio.notas)
      console.log('🔍 Relatório.status:', relatorio.status)

      await saveRelatorio(relatorio)
      console.log('✅ Relatório processado (db/local)')
      
      // Disparar evento em tempo real
      addRealtimeEvent({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        sector: 'recebimento',
        type: 'relatorio_finalized',
        message: `Relatório ${statusRelatorio === "liberado" ? "Liberado" : "Liberado Parcialmente"} para ${transportadoraSelecionada}`,
        data: { transportadora: transportadoraSelecionada, quantidadeNotas: notas.length, somaVolumes, status: statusRelatorio }
      });

      const mensagemSucesso = statusRelatorio === "liberado" 
        ? `Relatório "${transportadoraSelecionada}" Liberado com sucesso!`
        : `Relatório "${transportadoraSelecionada}" Liberado Parcialmente (${progressoTransportadora.percentual}% concluído)!`
      
      // Desativar loading de processamento
      setFinalizando(false);
      
      // Limpar dados imediatamente
      await clearNotas(chaveNotas)
      setTransportadoraSelecionada("")
      setProgressoTransportadora({ bipadas: 0, total: 0, percentual: 0 })
      setSessaoIniciada(false)
      setBipagemIniciada(false)
      
      // Mostrar alerta de sucesso
      alert(mensagemSucesso)
      
    } catch (error) {
      console.error('❌ Erro ao salvar relatório:', error)
      alert('Erro ao salvar relatório. Tente novamente.')
      setFinalizando(false)
    }
  }

  const calcularProgressoTransportadora = async (transportadora: string) => {
    try {
      // Usar o cache da transportadora em vez de buscar no banco
      const totalNotas = notasTransportadoraCache.length
      
      // Contar todas as notas bipadas (elas já foram validadas como pertencentes à transportadora)
      const notasBipadas = notas.length

      const percentual = totalNotas > 0 ? Math.round((notasBipadas / totalNotas) * 100) : 0

      console.log(`📊 Progresso inicial para ${transportadora}: ${notasBipadas}/${totalNotas} (${percentual}%)`)
      console.log(`📋 Notas bipadas:`, notas.map(n => n.numeroNF))

      setProgressoTransportadora({
        bipadas: notasBipadas,
        total: totalNotas,
        percentual
      })
    } catch (error) {
      console.error('❌ Erro ao calcular progresso:', error)
    }
  }

  const confirmarSelecaoTransportadora = async (transportadora: string) => {
    setTransportadoraSelecionada(transportadora)
    setModalSelecaoTransportadora(false)
    setSessaoIniciada(true)
    setBipagemIniciada(false) // Resetar estado de bipagem
    
    // Carregar notas da transportadora no cache
    await carregarNotasTransportadora(transportadora)
    
    // Calcular progresso inicial da transportadora
    await calcularProgressoTransportadora(transportadora)
    
    console.log(`✅ Transportadora selecionada: ${transportadora}`)
  }


  const iniciarBipagem = () => {
    setBipagemIniciada(true)
    console.log(`🚀 Bipagem iniciada para transportadora: ${transportadoraSelecionada}`)
  }


  const handleLogout = () => {
    // Limpar localStorage
    localStorage.clear();
    
    // Limpar sessionStorage
    sessionStorage.clear();
    
    // Limpar cookies
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
    
    // Limpar cache do navegador (se suportado)
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }
    
    // Usar o serviço de logout local
    LocalAuthService.logout();
    
    // Redirecionar para a página inicial
    router.push("/");
  }

  // Função para limpar a flag de scanner para bipar
  const limparScannerParaBipar = () => {
    setScannerParaBipar(false)
  }

  const limparProblemasSalvamento = () => {
    setProblemasSalvamento([])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // Se for bipagem manual (não via scanner), limpar a flag
      if (!scannerAtivo) {
        console.log('📝 Bipagem manual via Enter detectada - limpando flag scannerParaBipar')
        setScannerParaBipar(false)
      }
      handleBipagem()
    }
  }

  const debugRecebimento = async () => {
    try {
      console.log('🐛 Debug do setor de recebimento...')
      console.log('📊 Status da sessão:', sessionData)
      console.log('📊 Notas atuais:', notas)
      console.log('📊 Chave de notas:', chaveNotas)
      
      // Testar busca direta de relatórios
      console.log('🔍 Testando busca direta de relatórios...')
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      const { data: relatoriosRecebimento, error: erroRelatorios } = await supabase
        .from('relatorios')
        .select('*')
        .eq('area', 'recebimento')
        .order('created_at', { ascending: false })
      
      if (erroRelatorios) {
        console.log('❌ Erro ao buscar relatórios:', erroRelatorios)
      } else {
        console.log('📊 Relatórios de recebimento encontrados:', relatoriosRecebimento?.length || 0)
        if (relatoriosRecebimento && relatoriosRecebimento.length > 0) {
          console.log('🔍 Primeiro relatório:', relatoriosRecebimento[0])
        }
      }
      
      // Testar busca de notas bipadas
      console.log('🔍 Testando busca de notas bipadas...')
      const { data: notasBipadas, error: erroNotas } = await supabase
        .from('notas_bipadas')
        .select('*')
        .eq('area_origem', 'recebimento')
        .limit(5)
      
      if (erroNotas) {
        console.log('❌ Erro ao buscar notas bipadas:', erroNotas)
      } else {
        console.log('📊 Notas bipadas encontradas:', notasBipadas?.length || 0)
        if (notasBipadas && notasBipadas.length > 0) {
          console.log('🔍 Primeira nota bipada:', notasBipadas[0])
        }
      }
      
    } catch (error) {
      console.error('❌ Erro no debug:', error)
    }
  }

  if (!sessionData) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-32 h-32 sm:w-48 sm:h-48 mx-auto mb-6">
            {/* Logo SVG responsivo */}
            <svg 
              width="100%" 
              height="100%" 
              viewBox="0 0 512 512" 
              xmlns="http://www.w3.org/2000/svg" 
              role="img" 
              className="w-full h-full animate-pulse drop-shadow-lg"
            >
              <circle cx="256" cy="256" r="216" fill="#48C142"/>
              <rect x="196" y="140" width="20" height="232" rx="8" fill="#FFFFFF"/>
              <rect x="236" y="120" width="24" height="272" rx="8" fill="#FFFFFF"/>
              <rect x="280" y="140" width="20" height="232" rx="8" fill="#FFFFFF"/>
              <rect x="316" y="160" width="16" height="192" rx="8" fill="#FFFFFF"/>
            </svg>
          </div>
          
          {/* Loading text responsivo */}
          <div className="text-gray-800 text-lg sm:text-2xl font-semibold mb-4">
            Carregando sessão...
          </div>
          
          {/* Loading dots */}
          <div className="text-gray-800 text-lg sm:text-2xl h-6 sm:h-8">
            <span className="animate-bounce">.</span>
            <span className="animate-bounce" style={{animationDelay: '0.1s'}}>.</span>
            <span className="animate-bounce" style={{animationDelay: '0.2s'}}>.</span>
          </div>
        </div>
      </div>
    )
  }
  // Renderização condicional baseada na tela ativa
  if (telaAtiva === "dar-entrada") {
    return (
      <DarEntrada
        usuario={{ nome: Array.isArray(sessionData.colaboradores) ? sessionData.colaboradores.join(', ') : sessionData.colaboradores, loginTime: sessionData.loginTime }}
        onVoltar={() => setTelaAtiva("bipagem")}
        onVerConsolidado={() => setTelaAtiva("ver-consolidado")}
        onLogout={handleLogout}
      />
    )
  }

  if (telaAtiva === "ver-consolidado") {
    return (
      <VerConsolidado
        usuario={{ nome: Array.isArray(sessionData.colaboradores) ? sessionData.colaboradores.join(', ') : sessionData.colaboradores, loginTime: sessionData.loginTime }}
        onVoltar={() => setTelaAtiva("dar-entrada")}
        onLogout={handleLogout}
      />
    )
  }
  return (
    <>
      {finalizando && (
        isColetor ? (
          <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
            <div className="text-center">
              {/* Logo responsivo para coletor */}
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4">
                <svg 
                  width="100%" 
                  height="100%" 
                  viewBox="0 0 512 512" 
                  xmlns="http://www.w3.org/2000/svg" 
                  role="img" 
                  className="w-full h-full animate-pulse drop-shadow-lg"
                >
                  <circle cx="256" cy="256" r="216" fill="#48C142"/>
                  <rect x="196" y="140" width="20" height="232" rx="8" fill="#FFFFFF"/>
                  <rect x="236" y="120" width="24" height="272" rx="8" fill="#FFFFFF"/>
                  <rect x="280" y="140" width="20" height="232" rx="8" fill="#FFFFFF"/>
                  <rect x="316" y="160" width="16" height="192" rx="8" fill="#FFFFFF"/>
                </svg>
              </div>
              
              {/* Texto responsivo */}
              <div className="text-gray-800 text-lg sm:text-xl font-semibold mb-3">
                Processando relatório...
              </div>
              
              {/* Loading dots responsivos */}
              <div className="text-gray-800 text-lg sm:text-xl h-6 sm:h-8">
                <span className="animate-blink">.</span>
                <span className="animate-blink-delay-1">.</span>
                <span className="animate-blink-delay-2">.</span>
              </div>
            </div>
          </div>
        ) : (
          <Loader text="Processando relatório..." duration={0} />
        )
      )}
      <div className="min-h-screen bg-blue-50 dark:bg-gray-950">
      {/* Renderização condicional: Desktop vs Coletor */}
      {!isColetor ? (
        <>
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-blue-100 dark:bg-gray-900 dark:border-blue-900/20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-0 sm:h-16 gap-2 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Package className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-600" />
              <div>
                <h1 className="text-sm sm:text-base lg:text-xl font-bold text-gray-900 dark:text-gray-200">Recebimento</h1>
                <p className="text-xs sm:text-sm text-gray-500 sm:block dark:text-gray-300">Sistema de Recebimento de Notas Fiscais</p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
             
              
              {/* Dropdown do usuário com seletor de tema */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <div className="hidden sm:block text-left">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {Array.isArray(sessionData.colaboradores) ? sessionData.colaboradores.join(', ') : sessionData.colaboradores}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Recebimento
                        </div>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-gray-900 dark:text-white">
                        {Array.isArray(sessionData.colaboradores) ? sessionData.colaboradores.join(', ') : sessionData.colaboradores}
                      </p>
                      <p className="text-xs leading-none text-gray-500 dark:text-gray-400">
                        Setor: Recebimento
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />

                  {/* Opções de Tema */}
                  <DropdownMenuLabel className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Aparência
                  </DropdownMenuLabel>

                  <DropdownMenuItem
                    onClick={() => setTheme('light')}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Sun className="h-4 w-4" />
                    <span>Modo Claro</span>
                    {theme === 'light' && <span className="ml-auto text-blue-600">✓</span>}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setTheme('dark')}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Moon className="h-4 w-4" />
                    <span>Modo Escuro</span>
                    {theme === 'dark' && <span className="ml-auto text-blue-600">✓</span>}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setTheme('system')}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Monitor className="h-4 w-4" />
                    <span>Sistema</span>
                    {theme === 'system' && <span className="ml-auto text-blue-600">✓</span>}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center space-x-2 cursor-pointer text-red-600 focus:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alertas de Problemas de Salvamento */}
        {problemasSalvamento.length > 0 && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-500/50 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Problemas de Salvamento na Tabela Centralizada
                </h3>
              </div>
              <div className="text-xs text-red-700 dark:text-red-400 space-y-1">
                {problemasSalvamento.map((problema, index) => (
                  <div key={index}>• {problema}</div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs text-red-600 dark:text-red-400">
                  ⚠️ As notas foram processadas localmente, mas não foram salvas na tabela centralizada. 
                  Entre em contato com o administrador do sistema.
                </div>
                <Button
                  onClick={limparProblemasSalvamento}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50 dark:border-red-600 dark:hover:bg-red-900/20"
                >
                  Limpar Alertas
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Indicadores de Status */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          {/* Status da Sessão */}
          {!sessaoIniciada ? (
            <Card className="border-red-200 bg-red-50 dark:bg-gray-900 dark:border-red-500/50">
              <CardContent className="text-center p-4">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
                  ⚠️
                </div>
                <div className="text-xs text-gray-600 leading-tight dark:text-gray-400">
                  Sessão não iniciada
                </div>
                <div className="text-xs text-red-600 font-medium">
                  Selecione transportadora
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Progresso da Transportadora */
            <Card className="border-purple-200 dark:bg-gray-900 dark:border-purple-500/50">
              <CardContent className="text-center p-4">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">
                  {progressoTransportadora.bipadas}/{progressoTransportadora.total}
                </div>
                <div className="text-xs text-gray-600 leading-tight dark:text-gray-400">
                  {transportadoraSelecionada}
                </div>
                <div className="text-xs text-purple-600 font-medium">
                  {progressoTransportadora.percentual}% Concluído
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Total de Notas */}
          <Card className="border-blue-200 dark:bg-gray-900 dark:border-blue-500/50">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{notas.length}</div>
              <div className="text-xs text-gray-600 leading-tight dark:text-gray-400">Total de Notas</div>
            </CardContent>
          </Card>
          
          {/* Notas OK */}
          <Card className="border-green-200 dark:bg-gray-900 dark:border-green-500/50">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{notas.filter((n) => n.status === "ok").length}</div>
              <div className="text-xs text-gray-600 leading-tight dark:text-gray-400">Notas OK</div>
            </CardContent>
          </Card>
          
          {/* Com Divergência */}
          <Card className="border-orange-200 dark:bg-gray-900 dark:border-orange-500/50">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
                {notas.filter((n) => n.status === "divergencia").length}
              </div>
              <div className="text-xs text-gray-600 leading-tight dark:text-gray-400">Com Divergência</div>
            </CardContent>
          </Card>
        {/* Total de Volumes */}
        <Card className="border-blue-200 dark:bg-gray-900 dark:border-blue-500/50">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{notas.reduce((sum, nota) => sum + (nota.divergencia?.volumesInformados || nota.volumes), 0)}</div>
              <div className="text-xs text-gray-600 leading-tight dark:text-gray-400">Total de Volumes</div>
            </CardContent>
          </Card>
        </div>

        {/* Mensagem quando sessão não iniciada */}
        {!sessaoIniciada && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-gray-900/20 dark:border-orange-500/50 mb-8">
            <CardContent className="text-center py-8">
              <div className="flex flex-col items-center space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-orange-800 dark:text-orange-300 mb-2">
                    Selecione uma Transportadora
                  </h3>
                  <p className="text-orange-600 dark:text-orange-400 mb-4">
                    Para começar a bipar notas, você precisa primeiro selecionar uma transportadora.
                  </p>
                  <Button
                    onClick={() => setModalSelecaoTransportadora(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    size="lg"
                  >
                    <Truck className="h-5 w-5 mr-2" />
                    Selecionar Transportadora
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progresso e Iniciar Bipagem quando transportadora selecionada mas bipagem não iniciada */}
        {sessaoIniciada && !bipagemIniciada && (
          <div className="space-y-4 mb-8">
            {/* Progresso da Transportadora */}
            <Card className="border-purple-200 dark:bg-gray-900/20 dark:border-purple-500/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center space-x-2 text-gray-900 dark:text-gray-200">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                    <span>Progresso - {transportadoraSelecionada}</span>
                  </CardTitle>
                  {!bipagemIniciada && (
                    <Button
                      onClick={() => setModalSelecaoTransportadora(true)}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:border-blue-600 dark:hover:bg-blue-900/20"
                      title="Trocar transportadora selecionada"
                    >
                      <Truck className="h-3 w-3 mr-1" />
                      Trocar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Notas Bipadas</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-200">
                      {progressoTransportadora.bipadas} de {progressoTransportadora.total}
                    </span>
                  </div>
                  <Progress value={progressoTransportadora.percentual} className="h-3" />
                  <div className="text-center">
                    <Badge 
                      variant={progressoTransportadora.percentual === 100 ? "default" : "secondary"}
                      className="text-sm"
                    >
                      {progressoTransportadora.percentual}% Concluído
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {notasTransportadoraCache.length > 0 ? (
                      `📋 ${notasTransportadoraCache.length} notas carregadas no cache`
                    ) : (
                      "🔄 Carregando notas..."
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Opção de liberação parcial */}
            {progressoTransportadora.percentual < 100 && (
              <Card className="border-orange-200 dark:bg-gray-900/20 dark:border-orange-500/50">
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                        Progresso incompleto ({progressoTransportadora.percentual}%)
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        Você pode liberar parcialmente ou aguardar completar todas as notas.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botão Iniciar Bipagem */}
            <Card className="border-green-200 bg-green-50 dark:bg-gray-900/20 dark:border-green-500/50">
              <CardContent className="text-center py-8">
                <div className="flex flex-col items-center space-y-4">
                  <div className="text-6xl">📱</div>
                  <div>
                    <h3 className="text-xl font-semibold text-green-800 dark:text-green-300 mb-2">
                      Pronto para Bipar
                    </h3>
                    <p className="text-green-600 dark:text-green-400 mb-4">
                      Clique abaixo para iniciar a bipagem das notas desta transportadora.
                    </p>
                    <Button
                      onClick={iniciarBipagem}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                    >
                      <Scan className="h-5 w-5 mr-2" />
                      Iniciar Bipagem
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Campo de bipagem - só aparece se bipagem iniciada */}
        {sessaoIniciada && bipagemIniciada && (
        <Card className="border-blue-200 dark:bg-gray-900/20 dark:border-blue-500/50 mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2 text-gray-900 dark:text-gray-200">
              <Scan className="h-5 w-5 text-blue-600" />
              <span>Bipar Código de Barras</span>
            </CardTitle>
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-500/50">
                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Transportadora: {transportadoraSelecionada}
                  </span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Apenas notas desta transportadora serão aceitas. Verifique se o fornecedor ou cliente destino corresponde à transportadora selecionada.
                </p>
              </div>
          </CardHeader>
          <CardContent>
            {scannerAtivo ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">Scanner de Código de Barras</h3>
                  <Button
                    variant="outline"
                    onClick={() => {
                      console.log('📷 Fechando scanner')
                      setScannerAtivo(false)
                      setScannerParaBipar(false)
                    }}
                    className="text-red-600 hover:text-red-700 dark:border-red-600 dark:hover:bg-red-900/20"
                  >
                    <CameraOff className="h-4 w-4 mr-2" />
                    Fechar Scanner
                  </Button>
                </div>
                <BarcodeScanner
                  onScan={handleCodigoEscaneado}
                  onError={(error) => {
                    console.error("Erro no scanner:", error)
                    alert("Erro ao acessar a câmera. Verifique as permissões.")
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Input
                      ref={inputRef}
                      placeholder="Digite ou escaneie o código (formato: data|nf|volumes|destino|fornecedor|cliente_destino|tipo_carga)"
                      value={codigoInput}
                      onChange={(e) => setCodigoInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="text-base h-12 font-mono dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                    />
                  </div>
                    <Button 
                      onClick={() => {
                    console.log('📷 Abrindo scanner para bipar')
                    setScannerAtivo(true)
                    setScannerParaBipar(true)
                      }} 
                      className="h-12 px-4 bg-blue-600 hover:bg-blue-700"
                    >
                    <Camera className="h-4 w-4 mr-2" />
                    Scanner
                  </Button>
                  <Button
                    onClick={handleBipagem}
                    disabled={!codigoInput.trim()}
                    className="h-12 px-6 bg-green-600 hover:bg-green-700"
                  >
                    Bipar
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Formato: 45868|000068310|0014|RJ08|EMS S/A|SAO JO|ROD</p>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Botão Finalizar */}
        <div className="mb-5 flex flex-col sm:flex-row space-x-0 sm:space-x-4">
          {!sessaoIniciada ? (
            <Button
              onClick={() => setModalSelecaoTransportadora(true)}
              className="mb-3 bg-purple-600 hover:bg-purple-800 text-white"
              size="sm"
            >
              <Truck className="h-4 w-4 mr-2" />
              Selecionar Transportadora
            </Button>
          ) : (
          <Button
            onClick={finalizarRelatorio}
            disabled={notas.length === 0 || finalizando}
            className={`mb-3 text-white ${
              progressoTransportadora.percentual === 100 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
            size="sm"
          >
            {finalizando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Finalizando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                {progressoTransportadora.percentual === 100 
                  ? `Liberar Relatório (${notas.length} notas)` 
                  : `Liberar Parcialmente (${notas.length} notas)`
                }
              </>
            )}
          </Button>
          )}

          <Button
            onClick={() => setModalRelatorios(true)}
            className="mb-3 bg-blue-100 hover:bg-blue-200 text-blue-600 dark:bg-blue-300 dark:text-blue-900 dark:hover:bg-blue-500 dark:hover:text-blue-200"
            size="sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver Relatórios
          </Button>

          
          {sessionData && (sessionData.colaboradores.includes("Elisangela") || sessionData.colaboradores.includes("Eduardarm") || sessionData.colaboradores.includes("Desenvolvedor") || sessionData.colaboradores.includes("Ana Carolina") || sessionData.colaboradores.includes("João Victor") || sessionData.colaboradores.includes("Alexsandro") || sessionData.colaboradores.includes("Manuelane") || sessionData.colaboradores.includes("Rafael Lobo") || sessionData.colaboradores.includes("Alessandro Pontes") || sessionData.colaboradores.includes("Rosania")) && (
            <Button
              onClick={() => setTelaAtiva("dar-entrada")}
              variant="outline"
              className="mb-3 bg-purple-100 hover:bg-purple-200 text-purple-600 dark:bg-purple-300 dark:text-purple-900 dark:hover:bg-purple-500 dark:hover:text-purple-200"
              size="sm"
            >
              <Package className="h-5 w-5 mr-2" />
              Consolidado
            </Button>
          )}
        </div>


        {/* Lista de notas - só aparece se bipagem iniciada */}
        {sessaoIniciada && bipagemIniciada && (
        <Card className="border-blue-200 dark:bg-gray-900/20 dark:border-blue-500/50">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-gray-200">Notas Bipadas</CardTitle>
          </CardHeader>
          <CardContent>
            {notas.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Nenhuma nota bipada ainda. Use o campo acima para começar.
              </div>
            ) : (
              <div className="space-y-3">
                {notas.map((nota) => (
                  <NotaItemComLongPress
                    key={nota.id}
                    nota={nota}
                    onLongPress={() => handleLongPressNota(nota)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </main>
        </>
      ) : (
        <ColetorView
          codigoInput={codigoInput}
          setCodigoInput={setCodigoInput}
          scannerAtivo={scannerAtivo}
          setScannerAtivo={setScannerAtivo}
          scannerParaBipar={scannerParaBipar}
          setScannerParaBipar={setScannerParaBipar}
          handleBipagem={handleBipagem}
          handleKeyPress={handleKeyPress}
          handleCodigoEscaneado={handleCodigoEscaneado}
          notas={notas}
          finalizarRelatorio={finalizarRelatorio}
          setModalRelatorios={setModalRelatorios}
          inputRef={inputRef}
          sessionData={sessionData}
          clearNotas={clearNotas}
          handleLogout={handleLogout}
          transportadoraSelecionada={transportadoraSelecionada}
          progressoTransportadora={progressoTransportadora}
          bipagemIniciada={bipagemIniciada}
          setModalSelecaoTransportadora={setModalSelecaoTransportadora}
          sessaoIniciada={sessaoIniciada}
          iniciarBipagem={iniciarBipagem}
          finalizando={finalizando}
          setModalConsultarNfsFaltantes={setModalConsultarNfsFaltantes}
          onAlterarStatusNota={handleLongPressNota}
        />
      )}

      {/* Modais */}
      {notaAtual && (
        <>
          <ConfirmacaoModal
            isOpen={modalConfirmacao}
            nota={notaAtual}
            onConfirmar={confirmarNota}
            onAlterar={abrirDivergencia}
            onClose={() => {
              setModalConfirmacao(false)
              setNotaAtual(null)
              
              // Reativar a câmera automaticamente apenas se foi aberta para bipar via scanner
              if (scannerParaBipar) {
                setTimeout(() => {
                  setScannerAtivo(true)
                  console.log('📷 Câmera reativada automaticamente após fechamento do modal de confirmação (scanner para bipar)')
                }, 300)
              }
            }}
          />
          <DivergenciaModal
            isOpen={modalDivergencia}
            nota={notaAtual}
            tiposDivergencia={TIPOS_DIVERGENCIA}
            onConfirmar={confirmarDivergencia}
            onClose={() => {
              setModalDivergencia(false)
              setNotaAtual(null)
              
              // Reativar a câmera automaticamente apenas se foi aberta para bipar via scanner
              if (scannerParaBipar) {
                setTimeout(() => {
                  setScannerAtivo(true)
                  console.log('📷 Câmera reativada automaticamente após fechamento do modal de divergência (scanner para bipar)')
                }, 300)
              }
            }}
          />
        </>
      )}


      {/* Modal de Seleção de Transportadora */}
      <SelecaoTransportadoraModal
        isOpen={modalSelecaoTransportadora}
        onClose={() => {
          setModalSelecaoTransportadora(false)
        }}
        onConfirmar={confirmarSelecaoTransportadora}
        notasBipadas={notas}
        sessionData={sessionData}
        podeFechar={true}
      />

      {/* Modal de Relatórios */}
      <RelatoriosModal isOpen={modalRelatorios} onClose={() => setModalRelatorios(false)} />

      {/* Modal de Consultar NFs Faltantes */}
      <ConsultarNfsFaltantesModal
        isOpen={modalConsultarNfsFaltantes}
        onClose={() => setModalConsultarNfsFaltantes(false)}
        transportadoraSelecionada={transportadoraSelecionada}
      />

      {/* Modal de Senha para Alterar Status */}
      <Dialog open={modalSenha} onOpenChange={fecharModalSenha}>
        <DialogContent 
          className={cn(
            "overflow-y-auto dark:bg-gray-950",
            isColetor 
              ? '!w-screen !h-screen !max-w-none !max-h-none !m-0 !rounded-none !p-6 flex flex-col !left-0 !right-0 !top-0 !bottom-0 !translate-x-0 !translate-y-0' 
              : 'max-w-md'
          )}
        >
          <DialogHeader className={cn(isColetor && "mb-6 flex-shrink-0")}>
            <DialogTitle className={cn("flex items-center space-x-2", isColetor && "text-xl")}>
              <AlertTriangle className={cn("text-orange-600", isColetor ? "h-6 w-6" : "h-5 w-5")} />
              <span>Senha de Segurança</span>
            </DialogTitle>
            <DialogDescription className={cn(isColetor && "text-base mt-2")}>
              Digite a senha para alterar o status da nota fiscal.
            </DialogDescription>
          </DialogHeader>

          <div className={cn("space-y-5", isColetor && "flex-1 flex flex-col")}>
            <div className="space-y-3">
              <label htmlFor="senha" className={cn("block font-semibold text-gray-900 dark:text-gray-100", isColetor && "text-base")}>
                Senha
              </label>
              <Input
                id="senha"
                type="password"
                value={senhaInput}
                onChange={(e) => {
                  setSenhaInput(e.target.value)
                  setSenhaErrada(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    validarSenha()
                  }
                }}
                className={cn(
                  "font-mono",
                  isColetor && "h-14 text-lg"
                )}
                placeholder="Digite a senha"
                autoFocus
              />
              {senhaErrada && (
                <p className={cn("text-red-600 dark:text-red-400", isColetor ? "text-base" : "text-sm")}>
                  Senha incorreta. Tente novamente.
                </p>
              )}
            </div>

            <div className={cn(
              "flex gap-4 flex-shrink-0",
              isColetor ? "flex-col mt-2" : "space-x-4"
            )}>
              <Button
                onClick={validarSenha}
                className={cn(
                  "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all",
                  isColetor ? "w-full h-16 text-lg font-bold" : "flex-1"
                )}
                size={isColetor ? "lg" : "lg"}
                disabled={!senhaInput.trim()}
              >
                <CheckCircle className={cn("mr-2", isColetor ? "h-6 w-6" : "h-4 w-4")} />
                Confirmar
              </Button>
              <Button
                onClick={fecharModalSenha}
                variant="outline"
                className={cn(
                  isColetor ? "w-full h-16 text-lg font-semibold" : "flex-1"
                )}
                size={isColetor ? "lg" : "lg"}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Alterar Status */}
      {notaParaAlterarStatus && (
        <AlterarStatusModal
          isOpen={modalAlterarStatus}
          nota={notaParaAlterarStatus}
          onAlterarParaDivergencia={handleAlterarParaDivergencia}
          onAlterarParaOk={handleAlterarParaOk}
          onClose={() => {
            setModalAlterarStatus(false)
            setNotaParaAlterarStatus(null)
          }}
        />
      )}
      </div>
    </>
  )
}
