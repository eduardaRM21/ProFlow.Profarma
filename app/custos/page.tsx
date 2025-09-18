"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  LogOut,
  FileText,
  User,
  Calendar,
  Package,
  Eye,
  Copy,
  CheckCircle,
  AlertTriangle,
  Search,
  ArrowUpDown,
  Filter,
  Download,
  FileSpreadsheet,
  Database,
  RefreshCw,
  KeyRound,
} from "lucide-react";
import { useSession, useRelatorios, useConnectivity, useDatabase } from "@/hooks/use-database";
import { useRealtimeMonitoring } from "@/hooks/use-realtime-monitoring";
import { ConnectionStatus } from "@/components/connection-status";
import type { SessionData, NotaFiscal, Relatorio } from "@/lib/database-service";
import { getSupabase, testSupabaseConnection } from "@/lib/supabase-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ChangePasswordModal from "@/components/admin/change-password-modal";

const copiarDadosParaSAP = (dados: string, tipo: string) => {
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(dados)
      .then(() => {
        alert(
          `${tipo} copiado para a área de transferência!\n\nPronto para colar no SAP.`
        );
      })
      .catch(() => {
        // Fallback
        const textArea = document.createElement("textarea");
        textArea.value = dados;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert(
          `${tipo} copiado para a área de transferência!\n\nPronto para colar no SAP.`
        );
      });
  } else {
    // Fallback para navegadores antigos
    const textArea = document.createElement("textarea");
    textArea.value = dados;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    alert(
      `${tipo} copiado para a área de transferência!\n\nPronto para colar no SAP.`
    );
  }
};

