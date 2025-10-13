import { getSupabase, retryWithBackoff, retryWithBackoffAndTimeout, testSupabaseConnection } from './supabase-client'
import { convertDateToISO } from './utils'

// Tipos de dados
export interface SessionData {
  area: string
  colaboradores: string[]
  data: string
  turno: string
  loginTime: string
  usuarioCustos?: string
}

export interface NotaFiscal {
  id: string
  codigoCompleto: string
  data: string
  numeroNF: string
  volumes: number
  destino: string
  fornecedor: string
  clienteDestino: string
  tipoCarga: string
  timestamp: string
  status: 'ok' | 'divergencia' | 'devolvida'
  divergencia?: {
    volumesInformados: number
    observacoes: string
  }
}

export interface Carro {
  id: string
  nome: string
  destinoFinal: string
  nfs: NotaFiscal[]
  statusCarro: "aguardando_colagem" | "em_conferencia" | "liberado" | "embalando" | "em_producao"
  dataInicio: string
  ativo: boolean
  sessionId: string
}

export interface Relatorio {
  id?: string
  nome: string
  colaboradores: string[]
  data: string
  turno: string
  area: string
  quantidadeNotas: number
  somaVolumes: number
  totalDivergencias: number
  notas: NotaFiscal[]
  dataFinalizacao: string
  status: string
  ultimaAtualizacaoLocal?: number
}

export interface ChatMessage {
  id: string
  remetenteId: string
  remetenteNome: string
  remetenteTipo: 'colaborador' | 'adm' | 'sistema'
  destinatarioId: string
  mensagem: string
  timestamp: string // ISO
  lida?: boolean
}

export interface Conversa {
  id: string
  colaboradores: string[]
  data: string
  turno: string
  ultimaMensagem: string
  ultimoTimestamp: string
  mensagensNaoLidas: number
}
// === Helpers: cole no topo do arquivo (perto dos tipos) ===
function normalizeNF(nf: string | undefined) {
  const raw = (nf ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  return {
    raw,
    withZeros: digits,                        // "003230827"
    withoutZeros: digits.replace(/^0+/, "") || "0", // "3230827"
  };
}

// Gera janela diária em ISO (usa horário local do navegador)
function dayRangeBR(dateBR: string) {
  // dateBR no formato "dd/MM/yyyy"
  const [d, m, y] = dateBR.split("/").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}
// Serviço de Sessão
export const SessionService = {
  // Salvar sessão
  async saveSession(sessionData: SessionData): Promise<string> {
    try {
      console.log('💾 Tentando salvar sessão no banco...')
      console.log('📊 Dados da sessão:', JSON.stringify(sessionData, null, 2))
      
      // Validar dados obrigatórios
      if (!sessionData.area || !sessionData.colaboradores || !sessionData.data || !sessionData.turno || !sessionData.loginTime) {
        throw new Error('Dados obrigatórios da sessão estão faltando')
      }
      
      // Gerar UUID para a sessão
      const sessionId = crypto.randomUUID()
      
      // Converter data para formato ISO se estiver no formato brasileiro
      let dataFormatada = sessionData.data
      if (sessionData.data && sessionData.data.includes('/')) {
        dataFormatada = convertDateToISO(sessionData.data)
        console.log('📅 Data da sessão convertida de', sessionData.data, 'para', dataFormatada)
      }
      
      // Preparar dados para o banco (usando estrutura real da tabela sessions)
      const sessionPayload = {
        id: sessionId,
        area: sessionData.area,
        colaboradores: sessionData.colaboradores,
        data: dataFormatada,
        turno: sessionData.turno,
        login_time: sessionData.loginTime,
        usuario_custos: sessionData.usuarioCustos || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('📤 Payload para o banco:', JSON.stringify(sessionPayload, null, 2))
      
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('sessions')
          .upsert(sessionPayload)
      })

      if (error) {
        console.error('❌ Erro ao salvar sessão:', error)
        console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2))
        throw error
      }
      
      console.log('✅ Sessão salva com sucesso no banco')
      return sessionId
    } catch (error) {
      console.error('❌ Erro ao salvar sessão:', error)
      throw error
    }
  },

  // Carregar sessão
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      console.log('🔍 SessionService.getSession chamado com sessionId:', sessionId)
      console.log('🔍 Tentando buscar sessão no banco...')
      
      const isConnected = await testSupabaseConnection()
      console.log('🌐 Status da conectividade:', { isConnected })
      
      if (!isConnected) {
        console.log('⚠️ Sem conectividade com Supabase, usando fallback')
        return null
      }
      
      const knownAreas = ['recebimento', 'embalagem', 'inventario', 'custos']
      const filterByArea = knownAreas.includes(sessionId) // Check if sessionId is a known area
      console.log('🔍 Filtro por área:', { sessionId, filterByArea, knownAreas })

      // CORREÇÃO: Buscar sessão específica por ID ou mais recente da área
      // Se sessionId for 'current', buscar a mais recente da área
      // Se sessionId for um ID específico, buscar por esse ID
      const { data, error } = await retryWithBackoff(async () => {
        let query = getSupabase()
          .from('sessions')
          .select('*')

        if (sessionId === 'current') {
          // Para 'current', buscar a mais recente da área (comportamento atual)
          query = query
            .order('updated_at', { ascending: false })
            .limit(1)
        } else if (sessionId.startsWith('session_')) {
          // Para ID específico, buscar por esse ID exato
          console.log('🔍 Buscando sessão específica por ID:', sessionId)
          query = query.eq('id', sessionId)
        } else if (filterByArea) {
          // Para área conhecida, buscar a mais recente dessa área
          console.log('🔍 Aplicando filtro por área:', sessionId)
          query = query
            .eq('area', sessionId)
            .order('updated_at', { ascending: false })
            .limit(1)
        } else {
          // Fallback: buscar a mais recente
          query = query
            .order('updated_at', { ascending: false })
            .limit(1)
        }
        
        console.log('🔍 Executando query...')
        const result = await query.maybeSingle()
        console.log('📊 Resultado da query:', result)
        return result
      })

      if (error) {
        console.error('❌ Erro ao buscar sessão:', error)
        return null
      }

      if (!data) {
        console.log('⚠️ Nenhuma sessão encontrada no banco')
        return null
      }

      console.log('✅ Sessão encontrada no banco:', data.area)
      console.log('📊 Dados completos da sessão:', data)
      console.log('👥 Colaboradores da sessão:', data.colaboradores)
      
      const sessionData = {
        colaboradores: data.colaboradores as string[],
        data: data.data as string,
        turno: data.turno as string,
        area: data.area as string,
        loginTime: data.login_time as string
      }
      
      console.log('📋 Sessão mapeada:', sessionData)
      return sessionData
    } catch (error) {
      console.error('❌ Erro ao buscar sessão:', error)
      return null
    }
  },

  // Deletar sessão
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('sessions')
          .delete()
          .eq('id', sessionId)
      })

      if (error) throw error
    } catch (error) {
      console.error('Erro ao deletar sessão:', error)
      throw error
    }
  }
}

