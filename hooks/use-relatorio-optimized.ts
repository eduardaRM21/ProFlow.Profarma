import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRelatoriosHybrid } from './use-hybrid-optimized'
import { useNotasFiscaisHybrid } from './use-hybrid-optimized'
import { useDivergenciasHybrid } from './use-hybrid-optimized'
import { cacheManager } from '@/lib/cache-manager'
import { getSupabase } from '@/lib/supabase-client'

// =====================================================
// TIPOS
// =====================================================

interface RelatorioCompleto {
  id: string
  nome: string
  data_criacao: string
  status: string
  usuario_id: string
  notas: NotaFiscalCompleta[]
  divergencias: DivergenciaCompleta[]
  totalDivergencias: number
  totalNotas: number
  totalVolumes: number
}

interface NotaFiscalCompleta {
  id: string
  numero_nf: string
  fornecedor: string
  volumes: number
  status: string
  data_emissao: string
  divergencias?: DivergenciaCompleta[]
}

interface DivergenciaCompleta {
  id: string
  nota_fiscal_id: string
  tipo_divergencia: string
  descricao: string
  status: string
  volume_esperado?: number
  volume_encontrado?: number
}

interface UseRelatorioOptions {
  // Estratégias de carregamento
  loadNotasOnDemand?: boolean
  loadDivergenciasOnDemand?: boolean
  
  // Cache
  enableCache?: boolean
  cacheTTL?: number
  
  // Paginação
  notasPageSize?: number
  divergenciasPageSize?: number
  
  // Realtime
  enableRealtime?: boolean
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export const useRelatorioOptimized = (
  relatorioId: string | null,
  options: UseRelatorioOptions = {}
) => {
  const {
    loadNotasOnDemand = true,
    loadDivergenciasOnDemand = true,
    enableCache = true,
    cacheTTL = 300000, // 5 minutos
    notasPageSize = 20,
    divergenciasPageSize = 20,
    enableRealtime = true
  } = options

  const [relatorioCompleto, setRelatorioCompleto] = useState<RelatorioCompleto | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedSections, setLoadedSections] = useState<{
    notas: boolean
    divergencias: boolean
  }>({
    notas: false,
    divergencias: false
  })

  // Hook para dados básicos do relatório
  const { data: relatorios, isLoading: isLoadingRelatorios } = useRelatoriosHybrid(
    { status: 'all' },
    {
      strategy: 'swr',
      enableRealtime,
      staleTime: 120000 // 2 minutos
    }
  )

  // Hook para notas fiscais (lazy loading)
  const {
    data: notas,
    isLoading: isLoadingNotas,
    hasMore: hasMoreNotas,
    totalCount: totalNotas,
    loadMore: loadMoreNotas,
    refresh: refreshNotas
  } = useNotasFiscaisHybrid(
    { relatorioId: relatorioId || undefined },
    {
      strategy: loadNotasOnDemand ? 'lazy' : 'hybrid',
      pageSize: notasPageSize,
      enablePagination: true,
      enableRealtime,
      staleTime: 60000 // 1 minuto
    }
  )

  // Hook para divergências (lazy loading)
  const {
    data: divergencias,
    isLoading: isLoadingDivergencias,
    hasMore: hasMoreDivergencias,
    totalCount: totalDivergencias,
    loadMore: loadMoreDivergencias,
    refresh: refreshDivergencias
  } = useDivergenciasHybrid(
    { relatorioId: relatorioId || undefined },
    {
      strategy: loadDivergenciasOnDemand ? 'lazy' : 'hybrid',
      pageSize: divergenciasPageSize,
      enablePagination: true,
      enableRealtime,
      staleTime: 30000 // 30 segundos
    }
  )

  // Encontrar relatório específico
  const relatorio = useMemo(() => {
    if (!relatorioId || !relatorios) return null
    return relatorios.find(r => r.id === relatorioId) || null
  }, [relatorioId, relatorios])

