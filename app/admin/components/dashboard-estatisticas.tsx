"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Award,
  Target,
  Activity,
  Calendar,
  Zap,
  Star,
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
  Truck,
  Package,
} from "lucide-react"
import { useEstatisticas } from "@/hooks/use-estatisticas"
import { getSupabase } from "@/lib/supabase-client"

interface ColaboradorDestaque {
  nome: string
  carros_processados: number
  notas_processadas: number
  volumes_processados: number
  produtividade_media: number
  turno: string
  data: string
}

interface EstatisticasDashboard {
  total_carros_hoje: number
  total_notas_hoje: number
  total_volumes_hoje: number
  produtividade_media_hoje: number
  carros_por_turno: {
    manha: number
    tarde: number
    noite: number
    madrugada: number
  }
  volumes_por_turno: {
    manha: number
    tarde: number
    noite: number
    madrugada: number
  }
  evolucao_semanal: Array<{
    data: string
    carros: number
    notas: number
    volumes: number
  }>
  evolucao_mensal: Array<{
    data: string
    carros: number
    notas: number
    volumes: number
  }>
  colaboradores_destaque: ColaboradorDestaque[]
}

export default function DashboardEstatisticas() {
  const [dashboardData, setDashboardData] = useState<EstatisticasDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodoSelecionado, setPeriodoSelecionado] = useState<"hoje" | "semana" | "mes" | "personalizado">("hoje")
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split("T")[0])
  const [dataFim, setDataFim] = useState(new Date().toISOString().split("T")[0])
  const [visaoEvolucao, setVisaoEvolucao] = useState<"semanal" | "mensal">("semanal")

  const {
    // deixei aqui caso você use depois
    estatisticasPorTurno,
    estatisticasPorPeriodo,
    estatisticasGerais,
    loading: loadingEstatisticas,
    error: errorEstatisticas,
    formatarTurno: formatarTurnoHook,
    formatarData: formatarDataHook,
    calcularPorcentagem,
  } = useEstatisticas()

  // FORMATAÇÃO DE DATA (pra exibir dd/mm)
  const formatarData = (data: string) => {
    try {
      if (!data) return ""

      if (data.includes("-") && data.length >= 10) {
        const partes = data.split("T")[0].split("-")
        if (partes.length === 3) {
          const [ano, mes, dia] = partes
          if (!isNaN(Number(ano)) && !isNaN(Number(mes)) && !isNaN(Number(dia))) {
            return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}`
          }
        }
      }

      const dataObj = new Date(data)
      if (!isNaN(dataObj.getTime())) {
        return dataObj.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        })
      }

      return data
    } catch {
      return data
    }
  }

  const formatarTurno = (turno: string) => {
    const turnos = {
      manha: "Manhã",
      tarde: "Tarde",
      noite: "Noite",
      madrugada: "Madrugada",
    }
    return turnos[turno as keyof typeof turnos] || turno
  }

  /**
   * REGRA DO DIA DE PRODUÇÃO:
   * 1 dia = 06:00 até 05:59 do dia seguinte
   * Implementação: data_producao = (timestamp - 6h).toISOString().split('T')[0]
   */
  const calcularDataCorreta = (
    timestamp: string | Date | null | undefined,
    dataOriginal: string
  ): string => {
    try {
      if (!timestamp) return dataOriginal

      const date = timestamp instanceof Date ? new Date(timestamp) : new Date(timestamp)
      if (isNaN(date.getTime())) return dataOriginal

      // tira 6h para alinhar o "dia de produção"
      date.setHours(date.getHours() - 6)

      return date.toISOString().split("T")[0] // YYYY-MM-DD
    } catch {
      return dataOriginal
    }
  }

  const carregarDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabase()
      if (!supabase) throw new Error("Cliente Supabase não inicializado")

      // 1) DEFINIR PERÍODO (datas em YYYY-MM-DD)
      let dataInicio: string
      let dataFimCalculada: string
      const hojeStr = new Date().toISOString().split("T")[0]

      switch (periodoSelecionado) {
        case "hoje":
          dataInicio = dataSelecionada
          dataFimCalculada = dataSelecionada
          break
        case "semana": {
          const d = new Date()
          const fim = new Date()
          d.setDate(d.getDate() - 6) // últimos 7 dias
          dataInicio = d.toISOString().split("T")[0]
          dataFimCalculada = fim.toISOString().split("T")[0]
          break
        }
        case "mes": {
          const d = new Date()
          const fim = new Date()
          d.setDate(d.getDate() - 29) // últimos 30 dias
          dataInicio = d.toISOString().split("T")[0]
          dataFimCalculada = fim.toISOString().split("T")[0]
          break
        }
        case "personalizado":
          dataInicio = dataSelecionada
          dataFimCalculada = dataFim
          break
        default:
          dataInicio = dataSelecionada
          dataFimCalculada = dataSelecionada
      }

      // para buscar no banco: de dataInicio até (dataFim + 1 dia)
      const dataFimBuscaDate = new Date(dataFimCalculada)
      dataFimBuscaDate.setDate(dataFimBuscaDate.getDate() + 1)
      const dataFimBusca = dataFimBuscaDate.toISOString().split("T")[0]
      const dataInicioBusca = dataInicio

      // 2) BUSCAR CARROS ATIVOS (com paginação para evitar limite de 1000)
      const pageSizeCarros = 1000
      let offsetCarros = 0
      let hasMoreCarros = true
      const todosCarrosArray: any[] = []
      
      while (hasMoreCarros) {
        const { data: carrosPage, error: errorCarrosPage } = await supabase
          .from("carros_status")
          .select("*")
          .gte("created_at", `${dataInicioBusca}T00:00:00`)
          .lte("created_at", `${dataFimBusca}T23:59:59`)
          .range(offsetCarros, offsetCarros + pageSizeCarros - 1)
          .order("created_at", { ascending: true })
        
        if (errorCarrosPage) throw errorCarrosPage
        
        if (carrosPage && carrosPage.length > 0) {
          todosCarrosArray.push(...carrosPage)
          offsetCarros += pageSizeCarros
          hasMoreCarros = carrosPage.length === pageSizeCarros
        } else {
          hasMoreCarros = false
        }
      }
      
      const todosCarros = todosCarrosArray

      // 3) BUSCAR NOTAS (com paginação para evitar limite de 1000)
      // Buscar notas com range ampliado para incluir madrugada do dia seguinte
      // Para período único dia: buscar de dataInicio até dataFimBusca (que já inclui dia seguinte)
      const pageSizeNotas = 1000
      let offsetNotas = 0
      let hasMoreNotas = true
      const todasNotasArray: any[] = []
      
      while (hasMoreNotas) {
        const { data: notasPage, error: errorNotasPage } = await supabase
          .from("embalagem_notas_bipadas")
          .select("id, volumes, data, timestamp_bipagem, turno, colaboradores")
          .gte("data", dataInicioBusca)
          .lte("data", dataFimBusca)
          .range(offsetNotas, offsetNotas + pageSizeNotas - 1)
          .order("data", { ascending: true })
        
        if (errorNotasPage) throw errorNotasPage
        
        if (notasPage && notasPage.length > 0) {
          todasNotasArray.push(...notasPage)
          offsetNotas += pageSizeNotas
          hasMoreNotas = notasPage.length === pageSizeNotas
        } else {
          hasMoreNotas = false
        }
      }
      
      const todasNotas = todasNotasArray

      // 4) BUSCAR CARROS FINALIZADOS (com paginação para evitar limite de 1000)
      let offsetCarrosFinalizados = 0
      let hasMoreCarrosFinalizados = true
      const todosCarrosFinalizadosArray: any[] = []
      
      while (hasMoreCarrosFinalizados) {
        const { data: carrosFinalizadosPage, error: errorCarrosFinalizadosPage } = await supabase
          .from("embalagem_carros_finalizados")
          .select("carros, created_at")
          .gte("created_at", `${dataInicio}T00:00:00`)
          .lte("created_at", `${dataFimBusca}T23:59:59`)
          .range(offsetCarrosFinalizados, offsetCarrosFinalizados + pageSizeCarros - 1)
          .order("created_at", { ascending: true })
        
        if (errorCarrosFinalizadosPage) throw errorCarrosFinalizadosPage
        
        if (carrosFinalizadosPage && carrosFinalizadosPage.length > 0) {
          todosCarrosFinalizadosArray.push(...carrosFinalizadosPage)
          offsetCarrosFinalizados += pageSizeCarros
          hasMoreCarrosFinalizados = carrosFinalizadosPage.length === pageSizeCarros
        } else {
          hasMoreCarrosFinalizados = false
        }
      }
      
      const todosCarrosFinalizados = todosCarrosFinalizadosArray

      // 5) FILTRAR PELO DIA DE PRODUÇÃO (06h → 05:59)
      // REGRA: Um dia vai das 06:00 até 05:59 do dia seguinte
      // Exemplo: Dia 10/12 = carros criados das 06:00 de 10/12 até 05:59 de 11/12
      const carrosHoje = (todosCarros || []).filter((carro) => {
        const ts = (carro.created_at || carro.data_criacao || carro.data) as
          | string
          | Date
          | null
          | undefined
        
        if (!ts) {
          // Se não tem timestamp, usar a data do carro diretamente
          const dataCarro = carro.data as string
          return dataCarro >= dataInicio && dataCarro <= dataFimCalculada
        }

        try {
          const dataHora = ts instanceof Date ? new Date(ts) : new Date(ts)
          if (isNaN(dataHora.getTime())) {
            // Timestamp inválido, usar data do carro
            const dataCarro = carro.data as string
            return dataCarro >= dataInicio && dataCarro <= dataFimCalculada
          }

          const dataStr = dataHora.toISOString().split('T')[0]
          const hora = dataHora.getUTCHours() // Usar UTC para evitar problemas de timezone

          // Se o período for "hoje" ou "personalizado" com um único dia, aplicar regra de 06:00
          const isPeriodoUnicoDia = periodoSelecionado === 'hoje' || (periodoSelecionado === 'personalizado' && dataSelecionada === dataFim)
          
          if (isPeriodoUnicoDia) {
            // REGRA: Dia 10/12 = carros criados das 06:00 de 10/12 até 05:59 de 11/12
            // Incluir carros criados:
            // 1. No dia selecionado (dataSelecionada) entre 06:00-23:59
            // 2. No dia seguinte (dataSelecionada + 1) entre 00:00-05:59
            // EXCLUIR carros criados na madrugada do dia selecionado (00:00-05:59) - pertencem ao dia anterior
            const dataDiaSeguinte = new Date(dataSelecionada)
            dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
            const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0]

            if (dataStr === dataSelecionada) {
              // Carro criado no dia selecionado
              if (hora >= 6) {
                return true // Após 06:00 - pertence ao dia selecionado
              }
              return false // Antes de 06:00 - pertence ao dia anterior (excluir)
            }
            if (dataStr === dataDiaSeguinteStr && hora < 6) {
              return true // Carro criado na madrugada do dia seguinte (pertence ao dia selecionado)
            }
            return false // Excluir todos os outros (incluindo madrugada do dia selecionado)
          }

          // Para outros períodos, usar calcularDataCorreta
          const dataProducao = calcularDataCorreta(ts, carro.data as string)
          return dataProducao >= dataInicio && dataProducao <= dataFimCalculada
        } catch {
          // Em caso de erro, usar data do carro
          const dataCarro = carro.data as string
          return dataCarro >= dataInicio && dataCarro <= dataFimCalculada
        }
      })

      // Log detalhado dos carros incluídos/excluídos
      const carrosIncluidos: any[] = []
      const carrosExcluidos: any[] = []
      
      todosCarros?.forEach(carro => {
        const ts = (carro.created_at || carro.data_criacao || carro.data) as string | Date | null | undefined
        if (ts) {
          try {
            const dataHora = ts instanceof Date ? new Date(ts) : new Date(ts)
            if (!isNaN(dataHora.getTime())) {
              const dataStr = dataHora.toISOString().split('T')[0]
              const hora = dataHora.getUTCHours() // Usar UTC para evitar problemas de timezone
              const isPeriodoUnicoDia = periodoSelecionado === 'hoje' || (periodoSelecionado === 'personalizado' && dataSelecionada === dataFim)
              
              if (isPeriodoUnicoDia) {
                const dataDiaSeguinte = new Date(dataSelecionada)
                dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
                const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0]
                
                const incluido = (dataStr === dataSelecionada && hora >= 6) || (dataStr === dataDiaSeguinteStr && hora < 6)
                
                if (incluido) {
                  carrosIncluidos.push({
                    id: carro.id,
                    created_at: carro.created_at,
                    data: carro.data,
                    data_str: dataStr,
                    hora: hora,
                    motivo: dataStr === dataSelecionada ? 'dia_selecionado_apos_06h' : 'madrugada_dia_seguinte'
                  })
                } else {
                  carrosExcluidos.push({
                    id: carro.id,
                    created_at: carro.created_at,
                    data: carro.data,
                    data_str: dataStr,
                    hora: hora,
                    motivo: dataStr === dataSelecionada && hora < 6 ? 'madrugada_dia_selecionado' : 'outro_dia'
                  })
                }
              }
            }
          } catch {}
        }
      })

      console.log('📊 Debug - Filtro de carros detalhado:', {
        total_buscado: todosCarros?.length || 0,
        total_filtrado: carrosHoje.length,
        periodo: periodoSelecionado,
        data_inicio: dataInicio,
        data_fim: dataFimCalculada,
        data_selecionada: dataSelecionada,
        carros_incluidos: carrosIncluidos.slice(0, 5),
        carros_excluidos: carrosExcluidos.slice(0, 5),
        total_incluidos: carrosIncluidos.length,
        total_excluidos: carrosExcluidos.length
      })

      // Filtrar notas - para período único dia, contar todas as notas bipadas no dia (sem regra de 06:00)
      // Para períodos maiores, aplicar regra de 06:00
      const notasHoje = (todasNotas || []).filter((nota) => {
        const ts = (nota.timestamp_bipagem || nota.data) as string | Date | null | undefined
        const notaData = nota.data as string
        if (!notaData) return false

        // Se o período for "hoje" ou "personalizado" com um único dia, contar todas as notas do dia
        const isPeriodoUnicoDia = periodoSelecionado === 'hoje' || (periodoSelecionado === 'personalizado' && dataSelecionada === dataFim)

        if (isPeriodoUnicoDia) {
          // Para período único dia, aplicar regra de 06:00 (igual à evolução semanal)
          // REGRA: Dia X = notas bipadas das 06:00 de X até 05:59 de X+1
          if (!ts || ts === notaData) {
            // Sem timestamp válido, usar campo data
            // Incluir notas do dia selecionado ou do dia seguinte (podem ser da madrugada)
            const dataDiaSeguinte = new Date(dataSelecionada)
            dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
            const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0]
            return notaData === dataSelecionada || notaData === dataDiaSeguinteStr
          }
          
          try {
            const dataHora = ts instanceof Date ? new Date(ts) : new Date(ts)
            if (isNaN(dataHora.getTime())) {
              const dataDiaSeguinte = new Date(dataSelecionada)
              dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
              const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0]
              return notaData === dataSelecionada || notaData === dataDiaSeguinteStr
            }
            
            const dataStr = dataHora.toISOString().split('T')[0]
            const hora = dataHora.getUTCHours()
            const dataDiaSeguinte = new Date(dataSelecionada)
            dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
            const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0]
            
            // REGRA: Dia X = notas bipadas das 06:00 de X até 05:59 de X+1
            return (dataStr === dataSelecionada && hora >= 6) || (dataStr === dataDiaSeguinteStr && hora < 6)
          } catch {
            const dataDiaSeguinte = new Date(dataSelecionada)
            dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
            const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0]
            return notaData === dataSelecionada || notaData === dataDiaSeguinteStr
          }
        }

        // Para períodos maiores, aplicar regra de 06:00
        if (!ts || ts === notaData) {
          // Sem timestamp válido, usar apenas a data
          return notaData >= dataInicio && notaData <= dataFimCalculada
        }

        try {
          const dataHora = ts instanceof Date ? new Date(ts) : new Date(ts)
          if (isNaN(dataHora.getTime())) {
            return notaData >= dataInicio && notaData <= dataFimCalculada
          }

          const dataStr = dataHora.toISOString().split('T')[0]
          const hora = dataHora.getUTCHours()

          // Para períodos de múltiplos dias, aplicar regra de 06:00 para cada dia do range
          for (let d = new Date(dataInicio); d <= new Date(dataFimCalculada); d.setDate(d.getDate() + 1)) {
            const dataDia = d.toISOString().split('T')[0]
            const dataDiaSeguinte = new Date(dataDia)
            dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
            const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0]

            // Verificar se a nota pertence a este dia (06:00 até 05:59 do dia seguinte)
            if ((dataStr === dataDia && hora >= 6) || (dataStr === dataDiaSeguinteStr && hora < 6)) {
              return true
            }
          }
          
          return false
        } catch {
          return notaData >= dataInicio && notaData <= dataFimCalculada
        }
      })


      const carrosFinalizadosFiltrados =
        (todosCarrosFinalizados || []).filter((item) => {
          if (!item.created_at) return false
          const ts = item.created_at as string | Date | null | undefined
          if (!ts) return false
          const dataOriginal =
            typeof ts === "string" ? ts.split("T")[0] : ts.toISOString().split("T")[0]
          const dataProducao = calcularDataCorreta(ts, dataOriginal)
          return dataProducao >= dataInicio && dataProducao <= dataFimCalculada
        }) || []

      // 6) TOTAL DE CARROS (IDs ÚNICOS)
      // IMPORTANTE: Contar apenas carros de carros_status (baseado em created_at)
      // Não incluir carros finalizados para evitar duplicação
      const carrosIdsUnicos = new Set<string>()

      console.log('📊 Debug - Carros encontrados:', {
        total_buscado: todosCarros?.length || 0,
        total_filtrado: carrosHoje.length,
        periodo: periodoSelecionado,
        data_inicio: dataInicio,
        data_fim: dataFimCalculada,
        data_inicio_busca: dataInicioBusca,
        data_fim_busca: dataFimBusca,
        usando_apenas_carros_status: true
      })

      // Contar apenas carros de carros_status (não incluir carros finalizados)
      carrosHoje.forEach((carro: any) => {
        if (carro.id) carrosIdsUnicos.add(String(carro.id))
      })

      // NÃO adicionar carros finalizados para evitar duplicação
      // Os carros já estão em carros_status quando são criados
      // carrosFinalizadosFiltrados.forEach((item: any) => {
      //   if (Array.isArray(item.carros)) {
      //     item.carros.forEach((carro: any) => {
      //       if (carro.id) carrosIdsUnicos.add(String(carro.id))
      //     })
      //   }
      // })

      const totalCarrosHoje = carrosIdsUnicos.size

      console.log('📊 Debug - Contagem final de carros:', {
        total_carros_unicos: totalCarrosHoje,
        carros_de_status: carrosHoje.length,
        carros_finalizados_ignorados: 'Não incluídos para evitar duplicação'
      })

      // 7) TOTAL DE NOTAS E VOLUMES
      // Remover duplicatas por ID antes de contar
      const notasHojeUnicas = Array.from(
        new Map(notasHoje.map((nota: any) => [nota.id, nota])).values()
      )
      
      const totalNotasHoje = notasHojeUnicas.length
      const totalVolumesHoje =
        notasHojeUnicas.reduce((acc, n: any) => {
          const vol = Number(n.volumes) || 0
          if (isNaN(vol)) {
            console.warn('⚠️ Volume inválido na nota:', n.id, n.volumes)
            return acc
          }
          return acc + vol
        }, 0) || 0

      // Debug: Log para verificar contagem
      console.log('📊 Debug Dashboard - Notas e Volumes:', {
        total_notas_filtradas: notasHoje.length,
        total_notas_unicas: notasHojeUnicas.length,
        total_volumes: totalVolumesHoje,
        periodo: periodoSelecionado,
        data_selecionada: dataSelecionada,
        data_fim: dataFim,
        exemplo_nota: notasHojeUnicas[0],
        soma_volumes_manual: notasHojeUnicas.slice(0, 10).reduce((acc, n: any) => acc + (Number(n.volumes) || 0), 0)
      })

      // Log detalhado das notas incluídas/excluídas
      const notasIncluidas: any[] = []
      const notasExcluidas: any[] = []
      const notasSemTimestamp: any[] = []
      
      todasNotas?.forEach(nota => {
        const ts = (nota.timestamp_bipagem || nota.data) as string | Date | null | undefined
        const notaData = nota.data as string
        if (!notaData) {
          notasExcluidas.push({ motivo: 'sem_data', id: nota.id })
          return
        }

        const isPeriodoUnicoDia = periodoSelecionado === 'hoje' || (periodoSelecionado === 'personalizado' && dataSelecionada === dataFim)
        
        if (isPeriodoUnicoDia) {
          if (!ts) {
            // Sem timestamp, verificar se a data está no range
            const incluida = notaData >= dataInicio && notaData <= dataFimCalculada
            if (incluida) {
              notasSemTimestamp.push({
                id: nota.id,
                data: nota.data,
                volumes: nota.volumes,
                motivo: 'sem_timestamp_usando_data'
              })
            } else {
              notasExcluidas.push({
                id: nota.id,
                data: nota.data,
                volumes: nota.volumes,
                motivo: 'sem_timestamp_fora_do_range'
              })
            }
            return
          }

          try {
            const dataHora = ts instanceof Date ? new Date(ts) : new Date(ts)
            if (isNaN(dataHora.getTime())) {
              notasExcluidas.push({
                id: nota.id,
                timestamp_bipagem: nota.timestamp_bipagem,
                data: nota.data,
                volumes: nota.volumes,
                motivo: 'timestamp_invalido'
              })
              return
            }

            const dataStr = dataHora.toISOString().split('T')[0]
            const hora = dataHora.getUTCHours()

            const dataDiaSeguinte = new Date(dataSelecionada)
            dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
            const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split('T')[0]

            const incluida = (dataStr === dataSelecionada && hora >= 6) || (dataStr === dataDiaSeguinteStr && hora < 6)
            
            if (incluida) {
              notasIncluidas.push({
                id: nota.id,
                timestamp_bipagem: nota.timestamp_bipagem,
                data: nota.data,
                data_str: dataStr,
                hora: hora,
                volumes: nota.volumes,
                motivo: dataStr === dataSelecionada ? 'dia_selecionado_apos_06h' : 'madrugada_dia_seguinte'
              })
            } else {
              notasExcluidas.push({
                id: nota.id,
                timestamp_bipagem: nota.timestamp_bipagem,
                data: nota.data,
                data_str: dataStr,
                hora: hora,
                volumes: nota.volumes,
                motivo: dataStr === dataSelecionada && hora < 6 ? 'madrugada_dia_selecionado' : 
                        dataStr === dataDiaSeguinteStr && hora >= 6 ? 'dia_seguinte_apos_06h' : 'outro_dia'
              })
            }
          } catch (error) {
            notasExcluidas.push({
              id: nota.id,
              timestamp_bipagem: nota.timestamp_bipagem,
              data: nota.data,
              volumes: nota.volumes,
              motivo: 'erro_ao_processar'
            })
          }
        }
      })

      console.log('📊 Debug - Notas encontradas:', {
        total_buscado: todasNotas?.length || 0,
        total_filtrado: notasHoje.length,
        total_volumes: totalVolumesHoje,
        periodo: periodoSelecionado,
        data_inicio: dataInicio,
        data_fim: dataFimCalculada,
        data_selecionada: dataSelecionada,
        notas_incluidas: notasIncluidas.slice(0, 10),
        notas_excluidas: notasExcluidas.slice(0, 10),
        notas_sem_timestamp: notasSemTimestamp.slice(0, 10),
        total_incluidas: notasIncluidas.length,
        total_excluidas: notasExcluidas.length,
        total_sem_timestamp: notasSemTimestamp.length,
        resumo_excluidas: notasExcluidas.reduce((acc, n) => {
          acc[n.motivo] = (acc[n.motivo] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      })

      // 8) CARROS POR TURNO (sem loucura de "ontem/hoje")
      const carrosPorTurno = {
        manha: 0,
        tarde: 0,
        noite: 0,
        madrugada: 0,
      }

      // 8.1) VOLUMES POR TURNO
      const volumesPorTurno = {
        manha: 0,
        tarde: 0,
        noite: 0,
        madrugada: 0,
      }

      const carrosProcessadosPorTurno = new Set<string>()

      const marcarTurno = (turnoRaw: string | null | undefined, id: string | null) => {
        if (!id) return
        if (carrosProcessadosPorTurno.has(id)) return
        carrosProcessadosPorTurno.add(id)

        const turno = String(turnoRaw || "A").toUpperCase()
        switch (turno) {
          case "A":
            carrosPorTurno.manha++
            break
          case "B":
            carrosPorTurno.tarde++
            break
          case "C":
            carrosPorTurno.noite++
            break
          case "D":
            carrosPorTurno.madrugada++
            break
          default:
            carrosPorTurno.manha++
        }
      }

      // Contar turnos apenas dos carros de carros_status (não incluir carros finalizados)
      carrosHoje.forEach((carro: any) => {
        if (!carro.id) return
        marcarTurno(carro.turno, String(carro.id))
      })

      // Calcular volumes por turno baseado nas notas
      notasHoje.forEach((nota: any) => {
        const turnoNota = String(nota.turno || "A").toUpperCase()
        const volumesNota = Number(nota.volumes) || 0
        
        switch (turnoNota) {
          case "A":
            volumesPorTurno.manha += volumesNota
            break
          case "B":
            volumesPorTurno.tarde += volumesNota
            break
          case "C":
            volumesPorTurno.noite += volumesNota
            break
          case "D":
            volumesPorTurno.madrugada += volumesNota
            break
          default:
            volumesPorTurno.manha += volumesNota
        }
      })

      // NÃO adicionar carros finalizados para evitar duplicação
      // carrosFinalizadosFiltrados.forEach((item: any) => {
      //   if (Array.isArray(item.carros)) {
      //     item.carros.forEach((carro: any) => {
      //       if (!carro.id) return
      //       marcarTurno(carro.turno, String(carro.id))
      //     })
      //   }
      // })

      // 9) EVOLUÇÃO SEMANAL (sempre últimos 7 dias)
      const evolucaoSemanal: EstatisticasDashboard["evolucao_semanal"] = []
      const hojeEvolucao = new Date()
      const dataFimEvolucaoSemanal = hojeEvolucao.toISOString().split("T")[0]
      const dataInicioEvolucaoSemanal = new Date(hojeEvolucao)
      dataInicioEvolucaoSemanal.setDate(dataInicioEvolucaoSemanal.getDate() - 6)
      const dataInicioEvolucaoSemanalStr = dataInicioEvolucaoSemanal.toISOString().split("T")[0]

      // Buscar dados adicionais para evolução semanal (últimos 7 dias)
      const dataFimBuscaEvolucaoSemanal = new Date(dataFimEvolucaoSemanal)
      dataFimBuscaEvolucaoSemanal.setDate(dataFimBuscaEvolucaoSemanal.getDate() + 1)
      const dataFimBuscaEvolucaoSemanalStr = dataFimBuscaEvolucaoSemanal.toISOString().split("T")[0]

      const { data: carrosEvolucaoSemanal } = await supabase
        .from("carros_status")
        .select("*")
        .gte("created_at", `${dataInicioEvolucaoSemanalStr}T00:00:00`)
        .lte("created_at", `${dataFimBuscaEvolucaoSemanalStr}T23:59:59`)

      // Buscar todas as notas com paginação para evolução semanal
      const pageSize = 1000
      let offset = 0
      let hasMore = true
      const todasNotasEvolucaoSemanal: any[] = []
      
      while (hasMore) {
        const { data: notasPage, error: errorNotasPage } = await supabase
          .from("embalagem_notas_bipadas")
          .select("id, volumes, data, timestamp_bipagem, turno, colaboradores")
          .gte("data", dataInicioEvolucaoSemanalStr)
          .lte("data", dataFimBuscaEvolucaoSemanalStr)
          .range(offset, offset + pageSize - 1)
          .order("data", { ascending: true })
        
        if (errorNotasPage) throw errorNotasPage
        
        if (notasPage && notasPage.length > 0) {
          todasNotasEvolucaoSemanal.push(...notasPage)
          offset += pageSize
          hasMore = notasPage.length === pageSize
        } else {
          hasMore = false
        }
      }
      
      const notasEvolucaoSemanal = todasNotasEvolucaoSemanal

      for (let i = 6; i >= 0; i--) {
        const data = new Date(hojeEvolucao)
        data.setDate(data.getDate() - i)
        const dataStr = data.toISOString().split("T")[0]
        const dataDiaSeguinte = new Date(data)
        dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
        const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split("T")[0]

        const carrosIdsDia = new Set<string>()

        // carros ativos dos últimos 7 dias - aplicar regra de 06:00
        ;(carrosEvolucaoSemanal || []).forEach((carro: any) => {
          if (!carro.id) return
          const ts = (carro.created_at || carro.data_criacao || carro.data) as
            | string
            | Date
            | null
            | undefined
          
          if (!ts) {
            const dataCarro = carro.data as string
            if (dataCarro === dataStr) carrosIdsDia.add(String(carro.id))
            return
          }

          try {
            const dataHora = ts instanceof Date ? new Date(ts) : new Date(ts)
            if (isNaN(dataHora.getTime())) {
              const dataCarro = carro.data as string
              if (dataCarro === dataStr) carrosIdsDia.add(String(carro.id))
              return
            }

            const dataStrCarro = dataHora.toISOString().split('T')[0]
            const hora = dataHora.getUTCHours()

            // REGRA: Dia X = carros criados das 06:00 de X até 05:59 de X+1
            if ((dataStrCarro === dataStr && hora >= 6) || (dataStrCarro === dataDiaSeguinteStr && hora < 6)) {
              carrosIdsDia.add(String(carro.id))
            }
          } catch {
            const dataCarro = carro.data as string
            if (dataCarro === dataStr) carrosIdsDia.add(String(carro.id))
          }
        })

        const carrosDia = carrosIdsDia.size

        // Notas - aplicar regra de 06:00
        const notasDia = (notasEvolucaoSemanal || []).filter((n: any) => {
          const ts = (n.timestamp_bipagem || n.data) as string | Date | null | undefined
          const notaData = n.data as string
          if (!notaData) return false

          if (!ts || ts === notaData) {
            // Sem timestamp válido, verificar se a data está no range
            return notaData === dataStr || notaData === dataDiaSeguinteStr
          }

          try {
            const dataHora = ts instanceof Date ? new Date(ts) : new Date(ts)
            if (isNaN(dataHora.getTime())) {
              return notaData === dataStr || notaData === dataDiaSeguinteStr
            }

            const dataStrNota = dataHora.toISOString().split('T')[0]
            const hora = dataHora.getUTCHours()

            // REGRA: Dia X = notas bipadas das 06:00 de X até 05:59 de X+1
            return (dataStrNota === dataStr && hora >= 6) || (dataStrNota === dataDiaSeguinteStr && hora < 6)
          } catch {
            return notaData === dataStr || notaData === dataDiaSeguinteStr
          }
        })

        // Remover duplicatas por ID antes de contar
        const notasDiaUnicas = Array.from(
          new Map(notasDia.map((nota: any) => [nota.id, nota])).values()
        )
        
        const notasCountDia = notasDiaUnicas.length
        const volumesDia =
          notasDiaUnicas.reduce((acc, n: any) => {
            const vol = Number(n.volumes) || 0
            if (isNaN(vol)) {
              console.warn('⚠️ Volume inválido na nota:', n.id, n.volumes)
              return acc
            }
            return acc + vol
          }, 0)

        evolucaoSemanal.push({
          data: dataStr,
          carros: Number(carrosDia) || 0,
          notas: Number(notasCountDia) || 0,
          volumes: volumesDia,
        })
      }

      console.log('📊 Debug - Evolução Semanal:', {
        total_notas_buscadas: notasEvolucaoSemanal?.length || 0,
        dias: evolucaoSemanal.map(d => ({
          data: d.data,
          notas: d.notas,
          volumes: d.volumes
        })),
        total_volumes_semanal: evolucaoSemanal.reduce((acc, d) => acc + d.volumes, 0)
      })

      // 9.1) EVOLUÇÃO MENSAL (sempre últimos 30 dias)
      const evolucaoMensal: EstatisticasDashboard["evolucao_mensal"] = []
      const dataInicioEvolucaoMensal = new Date(hojeEvolucao)
      dataInicioEvolucaoMensal.setDate(dataInicioEvolucaoMensal.getDate() - 29)
      const dataInicioEvolucaoMensalStr = dataInicioEvolucaoMensal.toISOString().split("T")[0]

      // Buscar dados adicionais para evolução mensal (últimos 30 dias)
      const dataFimBuscaEvolucaoMensal = new Date(dataFimEvolucaoSemanal)
      dataFimBuscaEvolucaoMensal.setDate(dataFimBuscaEvolucaoMensal.getDate() + 1)
      const dataFimBuscaEvolucaoMensalStr = dataFimBuscaEvolucaoMensal.toISOString().split("T")[0]

      const { data: carrosEvolucaoMensal } = await supabase
        .from("carros_status")
        .select("*")
        .gte("created_at", `${dataInicioEvolucaoMensalStr}T00:00:00`)
        .lte("created_at", `${dataFimBuscaEvolucaoMensalStr}T23:59:59`)

      // Buscar todas as notas com paginação para evolução mensal
      offset = 0
      hasMore = true
      const todasNotasEvolucaoMensal: any[] = []
      
      while (hasMore) {
        const { data: notasPage, error: errorNotasPage } = await supabase
          .from("embalagem_notas_bipadas")
          .select("id, volumes, data, timestamp_bipagem, turno, colaboradores")
          .gte("data", dataInicioEvolucaoMensalStr)
          .lte("data", dataFimBuscaEvolucaoMensalStr)
          .range(offset, offset + pageSize - 1)
          .order("data", { ascending: true })
        
        if (errorNotasPage) throw errorNotasPage
        
        if (notasPage && notasPage.length > 0) {
          todasNotasEvolucaoMensal.push(...notasPage)
          offset += pageSize
          hasMore = notasPage.length === pageSize
        } else {
          hasMore = false
        }
      }
      
      const notasEvolucaoMensal = todasNotasEvolucaoMensal

      for (let i = 29; i >= 0; i--) {
        const data = new Date(hojeEvolucao)
        data.setDate(data.getDate() - i)
        const dataStr = data.toISOString().split("T")[0]
        const dataDiaSeguinte = new Date(data)
        dataDiaSeguinte.setDate(dataDiaSeguinte.getDate() + 1)
        const dataDiaSeguinteStr = dataDiaSeguinte.toISOString().split("T")[0]

        const carrosIdsDia = new Set<string>()

        // carros ativos dos últimos 30 dias - aplicar regra de 06:00
        ;(carrosEvolucaoMensal || []).forEach((carro: any) => {
          if (!carro.id) return
          const ts = (carro.created_at || carro.data_criacao || carro.data) as
            | string
            | Date
            | null
            | undefined
          
          if (!ts) {
            const dataCarro = carro.data as string
            if (dataCarro === dataStr) carrosIdsDia.add(String(carro.id))
            return
          }

          try {
            const dataHora = ts instanceof Date ? new Date(ts) : new Date(ts)
            if (isNaN(dataHora.getTime())) {
              const dataCarro = carro.data as string
              if (dataCarro === dataStr) carrosIdsDia.add(String(carro.id))
              return
            }

            const dataStrCarro = dataHora.toISOString().split('T')[0]
            const hora = dataHora.getUTCHours()

            // REGRA: Dia X = carros criados das 06:00 de X até 05:59 de X+1
            if ((dataStrCarro === dataStr && hora >= 6) || (dataStrCarro === dataDiaSeguinteStr && hora < 6)) {
              carrosIdsDia.add(String(carro.id))
            }
          } catch {
            const dataCarro = carro.data as string
            if (dataCarro === dataStr) carrosIdsDia.add(String(carro.id))
          }
        })

        const carrosDia = carrosIdsDia.size

        // Notas - aplicar regra de 06:00
        const notasDia = (notasEvolucaoMensal || []).filter((n: any) => {
          const ts = (n.timestamp_bipagem || n.data) as string | Date | null | undefined
          const notaData = n.data as string
          if (!notaData) return false

          if (!ts || ts === notaData) {
            // Sem timestamp válido, verificar se a data está no range
            return notaData === dataStr || notaData === dataDiaSeguinteStr
          }

          try {
            const dataHora = ts instanceof Date ? new Date(ts) : new Date(ts)
            if (isNaN(dataHora.getTime())) {
              return notaData === dataStr || notaData === dataDiaSeguinteStr
            }

            const dataStrNota = dataHora.toISOString().split('T')[0]
            const hora = dataHora.getUTCHours()

            // REGRA: Dia X = notas bipadas das 06:00 de X até 05:59 de X+1
            return (dataStrNota === dataStr && hora >= 6) || (dataStrNota === dataDiaSeguinteStr && hora < 6)
          } catch {
            return notaData === dataStr || notaData === dataDiaSeguinteStr
          }
        })

        // Remover duplicatas por ID antes de contar
        const notasDiaUnicas = Array.from(
          new Map(notasDia.map((nota: any) => [nota.id, nota])).values()
        )
        
        const notasCountDia = notasDiaUnicas.length
        const volumesDia =
          notasDiaUnicas.reduce((acc, n: any) => {
            const vol = Number(n.volumes) || 0
            if (isNaN(vol)) {
              console.warn('⚠️ Volume inválido na nota:', n.id, n.volumes)
              return acc
            }
            return acc + vol
          }, 0)

        evolucaoMensal.push({
          data: dataStr,
          carros: Number(carrosDia) || 0,
          notas: Number(notasCountDia) || 0,
          volumes: volumesDia,
        })
      }

      // 10) COLABORADORES DESTAQUE (baseado em notasHoje)
      const colaboradoresMap = new Map<
        string,
        {
          nome: string
          carros_processados: number
          notas_processadas: number
          volumes_processados: number
          turno: string
          data: string
        }
      >()

      notasHoje.forEach((nota: any) => {
        const colaboradores = Array.isArray(nota.colaboradores)
          ? nota.colaboradores
          : [nota.colaboradores || "Colaborador"]

        const ts = (nota.timestamp_bipagem || nota.data) as
          | string
          | Date
          | null
          | undefined
        const dataProducao = calcularDataCorreta(ts, nota.data)

        let turno = "manha"
        const turnoNota = String(nota.turno || "A").toUpperCase()
        switch (turnoNota) {
          case "A":
            turno = "manha"
            break
          case "B":
            turno = "tarde"
            break
          case "C":
            turno = "noite"
            break
          case "D":
            turno = "madrugada"
            break
        }

        colaboradores.forEach((colabNome: string) => {
          if (!colabNome) return
          if (!colaboradoresMap.has(colabNome)) {
            colaboradoresMap.set(colabNome, {
              nome: colabNome,
              carros_processados: 0,
              notas_processadas: 0,
              volumes_processados: 0,
              turno,
              data: dataProducao,
            })
          }
          const colab = colaboradoresMap.get(colabNome)!
          colab.notas_processadas++
          colab.volumes_processados += nota.volumes ?? 1
        })
      })

      colaboradoresMap.forEach((colab) => {
        // aproximação: 10 notas por carro
        colab.carros_processados = Math.ceil(colab.notas_processadas / 10)
      })

      const colaboradoresDestaque: ColaboradorDestaque[] = Array.from(
        colaboradoresMap.values()
      )
        .map((colab) => {
          // produtividade simples: volumes / 6h (um turno)
          const horasTrabalho = 6
          const produtividade = colab.volumes_processados / horasTrabalho
          return {
            ...colab,
            produtividade_media: Math.round(produtividade * 100) / 100,
          }
        })
        .sort((a, b) => b.produtividade_media - a.produtividade_media)
        .slice(0, 5)

      // 11) PRODUTIVIDADE MÉDIA (volumes/hora)
      const calcularProdutividadePorTempo = () => {
        if (totalVolumesHoje === 0) return 0

        // período único (hoje ou personalizado com mesma data)
        const isPeriodoUnicoDia =
          periodoSelecionado === "hoje" ||
          (periodoSelecionado === "personalizado" && dataSelecionada === dataFim)

        if (isPeriodoUnicoDia) {
          if (notasHoje.length === 0) return 0

          const timestamps = notasHoje
            .map((n: any) => {
              try {
                const ts = (n.timestamp_bipagem || n.data) as
                  | string
                  | Date
                  | null
                  | undefined
                return ts ? new Date(ts).getTime() : null
              } catch {
                return null
              }
            })
            .filter((ts): ts is number => ts !== null)
            .sort((a, b) => a - b)

          if (timestamps.length === 0) return 0

          const primeiro = timestamps[0]
          const ultimo = timestamps[timestamps.length - 1]
          const diffHoras = (ultimo - primeiro) / (1000 * 60 * 60)
          const horasTrabalhadas = Math.max(1, diffHoras + 1)

          return Math.round((totalVolumesHoje / horasTrabalhadas) * 100) / 100
        }

        // período maior (semana, mês, personalizado intervalo)
        const diffMs2 =
          new Date(dataFimCalculada).getTime() - new Date(dataInicio).getTime()
        const dias = Math.floor(diffMs2 / (1000 * 60 * 60 * 24)) + 1
        const horasEstimadas = dias * 6 // 6h por dia
        const horas = Math.max(1, horasEstimadas)
        return Math.round((totalVolumesHoje / horas) * 100) / 100
      }

      const produtividadeMediaHoje = calcularProdutividadePorTempo()

      // Para período único dia, usar os valores da evolução semanal para garantir consistência
      const isPeriodoUnicoDia = periodoSelecionado === 'hoje' || (periodoSelecionado === 'personalizado' && dataSelecionada === dataFim)
      let totalNotasFinal = totalNotasHoje
      let totalVolumesFinal = totalVolumesHoje
      
      if (isPeriodoUnicoDia) {
        // Buscar o valor correto da evolução semanal para o dia selecionado
        const diaEvolucao = evolucaoSemanal.find(d => d.data === dataSelecionada)
        if (diaEvolucao) {
          totalNotasFinal = diaEvolucao.notas
          totalVolumesFinal = diaEvolucao.volumes
          console.log('📊 Usando valores da evolução semanal para período único dia:', {
            data: dataSelecionada,
            notas: totalNotasFinal,
            volumes: totalVolumesFinal,
            notas_calculadas: totalNotasHoje,
            volumes_calculados: totalVolumesHoje
          })
        }
      }

      const novoDashboardData: EstatisticasDashboard = {
        total_carros_hoje: totalCarrosHoje,
        total_notas_hoje: totalNotasFinal,
        total_volumes_hoje: totalVolumesFinal,
        produtividade_media_hoje: produtividadeMediaHoje,
        carros_por_turno: carrosPorTurno,
        volumes_por_turno: volumesPorTurno,
        evolucao_semanal: evolucaoSemanal,
        evolucao_mensal: evolucaoMensal,
        colaboradores_destaque: colaboradoresDestaque,
      }

      setDashboardData(novoDashboardData)
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err)
      setDashboardData({
        total_carros_hoje: 0,
        total_notas_hoje: 0,
        total_volumes_hoje: 0,
        produtividade_media_hoje: 0,
        carros_por_turno: {
          manha: 0,
          tarde: 0,
          noite: 0,
          madrugada: 0,
        },
        volumes_por_turno: {
          manha: 0,
          tarde: 0,
          noite: 0,
          madrugada: 0,
        },
        evolucao_semanal: [],
        evolucao_mensal: [],
        colaboradores_destaque: [],
      })
      setError(
        `Erro ao carregar dados: ${
          err instanceof Error ? err.message : "Erro desconhecido"
        }`
      )
    } finally {
      setLoading(false)
    }
  }, [periodoSelecionado, dataSelecionada, dataFim])

  useEffect(() => {
    carregarDashboardData()
  }, [periodoSelecionado, dataSelecionada, dataFim, carregarDashboardData])

  const getVariacaoIcon = (valor: number, comparacao: number) => {
    if (valor > comparacao) return <ArrowUp className="h-4 w-4 text-green-500" />
    if (valor < comparacao) return <ArrowDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500 dark:text-gray-400" />
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <div className="space-x-4">
          <Button onClick={carregarDashboardData} variant="outline">
            Tentar Novamente
          </Button>
          <Button
            onClick={async () => {
              try {
                const supabase = getSupabase()
                const { data, error } = await supabase
                  .from("carros_status")
                  .select("count")
                  .limit(1)
                alert(`Conexão: ${error ? "ERRO - " + error.message : "OK"}`)
              } catch (err) {
                alert("Erro no teste de conexão")
              }
            }}
            variant="secondary"
          >
            Testar Conexão
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header do Dashboard */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard de Estatísticas
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Visão geral da produtividade e performance do sistema
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
          <div className="flex space-x-2">
            <Button
              variant={periodoSelecionado === "hoje" ? "default" : "outline"}
              onClick={() => {
                setPeriodoSelecionado("hoje")
                setDataSelecionada(new Date().toISOString().split("T")[0])
              }}
              size="sm"
              className="text-xs sm:text-sm"
            >
              Hoje
            </Button>
            <Button
              variant={periodoSelecionado === "semana" ? "default" : "outline"}
              onClick={() => setPeriodoSelecionado("semana")}
              size="sm"
              className="text-xs sm:text-sm"
            >
              Semana
            </Button>
            <Button
              variant={periodoSelecionado === "mes" ? "default" : "outline"}
              onClick={() => setPeriodoSelecionado("mes")}
              size="sm"
              className="text-xs sm:text-sm"
            >
              Mês
            </Button>
            <Button
              variant={periodoSelecionado === "personalizado" ? "default" : "outline"}
              onClick={() => setPeriodoSelecionado("personalizado")}
              size="sm"
              className="text-xs sm:text-sm"
            >
              Personalizado
            </Button>
          </div>

          {periodoSelecionado === "hoje" && (
            <div className="flex items-center gap-2">
              <Label htmlFor="data-filtro" className="text-xs sm:text-sm whitespace-nowrap">
                Data:
              </Label>
              <Input
                id="data-filtro"
                type="date"
                value={dataSelecionada}
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="h-8 sm:h-9 text-xs sm:text-sm w-32 sm:w-40"
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          )}

          {periodoSelecionado === "personalizado" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="data-inicio" className="text-xs sm:text-sm whitespace-nowrap">
                  De:
                </Label>
                <Input
                  id="data-inicio"
                  type="date"
                  value={dataSelecionada}
                  onChange={(e) => {
                    setDataSelecionada(e.target.value)
                    if (e.target.value > dataFim) {
                      setDataFim(e.target.value)
                    }
                  }}
                  className="h-8 sm:h-9 text-xs sm:text-sm w-32 sm:w-40"
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="data-fim" className="text-xs sm:text-sm whitespace-nowrap">
                  Até:
                </Label>
                <Input
                  id="data-fim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="h-8 sm:h-9 text-xs sm:text-sm w-32 sm:w-40"
                  min={dataSelecionada}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white select-none dark:bg-blue-900/30 dark:border-blue-500/50">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-blue-100 text-xs sm:text-sm font-medium truncate">
                  Carros Processados
                </p>
                <p className="text-xl sm:text-3xl font-bold">
                  {dashboardData?.total_carros_hoje || 0}
                </p>
                <p className="text-blue-200 text-xs mt-1 truncate">
                  {periodoSelecionado === "hoje"
                    ? "Hoje"
                    : periodoSelecionado === "semana"
                    ? "Última Semana"
                    : periodoSelecionado === "mes"
                    ? "Último Mês"
                    : `${formatarData(dataSelecionada)} - ${formatarData(dataFim)}`}
                </p>
              </div>
              <Truck className="h-6 w-6 sm:h-12 sm:w-12 text-blue-200 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white select-none dark:bg-green-900/30 dark:border-green-500/50">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-green-100 text-xs sm:text-sm font-medium truncate">
                  Notas Bipadas
                </p>
                <p className="text-xl sm:text-3xl font-bold">
                  {dashboardData?.total_notas_hoje || 0}
                </p>
                <p className="text-green-200 text-xs mt-1 truncate">
                  {periodoSelecionado === "hoje"
                    ? "Hoje"
                    : periodoSelecionado === "semana"
                    ? "Última Semana"
                    : periodoSelecionado === "mes"
                    ? "Último Mês"
                    : `${formatarData(dataSelecionada)} - ${formatarData(dataFim)}`}
                </p>
              </div>
              <Activity className="h-6 w-6 sm:h-12 sm:w-12 text-green-200 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white select-none dark:bg-purple-900/30 dark:border-purple-500/50">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-purple-100 text-xs sm:text-sm font-medium truncate">
                  Volumes Processados
                </p>
                <p className="text-xl sm:text-3xl font-bold">
                  {dashboardData?.total_volumes_hoje || 0}
                </p>
                <p className="text-purple-200 text-xs mt-1 truncate">
                  {periodoSelecionado === "hoje"
                    ? "Hoje"
                    : periodoSelecionado === "semana"
                    ? "Última Semana"
                    : periodoSelecionado === "mes"
                    ? "Último Mês"
                    : `${formatarData(dataSelecionada)} - ${formatarData(dataFim)}`}
                </p>
              </div>
              <Package className="h-6 w-6 sm:h-12 sm:w-12 text-purple-200 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white select-none dark:bg-orange-900/30 dark:border-orange-500/50">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-orange-100 text-xs sm:text-sm font-medium truncate">
                  Produtividade Média
                </p>
                <p className="text-xl sm:text-3xl font-bold">
                  {dashboardData?.produtividade_media_hoje || 0}
                </p>
                <p className="text-orange-200 text-xs mt-1 truncate">Caixas/Hora</p>
              </div>
              <Target className="h-6 w-6 sm:h-12 sm:w-12 text-orange-200 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Produtividade por Turno */}
      <Card className="select-none">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            <span className="text-lg sm:text-xl">Produtividade por Turno</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Object.entries(dashboardData?.carros_por_turno || {}).map(
              ([turno, quantidade]) => {
                const volumesTurno = dashboardData?.volumes_por_turno?.[turno as keyof typeof dashboardData.volumes_por_turno] || 0
                return (
                  <div
                    key={turno}
                    className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg border dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                        {formatarTurno(turno)}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {quantidade} carros
                      </Badge>
                    </div>
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Volumes</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{volumesTurno.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(() => {
                            const valores = Object.values(
                              dashboardData?.carros_por_turno || {}
                            )
                            const maxValor = Math.max(...valores, 1)
                            return Math.min((quantidade / maxValor) * 100, 100)
                          })()}%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      {(() => {
                        const total = dashboardData?.total_carros_hoje || 0
                        return total > 0
                          ? Math.round((quantidade / total) * 100)
                          : 0
                      })()}
                      % do total
                    </p>
                  </div>
                )
              }
            )}
          </div>
        </CardContent>
      </Card>

      {/* Evolução da Produtividade */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              <span className="text-lg sm:text-xl">
                <span className="hidden sm:inline">
                  Evolução da Produtividade (
                  {periodoSelecionado === "hoje"
                    ? "Hoje"
                    : periodoSelecionado === "semana"
                    ? "Última Semana"
                    : "Último Mês"}
                  )
                </span>
                <span className="sm:hidden">
                  Evolução (
                  {periodoSelecionado === "hoje"
                    ? "Hoje"
                    : periodoSelecionado === "semana"
                    ? "Semana"
                    : "Mês"}
                  )
                </span>
              </span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant={visaoEvolucao === "semanal" ? "default" : "outline"}
                size="sm"
                onClick={() => setVisaoEvolucao("semanal")}
              >
                Semanal
              </Button>
              <Button
                variant={visaoEvolucao === "mensal" ? "default" : "outline"}
                size="sm"
                onClick={() => setVisaoEvolucao("mensal")}
              >
                Mensal
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-6 rounded-lg">
              <div className="h-64 sm:h-96 relative">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 800 300"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <pattern
                      id="grid"
                      width="100"
                      height="40"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 100 0 L 0 0 0 40"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  <rect
                    x="90"
                    y="20"
                    width="700"
                    height="240"
                    fill="white"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    rx="4"
                  />

                  {(() => {
                    const dadosEvolucao = visaoEvolucao === "semanal" 
                      ? dashboardData?.evolucao_semanal || []
                      : dashboardData?.evolucao_mensal || []
                    const numDados = dadosEvolucao.length
                    const larguraDisponivel = 640
                    const espacamento = numDados > 0 ? larguraDisponivel / Math.max(numDados - 1, 1) : 90
                    const maxVolumes = Math.max(
                      ...(dadosEvolucao.map((d) => Number(d.volumes) || 0) || [1])
                    ) || 1

                    return (
                      <>
                        {dadosEvolucao.map((dia, index) => {
                          const x = 100 + index * espacamento
                          const volumesDia = Number(dia.volumes) || 0
                          const y = 260 - (volumesDia / maxVolumes) * 220

                          return (
                            <g key={index}>
                              <circle
                                cx={x}
                                cy={y}
                                r="5"
                                fill="#3b82f6"
                                stroke="white"
                                strokeWidth="2"
                              />
                              {/* Value label - apenas para semanal ou se houver espaço */}
                              {visaoEvolucao === "semanal" && (
                                <text
                                  x={x}
                                  y={y - 12}
                                  className="text-xs fill-gray-600"
                                  textAnchor="middle"
                                >
                                  {volumesDia.toLocaleString('pt-BR')}
                                </text>
                              )}
                              {/* Date label */}
                              <text
                                x={x}
                                y="285"
                                className="text-xs fill-gray-500"
                                textAnchor="middle"
                              >
                                {visaoEvolucao === "semanal" 
                                  ? formatarData(dia.data)
                                  : new Date(dia.data).getDate().toString()}
                              </text>
                              {index < dadosEvolucao.length - 1 && (
                                <line
                                  x1={x}
                                  y1={y}
                                  x2={x + espacamento}
                                  y2={
                                    260 -
                                    ((Number(dadosEvolucao[index + 1]?.volumes) || 0) /
                                      maxVolumes) *
                                      220
                                  }
                                  stroke="#3b82f6"
                                  strokeWidth="2"
                                />
                              )}
                            </g>
                          )
                        })}

                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                          const value = Math.round(maxVolumes * ratio)
                          return (
                            <text
                              key={index}
                              x="75"
                              y={260 - ratio * 220}
                              className="text-xs fill-gray-600"
                              textAnchor="end"
                            >
                              {value.toLocaleString('pt-BR')}
                            </text>
                          )
                        })}
                      </>
                    )
                  })()}

                  <text
                    x="400"
                    y="15"
                    className="text-sm fill-gray-800 font-semibold"
                    textAnchor="middle"
                  >
                    Volumes Processados por Dia
                  </text>
                </svg>
              </div>
            </div>

            {/* Tabela Desktop */}
            <div className="hidden sm:block overflow-x-auto dark:bg-gray-800">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Carros
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Volumes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produtividade
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {(visaoEvolucao === "semanal" 
                    ? dashboardData?.evolucao_semanal || []
                    : dashboardData?.evolucao_mensal || []
                  ).map((dia, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-300">
                        {formatarData(dia.data)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {dia.carros}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {dia.notas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {dia.volumes.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                          {(Number(dia.carros) || 0) > 0
                            ? Math.round(((Number(dia.notas) || 0) / (Number(dia.carros) || 1)) * 100) / 100
                            : 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards Mobile */}
            <div className="sm:hidden space-y-3">
              {(visaoEvolucao === "semanal" 
                ? dashboardData?.evolucao_semanal || []
                : dashboardData?.evolucao_mensal || []
              ).map((dia, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-300">
                      {formatarData(dia.data)}
                    </h4>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                      {dia.carros > 0
                        ? Math.round((dia.notas / dia.carros) * 100) / 100
                        : 0}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {dia.carros}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Carros
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {dia.notas}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Notas
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {dia.volumes.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Volumes
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colaboradores que se Destacaram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 dark:text-gray-300">
            <Award className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
            <span className="text-lg sm:text-xl">Colaboradores que se Destacaram</span>
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Top 5 colaboradores com maior produtividade{" "}
            {periodoSelecionado === "hoje"
              ? "hoje"
              : periodoSelecionado === "semana"
              ? "na última semana"
              : "no último mês"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {dashboardData?.colaboradores_destaque.map((colaborador, index) => (
              <div
                key={index}
                className="p-3 sm:p-4 bg-gray-50 rounded-lg border dark:bg-gray-800 dark:border-gray-700"
              >
                {/* Desktop */}
                <div className="hidden sm:flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold">
                      {index === 0 ? (
                        <Trophy className="h-5 w-5" />
                      ) : index === 1 ? (
                        <Award className="h-5 w-5" />
                      ) : index === 2 ? (
                        <Star className="h-5 w-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-300">
                        {colaborador.nome}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Turno {formatarTurno(colaborador.turno)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {colaborador.carros_processados}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Carros</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {colaborador.notas_processadas}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Notas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {colaborador.volumes_processados}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Volumes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {Math.round(colaborador.produtividade_media * 100) / 100}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Volumes/Hora
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mobile */}
                <div className="sm:hidden space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold text-sm">
                      {index === 0 ? (
                        <Trophy className="h-4 w-4" />
                      ) : index === 1 ? (
                        <Award className="h-4 w-4" />
                      ) : index === 2 ? (
                        <Star className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-300 text-sm truncate">
                        {colaborador.nome}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Turno {formatarTurno(colaborador.turno)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-white dark:bg-gray-700 rounded">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {colaborador.carros_processados}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Carros</p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-gray-700 rounded">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {colaborador.notas_processadas}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Notas</p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-gray-700 rounded">
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {colaborador.volumes_processados}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Volumes</p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-gray-700 rounded">
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {Math.round(colaborador.produtividade_media * 100) / 100}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Produtividade
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {(!dashboardData?.colaboradores_destaque ||
              dashboardData.colaboradores_destaque.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum dado de colaboradores disponível</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
