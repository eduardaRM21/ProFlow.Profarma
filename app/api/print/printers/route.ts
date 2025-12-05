import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Lista impressoras disponíveis no sistema
 * Funciona apenas quando executado localmente (não no Vercel)
 */
export async function GET() {
  try {
    // Verificar se está rodando no Vercel (produção)
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined
    
    if (isVercel) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Listagem de impressoras não está disponível no Vercel. Use o serviço intermediário ou Zebra Browser Print.',
          printers: []
        },
        { status: 503 }
      )
    }

    // Detectar sistema operacional
    const platform = process.platform
    console.log(`🖨️ Listando impressoras no sistema: ${platform}`)

    let printers: Array<{ name: string; status?: string }> = []

    if (platform === 'win32') {
      // Windows: usar wmic para listar impressoras
      try {
        const { stdout } = await execAsync('wmic printer get name,printerstatus /format:csv')
        const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'))
        
        printers = lines
          .map(line => {
            const parts = line.split(',')
            if (parts.length >= 2) {
              const name = parts[parts.length - 2]?.trim()
              const status = parts[parts.length - 1]?.trim()
              if (name && name !== 'Name') {
                return { name, status: status || 'Desconhecido' }
              }
            }
            return null
          })
          .filter((p): p is { name: string; status?: string } => p !== null)
        
        console.log(`✅ ${printers.length} impressora(s) encontrada(s) no Windows`)
      } catch (error) {
        console.error('❌ Erro ao listar impressoras no Windows:', error)
        // Tentar método alternativo
        try {
          const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name, PrinterStatus | ConvertTo-Json"')
          const printerData = JSON.parse(stdout)
          const printerArray = Array.isArray(printerData) ? printerData : [printerData]
          printers = printerArray
            .filter((p: any) => p.Name)
            .map((p: any) => ({ name: p.Name, status: p.PrinterStatus || 'Desconhecido' }))
          console.log(`✅ ${printers.length} impressora(s) encontrada(s) via PowerShell`)
        } catch (psError) {
          console.error('❌ Erro ao listar impressoras via PowerShell:', psError)
        }
      }
    } else if (platform === 'linux' || platform === 'darwin') {
      // Linux/Mac: usar lpstat ou lpinfo
      try {
        const { stdout } = await execAsync('lpstat -p 2>/dev/null || lpinfo -v 2>/dev/null || echo ""')
        const lines = stdout.split('\n').filter(line => line.trim())
        
        printers = lines
          .map(line => {
            // Extrair nome da impressora de diferentes formatos
            const match = line.match(/printer\s+(\S+)/i) || line.match(/name=(\S+)/i) || line.match(/(\S+)\s+is/i)
            if (match && match[1]) {
              return { name: match[1] }
            }
            return null
          })
          .filter((p): p is { name: string } => p !== null)
        
        console.log(`✅ ${printers.length} impressora(s) encontrada(s) no ${platform}`)
      } catch (error) {
        console.error(`❌ Erro ao listar impressoras no ${platform}:`, error)
      }
    }

    if (printers.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhuma impressora encontrada no sistema',
        printers: []
      })
    }

    return NextResponse.json({
      success: true,
      printers: printers,
      total: printers.length
    })
  } catch (error) {
    console.error('❌ Erro ao listar impressoras:', error)
    return NextResponse.json(
      {
        success: false,
        message: `Erro ao listar impressoras: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        printers: []
      },
      { status: 500 }
    )
  }
}

