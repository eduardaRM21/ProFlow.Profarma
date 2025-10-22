/**
 * Hook para gerenciar permissões de áudio do usuário
 * 
 * Este hook implementa o padrão de solicitação de permissão de áudio
 * exigido pelos navegadores modernos para reprodução automática
 */

import { useState, useCallback, useEffect } from 'react'

interface AudioPermissionState {
  isGranted: boolean
  isRequested: boolean
  isLoading: boolean
  error: string | null
}

export const useAudioPermission = () => {
  const [state, setState] = useState<AudioPermissionState>({
    isGranted: false,
    isRequested: false,
    isLoading: false,
    error: null
  })

  // Verificar permissão salva no localStorage
  useEffect(() => {
    // Verificar se estamos no lado do cliente
    if (typeof window === 'undefined') return
    
    const permissaoSalva = localStorage.getItem('audio_permission_granted')
    if (permissaoSalva === 'true') {
      setState(prev => ({
        ...prev,
        isGranted: true,
        isRequested: true
      }))
    } else if (permissaoSalva === 'false') {
      setState(prev => ({
        ...prev,
        isGranted: false,
        isRequested: true
      }))
    }
  }, [])

  // Solicitar permissão de áudio
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Criar um áudio de teste silencioso
      const audio = new Audio()
      audio.volume = 0.01 // Volume muito baixo
      audio.preload = 'auto'
      
      // Tentar reproduzir para ativar a permissão
      await audio.play()
      audio.pause()
      audio.currentTime = 0
      
      // Salvar permissão
      if (typeof window !== 'undefined') {
        localStorage.setItem('audio_permission_granted', 'true')
      }
      
      setState({
        isGranted: true,
        isRequested: true,
        isLoading: false,
        error: null
      })
      
      console.log('✅ Permissão de áudio concedida')
      return true
      
    } catch (error: any) {
      console.warn('⚠️ Permissão de áudio negada:', error)
      
      // Salvar negação
      if (typeof window !== 'undefined') {
        localStorage.setItem('audio_permission_granted', 'false')
      }
      
      setState({
        isGranted: false,
        isRequested: true,
        isLoading: false,
        error: error.message || 'Permissão de áudio negada'
      })
      
      return false
    }
  }, [])

  // Revogar permissão
  const revokePermission = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('audio_permission_granted', 'false')
    }
    setState({
      isGranted: false,
      isRequested: true,
      isLoading: false,
      error: null
    })
    console.log('🔇 Permissão de áudio revogada')
  }, [])

  // Reproduzir áudio com verificação de permissão
  const playAudio = useCallback(async (audioSrc: string, volume: number = 0.7): Promise<boolean> => {
    if (!state.isGranted) {
      console.log('🔇 Áudio bloqueado - permissão não concedida')
      return false
    }

    try {
      const audio = new Audio(audioSrc)
      audio.volume = volume
      audio.preload = 'auto'
      
      await audio.play()
      console.log('🔊 Áudio reproduzido com sucesso')
      return true
      
    } catch (error: any) {
      console.warn('⚠️ Erro ao reproduzir áudio:', error)
      
      // Se for erro de permissão, revogar automaticamente
      if (error.name === 'NotAllowedError') {
        revokePermission()
      }
      
      return false
    }
  }, [state.isGranted, revokePermission])

  // Verificar se pode reproduzir áudio
  const canPlayAudio = useCallback((): boolean => {
    return state.isGranted
  }, [state.isGranted])

  return {
    // Estado
    isGranted: state.isGranted,
    isRequested: state.isRequested,
    isLoading: state.isLoading,
    error: state.error,
    
    // Funções
    requestPermission,
    revokePermission,
    playAudio,
    canPlayAudio
  }
}
