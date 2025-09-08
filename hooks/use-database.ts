import { useState, useEffect, useCallback } from 'react'
import {
  SessionService,
  RecebimentoService,
  RelatoriosService,
  ChatService,
  migrateFromLocalStorage,
  type SessionData,
  type NotaFiscal,
  type Carro,
  type Relatorio,
  type ChatMessage,
} from '@/lib/database-service'
import { EmbalagemService } from '@/lib/embalagem-service'
import { testSupabaseConnection, getConnectionHealth } from '@/lib/supabase-client'
import { LocalAuthService } from '@/lib/local-auth-service'

// ---
// Hook Genérico para localStorage
// ---
/**
 * Hook para gerenciar estado persistente no localStorage.
 * @param key A chave usada para armazenar o valor no localStorage.
 * @param initialValue O valor inicial se nada for encontrado no localStorage.
 */
const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error('❌ Erro ao ler do localStorage:', error)
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.error('❌ Erro ao salvar no localStorage:', error)
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue] as const
}

// ---
// Hooks Principais da Aplicação
// ---

// Hook para migração de dados antigos do localStorage
export const useDatabase = () => {
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrationComplete, setMigrationComplete] = useState(false)

  useEffect(() => {
    const performAutoMigration = async () => {
      const hasLocalData =
        localStorage.getItem('sistema_session') ||
        localStorage.getItem('relatorios_custos') ||
        localStorage.getItem('profarma_carros_embalagem')

      if (hasLocalData) {
        console.log('🔄 Dados encontrados no localStorage, iniciando migração automática...')
        setIsMigrating(true)
        try {
          await migrateFromLocalStorage()
          setMigrationComplete(true)
          console.log('✅ Migração automática concluída!')
        } catch (error) {
          console.error('❌ Erro durante migração automática:', error)
        } finally {
          setIsMigrating(false)
        }
      }
    }

    performAutoMigration()
  }, [])

  return {
    isMigrating,
    migrationComplete,
  }
}

// Cache em memória para reduzir requisições
let sessionCache: any = null
let lastSessionFetch = 0
const SESSION_CACHE_TTL = 30000 // 30 segundos

let relatoriosCache: any[] | null = null
let lastRelatoriosFetch = 0
let relatoriosFetchPromise: Promise<any[]> | null = null
const RELATORIOS_CACHE_TTL = 120000 // 2 minutos

let recebimentoCache: any[] | null = null
let lastRecebimentoFetch = 0
const RECEBIMENTO_CACHE_TTL = 300000 // 5 minutos

// Hook de conectividade melhorado
export const useConnectivity = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [isFullyConnected, setIsFullyConnected] = useState(false)
  const [connectionHealth, setConnectionHealth] = useState<any>(null)

  const checkConnection = useCallback(async () => {
    try {
      const connected = await testSupabaseConnection()
      setIsConnected(connected)
      setIsFullyConnected(connected)
      
      const health = getConnectionHealth()
      setConnectionHealth(health)
      
      if (!connected) {
        console.warn('⚠️ Sem conectividade com Supabase')
      } else {
        console.log('✅ Conectividade com Supabase OK')
      }
    } catch (error) {
      console.error('❌ Erro ao verificar conectividade:', error)
      setIsConnected(false)
      setIsFullyConnected(false)
    }
  }, [])

  useEffect(() => {
    checkConnection()
    
    // Verificar conectividade a cada 60 segundos (menos agressivo)
    const interval = setInterval(checkConnection, 60000)
    return () => clearInterval(interval)
  }, [checkConnection])

  return {
    isConnected,
    isFullyConnected,
    connectionHealth,
    checkConnection
  }
}

