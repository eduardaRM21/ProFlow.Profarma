import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCarrosSWR, useDivergenciasSWR, useRelatoriosSWR, useNotasFiscaisSWR } from './use-swr-optimized'
import { useDivergenciasLazy, useNotasFiscaisLazy, useRelatoriosLazy, useCarrosLazy } from './use-lazy-loading-optimized'
import { useRealtimeOptimized } from './use-realtime-optimized'
import { cacheManager } from '@/lib/cache-manager'

// =====================================================
// TIPOS PARA HOOKS HÍBRIDOS
// =====================================================

interface HybridOptions {
  // Estratégia de carregamento
  strategy?: 'swr' | 'lazy' | 'hybrid'
  
  // Configurações de cache
  staleTime?: number
  cacheKey?: string
  
  // Configurações de paginação (para lazy loading)
  pageSize?: number
  enablePagination?: boolean
  
  // Configurações de realtime
  enableRealtime?: boolean
  realtimeDebounce?: number
  
  // Configurações de performance
  enableCache?: boolean
  enablePrefetch?: boolean
}

interface HybridResult<T> {
  // Dados
  data: T[]
  isLoading: boolean
  error: string | null
  
  // Funcionalidades de paginação (se habilitado)
  hasMore?: boolean
  totalCount?: number
  currentPage?: number
  loadMore?: () => Promise<void>
  loadPage?: (page: number) => Promise<void>
  
  // Funcionalidades de realtime (se habilitado)
  isRealtimeConnected?: boolean
  lastRealtimeUpdate?: Date
  realtimeError?: string | null
  
  // Funcionalidades gerais
  refresh: () => void
  mutate?: (data?: T[]) => void
  
  // Estatísticas de performance
  performance: {
    cacheHit: boolean
    lastFetch: Date
    dataSize: number
    strategy: string
  }
}

// =====================================================
// HOOK HÍBRIDO PARA DIVERGÊNCIAS
// =====================================================

export const useDivergenciasHybrid = (
  filters?: {
    notaFiscalId?: string
    relatorioId?: string
    status?: string
  },
  options: HybridOptions = {}
): HybridResult<any> => {
  const {
    strategy = 'hybrid',
    staleTime = 30000,
    pageSize = 20,
    enablePagination = true,
    enableRealtime = true,
    realtimeDebounce = 2000,
    enableCache = true,
    cacheKey = 'divergencias_hybrid'
  } = options

  const [lastFetch, setLastFetch] = useState<Date>(new Date())
  const [cacheHit, setCacheHit] = useState(false)

  // SWR para cache inteligente
  const swrResult = useDivergenciasSWR(
    enablePagination ? 1 : undefined,
    enablePagination ? pageSize : undefined,
    filters,
    {
      enabled: strategy === 'swr' || strategy === 'hybrid',
      staleTime
    }
  )

  // Lazy loading para paginação
  const lazyResult = useDivergenciasLazy(filters, {
    enabled: strategy === 'lazy' || (strategy === 'hybrid' && enablePagination),
    pageSize,
    cacheKey: `${cacheKey}_lazy`,
    staleTime
  })

  // Realtime para updates automáticos
  const realtimeResult = useRealtimeOptimized('divergencias', {
    enabled: enableRealtime && (strategy === 'swr' || strategy === 'hybrid'),
    debounceMs: realtimeDebounce,
    onUpdate: (payload) => {
      console.log('🔄 Divergência atualizada via realtime:', payload)
      // Invalidar cache quando houver mudanças
      if (enableCache) {
        cacheManager.invalidate('divergencias')
      }
      // Refresh dos dados
      if (strategy === 'swr' || strategy === 'hybrid') {
        swrResult.refresh()
      }
      if (strategy === 'lazy' || strategy === 'hybrid') {
        lazyResult.refresh()
      }
    }
  })

  // Escolher qual resultado usar baseado na estratégia
  const result = useMemo(() => {
    if (strategy === 'lazy' || (strategy === 'hybrid' && enablePagination)) {
      return lazyResult
    }
    return swrResult
  }, [strategy, enablePagination, lazyResult, swrResult])

  // Verificar cache hit
  useEffect(() => {
    const cacheKey = `swr_divergencias_${JSON.stringify(filters)}`
    const hasCached = cacheManager.has(cacheKey)
    setCacheHit(hasCached)
  }, [filters])

  // Função de refresh unificada
  const refresh = useCallback(() => {
    setLastFetch(new Date())
    if (strategy === 'swr' || strategy === 'hybrid') {
      swrResult.refresh()
    }
    if (strategy === 'lazy' || strategy === 'hybrid') {
      lazyResult.refresh()
    }
  }, [strategy, swrResult, lazyResult])

  return {
    // Dados
    data: (result as any).data || (result as any).divergencias || [],
    isLoading: result.isLoading,
    error: result.error,
    
    // Funcionalidades de paginação (se habilitado)
    ...(enablePagination && {
      hasMore: (result as any).hasMore,
      totalCount: (result as any).totalCount,
      currentPage: (result as any).currentPage,
      loadMore: (result as any).loadMore,
      loadPage: (result as any).loadPage
    }),
    
    // Funcionalidades de realtime (se habilitado)
    ...(enableRealtime && {
      isRealtimeConnected: realtimeResult.isConnected,
      lastRealtimeUpdate: realtimeResult.lastUpdate,
      realtimeError: realtimeResult.error
    }),
    
    // Funcionalidades gerais
    refresh,
    mutate: (result as any).mutate,
    
    // Estatísticas de performance
    performance: {
      cacheHit,
      lastFetch,
      dataSize: JSON.stringify((result as any).data || (result as any).divergencias || []).length,
      strategy
    }
  }
}

