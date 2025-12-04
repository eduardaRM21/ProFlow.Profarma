// Impressão via Interface Web da Impressora Zebra
// Usa a API do Next.js que faz conexão TCP raw (porta 9100/6101)
// Este é o método mais confiável para impressoras Zebra

import { gerarZPL, type DadosEtiqueta } from './zpl-generator'

/**
 * Imprime via interface web da impressora Zebra
 * Usa a API do Next.js que faz conexão TCP raw (porta 9100/6101)
 * Este é o método mais confiável para impressoras Zebra
 */
export async function imprimirViaInterfaceWeb(
  codigoPalete: string,
  dados?: DadosEtiqueta,
  printerIP: string = '10.27.30.75' // IP da impressora
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`🌐 [Interface Web] Tentando imprimir via interface web da impressora ${printerIP}`)
    
    const zpl = gerarZPL(codigoPalete, dados)
    console.log(`📄 [Interface Web] ZPL gerado (${zpl.length} caracteres)`)
    
    // Usa a API do Next.js que faz conexão TCP raw (porta 9100/6101)
    // Este é o método mais confiável para impressoras Zebra
    try {
      console.log('🔄 [Interface Web] Tentando via API proxy do Next.js (TCP raw)...')
      console.log('📤 [Interface Web] Enviando requisição para /api/print/direct...')
      
      const proxyResponse = await fetch('/api/print/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigoPalete,
          quantidadeNFs: dados?.quantidadeNFs,
          totalVolumes: dados?.totalVolumes,
          destino: dados?.destino,
          posicoes: dados?.posicoes,
          quantidadePaletes: dados?.quantidadePaletes,
          codigoCarga: dados?.codigoCarga,
          idWMS: dados?.idWMS,
        }),
      })

      console.log(`📥 [Interface Web] Resposta recebida: status ${proxyResponse.status}`)

      if (proxyResponse.ok) {
        const proxyData = await proxyResponse.json()
        console.log('📋 [Interface Web] Dados da resposta:', proxyData)
        
        if (proxyData.success) {
          console.log(`✅ [Interface Web] Impressão concluída com sucesso!`)
          console.log(`✅ [Interface Web] Mensagem: ${proxyData.message}`)
          return {
            success: true,
            message: proxyData.message || `Etiqueta ${codigoPalete} enviada para impressão!`,
          }
        } else {
          // Se a API retornou erro, ler a mensagem
          const errorMessage = proxyData.message || 'Erro desconhecido na API'
          console.log(`⚠️ [Interface Web] API retornou erro: ${errorMessage}`)
          // Não tentar endpoints HTTP diretos - eles não funcionam para impressoras Zebra
          return {
            success: false,
            message: errorMessage,
          }
        }
      } else {
        // Se status não é OK, tentar ler o erro
        try {
          const errorData = await proxyResponse.json()
          const errorMessage = errorData.message || `Erro HTTP ${proxyResponse.status}`
          console.log(`⚠️ [Interface Web] API retornou status ${proxyResponse.status}: ${errorMessage}`)
          return {
            success: false,
            message: errorMessage,
          }
        } catch {
          // Se não conseguir ler JSON, retornar erro genérico
          console.log(`⚠️ [Interface Web] API retornou status ${proxyResponse.status}`)
          return {
            success: false,
            message: `Erro ao comunicar com a API de impressão (status ${proxyResponse.status})`,
          }
        }
      }
    } catch (proxyError) {
      console.log('⚠️ [Interface Web] Erro ao chamar API:', proxyError)
      return {
        success: false,
        message: `Erro ao comunicar com a API de impressão: ${proxyError instanceof Error ? proxyError.message : 'Erro desconhecido'}`,
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro ao tentar impressão via interface web: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    }
  }
}

/**
 * Verifica se a interface web da impressora está acessível
 * NOTA: Pode falhar por CORS, mas isso não significa que a impressão não vai funcionar
 */
export async function verificarInterfaceWeb(printerIP: string = '10.27.30.75'): Promise<boolean> {
  try {
    // Tentar verificação, mas não falhar se CORS bloquear
    // A verificação é apenas uma otimização - vamos tentar impressão mesmo se falhar
    const response = await fetch(`http://${printerIP}/`, {
      method: 'GET',
      mode: 'no-cors', // Usar no-cors para evitar erro CORS na verificação
    })
    // Com no-cors, não podemos ler a resposta, mas não vai dar erro
    return true // Assumir que está acessível se não deu erro de rede
  } catch {
    // Se der erro de rede (não CORS), provavelmente não está acessível
    return false
  }
}

