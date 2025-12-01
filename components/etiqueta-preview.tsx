"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"

interface EtiquetaPreviewProps {
  open: boolean
  onClose: () => void
  codigoPalete: string
  dados?: {
    quantidadeNFs?: number
    totalVolumes?: number
    destino?: string
    posicoes?: number | null
    quantidadePaletes?: number | null
    codigoCarga?: string
    idWMS?: string
  }
}

export function EtiquetaPreview({ open, onClose, codigoPalete, dados }: EtiquetaPreviewProps) {
  const [preview, setPreview] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && codigoPalete) {
      carregarPreview()
    }
  }, [open, codigoPalete])

  async function carregarPreview() {
    setLoading(true)
    try {
      const response = await fetch('/api/print/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigoPalete,
          ...dados
        }),
      })

      const result = await response.json()
      if (result.success) {
        setPreview(result.preview)
      }
    } catch (error) {
      console.error('Erro ao carregar preview:', error)
    } finally {
      setLoading(false)
    }
  }

  // Dimensões em pixels para exibição (escala 1:1 aproximada)
  const larguraPx = 378 // 100mm a 96dpi
  const alturaPx = 283 // 75mm a 96dpi

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pré-visualização da Etiqueta</DialogTitle>
          <DialogDescription>
            Visualização aproximada da etiqueta que será impressa (100mm x 75mm)
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader />
            </div>
          ) : preview ? (
            <div 
              className="border-2 border-gray-300 bg-white shadow-lg relative overflow-hidden"
              style={{
                width: `${larguraPx}px`,
                height: `${alturaPx}px`,
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                boxSizing: 'border-box',
              }}
            >
              {/* Título */}
              <div className="text-center font-bold" style={{ fontSize: '18px', lineHeight: '1.2', marginTop: '2px', marginBottom: '4px' }}>
                CÓDIGO PALETE
              </div>

              {/* QR Code */}
              {preview.qrCode && (
                <img 
                  src={preview.qrCode} 
                  alt="QR Code" 
                  style={{ 
                    width: '140px', 
                    height: '140px',
                    marginTop: '2px',
                    marginBottom: '4px',
                    flexShrink: 0
                  }} 
                />
              )}

              {/* Código do Palete */}
              <div className="text-center font-semibold" style={{ fontSize: '14px', lineHeight: '1.2', marginTop: '4px', marginBottom: '2px' }}>
                {preview.codigoPalete}
              </div>

              {/* Código Carga/WMS */}
              {preview.codigoCargaWMS && (
                <div className="text-center" style={{ fontSize: '11px', lineHeight: '1.2', marginTop: '2px', marginBottom: '2px' }}>
                  {preview.codigoCargaWMS}
                </div>
              )}

              {/* Informações Linha 1 */}
              {preview.infoLinha1 && (
                <div className="text-center" style={{ fontSize: '10px', lineHeight: '1.2', marginTop: '4px', marginBottom: '2px' }}>
                  {preview.infoLinha1}
                </div>
              )}

              {/* Informações Linha 2 */}
              {preview.infoLinha2 && (
                <div className="text-center" style={{ fontSize: '10px', lineHeight: '1.2', marginTop: '2px', marginBottom: '2px' }}>
                  {preview.infoLinha2}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Erro ao carregar preview
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

