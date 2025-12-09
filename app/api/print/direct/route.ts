import { NextResponse } from 'next/server'
import * as net from 'net'
import { gerarZPL, type DadosEtiqueta } from '@/lib/zpl-generator'

// Configurações da impressora
const PRINTER_IP = '10.27.30.75'
const PRINTER_PORT = 6101
const ALTERNATE_PORT = 9100

/**
 * Função para conectar e imprimir via TCP/IP (porta raw)
 * Este é o método mais confiável para impressoras Zebra
 */
async function imprimirViaTCP(zpl: string, porta: number = PRINTER_PORT): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    let connected = false
    let dadosEnviados = false

    socket.setTimeout(8000) // Timeout de 8 segundos

    socket.on('connect', () => {
      connected = true
      console.log(`✅ [TCP] Conectado à impressora ${PRINTER_IP}:${porta}`)
      
      // Adicionar quebra de linha no final do ZPL se necessário
      const zplCompleto = zpl.endsWith('\n') ? zpl : zpl + '\n'
      
      socket.write(zplCompleto, 'utf8', (err) => {
        if (err) {
          console.error('❌ [TCP] Erro ao escrever dados:', err)
          socket.destroy()
          reject(err)
        } else {
          dadosEnviados = true
          console.log('📤 [TCP] Dados enviados para impressora')
          // Aguardar um pouco antes de fechar para garantir que os dados foram processados
          setTimeout(() => {
            socket.end()
          }, 300)
        }
      })
    })

    socket.on('close', () => {
      if (connected && dadosEnviados) {
        console.log('✅ [TCP] Conexão fechada após envio bem-sucedido')
        resolve(true)
      } else if (!connected) {
        console.log('⚠️ [TCP] Conexão fechada sem ter sido estabelecida')
        reject(new Error('Conexão fechada antes de ser estabelecida'))
      } else {
        console.log('⚠️ [TCP] Conexão fechada antes de enviar dados')
        reject(new Error('Conexão fechada antes de enviar dados'))
      }
    })

    socket.on('error', (err: any) => {
      console.error('❌ [TCP] Erro no socket:', err)
      const erroMsg = err.code === 'ECONNREFUSED' 
        ? `Conexão recusada - verifique se a impressora está ligada e acessível em ${PRINTER_IP}:${porta}`
        : err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND'
        ? `Timeout ou host não encontrado - verifique o IP ${PRINTER_IP} e a conectividade de rede`
        : err.message || 'Erro desconhecido na conexão'
      socket.destroy()
      reject(new Error(erroMsg))
    })

    socket.on('timeout', () => {
      console.error('⏱️ [TCP] Timeout ao conectar com a impressora')
      socket.destroy()
      reject(new Error(`Timeout ao conectar com a impressora ${PRINTER_IP}:${porta}. Verifique se a impressora está ligada e acessível na rede.`))
    })

    console.log(`🔌 [TCP] Tentando conectar em ${PRINTER_IP}:${porta}...`)
    try {
      socket.connect(porta, PRINTER_IP)
    } catch (err) {
      reject(new Error(`Erro ao iniciar conexão: ${err instanceof Error ? err.message : 'Erro desconhecido'}`))
    }
  })
}

