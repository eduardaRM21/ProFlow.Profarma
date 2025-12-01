// Serviço de impressão de etiquetas
const PRINTER_SERVICE_URL = process.env.NEXT_PUBLIC_PRINTER_SERVICE_URL || null

export const PrinterService = {
  /**
   * Imprime uma etiqueta com o código do palete
   * @param codigoPalete Código do palete a ser impresso
   * @param dados Dados adicionais da etiqueta (opcional)
   * @returns Promise<boolean> true se a impressão foi bem-sucedida
   */
  async imprimirEtiquetaPalete(
    codigoPalete: string,
    dados?: {
      quantidadeNFs?: number
      totalVolumes?: number
      destino?: string
      posicoes?: number | null
      quantidadePaletes?: number | null
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🖨️ Iniciando impressão do palete: ${codigoPalete}`)
      
      // Sempre usar API do Next.js como proxy para evitar problemas de CORS
      // A API do Next.js fará a requisição para o serviço intermediário
      const apiUrl = '/api/print'
      console.log(`📡 Usando API do Next.js como proxy: ${apiUrl}`)
      if (PRINTER_SERVICE_URL) {
        console.log(`🔧 PRINTER_SERVICE_URL configurado: ${PRINTER_SERVICE_URL} (será usado pelo servidor)`)
      }
      
      const response = await fetch(apiUrl, {
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
            // Passar URL do serviço intermediário se configurado
            printerServiceUrl: PRINTER_SERVICE_URL || undefined,
          }),
      })

      console.log(`📡 Resposta da API: status ${response.status}`)

      // Verificar se a resposta tem conteúdo antes de tentar fazer parse
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text()
        console.error(`❌ Resposta não é JSON. Status: ${response.status}, Conteúdo: ${textResponse.substring(0, 200)}`)
        return {
          success: false,
          message: `Erro na API de impressão (status ${response.status}): ${textResponse.substring(0, 100)}`,
        }
      }

      const data = await response.json()
      console.log('📦 Dados da resposta:', data)

      if (!response.ok) {
        console.error(`❌ Erro na resposta (status ${response.status}):`, data)
        return {
          success: false,
          message: data.message || data.erro || `Erro ao imprimir etiqueta (status ${response.status})`,
        }
      }

      if (data.success) {
        console.log(`✅ Impressão bem-sucedida: ${data.message}`)
      } else {
        console.warn(`⚠️ Impressão falhou: ${data.message || 'Sem mensagem de erro'}`)
      }

      return {
        success: data.success || false,
        message: data.message || 'Etiqueta impressa com sucesso',
      }
    } catch (error) {
      console.error('❌ Erro ao chamar API de impressão:', error)
      return {
        success: false,
        message: `Erro ao conectar com o servidor de impressão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      }
    }
  },

  /**
   * Imprime múltiplas etiquetas (uma para cada palete)
   * @param codigosPaletes Array com os códigos dos paletes
   * @param dados Dados adicionais da etiqueta (opcional, aplicado a todas as etiquetas)
   * @returns Promise<{ success: boolean; total: number; sucessos: number; falhas: number; mensagens: string[] }>
   */
  async imprimirEtiquetasPaletes(
    codigosPaletes: string[],
    dados?: {
      quantidadeNFs?: number
      totalVolumes?: number
      destino?: string
      posicoes?: number | null
      quantidadePaletes?: number | null
    }
  ): Promise<{
    success: boolean
    total: number
    sucessos: number
    falhas: number
    mensagens: string[]
  }> {
    const mensagens: string[] = []
    let sucessos = 0
    let falhas = 0

    // Imprimir sequencialmente com delay para evitar sobrecarga na impressora
    for (let i = 0; i < codigosPaletes.length; i++) {
      const codigo = codigosPaletes[i]
      
      try {
        const resultado = await this.imprimirEtiquetaPalete(codigo, dados)
        
        if (resultado.success) {
          sucessos++
          mensagens.push(`Palete ${codigo}: ${resultado.message}`)
        } else {
          falhas++
          mensagens.push(`Palete ${codigo}: ${resultado.message}`)
        }
        
        // Delay de 500ms entre impressões (exceto na última)
        if (i < codigosPaletes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        falhas++
        mensagens.push(`Palete ${codigo}: Erro - ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      }
    }

    return {
      success: falhas === 0,
      total: codigosPaletes.length,
      sucessos,
      falhas,
      mensagens,
    }
  },
}

