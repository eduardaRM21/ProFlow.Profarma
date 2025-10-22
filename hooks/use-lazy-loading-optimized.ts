import { useState, useCallback, useRef, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { cacheManager } from '@/lib/cache-manager'

// =====================================================
// TIPOS PARA LAZY LOADING
// =====================================================

interface LazyLoadingOptions {
  pageSize?: number
  enabled?: boolean
  cacheKey?: string
  staleTime?: number
  onLoadStart?: () => void
  onLoadComplete?: (data: any[]) => void
  onError?: (error: any) => void
}

interface LazyLoadingResult<T> {
  data: T[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  totalCount: number
  currentPage: number
  error: string | null
  loadMore: () => Promise<void>
  loadPage: (page: number) => Promise<void>
  refresh: () => Promise<void>
  reset: () => void
}

// =====================================================
// HOOK PRINCIPAL PARA LAZY LOADING
// =====================================================

export const useLazyLoading = <T>(
  table: string,
  selectQuery: string = '*',
  filters?: Record<string, any>,
  options: LazyLoadingOptions = {}
): LazyLoadingResult<T> => {
  const {
    pageSize = 20,
    enabled = true,
    cacheKey,
    staleTime = 300000, // 5 minutos
    onLoadStart,
    onLoadComplete,
    onError
  } = options

  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const loadedPagesRef = useRef<Set<number>>(new Set())

  // Gerar chave de cache única
  const generateCacheKey = useCallback((page: number) => {
    const filterStr = filters ? JSON.stringify(filters) : 'all'
    return cacheKey || `lazy_${table}_${page}_${pageSize}_${filterStr}`
  }, [table, pageSize, filters, cacheKey])

  // Função para buscar dados de uma página específica
  const fetchPage = useCallback(async (page: number, isLoadMore = false): Promise<{
    data: T[]
    totalCount: number
    hasMore: boolean
  }> => {
    if (!enabled) return { data: [], totalCount: 0, hasMore: false }

    const pageCacheKey = generateCacheKey(page)
    
    // Verificar cache primeiro
    const cached = cacheManager.get<{
      data: T[]
      totalCount: number
      hasMore: boolean
      timestamp: number
    }>(pageCacheKey)
    
    if (cached && Date.now() - cached.timestamp < staleTime) {
      console.log('📋 Lazy Loading: Usando cache para página', page)
      return {
        data: cached.data,
        totalCount: cached.totalCount,
        hasMore: cached.hasMore
      }
    }

    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Criar novo AbortController
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    console.log('🔄 Lazy Loading: Buscando página', page, 'do banco')
    
    try {
      const supabase = getSupabase()
      
      // Construir query base
      let query = supabase
        .from(table)
        .select(selectQuery, { count: 'exact' })
        .range((page - 1) * pageSize, page * pageSize - 1)
        .order('created_at', { ascending: false })

      // Aplicar filtros
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              query = query.in(key, value)
            } else {
              query = query.eq(key, value)
            }
          }
        })
      }

      const { data: pageData, error, count } = await query

      if (signal.aborted) {
        throw new Error('Requisição cancelada')
      }

      if (error) {
        console.error('❌ Lazy Loading: Erro ao buscar página', page, ':', error)
        throw error
      }

      const result = {
        data: pageData || [],
        totalCount: count || 0,
        hasMore: (count || 0) > page * pageSize
      }

      // Salvar no cache
      cacheManager.set(pageCacheKey, {
        ...result,
        timestamp: Date.now()
      }, { ttl: staleTime })

      console.log('✅ Lazy Loading: Página', page, 'carregada:', result.data.length, 'itens')
      return result

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('🚫 Lazy Loading: Requisição cancelada para página', page)
        throw err
      }
      
      console.error('❌ Lazy Loading: Erro ao buscar página', page, ':', err)
      throw err
    }
  }, [enabled, table, selectQuery, filters, pageSize, generateCacheKey, staleTime])

  // Função para carregar mais dados
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !enabled) return

    setIsLoadingMore(true)
    setError(null)
    onLoadStart?.()

    try {
      const nextPage = currentPage + 1
      const result = await fetchPage(nextPage, true)

      setData(prevData => [...prevData, ...result.data])
      setTotalCount(result.totalCount)
      setHasMore(result.hasMore)
      setCurrentPage(nextPage)
      loadedPagesRef.current.add(nextPage)

      onLoadComplete?.(result.data)
      console.log('✅ Lazy Loading: Mais dados carregados. Total:', data.length + result.data.length)

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorMsg = err.message || 'Erro ao carregar mais dados'
        setError(errorMsg)
        onError?.(err)
        console.error('❌ Lazy Loading: Erro ao carregar mais:', err)
      }
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, enabled, currentPage, data.length, fetchPage, onLoadStart, onLoadComplete, onError])

  // Função para carregar uma página específica
  const loadPage = useCallback(async (page: number) => {
    if (page < 1 || isLoading || !enabled) return

    setIsLoading(true)
    setError(null)
    onLoadStart?.()

    try {
      const result = await fetchPage(page)

      setData(result.data)
      setTotalCount(result.totalCount)
      setHasMore(result.hasMore)
      setCurrentPage(page)
      loadedPagesRef.current.add(page)

      onLoadComplete?.(result.data)
      console.log('✅ Lazy Loading: Página', page, 'carregada. Total:', result.data.length)

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorMsg = err.message || 'Erro ao carregar página'
        setError(errorMsg)
        onError?.(err)
        console.error('❌ Lazy Loading: Erro ao carregar página', page, ':', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, enabled, fetchPage, onLoadStart, onLoadComplete, onError])

  // Função para refresh
  const refresh = useCallback(async () => {
    // Limpar cache
    const pattern = generateCacheKey(1).replace(/_\d+_/, '_*_')
    cacheManager.invalidate(pattern)
    
    // Resetar estado
    setData([])
    setCurrentPage(1)
    setHasMore(true)
    setError(null)
    loadedPagesRef.current.clear()
    
    // Carregar primeira página
    await loadPage(1)
  }, [generateCacheKey, loadPage])

  // Função para reset
  const reset = useCallback(() => {
    setData([])
    setIsLoading(false)
    setIsLoadingMore(false)
    setHasMore(true)
    setTotalCount(0)
    setCurrentPage(1)
    setError(null)
    loadedPagesRef.current.clear()
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Carregar primeira página automaticamente
  useEffect(() => {
    if (enabled && data.length === 0 && !isLoading) {
      loadPage(1)
    }
  }, [enabled, data.length, isLoading, loadPage])

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    data,
    isLoading,
    isLoadingMore,
    hasMore,
    totalCount,
    currentPage,
    error,
    loadMore,
    loadPage,
    refresh,
    reset
  }
}

// =====================================================
// HOOKS ESPECÍFICOS
// =====================================================

// Hook para divergências com lazy loading
export const useDivergenciasLazy = (
  filters?: {
    notaFiscalId?: string
    relatorioId?: string
    status?: string
  },
  options: LazyLoadingOptions = {}
) => {
  return useLazyLoading<any>(
    'divergencias',
    '*',
    filters,
    {
      pageSize: 20,
      cacheKey: 'divergencias_lazy',
      staleTime: 300000, // 5 minutos
      ...options
    }
  )
}

// Hook para notas fiscais com lazy loading
export const useNotasFiscaisLazy = (
  filters?: {
    relatorioId?: string
    status?: string
    fornecedor?: string
  },
  options: LazyLoadingOptions = {}
) => {
  return useLazyLoading<any>(
    'notas_fiscais',
    '*',
    filters,
    {
      pageSize: 20,
      cacheKey: 'notas_fiscais_lazy',
      staleTime: 300000, // 5 minutos
      ...options
    }
  )
}

// Hook para relatórios com lazy loading
export const useRelatoriosLazy = (
  filters?: {
    status?: string
    usuarioId?: string
  },
  options: LazyLoadingOptions = {}
) => {
  return useLazyLoading<any>(
    'relatorios',
    '*',
    filters,
    {
      pageSize: 10,
      cacheKey: 'relatorios_lazy',
      staleTime: 600000, // 10 minutos
      ...options
    }
  )
}

// Hook para carros com lazy loading
export const useCarrosLazy = (
  filters?: {
    status?: string
    turno?: string
  },
  options: LazyLoadingOptions = {}
) => {
  return useLazyLoading<any>(
    'embalagem_notas_bipadas',
    '*',
    filters,
    {
      pageSize: 15,
      cacheKey: 'carros_lazy',
      staleTime: 180000, // 3 minutos
      ...options
    }
  )
}

// =====================================================
// HOOK PARA INFINITE SCROLL
// =====================================================

export const useInfiniteScroll = <T>(
  lazyLoadingResult: LazyLoadingResult<T>,
  options: {
    threshold?: number
    enabled?: boolean
  } = {}
) => {
  const { threshold = 100, enabled = true } = options
  const { loadMore, hasMore, isLoadingMore } = lazyLoadingResult

  useEffect(() => {
    if (!enabled || !hasMore || isLoadingMore) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      if (distanceFromBottom < threshold) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [enabled, hasMore, isLoadingMore, threshold, loadMore])

  return lazyLoadingResult
}
