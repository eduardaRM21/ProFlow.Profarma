"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Package,
  MapPin,
  Warehouse,
  TrendingUp,
  Box,
  ArrowRight
} from "lucide-react"
import { motion } from "framer-motion"

export default function WMSHomePage() {
  const router = useRouter()

  const modulos = [
    {
      title: "Embalagem",
      description: "Bipagem e montagem de cargas/paletes",
      icon: Package,
      href: "/wms/embalagem",
      color: "from-green-500 to-emerald-600"
    },
    {
      title: "Endereçamento",
      description: "Sugestões inteligentes de posicionamento",
      icon: MapPin,
      href: "/wms/enderecamento",
      color: "from-blue-500 to-cyan-600"
    },
    {
      title: "Armazenagem",
      description: "Gestão de estoque e posições",
      icon: Warehouse,
      href: "/wms/armazenagem",
      color: "from-purple-500 to-violet-600"
    },
    {
      title: "Dashboard",
      description: "KPIs e gráficos do armazém",
      icon: TrendingUp,
      href: "/wms/dashboard",
      color: "from-orange-500 to-red-600"
    },
    {
      title: "Visualização 3D",
      description: "Visão interativa do porta-paletes",
      icon: Box,
      href: "/wms/3d",
      color: "from-indigo-500 to-blue-600"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <Package className="h-10 w-10 text-green-600" />
            Módulo WMS
          </h1>
          <p className="text-xl text-gray-600">
            Sistema de Gerenciamento de Armazém
          </p>
        </div>

        {/* Grid de Módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modulos.map((modulo, index) => {
            const Icon = modulo.icon
            return (
              <motion.div
                key={modulo.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer rounded-2xl border-2 hover:border-green-300"
                  onClick={() => router.push(modulo.href)}
                >
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${modulo.color} flex items-center justify-center mb-2`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{modulo.title}</CardTitle>
                    <CardDescription>{modulo.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(modulo.href)
                      }}
                    >
                      Acessar
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

