import useSWR, { SWRConfiguration } from 'swr'
import { useCallback, useMemo } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { cacheManager } from '@/lib/cache-manager'

// =====================================================
// CONFIGURAÇÕES SWR OTIMIZADAS
// =====================================================

const SWR_CONFIG: SWRConfiguration = {
  // Cache por 30-60 segundos para reduzir egress
  dedupingInterval: 30000, // 30s - evita requisições duplicadas
  focusThrottleInterval: 60000, // 60s - throttle no foco da janela
  revalidateOnFocus: false, // Desabilitar revalidação no foco
  revalidateOnReconnect: true, // Revalidar apenas na reconexão
  revalidateIfStale: true, // Revalidar se dados estão stale
  refreshInterval: 0, // Desabilitar refresh automático
  errorRetryCount: 3, // Máximo 3 tentativas
  errorRetryInterval: 5000, // 5s entre tentativas
  shouldRetryOnError: (error) => {
    // Não tentar novamente para erros 4xx (client errors)
    return !error?.status || error.status >= 500
  }
}

// =====================================================
// FETCHER FUNCTIONS
// =====================================================

// Fetcher genérico com cache
const createFetcher = <T>(
  table: string,
  selectQuery?: string,
  filters?: Record<string, any>
) => {
  return async (key: string): Promise<T> => {
    // Verificar cache primeiro
    const cacheKey = `swr_${key}`
    const cached = cacheManager.get<T>(cacheKey)
    if (cached) {
      console.log('📋 SWR: Usando cache para', key)
      return cached
    }

    console.log('🔄 SWR: Buscando dados do banco para', key)
    const supabase = getSupabase()
    
    let query = supabase.from(table).select(selectQuery || '*')
    
    // Aplicar filtros
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('❌ SWR: Erro ao buscar dados:', error)
      throw error
    }
    
    // Salvar no cache
    cacheManager.set(cacheKey, data, { ttl: 300000 }) // 5 minutos
    
    return data as T
  }
}

// =====================================================
// HOOKS ESPECÍFICOS
// =====================================================

// Hook para carros com SWR
export const useCarrosSWR = (options?: {
  enabled?: boolean
  staleTime?: number
}) => {
  const { enabled = true, staleTime = 60000 } = options || {}
  
  const config = useMemo(() => ({
    ...SWR_CONFIG,
    refreshInterval: 0, // Desabilitar polling
    revalidateOnFocus: false,
    dedupingInterval: staleTime
  }), [staleTime])
  
  const fetcher = useCallback(
    createFetcher<any[]>('embalagem_notas_bipadas', '*'),
    []
  )
  
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? 'carros' : null,
    fetcher,
    config
  )
  
  return {
    carros: data || [],
    isLoading,
    error,
    mutate,
    refresh: () => mutate()
  }
}

// Hook para divergências com paginação
export const useDivergenciasSWR = (
  page: number = 1,
  pageSize: number = 20,
  filters?: {
    notaFiscalId?: string
    relatorioId?: string
  },
  options?: {
    enabled?: boolean
    staleTime?: number
  }
) => {
  const { enabled = true, staleTime = 30000 } = options || {}
  
  const config = useMemo(() => ({
    ...SWR_CONFIG,
    refreshInterval: 0,
    revalidateOnFocus: false,
    dedupingInterval: staleTime
  }), [staleTime])
  
  const fetcher = useCallback(async (key: string) => {
    const cacheKey = `swr_${key}`
    const cached = cacheManager.get<any>(cacheKey)
    if (cached) {
      console.log('📋 SWR: Usando cache para divergências', key)
      return cached
    }
    
    console.log('🔄 SWR: Buscando divergências do banco', key)
    const supabase = getSupabase()
    
    let query = supabase
      .from('divergencias')
      .select('*')
      .range((page - 1) * pageSize, page * pageSize - 1)
      .order('created_at', { ascending: false })
    
    // Aplicar filtros
    if (filters?.notaFiscalId) {
      query = query.eq('nota_fiscal_id', filters.notaFiscalId)
    }
    
    if (filters?.relatorioId) {
      // Buscar notas do relatório primeiro
      const { data: relatorioNotas } = await supabase
        .from('relatorio_notas')
        .select('nota_fiscal_id')
        .eq('relatorio_id', filters.relatorioId)
      
      if (relatorioNotas && relatorioNotas.length > 0) {
        const notaIds = relatorioNotas.map(rn => rn.nota_fiscal_id)
        query = query.in('nota_fiscal_id', notaIds)
      }
    }
    
    const { data, error, count } = await query
    
    if (error) {
      console.error('❌ SWR: Erro ao buscar divergências:', error)
      throw error
    }
    
    const result = {
      data: data || [],
      totalCount: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > page * pageSize
    }
    
    // Salvar no cache
    cacheManager.set(cacheKey, result, { ttl: 300000 })
    
    return result
  }, [page, pageSize, filters])
  
  const key = `divergencias_${page}_${pageSize}_${filters?.notaFiscalId || 'all'}_${filters?.relatorioId || 'all'}`
  
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? key : null,
    fetcher,
    config
  )
  
  return {
    divergencias: data?.data || [],
    totalCount: data?.totalCount || 0,
    hasMore: data?.hasMore || false,
    isLoading,
    error,
    mutate,
    refresh: () => mutate()
  }
}

