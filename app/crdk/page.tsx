"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  Settings,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  ChevronDown,
  User,
  LogOut,
  KeyRound,
  Sun,
  Moon,
  Monitor,
  Lightbulb,
  Activity,
  Warehouse,
  Zap,
} from "lucide-react";
import { useSession } from "@/hooks/use-database";
// import { useTheme } from "@/contexts/theme-context";
import ChangePasswordModal from "@/components/admin/change-password-modal";
import { Loader } from "@/components/ui/loader";
import { getSupabase } from "@/lib/supabase-client";

interface KPIData {
  id: string;
  title: string;
  value: string;
  description: string;
  trend: {
    value: string;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  color: string;
}

interface AlertData {
  id: string;
  type: "error" | "warning" | "success";
  icon: React.ReactNode;
  message: string;
}

interface PerformanceArea {
  name: string;
  score: number;
  trend: {
    value: string;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  color: string;
}

export default function CRDKPage() {
  const [sessionData, setSessionData] = useState<any>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFiltersDropdownOpen, setIsFiltersDropdownOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedCD, setSelectedCD] = useState("todos");
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [kpiDataReal, setKpiDataReal] = useState<KPIData[]>([]);
  const [loadingKPIs, setLoadingKPIs] = useState(true);
  const router = useRouter();
  const { getSession } = useSession();
  
  // Filtros de período (similar ao Dashboard de Produção)
  const [periodoSelecionado, setPeriodoSelecionado] = useState<"hoje" | "semana" | "mes" | "personalizado">("hoje");
  const [dataAtual, setDataAtual] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  
  // Ref para rastrear se é a primeira renderização
  const isFirstRender = useRef(true);
  
  // Handler para mudar a data
  const handleDataChange = (novaData: string) => {
    setDataAtual(novaData);
  };
  