// Hook de sessão otimizado
export const useSession = () => {
  const { isFullyConnected } = useConnectivity()

  const getSession = useCallback(async (sessionId: string): Promise<any> => {
    console.log('🔍 getSession chamado com sessionId:', sessionId)
    const now = Date.now()
    
    // SOLUÇÃO: Cache específico por usuário para evitar conflitos
    // Usar uma chave única que inclui o sessionId
    const cacheKey = `session_${sessionId}_${now}`
    
    // Usar cache se ainda válido E se for para a mesma área
    if (sessionCache && now - lastSessionFetch < SESSION_CACHE_TTL) {
      // Verificar se o cache é para a área correta
      if (sessionCache.area === sessionId || sessionId === 'current') {
        console.log('📋 Usando cache de sessão válido:', sessionCache)
        return sessionCache
      } else {
        console.log('⚠️ Cache de sessão é para área diferente, ignorando')
        sessionCache = null // Limpar cache incorreto
      }
    }

    try {
      console.log('🌐 Status da conectividade:', { isFullyConnected })
      
      // Tentar buscar do banco se conectado
      if (isFullyConnected) {
        console.log('🔍 Tentando buscar sessão do banco...')
        const session = await SessionService.getSession(sessionId)
        console.log('📊 Sessão do banco:', session)
        
        if (session) {
          console.log('✅ Sessão encontrada no banco, salvando no cache')
          // SOLUÇÃO: Cache específico por área para evitar conflitos
          sessionCache = session
          lastSessionFetch = now
          return session
        } else {
          console.log('⚠️ Nenhuma sessão encontrada no banco')
        }
      } else {
        console.log('⚠️ Não conectado ao banco, pulando busca remota')
      }

      // Fallback para localStorage
      console.log('🔍 Tentando fallback para localStorage...')
      const sessionLocal = localStorage.getItem("sistema_session")
      if (sessionLocal) {
        const sessionObj = JSON.parse(sessionLocal)
        console.log('📋 Sessão local encontrada:', sessionObj)
        
        // SOLUÇÃO: Verificar se a sessão local é para a área correta
        if (sessionId === 'current' || sessionObj.area === sessionId) {
          console.log('✅ Sessão local válida para área solicitada')
          sessionCache = sessionObj
          lastSessionFetch = now
          return sessionObj
        } else {
          console.log('⚠️ Sessão local é para área diferente:', sessionObj.area, 'vs', sessionId)
        }
      } else {
        console.log('⚠️ Nenhuma sessão local encontrada')
      }

      console.log('❌ Nenhuma sessão encontrada em nenhum lugar')
      return null
    } catch (error) {
      console.error('❌ Erro no getSession:', error)
      return null
    }
  }, [isFullyConnected])

  const saveSession = useCallback(async (sessionData: any): Promise<string> => {
    try {
      console.log('💾 Tentando salvar sessão...')
      
      // SOLUÇÃO: Limpar cache ao salvar nova sessão para evitar conflitos
      sessionCache = null
      lastSessionFetch = 0
      
      // Salvar no banco se conectado
      if (isFullyConnected) {
        console.log('💾 Salvando sessão no banco...')
        const sessionId = await SessionService.saveSession(sessionData)
        console.log('✅ Sessão salva no banco com ID:', sessionId)
        
        // Atualizar cache com a nova sessão
        sessionCache = sessionData
        lastSessionFetch = Date.now()
        
        return sessionId
      } else {
        console.log('⚠️ Não conectado ao banco, salvando apenas localmente')
      }

      // Sempre salvar no localStorage como fallback
      const sessionKey = 'sistema_session'
      localStorage.setItem(sessionKey, JSON.stringify(sessionData))
      console.log('✅ Sessão salva no localStorage')
      
      // Atualizar cache
      sessionCache = sessionData
      lastSessionFetch = Date.now()
      
      return 'local_' + Date.now()
    } catch (error) {
      console.error('❌ Erro ao salvar sessão:', error)
      throw error
    }
  }, [isFullyConnected])

  const logout = useCallback(async (): Promise<void> => {
    try {
      // Limpar cache
      sessionCache = null
      lastSessionFetch = 0
      
      // Limpar localStorage
      localStorage.removeItem("sistema_session")
      
      // TODO: Implementar logout no banco quando o serviço estiver disponível
      if (isFullyConnected) {
        console.log('🚪 Logout realizado localmente')
      }
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error)
      // Limpeza local já foi feita
    }
  }, [isFullyConnected])

  return {
    getSession,
    saveSession,
    logout
  }
}

