/**
 * Hook robusto para operações com notas bipadas
 * 
 * Este hook implementa retry automático e tratamento de erros
 * para resolver problemas intermitentes como o erro 406
 */

import { useState, useCallback } from 'react'
import { NotasBipadasService, NotaBipada } from '@/lib/notas-bipadas-service'
import { ErrorHandler } from '@/lib/error-handler'

export function useNotasBipadasRobust() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const notasBipadasService = NotasBipadasService.getInstance()

  /**
   * Salva uma nota bipada com retry automático
   */
  const salvarNotaBipada = useCallback(async (nota: NotaBipada): Promise<string | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const id = await ErrorHandler.withRetry(
        () => notasBipadasService.salvarNotaBipada(nota),
        {
          retryCondition: (error) => ErrorHandler.isRetryableError(error)
        }
      )
      
      console.log('✅ Nota bipada salva com sucesso:', id)
      return id
    } catch (error: any) {
      const userMessage = ErrorHandler.handleSupabaseError(error, 'Salvar nota bipada')
      setError(userMessage)
      console.error('❌ Erro ao salvar nota bipada:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [notasBipadasService])

  /**
   * Busca notas bipadas com retry automático
   */
  const buscarNotasBipadas = useCallback(async (filtros?: {
    area_origem?: string
    data?: string
    turno?: string
    numero_nf?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<NotaBipada[]> => {
    setIsLoading(true)
    setError(null)

    try {
      const notas = await ErrorHandler.withRetry(
        () => notasBipadasService.buscarNotasBipadas(filtros),
        {
          retryCondition: (error) => ErrorHandler.isRetryableError(error)
        }
      )
      
      console.log('✅ Notas bipadas carregadas:', notas.length)
      return notas
    } catch (error: any) {
      const userMessage = ErrorHandler.handleSupabaseError(error, 'Buscar notas bipadas')
      setError(userMessage)
      console.error('❌ Erro ao buscar notas bipadas:', error)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [notasBipadasService])

  /**
   * Busca uma nota específica por NF com retry automático
   */
  const buscarNotaPorNF = useCallback(async (numeroNF: string): Promise<NotaBipada[]> => {
    setIsLoading(true)
    setError(null)

    try {
      const notas = await ErrorHandler.withRetry(
        () => notasBipadasService.buscarNotaPorNF(numeroNF),
        {
          retryCondition: (error) => ErrorHandler.isRetryableError(error)
        }
      )
      
      console.log(`✅ Nota ${numeroNF} encontrada:`, notas.length, 'ocorrências')
      return notas
    } catch (error: any) {
      const userMessage = ErrorHandler.handleSupabaseError(error, 'Buscar nota por NF')
      setError(userMessage)
      console.error('❌ Erro ao buscar nota por NF:', error)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [notasBipadasService])

  /**
   * Valida se uma NF foi processada no recebimento com retry automático
   */
  const validarNFRecebimento = useCallback(async (
    numeroNF: string, 
    data?: string, 
    turno?: string
  ): Promise<{ valida: boolean; motivo?: string; notaRecebimento?: any }> => {
    setIsLoading(true)
    setError(null)

    try {
      const resultado = await ErrorHandler.withRetry(
        () => notasBipadasService.validarNFRecebimento(numeroNF, data, turno),
        {
          retryCondition: (error) => ErrorHandler.isRetryableError(error)
        }
      )
      
      console.log(`✅ Validação NF ${numeroNF}:`, resultado.valida ? 'VÁLIDA' : 'INVÁLIDA')
      return resultado
    } catch (error: any) {
      const userMessage = ErrorHandler.handleSupabaseError(error, 'Validar NF no recebimento')
      setError(userMessage)
      console.error('❌ Erro ao validar NF no recebimento:', error)
      return {
        valida: false,
        motivo: userMessage
      }
    } finally {
      setIsLoading(false)
    }
  }, [notasBipadasService])

  /**
   * Atualiza o status de uma nota com retry automático
   */
  const atualizarStatus = useCallback(async (
    id: string, 
    novoStatus: string, 
    observacoes?: string
  ): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      await ErrorHandler.withRetry(
        () => notasBipadasService.atualizarStatus(id, novoStatus, observacoes),
        {
          retryCondition: (error) => ErrorHandler.isRetryableError(error)
        }
      )
      
      console.log('✅ Status da nota atualizado:', id, '->', novoStatus)
      return true
    } catch (error: any) {
      const userMessage = ErrorHandler.handleSupabaseError(error, 'Atualizar status da nota')
      setError(userMessage)
      console.error('❌ Erro ao atualizar status da nota:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [notasBipadasService])

  /**
   * Limpa o erro atual
   */
  const limparErro = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Verifica se um erro é retryable
   */
  const isRetryableError = useCallback((error: any): boolean => {
    return ErrorHandler.isRetryableError(error)
  }, [])

  return {
    // Estados
    isLoading,
    error,
    
    // Funções principais
    salvarNotaBipada,
    buscarNotasBipadas,
    buscarNotaPorNF,
    validarNFRecebimento,
    atualizarStatus,
    
    // Utilitários
    limparErro,
    isRetryableError
  }
}
