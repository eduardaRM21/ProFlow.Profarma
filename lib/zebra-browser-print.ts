// Integração com Zebra Browser Print
// Permite impressão direta do navegador para impressoras Zebra
// Compatível com Vercel (tudo roda no cliente)

import { gerarZPL, type DadosEtiqueta } from './zpl-generator'

// Declaração de tipos para Zebra Browser Print (múltiplas formas possíveis)
declare global {
  interface Window {
    BrowserPrint?: any
    BrowserPrintAPI?: any
    zebra?: any
  }
}

interface BrowserPrintPrinter {
  name: string
  send(data: string): Promise<void> | void
  read?: () => Promise<string> | string
  [key: string]: any // Permite propriedades adicionais
}

/**
 * Verifica se Zebra Browser Print está disponível (múltiplas formas)
 * Tenta detectar tanto instalação local quanto via CDN
 */
export function isZebraBrowserPrintAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  const win = window as any
  
  // Tentar múltiplas formas de acessar a API
  const formas = [
    // Forma 1: BrowserPrint.BrowserPrint (padrão CDN)
    { nome: 'BrowserPrint.BrowserPrint', obj: win.BrowserPrint?.BrowserPrint },
    // Forma 2: BrowserPrint diretamente
    { nome: 'BrowserPrint', obj: win.BrowserPrint },
    // Forma 3: BrowserPrintAPI
    { nome: 'BrowserPrintAPI', obj: win.BrowserPrintAPI },
    // Forma 4: zebra.BrowserPrint
    { nome: 'zebra.BrowserPrint', obj: win.zebra?.BrowserPrint },
  ]
  
  // Verificar se alguma forma está disponível e tem getPrinters
  for (const forma of formas) {
    if (forma.obj && typeof forma.obj.getPrinters === 'function') {
      console.log(`✅ [Zebra API] API encontrada em: ${forma.nome}`)
      return true
    }
  }
  
  // Se não encontrou, verificar se pelo menos BrowserPrint existe (pode estar carregando)
  const hasBrowserPrint = typeof win.BrowserPrint !== 'undefined'
  const hasBrowserPrintAPI = typeof win.BrowserPrint?.BrowserPrint !== 'undefined'
  
  if (hasBrowserPrint || hasBrowserPrintAPI) {
    // Não logar repetidamente se já detectou
    if (!(window as any).__zebra_api_warning_shown) {
      console.log('⚠️ [Zebra API] BrowserPrint detectado mas getPrinters() não está disponível ainda')
      console.log(`   - BrowserPrint: ${hasBrowserPrint}`)
      console.log(`   - BrowserPrint.BrowserPrint: ${hasBrowserPrintAPI}`)
      console.log('   - Aguarde alguns segundos e tente novamente')
      ;(window as any).__zebra_api_warning_shown = true
    }
  } else {
    // Não logar repetidamente
    if (!(window as any).__zebra_api_not_available_shown) {
      console.log('⚠️ [Zebra API] Zebra Browser Print NÃO está disponível')
      console.log('   - Verifique se o Zebra Browser Print está instalado')
      console.log('   - Verifique se o serviço do Zebra Browser Print está rodando')
      console.log('   - IMPORTANTE: No Windows, o Zebra Browser Print pode precisar de uma extensão do navegador')
      console.log('   - Acesse: chrome://extensions/ ou edge://extensions/ e verifique se há extensão do Zebra')
      console.log('   - Reinicie o navegador após instalar o Zebra Browser Print')
      ;(window as any).__zebra_api_not_available_shown = true
    }
  }
  
  return false
}

/**
 * Obtém a API do Zebra Browser Print (tenta múltiplas formas)
 */
function getBrowserPrintAPI(): any {
  if (typeof window === 'undefined') {
    return null
  }
  
  const win = window as any
  
  // Tentar múltiplas formas
  if (win.BrowserPrint?.BrowserPrint && typeof win.BrowserPrint.BrowserPrint.getPrinters === 'function') {
    return win.BrowserPrint.BrowserPrint
  }
  
  if (win.BrowserPrint && typeof win.BrowserPrint.getPrinters === 'function') {
    return win.BrowserPrint
  }
  
  if (win.BrowserPrintAPI && typeof win.BrowserPrintAPI.getPrinters === 'function') {
    return win.BrowserPrintAPI
  }
  
  if (win.zebra?.BrowserPrint && typeof win.zebra.BrowserPrint.getPrinters === 'function') {
    return win.zebra.BrowserPrint
  }
  
  // Tentar acessar via serviço local (quando instalado localmente)
  // O Zebra Browser Print pode expor a API em uma porta local
  if (win.location && win.location.protocol === 'http:') {
    // Em HTTP, podemos tentar acessar o serviço local
    // Mas isso requer CORS configurado, então não vamos tentar aqui
  }
  
  return null
}