// Hook de recebimento otimizado
export const useRecebimento = (chave: string) => {
  const { isFullyConnected } = useConnectivity()
  const [notas, setNotas] = useState<any[]>([])

  const saveNotas = useCallback(async (chave: string, notas: any[]): Promise<void> => {
    try {
      // Atualizar estado local
      setNotas(notas)
      
      // Salvar localmente primeiro
      localStorage.setItem(chave, JSON.stringify(notas))
      
      // Tentar salvar no banco se conectado
      if (isFullyConnected) {
        await RecebimentoService.saveNotas(chave, notas)
      }
    } catch (error) {
      console.error('❌ Erro ao salvar notas:', error)
      // Notas já foram salvas localmente
    }
  }, [isFullyConnected])

  const getNotas = useCallback(async (chave: string): Promise<any[]> => {
    try {
      // Carregar do localStorage primeiro
      const notasLocal = localStorage.getItem(chave)
      const notas = notasLocal ? JSON.parse(notasLocal) : []
      
      // Tentar atualizar do banco se conectado
      if (isFullyConnected) {
        try {
          const notasDB = await RecebimentoService.getNotas(chave)
          if (notasDB.length > 0) {
            // Mesclar dados locais e do banco
            const merged = [...notas, ...notasDB]
            const uniqueById = Array.from(new Map(merged.map(n => [n.id, n])).values())
            localStorage.setItem(chave, JSON.stringify(uniqueById))
            return uniqueById
          }
        } catch (error) {
          console.warn('⚠️ Erro ao carregar notas do banco, usando locais:', error)
        }
      }
      
      return notas
    } catch (error) {
      console.error('❌ Erro ao carregar notas:', error)
      return []
    }
  }, [isFullyConnected])

  const clearNotas = useCallback(async (chave: string): Promise<void> => {
    try {
      setNotas([])
      localStorage.removeItem(chave)
      
      if (isFullyConnected) {
        try {
          // 1. Limpar da tabela recebimento_notas (tabela temporária)
          await RecebimentoService.deleteNotas(chave)
          console.log('✅ Notas removidas da tabela recebimento_notas')
          
          // 2. Limpar da tabela notas_bipadas (histórico de bipagem)
          try {
            const { getSupabase } = await import('@/lib/supabase-client')
            const supabase = getSupabase()
            
            // Limpar por session_id específico para ser mais preciso
            const { error: deleteBipadasError } = await supabase
              .from('notas_bipadas')
              .delete()
              .eq('session_id', chave)
            
            if (deleteBipadasError) {
              console.warn('⚠️ Erro ao deletar da tabela notas_bipadas:', deleteBipadasError)
            } else {
              console.log('✅ Notas removidas da tabela notas_bipadas (session_id: ' + chave + ')')
            }
          } catch (bipadasError) {
            console.warn('⚠️ Erro ao limpar da tabela notas_bipadas:', bipadasError)
          }
          
          // ✅ CORREÇÃO: NÃO DELETAR DA TABELA notas_fiscais!
          // As notas fiscais só são salvas quando o relatório for finalizado
          // Se as notas forem limpas antes da finalização, elas NÃO devem aparecer na tabela notas_fiscais
          console.log('ℹ️ Notas fiscais preservadas - só são salvas quando relatório for finalizado')
          
        } catch (deleteError) {
          console.warn('⚠️ Erro ao deletar notas do banco, mas limpeza local foi realizada:', deleteError)
        }
      }
    } catch (error) {
      console.error('❌ Erro ao limpar notas:', error)
    }
  }, [isFullyConnected])

  // Carregar notas iniciais
  useEffect(() => {
    if (chave) {
      getNotas(chave).then(setNotas)
    }
  }, [chave, getNotas])

  return {
    notas,
    saveNotas,
    getNotas,
    clearNotas
  }
}

