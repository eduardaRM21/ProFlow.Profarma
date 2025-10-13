import { useState, useCallback, useRef } from 'react'
import { getSupabase } from '@/lib/supabase-client'

// =====================================================
// TIPOS PARA LAZY LOADING
// =====================================================

interface LazyLoadOptions {
  pageSize?: number
  enabled?: boolean
  cacheKey?: string
  staleTime?: number
}

interface PaginatedData<T> {
  data: T[]
  hasMore: boolean
  totalCount: number
  currentPage: number
  isLoading: boolean
  error: string | null
}

// =====================================================
// CACHE LOCAL PARA LAZY LOADING
// =====================================================

const lazyCache = new Map<string, {
  data: any[]
  timestamp: number
  totalCount: number
}>()

const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

const getCachedData = (key: string) => {
  const cached = lazyCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached
  }
  return null
}

const setCachedData = (key: string, data: any[], totalCount: number) => {
  lazyCache.set(key, {
    data,
    timestamp: Date.now(),
    totalCount
  })
}

// =====================================================
// HOOK PRINCIPAL PARA LAZY LOADING
// =====================================================

export const useLazyLoading = <T>(
  fetcher: (page: number, pageSize: number) => Promise<{ data: T[], totalCount: number }>,
  options: LazyLoadOptions = {}
) => {
  const {
    pageSize = 20,
    enabled = true,
    cacheKey = 'default',
    staleTime = 30000
  } = options

  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)

  const loadPage = useCallback(async (page: number, append = false) => {
    if (!enabled) return

    // Cancelar requisição anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      setIsLoading(true)
      setError(null)

      const cacheKeyWithPage = `${cacheKey}_page_${page}`
      const cached = getCachedData(cacheKeyWithPage)

      if (cached) {
        console.log('📋 Usando cache para página', page)
        if (append) {
          setData(prev => [...prev, ...cached.data])
        } else {
          setData(cached.data)
        }
        setTotalCount(cached.totalCount)
        setHasMore(cached.data.length === pageSize)
        setCurrentPage(page)
        return
      }

      const result = await fetcher(page, pageSize)

      // Armazenar no cache
      setCachedData(cacheKeyWithPage, result.data, result.totalCount)

      if (append) {
        setData(prev => [...prev, ...result.data])
      } else {
        setData(result.data)
      }

      setTotalCount(result.totalCount)
      setHasMore(result.data.length === pageSize)
      setCurrentPage(page)

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('❌ Erro ao carregar página:', err)
        setError(err.message || 'Erro ao carregar dados')
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [enabled, cacheKey, pageSize, fetcher])

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      loadPage(currentPage + 1, true)
    }
  }, [hasMore, isLoading, currentPage, loadPage])

  const refresh = useCallback(() => {
    // Limpar cache
    lazyCache.delete(cacheKey)
    setData([])
    setCurrentPage(0)
    setHasMore(true)
    loadPage(0, false)
  }, [cacheKey, loadPage])

  const reset = useCallback(() => {
    setData([])
    setCurrentPage(0)
    setHasMore(true)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    data,
    isLoading,
    error,
    hasMore,
    totalCount,
    currentPage,
    loadMore,
    refresh,
    reset,
    loadPage: (page: number) => loadPage(page, false)
  }
}

// =====================================================
// HOOKS ESPECÍFICOS PARA CADA ENTIDADE
// =====================================================

// Hook para carregar divergências com lazy loading
export const useDivergenciasLazy = (
  notaFiscalId?: string,
  relatorioId?: string,
  options: LazyLoadOptions = {}
) => {
  const fetcher = useCallback(async (page: number, pageSize: number) => {
    const supabase = getSupabase()
    const offset = page * pageSize

    let query = supabase
      .from('divergencias')
      .select('*', { count: 'exact' })

    if (notaFiscalId) {
      query = query.eq('nota_fiscal_id', notaFiscalId)
    } else if (relatorioId) {
      // Buscar divergências de um relatório
      const { data: relatorioNotas } = await supabase
        .from('relatorio_notas')
        .select('nota_fiscal_id')
        .eq('relatorio_id', relatorioId)

      if (relatorioNotas && relatorioNotas.length > 0) {
        const notaIds = relatorioNotas.map(rn => rn.nota_fiscal_id)
        query = query.in('nota_fiscal_id', notaIds)
      } else {
        return { data: [], totalCount: 0 }
      }
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) throw error

    return {
      data: data || [],
      totalCount: count || 0
    }
  }, [notaFiscalId, relatorioId])

  return useLazyLoading(fetcher, {
    ...options,
    cacheKey: `divergencias_${notaFiscalId || 'all'}_${relatorioId || 'all'}`
  })
}

