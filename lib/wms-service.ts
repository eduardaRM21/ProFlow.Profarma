import { getSupabase, retryWithBackoff } from './supabase-client'
import type { NotaFiscal } from './database-service'
import { obterDestinoCompleto, obterDestinoPreferencial, isPosicaoPreferencial } from './wms-utils'

// Interfaces WMS
export interface WMSCarga {
  id: string
  codigo_carga: string
  cliente_destino: string
  destino: string
  status: 'montada' | 'aguardando_armazenagem' | 'armazenada' | 'liberada_para_expedicao'
  quantidade_paletes: number
  quantidade_gaiolas: number
  quantidade_caixas_mangas: number
  total_volumes: number
  total_nfs: number
  data_criacao: string
  data_armazenamento?: string
  data_liberacao?: string
  observacoes?: string
  notas?: any[] // Array JSONB com todas as notas fiscais do carro
}

export interface WMSPalete {
  id: string
  codigo_palete: string
  carga_id?: string
  posicao_id?: string
  status: 'em_montagem' | 'aguardando_armazenagem' | 'armazenado' | 'em_movimento' | 'expedido'
  quantidade_volumes: number
  quantidade_nfs: number
  quantidade_posicoes?: number
  peso_estimado?: number
  data_criacao: string
  data_armazenamento?: string
  data_expedicao?: string
  posicao?: WMSPosicao
  notas?: NotaFiscal[]
}

export interface WMSPosicao {
  id: string
  codigo_posicao: string
  rua: number
  nivel: number
  posicao?: number // Número da posição (ex: 001, 020) - extraído do código
  status: 'disponivel' | 'ocupada' | 'bloqueada'
  palete_id?: string
  capacidade_peso: number
  cliente_preferencial?: string
  destino_preferencial?: string
  data_ocupacao?: string
  data_liberacao?: string
  observacoes?: string
  palete?: WMSPalete
}

export interface WMSPaleteNotaItem {
  numero_nf: string
  codigo_completo: string
  fornecedor?: string
  cliente_destino?: string
  destino?: string
  volumes: number
  data_associacao: string
}

export interface WMSPaleteNota {
  id: string
  palete_id: string
  cliente_destino?: string
  destino?: string
  total_volumes: number
  notas: WMSPaleteNotaItem[]
  data_associacao: string
  created_at: string
  updated_at: string
}

export interface WMSSugestaoPosicao {
  posicao: WMSPosicao
  score: number
  motivo: string
  compatibilidade_cliente: boolean
  compatibilidade_destino: boolean
  nivel_preferido: boolean
}

export interface WMSSugestaoConjuntoPosicoes {
  posicoes: WMSPosicao[]
  score: number
  motivo: string
  compatibilidade_cliente: boolean
  compatibilidade_destino: boolean
  nivel_preferido: boolean
  posicao_inicial: WMSPosicao
}

