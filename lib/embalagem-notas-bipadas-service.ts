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
  palletes_reais?: number
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
  status_carro: "embalando" | "divergencia" | "aguardando_lancamento" | "finalizado" | "pronto"
  nfs: any[]
  estimativa_pallets: number
  session_id: string
  created_at?: string
  updated_at?: string
}

export class EmbalagemNotasBipadasService {
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
   * Atualiza ou cria um carro na tabela carros_status baseado nas notas bipadas
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
        session_id: notaBipada.session_id,
        updated_at: new Date().toISOString()
      }

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
      palletesReais?: number
      dataInicioEmbalagem?: string
      dataFinalizacao?: string
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
      const carros = carrosData.map((carro: any) => {
        console.log(`🔄 Convertendo carro ${carro.carro_id} - Status original: ${carro.status_carro}`)
        
        return {
          id: carro.carro_id,
          colaboradores: carro.colaboradores || [],
          data: carro.data,
          turno: carro.turno,
          destinoFinal: carro.destino_final,
          quantidadeNFs: carro.quantidade_nfs,
          totalVolumes: carro.total_volumes,
          dataProducao: carro.data_criacao,
          nfs: carro.nfs || [],
          estimativaPallets: carro.estimativa_pallets,
          status: carro.status_carro,
          palletesReais: undefined, // Será preenchido quando finalizado
          dataInicioEmbalagem: carro.data_criacao,
          dataFinalizacao: carro.data_finalizacao
        }
      })
      
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
        error: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Finaliza um carro, marcando-o como "finalizado" no banco de dados
   */
  static async finalizarCarro(carroId: string, palletesReais: number): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      console.log(`✅ Finalizando carro ${carroId} com ${palletesReais} pallets`)

      // 1. Atualizar status das notas para "finalizado"
      const { error: notasError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .update({
            status: 'finalizado',
            palletes_reais: palletesReais,
            data_finalizacao: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('carro_id', carroId)
      })

      if (notasError) {
        console.error('❌ Erro ao finalizar notas do carro:', notasError)
        return {
          success: false,
          error: `Erro ao finalizar notas do carro: ${notasError.message}`
        }
      }

      // 2. Atualizar status do carro na tabela carros_status
      const { error: carroError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('carros_status')
          .update({
            status_carro: 'finalizado',
            data_finalizacao: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('carro_id', carroId)
      })

      if (carroError) {
        console.error('❌ Erro ao finalizar carro na tabela carros_status:', carroError)
        return {
          success: false,
          error: `Erro ao finalizar carro na tabela carros_status: ${carroError.message}`
        }
      }

      console.log(`✅ Carro ${carroId} finalizado com sucesso`)
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
   * Busca notas bipadas por carro
   */
  static async buscarNotasPorCarro(carroId: string): Promise<{
    success: boolean
    notas?: EmbalagemNotaBipada[]
    error?: string
  }> {
    try {
      console.log('🔍 Buscando notas bipadas para o carro:', carroId)

      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .select('*')
          .eq('carro_id', carroId)
          .order('timestamp_bipagem', { ascending: false })
      })

      if (error) {
        console.error('❌ Erro ao buscar notas bipadas por carro:', error)
        return {
          success: false,
          error: `Erro ao buscar notas bipadas: ${error.message}`
        }
      }

      console.log(`✅ Encontradas ${data?.length || 0} notas bipadas para o carro`)
      return {
        success: true,
        notas: data as unknown as EmbalagemNotaBipada[] || []
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar notas bipadas por carro:', error)
      return {
        success: false,
        error: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Busca notas bipadas por sessão
   */
  static async buscarNotasPorSessao(sessionId: string): Promise<{
    success: boolean
    notas?: EmbalagemNotaBipada[]
    error?: string
  }> {
    try {
      console.log('🔍 Buscando notas bipadas para a sessão:', sessionId)

      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .select('*')
          .eq('session_id', sessionId)
          .order('timestamp_bipagem', { ascending: false })
      })

      if (error) {
        console.error('❌ Erro ao buscar notas bipadas por sessão:', error)
        return {
          success: false,
          error: `Erro ao buscar notas bipadas: ${error.message}`
        }
      }

      console.log(`✅ Encontradas ${data?.length || 0} notas bipadas para a sessão`)
      return {
        success: true,
        notas: data as unknown as EmbalagemNotaBipada[] || []
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar notas bipadas por sessão:', error)
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

      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .delete()
          .eq('id', notaId)
      })

      if (error) {
        console.error('❌ Erro ao remover nota bipada:', error)
        return {
          success: false,
          error: `Erro ao remover nota: ${error.message}`
        }
      }

      console.log('✅ Nota bipada removida com sucesso')
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

      // Primeiro, buscar a nota na tabela embalagem_notas_bipadas
      const { data: notaData, error: notaError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .select('carro_id, timestamp_bipagem')
          .eq('codigo_completo', codigoCompleto)
          .eq('status', 'bipada')
          .order('timestamp_bipagem', { ascending: false })
          .limit(1)
      })

      if (notaError) {
        console.error('❌ Erro ao verificar se nota já foi bipada:', notaError)
        return {
          success: false,
          jaBipada: false,
          error: `Erro ao verificar nota: ${notaError.message}`
        }
      }

      if (notaData && notaData.length > 0) {
        const nota = notaData[0] as { carro_id: string; timestamp_bipagem: string }

        // Buscar informações do carro
        const { data: carroData, error: carroError } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('carros_embalagem')
            .select('nome')
            .eq('id', nota.carro_id)
            .single()
        })

        if (carroError) {
          console.error('❌ Erro ao buscar informações do carro:', carroError)
        }

        const carroNome = (carroData?.nome as string) || 'Carro não encontrado'

        console.log('⚠️ Nota já foi bipada em outro carro:', {
          carro_id: nota.carro_id,
          carro_nome: carroNome,
          timestamp: nota.timestamp_bipagem
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

      console.log('✅ Nota não foi bipada em nenhum carro')
      return {
        success: true,
        jaBipada: false
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao verificar nota:', error)
      return {
        success: false,
        jaBipada: false,
        error: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Busca estatísticas de notas bipadas
   */
  static async buscarEstatisticas(data: string, turno: string): Promise<{
    success: boolean
    estatisticas?: {
      total_notas: number
      total_volumes: number
      carros_utilizados: number
    }
    error?: string
  }> {
    try {
      console.log('📊 Buscando estatísticas para data:', data, 'turno:', turno)

      const { data: notas, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .select('volumes, carro_id')
          .eq('data', data)
          .eq('turno', turno)
          .eq('status', 'bipada')
      })

      if (error) {
        console.error('❌ Erro ao buscar estatísticas:', error)
        return {
          success: false,
          error: `Erro ao buscar estatísticas: ${error.message}`
        }
      }

      const total_notas = notas?.length || 0
      const total_volumes = notas?.reduce((sum, nota) => sum + ((nota.volumes as number) || 0), 0) || 0
      const carros_utilizados = new Set(notas?.map(nota => nota.carro_id as string).filter(Boolean)).size

      console.log('✅ Estatísticas calculadas:', { total_notas, total_volumes, carros_utilizados })
      return {
        success: true,
        estatisticas: {
          total_notas,
          total_volumes,
          carros_utilizados
        }
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar estatísticas:', error)
      return {
        success: false,
        error: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Busca carros prontos (com status "embalando" ou "em_producao")
   */
  static async buscarCarrosProntos(data: string, turno: string): Promise<{
    success: boolean
    carrosProntos?: number
    error?: string
  }> {
    try {
      console.log('🚚 Buscando carros prontos para data:', data, 'turno:', turno)

      // Buscar carros únicos que têm notas bipadas com status "embalando" ou "em_producao"
      const { data: carrosData, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .select('carro_id, status')
          .eq('data', data)
          .eq('turno', turno)
          .in('status', ['embalando', 'em_producao'])
      })

      if (error) {
        console.error('❌ Erro ao buscar carros prontos:', error)
        return {
          success: false,
          error: `Erro ao buscar carros prontos: ${error.message}`
        }
      }

      // Contar carros únicos
      const carrosUnicos = new Set(carrosData?.map(item => item.carro_id as string).filter(Boolean))
      const carrosProntos = carrosUnicos.size

      console.log('✅ Carros prontos encontrados:', carrosProntos)
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
      const { error: carroError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('carros_status')
          .update({
            status_carro: novoStatus,
            numeros_sap: dadosAdicionais?.numeros_sap,
            data_finalizacao: dadosAdicionais?.data_finalizacao,
            updated_at: new Date().toISOString()
          })
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
}
