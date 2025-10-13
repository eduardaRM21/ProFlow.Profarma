import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { useDivergenciasOptimized } from './use-optimized-data'
import { useDivergenciasRealtime } from './use-realtime-optimized'
import { useDivergenciasLazy } from './use-lazy-loading'

// Cache em memória para divergências
interface DivergenciaCache {
  [key: string]: {
    data: any[]
    timestamp: number
    promise?: Promise<any[]>
  }
}

const divergenciasCache: DivergenciaCache = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos
const MAX_CACHE_SIZE = 100 // Máximo de 100 entradas no cache

// Hook para gerenciar cache de divergências
export const useDivergenciasCache = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Função para limpar cache expirado
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now()
    const expiredKeys = Object.keys(divergenciasCache).filter(
      key => now - divergenciasCache[key].timestamp > CACHE_TTL
    )
    
    expiredKeys.forEach(key => {
      delete divergenciasCache[key]
    })

    // Se o cache estiver muito grande, remover as entradas mais antigas
    const cacheKeys = Object.keys(divergenciasCache)
    if (cacheKeys.length > MAX_CACHE_SIZE) {
      const sortedKeys = cacheKeys.sort(
        (a, b) => divergenciasCache[a].timestamp - divergenciasCache[b].timestamp
      )
      
      const keysToRemove = sortedKeys.slice(0, cacheKeys.length - MAX_CACHE_SIZE)
      keysToRemove.forEach(key => {
        delete divergenciasCache[key]
      })
    }
  }, [])

  // Função para buscar divergências com cache
  const getDivergencias = useCallback(async (
    notaFiscalId?: string,
    relatorioId?: string,
    forceRefresh = false
  ): Promise<any[]> => {
    try {
      // Cancelar requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Criar novo AbortController
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      // Gerar chave de cache baseada nos parâmetros
      const cacheKey = `divergencias_${notaFiscalId || 'all'}_${relatorioId || 'all'}`
      
      // Verificar se já existe no cache e não é forçado refresh
      if (!forceRefresh && divergenciasCache[cacheKey]) {
        const cached = divergenciasCache[cacheKey]
        const now = Date.now()
        
        // Se o cache ainda é válido, retornar os dados
        if (now - cached.timestamp < CACHE_TTL) {
          console.log('📋 Usando cache de divergências:', cacheKey)
          return cached.data
        }
        
        // Se há uma requisição em andamento, aguardar ela
        if (cached.promise) {
          console.log('⏳ Aguardando requisição em andamento:', cacheKey)
          return await cached.promise
        }
      }

      setIsLoading(true)
      setError(null)

      // Criar promise para a requisição
      const fetchPromise = (async () => {
        const supabase = getSupabase()
        
        let query = supabase
          .from('divergencias')
          .select('*')

        // Aplicar filtros se fornecidos
        if (notaFiscalId) {
          query = query.eq('nota_fiscal_id', notaFiscalId)
        }

        // Se relatorioId for fornecido, buscar divergências das notas do relatório
        if (relatorioId && !notaFiscalId) {
          // Primeiro buscar as notas do relatório
          const { data: relatorioNotas } = await supabase
            .from('relatorio_notas')
            .select('nota_fiscal_id')
            .eq('relatorio_id', relatorioId)

          if (relatorioNotas && relatorioNotas.length > 0) {
            const notaIds = relatorioNotas.map(rn => rn.nota_fiscal_id)
            
            // Dividir em lotes de 50 IDs para evitar URL muito longa e problemas de rede
            const BATCH_SIZE = 50
            const batches = []
            for (let i = 0; i < notaIds.length; i += BATCH_SIZE) {
              batches.push(notaIds.slice(i, i + BATCH_SIZE))
            }
            
            // Buscar divergências em lotes (sem join para evitar problemas de conectividade)
            const allDivergencias = []
            for (let i = 0; i < batches.length; i++) {
              const batch = batches[i]
              try {
                console.log(`🔍 Buscando divergências lote ${i + 1}/${batches.length} (${batch.length} IDs)`)
                
                const { data: batchData, error: batchError } = await supabase
                  .from('divergencias')
                  .select('*')
                  .in('nota_fiscal_id', batch)
                
                if (batchError) {
                  console.warn('⚠️ Erro ao buscar lote de divergências:', batchError)
                  continue
                }
                
                if (batchData) {
                  allDivergencias.push(...batchData)
                  console.log(`✅ Lote ${i + 1} processado: ${batchData.length} divergências`)
                }
                
                // Pequeno delay entre requisições para evitar sobrecarga
                if (i < batches.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 100))
                }
              } catch (fetchError) {
                console.warn('⚠️ Erro de conectividade ao buscar lote:', fetchError)
                continue
              }
            }
            
            return allDivergencias
          } else {
            // Se não há notas no relatório, retornar array vazio
            return []
          }
        }

        const { data, error } = await query

        if (error) {
          throw error
        }

        return data || []
      })()

      // Armazenar promise no cache para evitar requisições duplicadas
      divergenciasCache[cacheKey] = {
        data: [],
        timestamp: Date.now(),
        promise: fetchPromise
      }

      // Aguardar resultado
      const result = await fetchPromise

      // Atualizar cache com o resultado
      divergenciasCache[cacheKey] = {
        data: result,
        timestamp: Date.now()
      }

      console.log('✅ Divergências carregadas:', result.length, 'itens')
      return result

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('🚫 Requisição de divergências cancelada')
        return []
      }

      console.error('❌ Erro ao buscar divergências:', err)
      setError(err.message || 'Erro ao buscar divergências')
      return []
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [])

  // Função para buscar divergências de uma nota específica
  const getDivergenciasByNota = useCallback(async (
    notaFiscalId: string,
    forceRefresh = false
  ): Promise<any[]> => {
    return await getDivergencias(notaFiscalId, undefined, forceRefresh)
  }, [getDivergencias])

  // Função para buscar divergências de um relatório
  const getDivergenciasByRelatorio = useCallback(async (
    relatorioId: string,
    forceRefresh = false
  ): Promise<any[]> => {
    return await getDivergencias(undefined, relatorioId, forceRefresh)
  }, [getDivergencias])

  // Função para invalidar cache
  const invalidateCache = useCallback((pattern?: string) => {
    if (pattern) {
      // Invalidar cache específico
      const keysToInvalidate = Object.keys(divergenciasCache).filter(key => 
        key.includes(pattern)
      )
      keysToInvalidate.forEach(key => {
        delete divergenciasCache[key]
      })
      console.log('🗑️ Cache invalidado para padrão:', pattern)
    } else {
      // Invalidar todo o cache
      Object.keys(divergenciasCache).forEach(key => {
        delete divergenciasCache[key]
      })
      console.log('🗑️ Todo o cache de divergências invalidado')
    }
  }, [])

  // Função para limpar cache
  const clearCache = useCallback(() => {
    Object.keys(divergenciasCache).forEach(key => {
      delete divergenciasCache[key]
    })
    console.log('🧹 Cache de divergências limpo')
  }, [])

  // Função para obter estatísticas do cache
  const getCacheStats = useCallback(() => {
    const now = Date.now()
    const entries = Object.keys(divergenciasCache)
    const validEntries = entries.filter(
      key => now - divergenciasCache[key].timestamp < CACHE_TTL
    )
    const expiredEntries = entries.length - validEntries.length

    return {
      totalEntries: entries.length,
      validEntries: validEntries.length,
      expiredEntries,
      cacheSize: JSON.stringify(divergenciasCache).length
    }
  }, [])

  // Limpar cache expirado periodicamente
  useEffect(() => {
    const interval = setInterval(cleanExpiredCache, 60000) // A cada minuto
    return () => clearInterval(interval)
  }, [cleanExpiredCache])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    getDivergencias,
    getDivergenciasByNota,
    getDivergenciasByRelatorio,
    invalidateCache,
    clearCache,
    getCacheStats,
    isLoading,
    error
  }
}

