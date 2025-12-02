import { NextResponse } from 'next/server'
import * as net from 'net'

// Configurações da impressora
const PRINTER_IP = '10.27.30.75'
const PRINTER_PORT = 6101
const ALTERNATE_PORT = 9100

// Interface para dados adicionais da etiqueta
interface DadosEtiqueta {
  quantidadeNFs?: number
  totalVolumes?: number
  destino?: string
  posicoes?: number | null
  quantidadePaletes?: number | null
  codigoCarga?: string
  idWMS?: string
}

// Função para gerar código ZPL (Zebra Programming Language) para etiqueta
function gerarZPL(codigoPalete: string, dados?: DadosEtiqueta): string {
  // ZPL para etiqueta de palete
  // Configurações: Largura 100mm x Altura 75mm (4x3" - 10x7.5cm)
  // Margens: Superior/Inferior 0,5mm, Esquerda/Direita 1mm
  // Texto e QR code centralizados
  
  // Conversão para dots (203 dpi: 1mm = 8 dots exatos)
  // const larguraMM = 100
  // const alturaMM = 75
  // const margemEsquerdaMM = 2
  // const margemSuperiorMM = 2
  
  const larguraMM = 100
  const alturaMM = 75
  const dotsPorMM = 8 // 203 dpi ~ 8 dots/mm



  // Conversão precisa: 203 DPI = 7.992 dots/mm (usar 8 para simplificar)
  // Para Zebra ZT411: usar valores em dots
  // const larguraDots = Math.round(larguraMM * 8) // 800 dots (100mm)
  // const alturaDots = Math.round(alturaMM * 8) // 600 dots (75mm)
  
  const larguraDots = Math.round(larguraMM * dotsPorMM) // 800
  const alturaDots = Math.round(alturaMM * dotsPorMM)  // 600


  const margemSuperior = 40   // distância do topo em dots
  const larguraUtil = larguraDots // vamos centralizar usando a largura toda



  // // Posições em dots (203 dpi)
  // const margemEsquerda = Math.round(margemEsquerdaMM * 8) // 16 dots
  // const margemSuperior = Math.round(margemSuperiorMM * 8) // 16 dots
  // const centroHorizontal = Math.round(larguraDots / 2) // 400 dots (centro)
  // const larguraDisponivel = larguraDots - (margemEsquerda * 2) // 768 dots (largura útil)
  
  // Posições verticais (em dots) - otimizadas para caber em 75mm
  // Total disponível: 600 dots (75mm * 8)
  // const yTextoLabel = margemSuperior + 15 // ~31 dots
  // const yQRCode = margemSuperior + 50 // ~66 dots
  // const tamanhoQRCode = 200 // tamanho do QR code em dots (aumentado para impressão)
  // const yCodigoPalete = margemSuperior + 50 + tamanhoQRCode + 15 // abaixo do QR code (~281 dots)
  // const yCodigoCargaWMS = margemSuperior + 50 + tamanhoQRCode + 40 // código carga + WMS (~306 dots)
  // const yInfoLinha1 = margemSuperior + 50 + tamanhoQRCode + 60 // informações extras linha 1 (~326 dots)
  // const yInfoLinha2 = margemSuperior + 50 + tamanhoQRCode + 80 // informações extras linha 2 (~346 dots)




  const yTitulo       = margemSuperior
  const yQRCode       = margemSuperior + 60
  const yCodigoPalete = yQRCode + 260 + 20        // 260 ≈ tamanho do QR
  const yCodigoCarga  = yCodigoPalete + 40
  const yInfoLinha1   = yCodigoCarga + 35
  const yInfoLinha2   = yInfoLinha1 + 35
  
// Tamanho aproximado do QR
const qrModulo = 10              // ^BQN ...,10
const qrModulosPorLado = 26      // padrão do QR model 2
const qrTamanhoDots = qrModulo * qrModulosPorLado // 260
const xQRCode = Math.round((larguraDots - qrTamanhoDots) / 2)

// Montar textos
const codigoCargaWMS =
  dados && (dados.codigoCarga || dados.idWMS)
    ? `${dados.codigoCarga || ''}${
        dados.codigoCarga && dados.idWMS ? ' - ' : ''
      }${dados.idWMS || ''}`
    : ''

const infoLinha1 = dados
  ? `NFs: ${dados.quantidadeNFs || 0} | Vol: ${
      dados.totalVolumes || 0
    } | Dest: ${(dados.destino || '').substring(0, 10)}`
  : ''

const infoLinha2 =
  dados && (dados.posicoes || dados.quantidadePaletes)
    ? `Pos: ${dados.posicoes ? `${dados.posicoes}` : ''}${
        dados.posicoes && dados.quantidadePaletes ? ' | ' : ''
      }${dados.quantidadePaletes ? `Pal: ${dados.quantidadePaletes}` : ''}`
    : ''

let zpl = `^XA
^PW${larguraDots}
^LL${alturaDots}
^MNy
^PR6

^CF0,60
^FO0,${yTitulo}^FB${larguraUtil},1,0,C^FDCODIGO PALETE^FS

^FO${xQRCode},${yQRCode}^BQN,2,${qrModulo}^FDLA,${codigoPalete}^FS

^CF0,30
^FO0,${yCodigoPalete}^FB${larguraUtil},1,0,C^FD${codigoPalete}^FS`

if (codigoCargaWMS) {
  zpl += `
^CF0,38
^FO0,${yCodigoCarga}^FB${larguraUtil},1,0,C^FD${codigoCargaWMS}^FS`

}


if (infoLinha1) {
  zpl += `
^CF0,32
^FO0,${yInfoLinha1}^FB${larguraUtil},1,0,C^FD${infoLinha1}^FS`
}

if (infoLinha2) {
  zpl += `
^CF0,32
^FO0,${yInfoLinha2}^FB${larguraUtil},1,0,C^FD${infoLinha2}^FS`
}

zpl += `
^XZ`

return zpl
}




