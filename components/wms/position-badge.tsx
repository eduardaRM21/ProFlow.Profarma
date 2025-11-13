"use client"

import { Badge } from "@/components/ui/badge"
import type { WMSPosicao } from "@/lib/wms-service"

interface PositionBadgeProps {
  status: WMSPosicao["status"]
  className?: string
}

export function PositionBadge({ status, className }: PositionBadgeProps) {
  const variants = {
    disponivel: {
      label: "Disponível",
      className: "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
    },
    ocupada: {
      label: "Ocupada",
      className: "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
    },
    bloqueada: {
      label: "Bloqueada",
      className: "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
    }
  }

  const variant = variants[status] || variants.disponivel

  return (
    <Badge 
      variant="outline" 
      className={`${variant.className} ${className || ""}`}
    >
      {variant.label}
    </Badge>
  )
}

