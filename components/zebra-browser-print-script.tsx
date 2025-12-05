"use client"

import Script from "next/script"

/**
 * Client Component para carregar o script do Zebra Browser Print
 * Necessário porque event handlers não podem ser usados em Server Components
 * 
 * NOTA: Se o script não carregar, não é um problema crítico.
 * O sistema vai usar outros métodos de impressão (serviço intermediário, etc.)
 */
export function ZebraBrowserPrintScript() {
  return (
    <Script
      src="https://www.zebra.com/apps/r/browser-print/BrowserPrint-3.0.216.min.js"
      strategy="afterInteractive" // Mudado de lazyOnload para afterInteractive para carregar mais cedo
      onLoad={() => {
        console.log('✅ [Zebra Script] Script carregado do CDN')
        
        // Verificar se a API está disponível imediatamente
        if (typeof window !== 'undefined') {
          const win = window as any
          console.log('🔍 [Zebra Script] Verificando API...')
          console.log('   - window existe:', typeof window !== 'undefined')
          console.log('   - window.BrowserPrint existe:', typeof win.BrowserPrint !== 'undefined')
          console.log('   - window.BrowserPrint.BrowserPrint existe:', typeof win.BrowserPrint?.BrowserPrint !== 'undefined')
          
          if (win.BrowserPrint) {
            console.log('✅ [Zebra Script] BrowserPrint encontrado')
            
            // Aguardar e verificar novamente para garantir que a API está totalmente carregada
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                const win2 = window as any
                if (win2.BrowserPrint?.BrowserPrint) {
                  console.log('✅ [Zebra Script] API BrowserPrint.BrowserPrint totalmente carregada e pronta')
                  
                  // Tentar verificar se há impressoras disponíveis (opcional, apenas para debug)
                  try {
                    if (win2.BrowserPrint.BrowserPrint.getPrinters) {
                      console.log('✅ [Zebra Script] Método getPrinters() disponível')
                    }
                  } catch (e) {
                    console.warn('⚠️ [Zebra Script] Erro ao verificar getPrinters:', e)
                  }
                } else {
                  console.warn('⚠️ [Zebra Script] BrowserPrint.BrowserPrint ainda não está disponível após 200ms')
                  console.warn('⚠️ [Zebra Script] Isso pode indicar que o Zebra Browser Print não está instalado no dispositivo')
                }
              }
            }, 500) // Aumentado para 500ms
          } else {
            console.warn('⚠️ [Zebra Script] Script carregado, mas window.BrowserPrint não está disponível')
            console.warn('⚠️ [Zebra Script] Verifique se o Zebra Browser Print está instalado no dispositivo')
          }
        }
      }}
      onError={(error) => {
        console.error('❌ [Zebra Script] Erro ao carregar script do CDN:', error)
        console.error('❌ [Zebra Script] Verifique a conexão com a internet ou se o CDN da Zebra está acessível')
        console.info('ℹ️ [Zebra Script] O sistema tentará usar métodos alternativos de impressão')
      }}
    />
  )
}

