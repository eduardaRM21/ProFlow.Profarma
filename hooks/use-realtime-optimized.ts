import { useEffect, useRef, useState } from 'react'
import { getSupabase } from '@/lib/supabase-client'

// =====================================================
// TIPOS PARA REALTIME
// =====================================================

interface RealtimeSubscription {
  channel: any
  isConnected: boolean
  lastUpdate: Date
}

interface RealtimeOptions {
  enabled?: boolean
  debounceMs?: number
  onUpdate?: (data: any) => void
  onError?: (error: any) => void
}

// =====================================================
// HOOK PRINCIPAL PARA REALTIME OTIMIZADO
// =====================================================

export const useRealtimeOptimized = (
  table: string,
  options: RealtimeOptions = {}
) => {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)
  
  const subscriptionRef = useRef<RealtimeSubscription | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = getSupabase()
  
  const {
    enabled = true,
    debounceMs = 1000, // Debounce de 1 segundo
    onUpdate,
    onError
  } = options

  useEffect(() => {
    if (!enabled) return

    // Limpar subscription anterior
    if (subscriptionRef.current?.channel) {
      subscriptionRef.current.channel.unsubscribe()
    }

    // Criar nova subscription
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table
        },
        (payload) => {
          // Debounce para evitar muitas atualizações
          if (debounceRef.current) {
            clearTimeout(debounceRef.current)
          }
          
          debounceRef.current = setTimeout(() => {
            setLastUpdate(new Date())
            onUpdate?.(payload)
          }, debounceMs)
        }
      )
      .subscribe((status) => {
        const connected = status === 'SUBSCRIBED'
        setIsConnected(connected)
        
        if (connected) {
          setError(null)
        } else {
          setError('Conexão com realtime perdida')
          onError?.(new Error('Conexão com realtime perdida'))
        }
      })

    subscriptionRef.current = {
      channel,
      isConnected: false,
      lastUpdate: new Date()
    }

    // Cleanup
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (subscriptionRef.current?.channel) {
        subscriptionRef.current.channel.unsubscribe()
      }
    }
  }, [table, enabled, debounceMs, onUpdate, onError])

  return {
    isConnected,
    lastUpdate,
    error,
    reconnect: () => {
      if (subscriptionRef.current?.channel) {
        subscriptionRef.current.channel.unsubscribe()
      }
      // Reconnect será feito automaticamente pelo useEffect
    }
  }
}

// =====================================================
// HOOKS ESPECÍFICOS PARA CADA TABELA
// =====================================================

// Hook para carros em tempo real
export const useCarrosRealtime = (onUpdate?: (data: any) => void) => {
  return useRealtimeOptimized('embalagem_notas_bipadas', {
    enabled: true,
    debounceMs: 2000, // 2 segundos para carros
    onUpdate: (payload) => {
      console.log('🔄 Carros atualizados via realtime:', payload)
      onUpdate?.(payload)
    },
    onError: (error) => {
      console.error('❌ Erro no realtime de carros:', error)
    }
  })
}

// Hook para divergências em tempo real
export const useDivergenciasRealtime = (onUpdate?: (data: any) => void) => {
  return useRealtimeOptimized('divergencias', {
    enabled: true,
    debounceMs: 3000, // 3 segundos para divergências
    onUpdate: (payload) => {
      console.log('🔄 Divergências atualizadas via realtime:', payload)
      onUpdate?.(payload)
    },
    onError: (error) => {
      console.error('❌ Erro no realtime de divergências:', error)
    }
  })
}

// Hook para relatórios em tempo real
export const useRelatoriosRealtime = (onUpdate?: (data: any) => void) => {
  return useRealtimeOptimized('relatorios', {
    enabled: true,
    debounceMs: 5000, // 5 segundos para relatórios
    onUpdate: (payload) => {
      console.log('🔄 Relatórios atualizados via realtime:', payload)
      onUpdate?.(payload)
    },
    onError: (error) => {
      console.error('❌ Erro no realtime de relatórios:', error)
    }
  })
}

// Hook para notas fiscais em tempo real
export const useNotasRealtime = (onUpdate?: (data: any) => void) => {
  return useRealtimeOptimized('notas_fiscais', {
    enabled: true,
    debounceMs: 1500, // 1.5 segundos para notas
    onUpdate: (payload) => {
      console.log('🔄 Notas atualizadas via realtime:', payload)
      onUpdate?.(payload)
    },
    onError: (error) => {
      console.error('❌ Erro no realtime de notas:', error)
    }
  })
}

// =====================================================
// HOOK PARA MÚLTIPLAS TABELAS
// =====================================================

export const useMultipleRealtime = (
  tables: string[],
  onUpdate?: (table: string, data: any) => void
) => {
  const [connections, setConnections] = useState<Record<string, boolean>>({})
  const [lastUpdates, setLastUpdates] = useState<Record<string, Date>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  useEffect(() => {
    const subscriptions: any[] = []

    tables.forEach(table => {
      const channel = getSupabase()
        .channel(`${table}_multi_changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table
          },
          (payload) => {
            setLastUpdates(prev => ({
              ...prev,
              [table]: new Date()
            }))
            onUpdate?.(table, payload)
          }
        )
        .subscribe((status) => {
          const connected = status === 'SUBSCRIBED'
          setConnections(prev => ({
            ...prev,
            [table]: connected
          }))
          
          if (!connected) {
            setErrors(prev => ({
              ...prev,
              [table]: 'Conexão perdida'
            }))
          } else {
            setErrors(prev => ({
              ...prev,
              [table]: null
            }))
          }
        })

      subscriptions.push(channel)
    })

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe())
    }
  }, [tables, onUpdate])

  return {
    connections,
    lastUpdates,
    errors,
    isAllConnected: Object.values(connections).every(Boolean),
    hasAnyError: Object.values(errors).some(Boolean)
  }
}

// =====================================================
// UTILITÁRIOS DE CONECTIVIDADE
// =====================================================

// Hook para monitorar conectividade geral
export const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastSeen, setLastSeen] = useState<Date>(new Date())

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setLastSeen(new Date())
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline,
    lastSeen,
    timeSinceLastSeen: new Date().getTime() - lastSeen.getTime()
  }
}