// =====================================================
// HOOK HÍBRIDO PARA NOTAS FISCAIS
// =====================================================

export const useNotasFiscaisHybrid = (
  filters?: {
    relatorioId?: string
    status?: string
    fornecedor?: string
  },
  options: HybridOptions = {}
): HybridResult<any> => {
  const {
    strategy = 'hybrid',
    staleTime = 60000,
    pageSize = 20,
    enablePagination = true,
    enableRealtime = true,
    realtimeDebounce = 1500,
    enableCache = true,
    cacheKey = 'notas_fiscais_hybrid'
  } = options

  const [lastFetch, setLastFetch] = useState<Date>(new Date())
  const [cacheHit, setCacheHit] = useState(false)

  // SWR para cache inteligente
  const swrResult = useNotasFiscaisSWR(
    enablePagination ? 1 : undefined,
    enablePagination ? pageSize : undefined,
    filters,
    {
      enabled: strategy === 'swr' || strategy === 'hybrid',
      staleTime
    }
  )

  // Lazy loading para paginação
  const lazyResult = useNotasFiscaisLazy(filters, {
    enabled: strategy === 'lazy' || (strategy === 'hybrid' && enablePagination),
    pageSize,
    cacheKey: `${cacheKey}_lazy`,
    staleTime
  })

  // Realtime para updates automáticos
  const realtimeResult = useRealtimeOptimized('notas_fiscais', {
    enabled: enableRealtime && (strategy === 'swr' || strategy === 'hybrid'),
    debounceMs: realtimeDebounce,
    onUpdate: (payload) => {
      console.log('🔄 Nota fiscal atualizada via realtime:', payload)
      if (enableCache) {
        cacheManager.invalidate('notas_fiscais')
      }
      if (strategy === 'swr' || strategy === 'hybrid') {
        swrResult.refresh()
      }
      if (strategy === 'lazy' || strategy === 'hybrid') {
        lazyResult.refresh()
      }
    }
  })

  const result = useMemo(() => {
    if (strategy === 'lazy' || (strategy === 'hybrid' && enablePagination)) {
      return lazyResult
    }
    return swrResult
  }, [strategy, enablePagination, lazyResult, swrResult])

  useEffect(() => {
    const cacheKey = `swr_notas_fiscais_${JSON.stringify(filters)}`
    const hasCached = cacheManager.has(cacheKey)
    setCacheHit(hasCached)
  }, [filters])

  const refresh = useCallback(() => {
    setLastFetch(new Date())
    if (strategy === 'swr' || strategy === 'hybrid') {
      swrResult.refresh()
    }
    if (strategy === 'lazy' || strategy === 'hybrid') {
      lazyResult.refresh()
    }
  }, [strategy, swrResult, lazyResult])

  return {
    data: (result as any).data || (result as any).notas || [],
    isLoading: result.isLoading,
    error: result.error,
    
    ...(enablePagination && {
      hasMore: (result as any).hasMore,
      totalCount: (result as any).totalCount,
      currentPage: (result as any).currentPage,
      loadMore: (result as any).loadMore,
      loadPage: (result as any).loadPage
    }),
    
    ...(enableRealtime && {
      isRealtimeConnected: realtimeResult.isConnected,
      lastRealtimeUpdate: realtimeResult.lastUpdate,
      realtimeError: realtimeResult.error
    }),
    
    refresh,
    mutate: (result as any).mutate,
    
    performance: {
      cacheHit,
      lastFetch,
      dataSize: JSON.stringify((result as any).data || (result as any).notas || []).length,
      strategy
    }
  }
}