//   // Preparar código carga + WMS
//   const codigoCargaWMS = dados && (dados.codigoCarga || dados.idWMS)
//     ? `${dados.codigoCarga || ''}${dados.codigoCarga && dados.idWMS ? ' - ' : ''}${dados.idWMS || ''}`
//     : ''
  
//   // Preparar informações extras (textos reduzidos para caber no papel menor)
//   const infoLinha1 = dados 
//     ? `NFs: ${dados.quantidadeNFs || 0} | Vol: ${dados.totalVolumes || 0} | Dest: ${(dados.destino || '').substring(0, 8)}`
//     : ''
//   const infoLinha2 = dados && (dados.posicoes || dados.quantidadePaletes)
//     ? `Pos: ${dados.posicoes ? `1-${dados.posicoes}` : ''}${dados.posicoes && dados.quantidadePaletes ? ' | ' : ''}${dados.quantidadePaletes ? `Pal: ${dados.quantidadePaletes}` : ''}`
//     : ''
  
//   // Gerar ZPL com QR code (^BQ = QR code em ZPL)
//   // Para Zebra ZT411: usar comandos específicos
//   // ^MN = media tracking, ^PR = print rate, ^PW = label width, ^LL = label length
//   // Sintaxe: ^BQN,modelo,tamanho^FDLA,dados^FS
//   // modelo: 2 (correção de erros), tamanho: 10 (módulo padrão para boa legibilidade)
//   // Para centralizar: usar margem esquerda como origem e largura total para ^FB
//   const origemX = margemEsquerda // Começar da margem esquerda
  
//   let zpl = `^XA
// ^MNy
// ^PR6
// ^PW${larguraDots}
// ^LL${alturaDots}
// ^CF0,30
// ^FO${origemX},${yTextoLabel}^FB${larguraDisponivel},1,0,C^FDCODIGO PALETE^FS
// ^FO${centroHorizontal},${yQRCode}^BQN,2,10^FDLA,${codigoPalete}^FS
// ^CF0,24
// ^FO${origemX},${yCodigoPalete}^FB${larguraDisponivel},1,0,C^FD${codigoPalete}^FS`
  
