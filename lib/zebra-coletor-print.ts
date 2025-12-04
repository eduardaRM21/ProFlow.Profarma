// Impressão direta em coletores Zebra
// Para quando a aplicação está rodando no próprio coletor

import { gerarZPL, type DadosEtiqueta } from './zpl-generator'

/**
 * Imprime diretamente via porta TCP/IP comum de impressoras Zebra (9100)
 * Funciona quando a impressora está conectada ao coletor ou na mesma rede
 */
export async function imprimirDiretoTCP(
  codigoPalete: string,
  dados?: DadosEtiqueta,
  printerIP: string = '127.0.0.1', // Localhost se impressora conectada ao coletor
  printerPort: number = 9100 // Porta padrão Zebra
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`📱 [Coletor] Tentando impressão direta TCP para ${printerIP}:${printerPort}`)
    
    const zpl = gerarZPL(codigoPalete, dados)
    
    // No coletor, podemos tentar usar WebSocket ou fetch para enviar ZPL
    // Muitos coletores Zebra têm APIs REST para impressão
    
    // Tentar método 1: API REST do coletor (se disponível)
    // NOTA: Endpoints relativos só funcionam se estiver no coletor
    // Se estiver usando serviço intermediário, não tente esses endpoints
    const endpoints: (string | null)[] = [
      `/zpl/print`,
      `/api/print`,
      `/print/zpl`,
      `/printer/print`,
    ]
    
    // Endpoint absoluto apenas se printerIP não for localhost
    // Não tentar localhost:9100 via fetch (não funciona, precisa de conexão TCP direta)
    // A porta 9100 é raw TCP, não HTTP - não funciona via fetch
    if (printerIP !== '127.0.0.1' && printerIP !== 'localhost') {
      // Só adicionar se for IP de rede válido
      // NOTA: Porta 9100 é raw TCP, não HTTP - pode não funcionar via fetch
      // Mas vamos tentar para IPs de rede
      endpoints.push(`http://${printerIP}:${printerPort}`)
    }
    
    const validEndpoints = endpoints.filter((e): e is string => e !== null)
    
    for (const endpoint of validEndpoints) {
      try {
        // Pular endpoints que sabemos que não vão funcionar
        if (endpoint.includes('localhost:9100') || 
            endpoint.includes('127.0.0.1:9100') ||
            endpoint.includes('localhost:6101') ||
            endpoint.includes('127.0.0.1:6101')) {
          // Não logar - é esperado que não funcione
          continue
        }
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: zpl,
          mode: 'cors',
        })
        
        if (response.ok) {
          return {
            success: true,
            message: `Etiqueta ${codigoPalete} impressa com sucesso!`
          }
        }
      } catch (error) {
        // Tentar próximo endpoint - não logar erro para evitar spam no console
        // Erros 404 são esperados quando testando endpoints
        continue
      }
    }
    
    // Se nenhum endpoint funcionou, retornar erro
    return {
      success: false,
      message: 'Não foi possível conectar à impressora. Verifique se a impressora está conectada ao coletor ou configurada na rede.'
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro ao imprimir: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    }
  }
}

/**
 * Detecta IP da impressora conectada ao coletor
 * Coletores geralmente têm a impressora em localhost ou IP específico
 */
export function detectarIPImpressora(): string {
  // Se houver variável de ambiente, usar ela
  if (process.env.NEXT_PUBLIC_PRINTER_IP) {
    return process.env.NEXT_PUBLIC_PRINTER_IP
  }
  
  // Não usar localhost por padrão - localhost:9100 não funciona via fetch
  // Usar IP da impressora conhecida na rede
  return '10.27.30.75' // IP da impressora na rede
}

/**
 * Imprime usando o melhor método disponível no coletor
 */
export async function imprimirNoColetor(
  codigoPalete: string,
  dados?: DadosEtiqueta
): Promise<{ success: boolean; message: string }> {
  const printerIP = detectarIPImpressora()
  
  // Tentar porta 9100 primeiro (padrão Zebra)
  let resultado = await imprimirDiretoTCP(codigoPalete, dados, printerIP, 9100)
  
  if (!resultado.success) {
    // Tentar porta 6101 (alternativa)
    resultado = await imprimirDiretoTCP(codigoPalete, dados, printerIP, 6101)
  }
  
  return resultado
}