// =====================================================
// HOOK HÍBRIDO PARA CARROS
// =====================================================

export const useCarrosHybrid = (
  filters?: {
    status?: string
    turno?: string
  },
  options: HybridOptions = {}
): HybridResult<any> => {
  const {
    strategy = 'hybrid',
    staleTime = 60000,
    pageSize = 15,
    enablePagination = false, // Carros geralmente não precisam de paginação
    enableRealtime = true,
    realtimeDebounce = 2000,
    enableCache = true,
    cacheKey = 'carros_hybrid'
  } = options

  const [lastFetch, setLastFetch] = useState<Date>(new Date())
  const [cacheHit, setCacheHit] = useState(false)

  // SWR para cache inteligente
  const swrResult = useCarrosSWR({
    enabled: strategy === 'swr' || strategy === 'hybrid',
    staleTime
  })

  // Lazy loading (opcional para carros)
  const lazyResult = useCarrosLazy(filters, {
    enabled: strategy === 'lazy' || (strategy === 'hybrid' && enablePagination),
    pageSize,
    cacheKey: `${cacheKey}_lazy`,
    staleTime
  })

  // Realtime para updates automáticos
  const realtimeResult = useRealtimeOptimized('embalagem_notas_bipadas', {
    enabled: enableRealtime && (strategy === 'swr' || strategy === 'hybrid'),
    debounceMs: realtimeDebounce,
    onUpdate: (payload) => {
      console.log('🔄 Carro atualizado via realtime:', payload)
      if (enableCache) {
        cacheManager.invalidate('carros')
      }
      if (strategy === 'swr' || strategy === 'hybrid') {
        swrResult.refresh()
      }
      if (strategy === 'lazy' || strategy === 'hybrid') {
        lazyResult.refresh()
      }
    }
  })

  const result = useMemo(() => {
    if (strategy === 'lazy' || (strategy === 'hybrid' && enablePagination)) {
      return lazyResult
    }
    return swrResult
  }, [strategy, enablePagination, lazyResult, swrResult])

  useEffect(() => {
    const cacheKey = `swr_carros_${JSON.stringify(filters)}`
    const hasCached = cacheManager.has(cacheKey)
    setCacheHit(hasCached)
  }, [filters])

  const refresh = useCallback(() => {
    setLastFetch(new Date())
    if (strategy === 'swr' || strategy === 'hybrid') {
      swrResult.refresh()
    }
    if (strategy === 'lazy' || strategy === 'hybrid') {
      lazyResult.refresh()
    }
  }, [strategy, swrResult, lazyResult])

  return {
    data: (result as any).data || (result as any).carros || [],
    isLoading: result.isLoading,
    error: result.error,
    
    ...(enablePagination && {
      hasMore: (result as any).hasMore,
      totalCount: (result as any).totalCount,
      currentPage: (result as any).currentPage,
      loadMore: (result as any).loadMore,
      loadPage: (result as any).loadPage
    }),
    
    ...(enableRealtime && {
      isRealtimeConnected: realtimeResult.isConnected,
      lastRealtimeUpdate: realtimeResult.lastUpdate,
      realtimeError: realtimeResult.error
    }),
    
    refresh,
    mutate: (result as any).mutate,
    
    performance: {
      cacheHit,
      lastFetch,
      dataSize: JSON.stringify((result as any).data || (result as any).carros || []).length,
      strategy
    }
  }
}

// =====================================================
// HOOK HÍBRIDO PARA RELATÓRIOS
// =====================================================