// Serviço de Recebimento
export const RecebimentoService = {
  // Salvar notas de recebimento
  async saveNotas(sessionId: string, notas: NotaFiscal[]): Promise<void> {
    try {
      console.log('💾 Tentando salvar notas no banco...')
      
      // Primeiro, verificar se já existe um registro para esta sessão
      const { data: existingData, error: checkError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('recebimento_notas')
          .select('id, notas')
          .eq('session_id', sessionId)
          .maybeSingle()
      })

      if (checkError && !checkError.message?.includes('relation "recebimento_notas" does not exist')) {
        console.error('❌ Erro ao verificar notas existentes:', checkError)
        throw checkError
      }

      if (existingData) {
        // Se já existe, fazer update
        console.log('📝 Atualizando notas existentes para sessão:', sessionId)
        const { error } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('recebimento_notas')
            .update({
              notas: notas,
              updated_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)
        })

        if (error) {
          console.error('❌ Erro ao atualizar notas de recebimento:', error)
          throw error
        }
      } else {
        // Se não existe, fazer insert
        console.log('➕ Inserindo novas notas para sessão:', sessionId)
        const { error } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('recebimento_notas')
            .insert({
              session_id: sessionId,
              notas: notas,
              updated_at: new Date().toISOString()
            })
        })

        if (error) {
          console.error('❌ Erro ao inserir notas de recebimento:', error)
          throw error
        }
      }
      
      console.log('✅ Notas salvas com sucesso no banco')
    } catch (error) {
      console.error('❌ Erro ao salvar notas de recebimento:', error)
      throw error
    }
  },

  // Carregar notas de recebimento
  async getNotas(sessionId: string): Promise<NotaFiscal[]> {
    try {
      console.log('📋 Tentando carregar notas do banco...')
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('recebimento_notas')
          .select('notas')
          .eq('session_id', sessionId)
          .maybeSingle()
      })

      if (error) {
        console.error('❌ Erro ao buscar notas de recebimento:', error)
        
        // Se for erro de tabela não encontrada, retornar array vazio
        if (error.message?.includes('relation "recebimento_notas" does not exist')) {
          console.log('❌ Tabela recebimento_notas não existe no banco')
          return []
        }
        
        throw error
      }

      if (data && data.notas) {
        const notas = data.notas as NotaFiscal[] | null
        console.log('✅ Notas encontradas no banco:', notas?.length || 0, 'notas')
        return notas || []
      }

      console.log('ℹ️ Nenhuma nota encontrada para esta sessão')
      return []
    } catch (error) {
      console.error('❌ Erro ao carregar notas de recebimento:', error)
      return []
    }
  },

  // Deletar notas de recebimento
  async deleteNotas(sessionId: string): Promise<void> {
    try {
      console.log('🗑️ Tentando deletar notas do banco para sessão:', sessionId)
      
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('recebimento_notas')
          .delete()
          .eq('session_id', sessionId)
      })

      if (error) {
        // Se for erro de tabela não encontrada, não é um erro crítico
        if (error.message?.includes('relation "recebimento_notas" does not exist')) {
          console.log('ℹ️ Tabela recebimento_notas não existe no banco')
          return
        }
        throw error
      }
      
      console.log('✅ Notas deletadas com sucesso do banco')
    } catch (error) {
      console.error('❌ Erro ao deletar notas de recebimento:', error)
      throw error
    }
  }
}

// Serviço de Embalagem (Carros)
export const EmbalagemService = {
  // Salvar carros
  async saveCarros(sessionId: string, carros: Carro[]): Promise<void> {
    try {
      console.log('💾 Tentando salvar carros no banco...')
      
      // Primeiro, verificar se já existe um registro para esta sessão
      const { data: existingData, error: checkError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros')
          .select('id, carros')
          .eq('session_id', sessionId)
          .maybeSingle()
      })

      if (checkError && !checkError.message?.includes('relation "embalagem_carros" does not exist')) {
        console.error('❌ Erro ao verificar carros existentes:', checkError)
        throw checkError
      }

      if (existingData) {
        // Se já existe, fazer update
        console.log('📝 Atualizando carros existentes para sessão:', sessionId)
        const { error } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('embalagem_carros')
            .update({
              carros: carros,
              updated_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)
        })

        if (error) {
          console.error('❌ Erro ao atualizar carros:', error)
          throw error
        }
      } else {
        // Se não existe, fazer insert
        console.log('➕ Inserindo novos carros para sessão:', sessionId)
        const { error } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('embalagem_carros')
            .insert({
              session_id: sessionId,
              carros: carros,
              updated_at: new Date().toISOString()
            })
        })

        if (error) {
          console.error('❌ Erro ao inserir carros:', error)
          throw error
        }
      }
      
      console.log('✅ Carros salvos com sucesso no banco')
    } catch (error) {
      console.error('❌ Erro ao salvar carros:', error)
      throw error
    }
  },

  // Carregar carros
  async getCarros(sessionId: string): Promise<Carro[]> {
    try {
      console.log('📋 Tentando carregar carros do banco...')
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros')
          .select('carros')
          .eq('session_id', sessionId)
          .maybeSingle()
      })

      if (error) {
        console.error('❌ Erro ao buscar carros:', error)
        
        // Se for erro de tabela não encontrada, retornar array vazio
        if (error.message?.includes('relation "embalagem_carros" does not exist')) {
          console.log('❌ Tabela embalagem_carros não existe no banco')
          return []
        }
        
        throw error
      }

      if (data && data.carros) {
        const carros = data.carros as Carro[] | null
        console.log('✅ Carros encontrados no banco:', carros?.length || 0, 'carros')
        return carros || []
      }

      console.log('ℹ️ Nenhum carro encontrado para esta sessão')
      return []
    } catch (error) {
      console.error('❌ Erro ao carregar carros:', error)
      return []
    }
  },

  // Salvar carros finalizados
  async saveCarrosFinalizados(carros: Carro[]): Promise<void> {
    try {
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros_finalizados')
          .insert({
            carros: carros,
            created_at: new Date().toISOString()
          })
      })

      if (error) throw error
    } catch (error) {
      console.error('Erro ao salvar carros finalizados:', error)
      throw error
    }
  },

  // Carregar carros finalizados
  async getCarrosFinalizados(): Promise<Carro[]> {
    try {
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros_finalizados')
          .select('carros')
          .order('created_at', { ascending: false })
      })

      if (error) throw error

      return data?.flatMap((item: any) => (item.carros as Carro[]) || []) || []
    } catch (error) {
      console.error('Erro ao carregar carros finalizados:', error)
      return []
    }
  }
}