// Hook para relatórios com SWR
export const useRelatoriosSWR = (options?: {
  enabled?: boolean
  staleTime?: number
}) => {
  const { enabled = true, staleTime = 120000 } = options || {} // 2 minutos
  
  const config = useMemo(() => ({
    ...SWR_CONFIG,
    refreshInterval: 0,
    revalidateOnFocus: false,
    dedupingInterval: staleTime
  }), [staleTime])
  
  const fetcher = useCallback(
    createFetcher<any[]>('relatorios', '*'),
    []
  )
  
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? 'relatorios' : null,
    fetcher,
    config
  )
  
  return {
    relatorios: data || [],
    isLoading,
    error,
    mutate,
    refresh: () => mutate()
  }
}

// Hook para notas fiscais com paginação
export const useNotasFiscaisSWR = (
  page: number = 1,
  pageSize: number = 20,
  filters?: {
    relatorioId?: string
    status?: string
  },
  options?: {
    enabled?: boolean
    staleTime?: number
  }
) => {
  const { enabled = true, staleTime = 60000 } = options || {}
  
  const config = useMemo(() => ({
    ...SWR_CONFIG,
    refreshInterval: 0,
    revalidateOnFocus: false,
    dedupingInterval: staleTime
  }), [staleTime])
  
  const fetcher = useCallback(async (key: string) => {
    const cacheKey = `swr_${key}`
    const cached = cacheManager.get<any>(cacheKey)
    if (cached) {
      console.log('📋 SWR: Usando cache para notas fiscais', key)
      return cached
    }
    
    console.log('🔄 SWR: Buscando notas fiscais do banco', key)
    const supabase = getSupabase()
    
    let query = supabase
      .from('notas_fiscais')
      .select('*')
      .range((page - 1) * pageSize, page * pageSize - 1)
      .order('created_at', { ascending: false })
    
    // Aplicar filtros
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    
    if (filters?.relatorioId) {
      // Buscar notas do relatório
      const { data: relatorioNotas } = await supabase
        .from('relatorio_notas')
        .select('nota_fiscal_id')
        .eq('relatorio_id', filters.relatorioId)
      
      if (relatorioNotas && relatorioNotas.length > 0) {
        const notaIds = relatorioNotas.map(rn => rn.nota_fiscal_id)
        query = query.in('id', notaIds)
      }
    }
    
    const { data, error, count } = await query
    
    if (error) {
      console.error('❌ SWR: Erro ao buscar notas fiscais:', error)
      throw error
    }
    
    const result = {
      data: data || [],
      totalCount: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > page * pageSize
    }
    
    // Salvar no cache
    cacheManager.set(cacheKey, result, { ttl: 300000 })
    
    return result
  }, [page, pageSize, filters])
  
  const key = `notas_fiscais_${page}_${pageSize}_${filters?.relatorioId || 'all'}_${filters?.status || 'all'}`
  
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? key : null,
    fetcher,
    config
  )
  
  return {
    notas: data?.data || [],
    totalCount: data?.totalCount || 0,
    hasMore: data?.hasMore || false,
    isLoading,
    error,
    mutate,
    refresh: () => mutate()
  }
}

// =====================================================
// HOOK PARA MÚLTIPLAS QUERIES
// =====================================================

export const useMultipleSWR = <T>(
  queries: Array<{
    key: string
    fetcher: () => Promise<T>
    enabled?: boolean
  }>,
  options?: {
    staleTime?: number
  }
) => {
  const { staleTime = 60000 } = options || {}
  
  const config = useMemo(() => ({
    ...SWR_CONFIG,
    refreshInterval: 0,
    revalidateOnFocus: false,
    dedupingInterval: staleTime
  }), [staleTime])
  
  const results = queries.map(({ key, fetcher, enabled = true }) => {
    const { data, error, isLoading, mutate } = useSWR(
      enabled ? key : null,
      fetcher,
      config
    )
    
    return {
      key,
      data,
      error,
      isLoading,
      mutate,
      refresh: () => mutate()
    }
  })
  
  return {
    results,
    isLoading: results.some(r => r.isLoading),
    hasError: results.some(r => r.error),
    refreshAll: () => results.forEach(r => r.refresh())
  }
}

// =====================================================
// HOOK PARA INVALIDAÇÃO DE CACHE
// =====================================================

export const useCacheInvalidation = () => {
  const invalidatePattern = useCallback((pattern: string) => {
    cacheManager.invalidate(pattern)
    console.log('🗑️ Cache invalidado para padrão:', pattern)
  }, [])
  
  const invalidateAll = useCallback(() => {
    cacheManager.clear()
    console.log('🗑️ Todo o cache invalidado')
  }, [])
  
  const getCacheStats = useCallback(() => {
    return cacheManager.getStats()
  }, [])
  
  return {
    invalidatePattern,
    invalidateAll,
    getCacheStats
  }
}
