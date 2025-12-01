"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, MapPin, Package, TrendingUp } from "lucide-react"
import type { WMSSugestaoPosicao } from "@/lib/wms-service"
import { motion } from "framer-motion"

interface SlotRecommendationCardProps {
  sugestao: WMSSugestaoPosicao
  onConfirmar: (posicaoId: string) => void
  onReservar?: (posicaoId: string) => void
}

export function SlotRecommendationCard({ sugestao, onConfirmar, onReservar }: SlotRecommendationCardProps) {
  const { posicao, score, motivo, compatibilidade_cliente, compatibilidade_destino, nivel_preferido } = sugestao

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-lg transition-shadow border-2 rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              {posicao.codigo_posicao}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Nível:</span>
              <Badge variant="outline">{posicao.nivel}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Status:</span>
              <Badge 
                variant="outline"
                className={
                  posicao.status === "disponivel" 
                    ? "bg-green-50 text-green-700 border-green-300" 
                    : "bg-gray-50 text-gray-700 border-gray-300"
                }
              >
                {posicao.status === "disponivel" ? "Disponível" : posicao.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Capacidade:</span>
              <span className="font-medium">{posicao.capacidade_peso} kg</span>
            </div>
          </div>

          {motivo && (
            <div className="pt-2 border-t">
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                {motivo}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {compatibilidade_cliente && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Cliente
              </Badge>
            )}
            {compatibilidade_destino && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Destino
              </Badge>
            )}
            {nivel_preferido && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Alta Giro
              </Badge>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onConfirmar(posicao.id)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Package className="h-4 w-4 mr-2" />
              Confirmar
            </Button>
            {onReservar && (
              <Button
                onClick={() => onReservar(posicao.id)}
                variant="outline"
                className="flex-1"
              >
                Reservar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

