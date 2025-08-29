"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QrCode, AlertTriangle, CheckCircle } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (code: string) => void
  onError: (error: string) => void
}

export default function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<any | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)

  // Memoizar configurações de câmera para evitar recriação
  const cameraConstraints = useMemo(() => ({
    back: {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    } as MediaStreamConstraints,
    front: {
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    } as MediaStreamConstraints
  }), [])

  // Memoizar dicas de decodificação
  const decodeHints = useMemo(() => {
    const hints = new Map()
    hints.set('TRY_HARDER', true)
    hints.set('POSSIBLE_FORMATS', ['QR_CODE'])
    return hints
  }, [])

  // Função otimizada para parar scanner
  const stopScanner = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop()
        controlsRef.current = null
      } catch (error) {
        console.warn('Erro ao parar scanner:', error)
      }
    }
    setIsScanning(false)
  }, [])

  // Função otimizada para iniciar scanner
  const startScanner = useCallback(async () => {
    setError(null)
    setIsScanning(true)

    try {
      const ZXing = await import("@zxing/library")
      const { BrowserQRCodeReader, NotFoundException, DecodeHintType, BarcodeFormat } = ZXing

      const hints = new Map()
      hints.set(DecodeHintType.TRY_HARDER, true)
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE])

      const reader = new BrowserQRCodeReader(hints as any)
      const video = videoRef.current!

      if (!video) {
        throw new Error('Elemento de vídeo não encontrado')
      }

      // Callback otimizado para decodificação
      const handleDecode = useCallback((result: any, err: any, controls: any) => {
        if (result) {
          const text = result.getText()
          if (text && text !== lastScan) {
            setLastScan(text)
            onScan(text)
            controls.stop()
            setIsScanning(false)
          }
        }
        if (err && !(err instanceof NotFoundException)) {
          // Erros diferentes de "não encontrado" (normal quando não há QR no quadro)
          // console.debug(err)
        }
      }, [lastScan, onScan])

      // Tenta câmera traseira primeiro
      try {
        controlsRef.current = await (reader as any).decodeFromConstraints(
          cameraConstraints.back, 
          video, 
          handleDecode
        )
      } catch (e) {
        // Fallback: tenta câmera frontal
        controlsRef.current = await (reader as any).decodeFromConstraints(
          cameraConstraints.front, 
          video, 
          handleDecode
        )
      }
    } catch (error) {
      console.error('Erro ao iniciar scanner:', error)
      setError('Erro ao acessar a câmera. Verifique as permissões.')
      onError('Erro ao acessar a câmera. Verifique as permissões.')
      setIsScanning(false)
    }
  }, [cameraConstraints, lastScan, onScan, onError])

  useEffect(() => {
    startScanner()
    return () => stopScanner()
  }, [startScanner, stopScanner])

  // Reativar scanner automaticamente após leitura
  useEffect(() => {
    if (lastScan && !isScanning) {
      // Aguardar um pouco antes de reativar para dar tempo da confirmação
      const timer = setTimeout(() => {
        setLastScan(null) // Limpar o último scan
        startScanner() // Reativar o scanner
      }, 1500) // 1.5 segundos de delay

      return () => clearTimeout(timer)
    }
  }, [lastScan, isScanning, startScanner])

  // Status acessível para leitores de tela
  const scannerStatus = useMemo(() => {
    if (error) return 'Scanner com erro'
    if (isScanning) return 'Scanner ativo, aguardando código'
    if (lastScan) return `Código escaneado: ${lastScan}`
    return 'Scanner inativo'
  }, [error, isScanning, lastScan])

  return (
    <Card className="border-blue-200" role="region" aria-label="Scanner de código de barras">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Status do scanner */}
          <div 
            className="flex items-center space-x-2 text-sm font-medium"
            role="status"
            aria-live="polite"
            aria-label={scannerStatus}
          >
            {error ? (
              <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />
            ) : isScanning ? (
              <QrCode className="h-4 w-4 text-blue-600" aria-hidden="true" />
            ) : lastScan ? (
              <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
            ) : (
              <QrCode className="h-4 w-4 text-gray-400" aria-hidden="true" />
            )}
            <span>
              {error ? 'Erro no Scanner' : isScanning ? 'Scanner Ativo' : lastScan ? 'Código Escaneado' : 'Scanner Inativo'}
            </span>
          </div>

          {/* Área de vídeo */}
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-64 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300"
              playsInline
              muted
              aria-label="Visualização da câmera para escaneamento de código"
              role="img"
            />
            
            {/* Overlay de instruções */}
            {isScanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
                <div className="text-center text-white bg-black bg-opacity-50 px-4 py-2 rounded">
                  <QrCode className="h-8 w-8 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm font-medium">Posicione o código QR na área</p>
                  <p className="text-xs opacity-75">A câmera escaneará automaticamente</p>
                </div>
              </div>
            )}

            {/* Indicador de erro */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Alert className="max-w-sm">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Indicador de sucesso */}
            {lastScan && !isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white bg-green-600 bg-opacity-90 px-4 py-2 rounded">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm font-medium">Código Escaneado!</p>
                  <p className="text-xs opacity-75">Reativando scanner...</p>
                </div>
              </div>
            )}
          </div>

          {/* Informações de acessibilidade */}
          <div className="text-xs text-gray-600 space-y-1" role="complementary">
            <p>
              <span className="sr-only">Instruções de uso: </span>
              Posicione o código QR na área da câmera para escaneamento automático.
            </p>
            {isScanning && (
              <p aria-live="polite">
                <span className="sr-only">Status atual: </span>
                Scanner ativo, aguardando código...
              </p>
            )}
            {lastScan && (
              <p aria-live="polite">
                <span className="sr-only">Último código escaneado: </span>
                Código: {lastScan}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
