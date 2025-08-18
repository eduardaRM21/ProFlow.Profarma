import { getSupabase, retryWithBackoff } from './supabase-client'
import { SessionService } from './database-service'
import type { NotaFiscal, Carro } from './database-service'
import { NotasBipadasService } from './notas-bipadas-service'

// Interface para NF de embalagem
export interface NFEmbalagem {
  id: string
  numeroNF: string
  volume: number
  fornecedor: string
  codigo: string
  codigoDestino: string
  destinoFinal: string
  tipo: string
  codigoCompleto: string
  timestamp: string
  status: "valida" | "invalida"
}

// Interface para carro de embalagem
export interface CarroEmbalagem {
  id: string
  nomeCarro: string
  colaboradores: string[]
  data: string
  turno: string
  destinoFinal: string
  quantidadeNFs: number
  totalVolumes: number
  dataCriacao: string
  dataFinalizacao?: string
  statusCarro: "ativo" | "embalando" | "em_producao" | "finalizado" | "divergencia_lancamento"
  nfs: NFEmbalagem[]
  estimativaPallets: number
}

// Serviço de Embalagem
export const EmbalagemService = {
  // Validar NF para embalagem
  async validateNF(numeroNF: string, data: string, turno: string): Promise<{ valido: boolean; nota?: NotaFiscal; erro?: string }> {
    try {
      console.log(`🔍 EmbalagemService: Validando NF ${numeroNF} para embalagem`)
      
      // Buscar a NF em relatórios FINALIZADOS do recebimento usando o código completo
      console.log(`🔍 Buscando NF ${numeroNF} em relatórios finalizados do recebimento...`)
      
      const resultado = await this.buscarNFEmRelatoriosFinalizados(numeroNF, data, turno)
      
      console.log(`📋 Resultado da busca em relatórios finalizados:`, resultado)
      
      if (resultado.encontrada) {
        console.log(`✅ NF ${numeroNF} encontrada em relatório finalizado: ${resultado.relatorio}`)
        
        // Converter para o formato esperado
        const notaFiscal: NotaFiscal = {
          id: `${Date.now()}-${numeroNF}`,
          codigoCompleto: numeroNF,
          data: resultado.dataRelatorio || data,
          numeroNF: resultado.numeroNF || numeroNF,
          volumes: resultado.volumes || 0,
          destino: resultado.destino || '',
          fornecedor: resultado.fornecedor || '',
          clienteDestino: resultado.clienteDestino || '',
          tipoCarga: resultado.tipoCarga || '',
          timestamp: new Date().toISOString(),
          status: 'ok'
        }
        
        return { 
          valido: true, 
          nota: notaFiscal,
          erro: undefined
        }
      } else {
        console.log(`❌ NF ${numeroNF} não encontrada em relatórios finalizados: ${resultado.erro}`)
        return { 
          valido: false, 
          nota: undefined,
          erro: resultado.erro 
        }
      }
    } catch (error) {
      console.error('❌ Erro no EmbalagemService.validateNF:', {
        error,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      })
      return { 
        valido: false, 
        erro: `Erro interno na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }
    }
  },

  // Processar código de barras para embalagem
  async processarCodigoBarras(codigo: string, data: string, turno: string): Promise<{ valido: boolean; nf?: NFEmbalagem; erro?: string }> {
    try {
      console.log(`🔍 Processando código de barras para embalagem: ${codigo}`)
      
      // Extrair informações do código de barras
      const partes = codigo.split("|")
      if (partes.length !== 7) {
        return { 
          valido: false, 
          erro: `Código deve ter 7 partes. Encontradas: ${partes.length}` 
        }
      }
      
      const [dataNF, numeroNF, volumesStr, destino, fornecedor, clienteDestino, tipoCarga] = partes
      const volumes = parseInt(volumesStr, 10)
      
      if (isNaN(volumes) || volumes <= 0) {
        return { 
          valido: false, 
          erro: `Volumes deve ser um número válido maior que 0. Recebido: "${volumesStr}"` 
        }
      }
      
      // Validar se a NF foi bipada no recebimento
      const validacao = await this.validateNF(numeroNF, data, turno)
      
      if (!validacao.valido) {
        return { 
          valido: false, 
          erro: validacao.erro || 'NF não foi bipada no Recebimento' 
        }
      }
      
      // Criar objeto NF para embalagem
      const nfEmbalagem: NFEmbalagem = {
        id: `${Date.now()}-${numeroNF}`,
        numeroNF,
        volume: volumes,
        fornecedor,
        codigo: codigo,
        codigoDestino: destino,
        destinoFinal: clienteDestino,
        tipo: tipoCarga,
        codigoCompleto: codigo,
        timestamp: new Date().toISOString(),
        status: "valida"
      }
      
      console.log(`✅ Código de barras processado com sucesso para embalagem`)
      return { 
        valido: true, 
        nf: nfEmbalagem 
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar código de barras para embalagem:', error)
      return { 
        valido: false, 
        erro: `Erro interno ao processar código: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }
    }
  },

  // Buscar NF específica em relatórios FINALIZADOS do recebimento
  async buscarNFEmRelatoriosFinalizados(codigoCompleto: string, data: string, turno: string): Promise<{ 
    encontrada: boolean; 
    relatorio?: string; 
    dataRelatorio?: string; 
    turnoRelatorio?: string;
    numeroNF?: string;
    volumes?: number;
    destino?: string;
    fornecedor?: string;
    clienteDestino?: string;
    tipoCarga?: string;
    erro?: string;
  }> {
    try {
      console.log(`🔍 Buscando NF com código ${codigoCompleto} em TODOS os relatórios finalizados`)
      
      // 1. Buscar em TODOS os relatórios de recebimento (sem restrição de data/turno)
      console.log(`🔍 1. Buscando em todos os relatórios de recebimento...`)
      
      const { getSupabase, retryWithBackoff } = await import('./supabase-client')
      
      const { data: todosRelatoriosData, error: todosRelatoriosError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('relatorios')
          .select('*')
          .eq('area', 'recebimento')
          .in('status', ['finalizado', 'Liberado', 'liberado'])
          .order('data', { ascending: false })
          .limit(200)
      })
      
      if (todosRelatoriosError) {
        console.error('❌ Erro ao buscar todos os relatórios:', todosRelatoriosError)
        return {
          encontrada: false,
          erro: `Erro ao buscar relatórios: ${todosRelatoriosError.message}`
        }
      }
      
      if (todosRelatoriosData && todosRelatoriosData.length > 0) {
        console.log(`📋 Encontrados ${todosRelatoriosData.length} relatórios para busca ampliada`)
        console.log(`📊 Primeiros 3 relatórios:`, todosRelatoriosData.slice(0, 3).map((r: any) => ({
          nome: r.nome,
          data: r.data,
          turno: r.turno,
          status: r.status,
          quantidadeNotas: (r.notas as any[])?.length || 0
        })))
        
        // Buscar em cada relatório pelo código completo
        for (const relatorio of todosRelatoriosData) {
          if (relatorio.notas && Array.isArray(relatorio.notas)) {
            console.log(`🔍 Verificando relatório: ${relatorio.nome} (${relatorio.data} - ${relatorio.turno}) com ${relatorio.notas.length} NFs`)
            
            // Mostrar algumas NFs para debug
            const primeirasNFs = relatorio.notas.slice(0, 3).map(nf => ({
              numeroNF: nf.numeroNF,
              codigoCompleto: nf.codigoCompleto?.substring(0, 50) + '...',
              destino: nf.destino,
              fornecedor: nf.fornecedor
            }))
            console.log(`📋 Primeiras NFs do relatório:`, primeirasNFs)
            
            // Buscar por código completo (match exato ou parcial)
            const nfEncontrada = relatorio.notas.find((nf: any) => {
              // Match por código completo
              const matchCodigoCompleto = nf.codigoCompleto === codigoCompleto
              const matchCodigoInclui = nf.codigoCompleto && nf.codigoCompleto.includes(codigoCompleto)
              const matchCodigoInvertido = codigoCompleto.includes(nf.codigoCompleto)
              
              // Match por número da NF
              const matchNumeroNF = nf.numeroNF === codigoCompleto
              const matchNumeroInclui = nf.numeroNF && nf.numeroNF.includes(codigoCompleto)
              
              // Match por partes do código (destino, fornecedor, etc.)
              const matchDestino = nf.destino && codigoCompleto.includes(nf.destino)
              const matchFornecedor = nf.fornecedor && codigoCompleto.includes(codigoCompleto)
              
              // Debug de cada comparação
              if (nf.numeroNF === '003274130' || codigoCompleto.includes('003274130')) {
                console.log(`🎯 NF 003274130 encontrada! Comparando:`, {
                  codigoCompleto,
                  nfNumero: nf.numeroNF,
                  nfCodigo: nf.codigoCompleto,
                  matchCodigoCompleto, matchCodigoInclui, matchCodigoInvertido,
                  matchNumeroNF, matchNumeroInclui, matchDestino, matchFornecedor
                })
              }
              
              if (matchCodigoCompleto || matchCodigoInclui || matchCodigoInvertido || 
                  matchNumeroNF || matchNumeroInclui || matchDestino || matchFornecedor) {
                console.log(`🎯 NF encontrada! Match:`, { 
                  codigoCompleto, 
                  nfCodigo: nf.codigoCompleto, 
                  nfNumero: nf.numeroNF,
                  matchCodigoCompleto, matchCodigoInclui, matchCodigoInvertido,
                  matchNumeroNF, matchNumeroInclui, matchDestino, matchFornecedor
                })
                return true
              }
              return false
            })
            
            if (nfEncontrada) {
              console.log(`✅ NF encontrada em relatório: ${relatorio.nome} (${relatorio.data} - ${relatorio.turno})`)
              return {
                encontrada: true,
                relatorio: relatorio.nome as string,
                dataRelatorio: relatorio.data as string,
                turnoRelatorio: relatorio.turno as string,
                numeroNF: nfEncontrada.numeroNF,
                volumes: nfEncontrada.volumes,
                destino: nfEncontrada.destino,
                fornecedor: nfEncontrada.fornecedor,
                clienteDestino: nfEncontrada.clienteDestino,
                tipoCarga: nfEncontrada.tipoCarga
              }
            }
          }
        }
      } else {
        console.log(`⚠️ Nenhum relatório encontrado para busca ampliada`)
      }
      
      // 2. Buscar em relatórios de outras áreas (custos, embalagem) que possam ter a NF
      console.log('🔍 2. NF não encontrada em relatórios de recebimento, buscando em outras áreas...')
      
      const { data: outrosRelatoriosData, error: outrosRelatoriosError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('relatorios')
          .select('*')
          .in('area', ['custos', 'embalagem', 'inventario'])
          .order('data', { ascending: false })
          .limit(100)
      })
      
      if (outrosRelatoriosError) {
        console.error('❌ Erro ao buscar relatórios de outras áreas:', outrosRelatoriosError)
      }
      
      if (outrosRelatoriosData && outrosRelatoriosData.length > 0) {
        console.log(`📋 Encontrados ${outrosRelatoriosData.length} relatórios de outras áreas`)
        
        for (const relatorio of outrosRelatoriosData) {
          if (relatorio.notas && Array.isArray(relatorio.notas)) {
            console.log(`🔍 Verificando relatório ${relatorio.area}: ${relatorio.nome} (${relatorio.data} - ${relatorio.turno})`)
            
            const nfEncontrada = relatorio.notas.find((nf: any) => {
              const matchNumeroNF = nf.numeroNF === codigoCompleto
              const matchCodigo = nf.codigoCompleto && nf.codigoCompleto.includes(codigoCompleto)
              
              if (matchNumeroNF || matchCodigo) {
                console.log(`🎯 NF encontrada em relatório de ${relatorio.area}:`, {
                  codigoCompleto,
                  nfNumero: nf.numeroNF,
                  nfCodigo: nf.codigoCompleto,
                  area: relatorio.area
                })
                return true
              }
              return false
            })
            
            if (nfEncontrada) {
              console.log(`✅ NF encontrada em relatório de ${relatorio.area}: ${relatorio.nome}`)
              return {
                encontrada: true,
                relatorio: `${relatorio.area}: ${relatorio.nome}`,
                dataRelatorio: relatorio.data as string,
                turnoRelatorio: relatorio.turno as string,
                numeroNF: nfEncontrada.numeroNF,
                volumes: nfEncontrada.volumes,
                destino: nfEncontrada.destino,
                fornecedor: nfEncontrada.fornecedor,
                clienteDestino: nfEncontrada.clienteDestino,
                tipoCarga: nfEncontrada.tipoCarga
              }
            }
          }
        }
      }
      
      console.log(`❌ NF com código ${codigoCompleto} não encontrada em nenhum lugar`)
      console.log(`📊 Resumo da busca:`)
      console.log(`   - Relatórios de recebimento verificados: ${todosRelatoriosData?.length || 0}`)
      console.log(`   - Relatórios de outras áreas verificados: ${outrosRelatoriosData?.length || 0}`)
      
      return { 
        encontrada: false, 
        erro: `NF não foi encontrada em nenhum relatório (recebimento, custos, embalagem, inventário - busca completa)` 
      }
      
    } catch (error) {
      console.error('❌ Erro ao buscar NF em relatórios finalizados:', error)
      return { 
        encontrada: false, 
        erro: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }
    }
  },

  // Buscar NFs bipadas nos relatórios de recebimento
  async buscarNFsBipadasEmRelatorios(data: string, turno: string, numeroNF?: string): Promise<{ 
    sucesso: boolean; 
    nfs?: NotaFiscal[]; 
    erro?: string;
    totalRelatorios?: number;
    totalNFs?: number;
  }> {
    try {
      console.log(`🔍 Buscando NFs bipadas em relatórios - Data: ${data}, Turno: ${turno}`)
      
      const { getSupabase, retryWithBackoff } = await import('./supabase-client')
      
      // Buscar relatórios finalizados de recebimento para a data e turno
      const { data: relatoriosData, error: relatoriosError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('relatorios')
          .select('*')
          .eq('area', 'recebimento')
          .eq('data', data)
          .eq('turno', turno)
          .in('status', ['finalizado', 'Liberado', 'liberado'])
          .order('data_finalizacao', { ascending: false })
      })
      
      if (relatoriosError) {
        console.error('❌ Erro ao buscar relatórios:', relatoriosError)
        return { 
          sucesso: false, 
          erro: `Erro ao buscar relatórios: ${relatoriosError.message}` 
        }
      }
      
      if (!relatoriosData || relatoriosData.length === 0) {
        console.log(`⚠️ Nenhum relatório finalizado encontrado para ${data} - ${turno}`)
        return { 
          sucesso: false, 
          erro: `Nenhum relatório finalizado encontrado para ${data} - ${turno}` 
        }
      }
      
      console.log(`📋 Encontrados ${relatoriosData.length} relatórios finalizados`)
      
      // Coletar todas as NFs dos relatórios
      const todasNFs: NotaFiscal[] = []
      let totalNFs = 0
      
      for (const relatorio of relatoriosData) {
        if (relatorio.notas && Array.isArray(relatorio.notas)) {
          console.log(`📋 Relatório ${relatorio.nome}: ${relatorio.notas.length} NFs`)
          
          // Filtrar por número de NF específico se fornecido
          if (numeroNF) {
            const nfsFiltradas = relatorio.notas.filter((nf: any) => 
              nf.numeroNF === numeroNF || 
              nf.numeroNF.includes(numeroNF) ||
              nf.codigoCompleto.includes(numeroNF)
            )
            todasNFs.push(...nfsFiltradas)
          } else {
            todasNFs.push(...relatorio.notas)
          }
          
          totalNFs += relatorio.notas.length
        }
      }
      
      // Remover duplicatas baseado no número da NF
      const nfsUnicas = todasNFs.filter((nf, index, self) => 
        index === self.findIndex(n => n.numeroNF === nf.numeroNF)
      )
      
      console.log(`✅ Total de NFs únicas encontradas: ${nfsUnicas.length}`)
      
      return {
        sucesso: true,
        nfs: nfsUnicas,
        totalRelatorios: relatoriosData.length,
        totalNFs: totalNFs
      }
      
    } catch (error) {
      console.error('❌ Erro ao buscar NFs em relatórios:', error)
      return { 
        sucesso: false, 
        erro: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }
    }
  },

  // Verificar se uma NF específica foi bipada em relatórios
  async verificarNFEmRelatorios(numeroNF: string, data: string, turno: string): Promise<{ 
    encontrada: boolean; 
    relatorio?: string; 
    dataRelatorio?: string; 
    turnoRelatorio?: string;
    erro?: string;
  }> {
    try {
      console.log(`🔍 Verificando NF ${numeroNF} em TODOS os relatórios (sem restrição de data/turno)`)
      
      // 1. Buscar em TODOS os relatórios de recebimento (sem restrição de data/turno)
      console.log('🔍 1. Buscando em todos os relatórios de recebimento...')
      
      const { getSupabase, retryWithBackoff } = await import('./supabase-client')
      
      const { data: todosRelatoriosData, error: todosRelatoriosError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('relatorios')
          .select('*')
          .eq('area', 'recebimento')
          .in('status', ['finalizado', 'Liberado', 'liberado'])
          .order('data', { ascending: false })
          .limit(200)
      })
      
      if (todosRelatoriosError) {
        console.error('❌ Erro ao buscar todos os relatórios:', todosRelatoriosError)
      }
      
      if (todosRelatoriosData && todosRelatoriosData.length > 0) {
        console.log(`📋 Encontrados ${todosRelatoriosData.length} relatórios para busca ampliada`)
        
        // Buscar em cada relatório
        for (const relatorio of todosRelatoriosData) {
          if (relatorio.notas && Array.isArray(relatorio.notas)) {
            console.log(`🔍 Verificando relatório: ${relatorio.nome} (${relatorio.data} - ${relatorio.turno}) com ${relatorio.notas.length} NFs`)
            
            // Buscar por diferentes formatos da NF
            const nfEncontrada = relatorio.notas.find((nf: any) => {
              const matchExato = nf.numeroNF === numeroNF
              const matchInclui = nf.numeroNF && nf.numeroNF.includes(numeroNF)
              const matchCodigo = nf.codigoCompleto && nf.codigoCompleto.includes(numeroNF)
              const matchNF = nf.numeroNF && nf.numeroNF.replace(/\D/g, '') === numeroNF.replace(/\D/g, '')
              
              if (matchExato || matchInclui || matchCodigo || matchNF) {
                console.log(`🎯 NF encontrada! Match:`, { 
                  numeroNF, 
                  nfNumero: nf.numeroNF, 
                  nfCodigo: nf.codigoCompleto,
                  matchExato, matchInclui, matchCodigo, matchNF
                })
                return true
              }
              return false
            })
            
            if (nfEncontrada) {
              console.log(`✅ NF ${numeroNF} encontrada em relatório: ${relatorio.nome} (${relatorio.data} - ${relatorio.turno})`)
              return {
                encontrada: true,
                relatorio: relatorio.nome as string,
                dataRelatorio: relatorio.data as string,
                turnoRelatorio: relatorio.turno as string
              }
            }
          }
        }
      }
      
      // 2. Buscar em relatórios de outras áreas
      console.log('🔍 2. NF não encontrada em relatórios de recebimento, buscando em outras áreas...')
      
      const { data: outrosRelatoriosData, error: outrosRelatoriosError } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('relatorios')
          .select('*')
          .in('area', ['custos', 'embalagem', 'inventario'])
          .order('data', { ascending: false })
          .limit(100)
      })
      
      if (outrosRelatoriosError) {
        console.error('❌ Erro ao buscar relatórios de outras áreas:', outrosRelatoriosError)
      }
      
      if (outrosRelatoriosData && outrosRelatoriosData.length > 0) {
        console.log(`📋 Encontrados ${outrosRelatoriosData.length} relatórios de outras áreas`)
        
        for (const relatorio of outrosRelatoriosData) {
          if (relatorio.notas && Array.isArray(relatorio.notas)) {
            const nfEncontrada = relatorio.notas.find((nf: any) => 
              nf.numeroNF === numeroNF || 
              nf.numeroNF.includes(numeroNF) ||
              nf.codigoCompleto.includes(numeroNF)
            )
            
            if (nfEncontrada) {
              console.log(`✅ NF ${numeroNF} encontrada em relatório de ${relatorio.area}: ${relatorio.nome}`)
              return {
                encontrada: true,
                relatorio: `${relatorio.area}: ${relatorio.nome}`,
                dataRelatorio: relatorio.data as string,
                turnoRelatorio: relatorio.turno as string
              }
            }
          }
        }
      }
      
      console.log(`❌ NF ${numeroNF} não encontrada em nenhum lugar`)
      console.log(`📊 Resumo da busca:`)
      console.log(`   - Relatórios de recebimento verificados: ${todosRelatoriosData?.length || 0}`)
      console.log(`   - Relatórios de outras áreas verificados: ${outrosRelatoriosData?.length || 0}`)
      
      return { 
        encontrada: false, 
        erro: `NF ${numeroNF} não foi encontrada em nenhum relatório (recebimento, custos, embalagem, inventário - busca completa)` 
      }
      
    } catch (error) {
      console.error('❌ Erro ao verificar NF em relatórios:', error)
      return { 
        encontrada: false, 
        erro: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }
    }
  },

  // Salvar carros de embalagem
  async saveCarros(sessionId: string, carros: CarroEmbalagem[]): Promise<void> {
    try {
      console.log(`💾 Salvando ${carros.length} carros de embalagem para sessão ${sessionId}`)
      
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros')
          .upsert({
            session_id: sessionId,
            carros: carros
          })
      })
      
      if (error) throw error
      console.log('✅ Carros de embalagem salvos com sucesso')
    } catch (error) {
      console.error('❌ Erro ao salvar carros de embalagem:', error)
      throw error
    }
  },

  // Carregar carros de embalagem
  async getCarros(sessionId: string): Promise<CarroEmbalagem[]> {
    try {
      console.log(`📋 Carregando carros de embalagem para sessão ${sessionId}`)
      
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros')
          .select('carros')
          .eq('session_id', sessionId)
          .single()
      })
      
      if (error) throw error
      
      const carros = (data?.carros as CarroEmbalagem[]) || []
      console.log(`✅ ${carros.length} carros de embalagem carregados`)
      console.log(carros)
      return carros
    } catch (error) {
      console.error('❌ Erro ao carregar carros de embalagem:', error)
      return []
    }
  },

  // Salvar carros finalizados
  async saveCarrosFinalizados(carros: CarroEmbalagem[]): Promise<void> {
    try {
      console.log(`💾 Salvando ${carros.length} carros finalizados de embalagem`)
      
      const { error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros_finalizados')
          .insert({
            carros: carros
          })
      })
      
      if (error) throw error
      console.log('✅ Carros finalizados salvos com sucesso')
    } catch (error) {
      console.error('❌ Erro ao salvar carros finalizados:', error)
      throw error
    }
  },

  // Carregar carros finalizados
  async getCarrosFinalizados(): Promise<CarroEmbalagem[]> {
    try {
      console.log('📋 Carregando carros finalizados de embalagem')
      
      const { data, error } = await retryWithBackoff(async () => {
        return await getSupabase()
          .from('embalagem_carros_finalizados')
          .select('carros')
          .order('created_at', { ascending: false })
      })
      
      if (error) throw error
      
      const todosCarros: CarroEmbalagem[] = []
      data?.forEach(item => {
        if (item.carros && Array.isArray(item.carros)) {
          todosCarros.push(...item.carros)
        }
      })
      
      console.log(`✅ ${todosCarros.length} carros finalizados carregados`)
      return todosCarros
    } catch (error) {
      console.error('❌ Erro ao carregar carros finalizados:', error)
      return []
    }
  }
}