//   // Adicionar código da carga e ID WMS se disponíveis
//   if (codigoCargaWMS) {
//     zpl += `
// ^CF0,20
// ^FO${origemX},${yCodigoCargaWMS}^FB${larguraDisponivel},1,0,C^FD${codigoCargaWMS}^FS`
//   }
  
//   // Adicionar informações extras se disponíveis
//   if (infoLinha1) {
//     zpl += `
// ^CF0,18
// ^FO${origemX},${yInfoLinha1}^FB${larguraDisponivel},1,0,C^FD${infoLinha1}^FS`
//   }
//   if (infoLinha2) {
//     zpl += `
// ^CF0,18
// ^FO${origemX},${yInfoLinha2}^FB${larguraDisponivel},1,0,C^FD${infoLinha2}^FS`
//   }
  
//   zpl += `
// ^XZ`
//   return zpl
// }

// // Função alternativa para gerar EPL (Eltron Programming Language) caso a impressora não suporte ZPL
// function gerarEPL(codigoPalete: string, dados?: DadosEtiqueta): string {
//   // EPL para etiqueta de palete
//   // Configurações: Largura 100mm x Altura 75mm (4x3" - 10x7.5cm)
//   // Margens: Superior/Inferior 0,5mm, Esquerda/Direita 1mm
//   // Texto e QR code centralizados
  
//   // EPL usa pontos (203 dpi: 1mm ≈ 8 pontos)
//   const larguraMM = 100
//   const alturaMM = 75
//   const margemEsquerdaMM = 1
//   const margemSuperiorMM = 0.5
  
//   // Posições em pontos
//   const margemEsquerda = Math.round(margemEsquerdaMM * 8) // 8 pontos
//   const margemSuperior = Math.round(margemSuperiorMM * 8) // 4 pontos
//   const centroHorizontal = Math.round((larguraMM / 2) * 8) // 400 pontos (centro)
  
//   // Posições verticais - otimizadas para caber em 75mm
//   const yTextoLabel = margemSuperior + 5 // ~9 pontos
//   const yQRCode = margemSuperior + 25 // ~29 pontos
//   const tamanhoQRCode = 140 // tamanho do QR code em pontos (reduzido para caber melhor)
//   const yCodigoPalete = margemSuperior + 25 + tamanhoQRCode + 8 // abaixo do QR code (~177 pontos)
//   const yCodigoCargaWMS = margemSuperior + 25 + tamanhoQRCode + 22 // código carga + WMS (~191 pontos)
//   const yInfoLinha1 = margemSuperior + 25 + tamanhoQRCode + 36 // informações extras linha 1 (~205 pontos)
//   const yInfoLinha2 = margemSuperior + 25 + tamanhoQRCode + 48 // informações extras linha 2 (~217 pontos)
  
//   // Preparar código carga + WMS
//   const codigoCargaWMS = dados && (dados.codigoCarga || dados.idWMS)
//     ? `${dados.codigoCarga || ''}${dados.codigoCarga && dados.idWMS ? ' - ' : ''}${dados.idWMS || ''}`
//     : ''
  
//   // Preparar informações extras (textos reduzidos para caber no papel menor)
//   const infoLinha1 = dados 
//     ? `NFs: ${dados.quantidadeNFs || 0} | Vol: ${dados.totalVolumes || 0} | Dest: ${(dados.destino || '').substring(0, 8)}`
//     : ''
//   const infoLinha2 = dados && (dados.posicoes || dados.quantidadePaletes)
//     ? `Pos: ${dados.posicoes ? `1-${dados.posicoes}` : ''}${dados.posicoes && dados.quantidadePaletes ? ' | ' : ''}${dados.quantidadePaletes ? `Pal: ${dados.quantidadePaletes}` : ''}`
//     : ''
  
