"use client"

import { useEffect, useState } from "react"

interface QRCodePreviewProps {
  codigoPalete: string
  size?: number
}

export function QRCodePreview({ codigoPalete, size = 140 }: QRCodePreviewProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        // Tentar usar a API de preview que já gera QR code
        const response = await fetch('/api/print/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            codigoPalete,
          }),
        })

        const result = await response.json()
        if (result.success && result.preview?.qrCode) {
          setQrCodeDataUrl(result.preview.qrCode)
        }
      } catch (error) {
        console.error('Erro ao gerar QR code:', error)
      } finally {
        setLoading(false)
      }
    }

    if (codigoPalete) {
      generateQRCode()
    }
  }, [codigoPalete, size])

  if (loading) {
    return (
      <div 
        className="border-2 border-gray-400 bg-gray-100 flex items-center justify-center mb-2"
        style={{ 
          width: `${size}px`, 
          height: `${size}px`,
        }}
      >
        <div className="text-xs text-gray-500">Carregando...</div>
      </div>
    )
  }

  if (qrCodeDataUrl) {
    return (
      <img 
        src={qrCodeDataUrl} 
        alt={`QR Code ${codigoPalete}`}
        className="mb-2"
        style={{ 
          width: `${size}px`, 
          height: `${size}px`,
          imageRendering: 'pixelated'
        }} 
      />
    )
  }

  return (
    <div 
      className="border-2 border-gray-400 bg-gray-100 flex items-center justify-center mb-2"
      style={{ 
        width: `${size}px`, 
        height: `${size}px`,
        fontSize: '10px',
        color: '#666',
        textAlign: 'center',
        padding: '4px'
      }}
    >
      <div className="text-center">
        <div className="font-mono text-xs">QR Code</div>
        <div className="font-mono text-xs mt-1">{codigoPalete}</div>
      </div>
    </div>
  )
}

