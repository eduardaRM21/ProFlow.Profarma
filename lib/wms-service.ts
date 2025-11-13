import { getSupabase, retryWithBackoff } from './supabase-client'
import type { NotaFiscal } from './database-service'

// Interfaces WMS
export interface WMSCarga {
  id: string
  codigo_carga: string
  cliente_destino: string
  destino: string
  status: 'montada' | 'aguardando_agendamento' | 'armazenada' | 'liberada_para_expedicao'
  quantidade_paletes: number
  quantidade_gaiolas: number
  quantidade_caixas_mangas: number
  total_volumes: number
  total_nfs: number
  data_criacao: string
  data_armazenamento?: string
  data_liberacao?: string
  observacoes?: string
}

export interface WMSPalete {
  id: string
  codigo_palete: string
  carga_id?: string
  posicao_id?: string
  status: 'em_montagem' | 'aguardando_agendamento' | 'armazenado' | 'em_movimento' | 'expedido'
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
  corredor: number
  rua: number
  nivel: number
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

export interface WMSPaleteNota {
  id: string
  palete_id: string
  numero_nf: string
  codigo_completo: string
  fornecedor?: string
  cliente_destino?: string
  destino?: string
  volumes: number
  data_associacao: string
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
  }): Promise<WMSCarga> {
    try {
      const codigo_carga = `CARGA-${Date.now()}`
      
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_cargas')
          .insert({
            codigo_carga,
            cliente_destino: dados.cliente_destino,
            destino: dados.destino,
            status: 'montada',
            observacoes: dados.observacoes
          })
          .select()
          .single()
      })
      
      if (error) throw error
      return data as WMSCarga
    } catch (error) {
      console.error('❌ Erro ao criar carga:', error)
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
      return data as WMSCarga
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
      return (data || []) as WMSCarga[]
    } catch (error) {
      console.error('❌ Erro ao listar cargas:', error)
      return []
    }
  },

  // ========== PALETES ==========
  
  async criarPalete(dados: {
    carga_id?: string
    codigo_palete?: string
  }): Promise<WMSPalete> {
    try {
      const codigo_palete = dados.codigo_palete || `PAL-${Date.now()}`
      
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
      return data as WMSPalete
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
            .eq('id', paleteData.posicao_id)
            .single()
        })
        posicao = posicaoData
      }
      
      // Buscar notas do palete
      const { data: notasData } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('*')
          .eq('palete_id', id)
      })
      
      return {
        ...paleteData,
        posicao,
        notas: notasData || []
      } as WMSPalete
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
            .eq('id', paleteData.posicao_id)
            .single()
        })
        posicao = posicaoData
      }
      
      // Buscar notas do palete
      const { data: notasData } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('*')
          .eq('palete_id', paleteData.id)
      })
      
      return {
        ...paleteData,
        posicao,
        notas: notasData || []
      } as WMSPalete
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

  async adicionarNotaAoPalete(palete_id: string, nota: NotaFiscal): Promise<void> {
    try {
      // Verificar se a nota já está associada a outro palete
      const { data: existente } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('*')
          .eq('numero_nf', nota.numeroNF)
          .maybeSingle()
      })
      
      // Se a nota já está associada a outro palete, remover a associação anterior
      if (existente && existente.palete_id !== palete_id) {
        console.log(`ℹ️ Nota ${nota.numeroNF} já estava associada ao palete ${existente.palete_id}. Movendo para o palete ${palete_id}.`)
        
        // Remover associação anterior
        await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_palete_notas')
            .delete()
            .eq('numero_nf', nota.numeroNF)
            .eq('palete_id', existente.palete_id)
        })
      }
      
      // Se a nota já está no palete atual, apenas atualizar os dados
      if (existente && existente.palete_id === palete_id) {
        // Atualizar dados da nota existente
        const { error } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('wms_palete_notas')
            .update({
              codigo_completo: nota.codigoCompleto,
              fornecedor: nota.fornecedor,
              cliente_destino: nota.clienteDestino,
              destino: nota.destino,
              volumes: nota.volumes
            })
            .eq('palete_id', palete_id)
            .eq('numero_nf', nota.numeroNF)
        })
        
        if (error) throw error
        
        // Atualizar contadores do palete
        await this.atualizarContadoresPalete(palete_id)
        return
      }
      
      // Adicionar nota ao palete (nova associação)
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .insert({
            palete_id,
            numero_nf: nota.numeroNF,
            codigo_completo: nota.codigoCompleto,
            fornecedor: nota.fornecedor,
            cliente_destino: nota.clienteDestino,
            destino: nota.destino,
            volumes: nota.volumes
          })
      })
      
      if (error) throw error
      
      // Atualizar contadores do palete
      await this.atualizarContadoresPalete(palete_id)
    } catch (error) {
      console.error('❌ Erro ao adicionar nota ao palete:', error)
      throw error
    }
  },

  async removerNotaDoPalete(palete_id: string, numero_nf: string): Promise<void> {
    try {
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .delete()
          .eq('palete_id', palete_id)
          .eq('numero_nf', numero_nf)
      })
      
      if (error) throw error
      
      // Atualizar contadores do palete
      await this.atualizarContadoresPalete(palete_id)
    } catch (error) {
      console.error('❌ Erro ao remover nota do palete:', error)
      throw error
    }
  },

  async atualizarContadoresPalete(palete_id: string): Promise<void> {
    try {
      const { data: notas } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('volumes')
          .eq('palete_id', palete_id)
      })
      
      const total_volumes = notas?.reduce((acc, n) => acc + (n.volumes || 0), 0) || 0
      const quantidade_nfs = notas?.length || 0
      
      await this.atualizarPalete(palete_id, {
        quantidade_volumes: total_volumes,
        quantidade_nfs: quantidade_nfs
      })
    } catch (error) {
      console.error('❌ Erro ao atualizar contadores do palete:', error)
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
        status: 'aguardando_agendamento'
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
      
      // Se tiver carga associada, atualizar contadores
      if (palete.carga_id) {
        const carga = await this.buscarCarga(palete.carga_id)
        if (carga) {
          await this.atualizarCarga(palete.carga_id, {
            quantidade_paletes: (carga.quantidade_paletes || 0) + (dados.quantidade_paletes || 0),
            quantidade_gaiolas: (carga.quantidade_gaiolas || 0) + (dados.quantidade_gaiolas || 0),
            quantidade_caixas_mangas: (carga.quantidade_caixas_mangas || 0) + (dados.quantidade_caixas_mangas || 0),
            total_volumes: (carga.total_volumes || 0) + palete.quantidade_volumes,
            total_nfs: (carga.total_nfs || 0) + palete.quantidade_nfs
          })
        }
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
          const { data: notasData } = await retryWithBackoff(async () => {
            return await getSupabase()
              .from('wms_palete_notas')
              .select('*')
              .eq('palete_id', palete.id)
          })
          
          return {
            ...palete,
            posicao,
            notas: notasData || []
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
            .eq('id', posicaoData.palete_id)
            .single()
        })
        palete = paleteData
      }
      
      return {
        ...posicaoData,
        palete
      } as WMSPosicao
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
            .eq('id', posicaoData.palete_id)
            .single()
        })
        palete = paleteData
      }
      
      return {
        ...posicaoData,
        palete
      } as WMSPosicao
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
      let query = getSupabase()
        .from('wms_posicoes')
        .select('*')
        .order('corredor', { ascending: true })
        .order('rua', { ascending: true })
        .order('nivel', { ascending: true })
      
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
      
      const { data, error } = await retryWithBackoff(async () => query)
      
      if (error) throw error
      return (data || []) as WMSPosicao[]
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
      
      // Lógica original para posição única
      // Buscar notas do palete para identificar cliente/destino
      const { data: notas } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('cliente_destino, destino')
          .eq('palete_id', palete.id)
          .limit(1)
      })
      
      const cliente_destino = notas?.[0]?.cliente_destino
      const destino = notas?.[0]?.destino
      
      // Buscar posições disponíveis
      const posicoes = await this.listarPosicoes({ status: 'disponivel' })
      
      // Calcular score para cada posição
      const sugestoes: WMSSugestaoPosicao[] = posicoes.map(posicao => {
        let score = 0
        const motivos: string[] = []
        
        // Compatibilidade de cliente (peso: 30)
        const compat_cliente = cliente_destino && posicao.cliente_preferencial === cliente_destino
        if (compat_cliente) {
          score += 30
          motivos.push('Cliente preferencial')
        }
        
        // Compatibilidade de destino (peso: 20)
        const compat_destino = destino && posicao.destino_preferencial === destino
        if (compat_destino) {
          score += 20
          motivos.push('Destino preferencial')
        }
        
        // Nível preferido (níveis 1-2 para alta giro, 4-5 para baixa giro)
        // Assumindo alta giro por padrão (níveis 1-2)
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
          compatibilidade_cliente: compat_cliente || false,
          compatibilidade_destino: compat_destino || false,
          nivel_preferido
        }
      })
      
      // Ordenar por score e retornar top N
      return sugestoes
        .sort((a, b) => b.score - a.score)
        .slice(0, limite)
    } catch (error) {
      console.error('❌ Erro ao sugerir posições:', error)
      return []
    }
  },

  async sugerirConjuntoPosicoes(palete: WMSPalete, quantidadePosicoes: number, limite: number = 10): Promise<WMSSugestaoConjuntoPosicoes[]> {
    try {
      // Buscar notas do palete para identificar cliente/destino
      const { data: notas } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('cliente_destino, destino')
          .eq('palete_id', palete.id)
          .limit(1)
      })
      
      const cliente_destino = notas?.[0]?.cliente_destino
      const destino = notas?.[0]?.destino
      
      // Buscar posições disponíveis
      const posicoes = await this.listarPosicoes({ status: 'disponivel' })
      
      // Agrupar posições por corredor, rua e nível
      const posicoesPorLocalizacao = new Map<string, WMSPosicao[]>()
      posicoes.forEach(pos => {
        const key = `${pos.corredor}-${pos.rua}-${pos.nivel}`
        if (!posicoesPorLocalizacao.has(key)) {
          posicoesPorLocalizacao.set(key, [])
        }
        posicoesPorLocalizacao.get(key)!.push(pos)
      })
      
      const sugestoes: WMSSugestaoConjuntoPosicoes[] = []
      
      // Para cada localização, tentar encontrar posições adjacentes
      for (const [key, posicoesLocal] of posicoesPorLocalizacao.entries()) {
        // Ordenar posições por algum critério (ex: id ou código)
        posicoesLocal.sort((a, b) => {
          if (a.corredor !== b.corredor) return a.corredor - b.corredor
          if (a.rua !== b.rua) return a.rua - b.rua
          if (a.nivel !== b.nivel) return a.nivel - b.nivel
          return 0
        })
        
        // Tentar encontrar sequências de posições adjacentes
        // Como as posições estão no mesmo corredor/rua/nível, vamos assumir que são adjacentes
        // se houver quantidade suficiente disponível
        if (posicoesLocal.length >= quantidadePosicoes) {
          // Pegar as primeiras N posições disponíveis
          const conjuntoPosicoes = posicoesLocal.slice(0, quantidadePosicoes)
          const posicaoInicial = conjuntoPosicoes[0]
          
          // Calcular score para o conjunto
          let score = 0
          const motivos: string[] = []
          
          // Compatibilidade de cliente (peso: 30)
          const compat_cliente = cliente_destino && posicaoInicial.cliente_preferencial === cliente_destino
          if (compat_cliente) {
            score += 30
            motivos.push('Cliente preferencial')
          }
          
          // Compatibilidade de destino (peso: 20)
          const compat_destino = destino && posicaoInicial.destino_preferencial === destino
          if (compat_destino) {
            score += 20
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
          
          // Bônus por posições adjacentes (peso: 20)
          score += 20
          motivos.push(`${quantidadePosicoes} posições adjacentes`)
          
          sugestoes.push({
            posicoes: conjuntoPosicoes,
            score,
            motivo: motivos.join(', ') || 'Conjunto de posições disponíveis',
            compatibilidade_cliente: compat_cliente || false,
            compatibilidade_destino: compat_destino || false,
            nivel_preferido,
            posicao_inicial: posicaoInicial
          })
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
      // Buscar associação nota-palete
      const { data: paleteNota } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('palete_id')
          .eq('numero_nf', numero_nf)
          .single()
      })
      
      if (!paleteNota) {
        return {
          palete: null,
          posicao: null,
          carga: null,
          notas_palete: []
        }
      }
      
      // Buscar palete
      const palete = await this.buscarPalete(paleteNota.palete_id)
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
      const { data: notasData } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('wms_palete_notas')
          .select('*')
          .eq('palete_id', palete.id)
      })
      
      const notas_palete: NotaFiscal[] = (notasData || []).map(n => ({
        id: n.id,
        numeroNF: n.numero_nf,
        codigoCompleto: n.codigo_completo,
        volumes: n.volumes || 0,
        fornecedor: n.fornecedor || '',
        clienteDestino: n.cliente_destino || '',
        destino: n.destino || '',
        tipoCarga: '',
        data: '',
        timestamp: n.data_associacao,
        status: 'ok'
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
      const cargas_aguardando = await this.listarCargas({ status: 'aguardando_agendamento' })
      
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
  }
}

