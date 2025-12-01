import { NextResponse } from 'next/server'
import * as net from 'net'

// Configurações da impressora
const PRINTER_IP = '10.27.30.75'
const PRINTER_PORT = 6101
const ALTERNATE_PORT = 9100

// Função para verificar conectividade
async function verificarConectividade(ip: string, porta: number, timeout: number = 3000): Promise<{ conectado: boolean; erro?: string }> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let conectado = false
    let erroDetalhado: string | undefined

    socket.setTimeout(timeout)

    socket.on('connect', () => {
      conectado = true
      socket.destroy()
      resolve({ conectado: true })
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve({ conectado: false, erro: 'Timeout' })
    })

    socket.on('error', (err: any) => {
      socket.destroy()
      erroDetalhado = err.code || err.message
      resolve({ conectado: false, erro: erroDetalhado })
    })

    try {
      socket.connect(porta, ip)
    } catch (err: any) {
      resolve({ conectado: false, erro: err.message || 'Erro ao iniciar conexão' })
    }
  })
}

export async function GET() {
  try {
    console.log('🔍 Testando conectividade com a impressora...')
    
    const resultado6101 = await verificarConectividade(PRINTER_IP, PRINTER_PORT, 5000)
    const resultado9100 = await verificarConectividade(PRINTER_IP, ALTERNATE_PORT, 5000)

    const resultados = {
      impressora: {
        ip: PRINTER_IP,
        portas: {
          [PRINTER_PORT]: {
            conectado: resultado6101.conectado,
            erro: resultado6101.erro || null,
          },
          [ALTERNATE_PORT]: {
            conectado: resultado9100.conectado,
            erro: resultado9100.erro || null,
          },
        },
      },
      recomendacoes: [] as string[],
    }

    if (!resultado6101.conectado && !resultado9100.conectado) {
      resultados.recomendacoes.push(
        '❌ Nenhuma porta está acessível. Verifique:',
        `1. Se a impressora está ligada e conectada à rede`,
        `2. Se o IP está correto: ${PRINTER_IP}`,
        `3. Se o servidor Next.js tem acesso à rede local`,
        `4. Se não há firewall bloqueando as conexões`,
        `5. Teste manualmente: telnet ${PRINTER_IP} ${PRINTER_PORT}`,
        `6. Teste manualmente: telnet ${PRINTER_IP} ${ALTERNATE_PORT}`,
        '',
        '⚠️ IMPORTANTE: Se o servidor Next.js estiver rodando em um ambiente de produção',
        '(como Vercel, Netlify, etc.), ele NÃO terá acesso à rede local.',
        'Nesses casos, você precisa:',
        '- Rodar o servidor em uma máquina local na mesma rede da impressora, OU',
        '- Usar um serviço intermediário (como um servidor Node.js separado) que tenha acesso à rede local'
      )
    } else {
      const portaFuncionando = resultado6101.conectado ? PRINTER_PORT : ALTERNATE_PORT
      resultados.recomendacoes.push(
        `✅ Porta ${portaFuncionando} está acessível!`,
        'A impressão deve funcionar usando esta porta.'
      )
    }

    return NextResponse.json(resultados, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        erro: 'Erro ao testar conectividade',
        mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