/**
 * Tenta carregar a API do Zebra Browser Print manualmente
 * Útil quando o script do CDN não carrega mas o serviço está rodando
 */
export async function tentarCarregarAPIManualmente(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false
  }
  
  const win = window as any
  
  // Se já está disponível, retornar true
  if (getBrowserPrintAPI()) {
    return true
  }
  
  // Tentar carregar o script novamente
  try {
    // Verificar se o script já está no DOM
    const existingScript = document.querySelector('script[src*="browser-print"]')
    if (!existingScript) {
      console.log('🔄 [Zebra API] Tentando carregar script manualmente...')
      const script = document.createElement('script')
      script.src = 'https://www.zebra.com/apps/r/browser-print/BrowserPrint-3.0.216.min.js'
      script.async = true
      
      return new Promise((resolve) => {
        script.onload = () => {
          console.log('✅ [Zebra API] Script carregado manualmente')
          // Aguardar um pouco para a API inicializar
          setTimeout(() => {
            const api = getBrowserPrintAPI()
            resolve(!!api)
          }, 1000)
        }
        script.onerror = () => {
          console.warn('⚠️ [Zebra API] Erro ao carregar script manualmente')
          resolve(false)
        }
        document.head.appendChild(script)
      })
    } else {
      console.log('ℹ️ [Zebra API] Script já está no DOM, aguardando inicialização...')
      // Aguardar mais um pouco
      await new Promise(resolve => setTimeout(resolve, 2000))
      return !!getBrowserPrintAPI()
    }
  } catch (error) {
    console.error('❌ [Zebra API] Erro ao tentar carregar API manualmente:', error)
    return false
  }
}

/**
 * Lista todas as impressoras Zebra disponíveis (método robusto)
 */
export async function listarImpressorasZebra(): Promise<BrowserPrintPrinter[]> {
  if (typeof window === 'undefined') {
    throw new Error('Esta função só pode ser executada no navegador')
  }

  const api = getBrowserPrintAPI()
  
  if (!api) {
    const win = window as any
    console.error('❌ [Zebra API] API não encontrada')
    console.error('   - window.BrowserPrint:', typeof win.BrowserPrint)
    console.error('   - BrowserPrint.BrowserPrint:', typeof win.BrowserPrint?.BrowserPrint)
    console.error('   - BrowserPrintAPI:', typeof win.BrowserPrintAPI)
    console.error('   - zebra.BrowserPrint:', typeof win.zebra?.BrowserPrint)
    throw new Error('Zebra Browser Print API não encontrada. Verifique se o Zebra Browser Print está instalado e o script foi carregado.')
  }

  try {
    console.log('🔍 [Zebra API] Chamando getPrinters()...')
    
    // Chamar getPrinters
    let result = api.getPrinters()
    
    // Se não for Promise, pode ser que já retornou o resultado
    if (!(result instanceof Promise)) {
      if (Array.isArray(result)) {
        console.log('✅ [Zebra API] getPrinters() retornou array diretamente:', result.length, 'impressora(s)')
        return result
      }
      // Se não for array nem Promise, criar uma Promise resolvida
      result = Promise.resolve(result)
    }
    
    const printers = await result
    
    console.log('✅ [Zebra API] getPrinters() retornou:', printers?.length || 0, 'impressora(s)')
    
    if (!Array.isArray(printers)) {
      console.error('❌ [Zebra API] getPrinters() não retornou um array. Retornou:', typeof printers)
      throw new Error(`getPrinters() retornou ${typeof printers} em vez de um array`)
    }
    
    if (printers.length > 0) {
      console.log('📋 [Zebra API] Impressoras encontradas:')
      printers.forEach((printer: any, index: number) => {
        console.log(`   ${index + 1}. ${printer.name || 'Sem nome'}`)
        console.log(`      - Tem método send: ${typeof printer.send === 'function'}`)
      })
    } else {
      console.warn('⚠️ [Zebra API] Nenhuma impressora encontrada')
      console.warn('⚠️ [Zebra API] Verifique se há impressoras cadastradas no aplicativo Zebra Browser Print')
    }
    
    return printers
  } catch (error) {
    console.error('❌ [Zebra API] Erro ao listar impressoras:', error)
    throw error
  }
}