  // Recarregar dados quando a data, período ou CD mudarem (mas não na primeira renderização)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return; // Deixa o outro useEffect fazer o carregamento inicial
    }
    if (dataAtual) {
      carregarKPIs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataAtual, dataFim, periodoSelecionado, selectedPeriod, selectedCD]);
  
  // Fallback seguro para o tema durante build estático
  let theme: 'light' | 'dark' | 'system' = 'system';
  let setTheme = (newTheme: 'light' | 'dark' | 'system') => {};
  
  try {
    const { useTheme } = require("@/contexts/theme-context");
    const themeContext = useTheme();
    theme = themeContext.theme || 'system';
    setTheme = themeContext.setTheme || ((newTheme: 'light' | 'dark' | 'system') => {});
  } catch (error) {
    // Fallback durante build estático
    console.log('Theme context not available during build');
  }

  // Função para calcular data de produção (06:00 até 05:59 do dia seguinte)
  const calcularDataProducao = (timestamp: string | Date | null | undefined): string => {
    try {
      if (!timestamp) return new Date().toISOString().split("T")[0];
      const date = timestamp instanceof Date ? new Date(timestamp) : new Date(timestamp);
      if (isNaN(date.getTime())) return new Date().toISOString().split("T")[0];
      date.setHours(date.getHours() - 6);
      return date.toISOString().split("T")[0];
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  };

  // Função para carregar dados reais dos KPIs
  const carregarKPIs = async () => {
    try {
      setLoadingKPIs(true);
      const supabase = getSupabase();
      if (!supabase) throw new Error("Cliente Supabase não inicializado");

      // Calcular período baseado no filtro selecionado (hoje, semana, mês, personalizado)
      let dataInicioBusca: Date;
      let dataFimBusca: Date;
      let hojeStr: string;
      let ontemStr: string;

      const hoje = new Date();
      const hojeStrAtual = hoje.toISOString().split("T")[0];

      switch (periodoSelecionado) {
        case "hoje":
          // Parsear a data selecionada
          const [ano, mes, dia] = dataAtual.split('-').map(Number);
          const dataSelecionada = new Date(Date.UTC(ano, mes - 1, dia, 0, 0, 0));
          hojeStr = dataAtual;
          
          // Buscar do dia anterior para comparação até 1 dia após a data selecionada
          dataInicioBusca = new Date(dataSelecionada);
          dataInicioBusca.setUTCDate(dataInicioBusca.getUTCDate() - 1);
          dataInicioBusca.setUTCHours(0, 0, 0, 0);
          
          dataFimBusca = new Date(dataSelecionada);
          dataFimBusca.setUTCDate(dataFimBusca.getUTCDate() + 1);
          dataFimBusca.setUTCHours(0, 0, 0, 0);
          
          const ontem = new Date(dataSelecionada);
          ontem.setUTCDate(ontem.getUTCDate() - 1);
          ontemStr = ontem.toISOString().split("T")[0];
          break;

        case "semana":
          // Últimos 7 dias
          dataFimBusca = new Date(hoje);
          dataFimBusca.setUTCDate(dataFimBusca.getUTCDate() + 1);
          dataFimBusca.setUTCHours(0, 0, 0, 0);
          
          dataInicioBusca = new Date(hoje);
          dataInicioBusca.setUTCDate(dataInicioBusca.getUTCDate() - 7);
          dataInicioBusca.setUTCHours(0, 0, 0, 0);
          
          hojeStr = hojeStrAtual;
          const ontemSemana = new Date(hoje);
          ontemSemana.setUTCDate(ontemSemana.getUTCDate() - 1);
          ontemStr = ontemSemana.toISOString().split("T")[0];
          break;

        case "mes":
          // Últimos 30 dias
          dataFimBusca = new Date(hoje);
          dataFimBusca.setUTCDate(dataFimBusca.getUTCDate() + 1);
          dataFimBusca.setUTCHours(0, 0, 0, 0);
          
          dataInicioBusca = new Date(hoje);
          dataInicioBusca.setUTCDate(dataInicioBusca.getUTCDate() - 30);
          dataInicioBusca.setUTCHours(0, 0, 0, 0);
          
          hojeStr = hojeStrAtual;
          const ontemMes = new Date(hoje);
          ontemMes.setUTCDate(ontemMes.getUTCDate() - 1);
          ontemStr = ontemMes.toISOString().split("T")[0];
          break;

        case "personalizado":
          // Período personalizado (dataAtual até dataFim)
          const [anoInicio, mesInicio, diaInicio] = dataAtual.split('-').map(Number);
          const dataInicio = new Date(Date.UTC(anoInicio, mesInicio - 1, diaInicio, 0, 0, 0));
          
          const [anoFim, mesFim, diaFim] = dataFim.split('-').map(Number);
          const dataFimDate = new Date(Date.UTC(anoFim, mesFim - 1, diaFim, 0, 0, 0));
          
          dataInicioBusca = new Date(dataInicio);
          dataInicioBusca.setUTCHours(0, 0, 0, 0);
          
          dataFimBusca = new Date(dataFimDate);
          dataFimBusca.setUTCDate(dataFimBusca.getUTCDate() + 1);
          dataFimBusca.setUTCHours(0, 0, 0, 0);
          
          hojeStr = dataFim; // Usar data fim como referência
          const ontemPersonalizado = new Date(dataFimDate);
          ontemPersonalizado.setUTCDate(ontemPersonalizado.getUTCDate() - 1);
          ontemStr = ontemPersonalizado.toISOString().split("T")[0];
          break;

        default:
          // Fallback para hoje
          const [anoDefault, mesDefault, diaDefault] = dataAtual.split('-').map(Number);
          const dataSelecionadaDefault = new Date(Date.UTC(anoDefault, mesDefault - 1, diaDefault, 0, 0, 0));
          hojeStr = dataAtual;
          
          dataInicioBusca = new Date(dataSelecionadaDefault);
          dataInicioBusca.setUTCDate(dataInicioBusca.getUTCDate() - 1);
          dataInicioBusca.setUTCHours(0, 0, 0, 0);
          
          dataFimBusca = new Date(dataSelecionadaDefault);
          dataFimBusca.setUTCDate(dataFimBusca.getUTCDate() + 1);
          dataFimBusca.setUTCHours(0, 0, 0, 0);
          
          const ontemDefault = new Date(dataSelecionadaDefault);
          ontemDefault.setUTCDate(ontemDefault.getUTCDate() - 1);
          ontemStr = ontemDefault.toISOString().split("T")[0];
      }
      
      const pageSizeNotasRecebidas = 1000;
      let offsetNotasRecebidas = 0;
      let hasMoreNotasRecebidas = true;
      const todasNotasRecebidasArray: any[] = [];
      
      while (hasMoreNotasRecebidas) {
        let query = supabase
          .from("notas_consolidado")
          .select("id, volumes, data_entrada, status, usuario, destino, cliente_destino")
          .eq("status", "recebida")
          .gte("data_entrada", dataInicioBusca.toISOString())
          .lt("data_entrada", dataFimBusca.toISOString());
        
        const { data: notasPage, error: errorNotasPage } = await query
          .range(offsetNotasRecebidas, offsetNotasRecebidas + pageSizeNotasRecebidas - 1)
          .order("data_entrada", { ascending: true });
        
        if (errorNotasPage) {
          console.error("Erro ao buscar notas recebidas:", errorNotasPage);
          break;
        }
        
        if (notasPage && notasPage.length > 0) {
          todasNotasRecebidasArray.push(...notasPage);
          offsetNotasRecebidas += pageSizeNotasRecebidas;
          hasMoreNotasRecebidas = notasPage.length === pageSizeNotasRecebidas;
        } else {
          hasMoreNotasRecebidas = false;
        }
      }
      
      let todasNotasRecebidas = todasNotasRecebidasArray;

      // Aplicar filtro de CD se não for "todos"
      if (selectedCD !== "todos") {
        todasNotasRecebidas = todasNotasRecebidas.filter((nota: any) => {
          const destino = (nota.destino || "").toUpperCase();
          const clienteDestino = (nota.cliente_destino || "").toUpperCase();
          
          if (selectedCD === "crdk-es") {
            return destino.includes("ES") || destino.includes("ESPÍRITO SANTO") || 
                   clienteDestino.includes("ES") || clienteDestino.includes("ESPÍRITO SANTO");
          } else if (selectedCD === "crdk-sp") {
            return destino.includes("SP") || destino.includes("SÃO PAULO") || destino.includes("SAO PAULO") ||
                   clienteDestino.includes("SP") || clienteDestino.includes("SÃO PAULO") || clienteDestino.includes("SAO PAULO");
          }
          return true;
        });
      }

      // Filtrar notas da data selecionada - verificar se a data de entrada corresponde à data selecionada
      // Comparar usando tanto UTC quanto local para garantir que funciona em qualquer timezone
      const notasHojeFiltradas = (todasNotasRecebidas || []).filter((nota) => {
        const ts = nota.data_entrada as string | Date | null | undefined;
        if (!ts) return false;
        try {
          const dataHora = ts instanceof Date ? ts : new Date(ts);
          if (isNaN(dataHora.getTime())) return false;
          
          // Extrair a data no formato YYYY-MM-DD (tentar UTC primeiro, depois local)
          let ano, mes, dia;
          // Tentar UTC primeiro
          ano = dataHora.getUTCFullYear();
          mes = String(dataHora.getUTCMonth() + 1).padStart(2, '0');
          dia = String(dataHora.getUTCDate()).padStart(2, '0');
          let dataStrUTC = `${ano}-${mes}-${dia}`;
          
          // Também tentar local
          ano = dataHora.getFullYear();
          mes = String(dataHora.getMonth() + 1).padStart(2, '0');
          dia = String(dataHora.getDate()).padStart(2, '0');
          let dataStrLocal = `${ano}-${mes}-${dia}`;
          
          // Comparar com a data selecionada (pode ser UTC ou local)
          return dataStrUTC === hojeStr || dataStrLocal === hojeStr;
        } catch {
          return false;
        }
      });

      // Filtrar notas do dia anterior à data selecionada (para comparação)
      const notasOntemFiltradas = (todasNotasRecebidas || []).filter((nota) => {
        const ts = nota.data_entrada as string | Date | null | undefined;
        if (!ts) return false;
        try {
          const dataHora = ts instanceof Date ? ts : new Date(ts);
          if (isNaN(dataHora.getTime())) return false;
          
          // Extrair a data no formato YYYY-MM-DD (tentar UTC primeiro, depois local)
          let ano, mes, dia;
          // Tentar UTC primeiro
          ano = dataHora.getUTCFullYear();
          mes = String(dataHora.getUTCMonth() + 1).padStart(2, '0');
          dia = String(dataHora.getUTCDate()).padStart(2, '0');
          let dataStrUTC = `${ano}-${mes}-${dia}`;
          
          // Também tentar local
          ano = dataHora.getFullYear();
          mes = String(dataHora.getMonth() + 1).padStart(2, '0');
          dia = String(dataHora.getDate()).padStart(2, '0');
          let dataStrLocal = `${ano}-${mes}-${dia}`;
          
          // Comparar com a data de ontem (pode ser UTC ou local)
          return dataStrUTC === ontemStr || dataStrLocal === ontemStr;
        } catch {
          return false;
        }
      });

      // Buscar carros do período selecionado
      const dataFimBuscaCarros = new Date(dataFimBusca);
      dataFimBuscaCarros.setUTCHours(0, 0, 0, 0);
      const dataFimBuscaCarrosStr = dataFimBuscaCarros.toISOString().split("T")[0];
      
      // Buscar carros da data selecionada (usar range amplo para capturar todos)
      const { data: carrosHoje } = await supabase
        .from("carros_status")
        .select("id, created_at, data, status_carro")
        .gte("created_at", `${hojeStr}T00:00:00Z`)
        .lt("created_at", `${dataFimBuscaCarrosStr}T00:00:00Z`);

      // Filtrar carros de hoje pela regra de 06:00
      const carrosHojeFiltrados = (carrosHoje || []).filter((carro) => {
        const ts = (carro.created_at || carro.data) as string | Date | null | undefined;
        if (!ts) return carro.data === hojeStr;
        try {
          const dataHora = ts instanceof Date ? ts : new Date(ts);
          if (isNaN(dataHora.getTime())) return carro.data === hojeStr;
          const dataStr = dataHora.toISOString().split('T')[0];
          const hora = dataHora.getUTCHours();
          const dataDiaSeguinte = new Date(hojeStr);
          dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1);
          const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0];
          return (dataStr === hojeStr && hora >= 6) || (dataStr === dataDiaSeguinteStr && hora < 6);
        } catch {
          return carro.data === hojeStr;
        }
      });

      // Buscar carros do dia anterior à data selecionada
      const { data: carrosOntem } = await supabase
        .from("carros_status")
        .select("id, created_at, data, status_carro")
        .gte("created_at", `${ontemStr}T00:00:00Z`)
        .lt("created_at", `${hojeStr}T00:00:00Z`);

      // Filtrar carros de ontem pela regra de 06:00
      const carrosOntemFiltrados = (carrosOntem || []).filter((carro) => {
        const ts = (carro.created_at || carro.data) as string | Date | null | undefined;
        if (!ts) return carro.data === ontemStr;
        try {
          const dataHora = ts instanceof Date ? ts : new Date(ts);
          if (isNaN(dataHora.getTime())) return carro.data === ontemStr;
          const dataStr = dataHora.toISOString().split('T')[0];
          const hora = dataHora.getUTCHours();
          const dataDiaSeguinte = new Date(ontemStr);
          dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1);
          const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0];
          return (dataStr === ontemStr && hora >= 6) || (dataStr === dataDiaSeguinteStr && hora < 6);
        } catch {
          return carro.data === ontemStr;
        }
      });

      // Remover duplicatas por ID antes de contar
      const notasHojeUnicas = Array.from(
        new Map(notasHojeFiltradas.map((nota: any) => [nota.id, nota])).values()
      );
      const notasOntemUnicas = Array.from(
        new Map(notasOntemFiltradas.map((nota: any) => [nota.id, nota])).values()
      );

      // Debug: Log para verificar contagem
      console.log('📊 Debug NFs Recebidas:', {
        periodo_selecionado: periodoSelecionado,
        data_atual_selecionada: dataAtual,
        data_fim: dataFim,
        hoje_str: hojeStr,
        ontem_str: ontemStr,
        total_buscado: todasNotasRecebidas?.length || 0,
        notas_hoje_filtradas: notasHojeFiltradas.length,
        notas_hoje_unicas: notasHojeUnicas.length,
        notas_ontem_filtradas: notasOntemFiltradas.length,
        notas_ontem_unicas: notasOntemUnicas.length,
        exemplo_data_entrada: notasHojeUnicas[0]?.data_entrada,
        data_inicio_busca: dataInicioBusca.toISOString(),
        data_fim_busca: dataFimBusca.toISOString()
      });

      // Calcular métricas (usar notas únicas após remover duplicatas)
      const nfsHoje = notasHojeUnicas.length;
      const nfsOntem = notasOntemUnicas.length;
      const nfsDiff = nfsHoje - nfsOntem;

      const carrosHojeCount = new Set(carrosHojeFiltrados.map(c => c.id)).size;
      const carrosOntemCount = new Set(carrosOntemFiltrados.map(c => c.id)).size;
      const carrosDiff = carrosHojeCount - carrosOntemCount;

      const volumesHoje = notasHojeFiltradas.reduce((acc, n) => acc + (Number(n.volumes) || 0), 0);
      const volumesOntem = notasOntemFiltradas.reduce((acc, n) => acc + (Number(n.volumes) || 0), 0);
      const volumesDiff = volumesHoje - volumesOntem;

      // Buscar sessões ativas (usuários únicos de hoje)
      const colaboradoresHoje = new Set<string>();
      notasHojeFiltradas.forEach((nota: any) => {
        if (nota.usuario) {
          colaboradoresHoje.add(nota.usuario);
        }
      });
      const sessoesHoje = colaboradoresHoje.size;

      // Buscar sessões de ontem
      const colaboradoresOntem = new Set<string>();
      notasOntemFiltradas.forEach((nota: any) => {
        if (nota.usuario) {
          colaboradoresOntem.add(nota.usuario);
        }
      });
      const sessoesOntem = colaboradoresOntem.size;
      const sessoesDiff = sessoesHoje - sessoesOntem;

      // Calcular volumes bipados (notas bipadas na embalagem)
      // Buscar todas as notas bipadas do período selecionado
      // Usar range amplo no campo data para garantir que capturamos todas
      const dataInicioBuscaBipadas = new Date(dataInicioBusca);
      dataInicioBuscaBipadas.setUTCHours(0, 0, 0, 0);
      const dataFimBuscaBipadas = new Date(dataFimBusca);
      dataFimBuscaBipadas.setUTCHours(0, 0, 0, 0);
      
      // Buscar por data (campo data da tabela) com range ampliado
      const { data: todasNotasBipadas, error: errorBipadas } = await supabase
        .from("embalagem_notas_bipadas")
        .select("id, volumes, data, timestamp_bipagem")
        .gte("data", dataInicioBuscaBipadas.toISOString().split('T')[0])
        .lte("data", dataFimBuscaBipadas.toISOString().split('T')[0]);

      if (errorBipadas) {
        console.error("Erro ao buscar notas bipadas:", errorBipadas);
      }

      // Filtrar notas bipadas de hoje - aplicar regra de 06:00 (igual ao Dashboard de Estatísticas)
      // REGRA: Dia X = notas bipadas das 06:00 de X até 05:59 de X+1
      const notasBipadasHoje = (todasNotasBipadas || []).filter((nota: any) => {
        const ts = (nota.timestamp_bipagem || nota.data) as string | Date | null | undefined
        const notaData = nota.data as string
        if (!notaData) return false

        if (!ts || ts === notaData) {
          // Sem timestamp válido, usar campo data
          // Incluir notas do dia selecionado ou do dia seguinte (podem ser da madrugada)
          const dataDiaSeguinte = new Date(hojeStr)
          dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
          const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0]
          return notaData === hojeStr || notaData === dataDiaSeguinteStr
        }

        try {
          const dataHora = ts instanceof Date ? new Date(ts) : new Date(ts)
          if (isNaN(dataHora.getTime())) {
            const dataDiaSeguinte = new Date(hojeStr)
            dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
            const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0]
            return notaData === hojeStr || notaData === dataDiaSeguinteStr
          }

          const dataStr = dataHora.toISOString().split('T')[0]
          const hora = dataHora.getUTCHours()
          const dataDiaSeguinte = new Date(hojeStr)
          dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
          const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0]

          // REGRA: Dia X = notas bipadas das 06:00 de X até 05:59 de X+1
          return (dataStr === hojeStr && hora >= 6) || (dataStr === dataDiaSeguinteStr && hora < 6)
        } catch {
          const dataDiaSeguinte = new Date(hojeStr)
          dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
          const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0]
          return notaData === hojeStr || notaData === dataDiaSeguinteStr
        }
      });

      // Filtrar notas bipadas de ontem - aplicar regra de 06:00
      const notasBipadasOntem = (todasNotasBipadas || []).filter((nota: any) => {
        const ts = (nota.timestamp_bipagem || nota.data) as string | Date | null | undefined
        const notaData = nota.data as string
        if (!notaData) return false

        if (!ts || ts === notaData) {
          const dataDiaSeguinte = new Date(ontemStr)
          dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
          const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0]
          return notaData === ontemStr || notaData === dataDiaSeguinteStr
        }

        try {
          const dataHora = ts instanceof Date ? new Date(ts) : new Date(ts)
          if (isNaN(dataHora.getTime())) {
            const dataDiaSeguinte = new Date(ontemStr)
            dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
            const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0]
            return notaData === ontemStr || notaData === dataDiaSeguinteStr
          }

          const dataStr = dataHora.toISOString().split('T')[0]
          const hora = dataHora.getUTCHours()
          const dataDiaSeguinte = new Date(ontemStr)
          dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
          const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0]

          // REGRA: Dia X = notas bipadas das 06:00 de X até 05:59 de X+1
          return (dataStr === ontemStr && hora >= 6) || (dataStr === dataDiaSeguinteStr && hora < 6)
        } catch {
          const dataDiaSeguinte = new Date(ontemStr)
          dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
          const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0]
          return notaData === ontemStr || notaData === dataDiaSeguinteStr
        }
      });

      // Remover duplicatas por ID (caso haja)
      const notasBipadasHojeUnicas = Array.from(
        new Map(notasBipadasHoje.map((nota: any) => [nota.id, nota])).values()
      );
      const notasBipadasOntemUnicas = Array.from(
        new Map(notasBipadasOntem.map((nota: any) => [nota.id, nota])).values()
      );

      const volumesBipadosHoje = notasBipadasHojeUnicas.reduce((acc, n: any) => {
        const vol = Number(n.volumes) || 0
        if (isNaN(vol)) {
          console.warn('⚠️ Volume inválido na nota bipada:', n.id, n.volumes)
          return acc
        }
        return acc + vol
      }, 0);
      const volumesBipadosOntem = notasBipadasOntemUnicas.reduce((acc, n: any) => {
        const vol = Number(n.volumes) || 0
        if (isNaN(vol)) {
          console.warn('⚠️ Volume inválido na nota bipada:', n.id, n.volumes)
          return acc
        }
        return acc + vol
      }, 0);
      const volumesBipadosDiff = volumesBipadosHoje - volumesBipadosOntem;

      // Debug: Log para verificar contagem de volumes bipados
      console.log('📊 Debug Volumes Bipados:', {
        total_buscado: todasNotasBipadas?.length || 0,
        notas_hoje_filtradas: notasBipadasHoje.length,
        notas_hoje_unicas: notasBipadasHojeUnicas.length,
        volumes_bipados_hoje: volumesBipadosHoje,
        notas_ontem_filtradas: notasBipadasOntem.length,
        notas_ontem_unicas: notasBipadasOntemUnicas.length,
        volumes_bipados_ontem: volumesBipadosOntem,
        hoje_str: hojeStr,
        exemplo_nota: notasBipadasHojeUnicas[0],
        soma_volumes_manual: notasBipadasHojeUnicas.slice(0, 10).reduce((acc, n: any) => acc + (Number(n.volumes) || 0), 0)
      });

      // Calcular taxa de divergências baseada em notas_fiscais bipadas com divergência
      // Buscar notas bipadas com numero_nf para relacionar com notas_fiscais
      const pageSizeNotasBipadasCompleta = 1000;
      let offsetNotasBipadasCompleta = 0;
      let hasMoreNotasBipadasCompleta = true;
      const todasNotasBipadasCompletaArray: any[] = [];
      
      while (hasMoreNotasBipadasCompleta) {
        const { data: notasPage, error: errorPage } = await supabase
          .from("embalagem_notas_bipadas")
          .select("id, numero_nf")
          .gte("data", dataInicioBuscaBipadas.toISOString().split('T')[0])
          .lte("data", dataFimBuscaBipadas.toISOString().split('T')[0])
          .range(offsetNotasBipadasCompleta, offsetNotasBipadasCompleta + pageSizeNotasBipadasCompleta - 1)
          .order("data", { ascending: true });
        
        if (errorPage) {
          console.error("Erro ao buscar notas bipadas completas:", errorPage);
          break;
        }
        
        if (notasPage && notasPage.length > 0) {
          todasNotasBipadasCompletaArray.push(...notasPage);
          offsetNotasBipadasCompleta += pageSizeNotasBipadasCompleta;
          hasMoreNotasBipadasCompleta = notasPage.length === pageSizeNotasBipadasCompleta;
        } else {
          hasMoreNotasBipadasCompleta = false;
        }
      }
      
      // Obter números de NF únicos das notas bipadas de hoje e ontem
      const numerosNFBipadasHoje = new Set<string>();
      const numerosNFBipadasOntem = new Set<string>();
      
      notasBipadasHojeUnicas.forEach((nota: any) => {
        const notaCompleta = todasNotasBipadasCompletaArray.find((n: any) => n.id === nota.id);
        if (notaCompleta && notaCompleta.numero_nf) {
          numerosNFBipadasHoje.add(notaCompleta.numero_nf);
        }
      });
      
      notasBipadasOntemUnicas.forEach((nota: any) => {
        const notaCompleta = todasNotasBipadasCompletaArray.find((n: any) => n.id === nota.id);
        if (notaCompleta && notaCompleta.numero_nf) {
          numerosNFBipadasOntem.add(notaCompleta.numero_nf);
        }
      });
      
      // Buscar notas fiscais que foram bipadas hoje e ontem
      const numerosNFBipadasHojeArray = Array.from(numerosNFBipadasHoje);
      const numerosNFBipadasOntemArray = Array.from(numerosNFBipadasOntem);
      
      // Buscar notas fiscais de hoje com paginação
      const notasFiscaisBipadasHojeIds = new Set<string>();
      if (numerosNFBipadasHojeArray.length > 0) {
        const pageSizeNotasFiscais = 1000;
        let offsetNotasFiscais = 0;
        let hasMoreNotasFiscais = true;
        
        while (hasMoreNotasFiscais && offsetNotasFiscais < numerosNFBipadasHojeArray.length) {
          const numerosNFPage = numerosNFBipadasHojeArray.slice(offsetNotasFiscais, offsetNotasFiscais + pageSizeNotasFiscais);
          
          const { data: notasFiscaisPage, error: errorNotasFiscaisPage } = await supabase
            .from("notas_fiscais")
            .select("id, numero_nf")
            .in("numero_nf", numerosNFPage);
          
          if (errorNotasFiscaisPage) {
            console.error("Erro ao buscar notas fiscais de hoje:", errorNotasFiscaisPage);
            break;
          }
          
          if (notasFiscaisPage && notasFiscaisPage.length > 0) {
            notasFiscaisPage.forEach((nf: any) => {
              notasFiscaisBipadasHojeIds.add(nf.id);
            });
          }
          
          offsetNotasFiscais += pageSizeNotasFiscais;
          hasMoreNotasFiscais = offsetNotasFiscais < numerosNFBipadasHojeArray.length;
        }
      }
      
      // Buscar notas fiscais de ontem com paginação
      const notasFiscaisBipadasOntemIds = new Set<string>();
      if (numerosNFBipadasOntemArray.length > 0) {
        const pageSizeNotasFiscais = 1000;
        let offsetNotasFiscais = 0;
        let hasMoreNotasFiscais = true;
        
        while (hasMoreNotasFiscais && offsetNotasFiscais < numerosNFBipadasOntemArray.length) {
          const numerosNFPage = numerosNFBipadasOntemArray.slice(offsetNotasFiscais, offsetNotasFiscais + pageSizeNotasFiscais);
          
          const { data: notasFiscaisPage, error: errorNotasFiscaisPage } = await supabase
            .from("notas_fiscais")
            .select("id, numero_nf")
            .in("numero_nf", numerosNFPage);
          
          if (errorNotasFiscaisPage) {
            console.error("Erro ao buscar notas fiscais de ontem:", errorNotasFiscaisPage);
            break;
          }
          
          if (notasFiscaisPage && notasFiscaisPage.length > 0) {
            notasFiscaisPage.forEach((nf: any) => {
              notasFiscaisBipadasOntemIds.add(nf.id);
            });
          }
          
          offsetNotasFiscais += pageSizeNotasFiscais;
          hasMoreNotasFiscais = offsetNotasFiscais < numerosNFBipadasOntemArray.length;
        }
      }
      
      // Buscar divergências do período selecionado
      const dataInicioBuscaDivergencias = new Date(dataInicioBusca);
      dataInicioBuscaDivergencias.setUTCHours(0, 0, 0, 0);
      const dataFimBuscaDivergencias = new Date(dataFimBusca);
      dataFimBuscaDivergencias.setUTCHours(0, 0, 0, 0);
      
      // Buscar divergências com paginação
      const pageSizeDivergencias = 1000;
      let offsetDivergencias = 0;
      let hasMoreDivergencias = true;
      const todasDivergenciasArray: any[] = [];
      
      while (hasMoreDivergencias) {
        const { data: divergenciasPage, error: errorDivergenciasPage } = await supabase
          .from("divergencias")
          .select("id, nota_fiscal_id, created_at")
          .gte("created_at", dataInicioBuscaDivergencias.toISOString())
          .lt("created_at", dataFimBuscaDivergencias.toISOString())
          .range(offsetDivergencias, offsetDivergencias + pageSizeDivergencias - 1)
          .order("created_at", { ascending: true });
        
        if (errorDivergenciasPage) {
          console.error("Erro ao buscar divergências:", errorDivergenciasPage);
          break;
        }
        
        if (divergenciasPage && divergenciasPage.length > 0) {
          todasDivergenciasArray.push(...divergenciasPage);
          offsetDivergencias += pageSizeDivergencias;
          hasMoreDivergencias = divergenciasPage.length === pageSizeDivergencias;
        } else {
          hasMoreDivergencias = false;
        }
      }
      
      // Obter IDs das notas fiscais com divergência
      const notasFiscaisComDivergenciaIds = new Set(
        todasDivergenciasArray
          .map((d: any) => d.nota_fiscal_id)
          .filter((id: any) => id != null)
      );
      
      // Calcular taxa de divergências: (notas fiscais bipadas com divergência / total de notas fiscais bipadas) * 100
      const totalNotasFiscaisBipadasHoje = notasFiscaisBipadasHojeIds.size;
      const totalNotasFiscaisBipadasOntem = notasFiscaisBipadasOntemIds.size;
      
      const notasFiscaisBipadasHojeComDivergencia = Array.from(notasFiscaisBipadasHojeIds).filter(id => 
        notasFiscaisComDivergenciaIds.has(id)
      ).length;
      
      const notasFiscaisBipadasOntemComDivergencia = Array.from(notasFiscaisBipadasOntemIds).filter(id => 
        notasFiscaisComDivergenciaIds.has(id)
      ).length;
      
      const taxaDivergenciasHoje = totalNotasFiscaisBipadasHoje > 0 
        ? (notasFiscaisBipadasHojeComDivergencia / totalNotasFiscaisBipadasHoje) * 100 
        : 0;
      const taxaDivergenciasOntem = totalNotasFiscaisBipadasOntem > 0 
        ? (notasFiscaisBipadasOntemComDivergencia / totalNotasFiscaisBipadasOntem) * 100 
        : 0;
      const taxaDivergenciasDiff = taxaDivergenciasHoje - taxaDivergenciasOntem;
      
      // Debug: Log para verificar cálculo de divergências
      console.log('📊 Debug Taxa de Divergências:', {
        total_notas_fiscais_bipadas_hoje: totalNotasFiscaisBipadasHoje,
        notas_fiscais_bipadas_hoje_com_divergencia: notasFiscaisBipadasHojeComDivergencia,
        taxa_divergencias_hoje: taxaDivergenciasHoje,
        total_notas_fiscais_bipadas_ontem: totalNotasFiscaisBipadasOntem,
        notas_fiscais_bipadas_ontem_com_divergencia: notasFiscaisBipadasOntemComDivergencia,
        taxa_divergencias_ontem: taxaDivergenciasOntem,
        total_divergencias_buscadas: todasDivergenciasArray.length
      });

      // Calcular NFs pendentes (notas com status "deu entrada")
      // Buscar todas as notas com status "deu entrada" do período selecionado
      const dataInicioBuscaPendentes = new Date(dataInicioBusca);
      dataInicioBuscaPendentes.setUTCHours(0, 0, 0, 0);
      const dataFimBuscaPendentes = new Date(dataFimBusca);
      dataFimBuscaPendentes.setUTCHours(0, 0, 0, 0);
      
      const { data: todasNotasPendentes, error: errorPendentes } = await supabase
        .from("notas_consolidado")
        .select("id, volumes, data_entrada, status, usuario")
        .eq("status", "deu entrada")
        .gte("data_entrada", dataInicioBuscaPendentes.toISOString())
        .lt("data_entrada", dataFimBuscaPendentes.toISOString());

      if (errorPendentes) {
        console.error("Erro ao buscar notas pendentes:", errorPendentes);
      }

      // Filtrar notas pendentes de hoje (status "deu entrada" e data_entrada = hoje)
      const notasPendentesHojeFiltradas = (todasNotasPendentes || []).filter((nota) => {
        const ts = nota.data_entrada as string | Date | null | undefined;
        if (!ts) return false;
        try {
          const dataHora = ts instanceof Date ? ts : new Date(ts);
          if (isNaN(dataHora.getTime())) return false;
          
          // Extrair a data no formato YYYY-MM-DD usando o timezone local
          const ano = dataHora.getFullYear();
          const mes = String(dataHora.getMonth() + 1).padStart(2, '0');
          const dia = String(dataHora.getDate()).padStart(2, '0');
          const dataStr = `${ano}-${mes}-${dia}`;
          
          return dataStr === hojeStr;
        } catch {
          return false;
        }
      });

      // Filtrar notas pendentes de ontem (status "deu entrada" e data_entrada = ontem)
      const notasPendentesOntemFiltradas = (todasNotasPendentes || []).filter((nota) => {
        const ts = nota.data_entrada as string | Date | null | undefined;
        if (!ts) return false;
        try {
          const dataHora = ts instanceof Date ? ts : new Date(ts);
          if (isNaN(dataHora.getTime())) return false;
          
          // Extrair a data no formato YYYY-MM-DD usando o timezone local
          const ano = dataHora.getFullYear();
          const mes = String(dataHora.getMonth() + 1).padStart(2, '0');
          const dia = String(dataHora.getDate()).padStart(2, '0');
          const dataStr = `${ano}-${mes}-${dia}`;
          
          return dataStr === ontemStr;
        } catch {
          return false;
        }
      });

      const nfsPendentesHoje = notasPendentesHojeFiltradas.length;
      const nfsPendentesOntem = notasPendentesOntemFiltradas.length;
      const nfsPendentesDiff = nfsPendentesHoje - nfsPendentesOntem;

      // Calcular eficiência operacional (baseada em carros finalizados)
      const carrosFinalizadosHoje = carrosHojeFiltrados.filter(c => c.status_carro === 'finalizado').length;
      const eficienciaHoje = carrosHojeCount > 0 ? (carrosFinalizadosHoje / carrosHojeCount) * 100 : 0;
      const carrosFinalizadosOntem = carrosOntemFiltrados.filter(c => c.status_carro === 'finalizado').length;
      const eficienciaOntem = carrosOntemCount > 0 ? (carrosFinalizadosOntem / carrosOntemCount) * 100 : 0;
      const eficienciaDiff = eficienciaHoje - eficienciaOntem;

      // Criar array de KPIs com dados reais
      // Ordem: 1. NFs Recebidas, 2. NFs Pendentes, 3. Taxa de Divergências, 4. Volumes Processados
      const kpis: KPIData[] = [
        {
          id: "nfs-recebidas",
          title: "NFs Recebidas Hoje",
          value: nfsHoje.toLocaleString('pt-BR'),
          description: "notas fiscais",
          trend: { 
            value: `${nfsDiff >= 0 ? '+' : ''}${nfsDiff} vs ontem`, 
            isPositive: nfsDiff >= 0 
          },
          icon: <Truck className="h-6 w-6" />,
          color: "text-blue-600",
        },
        {
          id: "nfs-pendentes",
          title: "NFs Pendentes",
          value: nfsPendentesHoje.toString(),
          description: "",
          trend: { 
            value: `${nfsPendentesDiff >= 0 ? '+' : ''}${nfsPendentesDiff} vs ontem`, 
            isPositive: nfsPendentesDiff < 0 
          },
          icon: <AlertTriangle className="h-6 w-6" />,
          color: "text-red-600",
        },
        {
          id: "taxa-divergencias",
          title: "Taxa de Divergências",
          value: `${taxaDivergenciasHoje.toFixed(1)}%`,
          description: "",
          trend: { 
            value: `${taxaDivergenciasDiff >= 0 ? '+' : ''}${taxaDivergenciasDiff.toFixed(1)}% vs ontem`, 
            isPositive: taxaDivergenciasDiff < 0 
          },
          icon: <AlertTriangle className="h-6 w-6" />,
          color: "text-yellow-600",
        },
        {
          id: "volumes-processados",
          title: "Volumes Processados",
          value: volumesHoje.toLocaleString('pt-BR'),
          description: "hoje",
          trend: { 
            value: `${volumesDiff >= 0 ? '+' : ''}${volumesDiff} vs ontem`, 
            isPositive: volumesDiff >= 0 
          },
          icon: <Warehouse className="h-6 w-6" />,
          color: "text-orange-600",
        },
        {
          id: "carros-produzidos",
          title: "Carros Produzidos",
          value: carrosHojeCount.toString(),
          description: "hoje",
          trend: { 
            value: `${carrosDiff >= 0 ? '+' : ''}${carrosDiff} vs ontem`, 
            isPositive: carrosDiff >= 0 
          },
          icon: <Package className="h-6 w-6" />,
          color: "text-green-600",
        },
        {
          id: "volumes-bipados",
          title: "Volumes Bipados",
          value: volumesBipadosHoje.toLocaleString('pt-BR'),
          description: "hoje",
          trend: { 
            value: `${volumesBipadosDiff >= 0 ? '+' : ''}${volumesBipadosDiff.toLocaleString('pt-BR')} vs ontem`, 
            isPositive: volumesBipadosDiff >= 0 
          },
          icon: <Package className="h-6 w-6" />,
          color: "text-blue-600",
        },
        {
          id: "eficiencia-operacional",
          title: "Eficiência Operacional",
          value: `${eficienciaHoje.toFixed(1)}%`,
          description: "",
          trend: { 
            value: `${eficienciaDiff >= 0 ? '+' : ''}${eficienciaDiff.toFixed(1)}% vs ontem`, 
            isPositive: eficienciaDiff >= 0 
          },
          icon: <BarChart3 className="h-6 w-6" />,
          color: "text-green-600",
        },
        {
          id: "sessoes-ativas",
          title: "Sessões Ativas",
          value: sessoesHoje.toString(),
          description: "colaboradores",
          trend: { 
            value: `${sessoesDiff >= 0 ? '+' : ''}${sessoesDiff} vs ontem`, 
            isPositive: sessoesDiff >= 0 
          },
          icon: <Users className="h-6 w-6" />,
          color: "text-purple-600",
        },

      ];

      setKpiDataReal(kpis);
    } catch (error) {
      console.error("Erro ao carregar KPIs:", error);
      // Em caso de erro, usar dados padrão
      setKpiDataReal([]);
    } finally {
      setLoadingKPIs(false);
    }
  };

  // Dados dos KPIs - Dashboard Central ProFlow (fallback)
  // Ordem: 1. NFs Recebidas, 2. NFs Pendentes, 3. Taxa de Divergências, 4. Volumes Processados
  const kpiData: KPIData[] = kpiDataReal.length > 0 ? kpiDataReal : [
    {
      id: "nfs-recebidas",
      title: "NFs Recebidas Hoje",
      value: "0",
      description: "notas fiscais",
      trend: { value: "Carregando...", isPositive: true },
      icon: <Truck className="h-6 w-6" />,
      color: "text-blue-600",
    },
    {
      id: "nfs-pendentes",
      title: "NFs Pendentes",
      value: "0",
      description: "",
      trend: { value: "Carregando...", isPositive: false },
      icon: <AlertTriangle className="h-6 w-6" />,
      color: "text-red-600",
    },
    {
      id: "taxa-divergencias",
      title: "Taxa de Divergências",
      value: "0%",
      description: "",
      trend: { value: "Carregando...", isPositive: false },
      icon: <AlertTriangle className="h-6 w-6" />,
      color: "text-yellow-600",
    },
    {
      id: "volumes-processados",
      title: "Volumes Processados",
      value: "0",
      description: "hoje",
      trend: { value: "Carregando...", isPositive: true },
      icon: <Warehouse className="h-6 w-6" />,
      color: "text-orange-600",
    },
    {
      id: "carros-produzidos",
      title: "Carros Produzidos",
      value: "0",
      description: "hoje",
      trend: { value: "Carregando...", isPositive: true },
      icon: <Package className="h-6 w-6" />,
      color: "text-green-600",
    },
    {
      id: "sessoes-ativas",
      title: "Sessões Ativas",
      value: "0",
      description: "colaboradores",
      trend: { value: "Carregando...", isPositive: true },
      icon: <Users className="h-6 w-6" />,
      color: "text-purple-600",
    },
    {
      id: "volumes-bipados",
      title: "Volumes Bipados",
      value: "0",
      description: "hoje",
      trend: { value: "Carregando...", isPositive: true },
      icon: <Package className="h-6 w-6" />,
      color: "text-blue-600",
    },
    {
      id: "eficiencia-operacional",
      title: "Eficiência Operacional",
      value: "0%",
      description: "",
      trend: { value: "Carregando...", isPositive: true },
      icon: <BarChart3 className="h-6 w-6" />,
      color: "text-green-600",
    },
  ];

  // Dados dos KPIs - Embalagem ProFlow
  const kpiEmbalagemData: KPIData[] = [
    {
      id: "carros-embalagem",
      title: "Carros em Embalagem",
      value: "12",
      description: "ativos",
      trend: { value: "+2 vs ontem", isPositive: true },
      icon: <Package className="h-6 w-6" />,
      color: "text-blue-600",
    },
    {
      id: "nfs-embaladas",
      title: "NFs Embaladas Hoje",
      value: "189",
      description: "notas",
      trend: { value: "+23 vs ontem", isPositive: true },
      icon: <CheckCircle className="h-6 w-6" />,
      color: "text-green-600",
    },
    {
      id: "tempo-medio-embalagem",
      title: "Tempo Médio Embalagem",
      value: "2.4h",
      description: "por carro",
      trend: { value: "-0.2h vs ontem", isPositive: false },
      icon: <Clock className="h-6 w-6" />,
      color: "text-purple-600",
    },
    {
      id: "taxa-finalizacao",
      title: "Taxa de Finalização",
      value: "94.2%",
      description: "carros finalizados",
      trend: { value: "+1.8% vs ontem", isPositive: true },
      icon: <Activity className="h-6 w-6" />,
      color: "text-orange-600",
    },
  ];

  // Dados dos alertas
  const alertData: AlertData[] = [
    {
      id: "estoque-classe-c",
      type: "error",
      icon: <AlertTriangle className="h-5 w-5" />,
      message: "Estoque Classe C Alto - 15% do estoque em produtos de baixo giro",
    },
    {
      id: "tempo-resposta-sac",
      type: "warning",
      icon: <Clock className="h-5 w-5" />,
      message: "Tempo de Resposta SAC - Acima da meta em 10 minutos",
    },
    {
      id: "otd-excelente",
      type: "success",
      icon: <TrendingUp className="h-5 w-5" />,
      message: "OTD Excelente - Meta superada em 1.8%",
    },
  ];

  // Dados de performance por área
  const performanceAreas: PerformanceArea[] = [
    {
      name: "Armazenagem",
      score: 92,
      trend: { value: "+3% tendência", isPositive: true },
      icon: <Package className="h-5 w-5" />,
      color: "text-amber-600",
    },
    {
      name: "Transporte",
      score: 88,
      trend: { value: "+2% tendência", isPositive: true },
      icon: <Truck className="h-5 w-5" />,
      color: "text-yellow-600",
    },
    {
      name: "Operações",
      score: 95,
      trend: { value: "+1% tendência", isPositive: true },
      icon: <Settings className="h-5 w-5" />,
      color: "text-purple-600",
    },
  ];

  // Dados do gráfico de performance por área
  const chartData = [
    { name: "Expedição", score: 90 },
    { name: "Recebimento", score: 85 },
    { name: "Inventário", score: 95 },
    { name: "Custos", score: 88 },
    { name: "Embalagem", score: 92 },
  ];

  // Dados para gráficos da aba Embalagem
  const acuracidadeInventarioData = [
    { name: "Rua: Duques de Caxias", score: 99.2 },
    { name: "Rua: Rio de Janeiro", score: 98.5 },
    { name: "Controlado", score: 98.1 },
  ];

  const tipoCargaData = [
    { name: "CRDK ES", value: 60, color: "bg-blue-600" },
    { name: "Grandes Contas", value: 25, color: "bg-green-600" },
    { name: "Perfumaria", value: 15, color: "bg-orange-600" },
  ];

  const ocupacaoFornecedorData = [
    { fornecedor: "Fornecedor EMS", ocupacao: 85, posicoes: 1245,  color: "text-green-600" },
    { fornecedor: "Fornecedor ACHE", ocupacao: 72, posicoes: 892,  color: "text-green-600" },
    { fornecedor: "Fornecedor LABOFARMA", ocupacao: 68, posicoes: 567,  color: "text-orange-600" },
    { fornecedor: "Fornecedor MERCK", ocupacao: 45, posicoes: 334,  color: "text-red-600" },
  ];

  // Dados dos KPIs - Recebimento ProFlow
  const kpiRecebimentoData: KPIData[] = [
    {
      id: "nfs-bipadas",
      title: "NFs Bipadas Hoje",
      value: "247",
      description: "notas fiscais",
      trend: { value: "+18 vs ontem", isPositive: true },
      icon: <Truck className="h-6 w-6" />,
      color: "text-green-600",
    },
    {
      id: "volumes-recebidos",
      title: "Volumes Recebidos",
      value: "1.847",
      description: "hoje",
      trend: { value: "+156 vs ontem", isPositive: true },
      icon: <Package className="h-6 w-6" />,
      color: "text-blue-600",
    },
    {
      id: "taxa-divergencias",
      title: "Taxa de Divergências",
      value: "2.1%",
      description: "",
      trend: { value: "-0.3% vs ontem", isPositive: false },
      icon: <AlertTriangle className="h-6 w-6" />,
      color: "text-yellow-600",
    },
    {
      id: "tempo-medio-bipagem",
      title: "Tempo Médio Bipagem",
      value: "1.2min",
      description: "por NF",
      trend: { value: "-0.1min vs ontem", isPositive: false },
      icon: <Clock className="h-6 w-6" />,
      color: "text-purple-600",
    },
    {
      id: "ocupacao-cd",
      title: "Ocupação do CD",
      value: "82%",
      description: "da capacidade",
      trend: { value: "+5% vs ontem", isPositive: true },
      icon: <Warehouse className="h-6 w-6" />,
      color: "text-orange-600",
    },
  ];

  // Dados para gráficos da aba Recebimento
  const indiceAvariasData = [
    { mes: "Jan", valor: 0.8 },
    { mes: "Fev", valor: 0.6 },
    { mes: "Mar", valor: 0.4 },
    { mes: "Abr", valor: 0.3 },
    { mes: "Mai", valor: 0.2 },
    { mes: "Jun", valor: 0.3 },
  ];

  const performanceRecebimentoData = [
    { categoria: "No Prazo", percentual: 96.8, color: "bg-green-500" },
    { categoria: "1 Dia Atraso", percentual: 2.8, color: "bg-orange-500" },
    { categoria: "+2 Dias Atraso", percentual: 0.4, color: "bg-red-500" },
  ];

  const nivelServicoFornecedorData = [
    { fornecedor: "Fornecedor Alpha", nivelServico: 98.5, entregas: 1245, custoMedio: 2850, color: "text-green-600" },
    { fornecedor: "Fornecedor Beta", nivelServico: 97.2, entregas: 892, custoMedio: 2420, color: "text-green-600" },
    { fornecedor: "Fornecedor Gamma", nivelServico: 96.8, entregas: 567, custoMedio: 3850, color: "text-green-600" },
    { fornecedor: "Fornecedor Delta", nivelServico: 95.9, entregas: 334, custoMedio: 4120, color: "text-green-600" },
  ];

  // Dados dos KPIs - Custos ProFlow
  const kpiCustosData: KPIData[] = [
    {
      id: "valor-nfs-processadas",
      title: "Valor NFs Processadas",
      value: "R$ 2.8M",
      description: "hoje",
      trend: { value: "+R$ 150k vs ontem", isPositive: true },
      icon: <DollarSign className="h-6 w-6" />,
      color: "text-green-600",
    },
    {
      id: "custo-operacional",
      title: "Custo Operacional",
      value: "8.2%",
      description: "do faturamento",
      trend: { value: "-0.5% vs ontem", isPositive: false },
      icon: <BarChart3 className="h-6 w-6" />,
      color: "text-blue-600",
    },
    {
      id: "economia-processo",
      title: "Economia no Processo",
      value: "R$ 89k",
      description: "este mês",
      trend: { value: "+R$ 12k vs mês anterior", isPositive: true },
      icon: <TrendingUp className="h-6 w-6" />,
      color: "text-purple-600",
    },
    {
      id: "custo-por-nf",
      title: "Custo por NF",
      value: "R$ 7.70",
      description: "processada",
      trend: { value: "-R$ 0.40 vs ontem", isPositive: false },
      icon: <Package className="h-6 w-6" />,
      color: "text-orange-600",
    },
  ];

  // Dados para gráficos da aba Custos
  const custoLogisticoData = [
    { mes: "Jan", valor: 8.5 },
    { mes: "Fev", valor: 8.8 },
    { mes: "Mar", valor: 8.2 },
    { mes: "Abr", valor: 8.0 },
    { mes: "Mai", valor: 7.8 },
    { mes: "Jun", valor: 8.2 },
  ];

  const roiMelhoriasData = [
    { melhoria: "Otimização de Rotas", roi: 245, color: "text-green-600" },
    { melhoria: "Automação WMS", roi: 189, color: "text-blue-600" },
    { melhoria: "Gestão de Estoque", roi: 156, color: "text-purple-600" },
    { melhoria: "Manutenção Preditiva", roi: 134, color: "text-orange-600" },
  ];

  const valorEstoqueABCData = [
    { classe: "Classe A", valor: 1680000, percentual: 60, giro: 15.2 },
    { classe: "Classe B", valor: 700000, percentual: 25, giro: 8.7 },
    { classe: "Classe C", valor: 420000, percentual: 15, giro: 3.1 },
  ];

  const gastosOperacionaisData = [
    { categoria: "Combustível", valor: 45890, variacao: 5.2, percentual: 42, color: "text-red-600" },
    { categoria: "Manutenção", valor: 12350, variacao: -2.1, percentual: 11, color: "text-green-600" },
    { categoria: "Pneus", valor: 8750, variacao: 8.7, percentual: 8, color: "text-red-600" },
    { categoria: "Pedágios", valor: 6420, variacao: 1.3, percentual: 6, color: "text-red-600" },
  ];

  const resumoFinanceiroData = [
    { titulo: "Receita Logística", valor: 2847230, variacao: 12.3, isPositive: true, color: "text-green-600" },
    { titulo: "Custos Operacionais", valor: 233472, variacao: -3.1, isPositive: false, color: "text-red-600" },
    { titulo: "Margem Líquida", valor: 2613758, variacao: 15.7, isPositive: true, color: "text-green-600" },
  ];

  // Dados dos KPIs - Inventário ProFlow
  const kpiOperacoesData: KPIData[] = [
    {
      id: "nfs-inventario",
      title: "NFs em Inventário",
      value: "58",
      description: "pendentes",
      trend: { value: "-8 vs ontem", isPositive: false },
      icon: <Warehouse className="h-6 w-6" />,
      color: "text-blue-600",
    },
    {
      id: "volumes-inventario",
      title: "Volumes em Inventário",
      value: "1.247",
      description: "unidades",
      trend: { value: "-156 vs ontem", isPositive: false },
      icon: <Package className="h-6 w-6" />,
      color: "text-green-600",
    },
    {
      id: "tempo-medio-inventario",
      title: "Tempo Médio Inventário",
      value: "2.4h",
      description: "por NF",
      trend: { value: "-0.2h vs ontem", isPositive: false },
      icon: <Clock className="h-6 w-6" />,
      color: "text-purple-600",
    },
    {
      id: "taxa-processamento",
      title: "Taxa de Processamento",
      value: "94.2%",
      description: "NFs processadas",
      trend: { value: "+1.8% vs ontem", isPositive: true },
      icon: <Activity className="h-6 w-6" />,
      color: "text-orange-600",
    },
  ];

  // Dados para gráficos da aba Operações
  const tempoCarregamentoData = [
    { tipo: "Carreta", tempo: 2.5 },
    { tipo: "Bitrem", tempo: 2.8 },
    { tipo: "Van", tempo: 1.2 },
    { tipo: "Caminhão", tempo: 1.8 },
  ];

  const leadTimeProcessoData = [
    { processo: "Recebimento", tempo: 45 },
    { processo: "Conferência", tempo: 30 },
    { processo: "Armazenagem", tempo: 20 },
    { processo: "Picking", tempo: 60 },
    { processo: "Expedição", tempo: 55 },
  ];

  const distribuicaoAtividadesData = [
    { atividade: "Picking", percentual: 45, color: "bg-blue-500" },
    { atividade: "Packing", percentual: 25, color: "bg-green-500" },
    { atividade: "Expedição", percentual: 30, color: "bg-orange-500" },
  ];

  const produtividadeOperadorData = [
    { operador: "João Silva", produtividade: 147, tempoMedio: 8.5, eficiencia: 98, color: "bg-green-100 dark:bg-green-900/20" },
    { operador: "Maria Santos", produtividade: 152, tempoMedio: 7.2, eficiencia: 99, color: "bg-green-100 dark:bg-green-900/20" },
    { operador: "Pedro Costa", produtividade: 134, tempoMedio: 9.1, eficiencia: 88, color: "bg-green-100 dark:bg-green-900/20" },
    { operador: "Ana Oliveira", produtividade: 143, tempoMedio: 7.8, eficiencia: 95, color: "bg-green-100 dark:bg-green-900/20" },
  ];

  // Dados dos KPIs - Performance Geral dos Setores
  const kpiPerformanceData: KPIData[] = [
    {
      id: "performance-geral",
      title: "Performance Geral",
      value: "94.2%",
      description: "índice consolidado",
      trend: { value: "+2.1% vs anterior", isPositive: true },
      icon: <BarChart3 className="h-6 w-6" />,
      color: "text-blue-600",
    },
    {
      id: "eficiencia-recebimento",
      title: "Eficiência Recebimento",
      value: "96.8%",
      description: "",
      trend: { value: "+1.2% vs anterior", isPositive: true },
      icon: <Truck className="h-6 w-6" />,
      color: "text-green-600",
    },
    {
      id: "eficiencia-embalagem",
      title: "Eficiência Embalagem",
      value: "92.4%",
      description: "",
      trend: { value: "+0.8% vs anterior", isPositive: true },
      icon: <Package className="h-6 w-6" />,
      color: "text-purple-600",
    },
    {
      id: "eficiencia-custos",
      title: "Eficiência Custos",
      value: "89.7%",
      description: "",
      trend: { value: "+1.5% vs anterior", isPositive: true },
      icon: <DollarSign className="h-6 w-6" />,
      color: "text-orange-600",
    },
    {
      id: "eficiencia-inventario",
      title: "Eficiência Inventário",
      value: "91.3%",
      description: "",
      trend: { value: "+0.9% vs anterior", isPositive: true },
      icon: <Warehouse className="h-6 w-6" />,
      color: "text-indigo-600",
    },
  ];

  // Dados para gráficos da aba Performance
  const indiceReclamacoesRegiaoData = [
    { regiao: "Sudeste", indice: 1.2 },
    { regiao: "Sul", indice: 0.8 },
    { regiao: "Nordeste", indice: 2.1 },
    { regiao: "Norte", indice: 1.5 },
    { regiao: "Centro-Oeste", indice: 1.0 },
  ];

  const satisfacaoClienteData = [
    { nivel: "Excelente (5 estrelas)", percentual: 68, color: "bg-green-500" },
    { nivel: "Bom (4 estrelas)", percentual: 22, color: "bg-blue-500" },
    { nivel: "Regular (3 estrelas)", percentual: 7, color: "bg-yellow-500" },
    { nivel: "Ruim (1-2 estrelas)", percentual: 3, color: "bg-red-500" },
  ];

  const statusTicketsData = [
    { status: "Abertos", quantidade: 23, color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400" },
    { status: "Em Andamento", quantidade: 45, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400" },
    { status: "Resolvidos", quantidade: 892, color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" },
  ];

  const canaisAtendimentoData = [
    { canal: "Telefone", percentual: 45 },
    { canal: "E-mail", percentual: 32 },
    { canal: "WhatsApp", percentual: 23 },
  ];

  const tempoResolucaoData = [
    { prioridade: "Crítico", tempo: "30min", color: "text-red-600" },
    { prioridade: "Alto", tempo: "2h", color: "text-orange-600" },
    { prioridade: "Médio", tempo: "8h", color: "text-yellow-600" },
    { prioridade: "Baixo", tempo: "24h", color: "text-green-600" },
  ];

  // Dados de Colaboradores em Destaque
  const colaboradoresDestaqueData = [
    {
      nome: "Maria Santos",
      setor: "Recebimento",
      performance: 98.5,
      nfsProcessadas: 156,
      tempoMedio: 1.1,
      destaque: "Melhor tempo de bipagem",
      color: "bg-green-100 dark:bg-green-900/20",
      textColor: "text-green-800 dark:text-green-400"
    },
    {
      nome: "João Silva",
      setor: "Embalagem",
      performance: 96.8,
      carrosProduzidos: 12,
      tempoMedio: 2.2,
      destaque: "Maior produtividade",
      color: "bg-blue-100 dark:bg-blue-900/20",
      textColor: "text-blue-800 dark:text-blue-400"
    },
    {
      nome: "Ana Oliveira",
      setor: "Custos",
      performance: 94.2,
      relatoriosGerados: 23,
      tempoMedio: 1.8,
      destaque: "Menor taxa de erro",
      color: "bg-purple-100 dark:bg-purple-900/20",
      textColor: "text-purple-800 dark:text-purple-400"
    },
    {
      nome: "Pedro Costa",
      setor: "Inventário",
      performance: 92.7,
      nfsProcessadas: 89,
      tempoMedio: 2.1,
      destaque: "Maior precisão",
      color: "bg-orange-100 dark:bg-orange-900/20",
      textColor: "text-orange-800 dark:text-orange-400"
    },
  ];

  // Dados dos KPIs - Relatórios (dentro de Recebimento)
  const kpiRelatoriosData: KPIData[] = [
    {
      id: "relatorios-gerados",
      title: "Relatórios Gerados",
      value: "47",
      description: "hoje",
      trend: { value: "+5 vs ontem", isPositive: true },
      icon: <BarChart3 className="h-6 w-6" />,
      color: "text-blue-600",
    },
    {
      id: "sessoes-finalizadas",
      title: "Sessões Finalizadas",
      value: "12",
      description: "hoje",
      trend: { value: "+2 vs ontem", isPositive: true },
      icon: <CheckCircle className="h-6 w-6" />,
      color: "text-green-600",
    },
    {
      id: "tempo-geracao-relatorio",
      title: "Tempo Geração Relatório",
      value: "2.1s",
      description: "médio",
      trend: { value: "-0.3s vs ontem", isPositive: false },
      icon: <Clock className="h-6 w-6" />,
      color: "text-orange-600",
    },
    {
      id: "taxa-sucesso-relatorios",
      title: "Taxa Sucesso Relatórios",
      value: "98.7%",
      description: "gerados com sucesso",
      trend: { value: "+0.8% vs ontem", isPositive: true },
      icon: <Activity className="h-6 w-6" />,
      color: "text-purple-600",
    },
  ];

  // Dados dos KPIs - Operação ProFlow
  const kpiOperacaoData: KPIData[] = [
    {
      id: "sessoes-ativas",
      title: "Sessões Ativas",
      value: "12",
      description: "colaboradores",
      trend: { value: "+2 vs ontem", isPositive: true },
      icon: <Users className="h-6 w-6" />,
      color: "text-blue-600",
    },
    {
      id: "tempo-operacao",
      title: "Tempo de Operação",
      value: "8.5h",
      description: "médio por sessão",
      trend: { value: "+0.3h vs ontem", isPositive: true },
      icon: <Clock className="h-6 w-6" />,
      color: "text-green-600",
    },
    {
      id: "taxa-utilizacao",
      title: "Taxa de Utilização",
      value: "87.3%",
      description: "do sistema",
      trend: { value: "+2.1% vs ontem", isPositive: true },
      icon: <Activity className="h-6 w-6" />,
      color: "text-purple-600",
    },
    {
      id: "erros-sistema",
      title: "Erros de Sistema",
      value: "3",
      description: "hoje",
      trend: { value: "-1 vs ontem", isPositive: false },
      icon: <AlertTriangle className="h-6 w-6" />,
      color: "text-red-600",
    },
    {
      id: "uptime-sistema",
      title: "Uptime do Sistema",
      value: "99.8%",
      description: "",
      trend: { value: "+0.1% vs ontem", isPositive: true },
      icon: <CheckCircle className="h-6 w-6" />,
      color: "text-green-600",
    },
  ];

  // Dados para gráficos da aba Operação
  const utilizacaoSistemaData = [
    { hora: "00:00", utilizacao: 15 },
    { hora: "04:00", utilizacao: 8 },
    { hora: "08:00", utilizacao: 85 },
    { hora: "12:00", utilizacao: 92 },
    { hora: "16:00", utilizacao: 78 },
    { hora: "20:00", utilizacao: 45 },
  ];

  const sessoesPorSetorData = [
    { setor: "Recebimento", sessoes: 4, color: "bg-blue-500" },
    { setor: "Embalagem", sessoes: 3, color: "bg-green-500" },
    { setor: "Custos", sessoes: 2, color: "bg-purple-500" },
    { setor: "Inventário", sessoes: 3, color: "bg-orange-500" },
  ];

  const errosSistemaData = [
    { tipo: "Timeout de Conexão", quantidade: 1, severidade: "Baixa", color: "text-yellow-600" },
    { tipo: "Erro de Validação", quantidade: 1, severidade: "Média", color: "text-orange-600" },
    { tipo: "Falha de Scanner", quantidade: 1, severidade: "Alta", color: "text-red-600" },
  ];

  const performanceOperacionalData = [
    { metrica: "Tempo de Resposta", valor: "120ms", meta: "100ms", status: "warning" },
    { metrica: "Throughput", valor: "1.2k req/min", meta: "1.5k req/min", status: "warning" },
    { metrica: "Disponibilidade", valor: "99.8%", meta: "99.9%", status: "success" },
    { metrica: "Latência", valor: "45ms", meta: "50ms", status: "success" },
  ];

  useEffect(() => {
    const verificarSessao = async () => {
      try {
        const session = await getSession("current");
        if (!session) {
          router.push("/");
          return;
        }

        if (session.area !== "crdk") {
          router.push("/");
          return;
        }

        setSessionData(session);
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);
        router.push("/");
      }
    };

    verificarSessao();
    carregarKPIs();
    
    // Atualizar KPIs a cada 60 segundos (1 minuto)
    const interval = setInterval(carregarKPIs, 60000);
    return () => clearInterval(interval);
  }, [router, getSession]);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });

    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }

    router.push("/");
  };

  const getUserDisplayName = () => {
    if (sessionData && Array.isArray(sessionData.colaboradores) && sessionData.colaboradores.length > 0) {
      return sessionData.colaboradores.join(', ');
    }
    return 'Usuário CRDK';
  };

  const getUserRole = () => {
    return 'Setor CRDK';
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "error":
        return "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800";
      case "warning":
        return "border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800";
      case "success":
        return "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800";
      default:
        return "border-gray-200 bg-gray-50 dark:bg-gray-900/20 dark:border-gray-800";
    }
  };

  const getAlertIconColor = (type: string) => {
    switch (type) {
      case "error":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "success":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  if (!sessionData) {
    return <Loader text="Carregando sessão CRDK..." duration={0} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 py-3 sm:py-0 sm:h-16 min-h-[4rem] sm:min-h-0">
            {/* Logo e Título */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                <BarChart3 className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-sm sm:text-xl font-bold text-gray-900 dark:text-white">
                  <span className="hidden sm:inline">Torre de Controle Logística (CRDK)</span>
                  <span className="sm:hidden">CRDK</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                  Sistema de Monitoramento e Performance
                </p>
              </div>
            </div>

            {/* Controles e Menu */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2 lg:gap-3 flex-wrap">
              {/* Filtros de Período - Desktop */}
              <div className="hidden sm:flex items-center space-x-2 flex-wrap gap-2">
                <Button
                  variant={periodoSelecionado === "hoje" ? "default" : "outline"}
                  onClick={() => {
                    setPeriodoSelecionado("hoje");
                    const hoje = new Date().toISOString().split("T")[0];
                    setDataAtual(hoje);
                  }}
                  size="sm"
                  className="text-xs sm:text-sm whitespace-nowrap"
                >
                  Hoje
                </Button>
                <Button
                  variant={periodoSelecionado === "semana" ? "default" : "outline"}
                  onClick={() => setPeriodoSelecionado("semana")}
                  size="sm"
                  className="text-xs sm:text-sm whitespace-nowrap"
                >
                  Semana
                </Button>
                <Button
                  variant={periodoSelecionado === "mes" ? "default" : "outline"}
                  onClick={() => setPeriodoSelecionado("mes")}
                  size="sm"
                  className="text-xs sm:text-sm whitespace-nowrap"
                >
                  Mês
                </Button>
                <Button
                  variant={periodoSelecionado === "personalizado" ? "default" : "outline"}
                  onClick={() => setPeriodoSelecionado("personalizado")}
                  size="sm"
                  className="text-xs sm:text-sm whitespace-nowrap"
                >
                  Personalizado
                </Button>

                {periodoSelecionado === "hoje" && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="data-filtro-crdk" className="text-xs sm:text-sm whitespace-nowrap">
                      Data:
                    </Label>
                    <Input
                      id="data-filtro-crdk"
                      type="date"
                      value={dataAtual}
                      onChange={(e) => setDataAtual(e.target.value)}
                      className="h-8 sm:h-9 text-xs sm:text-sm w-32 sm:w-40"
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                )}

                {periodoSelecionado === "personalizado" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="data-inicio-crdk" className="text-xs sm:text-sm whitespace-nowrap">
                        De:
                      </Label>
                      <Input
                        id="data-inicio-crdk"
                        type="date"
                        value={dataAtual}
                        onChange={(e) => {
                          setDataAtual(e.target.value);
                          if (e.target.value > dataFim) {
                            setDataFim(e.target.value);
                          }
                        }}
                        className="h-8 sm:h-9 text-xs sm:text-sm w-32 sm:w-40"
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="data-fim-crdk" className="text-xs sm:text-sm whitespace-nowrap">
                        Até:
                      </Label>
                      <Input
                        id="data-fim-crdk"
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="h-8 sm:h-9 text-xs sm:text-sm w-32 sm:w-40"
                        min={dataAtual}
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Botões de Ação - Desktop e Mobile */}
              <div className="flex items-center gap-2 flex-wrap">
                <DropdownMenu open={isFiltersDropdownOpen} onOpenChange={setIsFiltersDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`whitespace-nowrap ${selectedPeriod !== "30" || selectedCD !== "todos" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : ""}`}
                    >
                      <Filter className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Filtros</span>
                      {(selectedPeriod !== "30" || selectedCD !== "todos") && (
                        <span className="ml-1 sm:ml-2 h-2 w-2 rounded-full bg-blue-600"></span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <DropdownMenuLabel className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Período
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedPeriod("7");
                        setIsFiltersDropdownOpen(false);
                      }}
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span>Últimos 7 dias</span>
                      {selectedPeriod === "7" && <span className="text-blue-600">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedPeriod("15");
                        setIsFiltersDropdownOpen(false);
                      }}
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span>Últimos 15 dias</span>
                      {selectedPeriod === "15" && <span className="text-blue-600">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedPeriod("30");
                        setIsFiltersDropdownOpen(false);
                      }}
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span>Últimos 30 dias</span>
                      {selectedPeriod === "30" && <span className="text-blue-600">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedPeriod("60");
                        setIsFiltersDropdownOpen(false);
                      }}
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span>Últimos 60 dias</span>
                      {selectedPeriod === "60" && <span className="text-blue-600">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedPeriod("90");
                        setIsFiltersDropdownOpen(false);
                      }}
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span>Últimos 90 dias</span>
                      {selectedPeriod === "90" && <span className="text-blue-600">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Centro de Distribuição
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedCD("todos");
                        setIsFiltersDropdownOpen(false);
                      }}
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span>Todos</span>
                      {selectedCD === "todos" && <span className="text-blue-600">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedCD("crdk-es");
                        setIsFiltersDropdownOpen(false);
                      }}
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span>CRDK ES</span>
                      {selectedCD === "crdk-es" && <span className="text-blue-600">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedCD("crdk-sp");
                        setIsFiltersDropdownOpen(false);
                      }}
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span>CRDK SP</span>
                      {selectedCD === "crdk-sp" && <span className="text-blue-600">✓</span>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={carregarKPIs}
                  className="whitespace-nowrap"
                >
                  <RefreshCw className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Atualizar</span>
                </Button>

                <Button 
                  variant="outline" 
                  size="sm"
                  className="whitespace-nowrap"
                >
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </div>
              
              {/* Filtros de Período - Mobile */}
              <div className="sm:hidden flex flex-col gap-2 w-full">
                <div className="flex items-center space-x-2 flex-wrap">
                  <Button
                    variant={periodoSelecionado === "hoje" ? "default" : "outline"}
                    onClick={() => {
                      setPeriodoSelecionado("hoje");
                      const hoje = new Date().toISOString().split("T")[0];
                      setDataAtual(hoje);
                    }}
                    size="sm"
                    className="text-xs"
                  >
                    Hoje
                  </Button>
                  <Button
                    variant={periodoSelecionado === "semana" ? "default" : "outline"}
                    onClick={() => setPeriodoSelecionado("semana")}
                    size="sm"
                    className="text-xs"
                  >
                    Semana
                  </Button>
                  <Button
                    variant={periodoSelecionado === "mes" ? "default" : "outline"}
                    onClick={() => setPeriodoSelecionado("mes")}
                    size="sm"
                    className="text-xs"
                  >
                    Mês
                  </Button>
                  <Button
                    variant={periodoSelecionado === "personalizado" ? "default" : "outline"}
                    onClick={() => setPeriodoSelecionado("personalizado")}
                    size="sm"
                    className="text-xs"
                  >
                    Personalizado
                  </Button>
                </div>

                {periodoSelecionado === "hoje" && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="data-filtro-crdk-mobile" className="text-xs whitespace-nowrap">
                      Data:
                    </Label>
                    <Input
                      id="data-filtro-crdk-mobile"
                      type="date"
                      value={dataAtual}
                      onChange={(e) => setDataAtual(e.target.value)}
                      className="h-8 text-xs w-32"
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                )}

                {periodoSelecionado === "personalizado" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="data-inicio-crdk-mobile" className="text-xs whitespace-nowrap">
                        De:
                      </Label>
                      <Input
                        id="data-inicio-crdk-mobile"
                        type="date"
                        value={dataAtual}
                        onChange={(e) => {
                          setDataAtual(e.target.value);
                          if (e.target.value > dataFim) {
                            setDataFim(e.target.value);
                          }
                        }}
                        className="h-8 text-xs w-28"
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="data-fim-crdk-mobile" className="text-xs whitespace-nowrap">
                        Até:
                      </Label>
                      <Input
                        id="data-fim-crdk-mobile"
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="h-8 text-xs w-28"
                        min={dataAtual}
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Menu Dropdown do Usuário */}
              <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
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

                  {/* Filtros Ativos */}
                  <DropdownMenuLabel className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Filtros Ativos
                  </DropdownMenuLabel>
                  <div className="px-2 py-1.5">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span className="font-medium">Período:</span> {selectedPeriod === "7" ? "7 dias" : selectedPeriod === "15" ? "15 dias" : selectedPeriod === "30" ? "30 dias" : selectedPeriod === "60" ? "60 dias" : selectedPeriod === "90" ? "90 dias" : "30 dias"}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">CD:</span> {selectedCD === "todos" ? "Todos" : selectedCD === "crdk-es" ? "CRDK ES" : selectedCD === "crdk-sp" ? "CRDK SP" : "Todos"}
                    </div>
                  </div>

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Navegação por Abas */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6 sm:mb-8">
          <nav className="-mb-px flex space-x-2 sm:space-x-8 overflow-x-auto pb-2">
            <button 
              onClick={() => setActiveTab("visao-geral")}
              className={`border-b-2 py-2 px-1 text-xs sm:text-sm font-medium whitespace-nowrap ${
                activeTab === "visao-geral"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <div className="flex items-center space-x-1 sm:space-x-2">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Dashboard Central</span>
                <span className="sm:hidden">Central</span>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab("embalagem")}
              className={`border-b-2 py-2 px-1 text-xs sm:text-sm font-medium whitespace-nowrap ${
                activeTab === "embalagem"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Embalagem</span>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab("recebimento")}
              className={`border-b-2 py-2 px-1 text-xs sm:text-sm font-medium whitespace-nowrap ${
                activeTab === "recebimento"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Truck className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Recebimento</span>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab("custos")}
              className={`border-b-2 py-2 px-1 text-xs sm:text-sm font-medium whitespace-nowrap ${
                activeTab === "custos"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <div className="flex items-center space-x-1 sm:space-x-2">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Custos</span>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab("operacoes")}
              className={`border-b-2 py-2 px-1 text-xs sm:text-sm font-medium whitespace-nowrap ${
                activeTab === "operacoes"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Inventário</span>
                <span className="sm:hidden">Invent.</span>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab("operacao")}
              className={`border-b-2 py-2 px-1 text-xs sm:text-sm font-medium whitespace-nowrap ${
                activeTab === "operacao"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Operação</span>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab("performance")}
              className={`border-b-2 py-2 px-1 text-xs sm:text-sm font-medium whitespace-nowrap ${
                activeTab === "performance"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Performance</span>
                <span className="sm:hidden">Perf.</span>
              </div>
            </button>
           
          </nav>
        </div>

        {/* Conteúdo das Abas */}
        {activeTab === "visao-geral" && (
          <div className="space-y-6 sm:space-y-8">
            {/* Título da Seção */}
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                <span>Central ProFlow</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Monitoramento em tempo real do fluxo operacional</p>
            </div>

            {/* Cards de KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-6">
              {loadingKPIs && kpiDataReal.length === 0 ? (
                // Mostrar cards de carregamento
                Array.from({ length: 8 }).map((_, index) => (
                  <Card key={`loading-${index}`} className="hover:shadow-lg transition-shadow duration-200">
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2 animate-pulse"></div>
                          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
                        </div>
                        <div className="p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800 animate-pulse">
                          <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                kpiData.map((kpi) => (
                  <Card key={kpi.id} className="hover:shadow-lg transition-shadow duration-200">
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                            {kpi.title}
                          </p>
                          <div className="mt-2">
                            <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                              {kpi.value}
                            </p>
                            {kpi.description && (
                              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                {kpi.description}
                              </p>
                            )}
                          </div>
                          <div className="mt-2 sm:mt-3 flex items-center">
                            {kpi.trend.isPositive ? (
                              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />
                            )}
                            <span
                              className={`text-xs sm:text-sm font-medium ${
                                kpi.trend.isPositive
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {kpi.trend.value}
                            </span>
                          </div>
                        </div>
                        <div className={`p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800 ${kpi.color}`}>
                          <div className="h-4 w-4 sm:h-6 sm:w-6">
                            {kpi.icon}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Gráfico e Alertas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              {/* Gráfico de Performance por Área */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <span>Performance por Área (Score 0-100)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {chartData.map((area, index) => (
                      <div key={area.name} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {area.name}
                          </span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {area.score}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${area.score}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Insight:</strong> Operações apresenta a melhor performance, seguida por Armazenagem e Embalagem.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Setores de alerta */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <span>Setores de alerta</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {alertData.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-lg border ${getAlertColor(alert.type)}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`${getAlertIconColor(alert.type)}`}>
                            {alert.icon}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tendência de Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Tendência de Performance (Últimos 6 Meses)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {performanceAreas.map((area) => (
                    <div key={area.name} className="text-center">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 ${area.color} mb-4`}>
                        {area.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {area.name}
                      </h3>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {area.score}%
                      </p>
                      <div className="flex items-center justify-center">
                        {area.trend.isPositive ? (
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            area.trend.isPositive
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {area.trend.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aba Embalagem */}
        {activeTab === "embalagem" && (
          <div className="space-y-6 sm:space-y-8">
            {/* Título da Seção */}
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                <span>Indicadores de Embalagem</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Monitoramento de carros de embalagem, NFs processadas e eficiência operacional
              </p>
            </div>

            {/* Cards de KPIs de Embalagem */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-6">
              {kpiEmbalagemData.map((kpi) => (
                <Card key={kpi.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                          {kpi.title}
                        </p>
                        <div className="mt-2">
                          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {kpi.value}
                          </p>
                          {kpi.description && (
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              {kpi.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 sm:mt-3 flex items-center">
                          {kpi.trend.isPositive ? (
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />
                          )}
                          <span
                            className={`text-xs sm:text-sm font-medium ${
                              kpi.trend.isPositive
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {kpi.trend.value}
                          </span>
                        </div>
                      </div>
                      <div className={`p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800 ${kpi.color}`}>
                        <div className="h-4 w-4 sm:h-6 sm:w-6">
                          {kpi.icon}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Gráficos e Tabela */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              {/* Gráfico de Acuracidade do Inventário */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <span>Acuracidade do inventário</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {acuracidadeInventarioData.map((rua, index) => (
                      <div key={rua.name} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {rua.name}
                          </span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {rua.score}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                          <div
                            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${rua.score}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Insight:</strong> Rua Duques de Caxias apresenta a melhor acuracidade, sendo referência para as demais ruas.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico de Tipo de Carga */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <span>Tipo de Carga</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative w-48 h-48">
                      <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                          className="dark:stroke-gray-700"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="8"
                          strokeDasharray={`${tipoCargaData[0].value * 2.51} 251`}
                          strokeDashoffset="0"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#16a34a"
                          strokeWidth="8"
                          strokeDasharray={`${tipoCargaData[1].value * 2.51} 251`}
                          strokeDashoffset={`-${tipoCargaData[0].value * 2.51}`}
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#ea580c"
                          strokeWidth="8"
                          strokeDasharray={`${tipoCargaData[2].value * 2.51} 251`}
                          strokeDashoffset={`-${(tipoCargaData[0].value + tipoCargaData[1].value) * 2.51}`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">60%</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">CRDK ES</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {tipoCargaData.map((tipo, index) => (
                      <div key={tipo.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded ${tipo.color}`}></div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {tipo.name}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {tipo.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Insight:</strong> CRDK ES representa 60% do volume de carga, concentrando os maiores volumes de movimentação.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Ocupação por Fornecedor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Warehouse className="h-5 w-5 text-blue-600" />
                  <span>Ocupação por Fornecedor</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Fornecedor</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Ocupação Percentual</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Volumes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ocupacaoFornecedorData.map((fornecedor, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                            {fornecedor.fornecedor}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                <div
                                  className={`h-2 rounded-full ${
                                    fornecedor.ocupacao >= 80 ? 'bg-green-500' :
                                    fornecedor.ocupacao >= 60 ? 'bg-orange-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${fornecedor.ocupacao}%` }}
                                ></div>
                              </div>
                              <span className={`text-sm font-medium ${fornecedor.color}`}>
                                {fornecedor.ocupacao}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {fornecedor.posicoes.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Insight:</strong> Fornecedores Premium ocupam 85% das posições disponíveis, otimizando o espaço de armazenagem.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aba Recebimento */}
        {activeTab === "recebimento" && (
          <div className="space-y-6 sm:space-y-8">
            {/* Título da Seção */}
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                <span>Indicadores de Recebimento</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Monitoramento de NFs bipadas, volumes recebidos, taxa de divergências e ocupação do CD
              </p>
            </div>

            {/* Cards de KPIs de Recebimento */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
              {kpiRecebimentoData.map((kpi) => (
                <Card key={kpi.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                          {kpi.title}
                        </p>
                        <div className="mt-2">
                          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {kpi.value}
                          </p>
                          {kpi.description && (
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              {kpi.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 sm:mt-3 flex items-center">
                          {kpi.trend.isPositive ? (
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />
                          )}
                          <span
                            className={`text-xs sm:text-sm font-medium ${
                              kpi.trend.isPositive
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {kpi.trend.value}
                          </span>
                        </div>
                      </div>
                      <div className={`p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800 ${kpi.color}`}>
                        <div className="h-4 w-4 sm:h-6 sm:w-6">
                          {kpi.icon}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Gráficos e Tabelas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              {/* Gráfico de Índice de Avarias */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span>Índice de Avarias (Últimos 6 Meses)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between space-x-2">
                    {indiceAvariasData.map((item, index) => (
                      <div key={item.mes} className="flex flex-col items-center space-y-2 flex-1">
                        <div className="w-full bg-gray-200 rounded-t dark:bg-gray-700 relative">
                          <div
                            className="bg-red-500 rounded-t transition-all duration-500"
                            style={{ height: `${(item.valor / 0.8) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {item.mes}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {item.valor}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Insight:</strong> Redução consistente de avarias desde janeiro, resultado das melhorias no processo de recebimento.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance de Recebimento */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Performance de Recebimento</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceRecebimentoData.map((item, index) => (
                      <div key={item.categoria} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {item.categoria}
                          </span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {item.percentual}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                          <div
                            className={`h-3 rounded-full transition-all duration-300 ${item.color}`}
                            style={{ width: `${item.percentual}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Nível de Serviço por Fornecedor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <span>Nível de Recebimento por Fornecedor</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Fornecedor</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Nível Serviço</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Recebimentos</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Valor recebido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nivelServicoFornecedorData.map((fornecedor, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                            {fornecedor.fornecedor}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-sm font-bold ${fornecedor.color}`}>
                              {fornecedor.nivelServico}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {fornecedor.entregas.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            R$ {fornecedor.custoMedio.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Insight:</strong> Fornecedor Alpha apresenta o melhor nível de serviço devido à infraestrutura consolidada de recebimento.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seção de Relatórios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span>Indicadores de Relatórios</span>
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Monitoramento de geração de relatórios, sessões finalizadas e performance do sistema
                </p>
              </CardHeader>
              <CardContent>
                {/* Cards de KPIs de Relatórios */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
                  {kpiRelatoriosData.map((kpi) => (
                    <Card key={kpi.id} className="hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-3 sm:p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              {kpi.title}
                            </p>
                            <div className="mt-2">
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {kpi.value}
                              </p>
                              {kpi.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {kpi.description}
                                </p>
                              )}
                            </div>
                            <div className="mt-3 flex items-center">
                              {kpi.trend.isPositive ? (
                                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                              )}
                              <span
                                className={`text-sm font-medium ${
                                  kpi.trend.isPositive
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {kpi.trend.value}
                              </span>
                            </div>
                          </div>
                          <div className={`p-3 rounded-lg bg-gray-50 dark:bg-gray-800 ${kpi.color}`}>
                            {kpi.icon}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aba Custos */}
        {activeTab === "custos" && (
          <div className="space-y-6 sm:space-y-8">
            {/* Título da Seção */}
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                <span>Indicadores de Custos</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Análise de custos operacionais, valor de NFs processadas e eficiência financeira
              </p>
            </div>

            {/* Cards de KPIs de Custos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-6">
              {kpiCustosData.map((kpi) => (
                <Card key={kpi.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                          {kpi.title}
                        </p>
                        <div className="mt-2">
                          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {kpi.value}
                          </p>
                          {kpi.description && (
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              {kpi.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 sm:mt-3 flex items-center">
                          {kpi.trend.isPositive ? (
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />
                          )}
                          <span
                            className={`text-xs sm:text-sm font-medium ${
                              kpi.trend.isPositive
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {kpi.trend.value}
                          </span>
                        </div>
                      </div>
                      <div className={`p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800 ${kpi.color}`}>
                        <div className="h-4 w-4 sm:h-6 sm:w-6">
                          {kpi.icon}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Gráficos e Listas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              {/* Gráfico de Custo Logístico sobre Faturamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <span>Custo Logístico sobre Faturamento (%)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between space-x-2">
                    {custoLogisticoData.map((item, index) => (
                      <div key={item.mes} className="flex flex-col items-center space-y-2 flex-1">
                        <div className="w-full bg-gray-200 rounded-t dark:bg-gray-700 relative">
                          <div
                            className="bg-blue-500 rounded-t transition-all duration-500"
                            style={{ height: `${(item.valor / 9) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {item.mes}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {item.valor}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Insight:</strong> Redução consistente dos custos logísticos devido às otimizações implementadas.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ROI de Melhorias Implementadas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span>ROI de Melhorias Implementadas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {roiMelhoriasData.map((item, index) => (
                      <div key={item.melhoria} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            item.color === 'text-green-600' ? 'bg-green-500' :
                            item.color === 'text-blue-600' ? 'bg-blue-500' :
                            item.color === 'text-purple-600' ? 'bg-purple-500' :
                            'bg-orange-500'
                          }`}></div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {item.melhoria}
                          </span>
                        </div>
                        <span className={`text-lg font-bold ${item.color}`}>
                          +{item.roi}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabelas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              {/* Tabela de Valor do Estoque por Curva ABC */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <span>Valor do Estoque por Curva ABC</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Classe</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Valor</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Percentual</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Giro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {valorEstoqueABCData.map((item, index) => (
                          <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                              {item.classe}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              R$ {item.valor.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {item.percentual}%
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {item.giro}x
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Insight:</strong> Classe A concentra 60% do valor do estoque com maior giro de movimentação.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabela de Gastos Operacionais de Transporte */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Truck className="h-5 w-5 text-blue-600" />
                    <span>Gastos Operacionais de Transporte</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Categoria</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Valor</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Variação</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Percentual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gastosOperacionaisData.map((item, index) => (
                          <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                              {item.categoria}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              R$ {item.valor.toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-sm font-medium ${item.color}`}>
                                {item.variacao > 0 ? '+' : ''}{item.variacao}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {item.percentual}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Insight:</strong> Combustível representa 42% dos gastos operacionais, impactado pela alta do petróleo.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumo Financeiro do Período */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {resumoFinanceiroData.map((item, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-3 sm:p-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {item.titulo}
                      </h3>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        R$ {item.valor.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-center">
                        {item.isPositive ? (
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            item.isPositive
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {item.isPositive ? '+' : ''}{item.variacao}% vs anterior
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Aba Operações */}
        {activeTab === "operacoes" && (
          <div className="space-y-6 sm:space-y-8">
            {/* Título da Seção */}
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                <span>Indicadores de Inventário</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Controle de NFs pendentes, volumes em inventário e eficiência de processamento
              </p>
            </div>

            {/* Cards de KPIs de Operações */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-6">
              {kpiOperacoesData.map((kpi) => (
                <Card key={kpi.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                          {kpi.title}
                        </p>
                        <div className="mt-2">
                          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {kpi.value}
                          </p>
                          {kpi.description && (
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              {kpi.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 sm:mt-3 flex items-center">
                          {kpi.trend.isPositive ? (
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />
                          )}
                          <span
                            className={`text-xs sm:text-sm font-medium ${
                              kpi.trend.isPositive
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {kpi.trend.value}
                          </span>
                        </div>
                      </div>
                      <div className={`p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800 ${kpi.color}`}>
                        <div className="h-4 w-4 sm:h-6 sm:w-6">
                          {kpi.icon}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              {/* Gráfico de Tempo Médio de Carregamento por Tipo de Carga */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Truck className="h-5 w-5 text-blue-600" />
                    <span>Tempo Médio de Carregamento por Tipo de Carga</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex flex-col justify-between">
                    {tempoCarregamentoData.map((item, index) => (
                      <div key={item.tipo} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {item.tipo}
                          </span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {item.tempo}h
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                          <div
                            className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${(item.tempo / 3) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Insight:</strong> Bitrem apresenta maior tempo devido ao volume de carga, mas mantém eficiência por tonelada.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico de Lead Time Logístico Médio por Processo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span>Lead Time Logístico Médio por Processo</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between space-x-2">
                    {leadTimeProcessoData.map((item, index) => (
                      <div key={item.processo} className="flex flex-col items-center space-y-2 flex-1">
                        <div className="w-full bg-gray-200 rounded-t dark:bg-gray-700 relative">
                          <div
                            className={`h-3 rounded-t transition-all duration-500 ${
                              item.processo === 'Armazenagem' ? 'bg-gray-500' : 'bg-blue-500'
                            }`}
                            style={{ height: `${(item.tempo / 60) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium text-center">
                          {item.processo}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {item.tempo}min
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Insight:</strong> Picking representa o maior tempo do processo, oportunidade de otimização com WMS.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Distribuição de Atividades Operacionais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span>Distribuição de Atividades Operacionais</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {distribuicaoAtividadesData.map((item, index) => (
                    <div key={item.atividade} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {item.atividade}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {item.percentual}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${item.color}`}
                          style={{ width: `${item.percentual}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Produtividade por Operador */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>Produtividade por Operador</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Operador</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Produtividade</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Tempo Médio</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Eficiência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtividadeOperadorData.map((operador, index) => (
                        <tr key={index} className={`border-b border-gray-100 dark:border-gray-800 ${operador.color}`}>
                          <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                            {operador.operador}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {operador.produtividade} itens/h
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {operador.tempoMedio} min
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {operador.eficiencia}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="h-5 w-5 text-green-600 mt-0.5" />
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <strong>Insight:</strong> Maria Santos é a operadora mais eficiente, podendo treinar outros colaboradores.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aba Operação */}
        {activeTab === "operacao" && (
          <div className="space-y-6 sm:space-y-8">
            {/* Título da Seção */}
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                <span>Indicadores Operacionais</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Monitoramento de sessões ativas, utilização do sistema e performance operacional
              </p>
            </div>

            {/* Cards de KPIs de Operação */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
              {kpiOperacaoData.map((kpi) => (
                <Card key={kpi.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                          {kpi.title}
                        </p>
                        <div className="mt-2">
                          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {kpi.value}
                          </p>
                          {kpi.description && (
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              {kpi.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 sm:mt-3 flex items-center">
                          {kpi.trend.isPositive ? (
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />
                          )}
                          <span
                            className={`text-xs sm:text-sm font-medium ${
                              kpi.trend.isPositive
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {kpi.trend.value}
                          </span>
                        </div>
                      </div>
                      <div className={`p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800 ${kpi.color}`}>
                        <div className="h-4 w-4 sm:h-6 sm:w-6">
                          {kpi.icon}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Gráficos de Operação */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              {/* Utilização do Sistema por Hora */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <span>Utilização do Sistema por Hora</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between space-x-2">
                    {utilizacaoSistemaData.map((item, index) => (
                      <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                        <div className="w-full bg-gray-200 rounded-t dark:bg-gray-700 relative">
                          <div
                            className="bg-blue-500 rounded-t transition-all duration-500"
                            style={{ height: `${item.utilizacao}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium text-center">
                          {item.hora}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {item.utilizacao}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Insight:</strong> Pico de utilização entre 8h e 16h, com menor atividade no período noturno.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sessões Ativas por Setor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <span>Sessões Ativas por Setor</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sessoesPorSetorData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {item.setor}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full ${item.color}`}
                              style={{ width: `${(item.sessoes / 4) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-bold text-gray-900 dark:text-white w-8">
                            {item.sessoes}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-5 w-5 text-green-600 mt-0.5" />
                      <p className="text-sm text-green-800 dark:text-green-200">
                        <strong>Insight:</strong> Recebimento possui mais sessões ativas, seguido por Embalagem e Inventário.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabelas de Operação */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              {/* Erros de Sistema */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span>Erros de Sistema</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {errosSistemaData.map((erro, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {erro.tipo}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Severidade: {erro.severidade}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={`${erro.color} bg-opacity-20`}>
                            {erro.quantidade}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Operacional */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    <span>Performance Operacional</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceOperacionalData.map((metrica, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {metrica.metrica}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {metrica.valor}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              (meta: {metrica.meta})
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div
                            className={`h-2 rounded-full ${
                              metrica.status === "success" 
                                ? "bg-green-500" 
                                : metrica.status === "warning"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ 
                              width: metrica.status === "success" ? "100%" : "75%" 
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Aba Performance */}
        {activeTab === "performance" && (
          <div className="space-y-6 sm:space-y-8">
            {/* Título da Seção */}
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                <span>Performance Geral dos Setores</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Monitoramento de eficiência de todos os setores e destaque de colaboradores
              </p>
            </div>

            {/* Cards de KPIs de Performance */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
              {kpiPerformanceData.map((kpi) => (
                <Card key={kpi.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                          {kpi.title}
                        </p>
                        <div className="mt-2">
                          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {kpi.value}
                          </p>
                          {kpi.description && (
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              {kpi.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 sm:mt-3 flex items-center">
                          {kpi.trend.isPositive ? (
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />
                          )}
                          <span
                            className={`text-xs sm:text-sm font-medium ${
                              kpi.trend.isPositive
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {kpi.trend.value}
                          </span>
                        </div>
                      </div>
                      <div className={`p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-800 ${kpi.color}`}>
                        <div className="h-4 w-4 sm:h-6 sm:w-6">
                          {kpi.icon}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Colaboradores em Destaque */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>Colaboradores em Destaque</span>
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Reconhecimento dos melhores desempenhos por setor
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {colaboradoresDestaqueData.map((colaborador, index) => (
                    <Card key={index} className={`${colaborador.color} border-0`}>
                      <CardContent className="p-3 sm:p-6">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                            {colaborador.nome}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {colaborador.setor}
                          </p>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Performance:
                              </span>
                              <span className={`text-sm font-bold ${colaborador.textColor}`}>
                                {colaborador.performance}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Processados:
                              </span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {colaborador.nfsProcessadas || colaborador.carrosProduzidos || colaborador.relatoriosGerados}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Tempo Médio:
                              </span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {colaborador.tempoMedio}h
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 p-2 bg-white dark:bg-gray-800 rounded-lg">
                            <p className={`text-xs font-medium ${colaborador.textColor}`}>
                              ⭐ {colaborador.destaque}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Insight:</strong> Maria Santos lidera em eficiência no Recebimento, enquanto João Silva se destaca na produtividade de Embalagem.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Performance por Setor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span>Performance por Setor</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { setor: "Recebimento", performance: 96.8, color: "bg-green-500" },
                    { setor: "Embalagem", performance: 92.4, color: "bg-blue-500" },
                    { setor: "Custos", performance: 89.7, color: "bg-purple-500" },
                    { setor: "Inventário", performance: 91.3, color: "bg-orange-500" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {item.setor}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${item.color}`}
                            style={{ width: `${item.performance}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white w-12">
                          {item.performance}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="h-5 w-5 text-green-600 mt-0.5" />
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <strong>Insight:</strong> Recebimento apresenta a melhor performance, seguido por Inventário e Embalagem.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabelas de Status e Canais */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Status dos Tickets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-blue-600" />
                    <span>Status dos Tickets</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {statusTicketsData.map((item, index) => (
                      <div key={item.status} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {item.status}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${item.color}`}>
                          {item.quantidade}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Canais de Atendimento */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span>Canais de Atendimento</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {canaisAtendimentoData.map((item, index) => (
                      <div key={item.canal} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {item.canal}
                          </span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {item.percentual}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${item.percentual}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tempo Médio de Resolução */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span>Tempo Médio de Resolução</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tempoResolucaoData.map((item, index) => (
                      <div key={item.prioridade} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {item.prioridade}
                        </span>
                        <span className={`text-sm font-bold ${item.color}`}>
                          {item.tempo}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Dashboard Logístico v2.0 • Última atualização: {new Date().toLocaleDateString("pt-BR")}, {new Date().toLocaleTimeString("pt-BR")}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Sistema Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-red-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Dados em tempo real</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal de Alterar Senha */}
      {sessionData && (
        <ChangePasswordModal
          isOpen={showChangePassword}
          onClose={() => setShowChangePassword(false)}
          usuario={sessionData.colaboradores[0] || ""}
          area="crdk"
          onSuccess={() => {
            alert("Senha alterada com sucesso!")
          }}
        />
      )}
    </div>
  );
}