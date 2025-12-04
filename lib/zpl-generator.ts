// Função para gerar código ZPL (Zebra Programming Language) para etiqueta
// Pode ser usada tanto no servidor quanto no cliente

export interface DadosEtiqueta {
  quantidadeNFs?: number
  totalVolumes?: number
  destino?: string
  posicoes?: number | null
  quantidadePaletes?: number | null
  codigoCarga?: string
  idWMS?: string
}

export function gerarZPL(codigoPalete: string, dados?: DadosEtiqueta): string {
  // ZPL para etiqueta de palete
  // Configurações: Largura 100mm x Altura 75mm (4x3" - 10x7.5cm)
  // Margens: Superior/Inferior 0,5mm, Esquerda/Direita 1mm
  // Texto e QR code centralizados
  
  const larguraMM = 100
  const alturaMM = 75
  const dotsPorMM = 8 // 203 dpi ~ 8 dots/mm

  const larguraDots = Math.round(larguraMM * dotsPorMM) // 800
  const alturaDots = Math.round(alturaMM * dotsPorMM)  // 600

  const margemSuperior = 40   // distância do topo em dots
  const larguraUtil = larguraDots // vamos centralizar usando a largura toda

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

