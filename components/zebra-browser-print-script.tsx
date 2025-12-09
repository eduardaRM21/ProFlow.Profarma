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
    <>
      {/* Script do CDN da Zebra */}
      <Script
        src="https://www.zebra.com/apps/r/browser-print/BrowserPrint-3.0.216.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('✅ [Zebra Script] Script do CDN carregado')
          verificarAPIDisponivel()
        }}
        onError={(error) => {
          console.warn('⚠️ [Zebra Script] Erro ao carregar script do CDN (pode ser normal se instalado localmente):', error)
          // Mesmo com erro no CDN, verificar se a API está disponível localmente
          setTimeout(() => verificarAPIDisponivel(), 1000)
        }}
      />
      
      {/* Script para verificar instalação local e tentar carregar extensão */}
      <Script
        id="zebra-browser-print-check"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              let verificacaoAtiva = false;
              
              function verificarAPILocal() {
                if (typeof window === 'undefined' || verificacaoAtiva) return;
                verificacaoAtiva = true;
                
                const win = window;
                let tentativas = 0;
                const maxTentativas = 15; // Aumentado para 15 tentativas (7.5 segundos)
                
                function verificar() {
                  tentativas++;
                  
                  // Verificar múltiplas formas
                  const formas = [
                    { nome: 'BrowserPrint.BrowserPrint', obj: win.BrowserPrint?.BrowserPrint },
                    { nome: 'BrowserPrint', obj: win.BrowserPrint },
                    { nome: 'BrowserPrintAPI', obj: win.BrowserPrintAPI },
                    { nome: 'zebra.BrowserPrint', obj: win.zebra?.BrowserPrint }
                  ];
                  
                  for (const forma of formas) {
                    if (forma.obj && typeof forma.obj.getPrinters === 'function') {
                      console.log('✅ [Zebra Script] API encontrada em:', forma.nome, 'após', tentativas, 'tentativa(s)');
                      verificacaoAtiva = false;
                      return true;
                    }
                  }
                  
                  if (tentativas < maxTentativas) {
                    setTimeout(verificar, 500);
                  } else {
                    if (!win.__zebra_final_warning_shown) {
                      console.warn('⚠️ [Zebra Script] API não encontrada após', maxTentativas, 'tentativas');
                      console.warn('⚠️ [Zebra Script] Possíveis causas:');
                      console.warn('   1. O serviço do Zebra Browser Print não está rodando');
                      console.warn('   2. A extensão do navegador não está instalada/ativada');
                      console.warn('   3. O navegador precisa ser reiniciado após instalação');
                      console.warn('   4. Verifique se há firewall bloqueando a comunicação');
                      console.warn('   💡 Dica: Abra o aplicativo Zebra Browser Print e verifique se está rodando');
                      win.__zebra_final_warning_shown = true;
                    }
                    verificacaoAtiva = false;
                  }
                  
                  return false;
                }
                
                // Começar verificação após 1 segundo
                setTimeout(verificar, 1000);
              }
              
              // Executar verificação
              if (document.readyState === 'complete') {
                verificarAPILocal();
              } else {
                window.addEventListener('load', verificarAPILocal);
              }
              
              // Também tentar quando a página estiver totalmente carregada
              window.addEventListener('DOMContentLoaded', function() {
                setTimeout(verificarAPILocal, 2000);
              });
            })();
          `
        }}
      />
    </>
  )
}

// Função auxiliar para verificar API (chamada pelo script do CDN)
function verificarAPIDisponivel() {
  if (typeof window === 'undefined') return
  
  const win = window as any
  console.log('🔍 [Zebra Script] Verificando API após carregamento...')
  console.log('   - window.BrowserPrint existe:', typeof win.BrowserPrint !== 'undefined')
  console.log('   - BrowserPrint.BrowserPrint existe:', typeof win.BrowserPrint?.BrowserPrint !== 'undefined')
  
  // Verificar múltiplas formas
  const formas = [
    { nome: 'BrowserPrint.BrowserPrint', obj: win.BrowserPrint?.BrowserPrint },
    { nome: 'BrowserPrint', obj: win.BrowserPrint },
    { nome: 'BrowserPrintAPI', obj: win.BrowserPrintAPI },
    { nome: 'zebra.BrowserPrint', obj: win.zebra?.BrowserPrint }
  ]
  
  for (const forma of formas) {
    if (forma.obj && typeof forma.obj.getPrinters === 'function') {
      console.log(`✅ [Zebra Script] API encontrada em: ${forma.nome}`)
      console.log('✅ [Zebra Script] Método getPrinters() disponível')
      return
    }
  }
  
  console.warn('⚠️ [Zebra Script] API não encontrada imediatamente, continuando verificação...')
}

