import { getSupabase } from './supabase-client'

// =====================================================
// TIPOS DE DADOS CENTRALIZADOS
// =====================================================

export interface User {
  id: string
  nome: string
  email?: string
  area: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  user_id?: string
  area: string
  data: string
  turno: string
  login_time: string
  logout_time?: string
  status: string
  created_at: string
  updated_at: string
}

export interface NotaFiscal {
  id: string
  codigo_completo: string
  numero_nf: string
  data: string
  volumes: number
  destino?: string
  fornecedor?: string
  cliente_destino?: string
  tipo_carga?: string
  status: string
  session_id: string
  created_at: string
  updated_at: string
}

export interface Divergencia {
  id: string
  nota_fiscal_id: string
  tipo: string
  descricao?: string
  volumes_informados?: number
  volumes_reais?: number
  observacoes?: string
  created_at: string
}

export interface CarroEmbalagem {
  id: string
  nome: string
  destino_final?: string
  status: string
  session_id: string
  data_inicio: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface CarroItem {
  id: string
  carro_id: string
  nota_fiscal_id: string
  quantidade: number
  status: string
  created_at: string
}

export interface InventarioItem {
  id: string
  nota_fiscal_id: string
  rua: string
  quantidade: number
  session_id: string
  created_at: string
  updated_at: string
}

export interface Relatorio {
  id: string
  nome: string
  area: string
  data: string
  turno: string
  quantidade_notas: number
  soma_volumes: number
  status: string
  observacoes?: string
  data_finalizacao?: string
  data_lancamento?: string
  numero_lancamento?: string
  responsavel_lancamento?: string
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  user_id?: string
  action: string
  table_name?: string
  record_id?: string
  details?: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

// =====================================================
// SERVIÇO PRINCIPAL DE BANCO DE DADOS
// =====================================================

export class CentralizedDatabaseService {
  private static instance: CentralizedDatabaseService
  private supabase = getSupabase()
  private isConnected: boolean = false

  static getInstance(): CentralizedDatabaseService {
    if (!CentralizedDatabaseService.instance) {
      CentralizedDatabaseService.instance = new CentralizedDatabaseService()
    }
    return CentralizedDatabaseService.instance
  }

  // =====================================================
  // INICIALIZAÇÃO E CONEXÃO
  // =====================================================