/**
 * Obtém a impressora padrão
 */
export async function obterImpressoraPadrao(): Promise<BrowserPrintPrinter | null> {
  const api = getBrowserPrintAPI()
  
  if (!api || typeof api.getDefaultPrinter !== 'function') {
    return null
  }

  try {
    let result = api.getDefaultPrinter()
    
    if (!(result instanceof Promise)) {
      result = Promise.resolve(result)
    }
    
    const printer = await result
    return printer
  } catch (error) {
    console.error('Erro ao obter impressora padrão:', error)
    return null
  }
}

/**
 * Imprime etiqueta usando Zebra Browser Print
 */
export async function imprimirComZebraBrowserPrint(
  codigoPalete: string,
  dados?: DadosEtiqueta,
  nomeImpressora?: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`🖨️ [Zebra Browser Print] Iniciando impressão do palete: ${codigoPalete}`)

    // Verificar se Browser Print está disponível
    if (!isZebraBrowserPrintAvailable()) {
      return {
        success: false,
        message: 'Zebra Browser Print não está disponível. Verifique se o script foi carregado e se o Browser Print está instalado.'
      }
    }

    // Obter impressora
    let printer: BrowserPrintPrinter | null = null

    if (nomeImpressora) {
      // Buscar impressora específica
      const printers = await listarImpressorasZebra()
      printer = printers.find(p => p.name === nomeImpressora) || null
      
      if (!printer) {
        return {
          success: false,
          message: `Impressora "${nomeImpressora}" não encontrada. Impressoras disponíveis: ${printers.map(p => p.name).join(', ')}`
        }
      }
    } else {
      // Usar impressora padrão
      printer = await obterImpressoraPadrao()
      
      if (!printer) {
        // Tentar listar e usar a primeira disponível
        const printers = await listarImpressorasZebra()
        if (printers.length === 0) {
          return {
            success: false,
            message: 'Nenhuma impressora Zebra encontrada. Configure o Zebra Browser Print e adicione uma impressora.'
          }
        }
        printer = printers[0]
        console.log(`⚠️ Usando primeira impressora disponível: ${printer.name}`)
      }
    }

    console.log(`📡 [Zebra Browser Print] Usando impressora: ${printer.name}`)
    console.log(`📡 [Zebra Browser Print] Tipo da impressora: ${typeof printer}`)
    console.log(`📡 [Zebra Browser Print] Métodos disponíveis:`, Object.keys(printer))

    // Gerar ZPL
    const zpl = gerarZPL(codigoPalete, dados)
    console.log(`📄 [Zebra Browser Print] ZPL gerado (${zpl.length} caracteres)`)
    console.log(`📄 [Zebra Browser Print] Primeiros 200 caracteres do ZPL:`, zpl.substring(0, 200))

    // Verificar se o método send existe
    if (typeof printer.send !== 'function') {
      throw new Error(`Impressora "${printer.name}" não possui método send(). Métodos disponíveis: ${Object.keys(printer).join(', ')}`)
    }

    // Enviar para impressora
    console.log(`📤 [Zebra Browser Print] Enviando ZPL para impressora...`)
    try {
      let sendResult = printer.send(zpl)
      
      // Se send retornar uma Promise, aguardar
      if (sendResult instanceof Promise) {
        await sendResult
      }
      
      console.log(`✅ [Zebra Browser Print] ZPL enviado com sucesso!`)
    } catch (sendError) {
      console.error('❌ [Zebra Browser Print] Erro ao enviar ZPL:', sendError)
      throw sendError
    }

    console.log(`✅ [Zebra Browser Print] Etiqueta ${codigoPalete} enviada para impressão com sucesso!`)

    return {
      success: true,
      message: `Etiqueta ${codigoPalete} impressa com sucesso na impressora ${printer.name}!`
    }
  } catch (error) {
    console.error('❌ [Zebra Browser Print] Erro ao imprimir:', error)
    return {
      success: false,
      message: `Erro ao imprimir: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    }
  }
}

