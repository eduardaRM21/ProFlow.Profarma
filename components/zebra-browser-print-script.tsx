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
      strategy="lazyOnload"
      onLoad={() => {
        console.log('✅ Zebra Browser Print carregado com sucesso')
        
        // Verificar se a API está disponível
        if (typeof window !== 'undefined' && (window as any).BrowserPrint) {
          console.log('✅ Zebra Browser Print API disponível')
        } else {
          console.warn('⚠️ Zebra Browser Print script carregado, mas API não está disponível')
        }
      }}
      onError={() => {
        // Erro ao carregar script - não é crítico, o sistema tem outros métodos
        // Mostrar apenas uma mensagem discreta, já que é comportamento esperado
        console.info('ℹ️ Zebra Browser Print não disponível - usando métodos alternativos de impressão')
      }}
    />
  )
}

