import React from 'react'
import { Button } from '@/components/ui/button'
import { Volume2, VolumeX, Loader2 } from 'lucide-react'
import { useAudioPermission } from '@/hooks/use-audio-permission'

interface AudioPermissionButtonProps {
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  showText?: boolean
}

export const AudioPermissionButton: React.FC<AudioPermissionButtonProps> = ({
  className = '',
  variant = 'outline',
  size = 'sm',
  showText = true
}) => {
  const {
    isGranted,
    isRequested,
    isLoading,
    error,
    requestPermission,
    revokePermission
  } = useAudioPermission()

  const handleClick = async () => {
    if (isGranted) {
      revokePermission()
    } else {
      await requestPermission()
    }
  }

  const getButtonText = () => {
    if (isLoading) return 'Solicitando...'
    if (isGranted) return 'Desabilitar Som'
    if (isRequested && !isGranted) return 'Habilitar Som'
    return 'Permitir Notificações Sonoras'
  }

  const getIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />
    if (isGranted) return <Volume2 className="h-4 w-4" />
    return <VolumeX className="h-4 w-4" />
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className}`}
      title={error || getButtonText()}
    >
      {getIcon()}
      {showText && <span>{getButtonText()}</span>}
    </Button>
  )
}

export default AudioPermissionButton