//   // EPL: A = texto, b = QR code
//   // Sintaxe: bX,Y,Q,modelo,tamanho,N,7,"dados"
//   // Para centralizar em EPL, usamos o centro
//   let epl = `N
// A${centroHorizontal},${yTextoLabel},0,2,1,1,C,"CODIGO PALETE"
// b${centroHorizontal},${yQRCode},Q,2,${Math.round(tamanhoQRCode / 10)},M,7,"${codigoPalete}"
// A${centroHorizontal},${yCodigoPalete},0,3,1,1,C,"${codigoPalete}"`
  
//   // Adicionar código da carga e ID WMS se disponíveis
//   if (codigoCargaWMS) {
//     epl += `
// A${centroHorizontal},${yCodigoCargaWMS},0,2,1,1,C,"${codigoCargaWMS}"`
//   }
  
//   // Adicionar informações extras se disponíveis
//   if (infoLinha1) {
//     epl += `
// A${centroHorizontal},${yInfoLinha1},0,1,1,1,C,"${infoLinha1}"`
//   }
//   if (infoLinha2) {
//     epl += `
// A${centroHorizontal},${yInfoLinha2},0,1,1,1,C,"${infoLinha2}"`
//   }
  
//   epl += `
// P1`
//   return epl
// }

// Função para verificar conectividade básica (ping via TCP)
async function verificarConectividade(ip: string, porta: number, timeout: number = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let conectado = false

    socket.setTimeout(timeout)

    socket.on('connect', () => {
      conectado = true
      socket.destroy()
      resolve(true)
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })

    socket.on('error', () => {
      socket.destroy()
      resolve(false)
    })

    try {
      socket.connect(porta, ip)
    } catch {
      resolve(false)
    }
  })
}

