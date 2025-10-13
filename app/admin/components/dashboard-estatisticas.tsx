"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  Package
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
  evolucao_semanal: Array<{
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
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'hoje' | 'semana' | 'mes'>('hoje')
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0])

  const {
    estatisticasPorTurno,
    estatisticasPorPeriodo,
    estatisticasGerais,
    loading: loadingEstatisticas,
    error: errorEstatisticas,
    formatarTurno: formatarTurnoHook,
    formatarData: formatarDataHook,
    calcularPorcentagem
  } = useEstatisticas()

  // Funções locais para formatação
  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  const formatarTurno = (turno: string) => {
    const turnos = {
      manha: 'Manhã',
      tarde: 'Tarde',
      noite: 'Noite',
      madrugada: 'Madrugada'
    }
    return turnos[turno as keyof typeof turnos] || turno
  }

  // Carregar dados do dashboard
  const carregarDashboardData = useCallback(async () => {
    try {
      console.log('🔄 Iniciando carregamento dos dados do dashboard...')
      console.log('📅 Período selecionado:', periodoSelecionado)
      setLoading(true)
      setError(null)

      const supabase = getSupabase()
      
      if (!supabase) {
        throw new Error('Cliente Supabase não inicializado')
      }

      // Calcular período baseado na seleção
      let dataInicio: string
      let dataFim: string
      const hoje = new Date().toISOString().split('T')[0]

      switch (periodoSelecionado) {
        case 'hoje':
          dataInicio = hoje
          dataFim = hoje
          break
        case 'semana':
          const inicioSemana = new Date()
          inicioSemana.setDate(inicioSemana.getDate() - 7)
          dataInicio = inicioSemana.toISOString().split('T')[0]
          dataFim = hoje
          break
        case 'mes':
          const inicioMes = new Date()
          inicioMes.setDate(inicioMes.getDate() - 30)
          dataInicio = inicioMes.toISOString().split('T')[0]
          dataFim = hoje
          break
        default:
          dataInicio = hoje
          dataFim = hoje
      }

      console.log('🔍 Período de busca:', { dataInicio, dataFim, periodoSelecionado })
      console.log('📊 Filtros aplicados:', {
        carros: `data >= ${dataInicio} AND data <= ${dataFim}`,
        notas: `data >= ${dataInicio} AND data <= ${dataFim}`,
        colaboradores: `data >= ${dataInicio} AND data <= ${dataFim}`
      })
      
      // Buscar carros ativos do período
      const { data: carrosHoje, error: errorCarros } = await supabase
        .from('carros_status')
        .select('*')
        .gte('data', dataInicio)
        .lte('data', dataFim)

      if (errorCarros) {
        console.error('❌ Erro ao buscar carros:', errorCarros)
        console.log('⚠️ Continuando sem dados de carros...')
      }

      // Buscar dados de notas bipadas do setor de embalagem
      const { data: notasHoje, error: errorNotas } = await supabase
        .from('embalagem_notas_bipadas')
        .select('*')
        .gte('data', dataInicio)
        .lte('data', dataFim)

      if (errorNotas) {
        console.error('❌ Erro ao buscar notas:', errorNotas)
        console.log('⚠️ Continuando sem dados de notas...')
      }

      // Buscar dados de carros finalizados do setor de embalagem
      const { data: carrosFinalizados, error: errorCarrosFinalizados } = await supabase
        .from('embalagem_carros_finalizados')
        .select('carros, created_at')
        .gte('created_at', dataInicio)
        .lte('created_at', dataFim)

      if (errorCarrosFinalizados) {
        console.error('❌ Erro ao buscar carros finalizados:', errorCarrosFinalizados)
        console.log('⚠️ Continuando sem dados de carros finalizados...')
      }

      // Processar carros e coletar IDs únicos
      const carrosIdsUnicos = new Set<string>()
      const carrosIdsAtivos: string[] = []
      const carrosIdsFinalizados: string[] = []
      
      // Adicionar carros ativos (carros_status) - apenas estes por enquanto
      if (carrosHoje && carrosHoje.length > 0) {
        carrosHoje.forEach(carro => {
          if (carro.id) {
            const id = String(carro.id)
            carrosIdsUnicos.add(id)
            carrosIdsAtivos.push(id)
          }
        })
      }

      // Adicionar carros finalizados (embalagem_carros_finalizados) - apenas se não estiverem em carros_status
      if (carrosFinalizados && carrosFinalizados.length > 0) {
        carrosFinalizados.forEach(item => {
          if (item.carros && Array.isArray(item.carros)) {
            item.carros.forEach((carro: any) => {
              if (carro.id) {
                const id = String(carro.id)
                // Só adicionar se não estiver já na lista de carros ativos
                if (!carrosIdsAtivos.includes(id)) {
                  carrosIdsUnicos.add(id)
                  carrosIdsFinalizados.push(id)
                }
              }
            })
          }
        })
      }

      console.log('🔍 Debug - IDs de carros ativos:', carrosIdsAtivos)
      console.log('🔍 Debug - IDs de carros finalizados:', carrosIdsFinalizados)
      console.log('🔍 Debug - IDs únicos totais:', Array.from(carrosIdsUnicos))

      const totalCarrosHoje = carrosIdsUnicos.size

      console.log('📊 Dados carregados:', {
        periodo: periodoSelecionado,
        data_inicio: dataInicio,
        data_fim: dataFim,
        carros_unicos: totalCarrosHoje,
        carros_ativos: carrosHoje?.length || 0,
        notas: notasHoje?.length || 0,
        carros_finalizados: carrosFinalizados?.length || 0
      })
      
      console.log('🔍 Debug - Carros encontrados no período:', carrosHoje?.map(c => ({ id: c.id, data: c.data })))
      console.log('🔍 Debug - Notas encontradas no período:', notasHoje?.map(n => ({ id: n.id, data: n.data })))

      // Debug detalhado dos carros
      console.log('🔍 Debug - Carros ativos (carros_status):', carrosHoje?.map(c => ({ id: c.id, nome: c.nome_carro, data: c.data })))
      console.log('🔍 Debug - Carros finalizados (embalagem_carros_finalizados):', carrosFinalizados)
      
      if (carrosFinalizados && carrosFinalizados.length > 0) {
        carrosFinalizados.forEach((item, index) => {
          console.log(`🔍 Debug - Item ${index} de carros finalizados:`, item.carros && Array.isArray(item.carros) ? item.carros.map((c: any) => ({ id: c.id, nome: c.nome_carro, data: c.data })) : 'Não é array')
        })
      }

      // Debug: verificar turnos dos carros
      if (carrosHoje && carrosHoje.length > 0) {
        console.log('🔍 Debug - Turnos dos carros:', carrosHoje.map(c => ({ id: c.id, turno: c.turno, data: c.data })))
      }

      // Calcular estatísticas por turno
      const carrosPorTurno = {
        manha: 0,
        tarde: 0,
        noite: 0,
        madrugada: 0
      }

      console.log('🔍 Debug - Iniciando cálculo de turnos...')

      // Processar carros ativos usando o campo turno da tabela
      carrosHoje?.forEach(carro => {
        const turno = String(carro.turno || 'A').toUpperCase()
        switch (turno) {
          case 'A':
            carrosPorTurno.manha++
            break
          case 'B':
            carrosPorTurno.tarde++
            break
          case 'C':
            carrosPorTurno.noite++
            break
          case 'D':
            carrosPorTurno.madrugada++
            break
          default:
            // Fallback para turnos não reconhecidos - usar hora como backup
            const dataCarro = carro.data as string
            const hora = new Date(dataCarro).getHours()
            if (hora >= 6 && hora < 12) carrosPorTurno.manha++
            else if (hora >= 12 && hora < 18) carrosPorTurno.tarde++
            else if (hora >= 18 && hora < 24) carrosPorTurno.noite++
            else carrosPorTurno.madrugada++
        }
      })

      // Processar carros finalizados usando o campo turno
      if (carrosFinalizados && carrosFinalizados.length > 0) {
        carrosFinalizados.forEach(item => {
          if (item.carros && Array.isArray(item.carros)) {
            item.carros.forEach((carro: any) => {
              const turno = String(carro.turno || 'A').toUpperCase()
              switch (turno) {
                case 'A':
                  carrosPorTurno.manha++
                  break
                case 'B':
                  carrosPorTurno.tarde++
                  break
                case 'C':
                  carrosPorTurno.noite++
                  break
                case 'D':
                  carrosPorTurno.madrugada++
                  break
                default:
                  // Fallback para turnos não reconhecidos - usar hora como backup
                  const dataCarro = carro.data || carro.data_criacao
                  if (dataCarro) {
                    const hora = new Date(dataCarro).getHours()
                    if (hora >= 6 && hora < 12) carrosPorTurno.manha++
                    else if (hora >= 12 && hora < 18) carrosPorTurno.tarde++
                    else if (hora >= 18 && hora < 24) carrosPorTurno.noite++
                    else carrosPorTurno.madrugada++
                  }
              }
            })
          }
        })
      }

      console.log('🔍 Debug - Carros por turno calculados:', carrosPorTurno)

      // Buscar colaboradores que se destacaram no período selecionado
      let colaboradoresData: any[] = []
      try {
        const { data: colaboradoresResult, error: errorColaboradores } = await supabase
          .from('embalagem_notas_bipadas')
          .select('colaboradores, data, volumes, timestamp_bipagem')
          .gte('data', dataInicio)
          .lte('data', dataFim)

        if (errorColaboradores) {
          console.error('❌ Erro ao buscar colaboradores:', errorColaboradores)
          colaboradoresData = []
        } else {
          colaboradoresData = colaboradoresResult || []
        }
      } catch (err) {
        console.error('❌ Erro ao processar colaboradores:', err)
        colaboradoresData = []
      }

      // Processar dados dos colaboradores
      const colaboradoresMap = new Map<string, {
        nome: string
        carros_processados: number
        notas_processadas: number
        volumes_processados: number
        turno: string
        data: string
      }>()

      colaboradoresData.forEach(nota => {
        // Processar array de colaboradores
        const colaboradores = Array.isArray(nota.colaboradores) ? nota.colaboradores : [nota.colaboradores || 'Colaborador']
        const data = nota.data
        
        // Usar o campo turno do banco de dados
        let turno = 'manha' // Default
        const turnoNota = String(nota.turno || 'A').toUpperCase()
        switch (turnoNota) {
          case 'A':
            turno = 'manha'
            break
          case 'B':
            turno = 'tarde'
            break
          case 'C':
            turno = 'noite'
            break
          case 'D':
            turno = 'madrugada'
            break
          default:
            // Fallback para turnos não reconhecidos - usar hora como backup
            const hora = new Date(nota.timestamp_bipagem).getHours()
            if (hora >= 12 && hora < 18) turno = 'tarde'
            else if (hora >= 18 && hora < 24) turno = 'noite'
            else if (hora >= 0 && hora < 6) turno = 'madrugada'
            else turno = 'manha'
        }

        colaboradores.forEach((colaborador: string) => {
          if (!colaboradoresMap.has(colaborador)) {
            colaboradoresMap.set(colaborador, {
              nome: colaborador,
              carros_processados: 0,
              notas_processadas: 0,
              volumes_processados: 0,
              turno,
              data
            })
          }

          const colab = colaboradoresMap.get(colaborador)!
          colab.notas_processadas++
          colab.volumes_processados += nota.volumes || 1
        })
      })

      // Calcular carros processados por colaborador (aproximação)
      colaboradoresMap.forEach((colab, nome) => {
        colab.carros_processados = Math.ceil(colab.notas_processadas / 10) // Aproximação: 10 notas por carro
      })

      // Ordenar colaboradores por produtividade baseada no tempo
      const colaboradoresDestaque = Array.from(colaboradoresMap.values())
        .map(colab => {
          // Calcular produtividade baseada no tempo de trabalho
          const horasTrabalhadas = 7 * 8 // 7 dias * 8 horas por dia (assumindo 8h por turno)
          const produtividadePorHora = colab.volumes_processados / horasTrabalhadas
          
          return {
            ...colab,
            produtividade_media: Math.round(produtividadePorHora * 100) / 100
          }
        })
        .sort((a, b) => b.produtividade_media - a.produtividade_media)
        .slice(0, 5)

      // Buscar evolução do período
      const evolucaoSemanal = []
      const diasDiferenca = Math.ceil((new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / (1000 * 60 * 60 * 24))
      const diasParaMostrar = Math.min(diasDiferenca + 1, 7) // Máximo 7 dias
      
      for (let i = diasParaMostrar - 1; i >= 0; i--) {
        const data = new Date(dataFim)
        data.setDate(data.getDate() - i)
        const dataStr = data.toISOString().split('T')[0]
        
        // Coletar IDs únicos de carros do dia
        const carrosIdsDia = new Set<string>()
        
        // Carros ativos do dia
        if (carrosHoje) {
          carrosHoje.forEach(carro => {
            if ((carro.data as string) === dataStr && carro.id) {
              carrosIdsDia.add(String(carro.id))
            }
          })
        }
        
        // Carros finalizados do dia
        if (carrosFinalizados && carrosFinalizados.length > 0) {
          carrosFinalizados.forEach(item => {
            if (item.carros && Array.isArray(item.carros)) {
              item.carros.forEach((carro: any) => {
                const dataCarro = carro.data || carro.data_criacao
                if (dataCarro && dataCarro.startsWith(dataStr) && carro.id) {
                  carrosIdsDia.add(String(carro.id))
                }
              })
            }
          })
        }
        
        const carrosDia = carrosIdsDia.size
        const notasDia = notasHoje?.filter(n => n.data === dataStr).length || 0
        const volumesDia = notasHoje?.filter(n => n.data === dataStr)
          .reduce((acc, n) => acc + ((n.volumes as number) || 1), 0) || 0

        evolucaoSemanal.push({
          data: dataStr,
          carros: carrosDia,
          notas: notasDia,
          volumes: volumesDia
        })
      }

      const totalNotasHoje = notasHoje?.length || 0
      const totalVolumesHoje = notasHoje?.reduce((acc, n) => acc + ((n.volumes as number) || 1), 0) || 0

      // Calcular produtividade baseada no período
      const calcularProdutividadePorTempo = () => {
        if (totalNotasHoje === 0) return 0
        
        if (periodoSelecionado === 'hoje') {
          // Para hoje: calcular baseado nas horas trabalhadas
          const agora = new Date()
          const horaAtual = agora.getHours()
          
          let horasTrabalhadas = 0
          
          // Determinar turno atual e calcular horas trabalhadas
          if (horaAtual >= 6 && horaAtual < 12) {
            // Turno manhã (6h às 12h)
            horasTrabalhadas = Math.max(0, horaAtual - 6)
          } else if (horaAtual >= 12 && horaAtual < 18) {
            // Turno tarde (12h às 18h)
            horasTrabalhadas = Math.max(0, horaAtual - 12)
          } else if (horaAtual >= 18 && horaAtual < 24) {
            // Turno noite (18h às 24h)
            horasTrabalhadas = Math.max(0, horaAtual - 18)
          } else {
            // Turno madrugada (0h às 6h)
            horasTrabalhadas = Math.max(0, horaAtual + 6)
          }
          
          // Se for início do dia, assumir 1 hora para evitar divisão por zero
          if (horasTrabalhadas === 0) {
            horasTrabalhadas = 1
          }
          
          // Produtividade = notas por hora
          const produtividade = totalNotasHoje / horasTrabalhadas
          return Math.round(produtividade * 100) / 100
        } else {
          // Para semana/mês: calcular baseado no número de dias
          const diasDiferenca = Math.ceil((new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1
          const produtividade = totalNotasHoje / diasDiferenca
          return Math.round(produtividade * 100) / 100
        }
      }

      const produtividadeMediaHoje = calcularProdutividadePorTempo()

      const dashboardData: EstatisticasDashboard = {
        total_carros_hoje: totalCarrosHoje,
        total_notas_hoje: totalNotasHoje,
        total_volumes_hoje: totalVolumesHoje,
        produtividade_media_hoje: produtividadeMediaHoje,
        carros_por_turno: carrosPorTurno,
        evolucao_semanal: evolucaoSemanal,
        colaboradores_destaque: colaboradoresDestaque
      }

      console.log('✅ Dashboard data criado:', dashboardData)
      console.log('🔍 Debug - Total de carros hoje:', totalCarrosHoje)
      setDashboardData(dashboardData)
    } catch (err) {
      console.error('❌ Erro ao carregar dados do dashboard:', err)
      
      // Criar dados de fallback em caso de erro
      const fallbackData: EstatisticasDashboard = {
        total_carros_hoje: 0,
        total_notas_hoje: 0,
        total_volumes_hoje: 0,
        produtividade_media_hoje: 0,
        carros_por_turno: {
          manha: 0,
          tarde: 0,
          noite: 0,
          madrugada: 0
        },
        evolucao_semanal: [],
        colaboradores_destaque: []
      }
      
      setDashboardData(fallbackData)
      setError(`Erro ao carregar dados: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }, [periodoSelecionado])

  useEffect(() => {
    console.log('🔄 useEffect executado, periodoSelecionado:', periodoSelecionado)
    carregarDashboardData()
  }, [periodoSelecionado, carregarDashboardData])

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
                console.log('🔍 Testando conexão com Supabase...')
                const { data, error } = await supabase.from('carros_status').select('count').limit(1)
                console.log('📊 Teste de conexão:', { data, error })
                alert(`Conexão: ${error ? 'ERRO - ' + error.message : 'OK'}`)
              } catch (err) {
                console.error('❌ Erro no teste:', err)
                alert('Erro no teste de conexão')
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard de Estatísticas</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Visão geral da produtividade e performance do sistema</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={periodoSelecionado === 'hoje' ? 'default' : 'outline'}
            onClick={() => setPeriodoSelecionado('hoje')}
            size="sm"
            className="text-xs sm:text-sm"
          >
            Hoje
          </Button>
          <Button
            variant={periodoSelecionado === 'semana' ? 'default' : 'outline'}
            onClick={() => setPeriodoSelecionado('semana')}
            size="sm"
            className="text-xs sm:text-sm"
          >
            Semana
          </Button>
          <Button
            variant={periodoSelecionado === 'mes' ? 'default' : 'outline'}
            onClick={() => setPeriodoSelecionado('mes')}
            size="sm"
            className="text-xs sm:text-sm"
          >
            Mês
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white select-none dark:bg-blue-900/30 dark:border-blue-500/50">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-blue-100 text-xs sm:text-sm font-medium truncate">Carros Processados</p>
                <p className="text-xl sm:text-3xl font-bold">{dashboardData?.total_carros_hoje || 0}</p>
                <p className="text-blue-200 text-xs mt-1 truncate">
                  {periodoSelecionado === 'hoje' ? 'Hoje' : 
                   periodoSelecionado === 'semana' ? 'Última Semana' : 
                   'Último Mês'}
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
                <p className="text-green-100 text-xs sm:text-sm font-medium truncate">Notas Bipadas</p>
                <p className="text-xl sm:text-3xl font-bold">{dashboardData?.total_notas_hoje || 0}</p>
                <p className="text-green-200 text-xs mt-1 truncate">
                  {periodoSelecionado === 'hoje' ? 'Hoje' : 
                   periodoSelecionado === 'semana' ? 'Última Semana' : 
                   'Último Mês'}
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
                <p className="text-purple-100 text-xs sm:text-sm font-medium truncate">Volumes Processados</p>
                <p className="text-xl sm:text-3xl font-bold">{dashboardData?.total_volumes_hoje || 0}</p>
                <p className="text-purple-200 text-xs mt-1 truncate">
                  {periodoSelecionado === 'hoje' ? 'Hoje' : 
                   periodoSelecionado === 'semana' ? 'Última Semana' : 
                   'Último Mês'}
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
                <p className="text-orange-100 text-xs sm:text-sm font-medium truncate">Produtividade Média</p>
                <p className="text-xl sm:text-3xl font-bold">{dashboardData?.produtividade_media_hoje || 0}</p>
                <p className="text-orange-200 text-xs mt-1 truncate">
                  {periodoSelecionado === 'hoje' ? 'Notas/Hora' : 
                   periodoSelecionado === 'semana' ? 'Notas/Dia' : 
                   'Notas/Dia'}
                </p>
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
            {Object.entries(dashboardData?.carros_por_turno || {}).map(([turno, quantidade]) => (
              <div key={turno} className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg border dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm sm:text-base">{formatarTurno(turno)}</h4>
                  <Badge variant="outline" className="text-xs">
                    {quantidade} carros
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(() => {
                        const valores = Object.values(dashboardData?.carros_por_turno || {})
                        const maxValor = Math.max(...valores, 1) // Evitar divisão por zero
                        return Math.min((quantidade / maxValor) * 100, 100)
                      })()}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  {(() => {
                    const total = dashboardData?.total_carros_hoje || 0
                    return total > 0 ? Math.round((quantidade / total) * 100) : 0
                  })()}% do total
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Evolução da Produtividade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            <span className="text-lg sm:text-xl">
              <span className="hidden sm:inline">Evolução da Produtividade ({periodoSelecionado === 'hoje' ? 'Hoje' : periodoSelecionado === 'semana' ? 'Última Semana' : 'Último Mês'})</span>
              <span className="sm:hidden">Evolução ({periodoSelecionado === 'hoje' ? 'Hoje' : periodoSelecionado === 'semana' ? 'Semana' : 'Mês'})</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Gráfico de linha simples */}
            <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-6 rounded-lg">
              <div className="h-48 sm:h-64 relative">
                <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid meet">
                  {/* Grid lines */}
                  <defs>
                    <pattern id="grid" width="100" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 100 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {/* Chart area */}
                  <rect x="80" y="20" width="640" height="160" fill="white" stroke="#e5e7eb" strokeWidth="1" rx="4"/>

                  
                  {/* Data points and lines */}
                  {dashboardData?.evolucao_semanal.map((dia, index) => {
                    const x = 100 + (index * 90)
                    const maxCarros = Math.max(...(dashboardData?.evolucao_semanal.map(d => d.carros) || [1]))
                    const y = 180 - (dia.carros / maxCarros) * 140
                    
                    return (
                      <g key={index}>
                        {/* Data point */}
                        <circle
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#3b82f6"
                          stroke="white dark:stroke-gray-400"
                          strokeWidth="2"
                        />
                        {/* Value label */}
                        <text
                          x={x}
                          y={y - 10}
                          className="text-xs fill-gray-600 dark:fill-gray-400"
                          textAnchor="middle"
                        >
                          {dia.carros}
                        </text>
                        {/* Date label */}
                        <text
                          x={x}
                          y="195"
                          className="text-xs fill-gray-500 dark:fill-gray-400"
                          textAnchor="middle"
                        >
                          {formatarData(dia.data)}
                        </text>
                        {/* Line to next point */}
                        {index < (dashboardData?.evolucao_semanal.length || 0) - 1 && (
                          <line
                            x1={x}
                            y1={y}
                            x2={x + 90}
                            y2={180 - ((dashboardData?.evolucao_semanal[index + 1]?.carros || 0) / maxCarros) * 140}
                            stroke="#3b82f6"
                            strokeWidth="2"
                          />
                        )}
                      </g>
                    )
                  })}
                  
                  {/* Y-axis labels */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                    const value = Math.round((Math.max(...(dashboardData?.evolucao_semanal.map(d => d.carros) || [1])) * ratio))
                    return (
                      <text
                        key={index}
                        x="75"
                        y={180 - (ratio * 140)}
                        className="text-xs fill-gray-600 dark:fill-gray-400"
                        textAnchor="end"
                      >
                        {value}
                      </text>
                    )
                  })}
                  
                  {/* Chart title */}
                  <text
                    x="400"
                    y="15"
                    className="text-sm fill-gray-800 font-semibold dark:fill-gray-300"
                    textAnchor="middle"
                  >
                    Carros Processados por Dia
                  </text>
                </svg>
              </div>
            </div>

            {/* Tabela de dados - Desktop */}
            <div className="hidden sm:block overflow-x-auto dark:bg-gray-800">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Carros</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Notas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Volumes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Produtividade</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {dashboardData?.evolucao_semanal.map((dia, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-300">
                        {formatarData(dia.data)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">{dia.carros}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">{dia.notas}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">{dia.volumes}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                          {dia.carros > 0 ? Math.round((dia.notas / dia.carros) * 100) / 100 : 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards de dados - Mobile */}
            <div className="sm:hidden space-y-3">
              {dashboardData?.evolucao_semanal.map((dia, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-300">{formatarData(dia.data)}</h4>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                      {dia.carros > 0 ? Math.round((dia.notas / dia.carros) * 100) / 100 : 0}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dia.carros}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Carros</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{dia.notas}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Notas</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{dia.volumes}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Volumes</p>
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
          <p className="text-sm text-gray-600 dark:text-gray-400">Top 5 colaboradores com maior produtividade {periodoSelecionado === 'hoje' ? 'hoje' : periodoSelecionado === 'semana' ? 'na última semana' : 'no último mês'}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {dashboardData?.colaboradores_destaque.map((colaborador, index) => (
              <div key={index} className="p-3 sm:p-4 bg-gray-50 rounded-lg border dark:bg-gray-800 dark:border-gray-700">
                {/* Layout Desktop */}
                <div className="hidden sm:flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold">
                      {index === 0 ? <Trophy className="h-5 w-5" /> : 
                       index === 1 ? <Award className="h-5 w-5" /> :
                       index === 2 ? <Star className="h-5 w-5" /> : index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-300">{colaborador.nome}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Turno {formatarTurno(colaborador.turno)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{colaborador.carros_processados}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Carros</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">{colaborador.notas_processadas}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Notas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{colaborador.volumes_processados}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Volumes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{Math.round(colaborador.produtividade_media * 100) / 100}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Volumes/Hora</p>
                    </div>
                  </div>
                </div>

                {/* Layout Mobile */}
                <div className="sm:hidden space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold text-sm">
                      {index === 0 ? <Trophy className="h-4 w-4" /> : 
                       index === 1 ? <Award className="h-4 w-4" /> :
                       index === 2 ? <Star className="h-4 w-4" /> : index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-300 text-sm truncate">{colaborador.nome}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Turno {formatarTurno(colaborador.turno)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-white dark:bg-gray-700 rounded">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{colaborador.carros_processados}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Carros</p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-gray-700 rounded">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">{colaborador.notas_processadas}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Notas</p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-gray-700 rounded">
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{colaborador.volumes_processados}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Volumes</p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-gray-700 rounded">
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{Math.round(colaborador.produtividade_media * 100) / 100}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Produtividade</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {(!dashboardData?.colaboradores_destaque || dashboardData.colaboradores_destaque.length === 0) && (
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
