import React from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  children: React.ReactNode
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  loadingVariant?: "spinner" | "dots" | "shimmer"
}

export function LoadingButton({
  loading = false,
  loadingText = "Carregando...",
  children,
  className,
  disabled,
  variant = "default",
  size = "default",
  loadingVariant = "spinner",
  ...props
}: LoadingButtonProps) {
  const renderLoadingContent = () => {
    switch (loadingVariant) {
      case "dots":
        return (
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )
      case "shimmer":
        return (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-current rounded-full loading-pulse"></div>
            <span>{loadingText}</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingText}</span>
          </div>
        )
    }
  }

  return (
    <Button
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        loading && "btn-loading cursor-not-allowed",
        className
      )}
      disabled={disabled || loading}
      variant={variant}
      size={size}
      {...props}
    >
      {loading ? renderLoadingContent() : children}
      
      {/* Overlay de loading com shimmer effect */}
      {loading && loadingVariant === "shimmer" && (
        <div className="absolute inset-0 loading-shimmer" />
      )}
    </Button>
  )
}

// Componente específico para botão de login com animação personalizada
export function LoginButton({
  loading = false,
  disabled = false,
  onClick,
  className,
  area,
}: {
  loading?: boolean
  disabled?: boolean
  onClick: () => void
  className?: string
  area?: string
}) {
  // Determinar variante de loading baseado na área
  const getLoadingVariant = () => {
    switch (area) {
      case "recebimento":
        return "dots"
      case "custos":
        return "shimmer"
      case "embalagem":
        return "spinner"
      default:
        return "spinner"
    }
  }

  // Determinar classe de loading baseado na área
  const getLoadingClass = () => {
    switch (area) {
      case "recebimento":
        return "recebimento-loading"
      case "custos":
        return "custos-loading"
      case "embalagem":
        return "embalagem-loading"
      default:
        return ""
    }
  }

  return (
    <LoadingButton
      loading={loading}
      loadingText="Entrando no Sistema..."
      onClick={onClick}
      disabled={disabled}
      loadingVariant={getLoadingVariant()}
      className={cn(
        "w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white",
        loading && getLoadingClass(),
        className
      )}
    >
      Entrar no Sistema
    </LoadingButton>
  )
}

// Componente de loading simples
export function LoadingSpinner({ 
  size = "default", 
  className 
}: { 
  size?: "sm" | "default" | "lg"
  className?: string 
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8"
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2 className={cn("loading-spinner text-current", sizeClasses[size])} />
    </div>
  )
}

// Componente de loading com texto
export function LoadingWithText({ 
  text = "Carregando...",
  size = "default",
  className 
}: { 
  text?: string
  size?: "sm" | "default" | "lg"
  className?: string 
}) {
  return (
    <div className={cn("flex items-center justify-center space-x-2 loading-fade-in", className)}>
      <LoadingSpinner size={size} />
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  )
}

// Componente de loading com dots animados
export function LoadingDots({ 
  text = "Carregando",
  className 
}: { 
  text?: string
  className?: string 
}) {
  return (
    <div className={cn("flex items-center justify-center space-x-2", className)}>
      <span>{text}</span>
      <div className="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  )
}
