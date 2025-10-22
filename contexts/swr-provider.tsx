"use client"

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'
import { cacheManager } from '@/lib/cache-manager'

// =====================================================
// CONFIGURAÇÃO SWR GLOBAL
// =====================================================

const swrConfig = {
  // Cache por 30-60 segundos para reduzir egress
  dedupingInterval: 30000, // 30s - evita requisições duplicadas
  focusThrottleInterval: 60000, // 60s - throttle no foco da janela
  revalidateOnFocus: false, // Desabilitar revalidação no foco
  revalidateOnReconnect: true, // Revalidar apenas na reconexão
  revalidateIfStale: true, // Revalidar se dados estão stale
  refreshInterval: 0, // Desabilitar refresh automático
  errorRetryCount: 3, // Máximo 3 tentativas
  errorRetryInterval: 5000, // 5s entre tentativas
  shouldRetryOnError: (error: any) => {
    // Não tentar novamente para erros 4xx (client errors)
    return !error?.status || error.status >= 500
  },
  
  // Fetcher global com cache
  fetcher: async (url: string) => {
    // Verificar cache primeiro
    const cached = cacheManager.get(url)
    if (cached) {
      console.log('📋 SWR: Usando cache para', url)
      return cached
    }

    console.log('🔄 SWR: Buscando dados do banco para', url)
    
    // Fazer requisição
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Salvar no cache
    cacheManager.set(url, data, { ttl: 300000 }) // 5 minutos
    
    return data
  },
  
  // Callbacks
  onSuccess: (data: any, key: string) => {
    console.log('✅ SWR: Dados carregados com sucesso para', key)
  },
  
  onError: (error: any, key: string) => {
    console.error('❌ SWR: Erro ao carregar dados para', key, error)
  },
  
  onLoadingSlow: (key: string) => {
    console.warn('⚠️ SWR: Carregamento lento para', key)
  },
  
  onErrorRetry: (error: any, key: string, config: any, revalidate: any, { retryCount }: any) => {
    console.log(`🔄 SWR: Tentativa ${retryCount} para`, key)
    
    // Não tentar novamente para erros 4xx
    if (error?.status >= 400 && error?.status < 500) {
      return
    }
    
    // Máximo 3 tentativas
    if (retryCount >= 3) {
      return
    }
    
    // Delay exponencial
    const delay = Math.min(1000 * 2 ** retryCount, 10000)
    setTimeout(() => revalidate({ retryCount }), delay)
  }
}

// =====================================================
// PROVIDER COMPONENT
// =====================================================

interface SWRProviderProps {
  children: ReactNode
}

export const SWRProvider = ({ children }: SWRProviderProps) => {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  )
}

// =====================================================
// HOOKS UTILITÁRIOS
// =====================================================

export const useSWRConfig = () => {
  return swrConfig
}

// Hook para invalidar cache global
export const useInvalidateCache = () => {
  const invalidatePattern = (pattern: string) => {
    cacheManager.invalidate(pattern)
    console.log('🗑️ Cache invalidado para padrão:', pattern)
  }
  
  const invalidateAll = () => {
    cacheManager.clear()
    console.log('🗑️ Todo o cache invalidado')
  }
  
  const getCacheStats = () => {
    return cacheManager.getStats()
  }
  
  return {
    invalidatePattern,
    invalidateAll,
    getCacheStats
  }
}
