// Detecção de ambiente: Coletor Zebra vs Navegador Desktop

/**
 * Detecta se a aplicação está rodando em um coletor Zebra
 */
export function isColetorZebra(): boolean {
  if (typeof window === 'undefined') return false
  
  const ua = navigator.userAgent.toLowerCase()
  const hostname = window.location.hostname.toLowerCase()
  
  // Verificar User Agent - modelos comuns de coletores Zebra
  const coletorUserAgents = [
    'zebra',
    'tc20', 'tc21', 'tc26', 'tc52', 'tc57', 'tc72', 'tc77',
    'mc33', 'mc93',
    'wt6000',
    'android' // Muitos coletores rodam Android
  ]
  
  if (coletorUserAgents.some(agent => ua.includes(agent))) {
    return true
  }
  
  // Verificar hostname - IPs de rede interna podem indicar coletor
  if (hostname.match(/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/)) {
    // Pode ser coletor, mas não é garantia
    // Verificar outros indicadores
  }
  
  // Verificar se há APIs específicas do coletor
  if (typeof (window as any).ZebraPrint !== 'undefined') {
    return true
  }
  
  if (typeof (window as any).ZebraBrowserPrint !== 'undefined') {
    return true
  }
  
  // Verificar resolução - coletores geralmente têm telas menores
  if (window.screen.width <= 480 || window.screen.height <= 640) {
    // Pode ser coletor, mas não é garantia
  }
  
  return false
}

/**
 * Obtém informações sobre o ambiente
 */
export function getEnvironmentInfo() {
  return {
    isColetor: isColetorZebra(),
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
    screenSize: typeof window !== 'undefined' 
      ? `${window.screen.width}x${window.screen.height}` 
      : 'unknown',
    hasZebraPrint: typeof window !== 'undefined' && typeof (window as any).ZebraPrint !== 'undefined',
    hasBrowserPrint: typeof window !== 'undefined' && typeof (window as any).BrowserPrint !== 'undefined',
  }
}

