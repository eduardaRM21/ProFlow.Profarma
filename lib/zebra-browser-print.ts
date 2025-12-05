// Integração com Zebra Browser Print
// Permite impressão direta do navegador para impressoras Zebra

import { gerarZPL, type DadosEtiqueta } from './zpl-generator'

// Declaração de tipos para Zebra Browser Print
declare global {
  interface Window {
    BrowserPrint?: {
      BrowserPrint: {
        getDefaultPrinter(): Promise<BrowserPrintPrinter | null>
        getPrinters(): Promise<BrowserPrintPrinter[]>
      }
    }
  }
}

interface BrowserPrintPrinter {
  name: string
  send(data: string): Promise<void>
  read(): Promise<string>
}

/**
 * Verifica se Zebra Browser Print está disponível
 */
export function isZebraBrowserPrintAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  const win = window as any
  const hasBrowserPrint = typeof win.BrowserPrint !== 'undefined'
  const hasBrowserPrintAPI = typeof win.BrowserPrint?.BrowserPrint !== 'undefined'
  
  const disponivel = hasBrowserPrint && hasBrowserPrintAPI
  
  // Log apenas quando não estiver disponível (para debug)
  if (!disponivel) {
    console.log('⚠️ [Zebra API] Zebra Browser Print NÃO está disponível')
    console.log(`   - BrowserPrint: ${hasBrowserPrint}`)
    console.log(`   - BrowserPrint.BrowserPrint: ${hasBrowserPrintAPI}`)
  }
  
  return disponivel
}

/**
 * Lista todas as impressoras Zebra disponíveis
 */
export async function listarImpressorasZebra(): Promise<BrowserPrintPrinter[]> {
  if (!isZebraBrowserPrintAvailable()) {
    throw new Error('Zebra Browser Print não está disponível. Verifique se o script foi carregado.')
  }

  try {
    console.log('🔍 [Zebra API] Chamando BrowserPrint.getPrinters()...')
    console.log('🔍 [Zebra API] window.BrowserPrint:', typeof window.BrowserPrint)
    console.log('🔍 [Zebra API] BrowserPrint.BrowserPrint:', typeof window.BrowserPrint?.BrowserPrint)
    
    const printers = await window.BrowserPrint!.BrowserPrint.getPrinters()
    
    console.log('✅ [Zebra API] getPrinters() retornou:', printers.length, 'impressora(s)')
    if (printers.length > 0) {
      console.log('📋 [Zebra API] Impressoras encontradas:')
      printers.forEach((printer, index) => {
        console.log(`   ${index + 1}. ${printer.name}`)
        console.log(`      - Tipo: ${typeof printer}`)
        console.log(`      - Tem método send: ${typeof printer.send === 'function'}`)
      })
    }
    
    return printers
  } catch (error) {
    console.error('❌ [Zebra API] Erro ao listar impressoras:', error)
    console.error('❌ [Zebra API] Tipo do erro:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('❌ [Zebra API] Mensagem:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error('❌ [Zebra API] Stack:', error.stack)
    }
    throw error
  }
}

/**
 * Obtém a impressora padrão
 */
export async function obterImpressoraPadrao(): Promise<BrowserPrintPrinter | null> {
  if (!isZebraBrowserPrintAvailable()) {
    return null
  }

  try {
    const printer = await window.BrowserPrint!.BrowserPrint.getDefaultPrinter()
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
      await printer.send(zpl)
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

