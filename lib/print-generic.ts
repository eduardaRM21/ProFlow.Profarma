/**
 * SOLUÇÃO GENÉRICA DE IMPRESSÃO DE ETIQUETAS
 * 
 * Esta função tenta múltiplos métodos de impressão em ordem de prioridade,
 * funcionando em qualquer ambiente (coletor, desktop, Vercel, etc.)
 */

import { gerarZPL, type DadosEtiqueta } from './zpl-generator'
import { isColetorZebra } from './detect-coletor'

export interface PrintOptions {
  codigoPalete: string
  dados?: DadosEtiqueta
  nomeImpressora?: string
  tentarTodosOsMetodos?: boolean // Se true, tenta todos os métodos até um funcionar
}

export interface PrintResult {
  success: boolean
  message: string
  metodoUsado?: string
  error?: string
}

/**
 * Função genérica para imprimir etiquetas
 * Tenta múltiplos métodos automaticamente até encontrar um que funcione
 */
export async function imprimirEtiquetaGenerica(
  options: PrintOptions
): Promise<PrintResult> {
  const { codigoPalete, dados, nomeImpressora, tentarTodosOsMetodos = true } = options
  
  console.log(`🖨️ [Impressão Genérica] Iniciando impressão do palete: ${codigoPalete}`)
  
  const isColetor = isColetorZebra()
  const isClient = typeof window !== 'undefined'
  
  // Lista de métodos a tentar (em ordem de prioridade)
  const metodos: Array<{
    nome: string
    tentar: () => Promise<PrintResult | null>
  }> = []
  
  // MÉTODO 1: Zebra Browser Print (se disponível - melhor para coletor)
  if (isClient) {
    metodos.push({
      nome: 'Zebra Browser Print',
      tentar: async () => {
        try {
          const zebraModule = await import('./zebra-browser-print')
          if (zebraModule.isZebraBrowserPrintAvailable()) {
            console.log('🔄 [Genérico] Tentando método: Zebra Browser Print')
            const resultado = await zebraModule.imprimirComZebraBrowserPrint(
              codigoPalete,
              dados,
              nomeImpressora
            )
            if (resultado.success) {
              return { ...resultado, metodoUsado: 'Zebra Browser Print' }
            }
          }
        } catch (error) {
          console.warn('⚠️ [Genérico] Zebra Browser Print não disponível:', error)
        }
        return null
      }
    })
  }
  
  // MÉTODO 2: PrinterService (via API do servidor - mais confiável)
  // Priorizado sobre API Local porque é mais estável e funciona via TCP
  metodos.push({
    nome: 'PrinterService (API Servidor)',
    tentar: async () => {
      try {
        console.log('🔄 [Genérico] Tentando método: PrinterService')
        const printerService = await import('./printer-service')
        const resultado = await printerService.PrinterService.imprimirEtiquetaPalete(
          codigoPalete,
          dados
        )
        if (resultado.success) {
          return { ...resultado, metodoUsado: 'PrinterService' }
        }
      } catch (error) {
        console.warn('⚠️ [Genérico] PrinterService falhou:', error)
      }
      return null
    }
  })
  
  // MÉTODO 3: API Local (desktop com impressora local - fallback)
  // Mantido como fallback porque pode ter problemas com arquivos temporários
  if (isClient && !isColetor && nomeImpressora && nomeImpressora !== 'Impressora via Servidor (API)') {
    metodos.push({
      nome: 'API Local (Desktop)',
      tentar: async () => {
        try {
          console.log('🔄 [Genérico] Tentando método: API Local (fallback)')
          const response = await fetch('/api/print/local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              codigoPalete,
              ...dados,
              printerName: nomeImpressora
            }),
          })
          
          const resultado = await response.json()
          
          if (resultado.success) {
            return { ...resultado, metodoUsado: 'API Local' }
          } else {
            throw new Error(resultado.message || 'Erro na API local')
          }
        } catch (error) {
          console.warn('⚠️ [Genérico] API Local falhou:', error)
          return null
        }
      }
    })
  }
  
  // MÉTODO 4: API Direct (TCP direto) - apenas se não houver impressora selecionada
  // Este método tenta conectar diretamente via TCP, mas geralmente não funciona do cliente
  // Mantido como último recurso
  
  // Tentar métodos em ordem até um funcionar
  const erros: string[] = []
  
  for (const metodo of metodos) {
    try {
      const resultado = await metodo.tentar()
      
      if (resultado && resultado.success) {
        console.log(`✅ [Genérico] Impressão bem-sucedida usando: ${resultado.metodoUsado}`)
        return resultado
      }
      
      if (resultado && !resultado.success) {
        erros.push(`${metodo.nome}: ${resultado.message}`)
      }
      
      // Se não deve tentar todos os métodos, parar no primeiro
      if (!tentarTodosOsMetodos) {
        break
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      erros.push(`${metodo.nome}: ${errorMsg}`)
      console.warn(`⚠️ [Genérico] Método ${metodo.nome} falhou:`, error)
    }
  }
  
  // Se nenhum método funcionou
  const mensagemErro = erros.length > 0
    ? `Nenhum método de impressão funcionou. Erros: ${erros.join('; ')}`
    : 'Nenhum método de impressão disponível. Verifique a configuração.'
  
  console.error(`❌ [Genérico] Todos os métodos falharam:`, erros)
  
  return {
    success: false,
    message: mensagemErro,
    metodoUsado: 'Nenhum',
    error: erros.join('; ')
  }
}

/**
 * Função auxiliar para imprimir múltiplas etiquetas
 */
export async function imprimirMultiplasEtiquetas(
  paletes: Array<{ codigoPalete: string; dados?: DadosEtiqueta }>,
  nomeImpressora?: string,
  delayEntreImpressoes: number = 500
): Promise<{
  sucessos: number
  falhas: number
  mensagens: string[]
}> {
  let sucessos = 0
  let falhas = 0
  const mensagens: string[] = []
  
  for (let i = 0; i < paletes.length; i++) {
    const palete = paletes[i]
    
    try {
      const resultado = await imprimirEtiquetaGenerica({
        codigoPalete: palete.codigoPalete,
        dados: palete.dados,
        nomeImpressora,
        tentarTodosOsMetodos: true
      })
      
      if (resultado.success) {
        sucessos++
        mensagens.push(`Palete ${palete.codigoPalete}: ${resultado.message} (${resultado.metodoUsado})`)
      } else {
        falhas++
        mensagens.push(`Palete ${palete.codigoPalete}: ${resultado.message}`)
      }
      
      // Delay entre impressões (exceto na última)
      if (i < paletes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayEntreImpressoes))
      }
    } catch (error) {
      falhas++
      mensagens.push(`Palete ${palete.codigoPalete}: Erro - ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }
  
  return { sucessos, falhas, mensagens }
}

