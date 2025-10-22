"use client"

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DivergenciasListOptimized } from '@/components/ui/divergencias-list-optimized'
import { PaginationOptimized } from '@/components/ui/pagination-optimized'
import { useRelatorioOptimized } from '@/hooks/use-relatorio-optimized'
import { useDivergenciasHybrid } from '@/hooks/use-hybrid-optimized'
import { useCarrosHybrid } from '@/hooks/use-hybrid-optimized'
import { useInvalidateCache } from '@/contexts/swr-provider'
import {
  RefreshCw,
  Download,
  Eye,
  Loader2,
  Database,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'

// =====================================================
// EXEMPLO DE USO DOS HOOKS OTIMIZADOS
// =====================================================

export const CustosOptimizedExample = () => {
  const [relatorioSelecionado, setRelatorioSelecionado] = useState<string | null>(null)
  const [showDivergencias, setShowDivergencias] = useState(false)
  const [showCarros, setShowCarros] = useState(false)

  // Hook otimizado para relatório com lazy loading
  const {
    relatorio,
    isLoading: isLoadingRelatorio,
    error: errorRelatorio,
    loadedSections,
    loadNotas,
    loadDivergencias,
    loadAll,
    estatisticas,
    refresh: refreshRelatorio
  } = useRelatorioOptimized(relatorioSelecionado, {
    loadNotasOnDemand: true,
    loadDivergenciasOnDemand: true,
    enableCache: true,
    enableRealtime: true
  })

  // Hook híbrido para divergências com paginação
  const {
    data: divergencias,
    isLoading: isLoadingDivergencias,
    hasMore: hasMoreDivergencias,
    totalCount: totalDivergencias,
    loadMore: loadMoreDivergencias,
    refresh: refreshDivergencias,
    performance: performanceDivergencias
  } = useDivergenciasHybrid(
    { relatorioId: relatorioSelecionado || undefined },
    {
      strategy: 'hybrid',
      pageSize: 20,
      enablePagination: true,
      enableRealtime: true,
      staleTime: 30000
    }
  )

  // Hook híbrido para carros
  const {
    data: carros,
    isLoading: isLoadingCarros,
    refresh: refreshCarros,
    performance: performanceCarros
  } = useCarrosHybrid(undefined, {
    strategy: 'hybrid',
    enableRealtime: true,
    staleTime: 60000
  })

  // Hook para invalidar cache
  const { invalidatePattern, getCacheStats } = useInvalidateCache()

  // Handlers
  const handleRelatorioSelect = useCallback((relatorioId: string) => {
    setRelatorioSelecionado(relatorioId)
    setShowDivergencias(false)
    setShowCarros(false)
  }, [])

  const handleLoadNotas = useCallback(async () => {
    await loadNotas()
  }, [loadNotas])

  const handleLoadDivergencias = useCallback(async () => {
    await loadDivergencias()
  }, [loadDivergencias])

  const handleLoadAll = useCallback(async () => {
    await loadAll()
  }, [loadAll])

  const handleExportDivergencias = useCallback((divergencias: any[]) => {
    console.log('Exportando divergências:', divergencias.length)
    // Implementar exportação
  }, [])

  const handleInvalidateCache = useCallback(() => {
    invalidatePattern('relatorio')
    console.log('Cache de relatórios invalidado')
  }, [invalidatePattern])

  const cacheStats = getCacheStats()

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho com estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>ProFlow - Custos Otimizado</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                Cache: {cacheStats.validEntries}/{cacheStats.totalEntries}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleInvalidateCache}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Limpar Cache
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {carros?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Carros Ativos</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {relatorio?.totalNotas || 0}
              </div>
              <div className="text-sm text-muted-foreground">Notas Processadas</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {relatorio?.totalDivergencias || 0}
              </div>
              <div className="text-sm text-muted-foreground">Divergências</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {relatorio?.totalVolumes || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Volumes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seleção de relatório */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={relatorioSelecionado === 'rel-001' ? 'default' : 'outline'}
              onClick={() => handleRelatorioSelect('rel-001')}
            >
              Relatório 001
            </Button>
            <Button
              variant={relatorioSelecionado === 'rel-002' ? 'default' : 'outline'}
              onClick={() => handleRelatorioSelect('rel-002')}
            >
              Relatório 002
            </Button>
            <Button
              variant={relatorioSelecionado === 'rel-003' ? 'default' : 'outline'}
              onClick={() => handleRelatorioSelect('rel-003')}
            >
              Relatório 003
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Relatório selecionado */}
      {relatorioSelecionado && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Relatório: {relatorio?.nome || relatorioSelecionado}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadNotas}
                  disabled={isLoadingRelatorio || loadedSections.notas}
                >
                  {loadedSections.notas ? '✅' : '📋'} Notas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadDivergencias}
                  disabled={isLoadingRelatorio || loadedSections.divergencias}
                >
                  {loadedSections.divergencias ? '✅' : '⚠️'} Divergências
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadAll}
                  disabled={isLoadingRelatorio}
                >
                  {isLoadingRelatorio ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Carregar Tudo
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {errorRelatorio && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  Erro: {errorRelatorio}
                </div>
              </div>
            )}

            {relatorio && (
              <div className="space-y-4">
                {/* Estatísticas do relatório */}
                {estatisticas && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-semibold text-blue-800">
                        {estatisticas.totalNotas}
                      </div>
                      <div className="text-sm text-blue-600">Total Notas</div>
                    </div>
                    
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-lg font-semibold text-orange-800">
                        {estatisticas.totalDivergencias}
                      </div>
                      <div className="text-sm text-orange-600">Divergências</div>
                    </div>
                    
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-semibold text-green-800">
                        {estatisticas.divergenciasResolvidas}
                      </div>
                      <div className="text-sm text-green-600">Resolvidas</div>
                    </div>
                    
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-lg font-semibold text-red-800">
                        {estatisticas.divergenciasPendentes}
                      </div>
                      <div className="text-sm text-red-600">Pendentes</div>
                    </div>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDivergencias(!showDivergencias)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showDivergencias ? 'Ocultar' : 'Ver'} Divergências
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowCarros(!showCarros)}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {showCarros ? 'Ocultar' : 'Ver'} Carros
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de divergências otimizada */}
      {showDivergencias && relatorioSelecionado && (
        <DivergenciasListOptimized
          relatorioId={relatorioSelecionado}
          showFilters={true}
          showPagination={true}
          pageSize={20}
          onDivergenciaClick={(divergencia) => {
            console.log('Divergência clicada:', divergencia)
          }}
          onExport={handleExportDivergencias}
        />
      )}

      {/* Lista de carros */}
      {showCarros && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Carros em Produção</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Cache: {performanceCarros.cacheHit ? '✅' : '❌'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshCarros}
                  disabled={isLoadingCarros}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCarros ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {isLoadingCarros ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Carregando carros...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {carros?.map((carro: any) => (
                  <Card key={carro.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{carro.nome_carro}</h4>
                      <Badge variant="outline">{carro.status_carro}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>NFs: {carro.quantidade_nfs}</div>
                      <div>Volumes: {carro.total_volumes}</div>
                      <div>Pallets: {carro.estimativa_pallets}</div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Informações de performance (apenas em desenvolvimento) */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Informações de Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <h4 className="font-medium mb-2">Divergências</h4>
                <div>Cache: {performanceDivergencias.cacheHit ? '✅' : '❌'}</div>
                <div>Estratégia: {performanceDivergencias.strategy}</div>
                <div>Tamanho: {Math.round(performanceDivergencias.dataSize / 1024)}KB</div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Carros</h4>
                <div>Cache: {performanceCarros.cacheHit ? '✅' : '❌'}</div>
                <div>Estratégia: {performanceCarros.strategy}</div>
                <div>Tamanho: {Math.round(performanceCarros.dataSize / 1024)}KB</div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Cache Global</h4>
                <div>Entradas: {cacheStats.totalEntries}</div>
                <div>Válidas: {cacheStats.validEntries}</div>
                <div>Uso: {Math.round(cacheStats.usagePercentage)}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
