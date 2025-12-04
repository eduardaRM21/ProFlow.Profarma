// Serviço de impressão de etiquetas
const PRINTER_SERVICE_URL = process.env.NEXT_PUBLIC_PRINTER_SERVICE_URL || null

// Verificar se está rodando no cliente (browser)
const isClient = typeof window !== 'undefined'

// Importar detecção de coletor
import { isColetorZebra } from './detect-coletor'

// Importar Zebra Browser Print (apenas no cliente)
// Usar import dinâmico para evitar erro no servidor
const loadZebraBrowserPrint = async () => {
  if (!isClient) return null
  try {
    return await import('./zebra-browser-print')
  } catch {
    return null
  }
}

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
      codigoCarga?: string
      idWMS?: string
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🖨️ Iniciando impressão do palete: ${codigoPalete}`)
      console.log(`🔍 Debug - PRINTER_SERVICE_URL: ${PRINTER_SERVICE_URL || 'não configurado'}`)
      console.log(`🔍 Debug - isClient: ${isClient}`)
      const isColetor = isColetorZebra()
      console.log(`🔍 Debug - isColetor: ${isColetor}`)
      
      // Se estiver no coletor e não tiver serviço intermediário configurado, pular direto para impressão direta
      if (isColetor && !PRINTER_SERVICE_URL) {
        console.log('📱 Coletor detectado e sem serviço intermediário - usando apenas impressão direta')
      }
      
      // PRIORIDADE 0: Tentar interface web da impressora
      // NOTA: Pode ter erro CORS, mas vamos tentar mesmo assim (usando no-cors)
      if (isClient) {
        try {
          const webInterfaceModule = await import('./zebra-printer-web-interface').catch(() => null)
          if (webInterfaceModule) {
            console.log('🌐 Tentando impressão via interface web da impressora...')
            const resultado = await webInterfaceModule.imprimirViaInterfaceWeb(codigoPalete, dados, '10.27.30.75')
            if (resultado.success) {
              return resultado
            }
            console.log('⚠️ Impressão via interface web não funcionou, tentando outros métodos...')
          }
        } catch (error) {
          // Ignorar - interface web pode não estar disponível ou ter CORS
          console.log('⚠️ Erro ao tentar interface web (pode ser CORS):', error)
        }
      }
      
      // PRIORIDADE 1: Se estiver no coletor, tentar impressão direta via coletor
      if (isClient && isColetor) {
        try {
          console.log('📱 Detectado coletor Zebra - tentando impressão direta...')
          
          const coletorModule = await import('./zebra-coletor-print').catch(() => null)
          if (coletorModule) {
            const resultado = await coletorModule.imprimirNoColetor(codigoPalete, dados)
            if (resultado.success) {
              return resultado
            }
            console.log('⚠️ Impressão direta no coletor falhou, tentando outros métodos...')
          }
        } catch (error) {
          console.log('⚠️ Erro ao tentar impressão via coletor:', error)
        }
      }
      
      // PRIORIDADE 2: Tentar Zebra Browser Print (se disponível)
      if (isClient) {
        try {
          const zebraModule = await loadZebraBrowserPrint()
          if (zebraModule) {
            const isAvailable = zebraModule.isZebraBrowserPrintAvailable()
            if (isAvailable) {
              console.log('🎯 Tentando imprimir com Zebra Browser Print...')
              const resultado = await zebraModule.imprimirComZebraBrowserPrint(codigoPalete, dados)
              if (resultado.success) {
                return resultado
              }
              console.log('⚠️ Zebra Browser Print falhou, tentando método alternativo...')
            }
          }
        } catch (error) {
          console.log('⚠️ Erro ao usar Zebra Browser Print, tentando método alternativo:', error)
        }
      }
      
      // PRIORIDADE 2: Se houver URL do serviço intermediário configurada e estivermos no cliente,
      // fazer requisição direta do navegador para o serviço (bypass do Vercel)
      // Isso funciona porque o cliente está na rede corporativa e pode acessar o serviço local
      // NOTA: Se estiver em HTTPS (produção), não tentar requisição direta HTTP (Mixed Content)
      // NOTA: Se estiver no coletor, só tenta serviço intermediário se explicitamente configurado
      if (PRINTER_SERVICE_URL && isClient) {
        // Verificar se está em HTTPS (produção)
        const isHTTPS = window.location.protocol === 'https:'
        const isHTTPUrl = PRINTER_SERVICE_URL.startsWith('http://')
        
        // Se estiver em HTTPS e o serviço for HTTP, pular requisição direta (Mixed Content)
        if (isHTTPS && isHTTPUrl) {
          console.log('⚠️ Mixed Content detectado: página HTTPS tentando acessar serviço HTTP')
          console.log(`🔒 Página: ${window.location.protocol}//${window.location.host}`)
          console.log(`🌐 Serviço: ${PRINTER_SERVICE_URL}`)
          console.log('📡 Usando API do Next.js como proxy para evitar bloqueio de Mixed Content')
          console.log('💡 A API do Next.js fará a requisição HTTP do servidor (sem restrições de Mixed Content)')
          // Continuar para usar API do Next.js como proxy
        } else {
          // Se estiver no coletor, avisar que está tentando serviço intermediário (pode não ser necessário)
          if (isColetorZebra()) {
            console.log('⚠️ Coletor detectado, mas PRINTER_SERVICE_URL está configurado. Tentando serviço intermediário...')
            console.log('💡 Dica: Se a impressora está conectada ao coletor, remova PRINTER_SERVICE_URL para usar impressão direta')
          }
          
          console.log(`📡 Fazendo requisição direta do cliente para o serviço intermediário: ${PRINTER_SERVICE_URL}`)
          
          // Limpar URL do serviço intermediário
          let baseUrl = PRINTER_SERVICE_URL.replace(/\/api\/print\/?$/, '').replace(/\/print\/?$/, '').replace(/\/$/, '')
          const serviceUrl = `${baseUrl}/print`
          
          console.log(`🔗 URL completa do serviço: ${serviceUrl}`)
          
          try {
            // Fazer requisição POST para o serviço intermediário
            const response = await fetch(serviceUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              // Adicionar modo cors explícito
              mode: 'cors',
              cache: 'no-cache',
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

            console.log(`📡 Resposta do serviço intermediário: status ${response.status}`)

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
            console.error('❌ Erro ao chamar serviço intermediário diretamente:', error)
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
            
            // Verificar se é erro de Mixed Content
            const isMixedContent = errorMessage.includes('Mixed Content') || 
                                   (typeof window !== 'undefined' && window.location.protocol === 'https:' && PRINTER_SERVICE_URL?.startsWith('http://'))
            
            if (isMixedContent) {
              console.log('🚫 Erro de Mixed Content detectado - usando API do Next.js como proxy')
              // Continuar para usar API do Next.js como fallback
            } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_CONNECTION_REFUSED') || errorMessage.includes('NetworkError') || errorMessage.includes('CORS')) {
              // Tentar determinar se é CORS ou conexão
              const isCorsError = errorMessage.includes('CORS') || errorMessage.includes('Access-Control')
              const isConnectionError = errorMessage.includes('ERR_CONNECTION_REFUSED') || errorMessage.includes('ECONNREFUSED')
              
              // Extrair porta da URL para mensagem mais precisa
              const urlMatch = serviceUrl.match(/:(\d+)/)
              const porta = urlMatch ? urlMatch[1] : '3002'
              
              let diagnosticMessage = `Não foi possível conectar ao serviço intermediário em ${serviceUrl}.\n\n`
              
              // Se estiver no coletor, dar dica especial
              const isColetor = isColetorZebra()
              if (isColetor) {
                diagnosticMessage += `📱 COLETOR DETECTADO\n\n`
                diagnosticMessage += `Você está em um coletor Zebra. Se a impressora está conectada ao coletor,\n`
                diagnosticMessage += `considere remover a variável NEXT_PUBLIC_PRINTER_SERVICE_URL para usar impressão direta.\n\n`
              }
              
              if (isCorsError) {
                diagnosticMessage += `🚫 ERRO DE CORS DETECTADO\n\n`
                diagnosticMessage += `O navegador está bloqueando a requisição por política de CORS.\n\n`
                diagnosticMessage += `🔧 SOLUÇÕES:\n`
                diagnosticMessage += `1. Verifique se o serviço intermediário está configurado para aceitar requisições do navegador\n`
                diagnosticMessage += `2. Verifique se o serviço está retornando headers CORS corretos\n`
                diagnosticMessage += `3. Tente acessar de http:// ao invés de https:// (ou vice-versa)\n`
                diagnosticMessage += `4. Verifique se há proxy ou firewall bloqueando headers CORS\n\n`
              } else if (isConnectionError) {
                diagnosticMessage += `🚫 ERRO DE CONEXÃO\n\n`
                diagnosticMessage += `Não foi possível estabelecer conexão com o serviço.\n\n`
              } else {
                diagnosticMessage += `🚫 ERRO DE REDE\n\n`
              }
              
              diagnosticMessage += `🔧 VERIFICAÇÕES:\n`
              diagnosticMessage += `1. O serviço intermediário está rodando? Execute: node scripts/printer-service.js\n`
              diagnosticMessage += `2. O IP está correto? Verifique o IP mostrado quando o serviço inicia\n`
              diagnosticMessage += `3. A porta está correta? O serviço usa porta ${porta} por padrão (verifique se mudou)\n`
              diagnosticMessage += `4. Firewall bloqueando? Verifique se a porta ${porta} está aberta\n`
              diagnosticMessage += `5. Mesma rede? Cliente e serviço devem estar na mesma rede corporativa\n`
              diagnosticMessage += `6. Teste no Console do navegador (F12) para ver erros detalhados\n\n`
              diagnosticMessage += `📝 Teste manualmente:\n`
              diagnosticMessage += `curl ${serviceUrl} -X POST -H "Content-Type: application/json" -d '{"codigoPalete":"TESTE"}'\n\n`
              diagnosticMessage += `💡 Dica: Se o curl funcionar mas o navegador não, o problema é CORS ou política do navegador.\n\n`
              diagnosticMessage += `💡 Dica: Se estiver no coletor, tente remover NEXT_PUBLIC_PRINTER_SERVICE_URL para usar impressão direta.\n\n`
              diagnosticMessage += `Erro técnico: ${errorMessage}`
              
              return {
                success: false,
                message: diagnosticMessage
              }
            }
            
            // Se falhar, tentar via API do Next.js como fallback
            console.log('🔄 Tentando via API do Next.js como fallback...')
            // Continuar para o código abaixo que usa a API do Next.js
          }
        }
      }
      
      // Usar API do Next.js como proxy (desenvolvimento local ou fallback)
      const apiUrl = '/api/print'
      console.log(`📡 Usando API do Next.js como proxy: ${apiUrl}`)
      if (PRINTER_SERVICE_URL) {
        console.log(`🔧 PRINTER_SERVICE_URL configurado: ${PRINTER_SERVICE_URL} (será usado pelo servidor)`)
      } else {
        console.log(`⚠️ PRINTER_SERVICE_URL não configurado - usando API do Next.js`)
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

