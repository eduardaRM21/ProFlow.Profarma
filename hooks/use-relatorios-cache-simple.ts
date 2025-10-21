"use client"

import { useState, useCallback, useRef, useMemo } from 'react'
import type { NotaFiscal, Relatorio } from '@/lib/database-service'

interface CacheEntry {
  relatorio: Relatorio
  notas: NotaFiscal[]
  timestamp: number
  lastAccessed: number
}

interface RelatoriosCache {
  [relatorioId: string]: CacheEntry
}

const CACHE_DURATION = 30 * 60 * 1000 // 30 minutos
const MAX_CACHE_SIZE = 50 // Máximo 50 relatórios em cache

export function useRelatoriosCache() {
  const [cache, setCache] = useState<RelatoriosCache>({})
  const cacheRef = useRef<RelatoriosCache>({})

  // Atualizar ref quando cache muda
  cacheRef.current = cache

  // Verificar se relatório está em cache e não expirou
  const isRelatorioCached = useCallback((relatorioId: string): boolean => {
    const entry = cacheRef.current[relatorioId]
    if (!entry) return false

    const now = Date.now()
    const isExpired = now - entry.timestamp > CACHE_DURATION
    
    if (isExpired) {
      console.log(`⏰ Cache expirado para relatório ${relatorioId}`)
      return false
    }

    return true
  }, [])

  // Obter relatório do cache
  const getRelatorioFromCache = useCallback((relatorioId: string): Relatorio | null => {
    const entry = cacheRef.current[relatorioId]
    if (!entry) return null

    const now = Date.now()
    const isExpired = now - entry.timestamp > CACHE_DURATION
    
    if (isExpired) {
      console.log(`⏰ Cache expirado para relatório ${relatorioId}`)
      return null
    }

    console.log(`📦 Relatório ${relatorioId} obtido do cache`)
    return entry.relatorio
  }, [])

  // Salvar relatório no cache
  const saveRelatorioToCache = useCallback((relatorio: Relatorio, notas: NotaFiscal[]) => {
    const now = Date.now()
    
    setCache(prevCache => {
      const newCache = {
        ...prevCache,
        [relatorio.id]: {
          relatorio: {
            ...relatorio,
            notas: notas
          },
          notas: notas,
          timestamp: now,
          lastAccessed: now
        }
      }

      console.log(`💾 Relatório ${relatorio.id} salvo no cache com ${notas.length} notas`)
      
      // Verificar se precisa limpar cache
      const entries = Object.entries(newCache)
      if (entries.length > MAX_CACHE_SIZE) {
        // Limpar cache inline para evitar dependência circular
        const sortedEntries = entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
        const entriesToKeep = sortedEntries.slice(-MAX_CACHE_SIZE)
        const cleanedCache: RelatoriosCache = {}
        
        entriesToKeep.forEach(([id, entry]) => {
          cleanedCache[id] = entry
        })
        
        console.log(`🧹 Cache otimizado: ${entries.length - entriesToKeep.length} relatórios antigos removidos`)
        return cleanedCache
      }

      return newCache
    })
  }, [])

  // Atualizar relatório no cache
  const updateRelatorioInCache = useCallback((relatorioId: string, updates: Partial<Relatorio>) => {
    setCache(prevCache => {
      const entry = prevCache[relatorioId]
      if (!entry) return prevCache

      const now = Date.now()
      return {
        ...prevCache,
        [relatorioId]: {
          ...entry,
          relatorio: {
            ...entry.relatorio,
            ...updates
          },
          lastAccessed: now
        }
      }
    })
  }, [])

  // Remover relatório do cache
  const removeRelatorioFromCache = useCallback((relatorioId: string) => {
    setCache(prevCache => {
      const { [relatorioId]: removed, ...rest } = prevCache
      if (removed) {
        console.log(`🗑️ Relatório ${relatorioId} removido do cache`)
      }
      return rest
    })
  }, [])

  // Limpar todo o cache
  const clearCache = useCallback(() => {
    setCache({})
    console.log('🧹 Cache completamente limpo')
  }, [])

  // Obter estatísticas do cache (usando useMemo para evitar recálculos)
  const cacheStats = useMemo(() => {
    const entries = Object.values(cache)
    const now = Date.now()
    
    return {
      totalRelatorios: entries.length,
      totalNotas: entries.reduce((sum, entry) => sum + entry.notas.length, 0),
      expiredEntries: entries.filter(entry => now - entry.timestamp > CACHE_DURATION).length,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(entry => entry.timestamp)) : null,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(entry => entry.timestamp)) : null
    }
  }, [cache])

  // Função para obter estatísticas (retorna o valor memoizado)
  const getCacheStats = useCallback(() => cacheStats, [cacheStats])

  return {
    // Estados
    cache,
    
    // Funções principais
    isRelatorioCached,
    getRelatorioFromCache,
    saveRelatorioToCache,
    updateRelatorioInCache,
    removeRelatorioFromCache,
    clearCache,
    
    // Estatísticas
    getCacheStats
  }
}
