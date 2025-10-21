/**
 * Sistema de tratamento de erros robusto para o ProFlow
 * 
 * Este módulo implementa retry automático e tratamento de erros
 * para resolver problemas intermitentes como o erro 406
 */

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryCondition?: (error: any) => boolean
}

export class ErrorHandler {
  private static defaultOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000, // 1 segundo
    maxDelay: 10000, // 10 segundos
    backoffMultiplier: 2,
    retryCondition: (error: any) => {
      // Retry para erros de rede, timeout e 406
      return (
        error?.code === 'NETWORK_ERROR' ||
        error?.code === 'TIMEOUT' ||
        error?.status === 406 ||
        error?.status === 408 ||
        error?.status === 429 ||
        error?.status === 500 ||
        error?.status === 502 ||
        error?.status === 503 ||
        error?.status === 504
      )
    }
  }

  /**
   * Executa uma função com retry automático
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options }
    let lastError: any

    for (let attempt = 0; attempt <= opts.maxRetries!; attempt++) {
      try {
        const result = await fn()
        
        if (attempt > 0) {
          console.log(`✅ Operação bem-sucedida após ${attempt} tentativas`)
        }
        
        return result
      } catch (error: any) {
        lastError = error
        
        // Se não é a última tentativa e o erro é retryable
        if (attempt < opts.maxRetries! && opts.retryCondition!(error)) {
          const delay = Math.min(
            opts.baseDelay! * Math.pow(opts.backoffMultiplier!, attempt),
            opts.maxDelay!
          )
          
          console.warn(
            `⚠️ Tentativa ${attempt + 1} falhou (${error?.status || error?.code || 'erro desconhecido'}). ` +
            `Tentando novamente em ${delay}ms...`
          )
          
          await this.sleep(delay)
          continue
        }
        
        // Se não é retryable ou esgotaram as tentativas
        break
      }
    }
    
    console.error(`❌ Operação falhou após ${opts.maxRetries! + 1} tentativas:`, lastError)
    throw lastError
  }

  /**
   * Trata erros específicos do Supabase
   */
  static handleSupabaseError(error: any, context: string = 'Operação'): string {
    if (!error) return 'Erro desconhecido'

    // Erro 406 - Not Acceptable
    if (error.status === 406) {
      console.warn(`⚠️ Erro 406 em ${context}:`, error)
      return 'Erro temporário de comunicação. Tente novamente em alguns segundos.'
    }

    // Erro de rede
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch')) {
      console.warn(`⚠️ Erro de rede em ${context}:`, error)
      return 'Problema de conexão. Verifique sua internet e tente novamente.'
    }

    // Erro de timeout
    if (error.code === 'TIMEOUT' || error.status === 408) {
      console.warn(`⚠️ Timeout em ${context}:`, error)
      return 'Operação demorou muito para responder. Tente novamente.'
    }

    // Erro de rate limit
    if (error.status === 429) {
      console.warn(`⚠️ Rate limit em ${context}:`, error)
      return 'Muitas requisições. Aguarde um momento e tente novamente.'
    }

    // Erro de servidor
    if (error.status >= 500) {
      console.warn(`⚠️ Erro de servidor em ${context}:`, error)
      return 'Problema temporário no servidor. Tente novamente em alguns minutos.'
    }

    // Erro de permissão
    if (error.status === 403) {
      console.warn(`⚠️ Erro de permissão em ${context}:`, error)
      return 'Sem permissão para realizar esta operação.'
    }

    // Erro de dados não encontrados
    if (error.status === 404) {
      console.warn(`⚠️ Dados não encontrados em ${context}:`, error)
      return 'Dados não encontrados.'
    }

    // Erro genérico
    console.error(`❌ Erro em ${context}:`, error)
    return error.message || 'Erro inesperado. Tente novamente.'
  }

  /**
   * Verifica se um erro é temporário e pode ser retryado
   */
  static isRetryableError(error: any): boolean {
    if (!error) return false

    return (
      error.code === 'NETWORK_ERROR' ||
      error.code === 'TIMEOUT' ||
      error.status === 406 ||
      error.status === 408 ||
      error.status === 429 ||
      error.status === 500 ||
      error.status === 502 ||
      error.status === 503 ||
      error.status === 504
    )
  }

  /**
   * Função auxiliar para sleep
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Cria um wrapper para funções do Supabase com retry automático
   */
  static createSupabaseWrapper<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context: string = 'Operação'
  ): T {
    return (async (...args: any[]) => {
      try {
        return await this.withRetry(
          () => fn(...args),
          {
            retryCondition: (error) => this.isRetryableError(error)
          }
        )
      } catch (error) {
        const userMessage = this.handleSupabaseError(error, context)
        throw new Error(userMessage)
      }
    }) as T
  }
}

/**
 * Hook para usar o ErrorHandler em componentes React
 */
export function useErrorHandler() {
  const handleError = (error: any, context: string = 'Operação') => {
    const userMessage = ErrorHandler.handleSupabaseError(error, context)
    console.error(`❌ Erro em ${context}:`, error)
    return userMessage
  }

  const withRetry = <T>(fn: () => Promise<T>, context: string = 'Operação') => {
    return ErrorHandler.withRetry(fn, {
      retryCondition: (error) => ErrorHandler.isRetryableError(error)
    })
  }

  return {
    handleError,
    withRetry,
    isRetryableError: ErrorHandler.isRetryableError
  }
}
