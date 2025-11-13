import { getSupabase, retryWithBackoff } from './supabase-client'

export interface EmbalagemNotaBipada {
  id?: string
  numero_nf: string
  codigo_completo: string
  carro_id?: string
  session_id: string
  colaboradores: string
  data: string
  turno: string
  volumes: number
  destino: string
  fornecedor: string
  cliente_destino: string
  tipo_carga: string
  status: string
  observacoes?: string
  timestamp_bipagem?: string
  posicoes?: number
  palletes?: number
  gaiolas?: number
  caixas_mangas?: number
  data_finalizacao?: string
  created_at?: string
  updated_at?: string
}

export interface CarroStatus {
  id: string
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
  status_carro: "embalando" | "divergencia" | "aguardando_lancamento" | "finalizado" | "pronto" | "lancado"
  nfs: any[]
  estimativa_pallets: number
  posicoes?: number
  palletes?: number
  gaiolas?: number
  caixas_mangas?: number
  session_id: string
  created_at?: string
  updated_at?: string
}

export class EmbalagemNotasBipadasService {
  
  /**
   * Método de teste para verificar se a classe está funcionando
   */
  static testMethod(): string {
    return "Classe funcionando corretamente"
  }

  /**
   * Finaliza um carro (muda status para "finalizado" e salva pallets reais)
   */
  static async finalizarCarro(carroId: string, palletsReais: number, dadosDetalhados?: {
    quantidadePosicoes?: number;
    tiposPosicao?: {
      paletes: boolean;
      gaiolas: boolean;
      caixaManga: boolean;
    };
    quantidadePaletesReais?: number | null;
    quantidadeGaiolas?: number | null;
    quantidadeCaixaManga?: number | null;
  }): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      console.log(`✅ Finalizando carro ${carroId} com ${palletsReais} pallets reais`)
      if (dadosDetalhados) {
        console.log('📋 Dados detalhados:', dadosDetalhados)
      }