  async initialize(): Promise<boolean> {
    try {
      // Testar conexão com o banco
      const { data, error } = await this.supabase
        .from('system_config')
        .select('key')
        .limit(1)

      if (error) {
        console.warn('⚠️ Erro ao conectar com banco centralizado:', error.message)
        this.isConnected = false
        return false
      }

      this.isConnected = true
      console.log('✅ Conectado ao banco de dados centralizado')
      return true
    } catch (error) {
      console.error('❌ Erro ao inicializar banco centralizado:', error)
      this.isConnected = false
      return false
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected
  }

  // =====================================================
  // SERVIÇO DE USUÁRIOS
  // =====================================================

  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('users')
      .insert([userData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getUserById(id: string): Promise<User | null> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return null
    return data
  }

  async getUsersByArea(area: string): Promise<User[]> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('area', area)
      .eq('ativo', true)

    if (error) throw error
    return data || []
  }

  // =====================================================
  // SERVIÇO DE SESSÕES
  // =====================================================

  async createSession(sessionData: Omit<Session, 'id' | 'created_at' | 'updated_at'>): Promise<Session> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('sessions')
      .insert([sessionData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getActiveSession(area: string, data: string, turno: string): Promise<Session | null> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data: sessionData, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('area', area)
      .eq('data', data)
      .eq('turno', turno)
      .eq('status', 'ativa')
      .single()

    if (error) return null
    return sessionData
  }

  async closeSession(sessionId: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { error } = await this.supabase
      .from('sessions')
      .update({ 
        status: 'finalizada',
        logout_time: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (error) throw error
  }

  // =====================================================
  // SERVIÇO DE NOTAS FISCAIS
  // =====================================================

  async createNotaFiscal(notaData: Omit<NotaFiscal, 'id' | 'created_at' | 'updated_at'>): Promise<NotaFiscal> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('notas_fiscais')
      .insert([notaData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getNotasBySession(sessionId: string): Promise<NotaFiscal[]> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('notas_fiscais')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  async getNotaByNumero(numeroNF: string): Promise<NotaFiscal | null> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('notas_fiscais')
      .select('*')
      .eq('numero_nf', numeroNF)
      .single()

    if (error) return null
    return data
  }

  // =====================================================
  // SERVIÇO DE DIVERGÊNCIAS
  // =====================================================

  async createDivergencia(divergenciaData: Omit<Divergencia, 'id' | 'created_at'>): Promise<Divergencia> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('divergencias')
      .insert([divergenciaData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getDivergenciasByNota(notaFiscalId: string): Promise<Divergencia[]> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('divergencias')
      .select('*')
      .eq('nota_fiscal_id', notaFiscalId)

    if (error) throw error
    return data || []
  }

  // =====================================================
  // SERVIÇO DE CARROS DE EMBALAGEM
  // =====================================================

  async createCarro(carroData: Omit<CarroEmbalagem, 'id' | 'created_at' | 'updated_at'>): Promise<CarroEmbalagem> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('carros_embalagem')
      .insert([carroData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async addItemToCarro(itemData: Omit<CarroItem, 'id' | 'created_at'>): Promise<CarroItem> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('carro_itens')
      .insert([itemData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getCarrosBySession(sessionId: string): Promise<CarroEmbalagem[]> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('carros_embalagem')
      .select('*')
      .eq('session_id', sessionId)
      .eq('ativo', true)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  async getCarroItems(carroId: string): Promise<CarroItem[]> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('carro_itens')
      .select('*')
      .eq('carro_id', carroId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  // =====================================================
  // SERVIÇO DE INVENTÁRIO
  // =====================================================

  async createInventarioItem(itemData: Omit<InventarioItem, 'id' | 'created_at' | 'updated_at'>): Promise<InventarioItem> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('inventario')
      .insert([itemData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getInventarioByRua(rua: string): Promise<InventarioItem[]> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('inventario')
      .select('*')
      .eq('rua', rua)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  async getInventarioBySession(sessionId: string): Promise<InventarioItem[]> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('inventario')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  // =====================================================
  // SERVIÇO DE RELATÓRIOS
  // =====================================================

  async createRelatorio(relatorioData: Omit<Relatorio, 'id' | 'created_at' | 'updated_at'>): Promise<Relatorio> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const { data, error } = await this.supabase
      .from('relatorios')
      .insert([relatorioData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getRelatoriosByArea(area: string, data?: string, turno?: string): Promise<Relatorio[]> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    let query = this.supabase
      .from('relatorios')
      .select('*')
      .eq('area', area)

    if (data) query = query.eq('data', data)
    if (turno) query = query.eq('turno', turno)

    const { data: relatorios, error } = await query
      .order('created_at', { ascending: false })

    if (error) throw error
    return relatorios || []
  }

  async updateRelatorioStatus(relatorioId: string, status: string, additionalData?: Partial<Relatorio>): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    const updateData = { status, ...additionalData }
    
    const { error } = await this.supabase
      .from('relatorios')
      .update(updateData)
      .eq('id', relatorioId)

    if (error) throw error
  }

  // =====================================================
  // SERVIÇO DE LOGS DE ATIVIDADE
  // =====================================================

  async logActivity(logData: Omit<ActivityLog, 'id' | 'created_at'>): Promise<void> {
    if (!this.isConnected) {
      console.warn('⚠️ Não foi possível registrar atividade - banco desconectado')
      return
    }

    try {
      await this.supabase
        .from('activity_logs')
        .insert([logData])
    } catch (error) {
      console.warn('⚠️ Erro ao registrar atividade:', error)
    }
  }

  // =====================================================
  // SERVIÇO DE ESTATÍSTICAS
  // =====================================================

  async getSectorStats(area: string, data: string, turno: string): Promise<{
    totalNFs: number
    totalVolumes: number
    totalDivergencias: number
    totalRelatorios: number
  }> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    // Usar a função SQL personalizada
    const { data: stats, error } = await this.supabase
      .rpc('get_sector_stats', {
        p_area: area,
        p_data: data,
        p_turno: turno
      })

    if (error) throw error

    return {
      totalNFs: Number(stats?.[0]?.total_nfs || 0),
      totalVolumes: Number(stats?.[0]?.total_volumes || 0),
      totalDivergencias: Number(stats?.[0]?.total_divergencias || 0),
      totalRelatorios: Number(stats?.[0]?.total_relatorios || 0)
    }
  }

  // =====================================================
  // SERVIÇO DE MIGRAÇÃO DO LOCALSTORAGE
  // =====================================================

  async migrateFromLocalStorage(): Promise<{
    success: boolean
    message: string
    migratedItems: number
  }> {
    if (!this.isConnected) {
      throw new Error('Banco de dados não está conectado')
    }

    try {
      let migratedItems = 0

      // Migrar sessões
      const sessionData = localStorage.getItem('sistema_session')
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData)
          await this.createSession({
            area: session.area,
            data: session.data,
            turno: session.turno,
            login_time: session.loginTime,
            status: 'ativa'
          })
          migratedItems++
        } catch (error) {
          console.warn('⚠️ Erro ao migrar sessão:', error)
        }
      }

      // Migrar notas de recebimento
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('recebimento_')) {
          try {
            const notas = JSON.parse(localStorage.getItem(key) || '[]')
            if (notas.length > 0) {
              // Criar sessão se não existir
              const sessionKey = key.replace('recebimento_', '')
              const [data, turno] = sessionKey.split('_')
              
              let session = await this.getActiveSession('recebimento', data, turno)
              if (!session) {
                session = await this.createSession({
                  area: 'recebimento',
                  data,
                  turno,
                  login_time: new Date().toISOString(),
                  status: 'ativa'
                })
              }

              // Migrar notas
              for (const nota of notas) {
                await this.createNotaFiscal({
                  codigo_completo: nota.codigoCompleto,
                  numero_nf: nota.numeroNF,
                  data: nota.data,
                  volumes: nota.volumes,
                  destino: nota.destino,
                  fornecedor: nota.fornecedor,
                  cliente_destino: nota.clienteDestino,
                  tipo_carga: nota.tipoCarga,
                  status: nota.status,
                  session_id: session.id
                })
                migratedItems++
              }
            }
          } catch (error) {
            console.warn(`⚠️ Erro ao migrar notas de recebimento ${key}:`, error)
          }
        }
      }

      // Migrar carros de embalagem
      const carrosData = localStorage.getItem('profarma_carros_embalagem')
      if (carrosData) {
        try {
          const carros = JSON.parse(carrosData)
          if (carros.length > 0) {
            for (const carro of carros) {
              // Criar sessão se não existir
              const [data, turno] = carro.dataInicio.split('T')[0].split('-')
              let session = await this.getActiveSession('embalagem', `${data}/${turno}`, 'manhã')
              if (!session) {
                session = await this.createSession({
                  area: 'embalagem',
                  data: `${data}/${turno}`,
                  turno: 'manhã',
                  login_time: new Date().toISOString(),
                  status: 'ativa'
                })
              }

              // Criar carro
              const carroCriado = await this.createCarro({
                nome: carro.nome,
                destino_final: carro.destinoFinal,
                status: carro.statusCarro,
                session_id: session.id,
                data_inicio: carro.dataInicio,
                ativo: carro.ativo
              })

              // Adicionar itens ao carro
              for (const nf of carro.nfs) {
                await this.addItemToCarro({
                  carro_id: carroCriado.id,
                  nota_fiscal_id: nf.id,
                  quantidade: nf.quantidade || 1,
                  status: nf.status || 'valida'
                })
                migratedItems++
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ Erro ao migrar carros de embalagem:', error)
        }
      }

      // Migrar relatórios
      const relatoriosData = localStorage.getItem('relatorios_custos')
      if (relatoriosData) {
        try {
          const relatorios = JSON.parse(relatoriosData)
          for (const relatorio of relatorios) {
            await this.createRelatorio({
              nome: relatorio.nome,
              area: relatorio.area,
              data: relatorio.data,
              turno: relatorio.turno,
              quantidade_notas: relatorio.quantidadeNotas,
              soma_volumes: relatorio.somaVolumes,
              status: relatorio.status,
              observacoes: relatorio.observacoes,
              data_finalizacao: relatorio.dataFinalizacao,
              data_lancamento: relatorio.dataLancamento,
              numero_lancamento: relatorio.numeroLancamento,
              responsavel_lancamento: relatorio.responsavelLancamento
            })
            migratedItems++
          }
        } catch (error) {
          console.warn('⚠️ Erro ao migrar relatórios:', error)
        }
      }

      return {
        success: true,
        message: `Migração concluída com sucesso! ${migratedItems} itens migrados.`,
        migratedItems
      }

    } catch (error) {
      console.error('❌ Erro durante migração:', error)
      return {
        success: false,
        message: `Erro durante migração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        migratedItems: 0
      }
    }
  }

  // =====================================================
  // SERVIÇO DE SINCRONIZAÇÃO EM TEMPO REAL
  // =====================================================

  async setupRealtimeSubscriptions(callbacks: {
    onNotaFiscalChange?: (payload: any) => void
    onCarroChange?: (payload: any) => void
    onInventarioChange?: (payload: any) => void
    onRelatorioChange?: (payload: any) => void
  }): Promise<void> {
    if (!this.isConnected) {
      console.warn('⚠️ Não foi possível configurar sincronização em tempo real - banco desconectado')
      return
    }

    try {
      // Canal para notas fiscais
      if (callbacks.onNotaFiscalChange) {
        this.supabase
          .channel('notas-fiscais-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'notas_fiscais' },
            callbacks.onNotaFiscalChange
          )
          .subscribe()
      }

      // Canal para carros de embalagem
      if (callbacks.onCarroChange) {
        this.supabase
          .channel('carros-embalagem-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'carros_embalagem' },
            callbacks.onCarroChange
          )
          .subscribe()
      }

      // Canal para inventário
      if (callbacks.onInventarioChange) {
        this.supabase
          .channel('inventario-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'inventario' },
            callbacks.onInventarioChange
          )
          .subscribe()
      }

      // Canal para relatórios
      if (callbacks.onRelatorioChange) {
        this.supabase
          .channel('relatorios-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'relatorios' },
            callbacks.onRelatorioChange
          )
          .subscribe()
      }

      console.log('✅ Sincronização em tempo real configurada')
    } catch (error) {
      console.error('❌ Erro ao configurar sincronização em tempo real:', error)
    }
  }

  // =====================================================
  // LIMPEZA E DESTRUIÇÃO
  // =====================================================

  async cleanup(): Promise<void> {
    try {
      // Desconectar canais realtime
      await this.supabase.removeAllChannels()
      this.isConnected = false
      console.log('🧹 Serviço de banco centralizado limpo')
    } catch (error) {
      console.error('❌ Erro ao limpar serviço:', error)
    }
  }
}

// =====================================================
// HOOK PERSONALIZADO PARA USAR O SERVIÇO
// =====================================================

export const useCentralizedDatabase = () => {
  const service = CentralizedDatabaseService.getInstance()
  
  return {
    initialize: () => service.initialize(),
    getConnectionStatus: () => service.getConnectionStatus(),
    cleanup: () => service.cleanup(),
    
    // Usuários
    createUser: (userData: any) => service.createUser(userData),
    getUserById: (id: string) => service.getUserById(id),
    getUsersByArea: (area: string) => service.getUsersByArea(area),
    
    // Sessões
    createSession: (sessionData: any) => service.createSession(sessionData),
    getActiveSession: (area: string, data: string, turno: string) => service.getActiveSession(area, data, turno),
    closeSession: (sessionId: string) => service.closeSession(sessionId),
    
    // Notas Fiscais
    createNotaFiscal: (notaData: any) => service.createNotaFiscal(notaData),
    getNotasBySession: (sessionId: string) => service.getNotasBySession(sessionId),
    getNotaByNumero: (numeroNF: string) => service.getNotaByNumero(numeroNF),
    
    // Divergências
    createDivergencia: (divergenciaData: any) => service.createDivergencia(divergenciaData),
    getDivergenciasByNota: (notaFiscalId: string) => service.getDivergenciasByNota(notaFiscalId),
    
    // Carros de Embalagem
    createCarro: (carroData: any) => service.createCarro(carroData),
    addItemToCarro: (itemData: any) => service.addItemToCarro(itemData),
    getCarrosBySession: (sessionId: string) => service.getCarrosBySession(sessionId),
    getCarroItems: (carroId: string) => service.getCarroItems(carroId),
    
    // Inventário
    createInventarioItem: (itemData: any) => service.createInventarioItem(itemData),
    getInventarioByRua: (rua: string) => service.getInventarioByRua(rua),
    getInventarioBySession: (sessionId: string) => service.getInventarioBySession(sessionId),
    
    // Relatórios
    createRelatorio: (relatorioData: any) => service.createRelatorio(relatorioData),
    getRelatoriosByArea: (area: string, data?: string, turno?: string) => service.getRelatoriosByArea(area, data, turno),
    updateRelatorioStatus: (relatorioId: string, status: string, additionalData?: any) => service.updateRelatorioStatus(relatorioId, status, additionalData),
    
    // Logs e Estatísticas
    logActivity: (logData: any) => service.logActivity(logData),
    getSectorStats: (area: string, data: string, turno: string) => service.getSectorStats(area, data, turno),
    
    // Migração
    migrateFromLocalStorage: () => service.migrateFromLocalStorage(),
    
    // Tempo Real
    setupRealtimeSubscriptions: (callbacks: any) => service.setupRealtimeSubscriptions(callbacks)
  }
}