export default function CustosPage() {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [fonteDados, setFonteDados] = useState<'banco' | 'localStorage' | 'nenhuma'>('nenhuma');
  const router = useRouter();

  // Hooks do banco de dados
  const { getSession } = useSession();
  const { isFullyConnected } = useConnectivity();
  const { getRelatorios, saveRelatorio, updateRelatorioStatus } = useRelatorios();
  const { addRealtimeEvent } = useRealtimeMonitoring();
  const { isMigrating, migrationComplete } = useDatabase();

  // Estados para filtros e ordenação
  const [modalRelatorios, setModalRelatorios] = useState(false)
  const [filtroTexto, setFiltroTexto] = useState("")
  const [filtroNF, setFiltroNF] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("todos")
  const [filtroColaborador, setFiltroColaborador] = useState("todos")
  const [filtroDataInicio, setFiltroDataInicio] = useState("")
  const [filtroDataFim, setFiltroDataFim] = useState("")
  const [ordenacao, setOrdenacao] = useState("data_desc");
  const [notasFiltradas, setNotasFiltradas] = useState<NotaFiscal[]>([]);
  const [relatorioSelecionado, setRelatorioSelecionado] =
    useState<Relatorio | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    const verificarSessao = async () => {
      try {
        console.log('🔍 Verificando sessão para área custos...')
        console.log('🌐 Status da conectividade:', { isFullyConnected })

        const session = await getSession("current")
        console.log('📊 Sessão retornada:', session)

        if (!session) {
          console.log('⚠️ Nenhuma sessão encontrada, redirecionando...')
          router.push("/")
          return
        }

        if (session.area !== "custos") {
          console.log('❌ Sessão não é de custos:', session.area, 'redirecionando...')
          router.push("/")
          return
        }

        console.log('✅ Sessão válida encontrada para custos:', session)
        setSessionData(session)
        await carregarRelatorios()

        // Polling para atualizações
        const interval = setInterval(carregarRelatorios, 60000)
        return () => clearInterval(interval)
      } catch (error) {
        console.error("❌ Erro ao verificar sessão:", error)
        console.log('⚠️ Usando fallback para localStorage...')

        // Fallback para localStorage
        try {
          const sessionLocal = localStorage.getItem("sistema_session")
          if (sessionLocal) {
            const sessionObj = JSON.parse(sessionLocal)
            console.log('📋 Sessão local encontrada:', sessionObj)

            if (sessionObj.area === "custos") {
              console.log('✅ Usando sessão local de custos')
              setSessionData(sessionObj)
              await carregarRelatorios()
            } else {
              console.log('❌ Sessão local não é de custos, redirecionando...')
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

  // Função específica para diagnosticar e corrigir problema dos colaboradores
  const diagnosticarColaboradores = async (supabase: any, relatorioId: string) => {
    console.log(`🔍 DIAGNÓSTICO: Verificando colaboradores para relatório ${relatorioId}`)

    try {
      // 1. Verificar se a tabela relatorio_colaboradores existe
      const { data: tabelaExiste, error: erroTabela } = await supabase
        .from('relatorio_colaboradores')
        .select('id')
        .limit(1)

      if (erroTabela) {
        console.log(`❌ Tabela relatorio_colaboradores não existe ou erro:`, erroTabela)
        return []
      }

      // 2. Verificar se há registros para este relatório
      const { data: registrosExistentes, error: erroRegistros } = await supabase
        .from('relatorio_colaboradores')
        .select('*')
        .eq('relatorio_id', relatorioId)

      console.log(`🔍 Registros encontrados para relatório ${relatorioId}:`, {
        count: registrosExistentes?.length || 0,
        data: registrosExistentes,
        error: erroRegistros
      })

      if (erroRegistros || !registrosExistentes || registrosExistentes.length === 0) {
        console.log(`⚠️ Nenhum registro encontrado em relatorio_colaboradores para relatório ${relatorioId}`)
        return []
      }

      // 3. Buscar nomes dos usuários
      const userIds = registrosExistentes.map((rc: any) => rc.user_id)
      console.log(`🔍 User IDs encontrados:`, userIds)

      const { data: usuarios, error: erroUsuarios } = await supabase
        .from('users')
        .select('id, nome')
        .in('id', userIds)

      if (erroUsuarios) {
        console.log(`❌ Erro ao buscar usuários:`, erroUsuarios)
        return []
      }

      console.log(`🔍 Usuários encontrados:`, usuarios)

      // 4. Mapear nomes dos colaboradores
      const colaboradores = registrosExistentes.map((rc: any) => {
        const usuario = usuarios?.find((u: any) => u.id === rc.user_id)
        return usuario?.nome || `Usuário ${rc.user_id} sem nome`
      })

      console.log(`✅ Colaboradores mapeados para relatório ${relatorioId}:`, colaboradores)
      return colaboradores

    } catch (error) {
      console.error(`❌ Erro no diagnóstico de colaboradores para relatório ${relatorioId}:`, error)
      return []
    }
  }

  const carregarRelatorios = async () => {
    try {
      console.log("🔄 Iniciando carregamento otimizado de relatórios...")

      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()

      // ABORDAGEM DIRETA: Buscar relatórios primeiro
      console.log("🔍 Buscando relatórios básicos...")
      const { data: relatoriosBasicos, error: erroRelatorios } = await supabase
        .from('relatorios')
        .select('*')
        .order('created_at', { ascending: false })

      if (erroRelatorios) {
        console.log("❌ Erro ao buscar relatórios:", erroRelatorios)
        await carregarRelatoriosFallback(supabase)
        return
      }

      if (!relatoriosBasicos || relatoriosBasicos.length === 0) {
        console.log("⚠️ Nenhum relatório encontrado")
        setRelatorios([])
        setFonteDados('banco')
        return
      }

      console.log(`✅ ${relatoriosBasicos.length} relatórios encontrados`)
      console.log("🔍 Primeiros relatórios:", relatoriosBasicos.slice(0, 3))

      // PROCESSAR CADA RELATÓRIO INDIVIDUALMENTE
      const relatoriosCompletos = await Promise.all(
        relatoriosBasicos.map(async (relatorio: any) => {
          console.log(`🔍 Processando relatório: ${relatorio.id} - ${relatorio.nome}`)

          try {
            // 1. Buscar colaboradores usando função de diagnóstico
            console.log(`🔍 Buscando colaboradores para relatório ${relatorio.id}...`)
            const colaboradores = await diagnosticarColaboradores(supabase, relatorio.id)

            console.log(`✅ Colaboradores para relatório ${relatorio.id}:`, colaboradores)

            // 2. Buscar notas deste relatório
            const { data: relatorioNotasData, error: relatorioNotasError } = await supabase
              .from('relatorio_notas')
              .select('nota_fiscal_id')
              .eq('relatorio_id', relatorio.id)

            let notas: any[] = []
            if (!relatorioNotasError && relatorioNotasData && relatorioNotasData.length > 0) {
              console.log(`🔍 Relatório ${relatorio.id} tem ${relatorioNotasData.length} notas relacionadas`)

              // 3. Buscar detalhes das notas fiscais
              const notaIds = relatorioNotasData.map((rn: any) => rn.nota_fiscal_id)
              const { data: notasData, error: notasError } = await supabase
                .from('notas_fiscais')
                .select('*')
                .in('id', notaIds)

              if (!notasError && notasData) {
                console.log(`✅ ${notasData.length} notas fiscais carregadas para relatório ${relatorio.id}`)

                // 4. Para cada nota, buscar divergências
                const notasComDivergencias = await Promise.all(
                  notasData.map(async (nota: any) => {
                    console.log(`🔍 Buscando divergências para nota ${nota.id}`)

                    const { data: divergenciaData, error: divergenciaError } = await supabase
                      .from('divergencias')
                      .select('*')
                      .eq('nota_fiscal_id', nota.id)
                      .single()

                    let divergencia = null
                    if (!divergenciaError && divergenciaData) {
                      divergencia = {
                        volumesInformados: divergenciaData.volumes_informados,
                        observacoes: divergenciaData.observacoes
                      }
                      console.log(`✅ Divergência encontrada para nota ${nota.id}:`, divergencia)
                    } else {
                      console.log(`ℹ️ Nenhuma divergência para nota ${nota.id}`)
                    }

                    return {
                      id: nota.id,
                      numeroNF: nota.numero_nf || nota.codigo_completo,
                      volumes: nota.volumes || 0,
                      destino: nota.destino || 'Não informado',
                      fornecedor: nota.fornecedor || 'Não informado',
                      clienteDestino: nota.cliente_destino || 'Não informado',
                      status: nota.status === 'devolvida' ? 'devolvida' : (divergencia ? 'divergencia' : 'ok'),
                      divergencia: divergencia
                    }
                  })
                )

                notas = notasComDivergencias
                console.log(`✅ ${notas.length} notas processadas com divergências para relatório ${relatorio.id}`)
              } else {
                console.log(`⚠️ Erro ao buscar notas fiscais para relatório ${relatorio.id}:`, notasError)
              }
            } else {
              console.log(`⚠️ Relatório ${relatorio.id} não tem notas relacionadas ou erro:`, relatorioNotasError)
            }

            const relatorioCompleto = {
              id: relatorio.id,
              nome: relatorio.nome || 'Relatório sem nome',
              colaboradores: colaboradores,
              data: relatorio.data,
              turno: relatorio.turno || 'Não informado',
              area: relatorio.area || 'custos',
              quantidadeNotas: relatorio.quantidade_notas || 0,
              somaVolumes: relatorio.soma_volumes || 0,
              notas: notas,
              dataFinalizacao: relatorio.data_finalizacao || new Date().toISOString(),
              status: relatorio.status || 'liberado',
            }

            console.log(`✅ Relatório ${relatorio.id} processado com sucesso:`, {
              nome: relatorioCompleto.nome,
              colaboradores: relatorioCompleto.colaboradores,
              quantidadeColaboradores: relatorioCompleto.colaboradores.length,
              notas: relatorioCompleto.notas.length
            })

            return relatorioCompleto

          } catch (error) {
            console.error(`❌ Erro ao processar relatório ${relatorio.id}:`, error)
            return {
              id: relatorio.id,
              nome: relatorio.nome || 'Relatório sem nome',
              colaboradores: [],
              data: relatorio.data,
              turno: relatorio.turno || 'Não informado',
              area: relatorio.area || 'custos',
              quantidadeNotas: relatorio.quantidade_notas || 0,
              somaVolumes: relatorio.soma_volumes || 0,
              notas: [],
              dataFinalizacao: relatorio.data_finalizacao || new Date().toISOString(),
              status: relatorio.status || 'liberado',
            }
          }
        })
      )

      console.log("✅ Todos os relatórios processados:", relatoriosCompletos.length)
      console.log("🔍 Primeiro relatório completo:", relatoriosCompletos[0])

      // Preservar mudanças locais recentes (últimos 5 minutos)
      const agora = Date.now()
      const cincoMinutosAtras = agora - (5 * 60 * 1000)

      const relatoriosComMudancasLocais = relatoriosCompletos.map(relatorioBanco => {
        const relatorioLocal = relatorios.find(r => r.id === relatorioBanco.id)

        // Se existe relatório local com atualização recente, preservar o status local
        if (relatorioLocal &&
          relatorioLocal.ultimaAtualizacaoLocal &&
          relatorioLocal.ultimaAtualizacaoLocal > cincoMinutosAtras) {
          console.log(`🔄 Preservando mudança local para relatório ${relatorioBanco.id}: ${relatorioLocal.status}`)
          return {
            ...relatorioBanco,
            status: relatorioLocal.status
          }
        }

        return relatorioBanco
      })

      // Verificar se há colaboradores nos relatórios
      const relatoriosComColaboradores = relatoriosComMudancasLocais.filter((r: any) => r.colaboradores && r.colaboradores.length > 0)
      const relatoriosSemColaboradores = relatoriosComMudancasLocais.filter((r: any) => !r.colaboradores || r.colaboradores.length === 0)

      console.log("📊 Estatísticas dos relatórios:")
      console.log(`   - Total: ${relatoriosComMudancasLocais.length}`)
      console.log(`   - Com colaboradores: ${relatoriosComColaboradores.length}`)
      console.log(`   - Sem colaboradores: ${relatoriosSemColaboradores.length}`)

      if (relatoriosSemColaboradores.length > 0) {
        console.log("⚠️ Relatórios sem colaboradores:", relatoriosSemColaboradores.map((r: any) => ({ id: r.id, nome: r.nome })))
      }

      setRelatorios(relatoriosComMudancasLocais)
      setFonteDados('banco')

    } catch (error) {
      console.error("❌ Erro geral no carregamento:", error)
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      await carregarRelatoriosFallback(supabase)
    }
  }

  // FALLBACK: Método tradicional otimizado
  const carregarRelatoriosFallback = async (supabase: any) => {
    console.log("🔄 Executando fallback otimizado...")

    // 1. Buscar relatórios
    const { data: relatoriosData, error: relatoriosError } = await supabase
      .from('relatorios')
      .select('*')
      .order('created_at', { ascending: false })

    if (relatoriosError || !relatoriosData) {
      console.log("❌ Erro ao buscar relatórios no fallback")
      setRelatorios([])
      setFonteDados('nenhuma')
      return
    }

    console.log(`📊 ${relatoriosData.length} relatórios encontrados no fallback`)

    // 2. CONSULTA EM LOTE: Buscar TODOS os colaboradores de uma vez
    const { data: todosColaboradores, error: colaboradoresError } = await supabase
      .from('relatorio_colaboradores')
      .select(`
        relatorio_id,
        user_id,
        users!inner(nome)
      `)
      .in('relatorio_id', relatoriosData.map((r: any) => r.id))

    if (colaboradoresError) {
      console.log("⚠️ Erro ao buscar colaboradores:", colaboradoresError)
    } else {
      console.log(`📊 ${todosColaboradores?.length || 0} colaboradores encontrados`)
    }

    // 3. CONSULTA EM LOTE: Buscar TODAS as notas de uma vez
    const { data: todasNotas, error: notasError } = await supabase
      .from('relatorio_notas')
      .select(`
        relatorio_id,
        nota_fiscal_id,
        notas_fiscais!inner(*)
      `)
      .in('relatorio_id', relatoriosData.map((r: any) => r.id))

    if (notasError) {
      console.log("⚠️ Erro ao buscar notas:", notasError)
    } else {
      console.log(`📊 ${todasNotas?.length || 0} notas encontradas`)
    }

    // 4. CONSULTA EM LOTE: Buscar TODAS as divergências de uma vez
    const notaIds = todasNotas?.map((tn: any) => tn.nota_fiscal_id) || []
    console.log(`🔍 IDs das notas para buscar divergências:`, notaIds)

    let todasDivergencias: any[] = []
    if (notaIds.length > 0) {
      const { data: divergenciasData, error: divergenciasError } = await supabase
        .from('divergencias')
        .select('*')
        .in('nota_fiscal_id', notaIds)

      if (divergenciasError) {
        console.log("⚠️ Erro ao buscar divergências:", divergenciasError)
      } else {
        todasDivergencias = divergenciasData || []
        console.log(`📊 ${todasDivergencias.length} divergências encontradas`)
      }
    }

    // 5. Processar dados em memória (muito mais rápido)
    const relatoriosProcessados = relatoriosData.map(async (relatorio: any) => {
      // Usar função de diagnóstico para colaboradores
      const colaboradores = await diagnosticarColaboradores(supabase, relatorio.id)

      // Filtrar notas deste relatório
      const notas = todasNotas
        ?.filter((tn: any) => tn.relatorio_id === relatorio.id)
        ?.map((tn: any) => {
          const nota = tn.notas_fiscais
          const divergencia = todasDivergencias?.find((d: any) => d.nota_fiscal_id === nota.id)

          return {
            id: nota.id,
            numeroNF: nota.numero_nf || nota.codigo_completo,
            volumes: nota.volumes || 0,
            destino: nota.destino || 'Não informado',
            fornecedor: nota.fornecedor || 'Não informado',
            clienteDestino: nota.cliente_destino || 'Não informado',
            status: nota.status === 'devolvida' ? 'devolvida' : (divergencia ? 'divergencia' : 'ok'),
            divergencia: divergencia ? {
              volumesInformados: divergencia.volumes_informados,
              observacoes: divergencia.observacoes
            } : null
          }
        }) || []

      console.log(`🔍 Relatório ${relatorio.id}: ${notas.length} notas processadas`)

      return {
        id: relatorio.id,
        nome: relatorio.nome || 'Relatório sem nome',
        colaboradores: colaboradores,
        data: relatorio.data,
        turno: relatorio.turno || 'Não informado',
        area: relatorio.area || 'custos',
        quantidadeNotas: relatorio.quantidade_notas || 0,
        somaVolumes: relatorio.soma_volumes || 0,
        notas: notas,
        dataFinalizacao: relatorio.data_finalizacao || new Date().toISOString(),
        status: relatorio.status || 'liberado',
      }
    })

    // Aguardar todos os relatórios serem processados
    const relatoriosProcessadosFinal = await Promise.all(relatoriosProcessados)

    // Verificar estatísticas dos relatórios processados
    const relatoriosComColaboradores = relatoriosProcessadosFinal.filter((r: any) => r.colaboradores && r.colaboradores.length > 0)
    const relatoriosSemColaboradores = relatoriosProcessadosFinal.filter((r: any) => !r.colaboradores || r.colaboradores.length === 0)

    console.log("📊 Estatísticas dos relatórios (fallback):")
    console.log(`   - Total: ${relatoriosProcessadosFinal.length}`)
    console.log(`   - Com colaboradores: ${relatoriosComColaboradores.length}`)
    console.log(`   - Sem colaboradores: ${relatoriosSemColaboradores.length}`)

    if (relatoriosSemColaboradores.length > 0) {
      console.log("⚠️ Relatórios sem colaboradores (fallback):", relatoriosSemColaboradores.map((r: any) => ({ id: r.id, nome: r.nome })))
    }

    // Preservar mudanças locais recentes (últimos 5 minutos)
    const agora = Date.now()
    const cincoMinutosAtras = agora - (5 * 60 * 1000)

    const relatoriosComMudancasLocais = relatoriosProcessadosFinal.map(relatorioBanco => {
      const relatorioLocal = relatorios.find(r => r.id === relatorioBanco.id)

      // Se existe relatório local com atualização recente, preservar o status local
      if (relatorioLocal &&
        relatorioLocal.ultimaAtualizacaoLocal &&
        relatorioLocal.ultimaAtualizacaoLocal > cincoMinutosAtras) {
        console.log(`🔄 Preservando mudança local para relatório ${relatorioBanco.id}: ${relatorioLocal.status}`)
        return {
          ...relatorioBanco,
          status: relatorioLocal.status
        }
      }

      return relatorioBanco
    })

    console.log("✅ Fallback executado com sucesso:", relatoriosComMudancasLocais.length)
    console.log("🔍 Primeiro relatório do fallback:", relatoriosComMudancasLocais[0])
    setRelatorios(relatoriosComMudancasLocais)
    setFonteDados('banco')
  }

  // Função auxiliar para carregar relatórios do localStorage
  const carregarRelatoriosLocalStorage = async (): Promise<any[]> => {
    const chaveRelatorios = "relatorios_custos"
    const chaveRelatoriosLocal = "relatorios_local"

    console.log("📁 Verificando localStorage...")
    console.log("📁 Chave localStorage (custos):", chaveRelatorios)
    console.log("📁 Chave localStorage (local):", chaveRelatoriosLocal)

    let relatoriosParaUsar: any[] = []

    try {
      const relatoriosSalvos = localStorage.getItem(chaveRelatorios)
      if (relatoriosSalvos) {
        const relatoriosParsed = JSON.parse(relatoriosSalvos)
        console.log("📊 Relatórios do localStorage (custos):", relatoriosParsed)
        if (Array.isArray(relatoriosParsed)) {
          relatoriosParaUsar = [...relatoriosParaUsar, ...relatoriosParsed]
        }
      }
    } catch (error) {
      console.error("❌ Erro ao parsear relatórios custos:", error)
    }

    try {
      const relatoriosLocal = localStorage.getItem(chaveRelatoriosLocal)
      if (relatoriosLocal) {
        const relatoriosParsed = JSON.parse(relatoriosLocal)
        console.log("📊 Relatórios do localStorage (local):", relatoriosParsed)
        if (Array.isArray(relatoriosParsed)) {
          relatoriosParaUsar = [...relatoriosParaUsar, ...relatoriosParsed]
        }
      }
    } catch (error) {
      console.error("❌ Erro ao parsear relatórios local:", error)
    }

    // Remover duplicatas por ID
    const relatoriosUnicos = Array.from(
      new Map(relatoriosParaUsar.map(r => [r.id, r])).values()
    )

    console.log("📊 Total de relatórios únicos do localStorage:", relatoriosUnicos.length)
    return relatoriosUnicos
  }

  // Função para forçar recarga dos relatórios do banco
  const recarregarRelatoriosBanco = async () => {
    console.log("🔄 Forçando recarga dos relatórios do banco de dados...")
    try {
      // Limpar cache e forçar nova busca
      const relatoriosCarregados = await getRelatorios()
      if (Array.isArray(relatoriosCarregados) && relatoriosCarregados.length > 0) {
        console.log("✅ Relatórios recarregados do banco:", relatoriosCarregados.length)
        setRelatorios(relatoriosCarregados)
        setFonteDados('banco')
      } else {
        console.warn("⚠️ Falha ao recarregar relatórios do banco")
        setRelatorios([])
        setFonteDados('nenhuma')
      }
    } catch (error) {
      console.error("❌ Erro ao recarregar relatórios do banco:", error)
      alert("Erro ao recarregar relatórios do banco de dados. Verifique a conexão.")
      setRelatorios([])
      setFonteDados('nenhuma')
    }
  }

  // Função de debug para verificar dados
  const debugDados = () => {
    console.log("🔍 === DEBUG DADOS ===")
    console.log("📊 Relatórios no estado:", relatorios)
    console.log("📊 Quantidade de relatórios:", relatorios.length)

    if (relatorios.length > 0) {
      console.log("🔍 Primeiro relatório:", relatorios[0])
      console.log("🔍 Notas do primeiro relatório:", relatorios[0].notas)
      console.log("🔍 Quantidade de notas:", relatorios[0].notas?.length || 0)

      if (relatorios[0].notas && relatorios[0].notas.length > 0) {
        console.log("🔍 Primeira nota:", relatorios[0].notas[0])
        console.log("🔍 Status da primeira nota:", relatorios[0].notas[0].status)
        console.log("🔍 Divergência da primeira nota:", relatorios[0].notas[0].divergencia)
      }
    }

    console.log("🔍 Fonte de dados:", fonteDados)
    console.log("🔍 === FIM DEBUG ===")
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

    // Redirecionar para a página inicial
    router.push("/");
  }

  const copiarNFs = (notas: NotaFiscal[]) => {
    const nfsTexto = notas.map((nota) => nota.numeroNF).join("\n");
    copiarDadosParaSAP(nfsTexto, `${notas.length} NFs`);
  };

  const copiarVolumes = (notas: NotaFiscal[]) => {
    const volumesTexto = notas
      .map((nota) => nota.divergencia?.volumesInformados || nota.volumes)
      .join("\n");
    copiarDadosParaSAP(volumesTexto, `${notas.length} volumes`);
  };

  const copiarDivergencias = (notas: NotaFiscal[]) => {
    const divergencias = notas.filter((nota) => nota.status === "divergencia");
    const divergenciasTexto = divergencias
      .map(
        (nota) =>
          `${nota.numeroNF}|${nota.divergencia?.observacoes}|${nota.divergencia?.observacoes}|${nota.divergencia?.volumesInformados}`
      )
      .join("\n");
    copiarDadosParaSAP(
      divergenciasTexto,
      `${divergencias.length} divergências`
    );
  };

  const copiarRelatorioCompleto = (relatorio: Relatorio) => {
    const cabecalho = `RELATÓRIO: ${relatorio.nome}
COLABORADOR: ${Array.isArray(relatorio.colaboradores) && relatorio.colaboradores.length > 0
        ? relatorio.colaboradores.join(', ')
        : 'Não informado'}
DATA: ${relatorio.data}
TOTAL NOTAS: ${relatorio.quantidadeNotas}
TOTAL VOLUMES: ${relatorio.somaVolumes}
STATUS: ${relatorio.status}
LIBERADO EM: ${new Date(relatorio.dataFinalizacao).toLocaleString("pt-BR")}

NOTAS FISCAIS:`

    const detalhes = relatorio.notas
      .map((nota) => {
        const volumes = nota.divergencia?.volumesInformados || nota.volumes;
        const status = nota.status === "ok" ? "OK" : "DIVERGÊNCIA";
        const divergencia = nota.divergencia
          ? `${nota.divergencia.observacoes}`
          : "";

        return `${nota.numeroNF}|${volumes}|${nota.destino}|${nota.fornecedor}|${status}|${divergencia}`;
      })
      .join("\n");

    const relatorioCompleto = cabecalho + detalhes;
    copiarDadosParaSAP(relatorioCompleto, "Relatório completo");
  };

  // Função para filtrar e ordenar notas
  const filtrarEOrdenarNotas = (notas: NotaFiscal[]) => {
    let notasProcessadas = [...notas];

    console.log('🔍 Filtrando notas:', {
      totalNotas: notas.length,
      filtroTexto: filtroTexto,
      filtroStatus: filtroStatus,
      ordenacao: ordenacao
    });

    // Aplicar filtro de texto
    if (filtroTexto) {
      console.log('🔍 Aplicando filtro de texto:', filtroTexto);
      const notasAntes = notasProcessadas.length;

      notasProcessadas = notasProcessadas.filter(
        (nota) => {
          const numeroNF = nota.numeroNF?.toLowerCase() || '';
          const fornecedor = nota.fornecedor?.toLowerCase() || '';
          const destino = nota.destino?.toLowerCase() || '';
          const clienteDestino = nota.clienteDestino?.toLowerCase() || '';
          const filtroLower = filtroTexto.toLowerCase();

          const match = numeroNF.includes(filtroLower) ||
            fornecedor.includes(filtroLower) ||
            destino.includes(filtroLower) ||
            clienteDestino.includes(filtroLower);

          console.log('🔍 Verificando nota:', {
            numeroNF,
            fornecedor,
            destino,
            clienteDestino,
            filtro: filtroLower,
            match
          });

          return match;
        }
      );

      console.log('🔍 Filtro de texto aplicado:', {
        notasAntes,
        notasDepois: notasProcessadas.length,
        filtro: filtroTexto
      });
    }

    // Nota: O filtro de status é aplicado apenas aos relatórios, não às notas individuais
    // As notas têm status diferentes (ok, divergencia, devolvida) dos relatórios (liberado, em_lancamento, lancado)

    // Aplicar ordenação
    switch (ordenacao) {
      case "nf_asc":
        notasProcessadas.sort((a, b) => a.numeroNF.localeCompare(b.numeroNF));
        break;
      case "nf_desc":
        notasProcessadas.sort((a, b) => b.numeroNF.localeCompare(a.numeroNF));
        break;
      case "volumes_asc":
        notasProcessadas.sort(
          (a, b) =>
            (a.divergencia?.volumesInformados || a.volumes) -
            (b.divergencia?.volumesInformados || b.volumes)
        );
        break;
      case "volumes_desc":
        notasProcessadas.sort(
          (a, b) =>
            (b.divergencia?.volumesInformados || b.volumes) -
            (a.divergencia?.volumesInformados || a.volumes)
        );
        break;
      case "fornecedor_asc":
        notasProcessadas.sort((a, b) =>
          a.fornecedor.localeCompare(b.fornecedor)
        );
        break;
      case "fornecedor_desc":
        notasProcessadas.sort((a, b) =>
          b.fornecedor.localeCompare(a.fornecedor)
        );
        break;
      case "destino_asc":
        notasProcessadas.sort((a, b) => a.destino.localeCompare(b.destino));
        break;
      case "destino_desc":
        notasProcessadas.sort((a, b) => b.destino.localeCompare(a.destino));
        break;
      case "status_asc":
        notasProcessadas.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case "status_desc":
        notasProcessadas.sort((a, b) => b.status.localeCompare(a.status));
        break;
      default:
        // Manter ordem original
        break;
    }

    return notasProcessadas;
  };

  // Atualizar useEffect para aplicar filtros
  useEffect(() => {
    console.log('🔍 useEffect de filtros executado:', {
      relatorioSelecionado: !!relatorioSelecionado,
      filtroTexto,
      filtroStatus,
      ordenacao,
      relatorioId: relatorioSelecionado?.id,
      totalNotas: relatorioSelecionado?.notas?.length || 0
    });

    if (relatorioSelecionado) {
      console.log('🔍 Aplicando filtros ao relatório:', relatorioSelecionado.nome);
      const notas = filtrarEOrdenarNotas(relatorioSelecionado.notas);
      console.log('🔍 Notas filtradas:', {
        totalOriginal: relatorioSelecionado.notas.length,
        totalFiltradas: notas.length
      });
      setNotasFiltradas(notas);
    } else {
      console.log('🔍 Nenhum relatório selecionado, limpando notas filtradas');
      setNotasFiltradas([]);
    }
  }, [relatorioSelecionado, filtroTexto, filtroStatus, ordenacao]);

  // Obter lista de colaboradores únicos para filtro
  const colaboradoresUnicos = [
    ...new Set(
      (relatorios || [])
        .filter(rel => rel && rel.colaboradores && Array.isArray(rel.colaboradores) && rel.colaboradores.length > 0)
        .flatMap((rel) => rel.colaboradores)
        .filter(colab => colab && colab.trim() !== '') // Filtrar valores vazios
    ),
  ];

  // Função para exportar relatório em Excel/CSV
  const exportarRelatorioExcel = (relatorio: Relatorio) => {
    // Criar cabeçalho CSV
    const cabecalho = [
      "NF",
      "Volumes",
      "Destino",
      "Fornecedor",
      "Cliente Destino",
      "Status",
      "Divergência Tipo",
      "Divergência Descrição",
      "Volumes Informados",
      "Data",
      "Colaborador",
    ].join(",");

    // Criar linhas de dados
    const linhas = relatorio.notas.map((nota) => {
      const volumes = nota.divergencia?.volumesInformados || nota.volumes;
      const status = nota.status === "ok" ? "OK" : "DIVERGÊNCIA";
      const divergenciaTipo = nota.divergencia?.observacoes || "";
      const divergenciaDescricao = nota.divergencia?.observacoes || "";
      const volumesInformados = nota.divergencia?.volumesInformados || "";

      return [
        nota.numeroNF,
        volumes,
        nota.destino,
        nota.fornecedor,
        nota.clienteDestino,
        status,
        divergenciaTipo,
        divergenciaDescricao,
        volumesInformados,
        relatorio.data,
        Array.isArray(relatorio.colaboradores) && relatorio.colaboradores.length > 0
          ? relatorio.colaboradores.join(', ')
          : 'Não informado',
      ].join(",");
    });

    // Combinar cabeçalho e dados
    const csvContent = [cabecalho, ...linhas].join("\n");

    // Criar e baixar arquivo
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_${relatorio.nome}_${relatorio.data}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para exportar todos os relatórios filtrados
  const exportarTodosRelatoriosExcel = () => {
    const relatoriosParaExportar = relatoriosFiltradosPorData;

    if (relatoriosParaExportar.length === 0) {
      alert("Nenhum relatório encontrado para exportar.");
      return;
    }

    // Criar cabeçalho CSV
    const cabecalho = [
      "Relatório",
      "Colaborador",
      "Data",
      "NF",
      "Volumes",
      "Destino",
      "Fornecedor",
      "Cliente Destino",
      "Status",
      "Divergência Tipo",
      "Divergência Descrição",
      "Volumes Informados",
      "Data Finalização",
    ].join(",");

    // Criar linhas de dados
    const linhas = relatoriosParaExportar.flatMap((relatorio) =>
      relatorio.notas.map((nota) => {
        const volumes = nota.divergencia?.volumesInformados || nota.volumes;
        const status = nota.status === "ok" ? "OK" : "DIVERGÊNCIA";
        const divergenciaTipo = nota.divergencia?.observacoes || "";
        const divergenciaDescricao = nota.divergencia?.observacoes || "";
        const volumesInformados = nota.divergencia?.volumesInformados || "";

        return [
          relatorio.nome,
          Array.isArray(relatorio.colaboradores) && relatorio.colaboradores.length > 0
            ? relatorio.colaboradores.join(', ')
            : relatorio.colaboradores,
          relatorio.data,
          nota.numeroNF,
          volumes,
          nota.destino,
          nota.fornecedor,
          nota.clienteDestino,
          status,
          divergenciaTipo,
          divergenciaDescricao,
          volumesInformados,
          new Date(relatorio.dataFinalizacao).toLocaleString("pt-BR"),
        ].join(",");
      })
    );

    // Combinar cabeçalho e dados
    const csvContent = [cabecalho, ...linhas].join("\n");

    // Criar e baixar arquivo
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorios_custos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrar relatórios por texto
  const relatoriosFiltradosPorTexto = (relatorios || []).filter((relatorio) => {
    if (!filtroTexto || !relatorio) return true;

    const texto = filtroTexto.toLowerCase();

    // Verificar nome da transportadora
    const nomeMatch = relatorio.nome && relatorio.nome.toLowerCase().includes(texto);

    // Verificar colaboradores
    const colaboradoresMatch = relatorio.colaboradores && Array.isArray(relatorio.colaboradores) && relatorio.colaboradores.length > 0 &&
      relatorio.colaboradores.some(col => col && col.toLowerCase().includes(texto));

    // Verificar Notas Fiscais
    const nfMatch = relatorio.notas && Array.isArray(relatorio.notas) && relatorio.notas.length > 0 &&
      relatorio.notas.some(nota => nota.numeroNF && nota.numeroNF.toLowerCase().includes(texto));

    // Verificar área
    const areaMatch = relatorio.area && relatorio.area.toLowerCase().includes(texto);

    // Verificar status
    const statusMatch = relatorio.status && relatorio.status.toLowerCase().includes(texto);

    return nomeMatch || colaboradoresMatch || nfMatch || areaMatch || statusMatch;
  });

  // Filtrar relatórios por colaborador e NF
  const relatoriosFiltradosPorColaboradorENF = relatoriosFiltradosPorTexto.filter((relatorio) => {
    if (filtroColaborador === "todos" || !relatorio) return true;

    const termo = filtroColaborador.toLowerCase().trim();

    // Verificar se é um número (possivelmente NF)
    const isNumero = /^\d+$/.test(termo);

    if (isNumero) {
      // Buscar por NF
      if (Array.isArray(relatorio.notas) && relatorio.notas.length > 0) {
        return relatorio.notas.some(nota =>
          nota.numeroNF && nota.numeroNF.includes(termo)
        );
      }
      return false;
    } else {
      // Buscar por colaborador
      if (relatorio.colaboradores && Array.isArray(relatorio.colaboradores) && relatorio.colaboradores.length > 0) {
        const relColaboradores = relatorio.colaboradores.join(', ');
        return relColaboradores === filtroColaborador;
      }
      return false;
    }
  });

  // Filtrar relatórios por data e status
  const relatoriosFiltradosPorData = relatoriosFiltradosPorColaboradorENF.filter((relatorio) => {
    if (!relatorio) return false;

    // Aplicar filtro de data
    if (filtroDataInicio || filtroDataFim) {
      try {
        const dataRelatorio = new Date(relatorio.data);
        const dataInicio = filtroDataInicio ? new Date(filtroDataInicio) : null;
        const dataFim = filtroDataFim ? new Date(filtroDataFim) : null;

        if (dataInicio && dataFim) {
          if (!(dataRelatorio >= dataInicio && dataRelatorio <= dataFim)) {
            return false;
          }
        } else if (dataInicio) {
          if (!(dataRelatorio >= dataInicio)) {
            return false;
          }
        } else if (dataFim) {
          if (!(dataRelatorio <= dataFim)) {
            return false;
          }
        }
      } catch (error) {
        console.error("❌ Erro ao processar data do relatório:", error)
        return false; // Em caso de erro, excluir o relatório
      }
    }

    // Aplicar filtro de status
    if (filtroStatus !== "todos") {
      console.log('🔍 Aplicando filtro de status do relatório:', {
        filtroStatus,
        relatorioStatus: relatorio.status,
        match: relatorio.status === filtroStatus
      });

      if (relatorio.status !== filtroStatus) {
        return false;
      }
    }

    return true;
  });

  // Filtrar relatórios por colaborador e data
  const relatoriosFiltrados =
    filtroColaborador === "todos"
      ? relatoriosFiltradosPorData
      : relatoriosFiltradosPorData.filter((rel) => {
        if (!rel || !rel.colaboradores || !Array.isArray(rel.colaboradores) || rel.colaboradores.length === 0) return false;
        const relColaboradores = rel.colaboradores.join(', ');
        return relColaboradores === filtroColaborador;
      });

  const alterarStatusRelatorio = async (relatorioId: string, novoStatus: string) => {
    console.log('🔄 Alterando status do relatório:', relatorioId, 'para:', novoStatus)

    const relatoriosAtualizados = relatorios.map((rel) =>
      rel.id === relatorioId ? { ...rel, status: novoStatus } : rel
    )

    setRelatorios(relatoriosAtualizados)

    try {
      // Atualizar apenas o status no banco de dados (mais eficiente)
      await updateRelatorioStatus(relatorioId, novoStatus)

      // Marcar que este relatório foi atualizado recentemente para evitar sobrescrita
      const relatorioAtualizado = relatoriosAtualizados.find(rel => rel.id === relatorioId)
      if (relatorioAtualizado) {
        // Adicionar timestamp de atualização local
        relatorioAtualizado.ultimaAtualizacaoLocal = Date.now()

        // Disparar evento em tempo real
        addRealtimeEvent({
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          sector: 'custos',
          type: 'relatorio_finalized',
          message: `Status do relatório alterado para ${novoStatus}`,
          data: { relatorioId, novoStatus, area: relatorioAtualizado.area }
        });

        console.log('✅ Status do relatório atualizado com sucesso')
      }
    } catch (error) {
      console.error("❌ Erro ao atualizar status no banco:", error)
      alert("Erro ao atualizar dados no banco. Verifique sua conexão.")

      // Reverter mudança local em caso de erro
      setRelatorios(relatorios)
    }
  };

  const marcarNotaComoDevolvida = async (notaId: string) => {
    if (!relatorioSelecionado) return;

    try {
      // Atualizar no banco de dados
      const { getSupabase } = await import('@/lib/supabase-client');
      const supabase = getSupabase();

      const { error } = await supabase
        .from('notas_fiscais')
        .update({ status: 'devolvida' })
        .eq('id', notaId);

      if (error) {
        console.error('❌ Erro ao atualizar status da nota no banco:', error);
        alert('Erro ao atualizar nota no banco de dados. Verifique sua conexão.');
        return;
      }

      // Atualizar estado local
      const relatorioAtualizado = {
        ...relatorioSelecionado,
        notas: relatorioSelecionado.notas.map(nota =>
          nota.id === notaId ? { ...nota, status: 'devolvida' as const } : nota
        )
      };

      setRelatorioSelecionado(relatorioAtualizado);

      // Atualizar também na lista de relatórios
      const relatoriosAtualizados = relatorios.map(rel =>
        rel.id === relatorioAtualizado.id ? relatorioAtualizado : rel
      );
      setRelatorios(relatoriosAtualizados);

      // Disparar evento em tempo real
      addRealtimeEvent({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        sector: 'custos',
        type: 'relatorio_finalized',
        message: `Nota ${notaId} marcada como devolvida`,
        data: { notaId, relatorioId: relatorioAtualizado.id }
      });

      console.log('✅ Nota marcada como devolvida no banco:', notaId);
    } catch (error) {
      console.error('❌ Erro ao marcar nota como devolvida:', error);
      alert('Erro ao marcar nota como devolvida. Verifique sua conexão.');
    }
  };

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          {isMigrating ? (
            <div>
              <div className="text-lg font-medium mb-2">🔄 Migrando dados...</div>
              <div className="text-sm text-gray-600">Aguarde, isso pode levar alguns segundos.</div>
            </div>
          ) : (
            <div>Carregando...</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-0 sm:h-16 gap-2 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Calculator className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-orange-600" />
              <div>
                <h1 className="text-sm sm:text-base lg:text-xl font-bold text-gray-900">
                  💰 Custos
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 sm:block">
                  Relatórios e Análise de Custos
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 sm:flex-none">
                <div className="flex items-center gap-1 text-gray-600">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                  <span className="font-medium truncate text-xs sm:text-sm">
                    {Array.isArray(sessionData.colaboradores) && sessionData.colaboradores.length > 0
                      ? sessionData.colaboradores.join(', ')
                      : 'Não informado'}
                  </span>
                </div>
                <div className="flex items-end space-x-1 text-xs text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-3 w-3" />
                    <span>{sessionData.data}</span>
                  </div>
                </div>
              </div>
              <ConnectionStatus />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChangePassword(true)}
                className="flex items-center space-x-2 bg-transparent hover:bg-red-50 border-red-200"
                title="Alterar Senha"
              >
                <KeyRound className="h-4 w-4" />
                <span className="hidden sm:inline">Alterar Senha</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-transparent hover:bg-red-50 border-red-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4">
          <Card className="border-orange-200">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
                {relatoriosFiltrados.length}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Total Relatórios
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
                {relatoriosFiltrados.reduce((sum, rel) => sum + rel.quantidadeNotas, 0)}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Total Notas
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                {relatoriosFiltrados.reduce((sum, rel) => sum + rel.somaVolumes, 0)}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Total Volumes
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-200">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">
                {relatoriosFiltrados.reduce(
                  (sum, rel) =>
                    sum +
                    rel.notas.filter((n) => n.status === "divergencia").length,
                  0
                )}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Divergências
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
                {relatoriosFiltrados.reduce(
                  (sum, rel) =>
                    sum +
                    rel.notas.filter((n) => n.status === "devolvida").length,
                  0
                )}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Desvolvidas
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Relatórios */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Relatórios Liberados
            </h2>

            {/* Botão de Exportar Todos */}
            {relatoriosFiltrados.length > 0 && (
              <Button
                onClick={exportarTodosRelatoriosExcel}
                variant="outline"
                className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 mt-2"
                size="sm"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Todos ({relatoriosFiltrados.length})
              </Button>
            )}
          </div>

          {/* Filtros */}

          <div className="bg-white p-4 rounded-lg border border-orange-200 space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-700">Filtros</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {/* Filtro de texto geral */}
              <div>
                <Label className="text-sm">Buscar por texto</Label>
                <Input
                  placeholder="Transportadora, colaborador, Nota Fiscal..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="w-full"
                />
              </div>
              {/* Filtro de data início */}
              <div>
                <Label className="text-sm">Data Início</Label>
                <Input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Filtro de data fim */}
              <div>
                <Label className="text-sm">Data Fim</Label>
                <Input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  className="w-full"
                />
              </div>
              {/* Filtro de status */}
              <div>
                <Label className="text-sm">Status</Label>
                <Select
                  value={filtroStatus}
                  onValueChange={(value) => setFiltroStatus(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="liberado">Liberados</SelectItem>
                    <SelectItem value="em_lancamento">Em Lançamento</SelectItem>
                    <SelectItem value="lancado">Lançados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Botão limpar filtros */}
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setFiltroTexto("");
                    setFiltroColaborador("todos");
                    setFiltroDataInicio("");
                    setFiltroDataFim("");
                    setFiltroStatus("todos");
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>

            {/* Resumo dos filtros aplicados */}
            {(filtroTexto || filtroColaborador !== "todos" || filtroDataInicio || filtroDataFim || filtroStatus !== "todos") && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                <span className="font-medium">Filtros ativos:</span>
                {filtroTexto && ` Busca: "${filtroTexto}" (transportadora, colaborador, NF)`}
                {filtroColaborador !== "todos" && ` Colaborador/NF: "${filtroColaborador}"`}
                {filtroDataInicio && ` Data início: ${filtroDataInicio}`}
                {filtroDataFim && ` Data fim: ${filtroDataFim}`}
                {filtroStatus !== "todos" && ` Status: ${filtroStatus === "liberado" ? "Liberados" : filtroStatus === "em_lancamento" ? "Em Lançamento" : filtroStatus === "lancado" ? "Lançados" : filtroStatus}`}
                <span className="ml-2">({relatoriosFiltrados.length} relatórios encontrados)</span>
              </div>
            )}
          </div>

          {relatoriosFiltrados.length === 0 ? (
            <Card className="border-orange-200">
              <CardContent className="text-center py-12 text-gray-500">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhum relatório encontrado
                </h3>
                <p className="mb-4">
                  {relatorios.length === 0
                    ? fonteDados === 'banco'
                      ? "Nenhum relatório encontrado no banco de dados."
                      : fonteDados === 'localStorage'
                        ? "Nenhum relatório encontrado no localStorage."
                        : "Nenhum relatório disponível. Verifique a conexão com o banco."
                    : "Tente ajustar os filtros aplicados."
                  }
                </p>
                {relatorios.length === 0 && (
                  <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded border border-blue-200">
                    <div className="font-medium mb-1">💡 Dicas para resolver:</div>
                    <div className="text-left space-y-1">
                      {fonteDados === 'nenhuma' && (
                        <div>• Verifique se há relatórios sendo criados em outras áreas</div>
                      )}
                      {fonteDados === 'localStorage' && (
                        <div>• Use o botão "Recarregar" para tentar buscar do banco novamente</div>
                      )}
                      <div>• Verifique se a conexão com o banco está funcionando</div>
                      <div>• Aguarde alguns minutos e tente novamente</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {relatoriosFiltrados.map((relatorio) => (
                <Card
                  key={relatorio.id}
                  className="border-orange-200 hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-orange-600" />
                        <span className="font-semibold text-gray-900">
                          {relatorio.nome}
                        </span>
                      </div>
                      <Badge
                        className={`text-xs ${relatorio.status === "lancado"
                          ? "bg-green-100 text-green-800"
                          : relatorio.status === "em_lancamento"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-orange-100 text-orange-800"
                          }`}
                      >
                        {relatorio.status === "lancado"
                          ? "Lançado"
                          : relatorio.status === "em_lancamento"
                            ? "Em Lançamento"
                            : "Liberado"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Colaborador</div>
                        <div className="font-medium">
                          {Array.isArray(relatorio.colaboradores) && relatorio.colaboradores.length > 0
                            ? relatorio.colaboradores.join(', ')
                            : 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Data</div>
                        <div className="font-medium">
                          {relatorio.data} - {relatorio.turno}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 py-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">
                          {relatorio.quantidadeNotas}
                        </div>
                        <div className="text-xs text-gray-500">Notas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {relatorio.somaVolumes}
                        </div>
                        <div className="text-xs text-gray-500">Volumes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          {
                            Array.isArray(relatorio.notas)
                              ? relatorio.notas.filter((n) => n.status === "divergencia").length
                              : 0
                          }
                        </div>
                        <div className="text-xs text-gray-500">
                          Divergências
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      Liberado em:{" "}
                      {new Date(relatorio.dataFinalizacao).toLocaleString(
                        "pt-BR"
                      )}
                    </div>

                    <div className="flex justify-center items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex-1 w-full sm:w-auto bg-transparent text-xs sm:text-sm"
                            size="sm"
                            onClick={() => {
                              console.log('🔍 Abrindo modal para relatório:', relatorio.nome);
                              console.log('🔍 Notas do relatório:', relatorio.notas);
                              setRelatorioSelecionado(relatorio);
                              setNotasFiltradas(relatorio.notas);
                              setFiltroTexto("");
                              setOrdenacao("data_desc");
                            }}
                          >
                            <Eye className="h-3 w-3" />
                            <span className="hidden sm:inline">Ver Detalhes</span>
                            <span className="sm:hidden">Detalhes</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              <Package className="h-4 w-4 text-orange-600" />
                              <span>{relatorio.nome}</span>
                            </DialogTitle>
                          </DialogHeader>

                          <div className="space-y-6">
                            {/* Resumo do Relatório */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-orange-50 rounded-lg">
                              <div>
                                <div className="text-sm text-gray-600">
                                  Transportadora
                                </div>
                                <div className="font-medium">
                                  {relatorio.nome}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">
                                  Colaborador
                                </div>
                                <div className="font-medium">
                                  {Array.isArray(relatorio.colaboradores) && relatorio.colaboradores.length > 0
                                    ? relatorio.colaboradores.join(', ')
                                    : 'Não informado'}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">
                                  Data
                                </div>
                                <div className="font-medium">
                                  {relatorio.data} - {relatorio.turno}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">
                                  Liberado em
                                </div>
                                <div className="font-medium text-xs">
                                  {new Date(
                                    relatorio.dataFinalizacao
                                  ).toLocaleString("pt-BR")}
                                </div>
                              </div>
                            </div>

                            {/* Botões de Cópia e Exportar */}
                            <div className="flex flex-wrap gap-2">
                              <Button
                                onClick={() => copiarNFs(notasFiltradas)}
                                variant="outline"
                                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                                size="sm"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar NFs ({notasFiltradas.length})
                              </Button>
                              <Button
                                onClick={() => copiarVolumes(notasFiltradas)}
                                variant="outline"
                                className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                                size="sm"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar Volumes (
                                {notasFiltradas.reduce(
                                  (sum, nota) =>
                                    sum +
                                    (nota.divergencia?.volumesInformados ||
                                      nota.volumes),
                                  0
                                )}
                                )
                              </Button>
                              {notasFiltradas.some(
                                (n) => n.status === "divergencia"
                              ) && (
                                  <Button
                                    onClick={() =>
                                      copiarDivergencias(notasFiltradas)
                                    }
                                    variant="outline"
                                    className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                                    size="sm"
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copiar Divergências (
                                    {
                                      notasFiltradas.filter(
                                        (n) => n.status === "divergencia"
                                      ).length
                                    }
                                    )
                                  </Button>
                                )}
                              <Button
                                onClick={() =>
                                  copiarRelatorioCompleto(relatorio)
                                }
                                variant="outline"
                                className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                                size="sm"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar Relatório Completo
                              </Button>

                              {/* Novo botão de exportar Excel */}
                              <Button
                                onClick={() => exportarRelatorioExcel(relatorio)}
                                variant="outline"
                                className="bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
                                size="sm"
                              >
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Exportar Excel
                              </Button>
                            </div>

                            {/* Filtros e Ordenação */}
                            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                              <div className="flex items-center space-x-2 mb-3">
                                <Filter className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-gray-700">
                                  Filtros e Ordenação
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <Label className="text-sm">Buscar</Label>
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                      placeholder="NF, fornecedor, destino..."
                                      value={filtroTexto}
                                      onChange={(e) => {
                                        console.log('🔍 Campo de filtro alterado:', e.target.value);
                                        setFiltroTexto(e.target.value);
                                      }}
                                      className="pl-10"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm">Status</Label>
                                  <Select
                                    value={filtroStatus}
                                    onValueChange={setFiltroStatus}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="todos">
                                        Todos os Status
                                      </SelectItem>
                                      <SelectItem value="ok">
                                        ✅ Apenas OK
                                      </SelectItem>
                                      <SelectItem value="divergencia">
                                        ⚠️ Apenas Divergências
                                      </SelectItem>
                                      <SelectItem value="devolvida">
                                        🔄 Apenas Devolvidas
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-sm">Ordenar por</Label>
                                  <Select
                                    value={ordenacao}
                                    onValueChange={setOrdenacao}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="data_desc">
                                        Ordem Original
                                      </SelectItem>
                                      <SelectItem value="nf_asc">
                                        NF (A-Z)
                                      </SelectItem>
                                      <SelectItem value="nf_desc">
                                        NF (Z-A)
                                      </SelectItem>
                                      <SelectItem value="volumes_asc">
                                        Volumes (Menor-Maior)
                                      </SelectItem>
                                      <SelectItem value="volumes_desc">
                                        Volumes (Maior-Menor)
                                      </SelectItem>
                                      <SelectItem value="fornecedor_asc">
                                        Fornecedor (A-Z)
                                      </SelectItem>
                                      <SelectItem value="fornecedor_desc">
                                        Fornecedor (Z-A)
                                      </SelectItem>
                                      <SelectItem value="destino_asc">
                                        Destino (A-Z)
                                      </SelectItem>
                                      <SelectItem value="destino_desc">
                                        Destino (Z-A)
                                      </SelectItem>
                                      <SelectItem value="status_asc">
                                        Status (OK primeiro)
                                      </SelectItem>
                                      <SelectItem value="status_desc">
                                        Status (Divergência primeiro)
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="text-sm text-gray-600">
                                Mostrando {notasFiltradas.length} de{" "}
                                {Array.isArray(relatorio.notas) ? relatorio.notas.length : 0} notas
                              </div>
                            </div>

                            {/* Tabela de Notas com dados filtrados */}
                            <ScrollArea className="max-h-96 overflow-y-auto overflow-x-hidden ">
                              <div className="min-w-max">
                                {/* Cabeçalho fixo */}
                                <div className="grid grid-cols-8 gap-4 bg-gray-100 px-4 py-2 sticky top-0 z-10 text-sm font-semibold text-gray-700 border-b border-gray-300">
                                  <div>NF</div>
                                  <div>Volumes</div>
                                  <div>Destino</div>
                                  <div>Fornecedor</div>
                                  <div>Cliente</div>
                                  <div>Status</div>
                                  <div>Divergência</div>
                                  <div>Ações</div>
                                </div>
                                {notasFiltradas.map((nota, index) => (
                                  <div
                                    key={nota.id}
                                    className={`px-4 py-2 grid grid-cols-8 gap-4 text-sm ${index % 2 === 0
                                      ? "bg-white"
                                      : "bg-gray-50"
                                      }`}
                                  >
                                    <div className="font-medium">
                                      {nota.numeroNF}
                                    </div>
                                    <div className="text-center">
                                      {nota.divergencia?.volumesInformados ||
                                        nota.volumes}
                                      {nota.divergencia?.volumesInformados !==
                                        nota.volumes && (
                                          <span className="text-orange-600 text-xs ml-1">
                                            (era {nota.volumes})
                                          </span>
                                        )}
                                    </div>
                                    <div className="text-xs">
                                      {nota.destino}
                                    </div>
                                    <div
                                      className="text-xs truncate"
                                      title={nota.fornecedor}
                                    >
                                      {nota.fornecedor}
                                    </div>
                                    <div
                                      className="text-xs truncate"
                                      title={nota.clienteDestino}
                                    >
                                      {nota.clienteDestino}
                                    </div>
                                    <div className="flex items-center">
                                      {nota.status === "ok" ? (
                                        <div className="flex items-center text-green-600">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          <span className="text-xs">OK</span>
                                        </div>
                                      ) : nota.status === "devolvida" ? (
                                        <div className="flex items-center text-red-600">
                                          <RefreshCw className="h-3 w-3 mr-1" />
                                          <span className="text-xs">Devolvida</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center text-orange-600">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          <span className="text-xs">Div.</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-xs">
                                      {nota.divergencia && (
                                        <span
                                          className="text-orange-600"
                                          title={nota.divergencia.observacoes}
                                        >
                                          {nota.divergencia.observacoes}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-center">
                                      {nota.status !== "devolvida" && (
                                        <Button
                                          onClick={() => marcarNotaComoDevolvida(nota.id)}
                                          variant="outline"
                                          size="sm"
                                          className="h-6 px-2 text-xs bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                                        >
                                          <RefreshCw className="h-3 w-3 mr-1" />
                                          Devolver
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                <div className="bg-orange-50 px-4 py-2 grid grid-cols-8 gap-4 text-sm font-bold text-orange-800">
                                  <div className="col-span-1">Total:</div>
                                  <div className="text-center">
                                    {notasFiltradas.reduce(
                                      (sum, nota) =>
                                        sum +
                                        (nota.divergencia?.volumesInformados ||
                                          nota.volumes),
                                      0
                                    )}
                                  </div>
                                  <div className="col-span-6"></div>
                                </div>
                              </div>
                            </ScrollArea>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Adicionar botões de status */}
                      <Button
                        onClick={() =>
                          relatorio.id && alterarStatusRelatorio(relatorio.id, "em_lancamento")
                        }
                        disabled={
                          !relatorio.id ||
                          relatorio.status === "em_lancamento" ||
                          relatorio.status === "lancado"
                        }
                        variant="outline"
                        className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                        size="sm"
                      >
                        <span className="hidden sm:inline">Em Lançamento</span>
                        <span className="sm:hidden">Em Lançamento</span>
                      </Button>

                      <Button
                        onClick={() =>
                          relatorio.id && alterarStatusRelatorio(relatorio.id, "lancado")
                        }
                        disabled={!relatorio.id || relatorio.status === "lancado"}
                        variant="outline"
                        className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                        size="sm"
                      >
                        <span className="hidden sm:inline">Lançado</span>
                        <span className="sm:hidden">Lançado</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Alterar Senha */}
      {sessionData && (
        <ChangePasswordModal
          isOpen={showChangePassword}
          onClose={() => setShowChangePassword(false)}
          usuario={sessionData.colaboradores[0] || ""}
          area="custos"
          onSuccess={() => {
            alert("Senha alterada com sucesso!")
          }}
        />
      )}
    </div>
  );
}