// Função para conectar e imprimir via TCP/IP
async function imprimirViaTCP(zpl: string, porta: number = PRINTER_PORT): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    let connected = false
    let dadosEnviados = false

    socket.setTimeout(8000) // Timeout de 8 segundos

    socket.on('connect', () => {
      connected = true
      console.log(`✅ Conectado à impressora ${PRINTER_IP}:${porta}`)
      
      // Adicionar quebra de linha no final do ZPL se necessário
      const zplCompleto = zpl.endsWith('\n') ? zpl : zpl + '\n'
      
      socket.write(zplCompleto, 'utf8', (err) => {
        if (err) {
          console.error('❌ Erro ao escrever dados:', err)
          socket.destroy()
          reject(err)
        } else {
          dadosEnviados = true
          console.log('📤 Dados enviados para impressora')
          // Aguardar um pouco antes de fechar para garantir que os dados foram processados
          setTimeout(() => {
            socket.end()
          }, 300)
        }
      })
    })

    socket.on('close', () => {
      if (connected && dadosEnviados) {
        console.log('✅ Conexão fechada após envio bem-sucedido')
        resolve(true)
      } else if (!connected) {
        console.log('⚠️ Conexão fechada sem ter sido estabelecida')
        reject(new Error('Conexão fechada antes de ser estabelecida'))
      } else {
        console.log('⚠️ Conexão fechada antes de enviar dados')
        reject(new Error('Conexão fechada antes de enviar dados'))
      }
    })

    socket.on('error', (err: any) => {
      console.error('❌ Erro no socket:', err)
      const erroMsg = err.code === 'ECONNREFUSED' 
        ? `Conexão recusada - verifique se a impressora está ligada e acessível em ${PRINTER_IP}:${porta}`
        : err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND'
        ? `Timeout ou host não encontrado - verifique o IP ${PRINTER_IP} e a conectividade de rede`
        : err.message || 'Erro desconhecido na conexão'
      socket.destroy()
      reject(new Error(erroMsg))
    })

    socket.on('timeout', () => {
      console.error('⏱️ Timeout ao conectar com a impressora')
      socket.destroy()
      reject(new Error(`Timeout ao conectar com a impressora ${PRINTER_IP}:${porta}. Verifique se a impressora está ligada e acessível na rede.`))
    })

    console.log(`🔌 Tentando conectar em ${PRINTER_IP}:${porta}...`)
    try {
      socket.connect(porta, PRINTER_IP)
    } catch (err) {
      reject(new Error(`Erro ao iniciar conexão: ${err instanceof Error ? err.message : 'Erro desconhecido'}`))
    }
  })
}

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
      printerServiceUrl
    } = body

    console.log('📦 Recebida solicitação de impressão para palete:', codigoPalete)
    console.log('📋 Dados adicionais:', { quantidadeNFs, totalVolumes, destino, posicoes, quantidadePaletes })
    console.log('🔧 Serviço intermediário:', printerServiceUrl || 'não configurado')

    if (!codigoPalete) {
      console.error('❌ Código do palete não fornecido')
      return NextResponse.json(
        { success: false, message: 'Código do palete é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se está rodando no Vercel (produção)
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined
    const isProduction = process.env.NODE_ENV === 'production'
    
    // Se houver serviço intermediário configurado, usar como proxy
    if (printerServiceUrl) {
      console.log(`🔄 Usando serviço intermediário como proxy: ${printerServiceUrl}`)
      try {
        // Limpar URL do serviço intermediário
        let baseUrl = printerServiceUrl.replace(/\/api\/print\/?$/, '').replace(/\/print\/?$/, '').replace(/\/$/, '')
        const serviceUrl = `${baseUrl}/print`
        
        console.log(`📡 Fazendo requisição para: ${serviceUrl}`)
        const response = await fetch(serviceUrl, {
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
        console.log('📦 Resposta do serviço intermediário:', data)

        if (response.ok && data.success) {
          return NextResponse.json(data)
        } else {
          return NextResponse.json(
            { success: false, message: data.message || 'Erro no serviço intermediário' },
            { status: response.status || 500 }
          )
        }
      } catch (error) {
        console.error('❌ Erro ao chamar serviço intermediário:', error)
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        
        // Se estiver no Vercel e o serviço intermediário falhar, não tentar impressão direta
        if (isVercel || isProduction) {
          return NextResponse.json(
            {
              success: false,
              message: `Não foi possível conectar ao serviço intermediário de impressão (${printerServiceUrl}).

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
        console.log('🔄 Tentando impressão direta como fallback...')
      }
    }

    // Verificar conectividade básica primeiro
    console.log('🔍 Verificando conectividade com a impressora...')
    const conectividade6101 = await verificarConectividade(PRINTER_IP, PRINTER_PORT, 3000)
    const conectividade9100 = await verificarConectividade(PRINTER_IP, ALTERNATE_PORT, 3000)
    
    console.log(`📡 Conectividade porta ${PRINTER_PORT}: ${conectividade6101 ? '✅ OK' : '❌ FALHOU'}`)
    console.log(`📡 Conectividade porta ${ALTERNATE_PORT}: ${conectividade9100 ? '✅ OK' : '❌ FALHOU'}`)
    
    if (!conectividade6101 && !conectividade9100) {
      let mensagemErro = ''
      
      if (isVercel || isProduction) {
        // Mensagem específica para produção/Vercel
        mensagemErro = `Não foi possível conectar à impressora ${PRINTER_IP} a partir do servidor Vercel.

⚠️ O Vercel não tem acesso à rede local da impressora.

🔧 SOLUÇÃO OBRIGATÓRIA: Configure o serviço intermediário de impressão.

1. Em uma máquina que tenha acesso à rede local da impressora (${PRINTER_IP}), execute:
   node scripts/printer-service.js
   
2. Torne o serviço acessível publicamente usando um túnel:
   - Opção A: ngrok (https://ngrok.com)
     ngrok http 3001
   - Opção B: Cloudflare Tunnel (gratuito)
   - Opção C: Outro serviço de túnel reverso
   
3. Configure a variável de ambiente no Vercel:
   - Acesse: Vercel Dashboard > Seu Projeto > Settings > Environment Variables
   - Adicione: NEXT_PUBLIC_PRINTER_SERVICE_URL=https://seu-tunel.ngrok.io
   - IMPORTANTE: Use a URL pública do túnel (sem /print no final)
   
4. Faça redeploy da aplicação no Vercel

📋 Verificações:
- O serviço intermediário deve estar rodando na máquina local
- O túnel deve estar ativo e acessível
- A variável NEXT_PUBLIC_PRINTER_SERVICE_URL deve estar configurada no Vercel
- Consulte README-IMPRESSAO.md para mais detalhes`
      } else {
        // Mensagem para desenvolvimento local
        mensagemErro = `Não foi possível conectar à impressora ${PRINTER_IP} a partir do servidor Next.js.

🔧 SOLUÇÃO: Use o serviço intermediário de impressão.

1. Em uma máquina que tenha acesso à rede local da impressora, execute:
   npm run printer-service
   (ou: node scripts/printer-service.js)

2. Configure a variável de ambiente no arquivo .env.local:
   NEXT_PUBLIC_PRINTER_SERVICE_URL=http://IP_DA_MAQUINA:3001

3. O serviço intermediário ficará escutando na porta 3001 e fará a impressão.

📋 Verificações adicionais:
- Se a impressora está ligada e conectada à rede
- Se o IP está correto: ${PRINTER_IP}
- Teste manualmente: telnet ${PRINTER_IP} ${PRINTER_PORT} ou telnet ${PRINTER_IP} ${ALTERNATE_PORT}
- Consulte README-IMPRESSAO.md para mais detalhes`
      }
      
      console.error('❌', mensagemErro)
      return NextResponse.json(
        {
          success: false,
          message: mensagemErro
        },
        { status: 500 }
      )
    }

    // Gerar ZPL
    const zpl = gerarZPL(codigoPalete, {
      quantidadeNFs: quantidadeNFs || 0,
      totalVolumes: totalVolumes || 0,
      destino: destino || '',
      posicoes: posicoes || null,
      quantidadePaletes: quantidadePaletes || null,
      codigoCarga: codigoCarga || undefined,
      idWMS: idWMS || undefined
    })
    console.log('📄 ZPL gerado:', zpl)

    // Tentar imprimir na porta principal com ZPL
    let impressaoSucesso = false
    let erro: Error | null = null
    let erroDetalhado: string = ''

    // Tentar ZPL primeiro
    try {
      console.log(`🔌 Tentando conectar na porta ${PRINTER_PORT} com ZPL...`)
      impressaoSucesso = await imprimirViaTCP(zpl, PRINTER_PORT)
      console.log('✅ Impressão bem-sucedida na porta principal com ZPL')
    } catch (err) {
      erro = err as Error
      erroDetalhado = `Porta ${PRINTER_PORT} (ZPL): ${erro.message}`
      console.error(`❌ Erro na porta ${PRINTER_PORT} com ZPL:`, err)
      
      // Tentar porta alternativa com ZPL
      try {
        console.log(`🔄 Tentando porta alternativa ${ALTERNATE_PORT} com ZPL...`)
        impressaoSucesso = await imprimirViaTCP(zpl, ALTERNATE_PORT)
        console.log('✅ Impressão bem-sucedida na porta alternativa com ZPL')
      } catch (err2) {
        erro = err2 as Error
        erroDetalhado += ` | Porta ${ALTERNATE_PORT} (ZPL): ${erro.message}`
        console.error(`❌ Erro na porta alternativa ${ALTERNATE_PORT} com ZPL:`, err2)
      }
    }

    if (impressaoSucesso) {
      console.log(`✅ Etiqueta do palete ${codigoPalete} impressa com sucesso`)
      return NextResponse.json({
        success: true,
        message: `Etiqueta do palete ${codigoPalete} impressa com sucesso`
      })
    } else {
      console.error(`❌ Falha ao imprimir etiqueta: ${erroDetalhado}`)
      return NextResponse.json(
        {
          success: false,
          message: `Erro ao imprimir etiqueta: ${erroDetalhado || erro?.message || 'Erro desconhecido'}`
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ Erro na API de impressão:', error)
    return NextResponse.json(
      {
        success: false,
        message: `Erro ao processar impressão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      },
      { status: 500 }
    )
  }
}