  // Carregar dados básicos do relatório
  useEffect(() => {
    if (!relatorio) return

    const cacheKey = `relatorio_completo_${relatorio.id}`
    
    // Verificar cache primeiro
    if (enableCache) {
      const cached = cacheManager.get<RelatorioCompleto>(cacheKey)
      if (cached) {
        console.log('📋 Relatório completo encontrado no cache:', relatorio.id)
        setRelatorioCompleto(cached)
        return
      }
    }

    // Carregar dados básicos
    const relatorioBasico: RelatorioCompleto = {
      id: relatorio.id,
      nome: relatorio.nome || `Relatório ${relatorio.id}`,
      data_criacao: relatorio.data_criacao || new Date().toISOString(),
      status: relatorio.status || 'ativo',
      usuario_id: relatorio.usuario_id || '',
      notas: [],
      divergencias: [],
      totalDivergencias: 0,
      totalNotas: 0,
      totalVolumes: 0
    }

    setRelatorioCompleto(relatorioBasico)

    // Salvar no cache
    if (enableCache) {
      cacheManager.set(cacheKey, relatorioBasico, { ttl: cacheTTL })
    }

  }, [relatorio, enableCache, cacheTTL])

  // Carregar notas sob demanda
  const loadNotas = useCallback(async () => {
    if (!relatorioId || loadedSections.notas) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('🔄 Carregando notas do relatório:', relatorioId)
      
      // Se já temos notas carregadas, usar elas
      if (notas && notas.length > 0) {
        setRelatorioCompleto(prev => {
          if (!prev) return prev
          
          const updated = {
            ...prev,
            notas: notas,
            totalNotas: totalNotas || notas.length,
            totalVolumes: notas.reduce((sum, nota) => sum + (nota.volumes || 0), 0)
          }

          // Salvar no cache
          if (enableCache) {
            const cacheKey = `relatorio_completo_${relatorioId}`
            cacheManager.set(cacheKey, updated, { ttl: cacheTTL })
          }

          return updated
        })
      }

      setLoadedSections(prev => ({ ...prev, notas: true }))
      console.log('✅ Notas carregadas para o relatório:', relatorioId)

    } catch (err: any) {
      console.error('❌ Erro ao carregar notas:', err)
      setError(err.message || 'Erro ao carregar notas')
    } finally {
      setIsLoading(false)
    }
  }, [relatorioId, loadedSections.notas, notas, totalNotas, enableCache, cacheTTL])

  // Carregar divergências sob demanda
  const loadDivergencias = useCallback(async () => {
    if (!relatorioId || loadedSections.divergencias) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('🔄 Carregando divergências do relatório:', relatorioId)
      
      // Se já temos divergências carregadas, usar elas
      if (divergencias && divergencias.length > 0) {
        setRelatorioCompleto(prev => {
          if (!prev) return prev
          
          const updated = {
            ...prev,
            divergencias: divergencias,
            totalDivergencias: totalDivergencias || divergencias.length
          }

          // Salvar no cache
          if (enableCache) {
            const cacheKey = `relatorio_completo_${relatorioId}`
            cacheManager.set(cacheKey, updated, { ttl: cacheTTL })
          }

          return updated
        })
      }

      setLoadedSections(prev => ({ ...prev, divergencias: true }))
      console.log('✅ Divergências carregadas para o relatório:', relatorioId)

    } catch (err: any) {
      console.error('❌ Erro ao carregar divergências:', err)
      setError(err.message || 'Erro ao carregar divergências')
    } finally {
      setIsLoading(false)
    }
  }, [relatorioId, loadedSections.divergencias, divergencias, totalDivergencias, enableCache, cacheTTL])

  // Carregar tudo de uma vez (para compatibilidade)
  const loadAll = useCallback(async () => {
    if (!relatorioId) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('🔄 Carregando todos os dados do relatório:', relatorioId)
      
      // Carregar notas e divergências em paralelo
      await Promise.all([
        loadNotas(),
        loadDivergencias()
      ])

      console.log('✅ Todos os dados carregados para o relatório:', relatorioId)

    } catch (err: any) {
      console.error('❌ Erro ao carregar dados completos:', err)
      setError(err.message || 'Erro ao carregar dados completos')
    } finally {
      setIsLoading(false)
    }
  }, [relatorioId, loadNotas, loadDivergencias])

  // Refresh de todos os dados
  const refresh = useCallback(async () => {
    if (!relatorioId) return

    // Limpar cache
    if (enableCache) {
      cacheManager.invalidate(`relatorio_completo_${relatorioId}`)
    }

    // Resetar seções carregadas
    setLoadedSections({ notas: false, divergencias: false })

    // Refresh dos hooks
    await Promise.all([
      refreshNotas(),
      refreshDivergencias()
    ])

    // Recarregar dados
    await loadAll()
  }, [relatorioId, enableCache, refreshNotas, refreshDivergencias, loadAll])

  // Função para buscar nota específica
  const getNotaById = useCallback((notaId: string) => {
    if (!relatorioCompleto?.notas) return null
    return relatorioCompleto.notas.find(nota => nota.id === notaId) || null
  }, [relatorioCompleto])

  // Função para buscar divergências de uma nota
  const getDivergenciasByNota = useCallback((notaId: string) => {
    if (!relatorioCompleto?.divergencias) return []
    return relatorioCompleto.divergencias.filter(div => div.nota_fiscal_id === notaId)
  }, [relatorioCompleto])

  // Estatísticas
  const estatisticas = useMemo(() => {
    if (!relatorioCompleto) return null

    return {
      totalNotas: relatorioCompleto.totalNotas,
      totalDivergencias: relatorioCompleto.totalDivergencias,
      totalVolumes: relatorioCompleto.totalVolumes,
      notasComDivergencias: relatorioCompleto.notas.filter(nota => 
        relatorioCompleto.divergencias.some(div => div.nota_fiscal_id === nota.id)
      ).length,
      divergenciasPendentes: relatorioCompleto.divergencias.filter(div => div.status === 'pendente').length,
      divergenciasResolvidas: relatorioCompleto.divergencias.filter(div => div.status === 'resolvida').length
    }
  }, [relatorioCompleto])

  return {
    // Dados
    relatorio: relatorioCompleto,
    relatorioBasico: relatorio,
    
    // Estados
    isLoading: isLoading || isLoadingRelatorios,
    isLoadingNotas: isLoadingNotas,
    isLoadingDivergencias: isLoadingDivergencias,
    error,
    
    // Seções carregadas
    loadedSections,
    
    // Paginação
    hasMoreNotas,
    hasMoreDivergencias,
    totalNotas,
    totalDivergencias,
    
    // Funções de carregamento
    loadNotas,
    loadDivergencias,
    loadAll,
    loadMoreNotas,
    loadMoreDivergencias,
    refresh,
    
    // Funções utilitárias
    getNotaById,
    getDivergenciasByNota,
    
    // Estatísticas
    estatisticas
  }
}

// =====================================================
// HOOK SIMPLIFICADO PARA COMPATIBILIDADE
// =====================================================

export const useRelatorioSimple = (relatorioId: string | null) => {
  return useRelatorioOptimized(relatorioId, {
    loadNotasOnDemand: false,
    loadDivergenciasOnDemand: false,
    enableCache: true,
    enableRealtime: true
  })
}

// =====================================================
// HOOK PARA MÚLTIPLOS RELATÓRIOS
// =====================================================

export const useMultipleRelatorios = (relatorioIds: string[]) => {
  const results = relatorioIds.map(id => useRelatorioOptimized(id, {
    loadNotasOnDemand: true,
    loadDivergenciasOnDemand: true,
    enableCache: true
  }))

  return {
    relatorios: results.map(r => r.relatorio).filter(Boolean),
    isLoading: results.some(r => r.isLoading),
    hasError: results.some(r => r.error),
    refreshAll: () => results.forEach(r => r.refresh()),
    estatisticas: results.map(r => r.estatisticas).filter(Boolean)
  }
}
