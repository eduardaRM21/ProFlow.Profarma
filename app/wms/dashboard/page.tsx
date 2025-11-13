"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Package, MapPin, Clock, TrendingUp } from "lucide-react"
import { WMSService } from "@/lib/wms-service"
import { DashboardCard } from "@/components/wms/dashboard-card"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts"

const COLORS = {
  disponivel: "#10b981",
  ocupada: "#3b82f6",
  bloqueada: "#ef4444"
}

export default function WMSDashboardPage() {
  const router = useRouter()
  const [estatisticas, setEstatisticas] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarEstatisticas()
    const interval = setInterval(carregarEstatisticas, 30000) // Atualizar a cada 30s
    return () => clearInterval(interval)
  }, [])

  const carregarEstatisticas = async () => {
    try {
      const stats = await WMSService.obterEstatisticas()
      setEstatisticas(stats)
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !estatisticas) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando estatísticas...</p>
        </div>
      </div>
    )
  }

  const dadosStatusPosicoes = [
    { name: "Disponíveis", value: estatisticas.posicoes_disponiveis, color: COLORS.disponivel },
    { name: "Ocupadas", value: estatisticas.posicoes_ocupadas, color: COLORS.ocupada },
    { name: "Bloqueadas", value: estatisticas.posicoes_bloqueadas, color: COLORS.bloqueada }
  ]

  const dadosOcupacaoPorNivel = estatisticas.ocupacao_por_nivel.map((item: any) => ({
    nivel: `Nível ${item.nivel}`,
    ocupadas: item.ocupadas,
    disponiveis: item.total - item.ocupadas,
    percentual: item.total > 0 ? Math.round((item.ocupadas / item.total) * 100) : 0
  }))

  const percentualOcupacao = estatisticas.total_posicoes > 0
    ? Math.round((estatisticas.posicoes_ocupadas / estatisticas.total_posicoes) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/wms")}
              className="text-gray-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-green-600" />
                Dashboard WMS
              </h1>
              <p className="text-gray-600 mt-1">Visão geral do armazém</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title="Ocupação Total"
            value={`${percentualOcupacao}%`}
            icon={Package}
            description={`${estatisticas.posicoes_ocupadas} de ${estatisticas.total_posicoes} posições`}
          />
          <DashboardCard
            title="Posições Livres"
            value={estatisticas.posicoes_disponiveis}
            icon={MapPin}
            description="Disponíveis para armazenamento"
          />
          <DashboardCard
            title="Cargas Aguardando"
            value={estatisticas.cargas_aguardando}
            icon={Package}
            description="Aguardando agendamento"
          />
          <DashboardCard
            title="Permanência Média"
            value={`${estatisticas.permanencia_media} dias`}
            icon={Clock}
            description="Tempo médio de armazenamento"
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico Pizza - Status das Posições */}
          <Card className="rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle>Status das Posições</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dadosStatusPosicoes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dadosStatusPosicoes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico Barras - Ocupação por Nível */}
          <Card className="rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle>Ocupação por Nível</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosOcupacaoPorNivel}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nivel" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ocupadas" fill={COLORS.ocupada} name="Ocupadas" />
                  <Bar dataKey="disponiveis" fill={COLORS.disponivel} name="Disponíveis" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Linhas - Permanência Média */}
        <Card className="rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle>Permanência Média por Nível</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosOcupacaoPorNivel}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nivel" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="percentual"
                  stroke="#3b82f6"
                  name="% Ocupação"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

