"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PaginationOptimized } from '@/components/ui/pagination-optimized'
import { useDivergenciasHybrid } from '@/hooks/use-hybrid-optimized'
import { useInfiniteScroll } from '@/hooks/use-lazy-loading-optimized'
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Eye,
  FileText
} from 'lucide-react'

// =====================================================
// TIPOS
// =====================================================

interface Divergencia {
  id: string
  nota_fiscal_id: string
  tipo_divergencia: string
  descricao: string
  status: string
  created_at: string
  updated_at: string
  volume_esperado?: number
  volume_encontrado?: number
  fornecedor?: string
  numero_nf?: string
}

interface DivergenciasListProps {
  // Filtros
  relatorioId?: string
  notaFiscalId?: string
  
  // Opções de exibição
  showFilters?: boolean
  showPagination?: boolean
  showInfiniteScroll?: boolean
  pageSize?: number
  
  // Callbacks
  onDivergenciaClick?: (divergencia: Divergencia) => void
  onExport?: (divergencias: Divergencia[]) => void
  
  // Estilo
  className?: string
  compact?: boolean
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const DivergenciasListOptimized = ({
  relatorioId,
  notaFiscalId,
  showFilters = true,
  showPagination = true,
  showInfiniteScroll = false,
  pageSize = 20,
  onDivergenciaClick,
  onExport,
  className = '',
  compact = false
}: DivergenciasListProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tipoFilter, setTipoFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Hook híbrido para divergências
  const {
    data: divergencias,
    isLoading,
    error,
    hasMore,
    totalCount,
    refresh,
    performance
  } = useDivergenciasHybrid(
    {
      relatorioId,
      notaFiscalId,
      status: statusFilter !== 'all' ? statusFilter : undefined
    },
    {
      strategy: showInfiniteScroll ? 'lazy' : 'hybrid',
      pageSize,
      enablePagination: showPagination,
      enableRealtime: true,
      staleTime: 30000 // 30 segundos
    }
  )

  // Infinite scroll se habilitado
  const infiniteScrollResult = useInfiniteScroll(
    {
      data: divergencias,
      isLoading,
      isLoadingMore: false,
      hasMore: hasMore || false,
      totalCount: totalCount || 0,
      currentPage,
      error,
      loadMore: async () => {
        // Implementar loadMore se necessário
      },
      loadPage: async (page: number) => {
        setCurrentPage(page)
      },
      refresh: async () => {
        await refresh()
      },
      reset: () => {
        setCurrentPage(1)
      }
    },
    {
      enabled: showInfiniteScroll,
      threshold: 100
    }
  )

  // Filtrar divergências localmente
  const filteredDivergencias = useMemo(() => {
    if (!divergencias) return []

    return divergencias.filter(divergencia => {
      // Filtro de busca
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = 
          divergencia.numero_nf?.toLowerCase().includes(searchLower) ||
          divergencia.fornecedor?.toLowerCase().includes(searchLower) ||
          divergencia.descricao?.toLowerCase().includes(searchLower) ||
          divergencia.tipo_divergencia?.toLowerCase().includes(searchLower)
        
        if (!matchesSearch) return false
      }

      // Filtro de tipo
      if (tipoFilter !== 'all' && divergencia.tipo_divergencia !== tipoFilter) {
        return false
      }

      return true
    })
  }, [divergencias, searchTerm, tipoFilter])

  // Obter tipos únicos para filtro
  const tiposDivergencia = useMemo(() => {
    if (!divergencias) return []
    const tipos = new Set(divergencias.map(d => d.tipo_divergencia).filter(Boolean))
    return Array.from(tipos)
  }, [divergencias])

  // Handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }, [])

  const handleStatusFilterChange = useCallback((status: string) => {
    setStatusFilter(status)
    setCurrentPage(1) // Reset para primeira página
  }, [])

