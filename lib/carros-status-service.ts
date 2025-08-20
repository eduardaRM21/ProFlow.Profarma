import { getSupabase } from './supabase-client'

export interface CarroStatus {
  id?: string
  carro_id: string
  nome_carro: string
  colaboradores: string[]
  data: string
  turno: string
  destino_final: string
  quantidade_nfs: number
  total_volumes: number
  data_criacao: string
  data_finalizacao?: string
  numeros_sap?: string[]
  status_carro: 'embalando' | 'divergencia' | 'aguardando_lancamento' | 'pronto' | 'em_producao' | 'finalizado' | 'lancado'
  nfs: any[]
  estimativa_pallets: number
  session_id: string
}

export interface CarroStatusUpdate {
  status_carro?: 'embalando' | 'divergencia' | 'aguardando_lancamento' | 'pronto' | 'em_producao' | 'finalizado' | 'lancado'
  numeros_sap?: string[]
  data_finalizacao?: string
  nfs?: any[]
  quantidade_nfs?: number
  total_volumes?: number
  [key: string]: unknown
}

export const CarrosStatusService = {
  // Salvar ou atualizar carro
  async salvarCarro(carro: CarroStatus): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('carros_status')
        .upsert({
          carro_id: carro.carro_id,
          nome_carro: carro.nome_carro,
          colaboradores: carro.colaboradores,
          data: carro.data,
          turno: carro.turno,
          destino_final: carro.destino_final,
          quantidade_nfs: carro.quantidade_nfs,
          total_volumes: carro.total_volumes,
          data_criacao: carro.data_criacao,
          data_finalizacao: carro.data_finalizacao,
          numeros_sap: carro.numeros_sap,
          status_carro: carro.status_carro,
          nfs: carro.nfs,
          estimativa_pallets: carro.estimativa_pallets,
          session_id: carro.session_id
        }, {
          onConflict: 'carro_id'
        })

      if (error) {
        console.error('Erro ao salvar carro:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao salvar carro:', error)
      return { success: false, error: 'Erro interno do servidor' }
    }
  },

  // Atualizar status do carro
  async atualizarStatusCarro(carroId: string, updates: CarroStatusUpdate): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('carros_status')
        .update(updates)
        .eq('carro_id', carroId)

      if (error) {
        console.error('Erro ao atualizar status do carro:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao atualizar status do carro:', error)
      return { success: false, error: 'Erro interno do servidor' }
    }
  },

  // Buscar todos os carros
  async buscarCarros(): Promise<{ success: boolean; carros?: CarroStatus[]; error?: string }> {
    try {
      const supabase = getSupabase()
      
      const { data, error } = await supabase
        .from('carros_status')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar carros:', error)
        return { success: false, error: error.message }
      }

      return { success: true, carros: (data as unknown as CarroStatus[]) || [] }
    } catch (error) {
      console.error('Erro ao buscar carros:', error)
      return { success: false, error: 'Erro interno do servidor' }
    }
  },

  // Buscar carros por status
  async buscarCarrosPorStatus(status: string): Promise<{ success: boolean; carros?: CarroStatus[]; error?: string }> {
    try {
      const supabase = getSupabase()
      
      const { data, error } = await supabase
        .from('carros_status')
        .select('*')
        .eq('status_carro', status)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar carros por status:', error)
        return { success: false, error: error.message }
      }

      return { success: true, carros: (data as unknown as CarroStatus[]) || [] }
    } catch (error) {
      console.error('Erro ao buscar carros por status:', error)
      return { success: false, error: 'Erro interno do servidor' }
    }
  },

  // Buscar carro específico
  async buscarCarro(carroId: string): Promise<{ success: boolean; carro?: CarroStatus; error?: string }> {
    try {
      const supabase = getSupabase()
      
      const { data, error } = await supabase
        .from('carros_status')
        .select('*')
        .eq('carro_id', carroId)
        .single()

      if (error) {
        console.error('Erro ao buscar carro:', error)
        return { success: false, error: error.message }
      }

      return { success: true, carro: data as unknown as CarroStatus }
    } catch (error) {
      console.error('Erro ao buscar carro:', error)
      return { success: false, error: 'Erro interno do servidor' }
    }
  },

  // Excluir carro
  async excluirCarro(carroId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('carros_status')
        .delete()
        .eq('carro_id', carroId)

      if (error) {
        console.error('Erro ao excluir carro:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao excluir carro:', error)
      return { success: false, error: 'Erro interno do servidor' }
    }
  },

  // Excluir nota individual do carro
  async excluirNotaCarro(carroId: string, notaId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Primeiro, buscar o carro atual
      const carroResult = await this.buscarCarro(carroId)
      if (!carroResult.success || !carroResult.carro) {
        return { success: false, error: 'Carro não encontrado' }
      }

      const carro = carroResult.carro
      const nfsAtualizadas = carro.nfs.filter((nf: any) => nf.id !== notaId)
      
      // Recalcular totais
      const quantidadeNfs = nfsAtualizadas.length
      const totalVolumes = nfsAtualizadas.reduce((sum: number, nf: any) => sum + (nf.volume || 0), 0)

      // Atualizar carro
      return await this.atualizarStatusCarro(carroId, {
        nfs: nfsAtualizadas,
        quantidade_nfs: quantidadeNfs,
        total_volumes: totalVolumes
      })
    } catch (error) {
      console.error('Erro ao excluir nota do carro:', error)
      return { success: false, error: 'Erro interno do servidor' }
    }
  }
}
