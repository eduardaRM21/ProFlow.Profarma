import { createClient } from '@supabase/supabase-js'

// Verificar variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ehqxboqxtubeumaupjeq.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVocXhib3F4dHViZXVtYXVwamVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzcyODQsImV4cCI6MjA3NDMxMzI4NH0.Er0IuDQeEtJ6AzFua_BAPFkcG_rmgg35QgdF0gpfwWw'

console.log('🔧 Configuração do Supabase:', { url: supabaseUrl, key: supabaseKey ? '***' : 'undefined' })

// Circuit Breaker para prevenir falhas em cascata
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  private readonly failureThreshold = 3
  private readonly timeout = 60000 // 60 segundos
  private readonly resetTimeout = 300000 // 5 minutos

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN'
      console.warn('⚠️ Circuit breaker opened due to repeated failures')
    }
  }

  getState(): string {
    return this.state
  }
}

// Instância global do circuit breaker
const circuitBreaker = new CircuitBreaker()

// Cliente Supabase com configurações otimizadas
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const getSupabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        },
        global: {
          headers: {
            'X-Client-Info': 'profarma-system',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      }
    )
  }
  return supabaseInstance
}

// Função para testar conectividade com timeout reduzido
export const testSupabaseConnection = async (): Promise<boolean> => {
  return circuitBreaker.execute(async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const { error } = await getSupabase()
        .from('sessions')
        .select('count')
        .limit(1)
        .abortSignal(controller.signal)

      clearTimeout(timeoutId)

      if (error) {
        // Ignorar erros específicos que não indicam falha de conectividade
        if (error.code === '20' || error.message?.includes('AbortError')) {
          console.warn('⚠️ Requisição abortada ou timeout - não é falha de conectividade')
          return true // Considerar conectado se foi apenas timeout
        }
        
        console.error('❌ Falha ao testar conexão com o banco:', error)
        return false
      }
      return true
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.code === '20') {
        console.warn('⚠️ Timeout ao testar conexão (10s) - não é falha de conectividade')
        return true // Considerar conectado se foi apenas timeout
      } else {
        console.error('❌ Erro ao testar conexão:', err)
        return false
      }
    }
  })
}

// Função para garantir conexão antes de operações críticas
export const ensureSupabaseConnection = async (): Promise<boolean> => {
  const isConnected = await testSupabaseConnection()
  if (!isConnected) {
    console.warn('⚠️ Sem conectividade com Supabase, usando fallback local')
  }
  return isConnected
}

// Retry com backoff exponencial
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await circuitBreaker.execute(fn)
    } catch (error) {
      lastError = error
      
      if (attempt === maxRetries) {
        throw error
      }

      const delay = baseDelay * Math.pow(2, attempt)
      console.warn(`⚠️ Tentativa ${attempt + 1} falhou, tentando novamente em ${delay}ms...`)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// Retry com backoff exponencial e timeout específico
export const retryWithBackoffAndTimeout = async <T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout: Operação demorou mais de ${timeoutMs}ms`)), timeoutMs)
  })

  const retryPromise = retryWithBackoff(fn, maxRetries, baseDelay)

  return Promise.race([retryPromise, timeoutPromise])
}

// Função para limpar conexões pendentes
export const cleanupSupabaseConnections = () => {
  if (supabaseInstance) {
    // Limpar listeners e conexões
    supabaseInstance.removeAllChannels()
    supabaseInstance = null
  }
}

// Monitor de saúde da conexão
export const getConnectionHealth = () => {
  return {
    circuitBreakerState: circuitBreaker.getState(),
    supabaseInstance: !!supabaseInstance
  }
} 