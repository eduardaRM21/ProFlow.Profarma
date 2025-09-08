"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Calendar, Filter, Save, RotateCcw, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export interface FiltrosAvancados {
  // Filtros de data
  filtroData: "hoje" | "ontem" | "semana" | "mes" | "personalizado" | "todos"
  dataInicio?: string
  dataFim?: string
  
  // Filtros de setor
  setores: string[]
  incluirSetores: boolean
  
  // Filtros de status
  statuses: string[]
  incluirStatus: boolean
  
  // Filtros de colaborador
  colaboradores: string[]
  incluirColaboradores: boolean
  
  // Filtros de destino
  destinos: string[]
  incluirDestinos: boolean
  
  // Filtros de tipo de carro
  tiposCarro: ("ROD" | "CON")[]
  incluirTiposCarro: boolean
  
  // Configurações
  salvarPreferencias: boolean
  mostrarFiltros: boolean
}

interface FiltrosAvancadosProps {
  filtros: FiltrosAvancados
  onFiltrosChange: (filtros: FiltrosAvancados) => void
  opcoesDisponiveis: {
    setores: string[]
    statuses: string[]
    colaboradores: string[]
    destinos: string[]
  }
}

export default function FiltrosAvancados({
  filtros,
  onFiltrosChange,
  opcoesDisponiveis
}: FiltrosAvancadosProps) {
  const { toast } = useToast()
  const [filtrosLocais, setFiltrosLocais] = useState<FiltrosAvancados>(filtros)

  // Carregar preferências salvas
  useEffect(() => {
    const preferenciasSalvas = localStorage.getItem("profarma_filtros_admin")
    if (preferenciasSalvas && filtros.salvarPreferencias) {
      try {
        const preferencias = JSON.parse(preferenciasSalvas)
        setFiltrosLocais(prev => ({ ...prev, ...preferencias }))
        onFiltrosChange({ ...filtros, ...preferencias })
      } catch (error) {
        console.error("Erro ao carregar preferências de filtro:", error)
      }
    }
  }, [])

  // Aplicar filtros
  const aplicarFiltros = () => {
    onFiltrosChange(filtrosLocais)
    
    if (filtrosLocais.salvarPreferencias) {
      localStorage.setItem("profarma_filtros_admin", JSON.stringify(filtrosLocais))
      toast({
        title: "Filtros Salvos",
        description: "Suas preferências de filtro foram salvas automaticamente",
        duration: 3000,
      })
    }
  }

  // Resetar filtros
  const resetarFiltros = () => {
    const filtrosPadrao: FiltrosAvancados = {
      filtroData: "hoje",
      dataInicio: new Date().toISOString().split('T')[0],
      dataFim: new Date().toISOString().split('T')[0],
      setores: [],
      incluirSetores: false,
      statuses: [],
      incluirStatus: false,
      colaboradores: [],
      incluirColaboradores: false,
      destinos: [],
      incluirDestinos: false,
      tiposCarro: [],
      incluirTiposCarro: false,
      salvarPreferencias: filtros.salvarPreferencias,
      mostrarFiltros: filtros.mostrarFiltros
    }
    
    setFiltrosLocais(filtrosPadrao)
    onFiltrosChange(filtrosPadrao)
    
    if (filtros.salvarPreferencias) {
      localStorage.setItem("profarma_filtros_admin", JSON.stringify(filtrosPadrao))
    }
  }

  // Atualizar filtro de data
  const atualizarFiltroData = (novoFiltro: FiltrosAvancados["filtroData"]) => {
    let dataInicio = ""
    let dataFim = ""
    const hoje = new Date()
    
    switch (novoFiltro) {
      case "hoje":
        dataInicio = hoje.toISOString().split('T')[0]
        dataFim = hoje.toISOString().split('T')[0]
        break
      case "ontem":
        const ontem = new Date(hoje)
        ontem.setDate(hoje.getDate() - 1)
        dataInicio = ontem.toISOString().split('T')[0]
        dataFim = ontem.toISOString().split('T')[0]
        break
      case "semana":
        const inicioSemana = new Date(hoje)
        inicioSemana.setDate(hoje.getDate() - 7)
        dataInicio = inicioSemana.toISOString().split('T')[0]
        dataFim = hoje.toISOString().split('T')[0]
        break
      case "mes":
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        dataInicio = inicioMes.toISOString().split('T')[0]
        dataFim = hoje.toISOString().split('T')[0]
        break
      case "personalizado":
        dataInicio = filtrosLocais.dataInicio || ""
        dataFim = filtrosLocais.dataFim || ""
        break
      case "todos":
        dataInicio = ""
        dataFim = ""
        break
    }
    
    setFiltrosLocais(prev => ({
      ...prev,
      filtroData: novoFiltro,
      dataInicio,
      dataFim
    }))
  }

  // Toggle para mostrar/ocultar filtros
  const toggleFiltros = () => {
    const novosFiltros = { ...filtrosLocais, mostrarFiltros: !filtrosLocais.mostrarFiltros }
    setFiltrosLocais(novosFiltros)
    onFiltrosChange(novosFiltros)
  }

  return (
    <Card className="border-blue-200 mt-10 mb-10">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 text-sm sm:text-base">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <span>Filtros Inteligentes</span>
            </div>
            <Badge variant="outline" className="text-xs w-fit">
              {filtrosLocais.filtroData === "hoje" ? "Hoje" : 
               filtrosLocais.filtroData === "ontem" ? "Ontem" :
               filtrosLocais.filtroData === "semana" ? "Última Semana" :
               filtrosLocais.filtroData === "mes" ? "Este Mês" :
               filtrosLocais.filtroData === "personalizado" ? "Personalizado" : "Todos"}
            </Badge>
          </CardTitle>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="flex items-center space-x-2">
              <Switch
                checked={filtrosLocais.salvarPreferencias}
                onCheckedChange={(checked) => setFiltrosLocais(prev => ({ ...prev, salvarPreferencias: checked }))}
              />
              <Label className="text-xs">Salvar Preferências</Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFiltros}
              className="text-xs w-full sm:w-auto"
            >
              {filtrosLocais.mostrarFiltros ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {filtrosLocais.mostrarFiltros ? "Ocultar" : "Mostrar"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {filtrosLocais.mostrarFiltros && (
        <CardContent className="space-y-4">
          {/* Filtros de Data */}
          <div className="space-y-3">
            <Label className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Filtro de Data</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {["hoje", "ontem", "semana", "mes", "personalizado", "todos"].map((opcao) => (
                <Button
                  key={opcao}
                  variant={filtrosLocais.filtroData === opcao ? "default" : "outline"}
                  size="sm"
                  onClick={() => atualizarFiltroData(opcao as any)}
                  className="text-xs h-8 sm:h-9"
                >
                  {opcao === "hoje" ? "Hoje" :
                   opcao === "ontem" ? "Ontem" :
                   opcao === "semana" ? "Semana" :
                   opcao === "mes" ? "Mês" :
                   opcao === "personalizado" ? "Personalizado" : "Todos"}
                </Button>
              ))}
            </div>
            
            {filtrosLocais.filtroData === "personalizado" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Data Início</Label>
                  <Input
                    type="date"
                    value={filtrosLocais.dataInicio || ""}
                    onChange={(e) => setFiltrosLocais(prev => ({ ...prev, dataInicio: e.target.value }))}
                    className="text-xs h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Data Fim</Label>
                  <Input
                    type="date"
                    value={filtrosLocais.dataFim || ""}
                    onChange={(e) => setFiltrosLocais(prev => ({ ...prev, dataFim: e.target.value }))}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Filtros de Setor */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                checked={filtrosLocais.incluirSetores}
                onCheckedChange={(checked) => setFiltrosLocais(prev => ({ ...prev, incluirSetores: checked }))}
              />
              <Label className="text-xs">Filtrar por Setor</Label>
            </div>
            {filtrosLocais.incluirSetores && (
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !filtrosLocais.setores.includes(value)) {
                    setFiltrosLocais(prev => ({
                      ...prev,
                      setores: [...prev.setores, value]
                    }))
                  }
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecionar setor..." />
                </SelectTrigger>
                <SelectContent>
                  {opcoesDisponiveis.setores.map((setor) => (
                    <SelectItem key={setor} value={setor}>{setor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {filtrosLocais.setores.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filtrosLocais.setores.map((setor) => (
                  <Badge
                    key={setor}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-red-100"
                    onClick={() => setFiltrosLocais(prev => ({
                      ...prev,
                      setores: prev.setores.filter(s => s !== setor)
                    }))}
                  >
                    {setor} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Filtros de Status */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                checked={filtrosLocais.incluirStatus}
                onCheckedChange={(checked) => setFiltrosLocais(prev => ({ ...prev, incluirStatus: checked }))}
              />
              <Label className="text-xs">Filtrar por Status</Label>
            </div>
            {filtrosLocais.incluirStatus && (
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !filtrosLocais.statuses.includes(value)) {
                    setFiltrosLocais(prev => ({
                      ...prev,
                      statuses: [...prev.statuses, value]
                    }))
                  }
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecionar status..." />
                </SelectTrigger>
                <SelectContent>
                  {opcoesDisponiveis.statuses.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}  
            {filtrosLocais.statuses.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filtrosLocais.statuses.map((status) => (
                  <Badge
                    key={status}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-red-100"
                    onClick={() => setFiltrosLocais(prev => ({
                      ...prev,
                      statuses: prev.statuses.filter(s => s !== status)
                    }))}
                  >
                    {status} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Filtros de Colaborador */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                checked={filtrosLocais.incluirColaboradores}
                onCheckedChange={(checked) => setFiltrosLocais(prev => ({ ...prev, incluirColaboradores: checked }))}
              />
              <Label className="text-xs">Filtrar por Colaborador</Label>
            </div>
            {filtrosLocais.incluirColaboradores && (
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !filtrosLocais.colaboradores.includes(value)) {
                    setFiltrosLocais(prev => ({
                      ...prev,
                      colaboradores: [...prev.colaboradores, value]
                    }))
                  }
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecionar colaborador..." />
                </SelectTrigger>
                <SelectContent>
                  {opcoesDisponiveis.colaboradores.map((colaborador) => (
                    <SelectItem key={colaborador} value={colaborador}>{colaborador}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {filtrosLocais.colaboradores.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filtrosLocais.colaboradores.map((colaborador) => (
                  <Badge
                    key={colaborador}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-red-100"
                    onClick={() => setFiltrosLocais(prev => ({
                      ...prev,
                      colaboradores: prev.colaboradores.filter(c => c !== colaborador)
                    }))}
                  >
                    {colaborador} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Filtros de Destino */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                checked={filtrosLocais.incluirDestinos}
                onCheckedChange={(checked) => setFiltrosLocais(prev => ({ ...prev, incluirDestinos: checked }))}
              />
              <Label className="text-xs">Filtrar por Destino</Label>
            </div>
            {filtrosLocais.incluirDestinos && (
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !filtrosLocais.destinos.includes(value)) {
                    setFiltrosLocais(prev => ({
                      ...prev,
                      destinos: [...prev.destinos, value]
                    }))
                  }
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecionar destino..." />
                </SelectTrigger>
                <SelectContent>
                  {opcoesDisponiveis.destinos.map((destino) => (
                    <SelectItem key={destino} value={destino}>{destino}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {filtrosLocais.destinos.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filtrosLocais.destinos.map((destino) => (
                  <Badge
                    key={destino}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-red-100"
                    onClick={() => setFiltrosLocais(prev => ({
                      ...prev,
                      destinos: prev.destinos.filter(d => d !== destino)
                    }))}
                  >
                    {destino} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Filtros de Tipo de Carro */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                checked={filtrosLocais.incluirTiposCarro}
                onCheckedChange={(checked) => setFiltrosLocais(prev => ({ ...prev, incluirTiposCarro: checked }))}
              />
              <Label className="text-xs">Filtrar por Tipo de Carro</Label>
            </div>
            {filtrosLocais.incluirTiposCarro && (
              <div className="flex space-x-2">
                {(["ROD", "CON"] as const).map((tipo) => (
                  <Button
                    key={tipo}
                    variant={filtrosLocais.tiposCarro.includes(tipo) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (filtrosLocais.tiposCarro.includes(tipo)) {
                        setFiltrosLocais(prev => ({
                          ...prev,
                          tiposCarro: prev.tiposCarro.filter(t => t !== tipo)
                        }))
                      } else {
                        setFiltrosLocais(prev => ({
                          ...prev,
                          tiposCarro: [...prev.tiposCarro, tipo]
                        }))
                      }
                    }}
                    className="text-xs"
                  >
                    {tipo === "ROD" ? "🚛 ROD" : "📦 CON"}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <Button
              onClick={aplicarFiltros}
              size="sm"
              className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 h-9"
            >
              <Filter className="h-4 w-4 mr-2" />
              Aplicar Filtros
            </Button>
            <Button
              onClick={resetarFiltros}
              variant="outline"
              size="sm"
              className="w-full sm:flex-1 h-9"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Resetar
            </Button>
            {filtrosLocais.salvarPreferencias && (
              <Button
                onClick={() => {
                  localStorage.setItem("profarma_filtros_admin", JSON.stringify(filtrosLocais))
                  toast({
                    title: "Preferências Salvas",
                    description: "Suas preferências de filtro foram salvas",
                    duration: 3000,
                  })
                }}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto h-9"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
