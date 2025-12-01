import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

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

// Função para gerar preview da etiqueta
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
      idWMS
    } = body

    if (!codigoPalete) {
      return NextResponse.json(
        { success: false, message: 'Código do palete é obrigatório' },
        { status: 400 }
      )
    }

    // Preparar dados
    const dados: DadosEtiqueta = {
      quantidadeNFs: quantidadeNFs || 0,
      totalVolumes: totalVolumes || 0,
      destino: destino || '',
      posicoes: posicoes || null,
      quantidadePaletes: quantidadePaletes || null,
      codigoCarga: codigoCarga || undefined,
      idWMS: idWMS || undefined
    }

    // Gerar QR code como imagem base64 (tamanho reduzido para caber melhor)
    const qrCodeDataURL = await QRCode.toDataURL(codigoPalete, {
      width: 140,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    // Preparar código carga + WMS
    const codigoCargaWMS = dados && (dados.codigoCarga || dados.idWMS)
      ? `${dados.codigoCarga || ''}${dados.codigoCarga && dados.idWMS ? ' - ' : ''}${dados.idWMS || ''}`
      : ''

    // Preparar informações extras
    const infoLinha1 = dados 
      ? `NFs: ${dados.quantidadeNFs || 0} | Vol: ${dados.totalVolumes || 0} | Dest: ${(dados.destino || '').substring(0, 8)}`
      : ''
    const infoLinha2 = dados && (dados.posicoes || dados.quantidadePaletes)
      ? `Pos: ${dados.posicoes ? `${dados.posicoes}` : ''}${dados.posicoes && dados.quantidadePaletes ? ' | ' : ''}${dados.quantidadePaletes ? `Pal: ${dados.quantidadePaletes}` : ''}`
      : ''

    return NextResponse.json({
      success: true,
      preview: {
        codigoPalete,
        qrCode: qrCodeDataURL,
        codigoCargaWMS,
        infoLinha1,
        infoLinha2,
        dimensoes: {
          largura: 100, // mm
          altura: 75, // mm
          larguraPx: 378, // pixels (100mm a 96dpi)
          alturaPx: 283 // pixels (75mm a 96dpi)
        }
      }
    })
  } catch (error) {
    console.error('❌ Erro ao gerar preview:', error)
    return NextResponse.json(
      {
        success: false,
        message: `Erro ao gerar preview: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      },
      { status: 500 }
    )
  }
}

