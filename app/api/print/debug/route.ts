import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Rota de debug para verificar arquivos de debug e logs
 * GET /api/print/debug
 */
export async function GET(req: Request) {
  try {
    const tempDir = path.join(process.cwd(), 'temp')
    
    if (!fs.existsSync(tempDir)) {
      return NextResponse.json({
        success: false,
        message: 'Diretório temp não existe',
        files: []
      })
    }
    
    // Listar todos os arquivos de debug
    const files = fs.readdirSync(tempDir)
      .filter(file => file.startsWith('debug_') || file.startsWith('zpl_') || file.startsWith('rawprint_'))
      .map(file => {
        const filePath = path.join(tempDir, file)
        const stats = fs.statSync(filePath)
        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        }
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime()) // Mais recentes primeiro
      .slice(0, 10) // Últimos 10 arquivos
    
    // Ler o conteúdo do arquivo de debug mais recente
    let latestDebugContent = null
    const latestDebugFile = files.find(f => f.name.startsWith('debug_'))
    if (latestDebugFile) {
      try {
        latestDebugContent = fs.readFileSync(latestDebugFile.path, 'utf8')
      } catch (err) {
        latestDebugContent = `Erro ao ler arquivo: ${err instanceof Error ? err.message : String(err)}`
      }
    }
    
    // Ler o conteúdo do arquivo ZPL mais recente
    let latestZPLContent = null
    const latestZPLFile = files.find(f => f.name.startsWith('zpl_'))
    if (latestZPLFile) {
      try {
        latestZPLContent = fs.readFileSync(latestZPLFile.path, 'utf8')
      } catch (err) {
        latestZPLContent = `Erro ao ler arquivo: ${err instanceof Error ? err.message : String(err)}`
      }
    }
    
    return NextResponse.json({
      success: true,
      tempDir,
      files,
      latestDebug: latestDebugContent,
      latestZPL: latestZPLContent,
      message: `Encontrados ${files.length} arquivo(s) de debug`
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

