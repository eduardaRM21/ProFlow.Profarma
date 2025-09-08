"use client"

import React, { useState, useEffect } from 'react'
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
  const carregarDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabase()
      
      if (!supabase) {
        throw new Error('Cliente Supabase não inicializado')
      }

      // Buscar dados dos carros para hoje
      const hoje = new Date().toISOString().split('T')[0]
      console.log('🔍 Buscando dados para:', hoje)
      
      const { data: carrosHoje, error: errorCarros } = await supabase
        .from('carros_status')
        .select('*')
        .gte('data', `${hoje}T00:00:00`)
        .lte('data', `${hoje}T23:59:59`)

      if (errorCarros) {
        console.error('❌ Erro ao buscar carros:', errorCarros)
        // Não falhar se não houver dados de carros
        console.log('⚠️ Continuando sem dados de carros...')
      }

      // Buscar dados de notas bipadas do setor de embalagem
      const { data: notasHoje, error: errorNotas } = await supabase
        .from('embalagem_notas_bipadas')
        .select('*')
        .eq('data', hoje)

      if (errorNotas) {
        console.error('❌ Erro ao buscar notas:', errorNotas)
        // Não falhar se não houver dados de notas
        console.log('⚠️ Continuando sem dados de notas...')
      }

      // Buscar dados de carros finalizados do setor de embalagem
      const { data: carrosFinalizados, error: errorCarrosFinalizados } = await supabase
        .from('embalagem_carros_finalizados')
        .select('*')
        .eq('data', hoje)

      if (errorCarrosFinalizados) {
        console.error('❌ Erro ao buscar carros finalizados:', errorCarrosFinalizados)
        console.log('⚠️ Continuando sem dados de carros finalizados...')
      }

      console.log('📊 Dados carregados:', {
        carros: carrosHoje?.length || 0,
        notas: notasHoje?.length || 0,
        carros_finalizados: carrosFinalizados?.length || 0
      })

      // Calcular estatísticas por turno
      const carrosPorTurno = {
        manha: 0,
        tarde: 0,
        noite: 0,
        madrugada: 0
      }

      carrosHoje?.forEach(carro => {
        const dataCarro = carro.data as string
        const hora = new Date(dataCarro).getHours()
        if (hora >= 6 && hora < 12) carrosPorTurno.manha++
        else if (hora >= 12 && hora < 18) carrosPorTurno.tarde++
        else if (hora >= 18 && hora < 24) carrosPorTurno.noite++
        else carrosPorTurno.madrugada++
      })

      // Buscar colaboradores que se destacaram (últimos 7 dias)
      const dataInicio = new Date()
      dataInicio.setDate(dataInicio.getDate() - 7)
      const dataInicioStr = dataInicio.toISOString().split('T')[0]

      let colaboradoresData: any[] = []
      try {
        const { data: colaboradoresResult, error: errorColaboradores } = await supabase
          .from('embalagem_notas_bipadas')
          .select('colaboradores, data, volumes, timestamp_bipagem')
          .gte('data', dataInicioStr)
          .lte('data', hoje)

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
        const hora = new Date(nota.timestamp_bipagem).getHours()
        
        let turno = 'manha'
        if (hora >= 12 && hora < 18) turno = 'tarde'
        else if (hora >= 18 && hora < 24) turno = 'noite'
        else if (hora >= 0 && hora < 6) turno = 'madrugada'

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

      // Ordenar colaboradores por produtividade
      const colaboradoresDestaque = Array.from(colaboradoresMap.values())
        .map(colab => ({
          ...colab,
          produtividade_media: colab.volumes_processados / 7 // média por dia
        }))
        .sort((a, b) => b.produtividade_media - a.produtividade_media)
        .slice(0, 5)

      // Buscar evolução semanal
      const evolucaoSemanal = []
      for (let i = 6; i >= 0; i--) {
        const data = new Date()
        data.setDate(data.getDate() - i)
        const dataStr = data.toISOString().split('T')[0]
        
        const carrosDia = (carrosHoje?.filter(c => (c.data as string).startsWith(dataStr)).length || 0) + 
                         (carrosFinalizados?.filter(c => (c.data as string).startsWith(dataStr)).length || 0)
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

      const dashboardData: EstatisticasDashboard = {
        total_carros_hoje: (carrosHoje?.length || 0) + (carrosFinalizados?.length || 0),
        total_notas_hoje: notasHoje?.length || 0,
        total_volumes_hoje: notasHoje?.reduce((acc, n) => acc + ((n.volumes as number) || 1), 0) || 0,
        produtividade_media_hoje: (carrosHoje?.length || 0) + (carrosFinalizados?.length || 0) ? Math.round((notasHoje?.length || 0) / ((carrosHoje?.length || 0) + (carrosFinalizados?.length || 0)) * 100) / 100 : 0,
        carros_por_turno: carrosPorTurno,
        evolucao_semanal: evolucaoSemanal,
        colaboradores_destaque: colaboradoresDestaque
      }

      console.log('✅ Dashboard data criado:', dashboardData)
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
  }

  useEffect(() => {
    carregarDashboardData()
  }, [dataSelecionada])

  const getVariacaoIcon = (valor: number, comparacao: number) => {
    if (valor > comparacao) return <ArrowUp className="h-4 w-4 text-green-500" />
    if (valor < comparacao) return <ArrowDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Estatísticas</h1>
          <p className="text-gray-600 mt-1">Visão geral da produtividade e performance do sistema</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={periodoSelecionado === 'hoje' ? 'default' : 'outline'}
            onClick={() => setPeriodoSelecionado('hoje')}
            size="sm"
          >
            Hoje
          </Button>
          <Button
            variant={periodoSelecionado === 'semana' ? 'default' : 'outline'}
            onClick={() => setPeriodoSelecionado('semana')}
            size="sm"
          >
            Semana
          </Button>
          <Button
            variant={periodoSelecionado === 'mes' ? 'default' : 'outline'}
            onClick={() => setPeriodoSelecionado('mes')}
            size="sm"
          >
            Mês
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Carros Processados</p>
                <p className="text-3xl font-bold">{dashboardData?.total_carros_hoje || 0}</p>
                <p className="text-blue-200 text-xs mt-1">Hoje</p>
              </div>la 
              <Truck className="h-12 w-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Notas Bipadas</p>
                <p className="text-3xl font-bold">{dashboardData?.total_notas_hoje || 0}</p>
                <p className="text-green-200 text-xs mt-1">Hoje</p>
              </div>
              <Activity className="h-12 w-12 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Volumes Processados</p>
                <p className="text-3xl font-bold">{dashboardData?.total_volumes_hoje || 0}</p>
                <p className="text-purple-200 text-xs mt-1">Hoje</p>
              </div>
              <Package className="h-12 w-12 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Produtividade Média</p>
                <p className="text-3xl font-bold">{dashboardData?.produtividade_media_hoje || 0}</p>
                <p className="text-orange-200 text-xs mt-1">Notas/Carro</p>
              </div>
              <Target className="h-12 w-12 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Produtividade por Turno */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-6 w-6 text-blue-600" />
            <span>Produtividade por Turno</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(dashboardData?.carros_por_turno || {}).map(([turno, quantidade]) => (
              <div key={turno} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-800">{formatarTurno(turno)}</h4>
                  <Badge variant="outline" className="text-xs">
                    {quantidade} carros
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min((quantidade / Math.max(...Object.values(dashboardData?.carros_por_turno || {}))) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {Math.round((quantidade / (dashboardData?.total_carros_hoje || 1)) * 100)}% do total
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
            <TrendingUp className="h-6 w-6 text-green-600" />
            <span>Evolução da Produtividade (Últimos 7 dias)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Gráfico de linha simples */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="h-64 relative">
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
                          stroke="white"
                          strokeWidth="2"
                        />
                        {/* Value label */}
                        <text
                          x={x}
                          y={y - 10}
                          className="text-xs fill-gray-600"
                          textAnchor="middle"
                        >
                          {dia.carros}
                        </text>
                        {/* Date label */}
                        <text
                          x={x}
                          y="195"
                          className="text-xs fill-gray-500"
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
                        className="text-xs fill-gray-600"
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
                    className="text-sm fill-gray-800 font-semibold"
                    textAnchor="middle"
                  >
                    Carros Processados por Dia
                  </text>
                </svg>
              </div>
            </div>

            {/* Tabela de dados */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Carros</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volumes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produtividade</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData?.evolucao_semanal.map((dia, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatarData(dia.data)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dia.carros}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dia.notas}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dia.volumes}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {dia.carros > 0 ? Math.round((dia.notas / dia.carros) * 100) / 100 : 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colaboradores que se Destacaram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-6 w-6 text-yellow-600" />
            <span>Colaboradores que se Destacaram</span>
          </CardTitle>
          <p className="text-sm text-gray-600">Top 5 colaboradores com maior produtividade nos últimos 7 dias</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData?.colaboradores_destaque.map((colaborador, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold">
                    {index === 0 ? <Trophy className="h-5 w-5" /> : 
                     index === 1 ? <Award className="h-5 w-5" /> :
                     index === 2 ? <Star className="h-5 w-5" /> : index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{colaborador.nome}</h4>
                    <p className="text-sm text-gray-600">Turno {formatarTurno(colaborador.turno)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">{colaborador.carros_processados}</p>
                    <p className="text-xs text-gray-600">Carros</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">{colaborador.notas_processadas}</p>
                    <p className="text-xs text-gray-600">Notas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-purple-600">{colaborador.volumes_processados}</p>
                    <p className="text-xs text-gray-600">Volumes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-orange-600">{Math.round(colaborador.produtividade_media * 100) / 100}</p>
                    <p className="text-xs text-gray-600">Média/Dia</p>
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
