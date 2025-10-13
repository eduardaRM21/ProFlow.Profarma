import { NextRequest } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const iconPath = join(process.cwd(), 'public', 'icon-192x192.png')
    const iconBuffer = await readFile(iconPath)
    
    return new Response(iconBuffer as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Erro ao carregar apple-icon:', error)
    return new Response('Ícone não encontrado', { status: 404 })
  }
}