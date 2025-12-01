"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowUp } from "lucide-react"

interface ScrollToTopButtonProps {
  /**
   * Distância mínima de scroll (em pixels) para mostrar o botão
   * @default 300
   */
  threshold?: number
  /**
   * Posição do botão (bottom-right, bottom-left, etc)
   * @default "bottom-right"
   */
  position?: "bottom-right" | "bottom-left"
}

export default function ScrollToTopButton({ 
  threshold = 300,
  position = "bottom-right"
}: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > threshold) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener("scroll", toggleVisibility)

    return () => {
      window.removeEventListener("scroll", toggleVisibility)
    }
  }, [threshold])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    })
  }

  if (!isVisible) {
    return null
  }

  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6"
  }

  return (
    <Button
      onClick={scrollToTop}
      className={`fixed ${positionClasses[position]} z-50 bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200`}
      size="lg"
      aria-label="Voltar ao topo"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  )
}

