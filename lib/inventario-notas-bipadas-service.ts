import { getSupabase, retryWithBackoff } from './supabase-client'

export interface InventarioNotaBipada {
  id?: string
  numero_nf: string
  codigo_completo: string
  rua: string
  session_id: string
  colaboradores: string[]
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
  created_at?: string
  updated_at?: string
}

export interface NotaJaBipadaInfo {
  success: boolean
  jaBipada: boolean
  areaOrigem?: 'recebimento' | 'embalagem' | 'inventario' | 'custos'
  setorInfo?: {
    setor: string
    timestamp_bipagem: string
    colaboradores?: string
    detalhes: string
  }
  error?: string
}

export class InventarioNotasBipadasService {
  
  /**
   * Verifica se uma nota já foi bipada no setor de embalagem
   * Apenas notas bipadas na embalagem geram ALERTA CRÍTICO
   */
  static async verificarNotaJaBipada(codigoCompleto: string): Promise<NotaJaBipadaInfo> {
    try {
      console.log('🔍 Verificando se nota já foi bipada no setor de embalagem:', codigoCompleto)

      // Verificar apenas na tabela embalagem_notas_bipadas (setor de embalagem)
      const { data: embalagemData, error: embalagemError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_notas_bipadas')
          .select('carro_id, timestamp_bipagem, numero_nf, fornecedor, colaboradores')
          .eq('codigo_completo', codigoCompleto)
          .order('timestamp_bipagem', { ascending: false })
          .limit(1)
      })

      if (embalagemError) {
        console.error('❌ Erro ao verificar na tabela embalagem_notas_bipadas:', embalagemError)
      }

      if (embalagemData && embalagemData.length > 0) {
        const nota = embalagemData[0] as any
        console.log('⚠️ Nota já foi bipada no setor de embalagem:', {
          carro_id: nota.carro_id,
          timestamp: nota.timestamp_bipagem,
          colaboradores: nota.colaboradores,
          colaboradores_tipo: typeof nota.colaboradores,
          colaboradores_valor: JSON.stringify(nota.colaboradores)
        })

        // Formatar colaboradores para exibição
        let colaboradoresFormatados = 'Não informado'
        if (nota.colaboradores) {
          if (Array.isArray(nota.colaboradores)) {
            colaboradoresFormatados = nota.colaboradores.join(', ')
          } else if (typeof nota.colaboradores === 'string') {
            colaboradoresFormatados = nota.colaboradores
          }
        }

        return {
          success: true,
          jaBipada: true,
          areaOrigem: 'embalagem',
          setorInfo: {
            setor: 'Embalagem',
            timestamp_bipagem: nota.timestamp_bipagem as string,
            colaboradores: colaboradoresFormatados,
            detalhes: `NF ${nota.numero_nf} já foi bipada no carro ${nota.carro_id} do setor de embalagem`
          }
        }
      }

      console.log('✅ Nota não foi bipada no setor de embalagem - permitir bipagem no inventário')
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
   * Salva uma nota bipada no setor de inventário
   */
  static async salvarNotaBipada(notaBipada: InventarioNotaBipada): Promise<{
    success: boolean
    id?: string
    error?: string
  }> {
    try {
      console.log('📝 Salvando nota bipada no setor de inventário:', notaBipada)

      // 1. Salvar na tabela inventario_notas_bipadas (tabela específica do inventário)
      const { data: inventarioData, error: inventarioError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('inventario_notas_bipadas')
          .insert({
            numero_nf: notaBipada.numero_nf,
            codigo_completo: notaBipada.codigo_completo,
            rua: notaBipada.rua,
            session_id: notaBipada.session_id,
            colaboradores: Array.isArray(notaBipada.colaboradores) ? notaBipada.colaboradores.join(', ') : notaBipada.colaboradores,
            data: notaBipada.data,
            turno: notaBipada.turno,
            volumes: notaBipada.volumes,
            destino: notaBipada.destino,
            fornecedor: notaBipada.fornecedor,
            cliente_destino: notaBipada.cliente_destino,
            tipo_carga: notaBipada.tipo_carga,
            status: 'bipada',
            observacoes: `NF bipada na rua ${notaBipada.rua} do setor de inventário`,
            timestamp_bipagem: notaBipada.timestamp_bipagem || new Date().toISOString()
          } as unknown as Record<string, unknown>)
          .select('id')
          .single()
      })

      if (inventarioError) {
        console.error('❌ Erro ao salvar nota bipada na tabela inventario_notas_bipadas:', inventarioError)
        return {
          success: false,
          error: `Erro ao salvar nota bipada na tabela específica: ${inventarioError.message}`
        }
      }

      console.log('✅ Nota bipada salva na tabela específica do inventário, ID:', inventarioData?.id)

      // 2. Salvar na tabela notas_bipadas (tabela centralizada)
      const { data: notaData, error: notaError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('notas_bipadas')
          .insert({
            numero_nf: notaBipada.numero_nf,
            codigo_completo: notaBipada.codigo_completo,
            area_origem: 'inventario',
            session_id: notaBipada.session_id,
            colaboradores: notaBipada.colaboradores,
            data: notaBipada.data,
            turno: notaBipada.turno,
            volumes: notaBipada.volumes,
            destino: notaBipada.destino,
            fornecedor: notaBipada.fornecedor,
            cliente_destino: notaBipada.cliente_destino,
            tipo_carga: notaBipada.tipo_carga,
            status: 'bipada',
            timestamp_bipagem: notaBipada.timestamp_bipagem || new Date().toISOString(),
            observacoes: `NF bipada na rua ${notaBipada.rua} do setor de inventário`
          } as unknown as Record<string, unknown>)
          .select('id')
          .single()
      })

      if (notaError) {
        console.error('❌ Erro ao salvar nota bipada na tabela notas_bipadas:', notaError)
        // Continuar mesmo se falhar na tabela centralizada, pois já salvou na específica
        console.log('⚠️ Nota salva na tabela específica, mas falhou na tabela centralizada')
      } else {
        console.log('✅ Nota bipada salva na tabela centralizada, ID:', notaData?.id)
      }

      return {
        success: true,
        id: inventarioData?.id as string
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
   * Formata o nome do setor para exibição
   */
  private static formatarNomeSetor(areaOrigem: string): string {
    const setores = {
      'recebimento': 'Recebimento',
      'embalagem': 'Embalagem',
      'inventario': 'Inventário',
      'custos': 'Custos'
    }
    return setores[areaOrigem as keyof typeof setores] || areaOrigem
  }

  /**
   * Busca notas bipadas por rua e sessão
   */
  static async buscarNotasPorRua(rua: string, sessionId: string): Promise<{
    success: boolean
    notas?: InventarioNotaBipada[]
    error?: string
  }> {
    try {
      const { data: notasData, error: notasError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('notas_bipadas')
          .select('*')
          .eq('area_origem', 'inventario')
          .eq('session_id', sessionId)
          .order('timestamp_bipagem', { ascending: false })
      })

      if (notasError) {
        console.error('❌ Erro ao buscar notas por rua:', notasError)
        return {
          success: false,
          error: `Erro ao buscar notas: ${notasError.message}`
        }
      }

      // Filtrar por rua (baseado nas observações)
      const notasFiltradas = notasData?.filter((nota: any) => 
        (nota.observacoes as string)?.includes(`rua ${rua}`)
      ) || []

      return {
        success: true,
        notas: notasFiltradas as unknown as InventarioNotaBipada[]
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar notas por rua:', error)
      return {
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Gera estatísticas do setor de inventário
   */
  static async gerarEstatisticas(sessionId: string): Promise<{
    success: boolean
    estatisticas?: {
      totalNotas: number
      totalVolumes: number
      ruas: string[]
      fornecedores: string[]
    }
    error?: string
  }> {
    try {
      const { data: notasData, error: notasError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('notas_bipadas')
          .select('volumes, observacoes, fornecedor')
          .eq('area_origem', 'inventario')
          .eq('session_id', sessionId)
      })

      if (notasError) {
        console.error('❌ Erro ao gerar estatísticas:', notasError)
        return {
          success: false,
          error: `Erro ao gerar estatísticas: ${notasError.message}`
        }
      }

      const totalNotas = notasData?.length || 0
      const totalVolumes = notasData?.reduce((sum, nota: any) => sum + ((nota.volumes as number) || 0), 0) || 0
      
      // Extrair ruas das observações
      const ruas = [...new Set(notasData?.map((nota: any) => {
        const match = (nota.observacoes as string)?.match(/rua (\w+)/)
        return match ? match[1] : 'N/A'
      }) || [])].filter(rua => rua !== 'N/A')

      // Extrair fornecedores únicos
      const fornecedores = [...new Set(notasData?.map((nota: any) => nota.fornecedor as string).filter(Boolean) || [])]

      return {
        success: true,
        estatisticas: {
          totalNotas,
          totalVolumes,
          ruas,
          fornecedores
        }
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao gerar estatísticas:', error)
      return {
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }
}