/**
 * API Route para imprimir diretamente via TCP raw (porta 9100/6101)
 * Este é o método mais confiável para impressoras Zebra
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      codigoPalete,
      quantidadeNFs,
      totalVolumes,
      destino,
      posicoes,
      quantidadePaletes,
      codigoCarga,
      idWMS,
      printerServiceUrl,
    } = body

    if (!codigoPalete) {
      return NextResponse.json(
        { success: false, message: 'Código do palete é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se está rodando no Vercel (produção)
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined
    const isProduction = process.env.NODE_ENV === 'production'
    
    // Se houver serviço intermediário configurado, usar como proxy
    // No servidor, podemos ler NEXT_PUBLIC_* mas é melhor ter uma variável sem prefixo também
    const serviceUrl = printerServiceUrl || process.env.PRINTER_SERVICE_URL || process.env.NEXT_PUBLIC_PRINTER_SERVICE_URL
    
    // NO VERCEL: TCP direto NÃO funciona (sem acesso à rede local)
    // Deve usar APENAS serviço intermediário (Cloudflare Tunnel)
    if (isVercel || isProduction) {
      if (!serviceUrl) {
        return NextResponse.json(
          {
            success: false,
            message: `❌ Impressão TCP direta não funciona no Vercel (produção).

🔧 SOLUÇÃO NECESSÁRIA:
1. Configure um serviço intermediário de impressão na rede local
2. Exponha o serviço via Cloudflare Tunnel (ou ngrok, etc.)
3. Configure a variável NEXT_PUBLIC_PRINTER_SERVICE_URL no Vercel com a URL pública do túnel

📋 Exemplo de configuração:
- Serviço local: http://localhost:3002
- Cloudflare Tunnel: https://seu-tunel.cloudflare.com
- Variável no Vercel: NEXT_PUBLIC_PRINTER_SERVICE_URL=https://seu-tunel.cloudflare.com

💡 Alternativa: Use Zebra Browser Print no cliente (navegador) para impressão direta.`
          },
          { status: 503 }
        )
      }
    }
    
    if (serviceUrl) {
      console.log(`🔄 [API Direct] Usando serviço intermediário como proxy: ${serviceUrl}`)
      try {
        // Limpar URL do serviço intermediário
        let baseUrl = serviceUrl.replace(/\/api\/print\/?$/, '').replace(/\/print\/?$/, '').replace(/\/$/, '')
        const fullServiceUrl = `${baseUrl}/print`
        
        console.log(`📡 [API Direct] Fazendo requisição para: ${fullServiceUrl}`)
        const response = await fetch(fullServiceUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            codigoPalete,
            quantidadeNFs,
            totalVolumes,
            destino,
            posicoes,
            quantidadePaletes,
            codigoCarga,
            idWMS
          }),
        })

        const data = await response.json()
        console.log('📦 [API Direct] Resposta do serviço intermediário:', data)

        if (response.ok && data.success) {
          return NextResponse.json(data)
        } else {
          return NextResponse.json(
            { success: false, message: data.message || 'Erro no serviço intermediário' },
            { status: response.status || 500 }
          )
        }
      } catch (error) {
        console.error('❌ [API Direct] Erro ao chamar serviço intermediário:', error)
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        
        // Se estiver no Vercel e o serviço intermediário falhar, não tentar impressão direta
        if (isVercel || isProduction) {
          return NextResponse.json(
            {
              success: false,
              message: `Não foi possível conectar ao serviço intermediário de impressão (${serviceUrl}).

🔧 SOLUÇÃO:
1. Verifique se o serviço intermediário está rodando e acessível
2. Se o serviço está em rede local, configure um túnel (ngrok, Cloudflare Tunnel, etc.)
3. Configure a variável NEXT_PUBLIC_PRINTER_SERVICE_URL no Vercel com a URL pública do serviço
4. Verifique se o firewall permite conexões externas na porta do serviço

Erro técnico: ${errorMessage}`
            },
            { status: 500 }
          )
        }
        // Em desenvolvimento, continuar para tentar impressão direta
        console.log('🔄 [API Direct] Tentando impressão direta como fallback...')
      }
    }

    // TCP direto só funciona em desenvolvimento local (não no Vercel)
    // No Vercel, deve usar serviço intermediário (já verificado acima)
    if (isVercel || isProduction) {
      // Se chegou aqui, o serviço intermediário falhou ou não foi configurado
      // Mas já retornamos erro acima se não houver serviceUrl
      // Então isso não deveria acontecer, mas vamos garantir
      return NextResponse.json(
        {
          success: false,
          message: `TCP direto não está disponível no Vercel. Use um serviço intermediário (Cloudflare Tunnel) ou Zebra Browser Print no cliente.`,
        },
        { status: 503 }
      )
    }

    // DESENVOLVIMENTO LOCAL: Tentar TCP direto
    const zpl = gerarZPL(codigoPalete, {
      quantidadeNFs: quantidadeNFs || 0,
      totalVolumes: totalVolumes || 0,
      destino: destino || '',
      posicoes: posicoes || null,
      quantidadePaletes: quantidadePaletes || null,
      codigoCarga: codigoCarga || undefined,
      idWMS: idWMS || undefined,
    })

    console.log(`🌐 [API Direct] Tentando imprimir via TCP raw (desenvolvimento local): ${PRINTER_IP}`)
    console.log(`📄 [API Direct] ZPL gerado (${zpl.length} caracteres)`)

    // Tentar porta 6101 primeiro (porta padrão configurada)
    try {
      const sucesso = await imprimirViaTCP(zpl, PRINTER_PORT)
      if (sucesso) {
        return NextResponse.json({
          success: true,
          message: `Etiqueta ${codigoPalete} enviada para impressão via TCP!`,
          porta: PRINTER_PORT,
        })
      }
    } catch (error) {
      console.log(`⚠️ [API Direct] Porta ${PRINTER_PORT} falhou, tentando ${ALTERNATE_PORT}...`)
    }

    // Se porta 6101 falhou, tentar porta 9100 (alternativa comum)
    try {
      const sucesso = await imprimirViaTCP(zpl, ALTERNATE_PORT)
      if (sucesso) {
        return NextResponse.json({
          success: true,
          message: `Etiqueta ${codigoPalete} enviada para impressão via TCP!`,
          porta: ALTERNATE_PORT,
        })
      }
    } catch (error) {
      console.log(`⚠️ [API Direct] Porta ${ALTERNATE_PORT} também falhou`)
    }

    // Se ambas as portas falharam, retornar erro
    return NextResponse.json(
      {
        success: false,
        message: `Não foi possível conectar à impressora em ${PRINTER_IP} nas portas ${PRINTER_PORT} ou ${ALTERNATE_PORT}. Verifique se a impressora está ligada e acessível na rede.`,
      },
      { status: 500 }
    )
  } catch (error) {
    console.error('❌ [API Direct] Erro:', error)
    return NextResponse.json(
      {
        success: false,
        message: `Erro ao processar impressão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      },
      { status: 500 }
    )
  }
}