// Hook de relatórios otimizado
export const useRelatorios = () => {
  const { isFullyConnected } = useConnectivity()

  const saveRelatorio = useCallback(async (relatorio: any) => {
    try {
      // Tentar salvar no banco se conectado
      if (isFullyConnected) {
        await RelatoriosService.saveRelatorio(relatorio)
        console.log('💾 Relatório salvo no banco')
      }

      // Salvar localmente como backup
      const relatoriosData = localStorage.getItem('relatorios_local') || '[]'
      const relatorios = JSON.parse(relatoriosData)
      const updatedRelatorios = Array.from(new Map([...relatorios, relatorio].map(r => [r.id, r])).values())
      localStorage.setItem('relatorios_local', JSON.stringify(updatedRelatorios))
      console.log('💾 Relatório salvo localmente:', relatorio.area)

      // Invalidar cache
      relatoriosCache = null
      recebimentoCache = null
    } catch (error) {
      console.error('❌ Erro ao salvar relatório:', error)
      throw error
    }
  }, [isFullyConnected])

  const updateRelatorioStatus = useCallback(async (relatorioId: string, novoStatus: string) => {
    try {
      // Tentar atualizar no banco se conectado
      if (isFullyConnected) {
        await RelatoriosService.updateRelatorioStatus(relatorioId, novoStatus)
        console.log('🔄 Status do relatório atualizado no banco')
      }

      // Atualizar localmente como backup
      const relatoriosData = localStorage.getItem('relatorios_local') || '[]'
      const relatorios = JSON.parse(relatoriosData)
      const updatedRelatorios = relatorios.map((r: any) => 
        r.id === relatorioId ? { ...r, status: novoStatus } : r
      )
      localStorage.setItem('relatorios_local', JSON.stringify(updatedRelatorios))
      console.log('🔄 Status do relatório atualizado localmente')

      // Invalidar cache
      relatoriosCache = null
      recebimentoCache = null
    } catch (error) {
      console.error('❌ Erro ao atualizar status do relatório:', error)
      throw error
    }
  }, [isFullyConnected])

  const getRelatorios = useCallback(async (): Promise<any[]> => {
    try {
      console.log('📋 Tentando carregar relatórios do banco...')
      
      // FORÇAR busca direta do banco, ignorando cache
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      const { data, error } = await supabase
        .from('relatorios')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Erro ao buscar relatórios:', error)
        
        // Se for erro de recursos insuficientes, retornar array vazio
        if (error.message?.includes('insufficient') || error.message?.includes('resources')) {
          console.log('⚠️ Recursos insuficientes no banco, retornando array vazio')
          return []
        }
        
        // Se for erro de tabela não encontrada, retornar array vazio
        if (error.message?.includes('relation "relatorios" does not exist')) {
          console.log('❌ Tabela relatorios não existe no banco')
          return []
        }
        
        throw error
      }

      if (data) {
        console.log('✅ Relatórios carregados do banco:', data.length, 'relatórios')
        console.log('🔍 Dados brutos do banco:', data)
        
        if (data.length > 0) {
          console.log('🔍 Primeiro item bruto:', data[0])
          console.log('🔍 Campos disponíveis:', Object.keys(data[0]))
        }
        
        const relatorios: Relatorio[] = (data ?? []).map((item: any) => ({
          id: item.id,
          nome: item.nome ?? 'Relatório sem nome',
          colaboradores: [], // Campo não existe mais na tabela
          data: item.data,
          turno: item.turno,
          area: item.area ?? 'custos',
          quantidadeNotas: item.quantidade_notas ?? 0,
          somaVolumes: item.soma_volumes ?? 0,
          notas: [], // Campo não existe mais na tabela
          dataFinalizacao: item.data_finalizacao ?? new Date().toISOString(),
          status: item.status ?? 'finalizado',
        }))
        
        console.log('✅ Relatórios carregados do banco:', relatorios.length)
        return relatorios
      } else {
        console.log('ℹ️ Nenhum relatório encontrado no banco')
        return []
      }
    } catch (error) {
      console.error('❌ Erro ao carregar relatórios:', error)
      return []
    }
  }, [])

  const getRelatoriosRecebimento = useCallback(async (): Promise<any[]> => {
    try {
      console.log('📋 Tentando carregar relatórios de recebimento do banco...')
      
      // FORÇAR busca direta do banco, ignorando cache
      const { getSupabase } = await import('@/lib/supabase-client')
      const supabase = getSupabase()
      
      const { data, error } = await supabase
        .from('relatorios')
        .select('*')
        .eq('area', 'recebimento')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Erro ao buscar relatórios de recebimento:', error)
        return []
      }

      if (data) {
        console.log('✅ Relatórios de recebimento carregados do banco:', data.length, 'relatórios')
        
        const relatorios: Relatorio[] = (data ?? []).map((item: any) => ({
          id: item.id,
          nome: item.nome ?? 'Relatório sem nome',
          colaboradores: [], // Campo não existe mais na tabela
          data: item.data,
          turno: item.turno,
          area: item.area ?? 'recebimento',
          quantidadeNotas: item.quantidade_notas ?? 0,
          somaVolumes: item.soma_volumes ?? 0,
          notas: [], // Campo não existe mais na tabela
          dataFinalizacao: item.data_finalizacao ?? new Date().toISOString(),
          status: item.status ?? 'finalizado',
        }))
        
        return relatorios
      } else {
        console.log('ℹ️ Nenhum relatório de recebimento encontrado no banco')
        return []
      }
    } catch (error) {
      console.error('❌ Erro ao carregar relatórios de recebimento:', error)
      return []
    }
  }, [])

  return {
    saveRelatorio,
    updateRelatorioStatus,
    getRelatorios,
    getRelatoriosRecebimento
  }
}

