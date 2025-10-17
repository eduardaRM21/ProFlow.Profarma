import { getSupabase } from './supabase-client';

export interface NotaBipada {
  id?: string;
  numero_nf: string;
  codigo_completo: string;
  area_origem: 'recebimento' | 'embalagem' | 'inventario' | 'custos';
  session_id: string;
  colaboradores: string[];
  data: string;
  turno: string;
  volumes: number;
  destino: string;
  fornecedor: string;
  cliente_destino: string;
  tipo_carga: string;
  status?: string;
  timestamp_bipagem?: string;
  observacoes?: string;
  divergencia?: any;
  created_at?: string;
  updated_at?: string;
}

export interface NotaBipadaStats {
  total: number;
  por_setor: Record<string, number>;
  por_turno: Record<string, number>;
  por_data: Record<string, number>;
}

export class NotasBipadasService {
  private static instance: NotasBipadasService;

  private constructor() {}

  public static getInstance(): NotasBipadasService {
    if (!NotasBipadasService.instance) {
      NotasBipadasService.instance = new NotasBipadasService();
    }
    return NotasBipadasService.instance;
  }

  /**
   * Salva uma nova nota bipada no banco de dados
   */
  async salvarNotaBipada(nota: NotaBipada): Promise<string> {
    try {
      const supabase = getSupabase();
      
      // Verificar se a nota já foi bipada na mesma sessão (VALIDAÇÃO CRÍTICA)
      console.log(`🔍 Verificando duplicata no serviço para NF ${nota.numero_nf}, session_id: ${nota.session_id}`);
      
      const { data: notaExistente, error: erroVerificacao } = await supabase
        .from('notas_bipadas')
        .select('id, numero_nf, timestamp_bipagem, session_id, area_origem')
        .eq('numero_nf', nota.numero_nf)
        .eq('session_id', nota.session_id)
        .eq('area_origem', nota.area_origem)
        .single();

      if (erroVerificacao && erroVerificacao.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar duplicata no serviço:', erroVerificacao);
        // Em caso de erro, bloquear o salvamento para evitar duplicação
        throw new Error(`Erro ao verificar duplicatas. Não foi possível salvar a nota ${nota.numero_nf}.`);
      }

      if (notaExistente) {
        const timestampFormatado = notaExistente.timestamp_bipagem 
          ? new Date(notaExistente.timestamp_bipagem as string).toLocaleString('pt-BR')
          : 'agora';
        
        console.log(`⚠️ DUPLICATA DETECTADA no serviço: NF ${nota.numero_nf} já existe:`, notaExistente);
        throw new Error(`NF ${nota.numero_nf} já foi bipada nesta sessão (${timestampFormatado}). Duplicatas não são permitidas.`);
      }
      
      console.log(`✅ Validação de duplicata no serviço passou para NF ${nota.numero_nf}`);
      
      const { data, error } = await supabase
        .from('notas_bipadas')
        .insert(nota as any)
        .select('id')
        .single() as { data: { id: string } | null; error: any };

      if (error) {
        console.error('❌ Erro ao salvar nota bipada:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Dados não retornados ao salvar nota bipada');
      }

      console.log('✅ Nota bipada salva com sucesso:', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ Erro ao salvar nota bipada:', error);
      throw error;
    }
  }

  /**
   * Busca todas as notas bipadas com filtros opcionais
   */
  async buscarNotasBipadas(filtros?: {
    area_origem?: string;
    data?: string;
    turno?: string;
    numero_nf?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<NotaBipada[]> {
    try {
      const supabase = getSupabase();
      let query = supabase
        .from('notas_bipadas')
        .select('*')
        .order('timestamp_bipagem', { ascending: false });

      // Aplicar filtros
      if (filtros?.area_origem) {
        query = query.eq('area_origem', filtros.area_origem);
      }
      if (filtros?.data) {
        query = query.eq('data', filtros.data);
      }
      if (filtros?.turno) {
        query = query.eq('turno', filtros.turno);
      }
      if (filtros?.numero_nf) {
        query = query.eq('numero_nf', filtros.numero_nf);
      }
      if (filtros?.status) {
        query = query.eq('status', filtros.status);
      }
      if (filtros?.limit) {
        query = query.limit(filtros.limit);
      }
      if (filtros?.offset) {
        query = query.range(filtros.offset, (filtros.offset + (filtros.limit || 100)) - 1);
      }

      const { data, error } = await query as { data: NotaBipada[] | null; error: any };

      if (error) {
        console.error('❌ Erro ao buscar notas bipadas:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar notas bipadas:', error);
      throw error;
    }
  }

  /**
   * Busca uma nota específica por número da NF
   */
  async buscarNotaPorNF(numeroNF: string): Promise<NotaBipada[]> {
    try {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('notas_bipadas')
        .select('*')
        .eq('numero_nf', numeroNF)
        .order('timestamp_bipagem', { ascending: false }) as { data: NotaBipada[] | null; error: any };

      if (error) {
        console.error('❌ Erro ao buscar nota por NF:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar nota por NF:', error);
      throw error;
    }
  }

  /**
   * Atualiza o status de uma nota bipada
   */
  async atualizarStatus(id: string, novoStatus: string, observacoes?: string): Promise<void> {
    try {
      const supabase = getSupabase();
      
      const updateData: any = { status: novoStatus };
      if (observacoes) {
        updateData.observacoes = observacoes;
      }

      const { error } = await supabase
        .from('notas_bipadas')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('❌ Erro ao atualizar status:', error);
        throw error;
      }

      console.log('✅ Status atualizado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      throw error;
    }
  }

  /**
   * Busca estatísticas das notas bipadas
   */
  async buscarEstatisticas(filtros?: {
    data?: string;
    turno?: string;
    area_origem?: string;
  }): Promise<NotaBipadaStats> {
    try {
      const supabase = getSupabase();
      
      // Buscar total geral
      let queryTotal = supabase
        .from('notas_bipadas')
        .select('*', { count: 'exact', head: true });

      // Aplicar filtros
      if (filtros?.data) {
        queryTotal = queryTotal.eq('data', filtros.data);
      }
      if (filtros?.turno) {
        queryTotal = queryTotal.eq('turno', filtros.turno);
      }
      if (filtros?.area_origem) {
        queryTotal = queryTotal.eq('area_origem', filtros.area_origem);
      }

      const { count: total, error: errorTotal } = await queryTotal;

      if (errorTotal) {
        console.error('❌ Erro ao buscar total:', errorTotal);
        throw errorTotal;
      }

      // Buscar por setor
      let querySetor = supabase
        .from('notas_bipadas')
        .select('area_origem');
      
      if (filtros?.data) {
        querySetor = querySetor.eq('data', filtros.data);
      }
      if (filtros?.turno) {
        querySetor = querySetor.eq('turno', filtros.turno);
      }
      
      const { data: porSetor, error: errorSetor } = await querySetor as { data: { area_origem: string }[] | null; error: any };

      if (errorSetor) {
        console.error('❌ Erro ao buscar por setor:', errorSetor);
        throw errorSetor;
      }

      // Processar estatísticas
      const stats: NotaBipadaStats = {
        total: total || 0,
        por_setor: {},
        por_turno: {},
        por_data: {}
      };

      // Contar por setor
      if (porSetor) {
        porSetor.forEach((item: { area_origem: string }) => {
          stats.por_setor[item.area_origem] = (stats.por_setor[item.area_origem] || 0) + 1;
        });
      }

      return stats;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  /**
   * Busca notas bipadas em tempo real (para CRDK)
   */
  async buscarNotasTempoReal(callback: (notas: NotaBipada[]) => void): Promise<() => void> {
    try {
      const supabase = getSupabase();
      
      const subscription = supabase
        .channel('notas_bipadas_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notas_bipadas'
          },
          async (payload) => {
            console.log('🔄 Mudança detectada em notas_bipadas:', payload);
            
            // Buscar dados atualizados
            const notas = await this.buscarNotasBipadas({ limit: 100 });
            callback(notas);
          }
        )
        .subscribe();

      // Retornar função para cancelar inscrição
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('❌ Erro ao configurar tempo real:', error);
      throw error;
    }
  }

  /**
   * Exporta notas bipadas para CSV
   */
  async exportarParaCSV(filtros?: {
    area_origem?: string;
    data?: string;
    turno?: string;
    status?: string;
  }): Promise<string> {
    try {
      const notas = await this.buscarNotasBipadas(filtros);
      
      if (notas.length === 0) {
        return '';
      }

      // Cabeçalho CSV
      const headers = [
        'NF',
        'Setor',
        'Data',
        'Turno',
        'Colaboradores',
        'Volumes',
        'Destino',
        'Fornecedor',
        'Cliente',
        'Tipo Carga',
        'Status',
        'Data/Hora Bipagem',
        'Observações'
      ].join(',');

      // Dados CSV
      const rows = notas.map(nota => [
        nota.numero_nf,
        nota.area_origem,
        nota.data,
        nota.turno,
        nota.colaboradores.join('; '),
        nota.volumes,
        nota.destino,
        nota.fornecedor,
        nota.cliente_destino,
        nota.tipo_carga,
        nota.status,
        nota.timestamp_bipagem,
        nota.observacoes || ''
      ].map(field => `"${field}"`).join(','));

      return [headers, ...rows].join('\n');
    } catch (error) {
      console.error('❌ Erro ao exportar para CSV:', error);
      throw error;
    }
  }

  /**
   * Valida se uma NF foi processada no setor de recebimento
   * Esta função é essencial para garantir que NFs só sejam bipadas em outros setores
   * após serem processadas no recebimento
   */
  async validarNFRecebimento(numeroNF: string, data?: string, turno?: string): Promise<{
    valida: boolean;
    motivo?: string;
    notaRecebimento?: NotaBipada;
  }> {
    try {
      console.log(`🔍 Validando NF ${numeroNF} no recebimento - Data: ${data || 'N/A'}, Turno: ${turno || 'N/A'}`)
      
      const supabase = getSupabase();
      
      // Verificar se a tabela existe
      console.log('🔍 Verificando conectividade com o banco...')
      
      // Buscar a NF no setor de recebimento
      let query = supabase
        .from('notas_bipadas')
        .select('*')
        .eq('numero_nf', numeroNF)
        .eq('area_origem', 'recebimento')
        .order('timestamp_bipagem', { ascending: false });

      // Aplicar filtros de data e turno se fornecidos
      if (data) {
        query = query.eq('data', data);
      }
      if (turno) {
        query = query.eq('turno', turno);
      }

      console.log(`🔍 Executando query: NF=${numeroNF}, Area=recebimento, Data=${data || 'N/A'}, Turno=${turno || 'N/A'}`)
      
      const { data: notasRecebimento, error } = await query as { data: NotaBipada[] | null; error: any };

      if (error) {
        console.error('❌ Erro ao validar NF no recebimento:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Retornar erro em vez de propagar
        return {
          valida: false,
          motivo: `Erro na consulta ao banco: ${error.message || 'Erro desconhecido'}`
        };
      }

      // Se não encontrou nenhuma nota no recebimento
      if (!notasRecebimento || notasRecebimento.length === 0) {
        return {
          valida: false,
          motivo: `NF ${numeroNF} não foi processada no setor de recebimento. É obrigatório processar a NF primeiro no recebimento antes de bipá-la em outros setores.`
        };
      }

      // Verificar se há pelo menos uma nota com status válido
      const notaValida = notasRecebimento.find(nota => 
        nota.status === 'bipada' || 
        nota.status === 'processada' || 
        nota.status === 'ok'
      );

      if (!notaValida) {
        return {
          valida: false,
          motivo: `NF ${numeroNF} foi encontrada no recebimento mas não possui status válido. Status atual: ${notasRecebimento[0]?.status}`
        };
      }

      // NF válida - foi processada no recebimento
      return {
        valida: true,
        notaRecebimento: notaValida
      };

    } catch (error) {
      console.error('❌ Erro ao validar NF no recebimento:', {
        error,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Retornar erro estruturado em vez de propagar
      return {
        valida: false,
        motivo: `Erro ao validar NF no recebimento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * Busca todas as NFs processadas no recebimento em uma data/turno específicos
   * Útil para relatórios e validações
   */
  async buscarNFsRecebimento(data?: string, turno?: string): Promise<NotaBipada[]> {
    try {
      const supabase = getSupabase();
      
      let query = supabase
        .from('notas_bipadas')
        .select('*')
        .eq('area_origem', 'recebimento')
        .order('timestamp_bipagem', { ascending: false });

      if (data) {
        query = query.eq('data', data);
      }
      if (turno) {
        query = query.eq('turno', turno);
      }

      const { data: notas, error } = await query as { data: NotaBipada[] | null; error: any };

      if (error) {
        console.error('❌ Erro ao buscar NFs do recebimento:', error);
        throw error;
      }

      return notas || [];
    } catch (error) {
      console.error('❌ Erro ao buscar NFs do recebimento:', error);
      throw error;
    }
  }
}

// Hook para usar o serviço
export const useNotasBipadas = () => {
  return NotasBipadasService.getInstance();
};