// Serviço de Relatórios
export const RelatoriosService = {
  // Atualizar apenas o status do relatório (mais eficiente)
  async updateRelatorioStatus(relatorioId: string, novoStatus: string): Promise<void> {
    try {
      console.log('🔄 Atualizando status do relatório:', relatorioId, 'para:', novoStatus)
      
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('relatorios')
        .update({ 
          status: novoStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', relatorioId)
      
      if (error) {
        console.error('❌ Erro ao atualizar status do relatório:', error)
        throw error
      }
      
      console.log('✅ Status do relatório atualizado com sucesso')
    } catch (error) {
      console.error('❌ Erro ao atualizar status do relatório:', error)
      throw error
    }
  },

  // Calcular total de divergências
  async calcularTotalDivergencias(relatorio: Relatorio): Promise<number> {
    try {
      console.log('🔍 Calculando total de divergências para relatório:', relatorio.nome)
      
      // Se o relatório já tem totalDivergencias definido, usar esse valor
      if (relatorio.totalDivergencias !== undefined && relatorio.totalDivergencias !== null) {
        console.log('🔍 Usando totalDivergencias já definido:', relatorio.totalDivergencias)
        return relatorio.totalDivergencias
      }

      // Se há notas carregadas, calcular baseado no status das notas
      if (relatorio.notas && relatorio.notas.length > 0) {
        console.log('🔍 Calculando baseado nas notas carregadas:', relatorio.notas.length)
        const totalDivergencias = relatorio.notas.filter(nota => 
          nota.status === 'divergencia' || 
          (nota.divergencia && nota.divergencia.observacoes)
        ).length
        
        console.log('🔍 Total de divergências calculado das notas:', totalDivergencias)
        return totalDivergencias
      }

      // Se não há notas carregadas, buscar no banco de dados
      console.log('🔍 Buscando divergências no banco de dados...')
      const supabase = getSupabase()
      
      // Buscar notas do relatório na tabela relatorio_notas
      if (!relatorio.id) {
        console.log('🔍 Relatório sem ID, não é possível buscar divergências no banco')
        return 0
      }
      
      const { data: relatorioNotas, error: relatorioNotasError } = await supabase
        .from('relatorio_notas')
        .select('nota_fiscal_id')
        .eq('relatorio_id', relatorio.id)

      if (relatorioNotasError) {
        console.warn('⚠️ Erro ao buscar notas do relatório:', relatorioNotasError)
        return 0
      }

      if (!relatorioNotas || relatorioNotas.length === 0) {
        console.log('🔍 Nenhuma nota encontrada para o relatório')
        return 0
      }

      const notaIds = relatorioNotas.map(rn => rn.nota_fiscal_id)
      console.log('🔍 IDs das notas do relatório:', notaIds)
      
      const { data: divergencias, error } = await supabase
        .from('divergencias')
        .select('id')
        .in('nota_fiscal_id', notaIds)

      if (error) {
        console.warn('⚠️ Erro ao buscar divergências:', error)
        return 0
      }

      const total = divergencias?.length || 0
      console.log('🔍 Total de divergências encontradas no banco:', total)
      return total
    } catch (error) {
      console.warn('⚠️ Erro ao calcular divergências:', error)
      return 0
    }
  },

  // Salvar relatório
  async saveRelatorio(relatorio: Relatorio): Promise<void> {
    try {
      console.log('💾 Tentando salvar relatório no banco...')
      console.log('🔍 Dados do relatório recebido:', relatorio)
      
      // Calcular total de divergências se não foi fornecido
      if (relatorio.totalDivergencias === undefined || relatorio.totalDivergencias === null) {
        console.log('🔍 Calculando total de divergências...')
        relatorio.totalDivergencias = await RelatoriosService.calcularTotalDivergencias(relatorio)
        console.log('🔍 Total de divergências calculado:', relatorio.totalDivergencias)
      }
      
      // Converter data para formato ISO se estiver no formato brasileiro
      let dataFormatada = relatorio.data
      if (relatorio.data && relatorio.data.includes('/')) {
        dataFormatada = convertDateToISO(relatorio.data)
        console.log('📅 Data convertida de', relatorio.data, 'para', dataFormatada)
      } else if (relatorio.data) {
        // Garantir que a data está no formato correto
        try {
          const dataObj = new Date(relatorio.data)
          if (!isNaN(dataObj.getTime())) {
            dataFormatada = dataObj.toISOString().split('T')[0]
            console.log('📅 Data formatada para ISO:', dataFormatada)
          }
        } catch (error) {
          console.warn('⚠️ Erro ao formatar data:', error)
        }
      }
      
      console.log('📅 Data final para uso:', dataFormatada)
      
      const supabase = getSupabase()
      console.log('🔍 Cliente Supabase obtido:', !!supabase)
      
      // 1. Salvar o relatório principal
      console.log('🔍 Salvando relatório principal...')
      const { data: relatorioData, error: relatorioError } = await retryWithBackoff(async () => {
        const payload = {
          nome: relatorio.nome,
          data: dataFormatada,
          turno: relatorio.turno,
          area: relatorio.area,
          quantidade_notas: relatorio.quantidadeNotas,
          soma_volumes: relatorio.somaVolumes,
          total_divergencias: relatorio.totalDivergencias || 0,
          data_finalizacao: relatorio.dataFinalizacao,
          status: relatorio.status,
          created_at: new Date().toISOString()
        }
        
        console.log('🔍 Payload do relatório:', payload)

        if (relatorio.id) {
          // Atualização - incluir ID e usar upsert
          console.log('🔍 Atualizando relatório existente...')
          return await supabase
            .from('relatorios')
            .upsert({ ...payload, id: relatorio.id! })
            .select()
        } else {
          // Novo relatório - não incluir ID, usar insert
          console.log('🔍 Criando novo relatório...')
          return await supabase
            .from('relatorios')
            .insert(payload)
            .select()
        }
      })
      
      if (relatorioError) {
        console.error('❌ Erro ao salvar relatório:', relatorioError)
        throw relatorioError
      }
      
      console.log('🔍 Relatório salvo, resposta:', relatorioData)
      
      // Obter o ID do relatório salvo
      const relatorioId = relatorio.id || relatorioData?.[0]?.id
      console.log('🔍 ID do relatório obtido:', relatorioId)
      console.log('🔍 Relatório original ID:', relatorio.id)
      console.log('🔍 Relatório salvo ID:', relatorioData?.[0]?.id)
      
      if (!relatorioId) {
        throw new Error('Não foi possível obter o ID do relatório salvo')
      }
      
      console.log('✅ Relatório principal salvo com ID:', relatorioId)
      
      // 2. Salvar colaboradores na tabela relatorio_colaboradores
      if (relatorio.colaboradores && Array.isArray(relatorio.colaboradores) && relatorio.colaboradores.length > 0) {
        console.log('💾 Salvando colaboradores...')
        console.log('🔍 Colaboradores recebidos:', relatorio.colaboradores)
        
        // Primeiro, buscar os IDs dos usuários pelos nomes
        const colaboradoresIds = await Promise.all(
          relatorio.colaboradores.map(async (nomeColaborador: string) => {
            console.log(`🔍 Buscando usuário: ${nomeColaborador}`)
            
            // CORREÇÃO: Buscar usuário pelo nome usando ILIKE para case-insensitive
            // e tentar diferentes variações do nome
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, nome, area, ativo')
              .or(`nome.ilike.%${nomeColaborador}%,nome.ilike.%${nomeColaborador.trim()}%,nome.eq.${nomeColaborador}`)
              .eq('ativo', true)
              .single()
            
            console.log(`🔍 Resultado busca usuário ${nomeColaborador}:`, { userData, userError })
            
            if (userError || !userData) {
              console.log(`⚠️ Usuário não encontrado: ${nomeColaborador}, criando...`)
              
              // CORREÇÃO: Tentar inserir primeiro, depois fazer upsert se necessário
              try {
                // Primeiro, tentar inserir diretamente
                const { data: newUser, error: insertError } = await supabase
                  .from('users')
                  .insert({
                    nome: nomeColaborador.trim(),
                    area: 'recebimento',
                    ativo: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .select('id, nome')
                  .single()
                
                if (insertError) {
                  console.log(`⚠️ Erro na inserção direta, tentando upsert:`, insertError.message)
                  
                  // Se falhar, tentar upsert
                  const { data: upsertUser, error: upsertError } = await supabase
                    .from('users')
                    .upsert({
                      nome: nomeColaborador.trim(),
                      area: 'recebimento',
                      ativo: true,
                      updated_at: new Date().toISOString()
                    }, {
                      onConflict: 'nome,area',
                      ignoreDuplicates: false
                    })
                    .select('id, nome')
                    .single()
                  
                  if (upsertError) {
                    console.error(`❌ Erro ao criar/atualizar usuário ${nomeColaborador}:`, upsertError)
                    return null
                  }
                  
                  console.log(`✅ Usuário criado/atualizado via upsert: ${nomeColaborador} com ID: ${upsertUser.id}`)
                  return upsertUser.id
                } else {
                  console.log(`✅ Usuário criado via inserção: ${nomeColaborador} com ID: ${newUser.id}`)
                  return newUser.id
                }
              } catch (error) {
                console.error(`❌ Erro geral ao criar usuário ${nomeColaborador}:`, error)
                return null
              }
            }
            
            console.log(`✅ Usuário encontrado: ${nomeColaborador} com ID: ${userData.id}`)
            return userData.id
          })
        )
        
        console.log('🔍 IDs dos colaboradores obtidos:', colaboradoresIds)
        
        // Filtrar IDs válidos
        const idsValidos = colaboradoresIds.filter(id => id !== null)
        console.log('🔍 IDs válidos filtrados:', idsValidos)
        
        if (idsValidos.length > 0) {
          // Salvar relacionamentos na tabela relatorio_colaboradores
          const colaboradoresRelacionamentos = idsValidos.map(userId => ({
            relatorio_id: relatorioId,
            user_id: userId
          }))
          
          console.log('🔍 Relacionamentos a serem salvos:', colaboradoresRelacionamentos)
          
          // CORREÇÃO: Inserir colaboradores individualmente com verificação de duplicatas
          console.log('🔄 Inserindo colaboradores individualmente...')
          let colaboradoresSalvos = 0
          let colaboradoresDuplicados = 0
          
          for (const relacionamento of colaboradoresRelacionamentos) {
            try {
              // Verificar se user_id e relatorio_id são válidos
              if (!relacionamento.user_id) {
                console.error(`❌ user_id inválido para relacionamento:`, relacionamento)
                continue
              }
              
              if (!relacionamento.relatorio_id) {
                console.error(`❌ relatorio_id inválido para relacionamento:`, relacionamento)
                continue
              }
              
              // Verificar se já existe antes de inserir
              const { data: existing, error: checkError } = await supabase
                .from('relatorio_colaboradores')
                .select('id')
                .eq('relatorio_id', relacionamento.relatorio_id)
                .eq('user_id', relacionamento.user_id)
                .maybeSingle()
              
              if (existing) {
                console.log(`⚠️ Colaborador ${relacionamento.user_id} já existe para este relatório`)
                colaboradoresDuplicados++
                continue
              }
              
              // Inserir se não existir
              const { error: individualError } = await supabase
                .from('relatorio_colaboradores')
                .insert({
                  id: crypto.randomUUID(),
                  relatorio_id: relacionamento.relatorio_id,
                  user_id: relacionamento.user_id
                })
              
              if (individualError) {
                console.error(`❌ Erro ao salvar colaborador individual ${relacionamento.user_id}:`, individualError)
              } else {
                console.log(`✅ Colaborador individual salvo: ${relacionamento.user_id}`)
                colaboradoresSalvos++
              }
            } catch (error) {
              console.error(`❌ Erro geral ao salvar colaborador individual ${relacionamento.user_id}:`, error)
            }
          }
          
          console.log(`✅ Colaboradores processados: ${colaboradoresSalvos} salvos, ${colaboradoresDuplicados} duplicados`)
        } else {
          console.log('⚠️ Nenhum ID válido de colaborador encontrado')
          console.log('🔍 Colaboradores recebidos:', relatorio.colaboradores)
          console.log('🔍 IDs obtidos:', colaboradoresIds)
        }
      } else {
        console.log('⚠️ Nenhum colaborador para salvar ou formato inválido:', relatorio.colaboradores)
      }
      
      // 3. Salvar notas na tabela relatorio_notas
      if (relatorio.notas && Array.isArray(relatorio.notas) && relatorio.notas.length > 0) {
        console.log('💾 Salvando notas...')
        console.log('🔍 Notas recebidas:', relatorio.notas)
        console.log('🔍 Estrutura da primeira nota:', JSON.stringify(relatorio.notas[0], null, 2))
        
        // Verificar se já existem notas associadas a este relatório
        const { data: notasExistentes, error: checkError } = await supabase
          .from('relatorio_notas')
          .select('nota_fiscal_id')
          .eq('relatorio_id', relatorioId)
        
        if (checkError) {
          console.error('❌ Erro ao verificar notas existentes:', checkError)
        } else {
          console.log('🔍 Notas já associadas ao relatório:', notasExistentes?.length || 0)
        }
        
        // Obter IDs das notas já associadas
        const notasExistentesIds = new Set(notasExistentes?.map(n => n.nota_fiscal_id) || [])
        
        // Salvar todas as notas na tabela notas_fiscais
        console.log(`🔍 Iniciando processamento de ${relatorio.notas.length} notas...`)
        
        const notasSalvas = await Promise.all(
          relatorio.notas.map(async (nota: any, index: number) => {
            console.log(`🔍 Processando nota ${index + 1}/${relatorio.notas.length}:`, {
              numeroNF: nota.numeroNF,
              codigoCompleto: nota.codigoCompleto,
              volumes: nota.volumes,
              status: nota.status,
              temDivergencia: !!nota.divergencia
            })
            
            try {
              // Preparar dados da nota com tratamento de campos
              const notaData = {
                codigo_completo: nota.codigoCompleto || '',
                numero_nf: nota.numeroNF,
                data: dataFormatada,
                volumes: nota.volumes || 0,
                destino: nota.destino || '',
                fornecedor: nota.fornecedor || '',
                cliente_destino: nota.clienteDestino || '',
                tipo_carga: nota.tipoCarga || '',
                status: nota.status || 'ok'
              }
              
              console.log(`🔍 Dados da nota a serem processados:`, notaData)
              
              // Verificar se a nota já existe primeiro
              const { data: notaExistente, error: buscaError } = await supabase
                .from('notas_fiscais')
                .select('id')
                .eq('numero_nf', nota.numeroNF)
                .limit(1)
              
              let notaId: string
              
              let notaSalva: any
              let notaError: any
              
              if (notaExistente && notaExistente.length > 0) {
                // Atualizar nota existente
                const { data: updatedNota, error: updateError } = await supabase
                  .from('notas_fiscais')
                  .update(notaData)
                  .eq('id', notaExistente[0].id as string)
                  .select()
                  .single()
                
                notaSalva = updatedNota
                notaError = updateError
              } else {
                // Inserir nova nota
                const { data: insertedNota, error: insertError } = await supabase
                  .from('notas_fiscais')
                  .insert(notaData)
                  .select()
                  .single()
                
                notaSalva = insertedNota
                notaError = insertError
              }
              
              if (notaError) {
                console.error(`❌ Erro ao salvar nota fiscal ${index + 1}:`, notaError)
                return null
              }
              
              notaId = (notaSalva as any).id
              console.log(`✅ Nota fiscal ${index + 1} processada com ID: ${notaId}`)
              
              // Atualizar o status da nota se ela tem divergência
              if (nota.divergencia) {
                const { error: updateError } = await supabase
                  .from('notas_fiscais')
                  .update({ status: 'divergencia' })
                  .eq('id', notaId)
                
                if (updateError) {
                  console.error(`❌ Erro ao atualizar status da nota ${index + 1}:`, updateError)
                } else {
                  console.log(`✅ Status da nota ${index + 1} atualizado para "divergencia"`)
                }
              }
              
              return { ...nota, id: notaId }
            } catch (error) {
              console.error(`❌ Erro ao processar nota ${index + 1}:`, error)
              return null
            }
          })
        )
        
        console.log('🔍 Resultado do processamento:')
        console.log(`  - Total de notas recebidas: ${relatorio.notas.length}`)
        console.log(`  - Notas processadas com sucesso: ${notasSalvas.filter(n => n !== null).length}`)
        console.log(`  - Notas com erro: ${notasSalvas.filter(n => n === null).length}`)
        
        // Filtrar notas válidas
        const notasValidas = notasSalvas.filter(nota => nota !== null)
        console.log(`🔍 Notas válidas para salvar: ${notasValidas.length}`)
        
        if (notasValidas.length > 0) {
          console.log('🔍 IDs das notas válidas:', notasValidas.map(n => n.id))
        }
        
        if (notasValidas.length > 0) {
          // IMPORTANTE: Sempre salvar relacionamentos para todas as notas válidas
          // Não filtrar por notas existentes, pois queremos garantir que todas sejam associadas
          const todasNotasRelacionamentos = notasValidas.map(nota => ({
            relatorio_id: relatorioId,
            nota_fiscal_id: nota.id
          }))
          
          console.log('🔍 Relacionamentos de TODAS as notas a serem salvos:', todasNotasRelacionamentos.length)
          
          // CORREÇÃO: Inserir notas individualmente com verificação de duplicatas
          console.log('🔄 Inserindo relacionamentos de notas individualmente...')
          let notasSalvas = 0
          let notasDuplicadas = 0
          
          for (const relacionamento of todasNotasRelacionamentos) {
            try {
              // Verificar se nota_fiscal_id e relatorio_id são válidos
              if (!relacionamento.nota_fiscal_id) {
                console.error(`❌ nota_fiscal_id inválido para relacionamento:`, relacionamento)
                continue
              }
              
              if (!relacionamento.relatorio_id) {
                console.error(`❌ relatorio_id inválido para relacionamento:`, relacionamento)
                continue
              }
              
              // Verificar se já existe antes de inserir
              const { data: existing, error: checkError } = await supabase
                .from('relatorio_notas')
                .select('id')
                .eq('relatorio_id', relacionamento.relatorio_id)
                .eq('nota_fiscal_id', relacionamento.nota_fiscal_id)
                .maybeSingle()
              
              if (existing) {
                console.log(`⚠️ Nota ${relacionamento.nota_fiscal_id} já existe para este relatório`)
                notasDuplicadas++
                continue
              }
              
              // Inserir se não existir
              const { error: individualError } = await supabase
                .from('relatorio_notas')
                .insert(relacionamento)
              
              if (individualError) {
                console.error(`❌ Erro ao salvar nota individual ${relacionamento.nota_fiscal_id}:`, individualError)
              } else {
                console.log(`✅ Nota individual salva: ${relacionamento.nota_fiscal_id}`)
                notasSalvas++
              }
            } catch (error) {
              console.error(`❌ Erro geral ao salvar nota individual ${relacionamento.nota_fiscal_id}:`, error)
            }
          }
          
          console.log(`✅ Notas processadas: ${notasSalvas} salvas, ${notasDuplicadas} duplicadas`)
          
          // Salvar divergências se houver (para todas as notas com divergência)
          const divergencias = notasValidas
            .filter(nota => nota.divergencia)
            .map(nota => ({
              nota_fiscal_id: nota.id,
              tipo: 'volumes',
              descricao: 'Divergência de volumes',
              volumes_informados: nota.divergencia.volumesInformados,
              volumes_reais: nota.volumes,
              observacoes: nota.divergencia.observacoes
            }))
          
          if (divergencias.length > 0) {
            console.log('🔍 Salvando divergências:', divergencias)
            
            // Verificar se as divergências já existem antes de inserir
            const divergenciasParaSalvar = await Promise.all(
              divergencias.map(async (divergencia) => {
                const { data: divergenciaExistente, error: checkError } = await supabase
                  .from('divergencias')
                  .select('id')
                  .eq('nota_fiscal_id', divergencia.nota_fiscal_id)
                  .single()
                
                if (checkError || !divergenciaExistente) {
                  return divergencia
                } else {
                  console.log(`ℹ️ Divergência já existe para nota ${divergencia.nota_fiscal_id}`)
                  return null
                }
              })
            )
            
            const divergenciasNovas = divergenciasParaSalvar.filter(d => d !== null)
            
            if (divergenciasNovas.length > 0) {
              const { error: divergenciasError } = await supabase
                .from('divergencias')
                .insert(divergenciasNovas)
              
              if (divergenciasError) {
                console.error('❌ Erro ao salvar divergências:', divergenciasError)
              } else {
                console.log('✅ Divergências salvas:', divergenciasNovas.length)
              }
            } else {
              console.log('ℹ️ Todas as divergências já existem')
            }
          }
        } else {
          console.log('⚠️ Nenhuma nota válida para salvar')
        }
      } else {
        console.log('⚠️ Nenhuma nota para salvar ou formato inválido:', relatorio.notas)
      }
      
      console.log('✅ Relatório completo salvo com sucesso no banco')
    } catch (error) {
      console.error('❌ Erro ao salvar relatório:', error)
      throw error
    }
  },

  // Carregar relatórios
  async getRelatorios(): Promise<Relatorio[]> {
    try {
      console.log('📋 Tentando carregar relatórios do banco...')
      const { data, error } = await retryWithBackoffAndTimeout(async () => {
        return await getSupabase()
          .from('relatorios')
          .select('*')
          .order('created_at', { ascending: false })
      }, 60000) // Timeout de 60 segundos

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
          colaboradores: item.colaboradores ?? [],
          data: item.data,
          turno: item.turno,
          area: item.area ?? 'custos',
          quantidadeNotas: item.quantidade_notas ?? 0,
          somaVolumes: item.soma_volumes ?? 0,
          totalDivergencias: item.total_divergencias ?? 0,
          notas: item.notas ?? [],
          dataFinalizacao: item.data_finalizacao ?? new Date().toISOString(),
          status: item.status ?? 'liberado',
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
  }
}

// Serviço de Chat
export const ChatService = {
  // INSERT correto
  async saveMensagem(m: ChatMessage): Promise<void> {
    const { error } = await retryWithBackoff(async () =>
      getSupabase().from('messages').insert({
        id: m.id,
        remetente_id: m.remetenteId,
        remetente_nome: m.remetenteNome,
        remetente_tipo: m.remetenteTipo,
        destinatario_id: m.destinatarioId,
        mensagem: m.mensagem,
        timestamp: m.timestamp,
        lida: m.lida ?? false,
        created_at: new Date().toISOString(),
      })
    )
    if (error) throw error
  },

  // SELECT (conversa por área)
  async getMensagens(area: string): Promise<ChatMessage[]> {
    const { data, error } = await retryWithBackoff(async () =>
      getSupabase()
        .from('messages')
        .select('*')
        .eq('area', area)
        .order('timestamp', { ascending: true })
    )
    if (error) throw error
    return (data ?? []).map((it: any) => ({
      id: it.id,
      remetenteId: it.remetente_id,
      remetenteNome: it.remetente_nome,
      remetenteTipo: it.remetente_tipo,
      destinatarioId: it.destinatario_id,
      mensagem: it.mensagem,
      timestamp: it.timestamp,
      lida: it.lida,
    }))
  },

  // Marcar mensagens como lidas
  async markAsRead(conversaId: string, remetenteTipo: string): Promise<void> {
    try {
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('messages')
          .update({ lida: true })
          .eq('destinatario_id', conversaId)
          .eq('remetente_tipo', remetenteTipo)
          .eq('lida', false)
      })

      if (error) throw error
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error)
      throw error
    }
  },

  // Contar mensagens não lidas
  async countUnreadMessages(conversaId: string, remetenteTipo: string): Promise<number> {
    try {
      const { count, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('destinatario_id', conversaId)
          .eq('remetente_tipo', remetenteTipo)
          .eq('lida', false)
      })

      if (error) throw error

      return count || 0
    } catch (error) {
      console.error('Erro ao contar mensagens não lidas:', error)
      return 0
    }
  },

  // Validar se uma NF foi bipada no recebimento (para uso na embalagem)
  async validateNFForEmbalagem(numeroNF: string, data: string, turno: string): Promise<{ valido: boolean; nota?: NotaFiscal; erro?: string }> {
    try {
      console.log(`🔍 Validando NF ${numeroNF} para embalagem - Data: ${data}, Turno: ${turno}`)
      
      // Normalizar o número da NF (com e sem zeros à esquerda)
      const normalizedNF = normalizeNF(numeroNF)
      console.log(`📝 NF normalizada:`, normalizedNF)
      
      // Gerar janela diária para buscar NFs recebidas
      const dayRange = dayRangeBR(data)
      console.log(`📅 Janela diária: ${dayRange.start} até ${dayRange.end}`)
      
      // PRIMEIRA TENTATIVA: Buscar nas sessões de recebimento ativas
      console.log('🔍 Buscando NF nas sessões de recebimento ativas...')
      let notaEncontrada: NotaFiscal | undefined
      
      try {
        // Buscar todas as sessões de recebimento do dia
        const { data: sessions, error: sessionsError } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('sessions')
            .select('id')
            .eq('area', 'recebimento')
            .eq('data', data)
            .eq('turno', turno)
        })
        
        if (!sessionsError && sessions && sessions.length > 0) {
          console.log(`📋 Encontradas ${sessions.length} sessões de recebimento ativas`)
          
          // Buscar NFs em todas as sessões de recebimento do dia/turno
          const sessionIds = sessions.map(s => s.id)
          const { data: recebimentoData, error: recebimentoError } = await retryWithBackoff(async () => {
            return await getSupabase()
              .from('recebimento_notas')
              .select('notas')
              .in('session_id', sessionIds)
          })
          
          if (!recebimentoError && recebimentoData && recebimentoData.length > 0) {
            // Procurar pela NF em todas as sessões
            for (const recebimento of recebimentoData) {
              if (recebimento.notas && Array.isArray(recebimento.notas)) {
                // Procurar por diferentes formatos da NF
                const nota = recebimento.notas.find((n: NotaFiscal) => 
                  n.numeroNF === numeroNF || 
                  n.numeroNF === normalizedNF.withZeros || 
                  n.numeroNF === normalizedNF.withoutZeros ||
                  n.codigoCompleto.includes(numeroNF) ||
                  n.codigoCompleto.includes(normalizedNF.withZeros) ||
                  n.codigoCompleto.includes(normalizedNF.withoutZeros)
                )
                
                                 if (nota) {
                   notaEncontrada = nota
                   console.log(`✅ NF ${numeroNF} encontrada na sessão ativa`)
                   break
                 }
              }
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Erro ao buscar nas sessões ativas, tentando relatórios:', error)
      }
      
      // SEGUNDA TENTATIVA: Se não encontrou nas sessões, buscar nos relatórios finalizados
      if (!notaEncontrada) {
        console.log('🔍 NF não encontrada nas sessões ativas, buscando nos relatórios finalizados...')
        
        try {
          const { data: relatoriosData, error: relatoriosError } = await retryWithBackoffAndTimeout(async () => {
            return await getSupabase()
              .from('relatorios')
              .select('*')
              .eq('area', 'recebimento')
              .eq('data', data)
              .eq('turno', turno)
              .eq('status', 'liberado')
          }, 60000) // Timeout de 60 segundos
          
          if (!relatoriosError && relatoriosData && relatoriosData.length > 0) {
            console.log(`📋 Encontrados ${relatoriosData.length} relatórios finalizados de recebimento`)
            
            // Procurar pela NF em todos os relatórios
            for (const relatorio of relatoriosData) {
              if (relatorio.notas && Array.isArray(relatorio.notas)) {
                console.log(`�� Verificando relatório: ${relatorio.nome} (${relatorio.notas.length} NFs)`)
                
                // Procurar por diferentes formatos da NF
                const nota = relatorio.notas.find((n: NotaFiscal) => 
                  n.numeroNF === numeroNF || 
                  n.numeroNF === normalizedNF.withZeros || 
                  n.numeroNF === normalizedNF.withoutZeros ||
                  n.codigoCompleto.includes(numeroNF) ||
                  n.codigoCompleto.includes(normalizedNF.withZeros) ||
                  n.codigoCompleto.includes(normalizedNF.withoutZeros)
                )
                
                if (nota) {
                  notaEncontrada = nota
                  console.log(`✅ NF ${numeroNF} encontrada no relatório finalizado: ${relatorio.nome}`)
                  break
                }
              }
            }
          } else if (relatoriosError) {
            console.warn('⚠️ Erro ao buscar relatórios:', relatoriosError)
          }
        } catch (error) {
          console.warn('⚠️ Erro ao buscar nos relatórios:', error)
        }
      }
      
      // TERCEIRA TENTATIVA: Buscar em relatórios de outros dias (últimos 7 dias)
      if (!notaEncontrada) {
        console.log('🔍 NF não encontrada nos relatórios do dia, buscando em relatórios dos últimos 7 dias...')
        
        try {
          // Calcular data de 7 dias atrás
          const dataAtual = new Date()
          const data7DiasAtras = new Date(dataAtual.getTime() - (7 * 24 * 60 * 60 * 1000))
          const dataFormatada = data7DiasAtras.toLocaleDateString('pt-BR')
          
          const { data: relatoriosAntigosData, error: relatoriosAntigosError } = await retryWithBackoffAndTimeout(async () => {
            return await getSupabase()
              .from('relatorios')
              .select('*')
              .eq('area', 'recebimento')
              .eq('status', 'liberado')
              .gte('data', dataFormatada)
              .order('data', { ascending: false })
              .limit(50) // Limitar a 50 relatórios para performance
          }, 60000) // Timeout de 60 segundos
          
          if (!relatoriosAntigosError && relatoriosAntigosData && relatoriosAntigosData.length > 0) {
            console.log(`📋 Verificando ${relatoriosAntigosData.length} relatórios dos últimos 7 dias`)
            
            // Procurar pela NF em todos os relatórios antigos
            for (const relatorio of relatoriosAntigosData) {
              if (relatorio.notas && Array.isArray(relatorio.notas)) {
                // Procurar por diferentes formatos da NF
                const nota = relatorio.notas.find((n: NotaFiscal) => 
                  n.numeroNF === numeroNF || 
                  n.numeroNF === normalizedNF.withZeros || 
                  n.numeroNF === normalizedNF.withoutZeros ||
                  n.codigoCompleto.includes(numeroNF) ||
                  n.codigoCompleto.includes(normalizedNF.withZeros) ||
                  n.codigoCompleto.includes(normalizedNF.withoutZeros)
                )
                
                if (nota) {
                  notaEncontrada = nota
                  console.log(`✅ NF ${numeroNF} encontrada no relatório antigo: ${relatorio.nome} (${relatorio.data} - ${relatorio.turno})`)
                  break
                }
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ Erro ao buscar relatórios antigos:', error)
        }
      }
      
      if (notaEncontrada) {
        console.log(`✅ NF ${numeroNF} validada com sucesso para embalagem`)
        return { 
          valido: true, 
          nota: notaEncontrada 
        }
      } else {
        console.log(`❌ NF ${numeroNF} não encontrada em nenhum lugar`)
        return { 
          valido: false, 
          erro: `NF ${numeroNF} não foi bipada no Recebimento. Verifique se a NF foi processada e o relatório foi finalizado.` 
        }
      }
      
    } catch (error) {
      console.error('❌ Erro ao validar NF para embalagem:', error)
      return { 
        valido: false, 
        erro: `Erro interno ao validar NF: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }
    }
  }
}

// Função para migrar dados do localStorage para o banco
export const migrateFromLocalStorage = async () => {
  try {
    console.log('🔄 Iniciando migração do localStorage para o banco...')

    // Verificar se há dados para migrar
    const hasData = Array.from({ length: localStorage.length }, (_, i) => {
      const key = localStorage.key(i)
      return key && (
        key.startsWith('recebimento_') ||
        key.startsWith('embalagem_') ||
        key === 'sistema_session' ||
        key === 'relatorios_custos' ||
        key === 'profarma_carros_embalagem'
      )
    }).some(Boolean)

    if (!hasData) {
      console.log('ℹ️ Nenhum dado encontrado no localStorage para migrar')
      return
    }

    // Migrar sessões
    const sessionData = localStorage.getItem('sistema_session')
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData)
        await SessionService.saveSession(session)
        console.log('✅ Sessão migrada com sucesso')
      } catch (error) {
        console.warn('⚠️ Erro ao migrar sessão:', error)
        // Continuar com outras migrações
      }
    }

    // Migrar notas de recebimento
    let recebimentoCount = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('recebimento_')) {
        try {
          const notas = JSON.parse(localStorage.getItem(key) || '[]')
          if (notas.length > 0) {
            await RecebimentoService.saveNotas(key, notas)
            recebimentoCount++
            console.log(`
              ✅ Notas de recebimento migradas: ${recebimentoCount} sessões
            `)
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao migrar notas de recebimento da sessão ${key}:`, error)
          // Continuar com outras migrações
        }
      }
    }

    // Migrar carros de embalagem
    let embalagemCount = 0
    const embalagemData = localStorage.getItem('profarma_carros_embalagem')
    if (embalagemData) {
      try {
        const carros = JSON.parse(embalagemData)
        if (carros.length > 0) {
          await EmbalagemService.saveCarros('embalagem_migrada', carros)
          embalagemCount++
          console.log(`✅ Carros de embalagem migrados: ${embalagemCount} sessões`)
        }
      } catch (error) {
        console.warn('⚠️ Erro ao migrar carros de embalagem:', error)
        // Continuar com outras migrações
      }
    }

    // Migrar relatórios de custos
    let custosCount = 0
    const custosData = localStorage.getItem('relatorios_custos')
    if (custosData) {
      try {
        const relatorios = JSON.parse(custosData)
        if (relatorios.length > 0) {
          for (const relatorio of relatorios) {
            await RelatoriosService.saveRelatorio(relatorio)
            custosCount++
          }
          console.log(`✅ Relatórios de custos migrados: ${custosCount} relatórios`)
        }
      } catch (error) {
        console.warn('⚠️ Erro ao migrar relatórios de custos:', error)
        // Continuar com outras migrações
      }
    }

    console.log(`✅ Migração concluída! Total: ${recebimentoCount + embalagemCount + custosCount} itens migrados`)
  } catch (error) {
    console.error('❌ Erro durante a migração:', error)
    throw error
  }
}