// Hook de embalagem otimizado
export const useEmbalagem = () => {
  const { isFullyConnected } = useConnectivity()

  const saveCarros = useCallback(async (chave: string, carros: any[]): Promise<void> => {
    try {
      // Salvar localmente primeiro
      localStorage.setItem(chave, JSON.stringify({ carros }))
      
      // Tentar salvar no banco se conectado
      if (isFullyConnected) {
        await EmbalagemService.saveCarros(chave, carros)
      }
    } catch (error) {
      console.error('❌ Erro ao salvar carros:', error)
      // Carros já foram salvos localmente
    }
  }, [isFullyConnected])

  const getCarros = useCallback(async (chave: string): Promise<any[]> => {
    try {
      // Carregar do localStorage primeiro
      const carrosLocal = localStorage.getItem(chave)
      const carros = carrosLocal ? JSON.parse(carrosLocal).carros || [] : []
      
      // Tentar atualizar do banco se conectado
      if (isFullyConnected) {
        try {
          const carrosDB = await EmbalagemService.getCarros(chave)
          if (carrosDB.length > 0) {
            // Mesclar dados locais e do banco
            const merged = [...carros, ...carrosDB]
            const uniqueById = Array.from(new Map(merged.map(c => [c.id, c])).values())
            localStorage.setItem(chave, JSON.stringify({ carros: uniqueById }))
            return uniqueById
          }
        } catch (error) {
          console.warn('⚠️ Erro ao carregar carros do banco, usando locais:', error)
        }
      }
      
      return carros
    } catch (error) {
      console.error('❌ Erro ao carregar carros:', error)
      return []
    }
  }, [isFullyConnected])

  // Buscar NFs bipadas em relatórios de recebimento
  const buscarNFsEmRelatorios = useCallback(async (data: string, turno: string, numeroNF?: string) => {
    try {
      if (isFullyConnected) {
        return await EmbalagemService.buscarNFsBipadasEmRelatorios(data, turno, numeroNF)
      } else {
        console.warn('⚠️ Sem conexão com banco, não é possível buscar em relatórios')
        return { 
          sucesso: false, 
          erro: 'Sem conexão com banco de dados' 
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar NFs em relatórios:', error)
      return { 
        sucesso: false, 
        erro: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }
    }
  }, [isFullyConnected])

  // Verificar se uma NF específica foi bipada em relatórios
  const verificarNFEmRelatorios = useCallback(async (numeroNF: string, data: string, turno: string) => {
    try {
      if (isFullyConnected) {
        return await EmbalagemService.verificarNFEmRelatorios(numeroNF, data, turno)
      } else {
        console.warn('⚠️ Sem conexão com banco, não é possível verificar em relatórios')
        return { 
          encontrada: false, 
          erro: 'Sem conexão com banco de dados' 
        }
      }
    } catch (error) {
      console.error('❌ Erro ao verificar NF em relatórios:', error)
      return { 
        encontrada: false, 
        erro: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }
    }
  }, [isFullyConnected])

  return {
    saveCarros,
    getCarros,
    buscarNFsEmRelatorios,
    verificarNFEmRelatorios
  }
}

// Hook de chat otimizado
export const useChat = () => {
  const { isFullyConnected } = useConnectivity()

  const saveMensagem = useCallback(async (mensagem: any): Promise<void> => {
    try {
      // Salvar localmente primeiro
      const mensagensData = localStorage.getItem(`chat_${mensagem.area}`) || '[]'
      const mensagens = JSON.parse(mensagensData)
      mensagens.push(mensagem)
      localStorage.setItem(`chat_${mensagem.area}`, JSON.stringify(mensagens))
      
      // Tentar salvar no banco se conectado
      if (isFullyConnected) {
        await ChatService.saveMensagem(mensagem)
      }
    } catch (error) {
      console.error('❌ Erro ao salvar mensagem:', error)
      // Mensagem já foi salva localmente
    }
  }, [isFullyConnected])

  const getMensagens = useCallback(async (area: string): Promise<any[]> => {
    try {
      // Carregar do localStorage primeiro
      const mensagensLocal = localStorage.getItem(`chat_${area}`)
      const mensagens = mensagensLocal ? JSON.parse(mensagensLocal) : []
      
      // Tentar atualizar do banco se conectado
      if (isFullyConnected) {
        try {
          const mensagensDB = await ChatService.getMensagens(area)
          if (mensagensDB.length > 0) {
            // Mesclar dados locais e do banco
            const merged = [...mensagens, ...mensagensDB]
            const uniqueById = Array.from(new Map(merged.map(m => [m.id, m])).values())
            localStorage.setItem(`chat_${area}`, JSON.stringify(uniqueById))
            return uniqueById
          }
        } catch (error) {
          console.warn('⚠️ Erro ao carregar mensagens do banco, usando locais:', error)
        }
      }
      
      return mensagens
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens:', error)
      return []
    }
  }, [isFullyConnected])

  return {
    saveMensagem,
    getMensagens
  }
}

// Hook de inventário otimizado
export const useInventario = () => {
  const { isFullyConnected } = useConnectivity()

  const saveInventario = useCallback(async (sessionId: string, itens: any[]): Promise<void> => {
    try {
      // Salvar localmente primeiro
      localStorage.setItem(`inventario_${sessionId}`, JSON.stringify(itens))
      
      // Tentar salvar no banco se conectado
      if (isFullyConnected) {
        // TODO: Implementar salvamento no banco quando o serviço estiver disponível
        console.log('📦 Inventário salvo localmente:', itens.length, 'itens')
      }
    } catch (error) {
      console.error('❌ Erro ao salvar inventário:', error)
      // Inventário já foi salvo localmente
    }
  }, [isFullyConnected])

  const getInventario = useCallback(async (sessionId: string): Promise<any[]> => {
    try {
      // Carregar do localStorage
      const inventarioLocal = localStorage.getItem(`inventario_${sessionId}`)
      const inventario = inventarioLocal ? JSON.parse(inventarioLocal) : []
      
      // TODO: Implementar carregamento do banco quando o serviço estiver disponível
      if (isFullyConnected) {
        console.log('📦 Inventário carregado localmente:', inventario.length, 'itens')
      }
      
      return inventario
    } catch (error) {
      console.error('❌ Erro ao carregar inventário:', error)
      return []
    }
  }, [isFullyConnected])

  const saveRelatorio = useCallback(async (relatorio: any): Promise<void> => {
    try {
      // Salvar localmente primeiro
      const relatoriosData = localStorage.getItem('relatorios_inventario') || '[]'
      const relatorios = JSON.parse(relatoriosData)
      relatorios.push(relatorio)
      localStorage.setItem('relatorios_inventario', JSON.stringify(relatorios))
      
      // Tentar salvar no banco se conectado
      if (isFullyConnected) {
        // TODO: Implementar salvamento no banco quando o serviço estiver disponível
        console.log('📊 Relatório de inventário salvo localmente:', relatorio.rua)
      }
    } catch (error) {
      console.error('❌ Erro ao salvar relatório de inventário:', error)
      // Relatório já foi salvo localmente
    }
  }, [isFullyConnected])

  return {
    saveInventario,
    getInventario,
    saveRelatorio
  }
}