// Hook para usar divergências com cache automático
export const useDivergencias = (
  notaFiscalId?: string,
  relatorioId?: string,
  options: {
    refreshInterval?: number
    revalidateOnFocus?: boolean
    revalidateOnReconnect?: boolean
  } = {}
) => {
  const {
    getDivergencias,
    getDivergenciasByNota,
    getDivergenciasByRelatorio,
    invalidateCache,
    isLoading,
    error
  } = useDivergenciasCache()

  const [data, setData] = useState<any[]>([])
  const [lastFetch, setLastFetch] = useState<number>(0)

  const {
    refreshInterval = 0,
    revalidateOnFocus = true,
    revalidateOnReconnect = true
  } = options

  // Função para buscar dados
  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      let result: any[] = []

      if (notaFiscalId) {
        result = await getDivergenciasByNota(notaFiscalId, forceRefresh)
      } else if (relatorioId) {
        result = await getDivergenciasByRelatorio(relatorioId, forceRefresh)
      } else {
        result = await getDivergencias(undefined, undefined, forceRefresh)
      }

      setData(result)
      setLastFetch(Date.now())
    } catch (err) {
      console.error('❌ Erro ao buscar divergências:', err)
    }
  }, [notaFiscalId, relatorioId, getDivergencias, getDivergenciasByNota, getDivergenciasByRelatorio])

  // Buscar dados iniciais
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refresh automático
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchData(true) // Forçar refresh
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [refreshInterval, fetchData])

  // Revalidar ao focar na janela
  useEffect(() => {
    if (!revalidateOnFocus) return

    const handleFocus = () => {
      fetchData(true)
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [revalidateOnFocus, fetchData])

  // Revalidar ao reconectar
  useEffect(() => {
    if (!revalidateOnReconnect) return

    const handleOnline = () => {
      fetchData(true)
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [revalidateOnReconnect, fetchData])

  return {
    data,
    isLoading,
    error,
    lastFetch,
    refresh: () => fetchData(true),
    invalidateCache
  }
}

// =====================================================
// VERSÃO OTIMIZADA COM SWR + REALTIME + LAZY LOADING
// =====================================================

// Hook otimizado que combina SWR, Realtime e Lazy Loading
export const useDivergenciasOptimizedV2 = (
  notaFiscalId?: string,
  relatorioId?: string,
  options: {
    useRealtime?: boolean
    useLazyLoading?: boolean
    pageSize?: number
    refreshInterval?: number
    staleTime?: number
  } = {}
) => {
  const {
    useRealtime = true,
    useLazyLoading = false,
    pageSize = 20,
    refreshInterval = 60000, // 1 minuto
    staleTime = 30000 // 30 segundos
  } = options

  // SWR para cache inteligente
  const swrResult = useDivergenciasOptimized(notaFiscalId, relatorioId, {
    refreshInterval,
    staleTime
  })

  // Lazy loading se habilitado
  const lazyResult = useDivergenciasLazy(notaFiscalId, relatorioId, {
    pageSize,
    enabled: useLazyLoading
  })

  // Realtime para updates automáticos
  const realtimeResult = useDivergenciasRealtime((payload) => {
    console.log('🔄 Divergência atualizada via realtime:', payload)
    // Invalidar cache do SWR quando houver mudanças
    swrResult.refresh()
  })

  // Escolher qual resultado usar
  const result = useLazyLoading ? lazyResult : swrResult

  return {
    // Dados
    data: result.data,
    isLoading: result.isLoading,
    error: result.error,
    
    // Funcionalidades de lazy loading (se habilitado)
    ...(useLazyLoading && {
      hasMore: lazyResult.hasMore,
      totalCount: lazyResult.totalCount,
      currentPage: lazyResult.currentPage,
      loadMore: lazyResult.loadMore,
      loadPage: lazyResult.loadPage
    }),
    
    // Funcionalidades de realtime
    ...(useRealtime && {
      isRealtimeConnected: realtimeResult.isConnected,
      lastRealtimeUpdate: realtimeResult.lastUpdate,
      realtimeError: realtimeResult.error
    }),
    
    // Funcionalidades gerais
    refresh: result.refresh,
    mutate: 'mutate' in result ? result.mutate : undefined,
    
    // Estatísticas de performance
    performance: {
      cacheHit: true, // SWR sempre usa cache
      lastFetch: new Date(),
      dataSize: JSON.stringify(result.data).length
    }
  }
}

// Hook híbrido que usa SWR + Realtime para máxima performance
export const useDivergenciasHybrid = (
  notaFiscalId?: string,
  relatorioId?: string
) => {
  return useDivergenciasOptimizedV2(notaFiscalId, relatorioId, {
    useRealtime: true,
    useLazyLoading: false,
    refreshInterval: 120000, // 2 minutos
    staleTime: 60000 // 1 minuto
  })
}

// Hook para lazy loading com realtime
export const useDivergenciasLazyRealtime = (
  notaFiscalId?: string,
  relatorioId?: string,
  pageSize: number = 20
) => {
  return useDivergenciasOptimizedV2(notaFiscalId, relatorioId, {
    useRealtime: true,
    useLazyLoading: true,
    pageSize,
    refreshInterval: 0, // Desabilitar refresh automático
    staleTime: 300000 // 5 minutos
  })
}