// Serviço WMS
export const WMSService = {
  // ========== CARGAS ==========
  
  async criarCarga(dados: {
    cliente_destino: string
    destino: string
    observacoes?: string
    carro_id?: string // ID do carro para evitar duplicatas
  }): Promise<WMSCarga> {
    try {
      // Validar dados obrigatórios
      if (!dados.cliente_destino || !dados.destino) {
        throw new Error('cliente_destino e destino são obrigatórios para criar carga')
      }

      console.log('🔍 Verificando se já existe carga para:', { 
        cliente_destino: dados.cliente_destino, 
        destino: dados.destino, 
        carro_id: dados.carro_id 
      })

      // Verificar se já existe uma carga com os mesmos dados e status 'montada' ou 'aguardando_armazenagem'
      // Se houver carro_id, verificar também nas observações (temporário até adicionar campo carro_id na tabela)
      let cargaExistente: any = null
      let errorBusca: any = null
      
      // Primeiro, se houver carro_id, tentar encontrar carga específica do carro
      if (dados.carro_id) {
        const { data, error } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_cargas')
            .select('*')
            .eq('cliente_destino', dados.cliente_destino)
            .eq('destino', dados.destino)
            .in('status', ['montada', 'aguardando_armazenagem'])
            .ilike('observacoes', `%Carro: ${dados.carro_id}%`)
            .order('data_criacao', { ascending: false })
            .limit(1)
            .maybeSingle()
        })
        
        if (data && !error) {
          cargaExistente = data
          errorBusca = error
          console.log('✅ Carga existente encontrada para o carro:', dados.carro_id)
        } else if (error) {
          console.warn('⚠️ Erro ao buscar carga existente por carro_id:', error)
        }
      }
      
      // Se não encontrou carga específica do carro, buscar por cliente_destino e destino
      // MAS APENAS se não tiver carro_id (para evitar reutilizar carga de outro carro)
      if (!cargaExistente && !dados.carro_id) {
        console.log('🔍 Buscando carga existente por destino (sem carro_id específico)')
        const { data, error } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_cargas')
            .select('*')
            .eq('cliente_destino', dados.cliente_destino)
            .eq('destino', dados.destino)
            .in('status', ['montada', 'aguardando_armazenagem'])
            .order('data_criacao', { ascending: false })
            .limit(1)
            .maybeSingle()
        })
        
        cargaExistente = data
        errorBusca = error
        
        if (data && !error) {
          console.log('✅ Carga existente encontrada para destino:', dados.destino)
        } else if (error) {
          console.warn('⚠️ Erro ao buscar carga existente:', error)
        } else {
          console.log('ℹ️ Nenhuma carga existente encontrada para destino:', dados.destino)
        }
      } else if (!cargaExistente && dados.carro_id) {
        console.log('ℹ️ Nenhuma carga encontrada para o carro específico, criando nova carga')
      }
      
      // Se já existe uma carga com os mesmos dados e ainda não foi finalizada, retornar ela
      // IMPORTANTE: Só reutilizar se não tiver carro_id OU se a carga já tiver o mesmo carro_id
      if (cargaExistente && !errorBusca) {
        // Se tem carro_id, verificar se a carga já tem esse carro nas observações
        if (dados.carro_id) {
          const observacoesAtuais = cargaExistente.observacoes as string | null | undefined
          const observacoesStr = observacoesAtuais || ''
          const temEsteCarro = observacoesStr.includes(`Carro: ${dados.carro_id}`)
          
          if (temEsteCarro) {
            console.log('✅ Carga existente já contém este carro, reutilizando:', cargaExistente.codigo_carga)
            return cargaExistente as unknown as WMSCarga
          } else {
            // Carga existe mas é de outro carro, criar nova
            console.log('⚠️ Carga existente é de outro carro, criando nova carga para:', dados.carro_id)
            cargaExistente = null // Forçar criação de nova carga
          }
        } else {
          // Sem carro_id, pode reutilizar
          console.log('✅ Carga existente encontrada, reutilizando:', cargaExistente.codigo_carga)
          return cargaExistente as unknown as WMSCarga
        }
      }
      
      // Se chegou aqui, não há carga existente ou é de outro carro, então criar nova
      if (cargaExistente) {
        console.log('🔄 Forçando criação de nova carga (carga existente é de outro carro)')
      }
      
      // Se não existe, criar uma nova carga
      console.log('🚀 INICIANDO CRIAÇÃO DE NOVA CARGA')
      
      // Gerar código único usando a função SQL
      let codigo_carga: string
      try {
        const { data: codigoData, error: codigoError } = await retryWithBackoff(async () => {
          return await getSupabase()
            .rpc('gerar_codigo_carga')
        })
        
        if (codigoError) {
          console.error('❌ Erro ao gerar código da carga via RPC:', codigoError)
          // Se a função não existe (PGRST202), usar fallback
          if (codigoError.code === 'PGRST202' || codigoError.message?.includes('Could not find the function')) {
            console.warn('⚠️ Função gerar_codigo_carga não encontrada. Execute o script create-carga-sequence.sql no banco de dados.')
            console.warn('⚠️ Usando fallback: código baseado em contador')
          }
          // Fallback: buscar o maior código existente e incrementar
          try {
            const { data: cargasExistentes } = await retryWithBackoff(async () => {
              return await getSupabase()
                .from('wms_cargas')
                .select('codigo_carga')
                .order('created_at', { ascending: false })
                .limit(10) // Buscar mais registros para encontrar o maior número
            })
            
            let maiorNumero = 0
            
            if (cargasExistentes && cargasExistentes.length > 0) {
              // Procurar o maior número em todos os códigos
              for (const carga of cargasExistentes) {
                const codigo = (carga as any).codigo_carga as string
                // Tentar extrair número do código (formato CAR-00001, CAR-123, CARGA-123456, etc.)
                const match = codigo?.match(/CAR-?(\d+)/)
                if (match) {
                  const numero = parseInt(match[1])
                  if (numero > maiorNumero) {
                    maiorNumero = numero
                  }
                }
              }
            }
            
            // Incrementar o maior número encontrado (ou começar do 1 se não encontrou nenhum)
            const proximoNumero = maiorNumero + 1
            codigo_carga = `CAR-${String(proximoNumero).padStart(5, '0')}`
            console.log(`✅ Código da carga gerado via fallback: ${codigo_carga}`)
          } catch (fallbackError) {
            console.error('❌ Erro no fallback de geração de código:', fallbackError)
            // Se o fallback também falhar, usar contador simples baseado em timestamp curto
            const timestampCurto = String(Date.now()).slice(-6) // Últimos 6 dígitos
            codigo_carga = `CAR-${timestampCurto}`
          }
        } else if (codigoData) {
          codigo_carga = codigoData as string
          console.log('✅ Código da carga gerado:', codigo_carga)
        } else {
          // Se não retornou dados, usar fallback
          console.warn('⚠️ Função retornou vazio, usando fallback')
          const timestampCurto = String(Date.now()).slice(-8)
          codigo_carga = `CAR-${timestampCurto}`
        }
      } catch (error) {
        console.error('❌ Erro ao chamar função gerar_codigo_carga:', error)
        // Fallback: usar timestamp curto (últimos 8 dígitos)
        const timestampCurto = String(Date.now()).slice(-8)
        codigo_carga = `CAR-${timestampCurto}`
      }
      
      // Preparar observações incluindo carro_id se fornecido
      let observacoes = dados.observacoes || ''
      if (dados.carro_id) {
        observacoes = observacoes 
          ? `${observacoes}; Carro: ${dados.carro_id}`
          : `Carro: ${dados.carro_id}`
      }
      
      const dadosParaInserir = {
        codigo_carga,
        cliente_destino: dados.cliente_destino,
        destino: dados.destino,
        status: 'montada',
        observacoes: observacoes,
        notas: [] // Inicializar array vazio de notas
      }
      
      console.log('📦 Dados para inserir na tabela wms_cargas:', dadosParaInserir)
      console.log('📦 Criando nova carga:', { 
        codigo_carga, 
        cliente_destino: dados.cliente_destino, 
        destino: dados.destino,
        observacoes 
      })
      
      const { data, error } = await retryWithBackoff(async () => {
        console.log('🔄 Tentando inserir carga no banco...')
        const result = await getSupabase()
          .from('wms_cargas')
          .insert(dadosParaInserir)
          .select()
          .single()
        console.log('🔄 Resultado do insert:', { data: result.data, error: result.error })
        return result
      })
      
      if (error) {
        console.error('❌ Erro ao inserir carga no banco:', error)
        console.error('❌ Detalhes do erro:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      if (!data) {
        console.error('❌ Dados não retornados ao criar carga')
        console.error('❌ Response completo:', { data, error })
        throw new Error('Dados não retornados ao criar carga')
      }
      
      console.log('✅ Nova carga criada com sucesso:', { 
        id: data.id, 
        codigo_carga: data.codigo_carga,
        cliente_destino: data.cliente_destino,
        destino: data.destino,
        status: data.status
      })
      console.log('✅ Carga inserida na tabela wms_cargas com ID:', data.id)
      return data as unknown as WMSCarga
    } catch (error) {
      console.error('❌ Erro ao criar carga:', error)
      if (error instanceof Error) {
        console.error('❌ Mensagem de erro:', error.message)
        console.error('❌ Stack trace:', error.stack)
      }
      throw error
    }
  },

  async buscarCarga(id: string): Promise<WMSCarga | null> {
    try {
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_cargas')
          .select('*')
          .eq('id', id)
          .single()
      })
      
      if (error) throw error
      if (!data) return null
      return data as unknown as WMSCarga
    } catch (error) {
      console.error('❌ Erro ao buscar carga:', error)
      return null
    }
  },

  async atualizarCarga(id: string, updates: Partial<WMSCarga>): Promise<void> {
    try {
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_cargas')
          .update(updates)
          .eq('id', id)
      })
      
      if (error) throw error
    } catch (error) {
      console.error('❌ Erro ao atualizar carga:', error)
      throw error
    }
  },

  async listarCargas(filtros?: {
    status?: string
    cliente_destino?: string
  }): Promise<WMSCarga[]> {
    try {
      let query = getSupabase()
        .from('wms_cargas')
        .select('*')
        .order('data_criacao', { ascending: false })
      
      if (filtros?.status) {
        query = query.eq('status', filtros.status)
      }
      if (filtros?.cliente_destino) {
        query = query.eq('cliente_destino', filtros.cliente_destino)
      }
      
      const { data, error } = await retryWithBackoff(async () => query)
      
      if (error) throw error
      return (data || []) as unknown as WMSCarga[]
    } catch (error) {
      console.error('❌ Erro ao listar cargas:', error)
      return []
    }
  },

  // ========== PALETES ==========
  
  async criarPalete(dados: {
    carga_id?: string
    codigo_palete?: string
    numeroSequencia?: number // Número da sequência (ex: 1, 2, 3)
    total?: number // Total de paletes (ex: 3)
  }): Promise<WMSPalete> {
    try {
      let codigo_palete = dados.codigo_palete
      
      // Se não foi fornecido um código, gerar um único usando a função SQL
      if (!codigo_palete) {
        try {
          const { data: codigoData, error: codigoError } = await retryWithBackoff(async () => {
            return await getSupabase()
              .rpc('gerar_codigo_palete')
          })
          
          let codigoBase = ''
          
          if (codigoError) {
            console.error('❌ Erro ao gerar código do palete via RPC:', codigoError)
            // Se a função não existe (PGRST202), usar fallback
            if (codigoError.code === 'PGRST202' || codigoError.message?.includes('Could not find the function')) {
              console.warn('⚠️ Função gerar_codigo_palete não encontrada. Execute o script create-palete-sequence.sql no banco de dados.')
              console.warn('⚠️ Usando fallback: código baseado em timestamp')
            }
            // Fallback para timestamp se a função SQL não estiver disponível
            codigoBase = `PAL-${Date.now()}`
          } else if (codigoData) {
            codigoBase = codigoData as string
            console.log('✅ Código base do palete gerado:', codigoBase)
          } else {
            // Se não retornou dados, usar fallback
            console.warn('⚠️ Função retornou vazio, usando fallback')
            codigoBase = `PAL-${Date.now()}`
          }
          
          // Se houver número de sequência e total, adicionar sufixo (_1-3, _2-3, etc.)
          if (dados.numeroSequencia && dados.total) {
            codigo_palete = `${codigoBase}_${dados.numeroSequencia}-${dados.total}`
            console.log(`✅ Código do palete com sufixo: ${codigo_palete}`)
          } else {
            codigo_palete = codigoBase
          }
        } catch (error) {
          console.error('❌ Erro ao chamar função gerar_codigo_palete:', error)
          // Fallback para timestamp em caso de erro
          const codigoBase = `PAL-${Date.now()}`
          if (dados.numeroSequencia && dados.total) {
            codigo_palete = `${codigoBase}_${dados.numeroSequencia}-${dados.total}`
          } else {
            codigo_palete = codigoBase
          }
        }
      }
      
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_paletes')
          .insert({
            codigo_palete,
            carga_id: dados.carga_id,
            status: 'em_montagem'
          })
          .select()
          .single()
      })
      
      if (error) throw error
      if (!data) throw new Error('Dados não retornados ao criar palete')
      return data as unknown as WMSPalete
    } catch (error) {
      console.error('❌ Erro ao criar palete:', error)
      throw error
    }
  },

  async buscarPalete(id: string): Promise<WMSPalete | null> {
    try {
      // Buscar palete primeiro
      const { data: paleteData, error: paleteError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_paletes')
          .select('*')
          .eq('id', id)
          .single()
      })
      
      if (paleteError || !paleteData) {
        throw paleteError || new Error('Palete não encontrado')
      }
      
      // Buscar posição separadamente se houver posicao_id
      let posicao = null
      if (paleteData.posicao_id) {
        const { data: posicaoData } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_posicoes')
            .select('*')
            .eq('id', paleteData.posicao_id as string)
            .single()
        })
        posicao = posicaoData
      }
      
      // Buscar notas do palete
      const { data: paleteNotasData } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('*')
          .eq('palete_id', id)
          .maybeSingle()
      })
      
      // Extrair array de notas do registro
      const notasArray = (paleteNotasData?.notas as any[]) || []
      
      return {
        ...paleteData,
        posicao,
        notas: notasArray
      } as unknown as WMSPalete
    } catch (error) {
      console.error('❌ Erro ao buscar palete:', error)
      return null
    }
  },

  async buscarPaletePorCodigo(codigo: string): Promise<WMSPalete | null> {
    try {
      // Buscar palete primeiro
      const { data: paleteData, error: paleteError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_paletes')
          .select('*')
          .eq('codigo_palete', codigo)
          .single()
      })
      
      if (paleteError || !paleteData) {
        throw paleteError || new Error('Palete não encontrado')
      }
      
      // Buscar posição separadamente se houver posicao_id
      let posicao = null
      if (paleteData.posicao_id) {
        const { data: posicaoData } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_posicoes')
            .select('*')
            .eq('id', paleteData.posicao_id as string)
            .single()
        })
        posicao = posicaoData
      }
      
      // Buscar notas do palete
      const { data: paleteNotasData } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('*')
          .eq('palete_id', paleteData.id as string)
          .maybeSingle()
      })
      
      // Extrair array de notas do registro
      const notasArray = (paleteNotasData?.notas as any[]) || []
      
      return {
        ...paleteData,
        posicao,
        notas: notasArray
      } as unknown as WMSPalete
    } catch (error) {
      console.error('❌ Erro ao buscar palete por código:', error)
      return null
    }
  },

  async atualizarPalete(id: string, updates: Partial<WMSPalete>): Promise<void> {
    try {
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_paletes')
          .update(updates)
          .eq('id', id)
      })
      
      if (error) throw error
    } catch (error) {
      console.error('❌ Erro ao atualizar palete:', error)
      throw error
    }
  },

  /**
   * Adiciona múltiplas notas ao palete de uma vez (otimizado para performance)
   */
  async adicionarNotasAoPalete(palete_id: string, notas: NotaFiscal[]): Promise<void> {
    try {
      if (!notas || notas.length === 0) return

      // Buscar registro do palete (pode não existir ainda)
      const { data: paleteNotasExistente } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('*')
          .eq('palete_id', palete_id)
          .maybeSingle()
      })

      // Preparar array de notas
      const notasItems: WMSPaleteNotaItem[] = notas.map(nota => ({
        numero_nf: nota.numeroNF,
        codigo_completo: nota.codigoCompleto,
        fornecedor: nota.fornecedor,
        cliente_destino: nota.clienteDestino,
        destino: nota.destino,
        volumes: nota.volumes,
        data_associacao: new Date().toISOString()
      }))

      let notasArray: WMSPaleteNotaItem[] = []
      let clienteDestino = notas[0]?.clienteDestino || ''
      let destino = notas[0]?.destino || ''

      if (paleteNotasExistente) {
        // Se já existe registro, usar os dados existentes
        notasArray = (paleteNotasExistente.notas as any[]) || []
        clienteDestino = typeof paleteNotasExistente.cliente_destino === 'string' ? paleteNotasExistente.cliente_destino : (notas[0]?.clienteDestino || '')
        destino = typeof paleteNotasExistente.destino === 'string' ? paleteNotasExistente.destino : (notas[0]?.destino || '')
        
        // Adicionar novas notas, evitando duplicatas
        notasItems.forEach(notaItem => {
          const index = notasArray.findIndex(n => n.numero_nf === notaItem.numero_nf)
          if (index >= 0) {
            // Atualizar nota existente
            notasArray[index] = notaItem
          } else {
            // Adicionar nova nota
            notasArray.push(notaItem)
          }
        })
      } else {
        // Se não existe registro, usar as notas fornecidas
        notasArray = notasItems
      }

      // Calcular total de volumes
      const totalVolumes = notasArray.reduce((sum, n) => sum + (n.volumes || 0), 0)

      // Usar upsert para criar ou atualizar o registro do palete
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .upsert({
            palete_id,
            cliente_destino: clienteDestino,
            destino: destino,
            total_volumes: totalVolumes,
            notas: notasArray
          }, {
            onConflict: 'palete_id'
          })
      })

      if (error) throw error

      console.log(`✅ ${notas.length} nota(s) adicionada(s) ao palete ${palete_id}. Total de volumes: ${totalVolumes}`)

      // Atualizar contadores do palete
      await this.atualizarContadoresPalete(palete_id)
    } catch (error) {
      console.error('❌ Erro ao adicionar notas ao palete:', error)
      throw error
    }
  },

  async adicionarNotaAoPalete(palete_id: string, nota: NotaFiscal): Promise<void> {
    try {
      // Buscar registro do palete (pode não existir ainda)
      const { data: paleteNotasExistente } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('*')
          .eq('palete_id', palete_id)
          .maybeSingle()
      })
      
      // Preparar objeto da nota para adicionar ao array
      const notaItem: WMSPaleteNotaItem = {
        numero_nf: nota.numeroNF,
        codigo_completo: nota.codigoCompleto,
        fornecedor: nota.fornecedor,
        cliente_destino: nota.clienteDestino,
        destino: nota.destino,
        volumes: nota.volumes,
        data_associacao: new Date().toISOString()
      }
      
      let notasArray: WMSPaleteNotaItem[] = []
      let totalVolumes = 0
      let clienteDestino = nota.clienteDestino || ''
      let destino = nota.destino || ''
      
      if (paleteNotasExistente) {
        // Se já existe registro para o palete, usar os dados existentes
        notasArray = (paleteNotasExistente.notas as any[]) || []
        totalVolumes = typeof paleteNotasExistente.total_volumes === 'number' ? paleteNotasExistente.total_volumes : 0
        clienteDestino = typeof paleteNotasExistente.cliente_destino === 'string' ? paleteNotasExistente.cliente_destino : (nota.clienteDestino || '')
        destino = typeof paleteNotasExistente.destino === 'string' ? paleteNotasExistente.destino : (nota.destino || '')
        
        // Verificar se a nota já está no array (evitar duplicatas)
        const notaJaExiste = notasArray.find(n => n.numero_nf === nota.numeroNF)
        
        if (notaJaExiste) {
          // Se a nota já existe, atualizar os dados dela no array
          const numeroNF = nota.numeroNF || notaItem.numero_nf || 'N/A'
          console.log(`ℹ️ Nota ${numeroNF} já está no palete ${palete_id}. Atualizando dados.`)
          const index = notasArray.findIndex(n => n.numero_nf === nota.numeroNF)
          // Remover volumes antigos do total
          totalVolumes = totalVolumes - (notaJaExiste.volumes || 0)
          // Atualizar a nota no array
          notasArray[index] = notaItem
        } else {
          // Adicionar nova nota ao array
          notasArray.push(notaItem)
        }
      } else {
        // Se não existe registro, criar novo array com a primeira nota
        notasArray = [notaItem]
      }
      
      // Calcular novo total de volumes
      totalVolumes = notasArray.reduce((sum, n) => sum + (n.volumes || 0), 0)
      
      // Usar upsert para criar ou atualizar o registro do palete
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .upsert({
            palete_id,
            cliente_destino: clienteDestino,
            destino: destino,
            total_volumes: totalVolumes,
            notas: notasArray
          }, {
            onConflict: 'palete_id'
          })
      })
      
      if (error) throw error
      
      const numeroNF = nota.numeroNF || notaItem.numero_nf || 'N/A'
      console.log(`✅ Nota ${numeroNF} adicionada ao palete ${palete_id}. Total de volumes: ${totalVolumes}`)
      
      // Atualizar contadores do palete
      await this.atualizarContadoresPalete(palete_id)
      
      // NÃO atualizar campo notas na carga aqui - será feito em batch no final
      // Isso melhora significativamente a performance
    } catch (error) {
      console.error('❌ Erro ao adicionar nota ao palete:', error)
      throw error
    }
  },

  async removerNotaDoPalete(palete_id: string, numero_nf: string): Promise<void> {
    try {
      // Buscar palete para obter carga_id antes de remover a nota
      const palete = await this.buscarPalete(palete_id)
      
      // Buscar registro do palete
      const { data: paleteNotas } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('*')
          .eq('palete_id', palete_id)
          .maybeSingle()
      })
      
      if (!paleteNotas) {
        console.log(`ℹ️ Nenhum registro encontrado para o palete ${palete_id}`)
        return
      }
      
      // Remover a nota do array
      const notasArray = (paleteNotas.notas as any[]) || []
      const notaRemovida = notasArray.find(n => n.numero_nf === numero_nf)
      const novasNotas = notasArray.filter(n => n.numero_nf !== numero_nf)
      
      // Calcular novo total de volumes
      const totalVolumes = novasNotas.reduce((sum, n) => sum + (n.volumes || 0), 0)
      
      // Se não houver mais notas, remover o registro completamente
      if (novasNotas.length === 0) {
        const { error } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_palete_notas')
            .delete()
            .eq('palete_id', palete_id)
        })
        if (error) throw error
        console.log(`✅ Nota ${numero_nf} removida e registro do palete ${palete_id} deletado (sem mais notas)`)
      } else {
        // Atualizar o registro com o novo array de notas
        const { error } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_palete_notas')
            .update({
              notas: novasNotas,
              total_volumes: totalVolumes
            })
            .eq('palete_id', palete_id)
        })
        if (error) throw error
        console.log(`✅ Nota ${numero_nf} removida do palete ${palete_id}. Total de volumes: ${totalVolumes}`)
      }
      
      // Atualizar contadores do palete
      await this.atualizarContadoresPalete(palete_id)
      
      // Atualizar campo notas na carga (se o palete tiver carga_id)
      if (palete?.carga_id) {
        await this.atualizarNotasCarga(palete.carga_id)
      }
    } catch (error) {
      console.error('❌ Erro ao remover nota do palete:', error)
      throw error
    }
  },

  async atualizarContadoresPalete(palete_id: string): Promise<void> {
    try {
      // Buscar registro do palete com array de notas
      const { data: paleteNotas } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('notas, total_volumes')
          .eq('palete_id', palete_id)
          .maybeSingle()
      })
      
      const notasArray = (paleteNotas?.notas as any[]) || []
      const total_volumes = paleteNotas?.total_volumes || notasArray.reduce((acc, n) => {
        const volumes = typeof n.volumes === 'number' ? n.volumes : Number(n.volumes) || 0
        return acc + volumes
      }, 0)
      const quantidade_nfs = notasArray.length
      
      // Buscar palete para obter carga_id antes de atualizar
      const palete = await this.buscarPalete(palete_id)
      
      await this.atualizarPalete(palete_id, {
        quantidade_volumes: total_volumes,
        quantidade_nfs: quantidade_nfs
      })
      
      // Se o palete tiver carga associada, atualizar notas e recalcular contadores da carga
      if (palete?.carga_id) {
        // Primeiro atualizar o campo notas da carga
        await this.atualizarNotasCarga(palete.carga_id)
        
        // Depois recalcular contadores baseado nas notas únicas
        await this.recalcularContadoresCarga(palete.carga_id)
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar contadores do palete:', error)
    }
  },

  /**
   * Corrige os contadores de todos os paletes de uma carga específica
   * Atualiza quantidade_volumes e quantidade_nfs com os valores totais da carga
   */
  async corrigirContadoresPaletesCarga(carga_id: string): Promise<void> {
    try {
      const carga = await this.buscarCarga(carga_id)
      if (!carga) {
        console.warn(`⚠️ Carga ${carga_id} não encontrada`)
        return
      }

      // Calcular totais da carga
      const notasUnicas = carga.notas || []
      const total_volumes = notasUnicas.reduce((acc, nota) => {
        const volumes = typeof nota.volumes === 'number' 
          ? nota.volumes 
          : Number(nota.volumes) || 0
        return acc + volumes
      }, 0)
      const total_nfs = notasUnicas.length

      // Buscar todos os paletes da carga
      const { data: todosPaletes } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_paletes')
          .select('id, codigo_palete')
          .eq('carga_id', carga_id)
      })

      if (!todosPaletes || todosPaletes.length === 0) {
        console.warn(`⚠️ Nenhum palete encontrado para a carga ${carga_id}`)
        return
      }

      console.log(`🔧 Corrigindo ${todosPaletes.length} palete(s) da carga ${carga.codigo_carga}...`)
      console.log(`   - Total volumes: ${total_volumes}`)
      console.log(`   - Total NFs: ${total_nfs}`)

      // Atualizar todos os paletes
      for (const palete of todosPaletes) {
        await this.atualizarPalete(palete.id, {
          quantidade_volumes: total_volumes,
          quantidade_nfs: total_nfs
        })
        console.log(`   ✅ Palete ${palete.codigo_palete} atualizado`)
      }

      console.log(`✅ Todos os paletes da carga ${carga.codigo_carga} foram corrigidos`)
    } catch (error) {
      console.error('❌ Erro ao corrigir contadores dos paletes:', error)
      throw error
    }
  },

  /**
   * Recalcula e atualiza os contadores da carga baseado em todos os paletes associados
   * Também atualiza todos os paletes da carga com os valores totais (volumes e NFs da carga)
   */
  async recalcularContadoresCarga(carga_id: string): Promise<void> {
    try {
      // Buscar a carga para obter as notas únicas
      const carga = await this.buscarCarga(carga_id)
      if (!carga) {
        console.warn(`⚠️ Carga ${carga_id} não encontrada`)
        return
      }
      
      // Buscar todos os paletes da carga para contar quantidade_paletes
      const { data: todosPaletes } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_paletes')
          .select('id')
          .eq('carga_id', carga_id)
      })
      
      const quantidade_paletes = todosPaletes?.length || 0
      
      // Calcular total_volumes e total_nfs baseado nas notas únicas da carga
      // Isso evita duplicatas quando a mesma nota está em múltiplos paletes
      const notasUnicas = carga.notas || []
      const total_volumes = notasUnicas.reduce((acc, nota) => {
        const volumes = typeof nota.volumes === 'number' 
          ? nota.volumes 
          : Number(nota.volumes) || 0
        return acc + volumes
      }, 0)
      
      const total_nfs = notasUnicas.length
      
      // Log detalhado para debug
      console.log(`📊 Recalculando contadores da carga ${carga_id}:`)
      console.log(`   - Paletes encontrados: ${quantidade_paletes}`)
      console.log(`   - Notas únicas: ${total_nfs}`)
      console.log(`   - Total volumes (das notas): ${total_volumes}`)
      
      // Atualizar contadores na carga
      await this.atualizarCarga(carga_id, {
        quantidade_paletes: quantidade_paletes,
        total_volumes: total_volumes,
        total_nfs: total_nfs
      })
      
      // Atualizar TODOS os paletes da carga com os valores totais da carga
      if (todosPaletes && todosPaletes.length > 0) {
        console.log(`🔄 Atualizando ${todosPaletes.length} palete(s) com valores totais da carga...`)
        for (const palete of todosPaletes) {
          await this.atualizarPalete(palete.id, {
            quantidade_volumes: total_volumes,
            quantidade_nfs: total_nfs
          })
        }
        console.log(`✅ Todos os paletes atualizados com ${total_volumes} volumes e ${total_nfs} NFs`)
      }
      
      console.log(`✅ Contadores da carga ${carga_id} atualizados: ${quantidade_paletes} paletes, ${total_volumes} volumes, ${total_nfs} NFs`)
    } catch (error) {
      console.error('❌ Erro ao recalcular contadores da carga:', error)
      // Não lançar erro para não quebrar o fluxo principal
    }
  },

  /**
   * Atualiza o campo notas na tabela wms_cargas com todas as notas dos paletes associados
   */
  async atualizarNotasCarga(carga_id: string): Promise<void> {
    try {
      // Buscar todos os paletes da carga
      const { data: paletes } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_paletes')
          .select('id')
          .eq('carga_id', carga_id)
      })
      
      if (!paletes || paletes.length === 0) {
        // Se não houver paletes, limpar o array de notas
        await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_cargas')
            .update({ notas: [] })
            .eq('id', carga_id)
        })
        return
      }
      
      // Buscar todas as notas de todos os paletes da carga
      const paleteIds = paletes.map(p => p.id)
      const { data: todosPaletesNotas } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('*')
          .in('palete_id', paleteIds)
      })
      
      // Extrair todas as notas dos arrays e remover duplicatas baseado em numero_nf
      const todasNotas: any[] = []
      ;(todosPaletesNotas || []).forEach((paleteNota: any) => {
        const notasArray = paleteNota.notas || []
        notasArray.forEach((nota: any) => {
          todasNotas.push({
            ...nota,
            palete_id: paleteNota.palete_id
          })
        })
      })
      
      // Remover duplicatas baseado em numero_nf (caso a mesma nota esteja em múltiplos paletes)
      const notasUnicas = todasNotas.reduce((acc: any[], nota: any) => {
        const jaExiste = acc.find(n => n.numero_nf === nota.numero_nf)
        if (!jaExiste) {
          acc.push({
            numero_nf: nota.numero_nf,
            codigo_completo: nota.codigo_completo,
            fornecedor: nota.fornecedor,
            cliente_destino: nota.cliente_destino,
            destino: nota.destino,
            volumes: nota.volumes,
            palete_id: nota.palete_id
          })
        }
        return acc
      }, [])
      
      // Atualizar campo notas na carga
      await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_cargas')
          .update({ notas: notasUnicas })
          .eq('id', carga_id)
      })
      
      console.log(`✅ Campo notas atualizado na carga ${carga_id}: ${notasUnicas.length} nota(s) única(s)`)
    } catch (error) {
      console.error('❌ Erro ao atualizar notas da carga:', error)
      // Não lançar erro para não quebrar o fluxo principal
    }
  },

  async atualizarTodasNotasEmTodosPaletes(carga_id: string): Promise<void> {
    try {
      // Buscar todos os paletes da carga
      const { data: paletes } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_paletes')
          .select('id')
          .eq('carga_id', carga_id)
      })
      
      if (!paletes || paletes.length === 0) {
        console.log('⚠️ Nenhum palete encontrado para a carga', carga_id)
        return
      }
      
      // Buscar todas as notas de todos os paletes da carga para consolidar
      const paleteIds = paletes.map(p => p.id)
      const { data: todosPaletesNotas } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('*')
          .in('palete_id', paleteIds)
      })
      
      // Consolidar todas as notas únicas de todos os paletes
      const todasNotasUnicas: any[] = []
      const notasVistas = new Set<string>()
      
      ;(todosPaletesNotas || []).forEach((paleteNota: any) => {
        const notasArray = paleteNota.notas || []
        notasArray.forEach((nota: any) => {
          const chaveNota = nota.numero_nf || nota.codigo_completo
          if (chaveNota && !notasVistas.has(chaveNota)) {
            notasVistas.add(chaveNota)
            todasNotasUnicas.push({
              numero_nf: nota.numero_nf,
              codigo_completo: nota.codigo_completo,
              fornecedor: nota.fornecedor,
              cliente_destino: nota.cliente_destino,
              destino: nota.destino,
              volumes: nota.volumes,
              data_associacao: nota.data_associacao || new Date().toISOString()
            })
          }
        })
      })
      
      // Atualizar todos os paletes com todas as notas consolidadas
      const promessasAtualizacao = paletes.map(palete => {
        // Buscar dados existentes do palete para manter cliente_destino e destino
        const paleteNotaExistente = todosPaletesNotas?.find((pn: any) => pn.palete_id === palete.id)
        
        const clienteDestino = paleteNotaExistente?.cliente_destino || ''
        const destino = paleteNotaExistente?.destino || ''
        const totalVolumes = todasNotasUnicas.reduce((sum, n) => sum + (n.volumes || 0), 0)
        
        return retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_palete_notas')
            .upsert({
              palete_id: palete.id,
              cliente_destino: clienteDestino,
              destino: destino,
              total_volumes: totalVolumes,
              notas: todasNotasUnicas
            }, {
              onConflict: 'palete_id'
            })
        })
      })
      
      await Promise.all(promessasAtualizacao)
      
      console.log(`✅ Todos os ${paletes.length} palete(s) da carga ${carga_id} atualizados com ${todasNotasUnicas.length} nota(s)`)
    } catch (error) {
      console.error('❌ Erro ao atualizar todas as notas em todos os paletes:', error)
      throw error
    }
  },

  async finalizarPalete(palete_id: string, dados: {
    quantidade_paletes?: number
    quantidade_gaiolas?: number
    quantidade_caixas_mangas?: number
    quantidade_posicoes?: number
  }): Promise<void> {
    try {
      const palete = await this.buscarPalete(palete_id)
      if (!palete) throw new Error('Palete não encontrado')
      
      // Atualizar status primeiro
      await this.atualizarPalete(palete_id, {
        status: 'aguardando_armazenagem'
      })
      
      // Tentar atualizar quantidade_posicoes se fornecida (pode falhar se o campo não existir no banco ainda)
      if (dados.quantidade_posicoes !== undefined) {
        try {
          await retryWithBackoff(async () => {
            return await getSupabase()
              .from('wms_paletes')
              .update({ quantidade_posicoes: dados.quantidade_posicoes })
              .eq('id', palete_id)
          })
        } catch (error: any) {
          // Se o campo não existir, apenas loga o erro mas não quebra o fluxo
          console.warn('⚠️ Campo quantidade_posicoes não encontrado na tabela. Execute a migração SQL para habilitar esta funcionalidade.')
        }
      }
      
      // Se tiver carga associada, atualizar notas primeiro e depois recalcular contadores
      if (palete.carga_id) {
        // Primeiro atualizar o campo notas da carga (para garantir que está atualizado)
        await this.atualizarNotasCarga(palete.carga_id)
        
        // Depois recalcular contadores baseado nas notas únicas da carga
        await this.recalcularContadoresCarga(palete.carga_id)
      }
    } catch (error) {
      console.error('❌ Erro ao finalizar palete:', error)
      throw error
    }
  },

  async listarPaletes(filtros?: {
    status?: string
    carga_id?: string
  }): Promise<WMSPalete[]> {
    try {
      let query = getSupabase()
        .from('wms_paletes')
        .select('*')
        .order('data_criacao', { ascending: false })
      
      if (filtros?.status) {
        query = query.eq('status', filtros.status)
      }
      if (filtros?.carga_id) {
        query = query.eq('carga_id', filtros.carga_id)
      }
      
      const { data, error } = await retryWithBackoff(async () => query)
      
      if (error) throw error
      
      // Buscar notas e posições para cada palete
      const paletesCompletos = await Promise.all(
        (data || []).map(async (palete: any) => {
          // Buscar posição se houver
          let posicao = null
          if (palete.posicao_id) {
            const { data: posicaoData } = await retryWithBackoff(async () => {
              return await getSupabase()
                .from('wms_posicoes')
                .select('*')
                .eq('id', palete.posicao_id)
                .single()
            })
            posicao = posicaoData
          }
          
          // Buscar notas
          const { data: paleteNotasData } = await retryWithBackoff(async () => {
            return await getSupabase()
              .from('wms_palete_notas')
              .select('*')
              .eq('palete_id', palete.id)
              .maybeSingle()
          })
          
          // Extrair array de notas do registro
          const notasArray = (paleteNotasData?.notas as any[]) || []
          
          return {
            ...palete,
            posicao,
            notas: notasArray
          } as WMSPalete
        })
      )
      
      return paletesCompletos
    } catch (error) {
      console.error('❌ Erro ao listar paletes:', error)
      return []
    }
  },

  // ========== POSIÇÕES ==========
  
  async buscarPosicao(id: string): Promise<WMSPosicao | null> {
    try {
      // Buscar posição primeiro
      const { data: posicaoData, error: posicaoError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_posicoes')
          .select('*')
          .eq('id', id)
          .single()
      })
      
      if (posicaoError || !posicaoData) {
        throw posicaoError || new Error('Posição não encontrada')
      }
      
      // Buscar palete separadamente se houver palete_id
      let palete = null
      if (posicaoData.palete_id) {
        const { data: paleteData } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_paletes')
            .select('*')
            .eq('id', posicaoData.palete_id as string)
            .single()
        })
        palete = paleteData
      }
      
      return {
        ...posicaoData,
        palete
      } as unknown as WMSPosicao
    } catch (error) {
      console.error('❌ Erro ao buscar posição:', error)
      return null
    }
  },

  async buscarPosicaoPorCodigo(codigo: string): Promise<WMSPosicao | null> {
    try {
      // Buscar posição primeiro
      const { data: posicaoData, error: posicaoError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_posicoes')
          .select('*')
          .eq('codigo_posicao', codigo)
          .single()
      })
      
      if (posicaoError || !posicaoData) {
        throw posicaoError || new Error('Posição não encontrada')
      }
      
      // Buscar palete separadamente se houver palete_id
      let palete = null
      if (posicaoData.palete_id) {
        const { data: paleteData } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_paletes')
            .select('*')
            .eq('id', posicaoData.palete_id as string)
            .single()
        })
        palete = paleteData
      }
      
      return {
        ...posicaoData,
        palete
      } as unknown as WMSPosicao
    } catch (error) {
      console.error('❌ Erro ao buscar posição por código:', error)
      return null
    }
  },

  async listarPosicoes(filtros?: {
    status?: string
    nivel?: number
    cliente_preferencial?: string
    destino_preferencial?: string
  }): Promise<WMSPosicao[]> {
    try {
      // Buscar posições com paginação
      // IMPORTANTE: O Supabase limita a 1000 registros por padrão, mesmo com .limit()
      // Vamos usar paginação para buscar todas as posições
      const posicoesData: any[] = []
      const pageSize = 1000
      let from = 0
      let hasMore = true
      
      while (hasMore) {
        let query = getSupabase()
          .from('wms_posicoes')
          .select('*')
          .order('rua', { ascending: true })
          .order('nivel', { ascending: true })
          .order('codigo_posicao', { ascending: true })
          .range(from, from + pageSize - 1)
        
        if (filtros?.status) {
          query = query.eq('status', filtros.status)
        }
        if (filtros?.nivel) {
          query = query.eq('nivel', filtros.nivel)
        }
        if (filtros?.cliente_preferencial) {
          query = query.eq('cliente_preferencial', filtros.cliente_preferencial)
        }
        if (filtros?.destino_preferencial) {
          query = query.eq('destino_preferencial', filtros.destino_preferencial)
        }
        
        const { data: pageData, error } = await retryWithBackoff(async () => query)
        
        if (error) {
          console.error('❌ Erro na query de posições:', error)
          throw error
        }
        
        if (!pageData || pageData.length === 0) {
          hasMore = false
        } else {
          posicoesData.push(...pageData)
          hasMore = pageData.length === pageSize
          from += pageSize
        }
      }
      
      if (posicoesData.length === 0) {
        console.log('⚠️ listarPosicoes: Nenhuma posição retornada do banco de dados')
        return []
      }
      
      const totalPages = Math.ceil(posicoesData.length / pageSize)
      console.log(`📄 listarPosicoes: Buscadas ${totalPages} página(s), total de ${posicoesData.length} posições`)
      
      // Debug: verificar quantas posições foram retornadas e por nível
      const posicoesPorNivel: Record<number, number> = {}
      const posicoesPDPorNivel: Record<number, number> = {}
      posicoesData.forEach((pos: any) => {
        posicoesPorNivel[pos.nivel] = (posicoesPorNivel[pos.nivel] || 0) + 1
        if (pos.codigo_posicao && pos.codigo_posicao.startsWith('PD-')) {
          posicoesPDPorNivel[pos.nivel] = (posicoesPDPorNivel[pos.nivel] || 0) + 1
        }
      })
      console.log('📊 listarPosicoes: Total de posições retornadas:', posicoesData.length)
      console.log('📊 listarPosicoes: Posições por nível:', posicoesPorNivel)
      console.log('📊 listarPosicoes: Posições PD por nível:', posicoesPDPorNivel)
      console.log('📊 listarPosicoes: Filtros aplicados:', filtros)
      
      // Verificar especificamente posições PD-097-03 a PD-097-07
      const posicoesTeste = ['PD-097-03', 'PD-097-04', 'PD-097-05', 'PD-097-06', 'PD-097-07']
      for (const codigo of posicoesTeste) {
        const encontrada = posicoesData.find((p: any) => p.codigo_posicao === codigo)
        if (encontrada) {
          console.log(`✅ listarPosicoes: ${codigo} encontrada (nível ${encontrada.nivel}, status: ${encontrada.status})`)
        } else {
          console.log(`❌ listarPosicoes: ${codigo} NÃO encontrada no resultado da query`)
          // Buscar no banco sem filtros para verificar se existe e qual o status
          const { data: posicaoNoBanco } = await retryWithBackoff(async () => {
            return await getSupabase()
              .from('wms_posicoes')
              .select('codigo_posicao, status, nivel, rua')
              .eq('codigo_posicao', codigo)
              .single()
          })
          if (posicaoNoBanco) {
            console.log(`🔍 listarPosicoes: ${codigo} EXISTE no banco (nível ${posicaoNoBanco.nivel}, status: ${posicaoNoBanco.status}, rua: ${posicaoNoBanco.rua})`)
            if (posicaoNoBanco.status !== filtros?.status) {
              console.log(`⚠️ listarPosicoes: ${codigo} foi filtrada porque status é '${posicaoNoBanco.status}' e o filtro é '${filtros?.status}'`)
            }
          } else {
            console.log(`❌ listarPosicoes: ${codigo} NÃO EXISTE no banco de dados`)
          }
        }
      }
      
      // Buscar paletes associados em uma única query
      const paleteIds = posicoesData
        .map((pos: any) => pos.palete_id)
        .filter((id: string | null) => id !== null) as string[]
      
      let paletesMap = new Map<string, any>()
      if (paleteIds.length > 0) {
        const { data: paletesData } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_paletes')
            .select('id, codigo_palete, status, quantidade_volumes, quantidade_nfs')
            .in('id', paleteIds)
        })
        
        if (paletesData) {
          paletesData.forEach((palete: any) => {
            paletesMap.set(palete.id, palete)
          })
        }
      }
      
      // Mapear os dados retornados para o formato esperado
      return posicoesData.map((pos: any) => ({
        id: pos.id,
        codigo_posicao: pos.codigo_posicao,
        rua: pos.rua,
        nivel: pos.nivel,
        posicao: pos.posicao,
        status: pos.status,
        palete_id: pos.palete_id,
        palete: pos.palete_id && paletesMap.has(pos.palete_id)
          ? {
              id: paletesMap.get(pos.palete_id)!.id,
              codigo_palete: paletesMap.get(pos.palete_id)!.codigo_palete,
              status: paletesMap.get(pos.palete_id)!.status,
              quantidade_volumes: paletesMap.get(pos.palete_id)!.quantidade_volumes,
              quantidade_nfs: paletesMap.get(pos.palete_id)!.quantidade_nfs
            }
          : null,
        capacidade_peso: pos.capacidade_peso,
        cliente_preferencial: pos.cliente_preferencial,
        destino_preferencial: pos.destino_preferencial,
        data_ocupacao: pos.data_ocupacao,
        data_liberacao: pos.data_liberacao,
        observacoes: pos.observacoes
      })) as WMSPosicao[]
    } catch (error) {
      console.error('❌ Erro ao listar posições:', error)
      return []
    }
  },

  async sugerirPosicoes(palete: WMSPalete, limite: number = 10): Promise<WMSSugestaoPosicao[] | WMSSugestaoConjuntoPosicoes[]> {
    try {
      const quantidadePosicoes = palete.quantidade_posicoes || 1
      
      // Se precisar de múltiplas posições, usar a nova lógica
      if (quantidadePosicoes > 1) {
        return await this.sugerirConjuntoPosicoes(palete, quantidadePosicoes, limite)
      }
      
      // Buscar carga do palete para obter destino_cliente
      let destinoCompleto: string | null = null
      if (palete.carga_id) {
        const carga = await this.buscarCarga(palete.carga_id)
        if (carga && carga.cliente_destino) {
          // Converter sigla para destino completo
          destinoCompleto = obterDestinoCompleto(carga.cliente_destino)
        }
      }
      
      // Se não encontrou destino na carga, buscar nas notas do palete
      if (!destinoCompleto) {
        const { data: notas } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_palete_notas')
            .select('cliente_destino, destino')
            .eq('palete_id', palete.id)
            .limit(1)
        })
        
        const cliente_destino = notas?.[0]?.cliente_destino
        if (cliente_destino && typeof cliente_destino === 'string') {
          destinoCompleto = obterDestinoCompleto(cliente_destino)
        } else {
          const destino = notas?.[0]?.destino
          destinoCompleto = (destino && typeof destino === 'string') ? destino : null
        }
      }
      
      // Se não tem destino_cliente, retornar vazio (apenas cargas com destino_cliente)
      if (!destinoCompleto) {
        console.warn('⚠️ Palete sem destino_cliente, não será sugerido endereçamento')
        return []
      }
      
      // Buscar posições disponíveis
      const posicoes = await this.listarPosicoes({ status: 'disponivel' })
      
      // Debug: contar posições disponíveis por nível
      const posicoesPorNivel: Record<number, number> = {}
      posicoes.forEach(p => {
        posicoesPorNivel[p.nivel] = (posicoesPorNivel[p.nivel] || 0) + 1
      })
      console.log('📦 Posições disponíveis por nível:', posicoesPorNivel)
      
      // Debug: verificar posições PD disponíveis por nível (para RIBEIRAO PRETO - SP)
      if (destinoCompleto === 'RIBEIRAO PRETO - SP') {
        const posicoesPDPorNivel: Record<number, number> = {}
        const exemplosPDPorNivel: Record<number, string[]> = {}
        posicoes.forEach(p => {
          if (p.codigo_posicao.startsWith('PD-')) {
            posicoesPDPorNivel[p.nivel] = (posicoesPDPorNivel[p.nivel] || 0) + 1
            if (!exemplosPDPorNivel[p.nivel]) {
              exemplosPDPorNivel[p.nivel] = []
            }
            if (exemplosPDPorNivel[p.nivel].length < 5) {
              exemplosPDPorNivel[p.nivel].push(p.codigo_posicao)
            }
          }
        })
        console.log('🔍 Posições PD disponíveis por nível:', posicoesPDPorNivel)
        console.log('🔍 Exemplos de códigos PD por nível:', exemplosPDPorNivel)
        
        // Verificar especificamente a faixa PD-097 a PD-132
        const posicoesFaixaPreferencial: Record<number, number> = {}
        posicoes.forEach(p => {
          if (p.codigo_posicao.startsWith('PD-')) {
            const match = p.codigo_posicao.match(/^PD-(\d+)-/)
            if (match) {
              const numero = parseInt(match[1], 10)
              if (numero >= 97 && numero <= 132) {
                posicoesFaixaPreferencial[p.nivel] = (posicoesFaixaPreferencial[p.nivel] || 0) + 1
              }
            }
          }
        })
        console.log('🎯 Posições na faixa PD-097 a PD-132 disponíveis por nível:', posicoesFaixaPreferencial)
      }
      
      // Filtrar e calcular score para cada posição
      // IMPORTANTE: A preferência se aplica a TODOS os níveis (1-7)
      // Se PD-097-01 é preferencial para RIBEIRAO PRETO - SP, então todas as posições
      // com código PD-097-01 em qualquer nível são preferenciais
      
      // Debug: verificar algumas posições específicas
      if (destinoCompleto === 'RIBEIRAO PRETO - SP') {
        const posicoesTeste = ['PD-097-01', 'PD-097-03', 'PD-097-04', 'PD-097-05', 'PD-097-06', 'PD-097-07']
        posicoesTeste.forEach(codigo => {
          const posicaoEncontrada = posicoes.find(p => p.codigo_posicao === codigo)
          if (posicaoEncontrada) {
            const isPreferencial = isPosicaoPreferencial(codigo, destinoCompleto)
            console.log(`🔍 Teste: ${codigo} (nível ${posicaoEncontrada.nivel}) - Preferencial: ${isPreferencial}`)
          } else {
            console.log(`❌ Posição ${codigo} não encontrada nas posições disponíveis`)
          }
        })
      }
      
      // Separar posições preferenciais e não preferenciais
      const posicoesPreferenciais: WMSPosicao[] = []
      const posicoesNaoPreferenciais: WMSPosicao[] = []
      
      posicoes.forEach(posicao => {
        const isPreferencial = destinoCompleto ? isPosicaoPreferencial(posicao.codigo_posicao, destinoCompleto) : false
        if (isPreferencial) {
          posicoesPreferenciais.push(posicao)
        } else {
          posicoesNaoPreferenciais.push(posicao)
        }
      })
      
      // Debug: contar posições preferenciais por nível
      const preferenciaisPorNivel: Record<number, number> = {}
      posicoesPreferenciais.forEach(p => {
        preferenciaisPorNivel[p.nivel] = (preferenciaisPorNivel[p.nivel] || 0) + 1
      })
      console.log('✅ Posições preferenciais por nível:', preferenciaisPorNivel)
      console.log('✅ Destino completo:', destinoCompleto)
      
      // Para garantir que todos os níveis tenham sugestões quando há posições disponíveis,
      // adicionar posições não preferenciais para níveis que não têm posições preferenciais
      const posicoesParaSugerir: WMSPosicao[] = [...posicoesPreferenciais]
      
      // Identificar qual rua tem posições preferenciais (para priorizar a mesma rua nas não preferenciais)
      const ruasComPreferenciais = new Set<number>()
      posicoesPreferenciais.forEach(p => {
        ruasComPreferenciais.add(p.rua)
      })
      
      // Agrupar posições não preferenciais por nível e rua
      const naoPreferenciaisPorNivel: Record<number, WMSPosicao[]> = {}
      const naoPreferenciaisPorNivelERua: Record<number, Record<number, WMSPosicao[]>> = {}
      
      posicoesNaoPreferenciais.forEach(p => {
        // Agrupar por nível
        if (!naoPreferenciaisPorNivel[p.nivel]) {
          naoPreferenciaisPorNivel[p.nivel] = []
        }
        naoPreferenciaisPorNivel[p.nivel].push(p)
        
        // Agrupar por nível e rua
        if (!naoPreferenciaisPorNivelERua[p.nivel]) {
          naoPreferenciaisPorNivelERua[p.nivel] = {}
        }
        if (!naoPreferenciaisPorNivelERua[p.nivel][p.rua]) {
          naoPreferenciaisPorNivelERua[p.nivel][p.rua] = []
        }
        naoPreferenciaisPorNivelERua[p.nivel][p.rua].push(p)
      })
      
      // Para cada nível (1-7), se não houver posições preferenciais, adicionar posições não preferenciais
      // IMPORTANTE: Só adicionar posições da mesma rua das posições preferenciais para manter consistência
      for (let nivel = 1; nivel <= 7; nivel++) {
        if (!preferenciaisPorNivel[nivel] && naoPreferenciaisPorNivel[nivel] && naoPreferenciaisPorNivel[nivel].length > 0) {
          // Priorizar posições da mesma rua das posições preferenciais
          let posicoesNivel: WMSPosicao[] = []
          
          // Só adicionar posições da mesma rua das preferenciais (não usar outras ruas)
          if (ruasComPreferenciais.size > 0) {
            for (const rua of ruasComPreferenciais) {
              if (naoPreferenciaisPorNivelERua[nivel] && naoPreferenciaisPorNivelERua[nivel][rua]) {
                posicoesNivel = naoPreferenciaisPorNivelERua[nivel][rua].slice(0, 10)
                const siglaRua = rua === 1 ? 'CA' : rua === 2 ? 'CB' : rua === 3 ? 'PD' : `Rua ${rua}`
                console.log(`📌 Adicionadas ${posicoesNivel.length} posições não preferenciais da rua ${siglaRua} (nível ${nivel}) para garantir sugestões`)
                break
              }
            }
          }
          
          // NÃO adicionar posições de outras ruas - manter apenas a rua preferencial
          // Se não há posições da mesma rua disponíveis, não adicionar nada
          // Isso garante que o sistema siga estritamente as posições preferenciais
          if (posicoesNivel.length > 0) {
            posicoesParaSugerir.push(...posicoesNivel)
          } else {
            console.log(`⚠️ Nível ${nivel}: Não há posições disponíveis da rua preferencial. Não serão adicionadas posições de outras ruas.`)
          }
        }
      }
      
      // Debug detalhado: verificar quais códigos existem nos níveis sem posições preferenciais
      for (let nivel = 1; nivel <= 7; nivel++) {
        if (!preferenciaisPorNivel[nivel]) {
          const posicoesNesteNivel = posicoes.filter(p => p.nivel === nivel)
          if (posicoesNesteNivel.length > 0) {
            // Pegar alguns exemplos de códigos neste nível
            const exemplosCodigos = posicoesNesteNivel.slice(0, 5).map(p => p.codigo_posicao)
            console.warn(`⚠️ Nível ${nivel}: ${posicoesNesteNivel.length} posições disponíveis, mas nenhuma preferencial. Exemplos de códigos:`, exemplosCodigos)
            // Verificar se alguma dessas posições deveria ser preferencial
            const exemploPreferencial = posicoesNesteNivel.find(p => 
              destinoCompleto ? isPosicaoPreferencial(p.codigo_posicao, destinoCompleto) : false
            )
            if (!exemploPreferencial) {
              console.warn(`   → Nenhuma posição no nível ${nivel} está na faixa preferencial para ${destinoCompleto}`)
            }
          } else {
            console.warn(`⚠️ Nível ${nivel}: Nenhuma posição disponível`)
          }
        }
      }
      
      // Verificar se há posições em todos os níveis (1-7)
      const niveisComPosicoes = Object.keys(preferenciaisPorNivel).map(Number).sort()
      console.log('📋 Níveis com posições preferenciais disponíveis:', niveisComPosicoes)
      
      const sugestoes: WMSSugestaoPosicao[] = posicoesParaSugerir
        .map(posicao => {
          let score = 0
          const motivos: string[] = []
          
          // Compatibilidade de destino preferencial (peso: 50 - muito importante)
          const compat_destino = destinoCompleto ? isPosicaoPreferencial(posicao.codigo_posicao, destinoCompleto) : false
          if (compat_destino) {
            score += 50
            motivos.push('Destino preferencial')
          }
          
          // Nível preferido (níveis 1-2 para alta giro, 4-5 para baixa giro)
          const nivel_preferido = posicao.nivel <= 2
          if (nivel_preferido) {
            score += 25
            motivos.push('Nível de alta giro')
          } else {
            score += 10
            motivos.push('Nível de baixa giro')
          }
          
          // Capacidade (peso: 15)
          if (posicao.capacidade_peso >= (palete.peso_estimado || 500)) {
            score += 15
            motivos.push('Capacidade adequada')
          }
          
          // Disponibilidade (peso: 10)
          if (posicao.status === 'disponivel') {
            score += 10
          }
          
          return {
            posicao,
            score,
            motivo: motivos.join(', ') || 'Posição disponível',
            compatibilidade_cliente: false,
            compatibilidade_destino: compat_destino,
            nivel_preferido
          }
        })
      
      // Ordenar por score
      // Não limitar aqui - retornar todas as sugestões para permitir filtragem por nível no frontend
      return sugestoes.sort((a, b) => b.score - a.score)
    } catch (error) {
      console.error('❌ Erro ao sugerir posições:', error)
      return []
    }
  },

  async sugerirConjuntoPosicoes(palete: WMSPalete, quantidadePosicoes: number, limite: number = 10): Promise<WMSSugestaoConjuntoPosicoes[]> {
    try {
      // Buscar carga do palete para obter destino_cliente
      let destinoCompleto: string | null = null
      if (palete.carga_id) {
        const carga = await this.buscarCarga(palete.carga_id)
        if (carga && carga.cliente_destino) {
          // Converter sigla para destino completo
          destinoCompleto = obterDestinoCompleto(carga.cliente_destino)
        }
      }
      
      // Se não encontrou destino na carga, buscar nas notas do palete
      if (!destinoCompleto) {
        const { data: notas } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_palete_notas')
            .select('cliente_destino, destino')
            .eq('palete_id', palete.id)
            .limit(1)
        })
        
        const cliente_destino = notas?.[0]?.cliente_destino
        if (cliente_destino && typeof cliente_destino === 'string') {
          destinoCompleto = obterDestinoCompleto(cliente_destino)
        } else {
          const destino = notas?.[0]?.destino
          destinoCompleto = (destino && typeof destino === 'string') ? destino : null
        }
      }
      
      // Se não tem destino_cliente, retornar vazio (apenas cargas com destino_cliente)
      if (!destinoCompleto) {
        console.warn('⚠️ Palete sem destino_cliente, não será sugerido endereçamento')
        return []
      }
      
      // Buscar posições disponíveis
      const posicoes = await this.listarPosicoes({ status: 'disponivel' })
      
      // Separar posições preferenciais e não preferenciais
      const posicoesPreferenciais: WMSPosicao[] = []
      const posicoesNaoPreferenciais: WMSPosicao[] = []
      
      posicoes.forEach(pos => {
        const isPreferencial = destinoCompleto ? isPosicaoPreferencial(pos.codigo_posicao, destinoCompleto) : false
        if (isPreferencial) {
          posicoesPreferenciais.push(pos)
        } else {
          posicoesNaoPreferenciais.push(pos)
        }
      })
      
      // Para garantir que todos os níveis tenham sugestões quando há posições disponíveis,
      // adicionar posições não preferenciais para níveis que não têm posições preferenciais
      const posicoesParaSugerir: WMSPosicao[] = [...posicoesPreferenciais]
      
      // Identificar qual rua tem posições preferenciais (para priorizar a mesma rua nas não preferenciais)
      const ruasComPreferenciais = new Set<number>()
      posicoesPreferenciais.forEach(pos => {
        ruasComPreferenciais.add(pos.rua)
      })
      
      // Agrupar posições não preferenciais por nível e rua
      const naoPreferenciaisPorLocalizacao = new Map<string, WMSPosicao[]>()
      posicoesNaoPreferenciais.forEach(pos => {
        const key = `${pos.rua}-${pos.nivel}`
        if (!naoPreferenciaisPorLocalizacao.has(key)) {
          naoPreferenciaisPorLocalizacao.set(key, [])
        }
        naoPreferenciaisPorLocalizacao.get(key)!.push(pos)
      })
      
      // Verificar quais localizações têm posições preferenciais
      const preferenciaisPorLocalizacao = new Set<string>()
      posicoesPreferenciais.forEach(pos => {
        const key = `${pos.rua}-${pos.nivel}`
        preferenciaisPorLocalizacao.add(key)
      })
      
      // Para cada localização sem posições preferenciais, adicionar posições não preferenciais
      // Priorizar localizações da mesma rua das posições preferenciais
      const localizacoesParaAdicionar: Array<{key: string, posicoes: WMSPosicao[]}> = []
      
      // Primeiro, coletar localizações da mesma rua das preferenciais
      if (ruasComPreferenciais.size > 0) {
        for (const rua of ruasComPreferenciais) {
          for (const [key, posicoesLocal] of naoPreferenciaisPorLocalizacao.entries()) {
            const [ruaKey] = key.split('-')
            if (parseInt(ruaKey) === rua && !preferenciaisPorLocalizacao.has(key) && posicoesLocal.length >= quantidadePosicoes) {
              localizacoesParaAdicionar.push({ key, posicoes: posicoesLocal })
            }
          }
        }
      }
      
      // Se não encontrou localizações da mesma rua, usar qualquer localização disponível
      if (localizacoesParaAdicionar.length === 0) {
        for (const [key, posicoesLocal] of naoPreferenciaisPorLocalizacao.entries()) {
          if (!preferenciaisPorLocalizacao.has(key) && posicoesLocal.length >= quantidadePosicoes) {
            localizacoesParaAdicionar.push({ key, posicoes: posicoesLocal })
          }
        }
      }
      
      // Adicionar as localizações coletadas
      for (const { key, posicoes } of localizacoesParaAdicionar) {
        posicoesParaSugerir.push(...posicoes)
        const [rua, nivel] = key.split('-')
        console.log(`📌 Adicionadas ${posicoes.length} posições não preferenciais da rua ${rua} (nível ${nivel}) para garantir sugestões`)
      }
      
      // Agrupar posições por rua e nível
      const posicoesPorLocalizacao = new Map<string, WMSPosicao[]>()
      posicoesParaSugerir.forEach(pos => {
        const key = `${pos.rua}-${pos.nivel}`
        if (!posicoesPorLocalizacao.has(key)) {
          posicoesPorLocalizacao.set(key, [])
        }
        posicoesPorLocalizacao.get(key)!.push(pos)
      })
      
      const sugestoes: WMSSugestaoConjuntoPosicoes[] = []
      
      // Para cada localização, tentar encontrar posições sequenciais no mesmo nível
      for (const [key, posicoesLocal] of posicoesPorLocalizacao.entries()) {
        // Ordenar posições por código para garantir sequência
        posicoesLocal.sort((a, b) => {
          if (a.rua !== b.rua) return a.rua - b.rua
          if (a.nivel !== b.nivel) return a.nivel - b.nivel
          // Extrair número da posição do código (ex: CA-001-01 -> 1)
          const numA = parseInt(a.codigo_posicao.match(/-(\d+)-/)?.[1] || '0', 10)
          const numB = parseInt(b.codigo_posicao.match(/-(\d+)-/)?.[1] || '0', 10)
          if (numA !== numB) return numA - numB
          // Se o número for igual, ordenar pelo sufixo (ex: -01, -02)
          const sufA = parseInt(a.codigo_posicao.match(/-(\d+)$/)?.[1] || '0', 10)
          const sufB = parseInt(b.codigo_posicao.match(/-(\d+)$/)?.[1] || '0', 10)
          return sufA - sufB
        })
        
        // Tentar encontrar sequências de posições adjacentes
        // Verificar se há quantidade suficiente disponível no mesmo nível
        if (posicoesLocal.length >= quantidadePosicoes) {
          // Verificar se as posições são sequenciais
          for (let i = 0; i <= posicoesLocal.length - quantidadePosicoes; i++) {
            const conjuntoPosicoes = posicoesLocal.slice(i, i + quantidadePosicoes)
            
            // Verificar se todas as posições estão no mesmo nível
            const mesmoNivel = conjuntoPosicoes.every(p => p.nivel === conjuntoPosicoes[0].nivel)
            if (!mesmoNivel) continue
            
            // Verificar se são sequenciais (mesma rua e números consecutivos)
            const mesmaRua = conjuntoPosicoes.every(p => p.rua === conjuntoPosicoes[0].rua)
            if (!mesmaRua) continue
            
            // Verificar se as posições estão em sequência ordenada
            // Como já estão ordenadas por código, apenas verificar se são consecutivas
            // Considerar sequenciais se estiverem ordenadas e no mesmo nível/rua
            // (a ordenação já garante que estão em sequência)
            
            const posicaoInicial = conjuntoPosicoes[0]
            
            // Calcular score para o conjunto
            let score = 0
            const motivos: string[] = []
            
            // Compatibilidade de destino preferencial (peso: 50 - muito importante)
            const compat_destino = destinoCompleto ? isPosicaoPreferencial(posicaoInicial.codigo_posicao, destinoCompleto) : false
            if (compat_destino) {
              score += 50
              motivos.push('Destino preferencial')
            }
            
            // Nível preferido
            const nivel_preferido = posicaoInicial.nivel <= 2
            if (nivel_preferido) {
              score += 25
              motivos.push('Nível de alta giro')
            } else {
              score += 10
              motivos.push('Nível de baixa giro')
            }
            
            // Capacidade média do conjunto
            const capacidadeMedia = conjuntoPosicoes.reduce((sum, p) => sum + p.capacidade_peso, 0) / conjuntoPosicoes.length
            if (capacidadeMedia >= (palete.peso_estimado || 500)) {
              score += 15
              motivos.push('Capacidade adequada')
            }
            
            // Bônus por posições sequenciais no mesmo nível (peso: 30)
            score += 30
            motivos.push(`${quantidadePosicoes} posições sequenciais no mesmo nível`)
            
            sugestoes.push({
              posicoes: conjuntoPosicoes,
              score,
              motivo: motivos.join(', ') || 'Conjunto de posições disponíveis',
              compatibilidade_cliente: false,
              compatibilidade_destino: compat_destino,
              nivel_preferido,
              posicao_inicial: posicaoInicial
            })
          }
        }
      }
      
      // Ordenar por score e retornar top N
      return sugestoes
        .sort((a, b) => b.score - a.score)
        .slice(0, limite)
    } catch (error) {
      console.error('❌ Erro ao sugerir conjunto de posições:', error)
      return []
    }
  },

  async enderecarPalete(palete_id: string, posicao_id: string): Promise<void> {
    try {
      const posicao = await this.buscarPosicao(posicao_id)
      if (!posicao) throw new Error('Posição não encontrada')
      
      if (posicao.status !== 'disponivel') {
        throw new Error('Posição não está disponível')
      }
      
      // Atualizar posição
      await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_posicoes')
          .update({
            status: 'ocupada',
            palete_id: palete_id,
            data_ocupacao: new Date().toISOString()
          })
          .eq('id', posicao_id)
      })
      
      // Atualizar palete
      await this.atualizarPalete(palete_id, {
        posicao_id: posicao_id,
        status: 'armazenado',
        data_armazenamento: new Date().toISOString()
      })
      
      // Registrar movimentação
      await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_movimentacoes')
          .insert({
            palete_id: palete_id,
            posicao_destino_id: posicao_id,
            tipo_movimentacao: 'armazenamento',
            usuario: 'sistema' // TODO: pegar do contexto de sessão
          })
      })
    } catch (error) {
      console.error('❌ Erro ao endereçar palete:', error)
      throw error
    }
  },

  async enderecarPaleteMultiplasPosicoes(palete_id: string, posicao_ids: string[]): Promise<void> {
    try {
      // Verificar se todas as posições estão disponíveis
      for (const posicao_id of posicao_ids) {
        const posicao = await this.buscarPosicao(posicao_id)
        if (!posicao) throw new Error(`Posição ${posicao_id} não encontrada`)
        if (posicao.status !== 'disponivel') {
          throw new Error(`Posição ${posicao.codigo_posicao} não está disponível`)
        }
      }
      
      // Atualizar todas as posições
      for (const posicao_id of posicao_ids) {
        await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_posicoes')
            .update({
              status: 'ocupada',
              palete_id: palete_id,
              data_ocupacao: new Date().toISOString()
            })
            .eq('id', posicao_id)
        })
      }
      
      // Atualizar palete com a primeira posição como referência
      await this.atualizarPalete(palete_id, {
        posicao_id: posicao_ids[0],
        status: 'armazenado',
        data_armazenamento: new Date().toISOString()
      })
      
      // Registrar movimentação para cada posição
      for (const posicao_id of posicao_ids) {
        await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_movimentacoes')
            .insert({
              palete_id: palete_id,
              posicao_destino_id: posicao_id,
              tipo_movimentacao: 'armazenamento',
              usuario: 'sistema' // TODO: pegar do contexto de sessão
            })
        })
      }
    } catch (error) {
      console.error('❌ Erro ao endereçar palete em múltiplas posições:', error)
      throw error
    }
  },

  async transferirPalete(palete_id: string, nova_posicao_id: string): Promise<void> {
    try {
      const palete = await this.buscarPalete(palete_id)
      if (!palete) throw new Error('Palete não encontrado')
      
      const posicao_origem_id = palete.posicao_id
      const nova_posicao = await this.buscarPosicao(nova_posicao_id)
      
      if (!nova_posicao || nova_posicao.status !== 'disponivel') {
        throw new Error('Nova posição não está disponível')
      }
      
      // Liberar posição origem
      if (posicao_origem_id) {
        await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_posicoes')
            .update({
              status: 'disponivel',
              palete_id: null,
              data_liberacao: new Date().toISOString()
            })
            .eq('id', posicao_origem_id)
        })
      }
      
      // Ocupar nova posição
      await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_posicoes')
          .update({
            status: 'ocupada',
            palete_id: palete_id,
            data_ocupacao: new Date().toISOString()
          })
          .eq('id', nova_posicao_id)
      })
      
      // Atualizar palete
      await this.atualizarPalete(palete_id, {
        posicao_id: nova_posicao_id,
        status: 'armazenado'
      })
      
      // Registrar movimentação
      await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_movimentacoes')
          .insert({
            palete_id: palete_id,
            posicao_origem_id: posicao_origem_id,
            posicao_destino_id: nova_posicao_id,
            tipo_movimentacao: 'transferencia',
            usuario: 'sistema' // TODO: pegar do contexto de sessão
          })
      })
    } catch (error) {
      console.error('❌ Erro ao transferir palete:', error)
      throw error
    }
  },

  async bloquearPosicao(posicao_id: string, motivo?: string): Promise<void> {
    try {
      await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_posicoes')
          .update({
            status: 'bloqueada',
            observacoes: motivo
          })
          .eq('id', posicao_id)
      })
    } catch (error) {
      console.error('❌ Erro ao bloquear posição:', error)
      throw error
    }
  },

  async desbloquearPosicao(posicao_id: string): Promise<void> {
    try {
      await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_posicoes')
          .update({
            status: 'disponivel',
            observacoes: null
          })
          .eq('id', posicao_id)
      })
    } catch (error) {
      console.error('❌ Erro ao desbloquear posição:', error)
      throw error
    }
  },

  // ========== BUSCA POR NF ==========
  
  async buscarPorNotaFiscal(numero_nf: string): Promise<{
    palete: WMSPalete | null
    posicao: WMSPosicao | null
    carga: WMSCarga | null
    notas_palete: NotaFiscal[]
  }> {
    try {
      // Buscar associação nota-palete (buscar em todos os paletes e verificar se a nota está no array)
      const { data: todosPaletesNotas } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('palete_id, notas')
      })
      
      // Encontrar o palete que contém a nota no array
      let paleteNota: any = null
      if (todosPaletesNotas) {
        for (const paleteNotaItem of todosPaletesNotas) {
          const notasArray = (paleteNotaItem.notas as any[]) || []
          const notaEncontrada = notasArray.find((n: any) => n.numero_nf === numero_nf)
          if (notaEncontrada) {
            paleteNota = { palete_id: paleteNotaItem.palete_id }
            break
          }
        }
      }
      
      if (!paleteNota) {
        return {
          palete: null,
          posicao: null,
          carga: null,
          notas_palete: []
        }
      }
      
      // Buscar palete
      const palete = await this.buscarPalete(paleteNota.palete_id as string)
      if (!palete) {
        return {
          palete: null,
          posicao: null,
          carga: null,
          notas_palete: []
        }
      }
      
      // Buscar posição
      let posicao: WMSPosicao | null = null
      if (palete.posicao_id) {
        posicao = await this.buscarPosicao(palete.posicao_id)
      }
      
      // Buscar carga
      let carga: WMSCarga | null = null
      if (palete.carga_id) {
        carga = await this.buscarCarga(palete.carga_id)
      }
      
      // Buscar todas as notas do palete
      const { data: paleteNotasData } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('*')
          .eq('palete_id', palete.id)
          .maybeSingle()
      })
      
      // Extrair array de notas do registro
      const notasArray = (paleteNotasData?.notas as any[]) || []
      
      const notas_palete: NotaFiscal[] = notasArray.map((n: any) => ({
        id: n.id || n.codigo_completo || '',
        numeroNF: n.numero_nf || '',
        codigoCompleto: n.codigo_completo || '',
        volumes: n.volumes || 0,
        fornecedor: n.fornecedor || '',
        clienteDestino: n.cliente_destino || '',
        destino: n.destino || '',
        tipoCarga: n.tipo_carga || '',
        data: n.data_associacao || '',
        timestamp: n.data_associacao || '',
        status: 'ok' as const
      }))
      
      return {
        palete,
        posicao,
        carga,
        notas_palete
      }
    } catch (error) {
      console.error('❌ Erro ao buscar por nota fiscal:', error)
      return {
        palete: null,
        posicao: null,
        carga: null,
        notas_palete: []
      }
    }
  },

  // ========== DASHBOARD ==========
  
  async obterEstatisticas(): Promise<{
    total_posicoes: number
    posicoes_ocupadas: number
    posicoes_disponiveis: number
    posicoes_bloqueadas: number
    ocupacao_por_nivel: { nivel: number; ocupadas: number; total: number }[]
    cargas_aguardando: number
    permanencia_media: number
  }> {
    try {
      // Estatísticas de posições
      const posicoes = await this.listarPosicoes()
      const total_posicoes = posicoes.length
      const posicoes_ocupadas = posicoes.filter(p => p.status === 'ocupada').length
      const posicoes_disponiveis = posicoes.filter(p => p.status === 'disponivel').length
      const posicoes_bloqueadas = posicoes.filter(p => p.status === 'bloqueada').length
      
      // Ocupação por nível
      const ocupacao_por_nivel = [1, 2, 3, 4, 5].map(nivel => {
        const posicoes_nivel = posicoes.filter(p => p.nivel === nivel)
        return {
          nivel,
          ocupadas: posicoes_nivel.filter(p => p.status === 'ocupada').length,
          total: posicoes_nivel.length
        }
      })
      
      // Cargas aguardando agendamento
      const cargas_aguardando = await this.listarCargas({ status: 'aguardando_armazenagem' })
      
      // Permanência média (dias) - calcular baseado em data_ocupacao
      const posicoes_ocupadas_com_data = posicoes.filter(p => p.status === 'ocupada' && p.data_ocupacao)
      const permanencia_total = posicoes_ocupadas_com_data.reduce((acc, p) => {
        const dias = Math.floor((Date.now() - new Date(p.data_ocupacao!).getTime()) / (1000 * 60 * 60 * 24))
        return acc + dias
      }, 0)
      const permanencia_media = posicoes_ocupadas_com_data.length > 0 
        ? permanencia_total / posicoes_ocupadas_com_data.length 
        : 0
      
      return {
        total_posicoes,
        posicoes_ocupadas,
        posicoes_disponiveis,
        posicoes_bloqueadas,
        ocupacao_por_nivel,
        cargas_aguardando: cargas_aguardando.length,
        permanencia_media: Math.round(permanencia_media * 10) / 10
      }
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error)
      return {
        total_posicoes: 2940,
        posicoes_ocupadas: 0,
        posicoes_disponiveis: 2940,
        posicoes_bloqueadas: 0,
        ocupacao_por_nivel: [],
        cargas_aguardando: 0,
        permanencia_media: 0
      }
    }
  },

  // ========== CARROS PRODUZIDOS (EMBALAGEM) ==========
  
  /**
   * Salva ou atualiza um carro produzido na tabela carros_status
   */
  async salvarCarroProduzido(dados: {
    id: string
    nomeCarro: string
    colaboradores: string[]
    data: string
    turno: string
    destinoFinal: string
    quantidadeNFs: number
    totalVolumes: number
    dataInicioEmbalagem?: string
    nfs?: any[]
    status?: "embalando" | "finalizado"
    posicoes?: number | null
    palletes?: number | null
    gaiolas?: number | null
    caixasMangas?: number | null
    dataFinalizacao?: string
  }): Promise<void> {
    try {
      // Verificar se é um carro do WMS (carro_id começa com "WMS_")
      const isWMS = dados.id.startsWith('WMS_')
      // Gerar session_id com prefixo "wms_" se for carro do WMS
      const sessionId = isWMS 
        ? `wms_${dados.data}_${dados.turno}`
        : `${dados.colaboradores.join("_")}_${dados.data}_${dados.turno}`
      
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('carros_status')
          .upsert({
            carro_id: dados.id,
            nome_carro: dados.nomeCarro,
            colaboradores: dados.colaboradores,
            data: dados.data,
            turno: dados.turno,
            destino_final: dados.destinoFinal,
            quantidade_nfs: dados.quantidadeNFs,
            total_volumes: dados.totalVolumes,
            data_criacao: dados.dataInicioEmbalagem ? new Date(dados.dataInicioEmbalagem).toISOString() : new Date().toISOString(),
            data_finalizacao: dados.dataFinalizacao ? new Date(dados.dataFinalizacao).toISOString() : null,
            status_carro: dados.status || 'embalando', 
            nfs: dados.nfs || [],
            estimativa_pallets: dados.palletes || 0,
            posicoes: dados.posicoes || null,
            palletes: dados.palletes || null,
            gaiolas: dados.gaiolas || null,
            caixas_mangas: dados.caixasMangas || null,
            session_id: sessionId,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'carro_id'
          })
      })
      
      if (error) throw error
    } catch (error) {
      console.error('❌ Erro ao salvar carro produzido:', error)
      throw error
    }
  },

  /**
   * Carrega todos os carros produzidos não finalizados que foram bipados no módulo WMS
   */
  async carregarCarrosProduzidos(): Promise<any[]> {
    try {
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('carros_status')
          .select('*')
          .in('status_carro', ['embalando','aguardando_lancamento', 'finalizado'])
          .order('updated_at', { ascending: false })
      })
      
      if (error) throw error
      
      // Filtrar apenas carros bipados no WMS (session_id começa com "wms_" ou carro_id começa com "WMS_")
      const carrosWMS = (data || []).filter((carro: any) => {
        const sessionIdWMS = carro.session_id && carro.session_id.toLowerCase().startsWith('wms_')
        const carroIdWMS = carro.carro_id && carro.carro_id.startsWith('WMS_')
        return sessionIdWMS || carroIdWMS
      })
      
      console.log(`✅ Carregados ${carrosWMS.length} carros bipados no módulo WMS (de ${data?.length || 0} total)`)
      
      // Converter para o formato esperado pelo frontend
      return carrosWMS.map((carro: any) => ({
        id: carro.carro_id,
        nomeCarro: carro.nome_carro,
        colaboradores: carro.colaboradores || [],
        data: carro.data,
        turno: carro.turno,
        destinoFinal: carro.destino_final,
        quantidadeNFs: carro.quantidade_nfs,
        totalVolumes: carro.total_volumes,
        dataCriacao: carro.data_criacao,
        dataInicioEmbalagem: carro.data_criacao,
        // Mapear NFs do formato do banco para o formato esperado pelo frontend
        nfs: (carro.nfs || []).map((nf: any) => ({
          id: nf.id || '',
          numeroNF: nf.numeroNF || nf.numero_nf || '',
          codigoCompleto: nf.codigoCompleto || nf.codigo || '',
          volume: nf.volume || nf.volumes || 0,
          nomeFornecedor: nf.nomeFornecedor || nf.fornecedor || '',
          codigoDestino: nf.codigoDestino || nf.destino || '',
          destinoFinal: nf.destinoFinal || nf.destino || '',
          tipo: nf.tipo || nf.tipo_carga || '',
          codigo: nf.codigo || nf.codigoCompleto || '',
          timestamp: nf.timestamp || carro.data_criacao || new Date().toISOString(),
          status: nf.status || 'valida'
        })),
        status: carro.status_carro,
        posicoes: carro.posicoes || null,
        palletes: carro.palletes || carro.estimativa_pallets || null,
        gaiolas: carro.gaiolas || null,
        caixasMangas: carro.caixas_mangas || null,
        dataFinalizacao: carro.data_finalizacao
      }))
    } catch (error) {
      console.error('❌ Erro ao carregar carros produzidos:', error)
      return []
    }
  },

  /**
   * Atualiza o status de um carro para finalizado
   */
  async finalizarCarroProduzido(carroId: string, dados: {
    posicoes?: number
    palletes?: number
    gaiolas?: number
    caixasMangas?: number
  }): Promise<void> {
    try {
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('carros_status')
          .update({
            status_carro: 'finalizado',
            data_finalizacao: new Date().toISOString(),
            estimativa_pallets: dados.palletes || null,
            palletes: dados.palletes || null,
            posicoes: dados.posicoes || null,
            gaiolas: dados.gaiolas || null,
            caixas_mangas: dados.caixasMangas || null,
            updated_at: new Date().toISOString()
          })
          .eq('carro_id', carroId)
      })
      
      if (error) throw error
    } catch (error) {
      console.error('❌ Erro ao finalizar carro produzido:', error)
      throw error
    }
  }
}

