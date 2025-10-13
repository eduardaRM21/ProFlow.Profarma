"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Truck,
  Search,
  Filter,
  BarChart3,
  Clock,
  Package,
  CheckCircle,
  AlertTriangle,
  Send,
  TrendingUp,
  Activity,
  Hash,
  EyeClosed,
} from "lucide-react"
import FiltrosAvancados, { FiltrosAvancados as FiltrosAvancadosType } from "./filtros-avancados"



interface SidebarFixaProps {
  estatisticas: {
    total: number
    embalando: number
    aguardandoLancamento: number
    divergencia: number
    lancados: number
    finalizados: number
    totalNFs: number
    totalPallets: number
  }
  isConnected: boolean
  lastUpdate: Date
  filtroBusca: string
  setFiltroBusca: (value: string) => void
  filtroStatus: string
  setFiltroStatus: (value: string) => void
  filtrosAvancados: FiltrosAvancadosType
  setFiltrosAvancados: (filtros: FiltrosAvancadosType) => void
  opcoesDisponiveis: {
    statuses: string[]
    colaboradores: string[]
    destinos: string[]
  }
  loading?: boolean
  error?: string | null
  mobileOpen?: boolean
  onMobileToggle?: () => void
  onSidebarHiddenChange?: (hidden: boolean) => void
  onSidebarCollapsedChange?: (collapsed: boolean) => void
}

