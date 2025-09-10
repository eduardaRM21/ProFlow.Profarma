"use client"

import { useEffect } from 'react'

export function useScreenOrientation() {
  useEffect(() => {
    // Função para bloquear rotação da tela
    const lockOrientation = () => {
      if (typeof window !== 'undefined' && 'screen' in window && 'orientation' in window.screen) {
        // Tentar bloquear a orientação para portrait
        if ('lock' in window.screen.orientation) {
          window.screen.orientation.lock('portrait').catch((error) => {
            console.log('Não foi possível bloquear a orientação:', error)
          })
        }
      }
    }

    // Função para detectar mudanças de orientação
    const handleOrientationChange = () => {
      if (typeof window !== 'undefined') {
        // Se a tela estiver em landscape, forçar portrait
        if (window.innerHeight < window.innerWidth) {
          // Tentar bloquear novamente
          lockOrientation()
        }
      }
    }

    // Bloquear orientação inicial
    lockOrientation()

    // Adicionar listener para mudanças de orientação
    if (typeof window !== 'undefined') {
      window.addEventListener('orientationchange', handleOrientationChange)
      window.addEventListener('resize', handleOrientationChange)
    }

    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('orientationchange', handleOrientationChange)
        window.removeEventListener('resize', handleOrientationChange)
      }
    }
  }, [])
}