// Hook para carregar relatórios com lazy loading
export const useRelatoriosLazy = (
  area?: string,
  data?: string,
  turno?: string,
  options: LazyLoadOptions = {}
) => {
  const fetcher = useCallback(async (page: number, pageSize: number) => {
    const supabase = getSupabase()
    const offset = page * pageSize

    let query = supabase
      .from('relatorios')
      .select('*', { count: 'exact' })

    if (area) {
      if (area === 'custos') {
        query = query.eq('area', 'recebimento')
      } else {
        query = query.eq('area', area)
      }
    }

    if (data) {
      query = query.eq('data', data)
    }

    if (turno) {
      query = query.eq('turno', turno)
    }

    const { data: relatorios, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) throw error

    return {
      data: relatorios || [],
      totalCount: count || 0
    }
  }, [area, data, turno])

  return useLazyLoading(fetcher, {
    ...options,
    cacheKey: `relatorios_${area || 'all'}_${data || 'all'}_${turno || 'all'}`
  })
}

// Hook para carregar notas fiscais com lazy loading
export const useNotasLazy = (
  sessionId?: string,
  options: LazyLoadOptions = {}
) => {
  const fetcher = useCallback(async (page: number, pageSize: number) => {
    const supabase = getSupabase()
    const offset = page * pageSize

    let query = supabase
      .from('notas_fiscais')
      .select('*', { count: 'exact' })

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    const { data: notas, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) throw error

    return {
      data: notas || [],
      totalCount: count || 0
    }
  }, [sessionId])

  return useLazyLoading(fetcher, {
    ...options,
    cacheKey: `notas_${sessionId || 'all'}`
  })
}

// =====================================================
// HOOK PARA INFINITE SCROLL
// =====================================================

export const useInfiniteScroll = <T>(
  lazyHook: ReturnType<typeof useLazyLoading<T>>,
  options: {
    threshold?: number
    rootMargin?: string
  } = {}
) => {
  const { threshold = 0.1, rootMargin = '100px' } = options
  const [isIntersecting, setIsIntersecting] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const targetRef = useRef<HTMLDivElement | null>(null)

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    setIsIntersecting(entry.isIntersecting)
    
    if (entry.isIntersecting && lazyHook.hasMore && !lazyHook.isLoading) {
      lazyHook.loadMore()
    }
  }, [lazyHook])

  const setupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    if (targetRef.current) {
      observerRef.current = new IntersectionObserver(handleIntersection, {
        threshold,
        rootMargin
      })
      observerRef.current.observe(targetRef.current)
    }
  }, [handleIntersection, threshold, rootMargin])

  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }
  }, [])

  return {
    targetRef,
    isIntersecting,
    setupObserver,
    cleanup
  }
}

// =====================================================
// UTILITÁRIOS DE CACHE
// =====================================================

export const clearLazyCache = (pattern?: string) => {
  if (pattern) {
    const keysToDelete = Array.from(lazyCache.keys()).filter(key => 
      key.includes(pattern)
    )
    keysToDelete.forEach(key => lazyCache.delete(key))
  } else {
    lazyCache.clear()
  }
}

export const getLazyCacheStats = () => {
  const entries = Array.from(lazyCache.entries())
  const now = Date.now()
  
  const validEntries = entries.filter(([_, data]) => 
    now - data.timestamp < CACHE_TTL
  )
  
  const expiredEntries = entries.length - validEntries.length
  
  return {
    totalEntries: entries.length,
    validEntries: validEntries.length,
    expiredEntries,
    cacheSize: entries.reduce((size, [_, data]) => 
      size + JSON.stringify(data).length, 0
    )
  }
}