export default function SidebarFixa({
  estatisticas,
  isConnected,
  lastUpdate,
  filtroBusca,
  setFiltroBusca,
  filtroStatus,
  setFiltroStatus,
  filtrosAvancados,
  setFiltrosAvancados,
  opcoesDisponiveis,
  loading = false,
  error = null,
  mobileOpen = false,
  onMobileToggle,
  onSidebarHiddenChange,
  onSidebarCollapsedChange
}: SidebarFixaProps) {
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const estatisticasCards = [
    { label: "Total", value: estatisticas.total, icon: BarChart3, bgColor: "bg-blue-50", textColor: "text-blue-600" },
    { label: "Embalando", value: estatisticas.embalando, icon: Package, bgColor: "bg-orange-50", textColor: "text-orange-600" },
    { label: "Aguardando Lançamento", value: estatisticas.aguardandoLancamento, icon: Clock, bgColor: "bg-yellow-50", textColor: "text-yellow-600" },
    { label: "Divergências", value: estatisticas.divergencia, icon: AlertTriangle, bgColor: "bg-red-50", textColor: "text-red-600" },
    { label: "Lançados", value: estatisticas.lancados, icon: Send, bgColor: "bg-teal-50", textColor: "text-teal-600" },
    { label: "Finalizados", value: estatisticas.finalizados, icon: CheckCircle, bgColor: "bg-purple-50", textColor: "text-purple-600" },
    { label: "Total NFs", value: estatisticas.totalNFs, icon: Hash, bgColor: "bg-indigo-50", textColor: "text-indigo-600" },
    { label: "Total Pallets", value: estatisticas.totalPallets, icon: TrendingUp, bgColor: "bg-sky-50", textColor: "text-sky-600" }
  ]

  return (
    <>
      {/* Botão flutuante para mostrar sidebar quando oculto */}
      {sidebarHidden && (
        <div className="fixed top-20 left-4 z-50 hidden lg:block">
          <Button
            onClick={() => {
              setSidebarHidden(false)
              onSidebarHiddenChange?.(false)
            }}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2 bg-white dark:bg-gray-800 shadow-lg"
          >
            <Filter className="h-4 w-4" />
            <span>Mostrar Filtros</span>
          </Button>
        </div>
      )}

      {/* Sidebar Desktop */}
      <div
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-40 transition-all duration-300 
        ${sidebarHidden ? "w-0 -translate-x-full" : sidebarCollapsed ? "w-16" : "w-80"} hidden lg:block`}
      >
        <ScrollArea className="h-full">
          <div className="p-3 pb-6 space-y-2 w-full">
            {/* Header */}
            <div className="flex items-center justify-between w-full">
              {!sidebarCollapsed && (
                <div className="flex items-center space-x-2 min-w-0">
                  <Truck className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">Gerenciar Carros</h2>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newCollapsed = !sidebarCollapsed
                    setSidebarCollapsed(newCollapsed)
                    onSidebarCollapsedChange?.(newCollapsed)
                  }}
                  className="p-1 flex-shrink-0"
                  title={sidebarCollapsed ? "Expandir" : "Recolher"}
                >
                  <Filter className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newHidden = !sidebarHidden
                    setSidebarHidden(newHidden)
                    onSidebarHiddenChange?.(newHidden)
                  }}
                  className="p-1 flex-shrink-0"
                  title={sidebarHidden ? "Mostrar sidebar" : "Ocultar sidebar"}
                >
                  <EyeClosed className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {!sidebarCollapsed && (
              <>
                {/* Conexão */}
                <Card className="w-full dark:bg-gray-950">
                  <CardContent className="p-3 ">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                        <span className={`text-xs ${isConnected ? "text-green-600" : "text-red-600"} truncate`}>
                          {isConnected ? "Conectado" : "Desconectado"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                        {lastUpdate.toLocaleTimeString("pt-BR")}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Estatísticas */}
                <Card className="w-full dark:bg-gray-950">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center space-x-2">
                      <Activity className="h-4 w-4 flex-shrink-0" />
                      <span>Estatísticas</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {estatisticasCards.map((stat, i) => {
                      const Icon = stat.icon
                      return (
                        <div key={i} className={`p-2 rounded-md ${stat.bgColor} w-full dark:bg-gray-800`}>
                          <div className="flex items-center justify-between min-w-0">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <Icon className={`h-3 w-3 ${stat.textColor} flex-shrink-0`} />
                              <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{stat.label}</span>
                            </div>
                            <span className={`text-sm font-bold ${stat.textColor} ml-2 flex-shrink-0`}>{stat.value}</span>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                <Separator />

                {/* Filtros */}
                <Card className="w-full dark:bg-gray-950">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center space-x-2">
                      <Filter className="h-4 w-4 flex-shrink-0" />
                      <span>Filtros</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Busca */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Buscar</label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Carro, colaborador, destino..."
                          value={filtroBusca}
                          onChange={(e) => setFiltroBusca(e.target.value)}
                          className="pl-8 text-sm h-8 w-full dark:bg-gray-900"
                        />
                      </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Status</label>
                      <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                        <SelectTrigger className="text-sm h-8 w-full dark:bg-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-950">
                          <SelectItem value="todos">Todos os Status</SelectItem>
                          <SelectItem value="embalando">🟠 Embalando</SelectItem>
                          <SelectItem value="divergencia">🔴 Divergência</SelectItem>
                          <SelectItem value="aguardando_lancamento">⏳ Aguardando Lançamento</SelectItem>
                          <SelectItem value="finalizado">✅ Finalizados</SelectItem>
                          <SelectItem value="lancado">🚀 Lançados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                  </CardContent>
                </Card>

                {/* Filtros Avançados */}
                <div className="w-full dark:bg-gray-900">
                  <FiltrosAvancados
                    filtros={filtrosAvancados}
                    onFiltrosChange={setFiltrosAvancados}
                    opcoesDisponiveis={opcoesDisponiveis}
                  />
                </div>

                {/* Loading */}
                {loading && (
                  <Card className="border-blue-200 w-full">
                    <CardContent className="text-center py-3">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-blue-600">Carregando...</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Erro */}
                {error && (
                  <Card className="border-red-200 w-full">
                    <CardContent className="text-center py-3">
                      <div className="text-red-600">
                        <p className="text-sm font-semibold">Erro ao carregar</p>
                        <p className="text-xs">{error}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Sidebar Mobile - Sheet */}
      <Sheet open={mobileOpen} onOpenChange={onMobileToggle}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-blue-600" />
              <span>Filtros e Estatísticas</span>
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-4rem)]">
            <div className="p-4 space-y-4">
              {/* Estatísticas */}
              <div className="grid grid-cols-2 gap-3">
                {estatisticasCards.map((card, index) => {
                  const IconComponent = card.icon
                  return (
                    <Card key={index} className={`${card.bgColor} border-0`}>
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-2">
                          <IconComponent className={`h-4 w-4 ${card.textColor}`} />
                          <div>
                            <div className={`text-lg font-bold ${card.textColor}`}>
                              {card.value}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {card.label}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <Separator />

              {/* Status de Conexão */}
              <Card className="w-full">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm font-medium">
                        {isConnected ? 'Conectado' : 'Desconectado'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {lastUpdate.toLocaleTimeString('pt-BR')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Filtros */}
              <Card className="w-full dark:bg-gray-950">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center space-x-2">
                    <Filter className="h-4 w-4 flex-shrink-0" />
                    <span>Filtros</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Busca */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Buscar</label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Carro, colaborador, destino..."
                        value={filtroBusca}
                        onChange={(e) => setFiltroBusca(e.target.value)}
                        className="pl-8 text-sm h-8 w-full dark:bg-gray-900"
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                      <SelectTrigger className="text-sm h-8 w-full dark:bg-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-950">
                        <SelectItem value="todos">Todos os Status</SelectItem>
                        <SelectItem value="embalando">🟠 Embalando</SelectItem>
                        <SelectItem value="divergencia">🔴 Divergência</SelectItem>
                        <SelectItem value="aguardando_lancamento">⏳ Aguardando Lançamento</SelectItem>
                        <SelectItem value="finalizado">✅ Finalizados</SelectItem>
                        <SelectItem value="lancado">🚀 Lançados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Filtros Avançados */}
              <div className="w-full dark:bg-gray-900">
                <FiltrosAvancados
                  filtros={filtrosAvancados}
                  onFiltrosChange={setFiltrosAvancados}
                  opcoesDisponiveis={opcoesDisponiveis}
                />
              </div>

              {/* Loading */}
              {loading && (
                <Card className="border-blue-200 w-full">
                  <CardContent className="text-center py-3">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-blue-600">Carregando...</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Erro */}
              {error && (
                <Card className="border-red-200 w-full">
                  <CardContent className="text-center py-3">
                    <div className="text-red-600">
                      <p className="text-sm font-semibold">Erro ao carregar</p>
                      <p className="text-xs">{error}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}