export const useRelatoriosHybrid = (
  filters?: {
    status?: string
    usuarioId?: string
  },
  options: HybridOptions = {}
): HybridResult<any> => {
  const {
    strategy = 'hybrid',
    staleTime = 120000, // 2 minutos para relatórios
    pageSize = 10,
    enablePagination = true,
    enableRealtime = true,
    realtimeDebounce = 5000, // 5 segundos para relatórios
    enableCache = true,
    cacheKey = 'relatorios_hybrid'
  } = options

  const [lastFetch, setLastFetch] = useState<Date>(new Date())
  const [cacheHit, setCacheHit] = useState(false)

  // SWR para cache inteligente
  const swrResult = useRelatoriosSWR({
    enabled: strategy === 'swr' || strategy === 'hybrid',
    staleTime
  })

  // Lazy loading para paginação
  const lazyResult = useRelatoriosLazy(filters, {
    enabled: strategy === 'lazy' || (strategy === 'hybrid' && enablePagination),
    pageSize,
    cacheKey: `${cacheKey}_lazy`,
    staleTime
  })

  // Realtime para updates automáticos
  const realtimeResult = useRealtimeOptimized('relatorios', {
    enabled: enableRealtime && (strategy === 'swr' || strategy === 'hybrid'),
    debounceMs: realtimeDebounce,
    onUpdate: (payload) => {
      console.log('🔄 Relatório atualizado via realtime:', payload)
      if (enableCache) {
        cacheManager.invalidate('relatorios')
      }
      if (strategy === 'swr' || strategy === 'hybrid') {
        swrResult.refresh()
      }
      if (strategy === 'lazy' || strategy === 'hybrid') {
        lazyResult.refresh()
      }
    }
  })

  const result = useMemo(() => {
    if (strategy === 'lazy' || (strategy === 'hybrid' && enablePagination)) {
      return lazyResult
    }
    return swrResult
  }, [strategy, enablePagination, lazyResult, swrResult])

  useEffect(() => {
    const cacheKey = `swr_relatorios_${JSON.stringify(filters)}`
    const hasCached = cacheManager.has(cacheKey)
    setCacheHit(hasCached)
  }, [filters])

  const refresh = useCallback(() => {
    setLastFetch(new Date())
    if (strategy === 'swr' || strategy === 'hybrid') {
      swrResult.refresh()
    }
    if (strategy === 'lazy' || strategy === 'hybrid') {
      lazyResult.refresh()
    }
  }, [strategy, swrResult, lazyResult])

  return {
    data: (result as any).data || (result as any).relatorios || [],
    isLoading: result.isLoading,
    error: result.error,
    
    ...(enablePagination && {
      hasMore: (result as any).hasMore,
      totalCount: (result as any).totalCount,
      currentPage: (result as any).currentPage,
      loadMore: (result as any).loadMore,
      loadPage: (result as any).loadPage
    }),
    
    ...(enableRealtime && {
      isRealtimeConnected: realtimeResult.isConnected,
      lastRealtimeUpdate: realtimeResult.lastUpdate,
      realtimeError: realtimeResult.error
    }),
    
    refresh,
    mutate: (result as any).mutate,
    
    performance: {
      cacheHit,
      lastFetch,
      dataSize: JSON.stringify((result as any).data || (result as any).relatorios || []).length,
      strategy
    }
  }
}

// =====================================================
// HOOK PARA MÚLTIPLAS ENTIDADES HÍBRIDAS
// =====================================================

export const useMultipleHybrid = (
  entities: Array<{
    type: 'divergencias' | 'notas_fiscais' | 'carros' | 'relatorios'
    filters?: any
    options?: HybridOptions
  }>
) => {
  const results = entities.map(({ type, filters, options }) => {
    switch (type) {
      case 'divergencias':
        return useDivergenciasHybrid(filters, options)
      case 'notas_fiscais':
        return useNotasFiscaisHybrid(filters, options)
      case 'carros':
        return useCarrosHybrid(filters, options)
      case 'relatorios':
        return useRelatoriosHybrid(filters, options)
      default:
        throw new Error(`Tipo de entidade não suportado: ${type}`)
    }
  })

  return {
    results,
    isLoading: results.some(r => r.isLoading),
    hasError: results.some(r => r.error),
    refreshAll: () => results.forEach(r => r.refresh()),
    performance: results.map(r => r.performance)
  }
}
