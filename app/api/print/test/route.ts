import { NextResponse } from 'next/server'
import { gerarZPL, type DadosEtiqueta } from '@/lib/zpl-generator'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Rota de teste para debug de impressão
 * GET /api/print/test?codigoPalete=PAL-00056
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const codigoPalete = searchParams.get('codigoPalete') || 'TEST-001'
    
    // Dados de teste
    const dadosEtiqueta: DadosEtiqueta = {
      quantidadeNFs: 5,
      totalVolumes: 10,
      destino: 'TESTE',
      posicoes: 1,
      quantidadePaletes: 1,
      codigoCarga: 'CAR-TEST',
      idWMS: 'WMS-TEST-001'
    }
    
    // Gerar ZPL
    const zpl = gerarZPL(codigoPalete, dadosEtiqueta)
    
    // Criar arquivo de teste
    const tempDir = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    const testFile = path.join(tempDir, `test_${Date.now()}.zpl`)
    fs.writeFileSync(testFile, zpl, 'utf8')
    
    return NextResponse.json({
      success: true,
      codigoPalete,
      zpl,
      zplLength: zpl.length,
      testFile,
      dadosEtiqueta,
      message: `ZPL gerado com sucesso. Arquivo salvo em: ${testFile}`
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
