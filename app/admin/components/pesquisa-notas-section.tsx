"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { getSupabase } from "@/lib/supabase-client"
import {
  FileText,
  Search,
  AlertTriangle,
} from "lucide-react"

export default function PesquisaNotasSection() {
  const { toast } = useToast()

  // Estados para pesquisa de notas
  const [pesquisaNota, setPesquisaNota] = useState("")
  const [resultadoPesquisaNota, setResultadoPesquisaNota] = useState<any>(null)
  const [carregandoPesquisa, setCarregandoPesquisa] = useState(false)
  const [erroPesquisaNota, setErroPesquisaNota] = useState<string | null>(null)

  // Função para pesquisar nota fiscal
  const pesquisarNota = async () => {
    if (!pesquisaNota.trim()) {
      setErroPesquisaNota("Digite um número de nota fiscal para pesquisar")
      return
    }

    setCarregandoPesquisa(true)
    setErroPesquisaNota(null)
    setResultadoPesquisaNota(null)

    try {
      console.log('🔍 Pesquisando nota fiscal:', pesquisaNota)
      
      const supabase = getSupabase()
      if (!supabase) {
        throw new Error('Cliente Supabase não inicializado')
      }

      // Buscar a nota na tabela embalagem_notas_bipadas
      const { data: notaData, error: notaError } = await supabase
        .from('embalagem_notas_bipadas')
        .select('*')
        .eq('numero_nf', pesquisaNota.trim())
        .single()

      if (notaError) {
        if (notaError.code === 'PGRST116') {
          // Nenhum resultado encontrado
          setErroPesquisaNota("Nenhuma nota encontrada com o número informado")
        } else {
          console.error('❌ Erro ao buscar nota:', notaError)
          setErroPesquisaNota(`Erro ao buscar nota: ${notaError.message}`)
        }
        return
      }

      if (!notaData) {
        setErroPesquisaNota("Nenhuma nota encontrada com o número informado")
        return
      }

      console.log('✅ Nota encontrada:', notaData)
      setResultadoPesquisaNota(notaData)

    } catch (error) {
      console.error('❌ Erro na pesquisa de nota:', error)
      setErroPesquisaNota(`Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setCarregandoPesquisa(false)
    }
  }

  return (
    <Card data-pesquisa-notas>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <span>Pesquisa de Notas - Setor Embalagem</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="pesquisa-nota">Número da Nota Fiscal</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="pesquisa-nota"
                  placeholder="Digite o número da nota fiscal..."
                  value={pesquisaNota}
                  onChange={(e) => setPesquisaNota(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      pesquisarNota()
                    }
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={pesquisarNota}
                disabled={!pesquisaNota.trim() || carregandoPesquisa}
                className="w-full sm:w-auto"
              >
                {carregandoPesquisa ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Pesquisar
              </Button>
            </div>
          </div>

          {/* Resultados da Pesquisa */}
          {resultadoPesquisaNota && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Resultado da Pesquisa</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Número da Nota</Label>
                    <p className="text-lg font-semibold">{resultadoPesquisaNota.numero_nf}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Número do Carro SAP</Label>
                    <p className="text-lg font-semibold">
                      {resultadoPesquisaNota.numeros_sap && resultadoPesquisaNota.numeros_sap.length > 0 
                        ? resultadoPesquisaNota.numeros_sap.join(', ') 
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Data/Hora do Bip</Label>
                    <p className="text-sm">{new Date(resultadoPesquisaNota.timestamp_bipagem).toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Quem Bipou</Label>
                    <p className="text-sm">{Array.isArray(resultadoPesquisaNota.colaboradores) ? resultadoPesquisaNota.colaboradores.join(', ') : resultadoPesquisaNota.colaboradores || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Volumes</Label>
                    <p className="text-sm">{resultadoPesquisaNota.volumes || 0}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Status</Label>
                    <p className="text-sm">
                      {resultadoPesquisaNota.status === 'valida' ? 'Válida' : resultadoPesquisaNota.status === 'invalida' ? 'Inválida' : resultadoPesquisaNota.status || 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-600">ID do Carro</Label>
                  <p className="text-sm bg-white p-2 rounded border font-mono">{resultadoPesquisaNota.carro_id || 'N/A'}</p>
                </div>
                
                {resultadoPesquisaNota.observacoes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Observações</Label>
                    <p className="text-sm bg-white p-2 rounded border">{resultadoPesquisaNota.observacoes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {erroPesquisaNota && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">Erro na Pesquisa</p>
              </div>
              <p className="text-red-700 text-sm mt-1">{erroPesquisaNota}</p>
            </div>
          )}

          {pesquisaNota && !resultadoPesquisaNota && !carregandoPesquisa && !erroPesquisaNota && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <p className="text-yellow-800">Nenhuma nota encontrada com o número informado.</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
