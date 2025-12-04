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
    } = body

    if (!codigoPalete) {
      return NextResponse.json(
        { success: false, message: 'Código do palete é obrigatório' },
        { status: 400 }
      )
    }

    const zpl = gerarZPL(codigoPalete, {
      quantidadeNFs: quantidadeNFs || 0,
      totalVolumes: totalVolumes || 0,
      destino: destino || '',
      posicoes: posicoes || null,
      quantidadePaletes: quantidadePaletes || null,
      codigoCarga: codigoCarga || undefined,
      idWMS: idWMS || undefined,
    })

    console.log(`🌐 [API Direct] Tentando imprimir via TCP raw: ${PRINTER_IP}`)
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

