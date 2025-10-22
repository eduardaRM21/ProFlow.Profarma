// =====================================================
// GERENCIADOR DE CACHE AVANÇADO
// =====================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  version: string
  metadata?: {
    size: number
    source: string
    userId?: string
  }
}

interface CacheConfig {
  defaultTTL: number
  maxSize: number
  version: string
  compression: boolean
}

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const CACHE_CONFIG: CacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5 minutos
  maxSize: 50 * 1024 * 1024, // 50MB
  version: '1.0.0',
  compression: true
}

// =====================================================
// CLASSE PRINCIPAL DO CACHE MANAGER
// =====================================================

export class CacheManager {
  private static instance: CacheManager
  private cache = new Map<string, CacheEntry<any>>()
  private localStoragePrefix = 'proflow_cache_'
  private currentSize = 0

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  constructor() {
    // Verificar se estamos no lado do cliente antes de acessar localStorage
    if (typeof window !== 'undefined') {
      this.loadFromLocalStorage()
      this.startCleanupInterval()
    }
  }

  // =====================================================
  // MÉTODOS PRINCIPAIS
  // =====================================================

  set<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number
      version?: string
      metadata?: any
    } = {}
  ): void {
    const {
      ttl = CACHE_CONFIG.defaultTTL,
      version = CACHE_CONFIG.version,
      metadata = {}
    } = options

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      version,
      metadata: {
        size: this.calculateSize(data),
        source: 'memory',
        ...metadata
      }
    }

    // Verificar se a entrada já existe e remover do tamanho atual
    if (this.cache.has(key)) {
      this.currentSize -= this.cache.get(key)!.metadata?.size || 0
    }

    // Verificar se há espaço suficiente
    if (this.currentSize + entry.metadata!.size > CACHE_CONFIG.maxSize) {
      this.evictOldest()
    }

    this.cache.set(key, entry)
    this.currentSize += entry.metadata!.size

    // Salvar no localStorage se for importante
    if (this.shouldPersist(key)) {
      this.saveToLocalStorage(key, entry)
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      // Tentar carregar do localStorage
      const localEntry = this.loadFromLocalStorage(key)
      if (localEntry) {
        this.cache.set(key, localEntry)
        return localEntry.data
      }
      return null
    }

    // Verificar se expirou
    if (this.isExpired(entry)) {
      this.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.currentSize -= entry.metadata?.size || 0
      this.cache.delete(key)
      this.removeFromLocalStorage(key)
      return true
    }
    return false
  }

  clear(): void {
    this.cache.clear()
    this.currentSize = 0
    this.clearLocalStorage()
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      // Verificar localStorage
      return this.hasInLocalStorage(key)
    }
    return !this.isExpired(entry)
  }

  // =====================================================
  // MÉTODOS DE UTILIDADE
  // =====================================================

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  private calculateSize(data: any): number {
    return JSON.stringify(data).length * 2 // Aproximação
  }

  private shouldPersist(key: string): boolean {
    // Persistir apenas dados importantes
    return key.includes('user_') || 
           key.includes('config_') || 
           key.includes('relatorios_') ||
           key.includes('carros_')
  }

  private evictOldest(): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)

    // Remover 20% das entradas mais antigas
    const toRemove = Math.ceil(entries.length * 0.2)
    
    for (let i = 0; i < toRemove; i++) {
      const [key, entry] = entries[i]
      this.currentSize -= entry.metadata?.size || 0
      this.cache.delete(key)
      this.removeFromLocalStorage(key)
    }
  }

  // =====================================================
  // LOCALSTORAGE
  // =====================================================

  private saveToLocalStorage(key: string, entry: CacheEntry<any>): void {
    // Verificar se estamos no lado do cliente
    if (typeof window === 'undefined') return
    
    try {
      const storageKey = `${this.localStoragePrefix}${key}`
      const data = CACHE_CONFIG.compression 
        ? this.compress(entry)
        : entry
      
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch (error) {
      console.warn('⚠️ Erro ao salvar no localStorage:', error)
    }
  }

  private loadFromLocalStorage(key?: string): CacheEntry<any> | null {
    // Verificar se estamos no lado do cliente
    if (typeof window === 'undefined') return null
    
    try {
      if (key) {
        const storageKey = `${this.localStoragePrefix}${key}`
        const data = localStorage.getItem(storageKey)
        if (data) {
          const entry = JSON.parse(data)
          return CACHE_CONFIG.compression 
            ? this.decompress(entry)
            : entry
        }
        return null
      } else {
        // Carregar todas as entradas do localStorage
        const keys = Object.keys(localStorage)
          .filter(k => k.startsWith(this.localStoragePrefix))
        
        keys.forEach(storageKey => {
          const data = localStorage.getItem(storageKey)
          if (data) {
            const entry = JSON.parse(data)
            const decompressed = CACHE_CONFIG.compression 
              ? this.decompress(entry)
              : entry
            
            if (!this.isExpired(decompressed)) {
              const key = storageKey.replace(this.localStoragePrefix, '')
              this.cache.set(key, decompressed)
              this.currentSize += decompressed.metadata?.size || 0
            }
          }
        })
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar do localStorage:', error)
    }
    return null
  }

  private removeFromLocalStorage(key: string): void {
    // Verificar se estamos no lado do cliente
    if (typeof window === 'undefined') return
    
    try {
      const storageKey = `${this.localStoragePrefix}${key}`
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('⚠️ Erro ao remover do localStorage:', error)
    }
  }

  private hasInLocalStorage(key: string): boolean {
    // Verificar se estamos no lado do cliente
    if (typeof window === 'undefined') return false
    
    const storageKey = `${this.localStoragePrefix}${key}`
    return localStorage.getItem(storageKey) !== null
  }

  private clearLocalStorage(): void {
    // Verificar se estamos no lado do cliente
    if (typeof window === 'undefined') return
    
    try {
      const keys = Object.keys(localStorage)
        .filter(k => k.startsWith(this.localStoragePrefix))
      
      keys.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.warn('⚠️ Erro ao limpar localStorage:', error)
    }
  }

  // =====================================================
  // COMPRESSÃO SIMPLES
  // =====================================================

  private compress(entry: CacheEntry<any>): CacheEntry<any> {
    // Compressão simples - remover espaços desnecessários
    const compressed = {
      ...entry,
      data: JSON.parse(JSON.stringify(entry.data)) // Remove undefined values
    }
    return compressed
  }

  private decompress(entry: CacheEntry<any>): CacheEntry<any> {
    return entry
  }

  // =====================================================
  // LIMPEZA AUTOMÁTICA
  // =====================================================

  private startCleanupInterval(): void {
    // Verificar se estamos no lado do cliente
    if (typeof window === 'undefined') return
    
    setInterval(() => {
      this.cleanup()
    }, 60000) // A cada minuto
  }

  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    this.cache.forEach((entry, key) => {
      if (this.isExpired(entry)) {
        expiredKeys.push(key)
      }
    })

    expiredKeys.forEach(key => {
      this.delete(key)
    })

    if (expiredKeys.length > 0) {
      console.log(`🧹 Cache limpo: ${expiredKeys.length} entradas expiradas removidas`)
    }
  }

  // =====================================================
  // ESTATÍSTICAS
  // =====================================================

  getStats() {
    const entries = Array.from(this.cache.values())
    const now = Date.now()
    
    const validEntries = entries.filter(entry => !this.isExpired(entry))
    const expiredEntries = entries.length - validEntries.length
    
    const totalSize = entries.reduce((sum, entry) => 
      sum + (entry.metadata?.size || 0), 0
    )

    return {
      totalEntries: entries.length,
      validEntries: validEntries.length,
      expiredEntries,
      totalSize,
      maxSize: CACHE_CONFIG.maxSize,
      usagePercentage: (totalSize / CACHE_CONFIG.maxSize) * 100,
      averageEntrySize: entries.length > 0 ? totalSize / entries.length : 0
    }
  }

  // =====================================================
  // MÉTODOS PÚBLICOS ADICIONAIS
  // =====================================================

  invalidate(pattern: string): number {
    const keys = Array.from(this.cache.keys())
      .filter(key => key.includes(pattern))
    
    keys.forEach(key => this.delete(key))
    
    return keys.length
  }

  getKeys(): string[] {
    return Array.from(this.cache.keys())
  }

  getSize(): number {
    return this.currentSize
  }

  isFull(): boolean {
    return this.currentSize >= CACHE_CONFIG.maxSize * 0.9 // 90% cheio
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const cacheManager = CacheManager.getInstance()

// =====================================================
// HOOKS PARA REACT
// =====================================================

export const useCache = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number
    enabled?: boolean
    onError?: (error: any) => void
  } = {}
) => {
  const { ttl, enabled = true, onError } = options

  const getCachedData = (): T | null => {
    if (!enabled) return null
    return cacheManager.get<T>(key)
  }

  const setCachedData = (data: T): void => {
    if (!enabled) return
    cacheManager.set(key, data, { ttl })
  }

  const invalidateCache = (): void => {
    cacheManager.delete(key)
  }

  const refreshCache = async (): Promise<T | null> => {
    try {
      const data = await fetcher()
      setCachedData(data)
      return data
    } catch (error) {
      onError?.(error)
      return null
    }
  }

  return {
    getCachedData,
    setCachedData,
    invalidateCache,
    refreshCache,
    hasCachedData: () => cacheManager.has(key)
  }
}
