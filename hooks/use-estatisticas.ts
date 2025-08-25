import { useState, useEffect, useCallback } from 'react'
import { EstatisticasService, EstatisticasProdutividade, EstatisticasPorPeriodo } from '@/lib/estatisticas-service'

export function useEstatisticas() {
  const [estatisticasPorTurno, setEstatisticasPorTurno] = useState<EstatisticasProdutividade[]>([])
  const [estatisticasPorPeriodo, setEstatisticasPorPeriodo] = useState<EstatisticasPorPeriodo[]>([])
  const [estatisticasGerais, setEstatisticasGerais] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState<string>(new Date().toISOString().split('T')[0])
  const [periodoSelecionado, setPeriodoSelecionado] = useState<number>(7)

  // Carregar estatísticas por turno
  const carregarEstatisticasPorTurno = useCallback(async (data: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await EstatisticasService.buscarEstatisticasPorTurno(data)
      
      if (result.success && result.estatisticas) {
        setEstatisticasPorTurno(result.estatisticas)
      } else {
        setError(result.error || 'Erro ao carregar estatísticas por turno')
      }
    } catch (err) {
      setError('Erro interno ao carregar estatísticas por turno')
    } finally {
      setLoading(false)
    }
  }, [])

  // Carregar estatísticas por período
  const carregarEstatisticasPorPeriodo = useCallback(async (dias: number) => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await EstatisticasService.buscarEstatisticasPorPeriodo(dias)
      
      if (result.success && result.estatisticas) {
        setEstatisticasPorPeriodo(result.estatisticas)
      } else {
        setError(result.error || 'Erro ao carregar estatísticas por período')
      }
    } catch (err) {
      setError('Erro interno ao carregar estatísticas por período')
    } finally {
      setLoading(false)
    }
  }, [])

  // Carregar estatísticas gerais
  const carregarEstatisticasGerais = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await EstatisticasService.buscarEstatisticasGerais()
      
      if (result.success && result.estatisticas) {
        setEstatisticasGerais(result.estatisticas)
      } else {
        setError(result.error || 'Erro ao carregar estatísticas gerais')
      }
    } catch (err) {
      setError('Erro interno ao carregar estatísticas gerais')
    } finally {
      setLoading(false)
    }
  }, [])

  // Carregar todas as estatísticas
  const carregarTodasEstatisticas = useCallback(async () => {
    await Promise.all([
      carregarEstatisticasPorTurno(dataSelecionada),
      carregarEstatisticasPorPeriodo(periodoSelecionado),
      carregarEstatisticasGerais()
    ])
  }, [dataSelecionada, periodoSelecionado, carregarEstatisticasPorTurno, carregarEstatisticasPorPeriodo, carregarEstatisticasGerais])

  // Carregar estatísticas quando a data ou período mudar
  useEffect(() => {
    carregarEstatisticasPorTurno(dataSelecionada)
  }, [dataSelecionada, carregarEstatisticasPorTurno])

  useEffect(() => {
    carregarEstatisticasPorPeriodo(periodoSelecionado)
  }, [periodoSelecionado, carregarEstatisticasPorPeriodo])

  // Carregar estatísticas gerais uma vez ao montar o componente
  useEffect(() => {
    carregarEstatisticasGerais()
  }, [carregarEstatisticasGerais])

  // Função para formatar turno
  const formatarTurno = (turno: string) => {
    switch (turno) {
      case 'A': return 'Manhã'
      case 'B': return 'Tarde'
      case 'C': return 'Noite'
      default: return turno
    }
  }

  // Função para formatar data
  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR')
  }

  // Função para calcular porcentagem
  const calcularPorcentagem = (valor: number, total: number) => {
    if (total === 0) return 0
    return Math.round((valor / total) * 100)
  }

  return {
    // Estado
    estatisticasPorTurno,
    estatisticasPorPeriodo,
    estatisticasGerais,
    loading,
    error,
    dataSelecionada,
    periodoSelecionado,
    
    // Funções
    setDataSelecionada,
    setPeriodoSelecionado,
    carregarEstatisticasPorTurno,
    carregarEstatisticasPorPeriodo,
    carregarEstatisticasGerais,
    carregarTodasEstatisticas,
    formatarTurno,
    formatarData,
    calcularPorcentagem
  }
}
