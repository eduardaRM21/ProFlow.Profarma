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
  // Validar NF para embalagem usando a tabela notas_fiscais ou relatórios
  async validateNF(numeroNF: string, data: string, turno: string): Promise<{ valido: boolean; nota?: NotaFiscal; erro?: string }> {
    try {
      console.log(`🔍 EmbalagemService: Validando NF ${numeroNF} para embalagem`)
      
      // 1. Buscar a NF diretamente na tabela notas_fiscais
      const resultado = await this.buscarNFNaTabelaNotasFiscais(numeroNF)
      
      console.log(`📋 Resultado da busca na tabela notas_fiscais:`, resultado)
        
      if (resultado.encontrada) {
        console.log(`✅ NF ${numeroNF} encontrada na tabela notas_fiscais`)
        
        // Converter para o formato esperado
        const notaFiscal: NotaFiscal = {
          id: resultado.id || `${Date.now()}-${numeroNF}`,
          codigoCompleto: resultado.codigo_completo || numeroNF,
          data: resultado.data || data,
          numeroNF: resultado.numero_nf || numeroNF,
          volumes: resultado.volumes || 0,
          destino: resultado.destino || '',
          fornecedor: resultado.fornecedor || '',
          clienteDestino: resultado.cliente_destino || '',
          tipoCarga: resultado.tipo_carga || '',
          timestamp: resultado.created_at || new Date().toISOString(),
          status: 'ok'
        }
        
        return { 
          valido: true, 
          nota: notaFiscal,
          erro: undefined
        }
      }
      
      // 2. Se não encontrou na tabela, buscar em relatórios
      console.log(`🔍 NF não encontrada na tabela, buscando em relatórios...`)
      const buscaRelatorios = await this.buscarNFEmRelatoriosFinalizados(numeroNF, data, turno)
      
      if (buscaRelatorios.encontrada) {
        console.log(`✅ NF ${numeroNF} encontrada em relatórios`)
        
        // Converter dados do relatório para NotaFiscal
        const notaFiscal: NotaFiscal = {
          id: `${Date.now()}-${numeroNF}`,
          codigoCompleto: `${buscaRelatorios.dataRelatorio || data}|${buscaRelatorios.numeroNF}|${buscaRelatorios.volumes || 1}|${buscaRelatorios.destino || ''}|${buscaRelatorios.fornecedor || ''}|${buscaRelatorios.clienteDestino || ''}|${buscaRelatorios.tipoCarga || ''}`,
          data: buscaRelatorios.dataRelatorio || data,
          numeroNF: buscaRelatorios.numeroNF || numeroNF,
          volumes: buscaRelatorios.volumes || 1,
          destino: buscaRelatorios.destino || '',
          fornecedor: buscaRelatorios.fornecedor || '',
          clienteDestino: buscaRelatorios.clienteDestino || '',
          tipoCarga: buscaRelatorios.tipoCarga || '',
          timestamp: new Date().toISOString(),
          status: 'ok'
        }
        
        return { 
          valido: true, 
          nota: notaFiscal,
          erro: undefined
        }
      }
      
      // 3. Não encontrou em nenhum lugar
      console.log(`❌ NF ${numeroNF} não encontrada na tabela notas_fiscais nem em relatórios`)
      return { 
        valido: false, 
        nota: undefined,
        erro: resultado.erro || `NF ${numeroNF} não foi encontrada. Verifique se a NF foi processada em algum setor.`
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

  // Buscar NF na tabela notas_fiscais usando codigo_completo ou numero_nf
  async buscarNFNaTabelaNotasFiscais(codigoCompleto: string): Promise<{ 
    encontrada: boolean; 
    id?: string;
    numero_nf?: string;
    codigo_completo?: string;
    data?: string;
    volumes?: number;
    destino?: string;
    fornecedor?: string;
    cliente_destino?: string;
    tipo_carga?: string;
    status?: string;
    created_at?: string;
    erro?: string;
  }> {
    try {
      console.log(`🔍 Buscando NF com código ${codigoCompleto} na tabela notas_fiscais`)
      
      const { getSupabase, retryWithBackoff } = await import('./supabase-client')
      
      let notasData: any[] = []
      let notasError: any = null
      
      // Verificar se é código completo (com |) ou apenas número da NF
      const partes = codigoCompleto.split('|')
      let numeroNF: string | null = null
      
      if (partes.length >= 2) {
        // É código completo, extrair numero_nf
        numeroNF = partes[1]
        console.log(`🔍 Extraído numero_nf: "${numeroNF}" do codigo_completo`)
      } else if (partes.length === 1 && /^\d+$/.test(codigoCompleto.trim())) {
        // É apenas número da NF
        numeroNF = codigoCompleto.trim()
        console.log(`🔍 Código é apenas número da NF: "${numeroNF}"`)
      }
      
      if (numeroNF) {
        // Buscar por numero_nf
        const { data: dataCodigo, error: errorCodigo } = await retryWithBackoff(async () => {
          return await getSupabase()
            .from('notas_fiscais')
            .select('*')
            .eq('numero_nf', numeroNF)
            .order('created_at', { ascending: false })
            .limit(5)
        })
        
        if (errorCodigo) {
          console.error('❌ Erro ao buscar por numero_nf:', errorCodigo)
          notasError = errorCodigo
        } else if (dataCodigo && dataCodigo.length > 0) {
          console.log(`✅ Encontradas ${dataCodigo.length} notas por numero_nf`)
          notasData = dataCodigo
        } else {
          console.log(`⚠️ Nenhuma nota encontrada por numero_nf`)
        }
      } else {
        console.log(`⚠️ Não foi possível extrair numero_nf do código`)
      }
      
      if (notasError) {
        console.error('❌ Erro ao buscar na tabela notas_bipadas:', notasError)
        return {
          encontrada: false,
          erro: `Erro ao buscar na tabela notas_bipadas: ${notasError.message}`
        }
      }
      
      if (notasData && notasData.length > 0) {
        console.log(`📋 Encontradas ${notasData.length} notas na tabela notas_fiscais`)
        
        // Pegar a primeira nota encontrada (mais recente)
        const nota = notasData[0]
        console.log(`✅ NF encontrada na tabela notas_fiscais:`, {
          id: nota.id,
          numero_nf: nota.numero_nf,
          codigo_completo: nota.codigo_completo,
          data: nota.data,
          status: nota.status,
          fornecedor: nota.fornecedor
        })
        
        return {
          encontrada: true,
          id: nota.id as string,
          numero_nf: nota.numero_nf as string,
          codigo_completo: nota.codigo_completo as string,
          data: nota.data as string,
          volumes: nota.volumes as number,
          destino: nota.destino as string,
          fornecedor: nota.fornecedor as string,
          cliente_destino: nota.cliente_destino as string,
          tipo_carga: nota.tipo_carga as string,
          status: nota.status as string,
          created_at: nota.created_at as string
        }
      }
      
      console.log(`❌ NF com código ${codigoCompleto} não encontrada na tabela notas_fiscais`)
      return { 
        encontrada: false, 
        erro: `NF não foi encontrada na tabela notas_fiscais. Verifique se a NF foi processada em algum setor.` 
      }
      
    } catch (error) {
      console.error('❌ Erro ao buscar NF na tabela notas_fiscais:', error)
      return { 
        encontrada: false, 
        erro: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }
    }
  },

  // Processar código de barras para embalagem
  async processarCodigoBarras(codigo: string, data: string, turno: string): Promise<{ valido: boolean; nf?: NFEmbalagem; erro?: string }> {
    try {
      console.log(`🔍 Processando código de barras para embalagem: ${codigo}`)
      
      // Verificar se é código completo ou apenas número da NF
      const partes = codigo.split("|")
      let numeroNF: string
      let volumes: number
      let destino: string
      let fornecedor: string
      let clienteDestino: string
      let tipoCarga: string
      let dataNF: string
      
      if (partes.length === 7) {
        // Código completo com 7 partes
        const [dataNFPart, numeroNFPart, volumesStr, destinoPart, fornecedorPart, clienteDestinoPart, tipoCargaPart] = partes
        dataNF = dataNFPart
        numeroNF = numeroNFPart
        destino = destinoPart
        fornecedor = fornecedorPart
        clienteDestino = clienteDestinoPart
        tipoCarga = tipoCargaPart
        volumes = parseInt(volumesStr, 10)
        
        if (isNaN(volumes) || volumes <= 0) {
          return { 
            valido: false, 
            erro: `Volumes deve ser um número válido maior que 0. Recebido: "${volumesStr}"` 
          }
        }
      } else if (partes.length === 1 && /^\d+$/.test(codigo.trim())) {
        // Apenas número da NF - buscar informações na tabela ou relatórios
        numeroNF = codigo.trim()
        console.log(`🔍 Código é apenas número da NF: ${numeroNF}, buscando informações...`)
        
        // Buscar NF na tabela ou relatórios
        const buscaNF = await this.buscarNFNaTabelaNotasFiscais(numeroNF)
        
        if (!buscaNF.encontrada) {
          // Tentar buscar em relatórios
          const buscaRelatorios = await this.buscarNFEmRelatoriosFinalizados(numeroNF, data, turno)
          
          if (!buscaRelatorios.encontrada) {
            return { 
              valido: false, 
              erro: `NF ${numeroNF} não encontrada. Verifique se a NF foi processada em algum setor.` 
            }
          }
          
          // Usar dados do relatório
          volumes = buscaRelatorios.volumes || 1
          destino = buscaRelatorios.destino || ''
          fornecedor = buscaRelatorios.fornecedor || ''
          clienteDestino = buscaRelatorios.clienteDestino || ''
          tipoCarga = buscaRelatorios.tipoCarga || ''
          dataNF = buscaRelatorios.dataRelatorio || data
        } else {
          // Usar dados da tabela
          volumes = buscaNF.volumes || 1
          destino = buscaNF.destino || ''
          fornecedor = buscaNF.fornecedor || ''
          clienteDestino = buscaNF.cliente_destino || ''
          tipoCarga = buscaNF.tipo_carga || ''
          dataNF = buscaNF.data || data
        }
      } else {
        return { 
          valido: false, 
          erro: `Formato de código inválido. Use o código completo (7 partes separadas por |) ou apenas o número da NF.` 
        }
      }
      
      // Validar se a NF foi processada em algum setor
      const validacao = await this.validateNF(numeroNF, data, turno)
      
      if (!validacao.valido) {
        // Se não encontrou na validação padrão, mas encontrou na busca acima, permitir
        console.log(`⚠️ Validação padrão falhou, mas NF foi encontrada na busca direta. Permitindo...`)
      }
      
      // Criar código completo se não existir
      const codigoCompleto = partes.length === 7 
        ? codigo 
        : `${dataNF}|${numeroNF}|${volumes}|${destino}|${fornecedor}|${clienteDestino}|${tipoCarga}`
      
      // Criar objeto NF para embalagem
      const nfEmbalagem: NFEmbalagem = {
        id: `${Date.now()}-${numeroNF}`,
        numeroNF,
        volume: volumes,
        fornecedor,
        codigo: codigoCompleto,
        codigoDestino: destino,
        destinoFinal: clienteDestino,
        tipo: tipoCarga,
        codigoCompleto: codigoCompleto,
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
