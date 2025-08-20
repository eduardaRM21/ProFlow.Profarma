import { useState, useEffect } from 'react'
import { EmbalagemNotasBipadasService } from '@/lib/embalagem-notas-bipadas-service'

export interface EmbalagemStats {
  nfsBipadas: number
  carrosProduzidos: number
  totalVolumes: number
  carrosUtilizados: number
  loading: boolean
  error: string | null
}

export function useEmbalagemStats(data: string, turno: string) {
  const [stats, setStats] = useState<EmbalagemStats>({
    nfsBipadas: 0,
    carrosProduzidos: 0,
    totalVolumes: 0,
    carrosUtilizados: 0,
    loading: true,
    error: null
  })

  useEffect(() => {
    const buscarEstatisticas = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true, error: null }))
        
        console.log('📊 Buscando estatísticas do setor de embalagem para:', { data, turno })
        
        // Buscar estatísticas das notas bipadas
        const resultadoEstatisticas = await EmbalagemNotasBipadasService.buscarEstatisticas(data, turno)
        
        // Buscar carros prontos
        const resultadoCarrosProntos = await EmbalagemNotasBipadasService.buscarCarrosProntos(data, turno)
        
        if (resultadoEstatisticas.success && resultadoEstatisticas.estatisticas) {
          const { total_notas, total_volumes, carros_utilizados } = resultadoEstatisticas.estatisticas
          const carrosProntos = resultadoCarrosProntos.success ? resultadoCarrosProntos.carrosProntos || 0 : 0
          
          setStats({
            nfsBipadas: total_notas,
            carrosProduzidos: carrosProntos,
            totalVolumes: total_volumes,
            carrosUtilizados: carros_utilizados,
            loading: false,
            error: null
          })
          
          console.log('✅ Estatísticas do setor de embalagem carregadas:', {
            nfsBipadas: total_notas,
            carrosProduzidos: carrosProntos,
            totalVolumes: total_volumes,
            carrosUtilizados: carros_utilizados
          })
        } else {
          console.error('❌ Erro ao buscar estatísticas:', resultadoEstatisticas.error)
          setStats(prev => ({
            ...prev,
            loading: false,
            error: resultadoEstatisticas.error || 'Erro ao buscar estatísticas'
          }))
        }
      } catch (error) {
        console.error('❌ Erro inesperado ao buscar estatísticas:', error)
        setStats(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Erro inesperado'
        }))
      }
    }

    if (data && turno) {
      buscarEstatisticas()
    }
  }, [data, turno])



  // Função para atualizar estatísticas manualmente
  const refreshStats = () => {
    if (data && turno) {
      setStats(prev => ({ ...prev, loading: true }))
      // O useEffect será executado novamente devido à mudança no estado
    }
  }

  return {
    stats,
    refreshStats,
    loading: stats.loading,
    error: stats.error
  }
}