  const handleTipoFilterChange = useCallback((tipo: string) => {
    setTipoFilter(tipo)
    setCurrentPage(1) // Reset para primeira página
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleDivergenciaClick = useCallback((divergencia: Divergencia) => {
    onDivergenciaClick?.(divergencia)
  }, [onDivergenciaClick])

  const handleExport = useCallback(() => {
    if (onExport && filteredDivergencias.length > 0) {
      onExport(filteredDivergencias)
    }
  }, [onExport, filteredDivergencias])

  // Renderizar status badge
  const renderStatusBadge = useCallback((status: string) => {
    const statusConfig = {
      pendente: { variant: 'secondary' as const, icon: Clock, label: 'Pendente' },
      resolvida: { variant: 'default' as const, icon: CheckCircle, label: 'Resolvida' },
      rejeitada: { variant: 'destructive' as const, icon: AlertTriangle, label: 'Rejeitada' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }, [])

  // Renderizar item da divergência
  const renderDivergenciaItem = useCallback((divergencia: Divergencia) => (
    <Card 
      key={divergencia.id} 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => handleDivergenciaClick(divergencia)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium text-sm">
                NF: {divergencia.numero_nf || divergencia.nota_fiscal_id}
              </h4>
              {renderStatusBadge(divergencia.status)}
            </div>
            
            <p className="text-sm text-muted-foreground mb-2">
              {divergencia.descricao}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {divergencia.tipo_divergencia}
              </span>
              
              {divergencia.fornecedor && (
                <span>Fornecedor: {divergencia.fornecedor}</span>
              )}
              
              {divergencia.volume_esperado && divergencia.volume_encontrado && (
                <span>
                  Volumes: {divergencia.volume_encontrado}/{divergencia.volume_esperado}
                </span>
              )}
            </div>
          </div>
          
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  ), [handleDivergenciaClick, renderStatusBadge])

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive mb-4">Erro ao carregar divergências</p>
          <Button onClick={refresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Cabeçalho com filtros */}
      {showFilters && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Divergências</span>
              <div className="flex items-center gap-2">
                {onExport && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={filteredDivergencias.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Busca */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por NF, fornecedor ou descrição..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Filtros */}
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">Todos os status</option>
                  <option value="pendente">Pendente</option>
                  <option value="resolvida">Resolvida</option>
                  <option value="rejeitada">Rejeitada</option>
                </select>
                
                <select
                  value={tipoFilter}
                  onChange={(e) => handleTipoFilterChange(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">Todos os tipos</option>
                  {tiposDivergencia.map(tipo => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de divergências */}
      <Card>
        <CardContent className="p-0">
          {isLoading && filteredDivergencias.length === 0 ? (
            <div className="p-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Carregando divergências...</p>
            </div>
          ) : filteredDivergencias.length === 0 ? (
            <div className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhuma divergência encontrada</p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-96">
                <div className="p-4 space-y-3">
                  {filteredDivergencias.map(renderDivergenciaItem)}
                </div>
              </ScrollArea>
              
              {/* Paginação */}
              {showPagination && !showInfiniteScroll && (
                <div className="p-4 border-t">
                  <PaginationOptimized
                    totalCount={totalCount || 0}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    isLoading={isLoading}
                    hasMore={hasMore}
                    onPageChange={handlePageChange}
                    onRefresh={refresh}
                    compact={compact}
                  />
                </div>
              )}
              
              {/* Indicador de carregamento para infinite scroll */}
              {showInfiniteScroll && isLoading && (
                <div className="p-4 text-center border-t">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Informações de performance (apenas em desenvolvimento) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-muted-foreground">
          Cache: {performance.cacheHit ? '✅' : '❌'} | 
          Estratégia: {performance.strategy} | 
          Tamanho: {Math.round(performance.dataSize / 1024)}KB
        </div>
      )}
    </div>
  )
}

// =====================================================
// COMPONENTE COMPACTO
// =====================================================

export const DivergenciasListCompact = (props: DivergenciasListProps) => {
  return (
    <DivergenciasListOptimized
      {...props}
      compact={true}
      showFilters={false}
      pageSize={10}
    />
  )
}
