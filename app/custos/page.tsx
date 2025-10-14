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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  Clock,
} from "lucide-react";
import { useSession, useConnectivity, useDatabase } from "@/hooks/use-database"
import { useRelatorios } from "@/hooks/use-relatorios-optimized";
import { useDivergenciasCache } from "@/hooks/use-divergencias-cache";
import { useRealtimeMonitoring } from "@/hooks/use-realtime-monitoring";
import { ConnectionStatus } from "@/components/connection-status";
import { useTheme } from "@/contexts/theme-context";
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
  const [fonteDados, setFonteDados] = useState<'banco' | 'localStorage' | 'nenhuma'>('banco');
  const [mostrarNotificacao, setMostrarNotificacao] = useState(false);
  const router = useRouter();

  // Hooks do banco de dados
  const { getSession } = useSession();
  const { isFullyConnected } = useConnectivity();
  const { addRealtimeEvent } = useRealtimeMonitoring();
  const { isMigrating, migrationComplete } = useDatabase();
  
  // Hook otimizado para relatórios com cache
  const { 
    data: relatorios, 
    isLoading: relatoriosLoading, 
    refresh: refreshRelatorios,
    invalidateCache: invalidateRelatoriosCache,
    reproduzirNotificacaoCustos
  } = useRelatorios('custos', {
    refreshInterval: 60000, // Refresh a cada 1 minuto
    revalidateOnFocus: false, // Desabilitar revalidação ao focar
    revalidateOnReconnect: true // Manter revalidação ao reconectar
  });

  // Hook para cache de divergências
  const { 
    getDivergencias,
    getDivergenciasByRelatorio,
    invalidateCache: invalidateDivergenciasCache,
    clearCache: clearDivergenciasCache,
    getCacheStats: getDivergenciasCacheStats,
    isLoading: divergenciasLoading,
    error: divergenciasError
  } = useDivergenciasCache();

  // Debug dos relatórios carregados (reduzido para evitar logs excessivos)
  useEffect(() => {
    if (relatorios && relatorios.length > 0) {
      console.log('🔍 Relatórios carregados:', relatorios.length);
    }
  }, [relatorios?.length]); // Apenas quando a quantidade muda

  // Detectar mudanças no número de relatórios para notificação visual
  useEffect(() => {
    if (relatorios && relatorios.length > 0) {
      setMostrarNotificacao(true)
      
      // Esconder notificação após 5 segundos
      const timer = setTimeout(() => {
        setMostrarNotificacao(false)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [relatorios?.length]);

  // Carregar divergências apenas quando necessário (sob demanda)
  // Removido carregamento automático em lote para evitar buscas desnecessárias

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

  // Estados para estatísticas calculadas
  const [estatisticas, setEstatisticas] = useState({
    totalRelatorios: 0,
    totalNotas: 0,
    totalVolumes: 0,
    totalDivergencias: 0,
    totalDevolvidas: 0
  });
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  // Estados para modal de notas devolvidas
  const [showModalDevolvidas, setShowModalDevolvidas] = useState(false);
  const [notasDevolvidas, setNotasDevolvidas] = useState<NotaFiscal[]>([]);
  const [loadingDevolvidas, setLoadingDevolvidas] = useState(false);
  
  // Estados para loading dos botões de status
  const [loadingStatusButtons, setLoadingStatusButtons] = useState<{[key: string]: boolean}>({});
  
  // Estados para dropdown do usuário
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Hook do tema
  const { theme, setTheme } = useTheme();

  // Funções auxiliares para o dropdown
  const getUserDisplayName = () => {
    if (sessionData && Array.isArray(sessionData.colaboradores) && sessionData.colaboradores.length > 0) {
      return sessionData.colaboradores.join(', ');
    }
    return 'Usuário';
  };

  const getUserRole = () => {
    return 'Setor de Custos';
  };

  // Debug: Log de todos os relatórios carregados
  console.log('📊 Relatórios carregados:', relatorios?.length || 0);
  if (relatorios && relatorios.length > 0) {
    const statusCounts = relatorios.reduce((acc: any, relatorio: any) => {
      acc[relatorio.status] = (acc[relatorio.status] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 Contagem por status:', statusCounts);
    
    // Log específico para relatórios parcialmente liberados
    const parciais = relatorios.filter((r: any) => r.status === "liberado_parcialmente");
    if (parciais.length > 0) {
      console.log('🔍 Relatórios parcialmente liberados encontrados:', parciais.map((r: any) => ({
        id: r.id,
        nome: r.nome,
        status: r.status,
        data: r.data
      })));
    }
  }

  // Filtrar relatórios por texto
  const relatoriosFiltradosPorTexto = (relatorios || []).filter((relatorio) => {
    if (!filtroTexto || !relatorio) return true;

    const texto = filtroTexto.toLowerCase();

    // Verificar nome da transportadora
    const nomeMatch = relatorio.nome && relatorio.nome.toLowerCase().includes(texto);

    // Verificar colaboradores
    const colaboradoresMatch = relatorio.colaboradores && Array.isArray(relatorio.colaboradores) && relatorio.colaboradores.length > 0 &&
      relatorio.colaboradores.some((col: string) => col && col.toLowerCase().includes(texto));

    // Verificar Notas Fiscais
    const nfMatch = relatorio.notas && Array.isArray(relatorio.notas) && relatorio.notas.length > 0 &&
      relatorio.notas.some((nota: NotaFiscal) => nota.numeroNF && nota.numeroNF.toLowerCase().includes(texto));

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

    // Debug: Log para relatórios parcialmente liberados
    if (relatorio.status === "liberado_parcialmente") {
      console.log('🔍 Relatório parcialmente liberado na filtragem por colaborador/NF:', {
        id: relatorio.id,
        nome: relatorio.nome,
        status: relatorio.status,
        filtroColaborador,
        colaboradores: relatorio.colaboradores
      });
    }

    // Verificar se é um número (possivelmente NF)
    const isNumero = /^\d+$/.test(termo);

    if (isNumero) {
      // Buscar por NF
      if (Array.isArray(relatorio.notas) && relatorio.notas.length > 0) {
        const match = relatorio.notas.some((nota: NotaFiscal) =>
          nota.numeroNF && nota.numeroNF.includes(termo)
        );
        if (relatorio.status === "liberado_parcialmente" && !match) {
          console.log('❌ Relatório parcialmente liberado excluído por filtro de NF:', relatorio.nome, 'NF:', termo);
        }
        return match;
      }
      if (relatorio.status === "liberado_parcialmente") {
        console.log('❌ Relatório parcialmente liberado excluído por não ter notas:', relatorio.nome);
      }
      return false;
    } else {
      // Buscar por colaborador
      if (relatorio.colaboradores && Array.isArray(relatorio.colaboradores) && relatorio.colaboradores.length > 0) {
        const relColaboradores = relatorio.colaboradores.join(', ');
        const match = relColaboradores === filtroColaborador;
        if (relatorio.status === "liberado_parcialmente" && !match) {
          console.log('❌ Relatório parcialmente liberado excluído por filtro de colaborador:', relatorio.nome, 'Colaboradores:', relColaboradores, 'Filtro:', filtroColaborador);
        }
        return match;
      }
      if (relatorio.status === "liberado_parcialmente") {
        console.log('❌ Relatório parcialmente liberado excluído por não ter colaboradores:', relatorio.nome);
      }
      return false;
    }
  });

  // Filtrar relatórios por data e status
  const relatoriosFiltradosPorData = relatoriosFiltradosPorColaboradorENF.filter((relatorio) => {
    if (!relatorio) return false;

    // Debug: Log de todos os relatórios e seus status
    if (relatorio.status === "liberado_parcialmente") {
      console.log('🔍 Relatório parcialmente liberado encontrado:', {
        id: relatorio.id,
        nome: relatorio.nome,
        status: relatorio.status,
        filtroStatus,
        data: relatorio.data
      });
    }

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
        match: filtroStatus === "liberado" 
          ? (relatorio.status === "liberado" || relatorio.status === "liberado_parcialmente")
          : relatorio.status === filtroStatus
      });

      if (filtroStatus === "liberado") {
        // Para "liberados", incluir tanto "liberado" quanto "liberado_parcialmente"
        if (relatorio.status !== "liberado" && relatorio.status !== "liberado_parcialmente") {
          console.log('❌ Relatório excluído por filtro de status "liberado":', relatorio.nome, relatorio.status);
          return false;
        }
      } else {
        // Para outros status, usar comparação exata
        if (relatorio.status !== filtroStatus) {
          console.log('❌ Relatório excluído por filtro de status exato:', relatorio.nome, relatorio.status, 'filtro:', filtroStatus);
          return false;
        }
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

  // Debug: Log dos relatórios finais filtrados
  console.log('📊 Relatórios finais filtrados:', relatoriosFiltrados.length);
  if (relatoriosFiltrados.length > 0) {
    const statusCountsFinais = relatoriosFiltrados.reduce((acc: any, relatorio: any) => {
      acc[relatorio.status] = (acc[relatorio.status] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 Contagem final por status:', statusCountsFinais);
    
    // Log específico para relatórios parcialmente liberados finais
    const parciaisFinais = relatoriosFiltrados.filter((r: any) => r.status === "liberado_parcialmente");
    if (parciaisFinais.length > 0) {
      console.log('✅ Relatórios parcialmente liberados nos resultados finais:', parciaisFinais.map((r: any) => ({
        id: r.id,
        nome: r.nome,
        status: r.status,
        data: r.data
      })));
    } else {
      console.log('❌ Nenhum relatório parcialmente liberado nos resultados finais');
    }
  }

  // Calcular estatísticas usando cache de divergências - ATUALIZADO PARA USAR RELATÓRIOS FILTRADOS
  useEffect(() => {
    // Debounce para evitar recálculos excessivos (aumentado para 2 segundos)
    const timeoutId = setTimeout(async () => {
      const calcularEstatisticas = async () => {
        if (relatorios && relatorios.length > 0) {
          console.log('📊 Calculando estatísticas usando relatórios filtrados...');
          
          // Usar relatórios filtrados em vez de todos os relatórios
          const relatoriosParaCalcular = relatoriosFiltrados;
          console.log(`📊 Calculando estatísticas para ${relatoriosParaCalcular.length} relatórios filtrados de ${relatorios.length} totais`);
        
        let totalRelatorios = 0;
        let totalNotas = 0;
        let totalVolumes = 0;
        let totalDivergencias = 0;
        let totalDevolvidas = 0;

        try {
          // Para cada relatório filtrado, buscar dados do cache
          for (const relatorio of relatoriosParaCalcular) {
            totalRelatorios++;
            totalNotas += relatorio.quantidadeNotas || 0;
            totalVolumes += relatorio.somaVolumes || 0;

            // Usar totalDivergencias do relatório se disponível, senão buscar do cache
            if (relatorio.totalDivergencias !== undefined && relatorio.totalDivergencias !== null) {
              totalDivergencias += relatorio.totalDivergencias;
              console.log(`📊 Relatório ${relatorio.id}: ${relatorio.totalDivergencias} divergências (do relatório)`);
            } else {
              // Usar dados já disponíveis no relatório (evitar busca adicional)
              totalDivergencias += 0; // Não buscar divergências adicionais
              console.log(`📊 Relatório ${relatorio.id}: usando dados já carregados`);
            }
          }

          // Para calcular devolvidas, usar dados dos relatórios filtrados
          try {
            // Usar dados dos relatórios filtrados se disponível
            if (relatoriosParaCalcular.some(r => r.notas && r.notas.length > 0)) {
              totalDevolvidas = relatoriosParaCalcular.reduce((sum, rel) => {
                if (rel.notas && Array.isArray(rel.notas)) {
                  return sum + rel.notas.filter((n: any) => n.status === "devolvida").length;
                }
                return sum;
              }, 0);
              console.log(`📊 Total de notas devolvidas calculado dos relatórios filtrados: ${totalDevolvidas}`);
            } else {
              // Usar dados já disponíveis (evitar busca adicional)
              totalDevolvidas = 0;
              console.log(`📊 Usando dados já carregados para notas devolvidas`);
            }
          } catch (error) {
            console.warn('⚠️ Erro ao calcular notas devolvidas:', error);
            totalDevolvidas = 0;
          }

          setEstatisticas({
            totalRelatorios,
            totalNotas,
            totalVolumes,
            totalDivergencias,
            totalDevolvidas
          });

          console.log('📊 Estatísticas calculadas (baseadas em relatórios filtrados):', {
            totalRelatorios,
            totalNotas,
            totalVolumes,
            totalDivergencias,
            totalDevolvidas,
            relatoriosFiltrados: relatoriosParaCalcular.length,
            relatoriosTotais: relatorios.length
          });

        } catch (error) {
          console.error('❌ Erro ao calcular estatísticas:', error);
        }
      }
    };

    calcularEstatisticas();
    }, 2000); // Debounce de 2 segundos para evitar recálculos excessivos

    return () => clearTimeout(timeoutId);
  }, [relatoriosFiltrados.length]); // Apenas quando o número de relatórios filtrados muda

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
        // O hook useRelatorios já gerencia o carregamento e cache automaticamente
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
              // O hook useRelatorios já gerencia o carregamento e cache automaticamente
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

  // Limpar relatórios locais quando a página for recarregada
  useEffect(() => {
    const limparRelatoriosLocais = () => {
      try {
        // Limpar relatórios do localStorage
        localStorage.removeItem("relatorios_custos")
        localStorage.removeItem("relatorios_local")
        
        // Limpar cache de divergências
        clearDivergenciasCache()
        
        console.log('🧹 Relatórios locais limpos ao recarregar a página')
      } catch (error) {
        console.warn('⚠️ Erro ao limpar relatórios locais:', error)
      }
    }

    // Adicionar listener para beforeunload
    const handleBeforeUnload = () => {
      limparRelatoriosLocais()
    }

    // Adicionar listener para visibilitychange (quando a aba perde o foco)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        limparRelatoriosLocais()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [clearDivergenciasCache])

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

  // Função removida - agora usamos o hook useRelatorios otimizado

  // Funções de carregamento removidas - agora usamos o hook useRelatorios otimizado

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
      // Usar o hook otimizado para recarregar
      await refreshRelatorios()
      setFonteDados('banco')
      console.log("✅ Relatórios recarregados do banco")
    } catch (error) {
      console.error("❌ Erro ao recarregar relatórios do banco:", error)
      alert("Erro ao recarregar relatórios do banco de dados. Verifique a conexão.")
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

  const copiarRelatorioCompleto = async (relatorio: Relatorio) => {
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

    // Alterar status do relatório para "em_lancamento" se ainda não estiver
    if (relatorio.id && relatorio.status === "liberado") {
      try {
        await alterarStatusRelatorio(relatorio.id, "em_lancamento");
        console.log('✅ Status do relatório alterado para "em_lancamento"');
      } catch (error) {
        console.error('❌ Erro ao alterar status do relatório:', error);
      }
    }
  };

  // Função para filtrar e ordenar notas
  const filtrarEOrdenarNotas = (notas: NotaFiscal[]) => {
    console.log('🔍 filtrarEOrdenarNotas chamada com:', {
      notas: notas,
      tipo: typeof notas,
      isArray: Array.isArray(notas),
      length: notas?.length || 0
    });
    
    if (!notas || !Array.isArray(notas)) {
      console.log('⚠️ Notas inválidas, retornando array vazio');
      return [];
    }
    
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
      console.log('🔍 Notas originais do relatório:', relatorioSelecionado.notas);
      const notas = filtrarEOrdenarNotas(relatorioSelecionado.notas || []);
      console.log('🔍 Notas filtradas:', {
        totalOriginal: relatorioSelecionado.notas?.length || 0,
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
      relatorio.notas.map((nota: NotaFiscal) => {
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

  // Função auxiliar para buscar ID do usuário pelo nome do colaborador
  const buscarIdUsuario = async (nomeColaborador: string): Promise<string | null> => {
    try {
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      // Primeiro, verificar se a tabela users existe e tem dados
      const { data: tabelaExiste, error: erroTabela } = await supabase
        .from('users')
        .select('id, nome, ativo')
        .limit(5)
      
      if (erroTabela) {
        return null
      }
      
      if (!tabelaExiste || tabelaExiste.length === 0) {
        return null
      }
      
      // Buscar usuário com múltiplas estratégias (sem .single() para evitar erro PGRST116)
      const { data: userDataList, error: userError } = await supabase
        .from('users')
        .select('id, nome, ativo')
        .or(`nome.ilike.%${nomeColaborador}%,nome.ilike.%${nomeColaborador.trim()}%,nome.eq.${nomeColaborador}`)
        .eq('ativo', true)
      
      if (userError) {
        return null
      }
      
      if (!userDataList || userDataList.length === 0) {
        // Tentar busca mais ampla sem filtro de ativo
        const { data: userDataInativoList, error: userErrorInativo } = await supabase
          .from('users')
          .select('id, nome, ativo')
          .or(`nome.ilike.%${nomeColaborador}%,nome.ilike.%${nomeColaborador.trim()}%,nome.eq.${nomeColaborador}`)
        
        if (userDataInativoList && userDataInativoList.length > 0) {
          // Usar o primeiro resultado encontrado
          const userDataInativo = userDataInativoList[0]
          return userDataInativo.id as string
        }
        
        return null
      }
      
      // Usar o primeiro resultado encontrado (usuários ativos)
      const userData = userDataList[0]
      return (userData.id as string) || null
    } catch (error) {
      return null
    }
  }

  const alterarStatusRelatorio = async (relatorioId: string, novoStatus: string) => {
    const buttonKey = `${relatorioId}-${novoStatus}`;
    
    try {
      // Ativar loading para este botão específico
      setLoadingStatusButtons(prev => ({ ...prev, [buttonKey]: true }));
      
      // Atualizar apenas o status no banco de dados (mais eficiente)
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      // Preparar dados para atualização
      const updateData: any = { 
        status: novoStatus,
        updated_at: new Date().toISOString()
      }

      // Se o status for "em_lancamento", buscar e salvar o responsável pelo lançamento
      if (novoStatus === "em_lancamento") {
        if (sessionData && sessionData.colaboradores && Array.isArray(sessionData.colaboradores) && sessionData.colaboradores.length > 0) {
          // Usar o primeiro colaborador da sessão como responsável
          const nomeResponsavel = sessionData.colaboradores[0]
          const responsavelId = await buscarIdUsuario(nomeResponsavel)
          if (responsavelId) {
            updateData.responsavel_lancamento = responsavelId
          }
        }
      }

      // Se o status for "lancado", salvar a data e hora do lançamento
      if (novoStatus === "lancado") {
        const dataLancamento = new Date().toISOString()
        updateData.data_lancamento = dataLancamento
      }
      
      const { error } = await supabase
        .from('relatorios')
        .update(updateData)
        .eq('id', relatorioId)

      if (error) {
        throw error
      }

      // Invalidar cache e refresh imediato para feedback visual
      invalidateRelatoriosCache()
      await refreshRelatorios()

      // Disparar evento em tempo real
      addRealtimeEvent({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        sector: 'custos',
        type: 'relatorio_finalized',
        message: `Status do relatório alterado para ${novoStatus}`,
        data: { relatorioId, novoStatus, area: 'custos' }
      });

    } catch (error) {
      console.error("❌ Erro ao atualizar status no banco:", error)
      alert("Erro ao atualizar dados no banco. Verifique sua conexão.")
    } finally {
      // Desativar loading para este botão específico
      setLoadingStatusButtons(prev => ({ ...prev, [buttonKey]: false }));
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

      // Invalidar cache para forçar refresh dos relatórios
      invalidateRelatoriosCache();

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

  // Função para carregar todas as notas devolvidas
  const carregarNotasDevolvidas = async () => {
    setLoadingDevolvidas(true);
    try {
      const { getSupabase } = await import('@/lib/supabase-client');
      const supabase = getSupabase();

      // Buscar todas as notas devolvidas
      const { data: notasData, error } = await supabase
        .from('notas_fiscais')
        .select(`
          id,
          numero_nf,
          volumes,
          destino,
          fornecedor,
          cliente_destino,
          status,
          created_at,
          updated_at
        `)
        .eq('status', 'devolvida')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar notas devolvidas:', error);
        alert('Erro ao carregar notas devolvidas. Verifique sua conexão.');
        return;
      }

      // Buscar divergências relacionadas às notas devolvidas
      const notasIds = (notasData || []).map(nota => nota.id);
      let divergenciasMap: { [key: string]: any } = {};
      
      if (notasIds.length > 0) {
        try {
          const { data: divergenciasData, error: divergenciasError } = await supabase
            .from('divergencias')
            .select('*')
            .in('nota_fiscal_id', notasIds);

          if (!divergenciasError && divergenciasData) {
            // Criar mapa de divergências por nota_fiscal_id
            divergenciasData.forEach(div => {
              divergenciasMap[div.nota_fiscal_id as string] = div;
            });
          }
        } catch (err) {
          console.warn('⚠️ Erro ao buscar divergências:', err);
        }
      }

      // Converter dados para o formato esperado
      const notasFormatadas: NotaFiscal[] = (notasData || []).map(nota => {
        const divergencia = divergenciasMap[nota.id as string];
        return {
          id: nota.id as string,
          numeroNF: nota.numero_nf as string,
          volumes: nota.volumes as number,
          destino: nota.destino as string,
          fornecedor: nota.fornecedor as string,
          clienteDestino: nota.cliente_destino as string,
          status: 'devolvida' as const,
          codigoCompleto: '', // Campo obrigatório mas não disponível
          data: nota.created_at as string,
          tipoCarga: '', // Campo obrigatório mas não disponível
          divergencia: divergencia ? {
            observacoes: divergencia.observacoes || '',
            volumesInformados: divergencia.volumes_informados || nota.volumes
          } : undefined,
          timestamp: nota.created_at as string
        };
      });

      setNotasDevolvidas(notasFormatadas);
      console.log('✅ Notas devolvidas carregadas:', notasFormatadas.length);
    } catch (error) {
      console.error('❌ Erro ao carregar notas devolvidas:', error);
      alert('Erro ao carregar notas devolvidas. Verifique sua conexão.');
    } finally {
      setLoadingDevolvidas(false);
    }
  };

  // Função para abrir modal de notas devolvidas
  const abrirModalDevolvidas = async () => {
    setShowModalDevolvidas(true);
    await carregarNotasDevolvidas();
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

  // Função para calcular o percentual de progresso do relatório
  const calcularPercentualProgresso = (relatorio: Relatorio): number => {
    // Só calcular se o status é 'liberado' ou 'liberado_parcialmente'
    if (relatorio.status !== 'liberado' && relatorio.status !== 'liberado_parcialmente') {
      return 100
    }

    // Se há notas carregadas, calcular baseado no status das notas
    if (relatorio.notas && relatorio.notas.length > 0) {
      const totalNotas = relatorio.notas.length
      const notasProcessadas = relatorio.notas.filter(nota => 
        nota.status === 'ok' || nota.status === 'devolvida' || nota.status === 'divergencia'
      ).length
      
      return totalNotas > 0 ? Math.round((notasProcessadas / totalNotas) * 100) : 100
    }

    // Se não há notas carregadas, mas há totalDivergencias, calcular baseado nisso
    if (relatorio.totalDivergencias !== undefined && relatorio.totalDivergencias !== null) {
      // Se há divergências, mas todas as notas foram processadas (incluindo divergências)
      // Considerar 100% pois divergências são parte do processamento normal
      return 100
    }
    
    // Por padrão, se está liberado sem problemas aparentes, considerar 100%
    return 100
  }

  // Função para verificar se o relatório foi liberado parcialmente
  const isRelatorioLiberadoParcialmente = (relatorio: Relatorio) => {
    const percentual = calcularPercentualProgresso(relatorio)
    return percentual < 100
  }

  // Função para formatar o nome do relatório
  const formatarNomeRelatorio = (relatorio: Relatorio): string => {
    if (relatorio.status === 'liberado_parcialmente') {
      return `${relatorio.nome}`
    }
    
    return relatorio.nome
  }

  // Função para calcular o tempo de bipagem do relatório
  const calcularTempoBipagem = (relatorio: Relatorio): string | null => {
    if (!relatorio.notas || relatorio.notas.length === 0) {
      return null
    }

    // Função auxiliar para validar e converter timestamp
    const validarTimestamp = (timestamp: string): Date | null => {
      if (!timestamp || typeof timestamp !== 'string' || timestamp.trim() === '') {
        return null
      }

      try {
        const data = new Date(timestamp)
        // Verificar se a data é válida
        if (isNaN(data.getTime())) {
          return null
        }
        return data
      } catch (error) {
        console.warn('Erro ao converter timestamp:', timestamp, error)
        return null
      }
    }

    // Filtrar apenas notas com timestamp válido e converter para Date
    const notasComTimestamp = relatorio.notas
      .map(nota => ({
        ...nota,
        dataTimestamp: validarTimestamp(nota.timestamp)
      }))
      .filter(nota => nota.dataTimestamp !== null)
    
    if (notasComTimestamp.length === 0) {
      console.log('⚠️ Nenhuma nota com timestamp válido encontrada para relatório:', relatorio.nome)
      console.log('🔍 Timestamps das notas:', relatorio.notas.map(n => ({ 
        id: n.id, 
        timestamp: n.timestamp, 
        tipo: typeof n.timestamp 
      })))
      return null
    }

    // Se há apenas uma nota, retornar "1 nota"
    if (notasComTimestamp.length === 1) {
      return "1 nota"
    }

    // Ordenar notas por timestamp para encontrar primeira e última
    const notasOrdenadas = [...notasComTimestamp].sort((a, b) => 
      a.dataTimestamp!.getTime() - b.dataTimestamp!.getTime()
    )

    const primeiraNota = notasOrdenadas[0]
    const ultimaNota = notasOrdenadas[notasOrdenadas.length - 1]

    try {
      const inicioBipagem = primeiraNota.dataTimestamp!
      const fimBipagem = ultimaNota.dataTimestamp!
      
      // Calcular diferença em minutos
      const diferencaMs = fimBipagem.getTime() - inicioBipagem.getTime()
      const diferencaMinutos = Math.round(diferencaMs / (1000 * 60))
      
      // Se a diferença for negativa ou muito pequena, pode ser um erro
      if (diferencaMinutos < 0) {
        console.warn('⚠️ Tempo de bipagem negativo detectado para relatório:', relatorio.nome)
        return null
      }
      
      let resultado: string
      if (diferencaMinutos < 1) {
        resultado = "< 1 min"
      } else if (diferencaMinutos < 60) {
        resultado = `${diferencaMinutos} min`
      } else {
        const horas = Math.floor(diferencaMinutos / 60)
        const minutos = diferencaMinutos % 60
        resultado = minutos > 0 ? `${horas}h ${minutos}min` : `${horas}h`
      }
      
      console.log(`✅ Tempo de bipagem calculado para ${relatorio.nome}: ${resultado} (${diferencaMinutos} min)`)
      return resultado
    } catch (error) {
      console.warn('Erro ao calcular tempo de bipagem para relatório:', relatorio.nome, error)
      return null
    }
  }

  return (
    <div className="min-h-screen bg-orange-50 dark:bg-gray-900/20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-100 dark:bg-gray-900 dark:border-orange-900/20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-0 sm:h-16 gap-2 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Calculator className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-orange-600" />
              <div>
                <h1 className="text-sm sm:text-base lg:text-xl font-bold text-gray-900 dark:text-gray-200">
                  💰 Custos
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 sm:block dark:text-gray-300">
                  Relatórios e Análise de Custos
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
            
              <ConnectionStatus />
              
              {/* Menu Dropdown do Usuário */}
              <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-600 to-orange-700 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div className="hidden sm:block text-left">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {getUserDisplayName()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {getUserRole()}
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
                        {getUserDisplayName()}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {getUserRole()}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {sessionData?.data || new Date().toISOString().split('T')[0]} • {sessionData?.turno || 'Manhã'}
                      </p>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => setShowChangePassword(true)}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>Alterar Senha</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

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
                    {theme === 'light' && <span className="ml-auto text-orange-600">✓</span>}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setTheme('dark')}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Moon className="h-4 w-4" />
                    <span>Modo Escuro</span>
                    {theme === 'dark' && <span className="ml-auto text-orange-600">✓</span>}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setTheme('system')}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Monitor className="h-4 w-4" />
                    <span>Sistema</span>
                    {theme === 'system' && <span className="ml-auto text-orange-600">✓</span>}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ">

        {/* Estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4">
          <Card key="total-relatorios" className="border-orange-200 dark:bg-gray-900 dark:border-orange-500/50">
            <CardContent className="text-center p-4 ">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
                {estatisticas.totalRelatorios}
              </div>
              <div className="text-xs text-gray-600 leading-tight dark:text-gray-400">
                Total Relatórios
              </div>
            </CardContent>
          </Card>
          <Card key="total-notas" className="border-blue-200 dark:bg-gray-900 dark:border-blue-500/50">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 ">
                {estatisticas.totalNotas}
              </div>
              <div className="text-xs text-gray-600 leading-tight dark:text-gray-400">
                Total Notas
              </div>
            </CardContent>
          </Card>
          <Card key="total-volumes" className="border-green-200 dark:bg-gray-900 dark:border-green-500/50">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                {estatisticas.totalVolumes}
              </div>
              <div className="text-xs text-gray-600 leading-tight dark:text-gray-400">
                Total Volumes
              </div>
            </CardContent>
          </Card>
          <Card key="total-divergencias" className="border-purple-200 dark:bg-gray-900 dark:border-purple-500/50">
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">
                {estatisticas.totalDivergencias}
              </div>
              <div className="text-xs text-gray-600 leading-tight dark:text-gray-400">
                Divergências
              </div>
            </CardContent>
          </Card>
          <Card 
            key="total-devolvidas" 
            className="border-red-200 dark:bg-gray-900 dark:border-red-500/50 cursor-pointer hover:shadow-md transition-shadow hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={abrirModalDevolvidas}
          >
            <CardContent className="text-center p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
                {estatisticas.totalDevolvidas}
              </div>
              <div className="text-xs text-gray-600 leading-tight dark:text-gray-400">
                Devolvidas
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Relatórios */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-400">
              Relatórios Liberados
            </h2>

            {/* Botão de Exportar Todos */}
            {relatoriosFiltrados.length > 0 && (
              <Button
                onClick={exportarTodosRelatoriosExcel}
                variant="outline"
                className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 mt-2 dark:hover:bg-green-900 dark:bg-green-200"
                size="sm"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Todos ({relatoriosFiltrados.length})
              </Button>
            )}
          </div>

          {/* Filtros */}

          <div className="bg-white p-4 rounded-lg border border-orange-200 space-y-4 dark:bg-gray-900/20 dark:border-orange-500/50">
            <div className="flex items-center space-x-2 mb-3">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-700 dark:text-gray-400">Filtros</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-5 ">
              {/* Filtro de texto geral */}
              <div>
                <Label className="text-sm dark:text-gray-200">Buscar por texto</Label>
                <Input
                  placeholder="Transportadora, colaborador, Nota Fiscal..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="w-full dark:bg-gray-900/50"
                />
              </div>
              {/* Filtro de data início */}
              <div>
                <Label className="text-sm dark:text-gray-200">Data Início</Label>
                <Input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                  className="w-full dark:bg-gray-900/50"
                />
              </div>

              {/* Filtro de data fim */}
              <div>
                <Label className="text-sm dark:text-gray-200">Data Fim</Label>
                <Input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  className="w-full dark:bg-gray-900/50"
                />
              </div>
              {/* Filtro de status */}
              <div>
                <Label className="text-sm dark:text-gray-200">Status</Label>
                <Select
                  value={filtroStatus}
                  onValueChange={(value) => setFiltroStatus(value)}
                >
                  <SelectTrigger className="w-full dark:bg-gray-900/50">
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
                  className="w-full dark:bg-gray-900/50"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>

            {/* Resumo dos filtros aplicados */}
            {(filtroTexto || filtroColaborador !== "todos" || filtroDataInicio || filtroDataFim || filtroStatus !== "todos") && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded dark:bg-gray-900/50 dark:text-gray-400">
                <span className="font-medium dark:text-gray-400">Filtros ativos:</span>
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
              <CardContent className="text-center py-12 text-gray-500 dark:text-gray-400">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhum relatório encontrado
                </h3>
                <p className="mb-4 dark:text-gray-400">
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
                  className="border-orange-200 hover:shadow-md transition-shadow dark:bg-gray-900/20 dark:border-orange-500/50"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-orange-600" />
                        <span className="font-semibold text-gray-900 dark:text-gray-200">
                          {formatarNomeRelatorio(relatorio)}
                        </span>
                      </div>
                      <Badge
                        className={`text-xs ${relatorio.status === "lancado"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                          : relatorio.status === "em_lancamento"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                            : relatorio.status === "liberado_parcialmente"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
                              : "bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-200"
                          }`}
                      >
                        {relatorio.status === "lancado"
                          ? "Lançado"
                          : relatorio.status === "em_lancamento"
                            ? "Em Lançamento"
                            : relatorio.status === "liberado_parcialmente"
                              ? "Liberado Parcialmente"
                              : "Liberado"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">Colaborador</div>
                        <div className="font-medium">
                          {Array.isArray(relatorio.colaboradores) && relatorio.colaboradores.length > 0
                            ? relatorio.colaboradores.join(', ')
                            : 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">Data</div>
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
                        <div className="text-xs text-gray-500 dark:text-gray-400">Notas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {relatorio.somaVolumes}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Volumes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          {relatorio.totalDivergencias || 0}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Divergências
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Liberado em:{" "}
                      {new Date(relatorio.dataFinalizacao).toLocaleString(
                        "pt-BR"
                      )}
                       <br />
                       {calcularTempoBipagem(relatorio) && (
                         <> 
                         <Clock className="h-3 w-3 inline mr-1" />
                         Tempo de bipagem: {calcularTempoBipagem(relatorio)}
                         </>
                      )}
                    </div>

                    <div className="flex justify-center items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex-1 w-full sm:w-auto bg-transparent text-xs sm:text-sm dark:bg-gray-900/50 dark:hover:bg-gray-900/20 dark:border-gray-900/20 dark:text-gray-200"
                            size="sm"
                            onClick={() => {
                              console.log('🔍 Abrindo modal para relatório:', relatorio.nome);
                              setRelatorioSelecionado(relatorio);
                              setFiltroTexto("");
                              setOrdenacao("data_desc");
                              setNotasFiltradas(relatorio.notas || []);
                              console.log('✅ Modal aberto com dados básicos do relatório');
                            }}
                          >
                            <Eye className="h-3 w-3 dark:text-gray-400" />
                            <span className="hidden sm:inline">Ver Detalhes</span>
                            <span className="sm:hidden">Detalhes</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              <Package className="h-4 w-4 text-orange-600" />
                              <span>{formatarNomeRelatorio(relatorio)}</span>
                            </DialogTitle>
                          </DialogHeader>

                          <div className="space-y-4 ">
                            {/* Resumo do Relatório */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-orange-50 rounded-lg dark:bg-gray-900/50">
                              <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  Transportadora
                                </div>
                                <div className="font-medium text-sm dark:text-gray-200">
                                  {formatarNomeRelatorio(relatorio)}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  Colaborador
                                </div>
                                <div className="font-medium text-sm dark:text-gray-200">
                                  {Array.isArray(relatorio.colaboradores) && relatorio.colaboradores.length > 0
                                    ? relatorio.colaboradores.join(', ')
                                    : 'Não informado'}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  Data
                                </div>
                                <div className="font-medium text-sm dark:text-gray-200">
                                  {relatorio.data} - {relatorio.turno}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  Liberado em
                                </div>
                                <div className="font-medium text-sm dark:text-gray-200">
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
                                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/50 dark:hover:bg-blue-900/20 dark:border-blue-900/20 dark:text-blue-200"
                                size="sm"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar NFs ({notasFiltradas.length})
                              </Button>
                              <Button
                                onClick={() => copiarVolumes(notasFiltradas)}
                                variant="outline"
                                className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 dark:bg-green-900/50 dark:hover:bg-green-900/20 dark:border-green-900/20 dark:text-green-200"
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
                                    className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 dark:bg-red-900/50 dark:hover:bg-red-900/20 dark:border-red-900/20 dark:text-red-200"
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
                                onClick={async () =>
                                  await copiarRelatorioCompleto(relatorio)
                                }
                                variant="outline"
                                className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-900/50 dark:hover:bg-purple-900/20 dark:border-purple-900/20 dark:text-purple-200"
                                size="sm"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Relatório Completo
                              </Button>

                              {/* Novo botão de exportar Excel */}
                              <Button
                                onClick={() => exportarRelatorioExcel(relatorio)}
                                variant="outline"
                                className="bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/50 dark:hover:bg-emerald-900/20 dark:border-emerald-900/20 dark:text-emerald-200"
                                size="sm"
                              >
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Exportar Excel
                              </Button>
                            </div>

                            {/* Botões de Status */}
                            <div className="flex flex-wrap gap-2 mt-4">
                              <Button
                                onClick={() =>
                                  relatorio.id && alterarStatusRelatorio(relatorio.id, "em_lancamento")
                                }
                                disabled={
                                  !relatorio.id ||
                                  relatorio.status === "em_lancamento" ||
                                  relatorio.status === "lancado" ||
                                  loadingStatusButtons[`${relatorio.id}-em_lancamento`]
                                }
                                variant="outline"
                                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/50 dark:hover:bg-blue-900/20 dark:border-blue-900/20 dark:text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                size="sm"
                              >
                                {loadingStatusButtons[`${relatorio.id}-em_lancamento`] ? (
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Clock className="h-4 w-4 mr-2" />
                                )}
                                {loadingStatusButtons[`${relatorio.id}-em_lancamento`] ? "Processando..." : "Em Lançamento"}
                              </Button>

                              <Button
                                onClick={() =>
                                  relatorio.id && alterarStatusRelatorio(relatorio.id, "lancado")
                                }
                                disabled={
                                  !relatorio.id || 
                                  relatorio.status === "lancado" ||
                                  loadingStatusButtons[`${relatorio.id}-lancado`]
                                }
                                variant="outline"
                                className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 dark:bg-green-900/50 dark:hover:bg-green-900/20 dark:border-green-900/20 dark:text-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                size="sm"
                              >
                                {loadingStatusButtons[`${relatorio.id}-lancado`] ? (
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                {loadingStatusButtons[`${relatorio.id}-lancado`] ? "Processando..." : "Lançado"}
                              </Button>
                            </div>

                            {/* Filtros e Ordenação */}
                            <div className="bg-gray-50 p-4 rounded-lg space-y-3 dark:bg-gray-900/50">
                              <div className="flex items-center space-x-2 mb-3">
                                <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <span className="font-medium text-gray-700 dark:text-gray-200">
                                  Filtros e Ordenação
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <Label className="text-sm dark:text-gray-200">Buscar</Label>
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
                                  <Label className="text-sm dark:text-gray-200">Status</Label>
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
                                  <Label className="text-sm dark:text-gray-200">Ordenar por</Label>
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
                                <div className="grid grid-cols-8 gap-4 bg-gray-100 px-4 py-2 sticky top-0 z-10 text-sm font-semibold text-gray-700 border-b border-gray-300 dark:bg-gray-900/50 dark:border-gray-900/20 dark:text-gray-200 dark:text-gray-300">
                                  <div>NF</div>
                                  <div>Volumes</div>
                                  <div>Destino</div>
                                  <div>Fornecedor</div>
                                  <div>Cliente</div>
                                  <div>Status</div>
                                  <div>Divergência</div>
                                  <div>Ações</div>
                                </div>
                                {notasFiltradas.map((nota, index) => {
                                  if (index === 0) {
                                    console.log('🔍 Renderizando notas filtradas:', notasFiltradas.length, 'notas');
                                  }
                                  
                                  // Determinar a cor de fundo baseada no status da nota
                                  const getRowBackgroundColor = () => {
                                    if (nota.status === "devolvida") {
                                      return "bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500";
                                    }
                                    return index % 2 === 0
                                      ? "bg-white dark:bg-gray-900/20"
                                      : "bg-gray-50 dark:bg-gray-900/50";
                                  };
                                  
                                  return (
                                  <div
                                    key={nota.id}
                                    className={`px-4 py-2 grid grid-cols-8 gap-4 text-sm ${getRowBackgroundColor()}`}
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
                                          className="h-6 px-2 text-xs bg-red-50 hover:bg-red-100 border-red-200 text-red-700 dark:bg-red-900/50 dark:hover:bg-red-900 dark:border-red-900/20 dark:text-red-200"
                                        >
                                          <RefreshCw className="h-3 w-3 mr-1" />
                                          Devolver
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  );
                                })}
                                <div className="bg-orange-50 px-4 py-2 grid grid-cols-8 gap-4 text-sm font-bold text-orange-800 dark:bg-gray-900/100 dark:text-orange-400">
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
                          relatorio.status === "lancado" ||
                          loadingStatusButtons[`${relatorio.id}-em_lancamento`]
                        }
                        variant="outline"
                        className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/50 dark:hover:bg-blue-900/20 dark:border-blue-900/20 dark:text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        size="sm"
                      >
                        {loadingStatusButtons[`${relatorio.id}-em_lancamento`] ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Clock className="h-4 w-4 mr-2" />
                        )}
                        <span className="hidden sm:inline">
                          {loadingStatusButtons[`${relatorio.id}-em_lancamento`] ? "Processando..." : "Em Lançamento"}
                        </span>
                        <span className="sm:hidden">
                          {loadingStatusButtons[`${relatorio.id}-em_lancamento`] ? "..." : "Em Lançamento"}
                        </span>
                      </Button>

                      <Button
                        onClick={() =>
                          relatorio.id && alterarStatusRelatorio(relatorio.id, "lancado")
                        }
                        disabled={
                          !relatorio.id || 
                          relatorio.status === "lancado" ||
                          loadingStatusButtons[`${relatorio.id}-lancado`]
                        }
                        variant="outline"
                        className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 dark:bg-green-900/50 dark:hover:bg-green-900/20 dark:border-green-900/20 dark:text-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        size="sm"
                      >
                        {loadingStatusButtons[`${relatorio.id}-lancado`] ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        <span className="hidden sm:inline">
                          {loadingStatusButtons[`${relatorio.id}-lancado`] ? "Processando..." : "Lançado"}
                        </span>
                        <span className="sm:hidden">
                          {loadingStatusButtons[`${relatorio.id}-lancado`] ? "..." : "Lançado"}
                        </span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Notificação visual para novos relatórios */}
      {mostrarNotificacao && (
        <div className="fixed top-20 right-6 z-50 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Novos relatórios detectados!</span>
          </div>
        </div>
      )}


      {/* Modal de Notas Devolvidas */}
      <Dialog open={showModalDevolvidas} onOpenChange={setShowModalDevolvidas}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 text-red-600" />
              <span>Notas Devolvidas ({notasDevolvidas.length})</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {loadingDevolvidas ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-red-600 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">Carregando notas devolvidas...</p>
                </div>
              </div>
            ) : notasDevolvidas.length === 0 ? (
              <div className="text-center py-8">
                <RefreshCw className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-200">
                  Nenhuma nota devolvida encontrada
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Não há notas com status "devolvida" no sistema.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Resumo */}
                <div className="bg-red-50 p-4 rounded-lg dark:bg-red-900/20">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-red-600 font-medium">Total de Notas</div>
                      <div className="text-2xl font-bold text-red-700">{notasDevolvidas.length}</div>
                    </div>
                    <div>
                      <div className="text-red-600 font-medium">Total de Volumes</div>
                      <div className="text-2xl font-bold text-red-700">
                        {notasDevolvidas.reduce((sum, nota) => 
                          sum + (nota.divergencia?.volumesInformados || nota.volumes), 0
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-red-600 font-medium">Última Atualização</div>
                      <div className="text-sm text-red-700">
                        {notasDevolvidas.length > 0 
                          ? new Date(notasDevolvidas[0].timestamp || '').toLocaleString('pt-BR')
                          : 'N/A'
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabela de Notas Devolvidas */}
                <ScrollArea className="max-h-96 overflow-y-auto">
                  <div className="min-w-max">
                    {/* Cabeçalho */}
                    <div className="grid grid-cols-7 gap-4 bg-gray-100 px-4 py-2 sticky top-0 z-10 text-sm font-semibold text-gray-700 border-b border-gray-300 dark:bg-gray-900/50 dark:border-gray-900/20 dark:text-gray-200">
                      <div>NF</div>
                      <div>Volumes</div>
                      <div>Destino</div>
                      <div>Fornecedor</div>
                      <div>Cliente</div>
                      <div>Divergência</div>
                      <div>Data</div>
                    </div>

                    {/* Linhas de dados */}
                    {notasDevolvidas.map((nota, index) => (
                      <div
                        key={nota.id}
                        className={`px-4 py-2 grid grid-cols-7 gap-4 text-sm ${
                          index % 2 === 0
                            ? "bg-white dark:bg-gray-900/20"
                            : "bg-red-50 dark:bg-red-900/10"
                        } border-l-4 border-red-500`}
                      >
                        <div className="font-medium text-red-700 dark:text-red-300">
                          {nota.numeroNF}
                        </div>
                        <div className="text-center text-red-700 dark:text-red-300">
                          {nota.divergencia?.volumesInformados || nota.volumes}
                          {nota.divergencia?.volumesInformados !== nota.volumes && (
                            <span className="text-orange-600 text-xs ml-1">
                              (era {nota.volumes})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-red-600 dark:text-red-400">
                          {nota.destino}
                        </div>
                        <div
                          className="text-xs truncate text-red-600 dark:text-red-400"
                          title={nota.fornecedor}
                        >
                          {nota.fornecedor}
                        </div>
                        <div
                          className="text-xs truncate text-red-600 dark:text-red-400"
                          title={nota.clienteDestino}
                        >
                          {nota.clienteDestino}
                        </div>
                        <div className="text-xs">
                          {nota.divergencia && (
                            <span
                              className="text-orange-600 dark:text-orange-400"
                              title={nota.divergencia.observacoes}
                            >
                              {nota.divergencia.observacoes}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-red-600 dark:text-red-400">
                          {nota.timestamp 
                            ? new Date(nota.timestamp).toLocaleDateString('pt-BR')
                            : 'N/A'
                          }
                        </div>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="bg-red-100 px-4 py-2 grid grid-cols-7 gap-4 text-sm font-bold text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      <div className="col-span-1">Total:</div>
                      <div className="text-center">
                        {notasDevolvidas.reduce(
                          (sum, nota) => sum + (nota.divergencia?.volumesInformados || nota.volumes),
                          0
                        )}
                      </div>
                      <div className="col-span-5"></div>
                    </div>
                  </div>
                </ScrollArea>

                {/* Botões de ação */}
                <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => {
                      const nfsTexto = notasDevolvidas.map(nota => nota.numeroNF).join('\n');
                      copiarDadosParaSAP(nfsTexto, `${notasDevolvidas.length} NFs Devolvidas`);
                    }}
                    variant="outline"
                    className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 dark:bg-red-900/50 dark:hover:bg-red-900/20 dark:border-red-900/20 dark:text-red-200"
                    size="sm"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar NFs
                  </Button>
                  <Button
                    onClick={() => {
                      const volumesTexto = notasDevolvidas
                        .map(nota => nota.divergencia?.volumesInformados || nota.volumes)
                        .join('\n');
                      copiarDadosParaSAP(volumesTexto, `${notasDevolvidas.length} volumes devolvidos`);
                    }}
                    variant="outline"
                    className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/50 dark:hover:bg-orange-900/20 dark:border-orange-900/20 dark:text-orange-200"
                    size="sm"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Volumes
                  </Button>
                  <Button
                    onClick={() => setShowModalDevolvidas(false)}
                    variant="outline"
                    size="sm"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
