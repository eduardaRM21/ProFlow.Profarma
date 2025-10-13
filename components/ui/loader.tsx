"use client";

import React from "react";

interface LoaderProps {
  text?: string;
  showProgress?: boolean;
  className?: string;
  duration?: number; // Duração em milissegundos (padrão: 2500ms = 2.5s)
  onComplete?: () => void; // Callback quando o loader terminar
}

export function Loader({ 
  text = "Carregando", 
  showProgress = true, 
  className = "",
  duration = 2500, // 2.5 segundos por padrão
  onComplete
}: LoaderProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onComplete]);

  if (!isVisible) {
    return null;
  }
  return (
    <div className={`fixed inset-0 bg-white flex items-center justify-center z-50 px-4 ${className}`}>
      {/* Background animated circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full top-[10%] left-[10%] animate-float opacity-30"></div>
        <div className="absolute w-20 h-20 sm:w-30 sm:h-30 bg-green-100 rounded-full top-[60%] right-[10%] animate-float-delay-1 opacity-30"></div>
        <div className="absolute w-18 h-18 sm:w-25 sm:h-25 bg-green-100 rounded-full bottom-[10%] left-[20%] animate-float-delay-2 opacity-30"></div>
      </div>

      <div className="text-center relative z-10 max-w-sm w-full">
        <div className="relative w-32 h-32 sm:w-48 sm:h-48 md:w-56 md:h-56 mx-auto mb-6 sm:mb-8">
          {/* Logo SVG */}
          <svg 
            width="200" 
            height="200" 
            viewBox="0 0 512 512" 
            xmlns="http://www.w3.org/2000/svg" 
            role="img" 
            className="w-full h-full loader-logo animate-pulse-custom drop-shadow-2xl"
          >
            <circle cx="256" cy="256" r="216" fill="#48C142"/>
            <rect x="196" y="140" width="20" height="232" rx="8" fill="#FFFFFF"/>
            <rect x="236" y="120" width="24" height="272" rx="8" fill="#FFFFFF"/>
            <rect x="280" y="140" width="20" height="232" rx="8" fill="#FFFFFF"/>
            <rect x="316" y="160" width="16" height="192" rx="8" fill="#FFFFFF"/>
          </svg>
        </div>
        
        {/* Loading text */}
        <div className="text-gray-800 text-lg sm:text-xl md:text-2xl font-semibold mb-3 sm:mb-4 loader-text animate-fade-in-out">
          {text}
        </div>
        
        {/* Loading dots */}
        <div className="text-gray-800 text-lg sm:text-xl md:text-2xl h-6 sm:h-8 mb-4 sm:mb-5">
          <span className="animate-blink">.</span>
          <span className="animate-blink-delay-1">.</span>
          <span className="animate-blink-delay-2">.</span>
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className="w-full max-w-xs sm:max-w-sm md:max-w-md h-1 bg-green-200 rounded-full mx-auto overflow-hidden loader-progress">
            <div className="h-full bg-green-500 rounded-full animate-loading"></div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente de loader simples para uso em botões ou elementos menores
export function SmallLoader({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div className="w-4 h-4 border-2 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
    </div>
  );
}

// Hook para controlar o estado do loader
export function useLoader(duration: number = 2500) {
  const [isLoading, setIsLoading] = React.useState(false);

  const startLoading = () => {
    setIsLoading(true);
    
    // Auto-stop após a duração especificada
    if (duration > 0) {
      setTimeout(() => {
        setIsLoading(false);
      }, duration);
    }
  };

  const stopLoading = () => setIsLoading(false);

  return {
    isLoading,
    startLoading,
    stopLoading,
  };
}

// Componentes pré-configurados com durações específicas
export function Loader2Segundos({ text = "Carregando", onComplete }: { text?: string; onComplete?: () => void }) {
  return <Loader text={text} duration={2000} onComplete={onComplete} />;
}

export function Loader3Segundos({ text = "Carregando", onComplete }: { text?: string; onComplete?: () => void }) {
  return <Loader text={text} duration={3000} onComplete={onComplete} />;
}

export function LoaderCustomizado({ text = "Carregando", duration = 2500, onComplete }: { 
  text?: string; 
  duration?: number; 
  onComplete?: () => void;
}) {
  return <Loader text={text} duration={duration} onComplete={onComplete} />;
}
