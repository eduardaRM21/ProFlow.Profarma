import * as React from "react"

// Breakpoint específico para coletores (dispositivos com tela pequena)
const COLETOR_BREAKPOINT = 480

// Detectar se é um coletor baseado em características específicas
export function useIsColetor() {
  const [isColetor, setIsColetor] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const detectarColetor = () => {
      // Verificar se é um dispositivo móvel com tela pequena
      const isSmallScreen = window.innerWidth <= COLETOR_BREAKPOINT
      
      // Verificar se é um dispositivo móvel
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      // Verificar se tem características de coletor (tela pequena + dispositivo móvel)
      const isColetorDevice = isSmallScreen && isMobileDevice
      
      setIsColetor(isColetorDevice)
    }

    detectarColetor()
    
    // Adicionar listener para mudanças de tamanho de tela
    const handleResize = () => {
      detectarColetor()
    }
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return !!isColetor
}

// Hook para obter dimensões específicas para coletores
export function useColetorDimensions() {
  const [dimensions, setDimensions] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    isColetor: false
  })

  React.useEffect(() => {
    const updateDimensions = () => {
      const isColetor = window.innerWidth <= COLETOR_BREAKPOINT
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
        isColetor
      })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    
    return () => {
      window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  return dimensions
}