      // 1. Atualizar o status do carro para "finalizado" na tabela carros_status
      const { error: carroError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('carros_status')
          .update({
            status_carro: 'finalizado',
            posicoes: dadosDetalhados?.quantidadePosicoes || null,
            palletes: dadosDetalhados?.quantidadePaletesReais || null,
            gaiolas: dadosDetalhados?.quantidadeGaiolas || null,
            caixas_mangas: dadosDetalhados?.quantidadeCaixaManga || null,
            data_finalizacao: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('carro_id', carroId)
      })

      if (carroError) {
        console.error('❌ Erro ao atualizar status do carro para finalizado:', carroError)
        return {
          success: false,
          error: `Erro ao atualizar status do carro: ${carroError.message}`
        }
      }

      // 2. Atualizar também o status das notas para "finalizado"
      const { error: notasError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .update({
            status: 'finalizado',
            posicoes: dadosDetalhados?.quantidadePosicoes || null,
            palletes: dadosDetalhados?.quantidadePaletesReais || null,
            gaiolas: dadosDetalhados?.quantidadeGaiolas || null,
            caixas_mangas: dadosDetalhados?.quantidadeCaixaManga || null,
            data_finalizacao: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('carro_id', carroId)
      })

      if (notasError) {
        console.error('❌ Erro ao atualizar status das notas para finalizado:', notasError)
        // Não retornar erro aqui, pois o carro já foi atualizado
        console.warn('⚠️ Aviso: Carro atualizado mas falha ao atualizar notas')
      }

      console.log(`✅ Carro ${carroId} finalizado com sucesso! Pallets reais: ${palletsReais}`)
      if (dadosDetalhados) {
        console.log('📋 Dados detalhados salvos:', {
          quantidadePosicoes: dadosDetalhados.quantidadePosicoes,
          tiposPosicao: dadosDetalhados.tiposPosicao,
          quantidadePaletesReais: dadosDetalhados.quantidadePaletesReais,
          quantidadeGaiolas: dadosDetalhados.quantidadeGaiolas,
          quantidadeCaixaManga: dadosDetalhados.quantidadeCaixaManga
        })
      }
      
      return {
        success: true
      }

    } catch (error) {
      console.error('❌ Erro inesperado ao finalizar carro:', error)
      return {
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }
  /**
   * Salva uma nota bipada na tabela específica do setor de embalagem
   * e atualiza o carro correspondente na tabela carros_status
   */
  static async salvarNotaBipada(notaBipada: EmbalagemNotaBipada): Promise<{
    success: boolean
    id?: string
    error?: string
  }> {
    try {
      console.log('📝 Salvando nota bipada na tabela embalagem_notas_bipadas:', notaBipada)

      // 1. Salvar a nota na tabela embalagem_notas_bipadas
      const { data: notaData, error: notaError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .insert(notaBipada as unknown as Record<string, unknown>)
          .select('id')
          .single()
      })

      if (notaError) {
        console.error('❌ Erro ao salvar nota bipada na tabela embalagem_notas_bipadas:', notaError)
        return {
          success: false,
          error: `Erro ao salvar nota bipada: ${notaError.message}`
        }
      }

      console.log('✅ Nota bipada salva com sucesso na tabela embalagem_notas_bipadas, ID:', notaData?.id)

      // 2. Atualizar ou criar o carro na tabela carros_status
      if (notaBipada.carro_id) {
        const carroUpdateResult = await this.atualizarCarroStatus(notaBipada.carro_id, notaBipada)
        if (!carroUpdateResult.success) {
          console.warn('⚠️ Aviso: Nota salva mas falha ao atualizar carro_status:', carroUpdateResult.error)
        }
      }

      return {
        success: true,
        id: notaData?.id as string
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao salvar nota bipada:', error)
      return {
        success: false,
        error: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Atualiza ou cria o carro na tabela carros_status
   */
  static async atualizarCarroStatus(carroId: string, notaBipada: EmbalagemNotaBipada): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      console.log(`🔄 Atualizando carro_status para carro ${carroId}`)

      // 1. Buscar todas as notas do carro para calcular estatísticas
      const { data: notas, error: notasError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .select('*')
          .eq('carro_id', carroId)
          .eq('status', 'bipada')
      })

      if (notasError) {
        console.error('❌ Erro ao buscar notas do carro:', notasError)
        return {
          success: false,
          error: `Erro ao buscar notas do carro: ${notasError.message}`
        }
      }

      if (!notas || notas.length === 0) {
        console.log('ℹ️ Nenhuma nota encontrada para o carro')
        return { success: true }
      }

      // 2. Calcular estatísticas do carro
      const totalVolumes = notas.reduce((sum, nota) => sum + (Number(nota.volumes) || 0), 0)
      const destinosUnicos = [...new Set(notas.map(nota => nota.destino).filter(Boolean))]
      const colaboradores = notaBipada.colaboradores ? notaBipada.colaboradores.split(',').map(c => c.trim()) : []

      // 3. Preparar dados para inserção/atualização
      const carroData = {
        carro_id: carroId,
        nome_carro: `Carro ${carroId}`,
        colaboradores,
        data: notaBipada.data,
        turno: notaBipada.turno,
        destino_final: destinosUnicos.join(', '),
        quantidade_nfs: notas.length,
        total_volumes: totalVolumes,
        data_criacao: notaBipada.timestamp_bipagem || notaBipada.created_at || new Date().toISOString(),
        status_carro: 'embalando',
        nfs: notas.map(nota => ({
          id: nota.id,
          numero_nf: nota.numero_nf,
          volume: nota.volumes,
          fornecedor: nota.fornecedor,
          codigo: nota.codigo_completo,
          destino: nota.destino,
          tipo_carga: nota.tipo_carga
        })),
        estimativa_pallets: Math.ceil(totalVolumes / 100),
        posicoes: notaBipada.posicoes,
        palletes: notaBipada.palletes,
        gaiolas: notaBipada.gaiolas,
        caixas_mangas: notaBipada.caixas_mangas,
        session_id: notaBipada.session_id,
        updated_at: new Date().toISOString()
      }

      console.log('📋 Dados do carro preparados para inserção:', JSON.stringify(carroData, null, 2))
      console.log('🔍 Campo NFs:', JSON.stringify(carroData.nfs, null, 2))

      // 4. Inserir ou atualizar na tabela carros_status
      const { error: carroError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('carros_status')
          .upsert(carroData, { 
            onConflict: 'carro_id',
            ignoreDuplicates: false 
          })
      })

      if (carroError) {
        console.error('❌ Erro ao atualizar carro_status:', carroError)
        return {
          success: false,
          error: `Erro ao atualizar carro_status: ${carroError.message}`
        }
      }

      console.log(`✅ Carro_status atualizado com sucesso para carro ${carroId}`)
      return { success: true }

    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar carro_status:', error)
      return {
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Busca carros produzidos agrupados pela tabela carros_status
   */
  static async buscarCarrosProduzidos(): Promise<{
    success: boolean
    carros?: Array<{
      id: string
      colaboradores: string[]
      data: string
      turno: string
      destinoFinal: string
      quantidadeNFs: number
      totalVolumes: number
      dataProducao: string
      nfs: Array<{
        id: string
        numeroNF: string
        volume: number
        fornecedor: string
        codigo: string
        destino: string
        tipoCarga: string
      }>
      estimativaPallets: number
      status?: string
      posicoes?: number
      palletes?: number
      gaiolas?: number
      caixasMangas?: number
      dataInicioEmbalagem?: string
      dataFinalizacao?: string
      numeros_sap?: string[] // ← Campo adicionado!
      nome_carro?: string // ← Campo adicionado!
      palletesReais?: number // ← Campo adicionado!
    }>
    error?: string
  }> {
    try {
      console.log('🚛 Buscando carros produzidos da tabela carros_status')

      // Buscar carros da tabela carros_status
      const { data: carrosData, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('carros_status')
          .select('*')
          .order('data_criacao', { ascending: false })
      })

      if (error) {
        console.error('❌ Erro ao buscar carros da tabela carros_status:', error)
        return {
          success: false,
          error: `Erro ao buscar carros: ${error.message}`
        }
      }

      if (!carrosData || carrosData.length === 0) {
        console.log('ℹ️ Nenhum carro encontrado na tabela carros_status')
        return {
          success: true,
          carros: []
        }
      }

      // Converter para o formato esperado
      const carros = await Promise.all(carrosData.map(async (carro: any) => {
        console.log(`🔄 Convertendo carro ${carro.carro_id} - Status original: ${carro.status_carro}`)
        console.log(`📋 Campo NFs original do banco:`, JSON.stringify(carro.nfs, null, 2))
        
        // Buscar dados de posições e pallets da tabela embalagem_notas_bipadas para todos os carros
        let posicoes: number | undefined = undefined;
        let palletes: number | undefined = undefined;
        let gaiolas: number | undefined = undefined;
        let caixasMangas: number | undefined = undefined;
        
        const { data: notasData } = await getSupabase()
          .from('embalagem_notas_bipadas')
          .select('posicoes, palletes, gaiolas, caixas_mangas')
          .eq('carro_id', carro.carro_id)
          .not('posicoes', 'is', null)
          .limit(1);
        
        if (notasData && notasData.length > 0) {
          posicoes = notasData[0].posicoes as number;
          palletes = notasData[0].palletes as number;
          gaiolas = notasData[0].gaiolas as number;
          caixasMangas = notasData[0].caixas_mangas as number;
        }
        
        const nfsConvertidas = (carro.nfs || []).map((nf: any) => ({
          id: nf.id || '',
          numeroNF: nf.numero_nf || nf.numeroNF || '',
          volume: nf.volume || nf.volumes || 0,
          fornecedor: nf.fornecedor || '',
          codigo: nf.codigo || nf.codigo_completo || '',
          destino: nf.destino || '',
          tipoCarga: nf.tipo_carga || nf.tipoCarga || ''
        }))
        
        console.log(`✅ NFs convertidas:`, JSON.stringify(nfsConvertidas, null, 2))
        
        return {
          id: carro.carro_id,
          colaboradores: carro.colaboradores || [],
          data: carro.data,
          turno: carro.turno,
          destinoFinal: carro.destino_final,
          quantidadeNFs: carro.quantidade_nfs,
          totalVolumes: carro.total_volumes,
          dataProducao: carro.data_criacao,
          nfs: nfsConvertidas,
          estimativaPallets: carro.estimativa_pallets,
          status: carro.status_carro,
          posicoes: carro.posicoes || posicoes,
          palletes: carro.palletes || palletes,
          gaiolas: carro.gaiolas || gaiolas,
          caixasMangas: carro.caixas_mangas || caixasMangas,
          dataInicioEmbalagem: carro.data_criacao,
          dataFinalizacao: carro.data_finalizacao,
          numeros_sap: carro.numeros_sap || [], // ← Incluir números SAP!
          nome_carro: carro.nome_carro || `Carro ${carro.carro_id}` // ← Incluir nome do carro!
        }
      }))
      
      console.log('📊 Status dos carros após conversão:', carros.map(c => ({ id: c.id, status: c.status })))

      console.log(`✅ Encontrados ${carros.length} carros na tabela carros_status`)
      return {
        success: true,
        carros
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar carros produzidos:', error)
      return {
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Busca carros prontos para finalização (com todas as notas bipadas)
   */
  static async buscarCarrosProntos(data?: string, turno?: string): Promise<{
    success: boolean
    carrosProntos?: Array<{
      id: string
      colaboradores: string[]
      data: string
      turno: string
      destinoFinal: string
      quantidadeNFs: number
      totalVolumes: number
      dataProducao: string
      nfs: Array<{
        id: string
        numeroNF: string
        volume: number
        fornecedor: string
        codigo: string
        destino: string
        tipoCarga: string
      }>
      estimativaPallets: number
      status?: string
      palletesReais?: number
      dataInicioEmbalagem?: string
      dataFinalizacao?: string
      numeros_sap?: string[]
      nome_carro?: string
    }>
    error?: string
  }> {
    try {
      console.log('🚛 Buscando carros prontos para finalização:', { data, turno })

      // Buscar carros da tabela carros_status com status "embalando"
      let query = getSupabase()
        .from('carros_status')
        .select('*')
        .eq('status_carro', 'embalando')

      if (data) {
        query = query.eq('data', data)
      }
      if (turno) {
        query = query.eq('turno', turno)
      }

      const { data: carrosData, error } = await retryWithBackoff(async () => {
        return await query.order('data_criacao', { ascending: false })
      })

      if (error) {
        console.error('❌ Erro ao buscar carros prontos:', error)
        return {
          success: false,
          error: `Erro ao buscar carros prontos: ${error.message}`
        }
      }

      if (!carrosData || carrosData.length === 0) {
        console.log('ℹ️ Nenhum carro pronto encontrado')
        return {
          success: true,
          carrosProntos: []
        }
      }

      // Converter para o formato esperado
      const carrosProntos = carrosData.map((carro: any) => {
        const nfsConvertidas = (carro.nfs || []).map((nf: any) => ({
          id: nf.id || '',
          numeroNF: nf.numero_nf || nf.numeroNF || '',
          volume: nf.volume || nf.volumes || 0,
          fornecedor: nf.fornecedor || '',
          codigo: nf.codigo || nf.codigo_completo || '',
          destino: nf.destino || '',
          tipoCarga: nf.tipo_carga || nf.tipoCarga || ''
        }))
        
        return {
          id: carro.carro_id,
          colaboradores: carro.colaboradores || [],
          data: carro.data,
          turno: carro.turno,
          destinoFinal: carro.destino_final,
          quantidadeNFs: carro.quantidade_nfs,
          totalVolumes: carro.total_volumes,
          dataProducao: carro.data_criacao,
          nfs: nfsConvertidas,
          estimativaPallets: carro.estimativa_pallets,
          status: carro.status_carro,
          posicoes: carro.posicoes,
          palletes: carro.palletes,
          gaiolas: carro.gaiolas,
          caixasMangas: carro.caixas_mangas,
          dataInicioEmbalagem: carro.data_criacao,
          dataFinalizacao: carro.data_finalizacao,
          numeros_sap: carro.numeros_sap || [],
          nome_carro: carro.nome_carro || `Carro ${carro.carro_id}`
        }
      })

      console.log(`✅ Encontrados ${carrosProntos.length} carros prontos para finalização`)
      return {
        success: true,
        carrosProntos
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar carros prontos:', error)
      return {
        success: false,
        error: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Remove uma nota bipada específica
   */
  static async removerNotaBipada(notaId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      console.log('🗑️ Removendo nota bipada:', notaId)

      // 1. Primeiro, buscar a nota para obter o carro_id antes de removê-la
      console.log('🔍 [SERVIÇO] Buscando nota com ID:', notaId)
      
      // Tentar buscar a nota na tabela principal
      const { data: notaData, error: notaError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .select('carro_id, colaboradores, data, turno, session_id')
          .eq('id', notaId)
          .maybeSingle() // Usar maybeSingle() em vez de single() para evitar erro quando não há registro
      })

      console.log('🔍 [SERVIÇO] Resultado da busca na tabela principal:', { notaData, notaError })

      // Se não encontrou na tabela principal, tentar buscar em outras tabelas possíveis
      if (!notaData && !notaError) {
        console.log('🔍 [SERVIÇO] Nota não encontrada na tabela principal, tentando outras tabelas...')
        
        // Tentar buscar na tabela de notas fiscais
        const { data: notaFiscalData, error: notaFiscalError } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('notas_fiscais')
            .select('id, carro_id')
            .eq('id', notaId)
            .maybeSingle()
        })

        console.log('🔍 [SERVIÇO] Resultado da busca na tabela notas_fiscais:', { notaFiscalData, notaFiscalError })

        if (notaFiscalData) {
          console.log('⚠️ [SERVIÇO] Nota encontrada na tabela notas_fiscais, mas não pode ser excluída de lá')
          return {
            success: false,
            error: 'Esta nota está em uma tabela diferente e não pode ser excluída através desta função'
          }
        }
      }

      if (notaError) {
        console.error('❌ Erro ao buscar nota antes de remover:', notaError)
        return {
          success: false,
          error: `Erro ao buscar nota: ${notaError.message}`
        }
      }

      if (!notaData) {
        console.error('❌ Nota não encontrada:', notaId)
        return {
          success: false,
          error: `Nota com ID ${notaId} não foi encontrada na tabela embalagem_notas_bipadas. A nota pode ter sido excluída anteriormente ou estar em uma tabela diferente.`
        }
      }

      // Verificar se notaData é um objeto válido
      if (typeof notaData !== 'object' || notaData === null) {
        console.error('❌ Dados da nota inválidos:', notaData)
        return {
          success: false,
          error: 'Dados da nota inválidos'
        }
      }

      const carroId = notaData.carro_id as string
      console.log(`📋 Nota ${notaId} pertence ao carro ${carroId}`)

      // 2. Remover a nota da tabela embalagem_notas_bipadas
      const { error: deleteError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .delete()
          .eq('id', notaId)
      })

      if (deleteError) {
        console.error('❌ Erro ao remover nota bipada:', deleteError)
        return {
          success: false,
          error: `Erro ao remover nota: ${deleteError.message}`
        }
      }

      console.log('✅ Nota bipada removida com sucesso')

      // 3. Atualizar o carro_status para refletir as mudanças
      if (carroId) {
        console.log(`🔄 Atualizando carro_status para carro ${carroId} após remoção da nota`)
        
        // Buscar todas as notas restantes do carro
        const { data: notasRestantes, error: notasError } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('embalagem_notas_bipadas')
            .select('*')
            .eq('carro_id', carroId)
            .eq('status', 'bipada')
        })

        if (notasError) {
          console.error('❌ Erro ao buscar notas restantes do carro:', notasError)
          // Não retornar erro aqui, pois a nota já foi removida
        } else {
          // Se não há mais notas, atualizar o carro para refletir que não tem mais NFs
          if (!notasRestantes || notasRestantes.length === 0) {
            console.log(`🔄 Carro ${carroId} não tem mais notas, atualizando estatísticas para zero`)
            
            // Atualizar o carro com estatísticas zeradas mas mantê-lo visível
            const { error: carroUpdateError } = await retryWithBackoff(async () => {
              return await getSupabase()
                .from('carros_status')
                .update({
                  quantidade_nfs: 0,
                  total_volumes: 0,
                  nfs: [],
                  estimativa_pallets: 0,
                  updated_at: new Date().toISOString()
                })
                .eq('carro_id', carroId)
            })

            if (carroUpdateError) {
              console.warn('⚠️ Aviso: Nota removida mas falha ao atualizar carro na tabela carros_status:', carroUpdateError)
            } else {
              console.log(`✅ Carro ${carroId} atualizado com estatísticas zeradas (mantido visível)`)
            }
          } else {
            // Se ainda há notas, atualizar o carro com as estatísticas corretas
            console.log(`🔄 Atualizando carro ${carroId} com ${notasRestantes.length} notas restantes`)
            
            // Criar uma nota fictícia para atualizar o carro (usando dados da primeira nota restante)
            const primeiraNota = notasRestantes[0]
            const notaFicticia: EmbalagemNotaBipada = {
              numero_nf: String(primeiraNota?.numero_nf || ''),
              codigo_completo: String(primeiraNota?.codigo_completo || ''),
              carro_id: carroId,
              session_id: String(primeiraNota?.session_id || ''),
              colaboradores: String(primeiraNota?.colaboradores || ''),
              data: String(primeiraNota?.data || ''),
              turno: String(primeiraNota?.turno || ''),
              volumes: Number(primeiraNota?.volumes || 0),
              destino: String(primeiraNota?.destino || ''),
              fornecedor: String(primeiraNota?.fornecedor || ''),
              cliente_destino: String(primeiraNota?.cliente_destino || ''),
              tipo_carga: String(primeiraNota?.tipo_carga || ''),
              status: String(primeiraNota?.status || 'bipada'),
              timestamp_bipagem: String(primeiraNota?.timestamp_bipagem || primeiraNota?.created_at || new Date().toISOString())
            }
            
            const carroUpdateResult = await this.atualizarCarroStatus(carroId, notaFicticia)
            if (!carroUpdateResult.success) {
              console.warn('⚠️ Aviso: Nota removida mas falha ao atualizar carro_status:', carroUpdateResult.error)
            } else {
              console.log(`✅ Carro ${carroId} atualizado com sucesso após remoção da nota`)
            }
          }
        }
      }

      return {
        success: true
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao remover nota bipada:', error)
      return {
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Verifica se uma nota já foi bipada em algum carro
   */
  static async verificarNotaJaBipada(codigoCompleto: string): Promise<{
    success: boolean
    jaBipada: boolean
    carroInfo?: {
      carro_id: string
      carro_nome: string
      timestamp_bipagem: string
    }
    error?: string
  }> {
    try {
      console.log('🔍 Verificando se nota já foi bipada:', codigoCompleto)

      // Extrair numero_nf do código completo para busca alternativa
      const partes = codigoCompleto.split('|')
      const numeroNF = partes.length >= 2 ? partes[1] : null
      console.log('🔍 Número NF extraído:', numeroNF)

      // 1. Primeiro tentar buscar por codigo_completo (comparação exata) - SEM filtro de status
      // Buscar independente do status, pois se a nota foi bipada, não pode ser bipada novamente
      let { data: notaData, error: notaError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .select('carro_id, timestamp_bipagem, codigo_completo, numero_nf, status')
          .eq('codigo_completo', codigoCompleto.trim())
          .order('timestamp_bipagem', { ascending: false })
          .limit(1)
      })

      if (notaError) {
        console.error('❌ Erro ao verificar se nota já foi bipada (por codigo_completo):', notaError)
      } else {
        console.log('📊 Resultado busca por codigo_completo:', {
          encontradas: notaData?.length || 0,
          codigo_buscado: codigoCompleto.trim(),
          notas: notaData?.map(n => ({ 
            codigo_completo: n.codigo_completo, 
            status: n.status, 
            carro_id: n.carro_id 
          }))
        })
      }

      // 2. Se não encontrou por codigo_completo e temos numero_nf, buscar por numero_nf - SEM filtro de status
      if ((!notaData || notaData.length === 0) && numeroNF) {
        console.log('🔍 Não encontrado por codigo_completo, tentando buscar por numero_nf:', numeroNF)
        
        const resultadoNumeroNF = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('embalagem_notas_bipadas')
            .select('carro_id, timestamp_bipagem, codigo_completo, numero_nf, status')
            .eq('numero_nf', numeroNF.trim())
            .order('timestamp_bipagem', { ascending: false })
            .limit(1)
        })

        if (resultadoNumeroNF.error) {
          console.error('❌ Erro ao verificar por numero_nf:', resultadoNumeroNF.error)
        } else {
          console.log('📊 Resultado busca por numero_nf:', {
            encontradas: resultadoNumeroNF.data?.length || 0,
            numero_nf_buscado: numeroNF.trim(),
            notas: resultadoNumeroNF.data?.map(n => ({ 
              codigo_completo: n.codigo_completo, 
              numero_nf: n.numero_nf,
              status: n.status, 
              carro_id: n.carro_id 
            }))
          })
          
          if (resultadoNumeroNF.data && resultadoNumeroNF.data.length > 0) {
            notaData = resultadoNumeroNF.data
            notaError = null
            console.log('✅ Nota encontrada por numero_nf:', {
              numero_nf: resultadoNumeroNF.data[0].numero_nf,
              codigo_completo_salvo: resultadoNumeroNF.data[0].codigo_completo,
              codigo_completo_buscado: codigoCompleto,
              status: resultadoNumeroNF.data[0].status
            })
          }
        }
      }

      // 3. Se ainda não encontrou, tentar busca case-insensitive e com trim - SEM filtro de status
      if (!notaData || notaData.length === 0) {
        console.log('🔍 Tentando busca case-insensitive nas últimas 100 notas...')
        
        const todasNotas = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('embalagem_notas_bipadas')
            .select('carro_id, timestamp_bipagem, codigo_completo, numero_nf, status')
            .order('timestamp_bipagem', { ascending: false })
            .limit(100)
        })

        if (todasNotas.data && todasNotas.data.length > 0) {
          console.log(`📊 Total de notas carregadas para busca: ${todasNotas.data.length}`)
          const codigoCompletoNormalizado = codigoCompleto.trim().toUpperCase()
          const numeroNFNormalizado = numeroNF ? numeroNF.trim() : null
          
          const notaEncontrada = todasNotas.data.find((nota: any) => {
            const codigoSalvo = (nota.codigo_completo || '').trim().toUpperCase()
            const numeroNFSalvo = (nota.numero_nf || '').trim()
            
            const matchCodigo = codigoSalvo === codigoCompletoNormalizado
            const matchNumero = numeroNFNormalizado && numeroNFSalvo === numeroNFNormalizado
            
            if (matchCodigo || matchNumero) {
              console.log('🎯 Match encontrado:', {
                matchCodigo,
                matchNumero,
                codigo_salvo: nota.codigo_completo,
                codigo_buscado: codigoCompleto,
                numero_nf_salvo: nota.numero_nf,
                numero_nf_buscado: numeroNF,
                status: nota.status
              })
            }
            
            return matchCodigo || matchNumero
          })

          if (notaEncontrada) {
            notaData = [notaEncontrada]
            console.log('✅ Nota encontrada após normalização:', {
              codigo_salvo: notaEncontrada.codigo_completo,
              codigo_buscado: codigoCompleto,
              numero_nf_salvo: notaEncontrada.numero_nf,
              status: notaEncontrada.status
            })
          } else {
            console.log('⚠️ Nota não encontrada nem após normalização. Verificando se número NF existe na lista...')
            if (numeroNFNormalizado) {
              const notaComMesmoNumero = todasNotas.data.find((n: any) => (n.numero_nf || '').trim() === numeroNFNormalizado)
              if (notaComMesmoNumero) {
                console.log('🔍 Encontrada nota com mesmo número NF mas código diferente:', {
                  codigo_completo_salvo: notaComMesmoNumero.codigo_completo,
                  codigo_completo_buscado: codigoCompleto,
                  numero_nf: notaComMesmoNumero.numero_nf,
                  status: notaComMesmoNumero.status
                })
                notaData = [notaComMesmoNumero]
              }
            }
          }
        } else {
          console.log('⚠️ Nenhuma nota encontrada na busca ampliada')
        }
      }

      if (notaError) {
        console.error('❌ Erro ao verificar se nota já foi bipada:', notaError)
        return {
          success: false,
          jaBipada: false,
          error: `Erro ao verificar nota: ${notaError.message}`
        }
      } 

      if (notaData && notaData.length > 0) {
        const nota = notaData[0] as { carro_id: string; timestamp_bipagem: string; codigo_completo?: string; numero_nf?: string }

        // Buscar informações do carro na tabela carros_status
        const { data: carroData, error: carroError } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('carros_status')
            .select('carro_id, nome_carro')
            .eq('carro_id', nota.carro_id)
            .limit(1)
            .maybeSingle()
        })

        if (carroError) {
          console.error('❌ Erro ao buscar informações do carro:', carroError)
        }

        const carroNome = (carroData?.nome_carro as string) || (carroData?.carro_id as string) || 'Carro não encontrado'

        console.log('⚠️ Nota já foi bipada em outro carro:', {
          carro_id: nota.carro_id,
          carro_nome: carroNome,
          timestamp: nota.timestamp_bipagem,
          codigo_completo_encontrado: nota.codigo_completo,
          numero_nf_encontrado: nota.numero_nf
        })

        return {
          success: true,
          jaBipada: true,
          carroInfo: {
            carro_id: nota.carro_id,
            carro_nome: carroNome,
            timestamp_bipagem: nota.timestamp_bipagem
          }
        }
      }

      console.log('✅ Nota não foi bipada em nenhum carro (verificação completa realizada)')
      return {
        success: true,
        jaBipada: false
      }

    } catch (error) {
      console.error('❌ Erro inesperado ao verificar se nota já foi bipada:', error)
      return {
        success: false,
        jaBipada: false,
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Atualiza o status de todas as notas de um carro específico
   */
  static async atualizarStatusCarro(carroId: string, novoStatus: string, dadosAdicionais?: {
    numeros_sap?: string[]
    data_finalizacao?: string
    novo_carro_id?: string
  }): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      console.log(`🔄 Atualizando status do carro ${carroId} para: ${novoStatus}`)

      // Preparar dados para atualização
      const updateData: any = {
        status: novoStatus,
        updated_at: new Date().toISOString()
      }

      // Adicionar dados adicionais se fornecidos
      if (dadosAdicionais?.numeros_sap) {
        updateData.numeros_sap = dadosAdicionais.numeros_sap
      }
      if (dadosAdicionais?.data_finalizacao) {
        updateData.data_finalizacao = dadosAdicionais.data_finalizacao
      }

      // REGRA DE NEGÓCIO: Substituir ID do carro pelo número SAP quando finalizado pelo Admin
      if (dadosAdicionais?.novo_carro_id && novoStatus === 'finalizado') {
        updateData.carro_id = dadosAdicionais.novo_carro_id
        console.log(`🔄 Alterando ID do carro de ${carroId} para ${dadosAdicionais.novo_carro_id}`)
      }

      // Atualizar todas as notas do carro
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .update(updateData)
          .eq('carro_id', carroId)
      })

      if (error) {
        console.error('❌ Erro ao atualizar status do carro:', error)
        return {
          success: false,
          error: `Erro ao atualizar status: ${error.message}`
        }
      }

      // Atualizar também o status na tabela carros_status
      console.log('🔄 Atualizando tabela carros_status com status:', novoStatus)
      
      // Preparar dados para atualização do carro
      const carroUpdateData: any = {
        status_carro: novoStatus,
        numeros_sap: dadosAdicionais?.numeros_sap,
        data_finalizacao: dadosAdicionais?.data_finalizacao,
        updated_at: new Date().toISOString()
      }

      // Se o status for "lancado" e houver números SAP, atualizar o nome do carro
      if (novoStatus === 'lancado' && dadosAdicionais?.numeros_sap && dadosAdicionais.numeros_sap.length > 0) {
        // Usar o primeiro número SAP como identificador do carro
        const numeroSAP = dadosAdicionais.numeros_sap[0]
        carroUpdateData.nome_carro = `Carro ${numeroSAP}`
        console.log(`🔄 Atualizando nome do carro para: Carro ${numeroSAP}`)
      }

      const { error: carroError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('carros_status')
          .update(carroUpdateData)
          .eq('carro_id', carroId)
      })

      if (carroError) {
        console.error('❌ Erro ao atualizar carros_status:', carroError)
        return {
          success: false,
          error: `Erro ao atualizar status do carro: ${carroError.message}`
        }
      } else {
        console.log('✅ Tabela carros_status atualizada com sucesso')
      }

      console.log(`✅ Status do carro ${carroId} atualizado com sucesso para: ${novoStatus}`)
      if (dadosAdicionais?.novo_carro_id) {
        console.log(`✅ ID do carro alterado de ${carroId} para ${dadosAdicionais.novo_carro_id}`)
      }
      
      return {
        success: true
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar status do carro:', error)
      return {
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Busca o status atual de um carro específico
   */
  static async buscarStatusCarro(carroId: string): Promise<{
    success: boolean
    status?: string
    numeros_sap?: string[]
    data_finalizacao?: string
    error?: string
  }> {
    try {
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .select('status, numeros_sap, data_finalizacao')
          .eq('carro_id', carroId)
          .limit(1)
          .single()
      })

      if (error) {
        return {
          success: false,
          error: `Erro ao buscar status: ${error.message}`
        }
      }

      return {
        success: true,
        status: data.status as string,
        numeros_sap: data.numeros_sap as string[] | undefined,
        data_finalizacao: data.data_finalizacao as string | undefined
      }
    } catch (error) {
      return {
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Busca o número do carro na tabela embalagem_carros_finalizados
   */
  static async buscarNumeroCarroFinalizado(carroId: string): Promise<{
    success: boolean
    numeroCarro?: string
    error?: string
  }> {
    try {
      console.log(`🔍 Buscando número do carro ${carroId} na tabela embalagem_carros_finalizados`)
      
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros_finalizados')
          .select('carros')
          .order('created_at', { ascending: false })
      })

      if (error) {
        console.error('❌ Erro ao buscar carros finalizados:', error)
        return {
          success: false,
          error: `Erro ao buscar carros finalizados: ${error.message}`
        }
      }

      if (!data || data.length === 0) {
        console.log('ℹ️ Nenhum carro finalizado encontrado')
        return {
          success: true,
          numeroCarro: undefined
        }
      }

      // Procurar o carro específico em todos os registros
      for (const registro of data) {
        const carros = registro.carros as any[]
        if (carros && Array.isArray(carros)) {
          const carroEncontrado = carros.find(carro => carro.id === carroId)
          if (carroEncontrado) {
            console.log(`✅ Carro ${carroId} encontrado na tabela de finalizados`)
            return {
              success: true,
              numeroCarro: carroEncontrado.numero || carroEncontrado.carro_id || carroId
            }
          }
        }
      }

      console.log(`ℹ️ Carro ${carroId} não encontrado na tabela de finalizados`)
      return {
        success: true,
        numeroCarro: undefined
      }

    } catch (error) {
      console.error('❌ Erro inesperado ao buscar carro finalizado:', error)
      return {
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Exclui todas as notas de um carro específico
   */
  static async excluirCarro(carroId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      console.log(`🗑️ [SERVIÇO] Iniciando exclusão do carro ${carroId}`)
      console.log(`🗑️ [SERVIÇO] Excluindo carro ${carroId} e todas as suas notas`)

      // 1. Primeiro, verificar se o carro existe e quantas notas ele tem
      const { data: notasData, error: notasError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .select('id, numero_nf')
          .eq('carro_id', carroId)
      })

      if (notasError) {
        console.error('❌ [SERVIÇO] Erro ao buscar notas do carro:', notasError)
        return {
          success: false,
          error: `Erro ao buscar notas do carro: ${notasError.message}`
        }
      }

      if (!notasData || notasData.length === 0) {
        console.log(`ℹ️ [SERVIÇO] Carro ${carroId} não possui notas para excluir`)
        return {
          success: true
        }
      }

      console.log(`📋 [SERVIÇO] Encontradas ${notasData.length} notas para excluir do carro ${carroId}`)

      // 2. Excluir todas as notas do carro
      const { error: deleteError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .delete()
          .eq('carro_id', carroId)
      })

      if (deleteError) {
        console.error('❌ [SERVIÇO] Erro ao excluir notas do carro:', deleteError)
        return {
          success: false,
          error: `Erro ao excluir notas do carro: ${deleteError.message}`
        }
      }

      // 3. Remover o carro da tabela carros_status se existir
      const { error: carroError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('carros_status')
          .delete()
          .eq('carro_id', carroId)
      })

      if (carroError) {
        console.warn('⚠️ [SERVIÇO] Aviso: Notas excluídas mas falha ao remover carro da tabela carros_status:', carroError)
        // Não retornar erro aqui, pois as notas já foram excluídas
      }

      console.log(`✅ [SERVIÇO] Carro ${carroId} excluído com sucesso! ${notasData.length} notas removidas`)
      
      // Emitir evento de exclusão para sincronização em tempo real
      try {
        const { error: eventError } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('realtime_events')
            .insert({
              event_type: 'carro_excluido',
              carro_id: carroId,
              timestamp: new Date().toISOString(),
              data: {
                carro_id: carroId,
                notas_removidas: notasData.length,
                timestamp_exclusao: new Date().toISOString()
              }
            })
        })
        
        if (eventError) {
          console.warn('⚠️ [SERVIÇO] Aviso: Falha ao emitir evento de exclusão:', eventError)
        } else {
          console.log('📡 [SERVIÇO] Evento de exclusão emitido com sucesso')
        }
      } catch (eventErr) {
        console.warn('⚠️ [SERVIÇO] Aviso: Erro ao emitir evento de exclusão:', eventErr)
      }
      
      return {
        success: true
      }

    } catch (error) {
      console.error('❌ [SERVIÇO] Erro inesperado ao excluir carro:', error)
      return {
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Busca estatísticas do setor de embalagem
   */
  static async buscarEstatisticas(data?: string, turno?: string): Promise<{
    success: boolean
    estatisticas?: {
      total_notas: number
      total_volumes: number
      carros_utilizados: number
    }
    error?: string
  }> {
    try {
      console.log('📊 Buscando estatísticas do setor de embalagem:', { data, turno })

      // Buscar notas bipadas
      let query = getSupabase()
        .from('embalagem_notas_bipadas')
        .select('*')

      if (data) {
        query = query.eq('data', data)
      }
      if (turno) {
        query = query.eq('turno', turno)
      }

      const { data: notas, error: notasError } = await retryWithBackoff(async () => {
        return await query
      })

      if (notasError) {
        console.error('❌ Erro ao buscar notas para estatísticas:', notasError)
        return {
          success: false,
          error: `Erro ao buscar notas: ${notasError.message}`
        }
      }

      // Buscar carros utilizados
      let queryCarros = getSupabase()
        .from('carros_status')
        .select('carro_id')

      if (data) {
        queryCarros = queryCarros.eq('data', data)
      }
      if (turno) {
        queryCarros = queryCarros.eq('turno', turno)
      }

      const { data: carros, error: carrosError } = await retryWithBackoff(async () => {
        return await queryCarros
      })

      if (carrosError) {
        console.error('❌ Erro ao buscar carros para estatísticas:', carrosError)
        // Não retornar erro aqui, apenas usar 0 para carros
      }

      // Calcular estatísticas
      const total_notas = notas?.length || 0
      const total_volumes = notas?.reduce((sum, nota) => sum + (Number(nota.volumes) || 0), 0) || 0
      const carros_utilizados = carros?.length || 0

      const estatisticas = {
        total_notas,
        total_volumes,
        carros_utilizados
      }

      console.log('✅ Estatísticas calculadas:', estatisticas)

      return {
        success: true,
        estatisticas
      }

    } catch (error) {
      console.error('❌ Erro inesperado ao buscar estatísticas:', error)
      return {
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }



  /**
   * Lança um carro (muda status para "lancado" e busca número na tabela de finalizados)
   */
  static async lancarCarro(carroId: string, numerosSAP: string[]): Promise<{
    success: boolean
    numeroCarro?: string
    error?: string
  }> {
    try {
      console.log(`🚀 Lançando carro ${carroId} com números SAP:`, numerosSAP)

      // 1. Buscar o número do carro na tabela embalagem_carros_finalizados
      const numeroCarroResult = await this.buscarNumeroCarroFinalizado(carroId)
      if (!numeroCarroResult.success) {
        return {
          success: false,
          error: `Erro ao buscar número do carro: ${numeroCarroResult.error}`
        }
      }

      const numeroCarro = numeroCarroResult.numeroCarro || carroId

      // 2. Atualizar o status do carro para "lancado" na tabela carros_status
      // Incluir também a atualização do nome do carro com o número SAP encontrado
      const { error: carroError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('carros_status')
          .update({
            status_carro: 'lancado',
            nome_carro: `Carro ${numeroCarro}`, // Atualizar nome com número SAP
            numeros_sap: numerosSAP,
            data_finalizacao: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('carro_id', carroId)
      })

      if (carroError) {
        console.error('❌ Erro ao atualizar status do carro para lancado:', carroError)
        return {
          success: false,
          error: `Erro ao atualizar status do carro: ${carroError.message}`
        }
      }

      // 3. Atualizar também o status das notas para "lancado"
      const { error: notasError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .update({
            status: 'lancado',
            numeros_sap: numerosSAP,
            data_finalizacao: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('carro_id', carroId)
      })

      if (notasError) {
        console.error('❌ Erro ao atualizar status das notas para lancado:', notasError)
        // Não retornar erro aqui, pois o carro já foi atualizado
        console.warn('⚠️ Aviso: Carro atualizado mas falha ao atualizar notas')
      }

      console.log(`✅ Carro ${carroId} lançado com sucesso! Número do carro: ${numeroCarro}`)
      return {
        success: true,
        numeroCarro
      }

    } catch (error) {
      console.error('❌ Erro inesperado ao lançar carro:', error)
      return {
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Atualiza apenas os pallets reais de um carro já lançado sem alterar o status
   */
  static async atualizarPalletsCarro(carroId: string, palletsReais: number, dadosDetalhados?: {
    quantidadePosicoes?: number;
    tiposPosicao?: {
      paletes: boolean;
      gaiolas: boolean;
      caixaManga: boolean;
    };
    quantidadePaletesReais?: number | null;
    quantidadeGaiolas?: number | null;
    quantidadeCaixaManga?: number | null;
  }): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      console.log(`📦 Atualizando pallets reais do carro ${carroId} para ${palletsReais}`)
      if (dadosDetalhados) {
        console.log('📋 Dados detalhados:', dadosDetalhados)
      }

      // 1. Atualizar apenas os pallets reais na tabela carros_status
      const { error: carroError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('carros_status')
          .update({
            posicoes: dadosDetalhados?.quantidadePosicoes || null,
            palletes: dadosDetalhados?.quantidadePaletesReais || null,
            gaiolas: dadosDetalhados?.quantidadeGaiolas || null,
            caixas_mangas: dadosDetalhados?.quantidadeCaixaManga || null,
            updated_at: new Date().toISOString()
          })
          .eq('carro_id', carroId)
      })

      if (carroError) {
        console.error('❌ Erro ao atualizar pallets reais do carro:', carroError)
        return {
          success: false,
          error: `Erro ao atualizar pallets reais: ${carroError.message}`
        }
      }

      // 2. Atualizar também os pallets reais das notas e dados detalhados
      const { error: notasError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .update({
            posicoes: dadosDetalhados?.quantidadePosicoes || null,
            palletes: dadosDetalhados?.quantidadePaletesReais || null,
            gaiolas: dadosDetalhados?.quantidadeGaiolas || null,
            caixas_mangas: dadosDetalhados?.quantidadeCaixaManga || null,
            updated_at: new Date().toISOString()
          })
          .eq('carro_id', carroId)
      })

      if (notasError) {
        console.error('❌ Erro ao atualizar pallets reais das notas:', notasError)
        // Não retornar erro aqui, pois o carro já foi atualizado
        console.warn('⚠️ Aviso: Pallets reais do carro atualizados mas falha ao atualizar notas')
      }

      console.log(`✅ Pallets reais do carro ${carroId} atualizados com sucesso! Pallets: ${palletsReais}`)
      if (dadosDetalhados) {
        console.log('📋 Dados detalhados atualizados:', {
          quantidadePosicoes: dadosDetalhados.quantidadePosicoes,
          tiposPosicao: dadosDetalhados.tiposPosicao,
          quantidadePaletesReais: dadosDetalhados.quantidadePaletesReais,
          quantidadeGaiolas: dadosDetalhados.quantidadeGaiolas,
          quantidadeCaixaManga: dadosDetalhados.quantidadeCaixaManga
        })
      }
      
      return {
        success: true
      }

    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar pallets reais:', error)
      return {
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }
}