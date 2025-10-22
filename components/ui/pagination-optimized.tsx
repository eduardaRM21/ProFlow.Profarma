"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  RefreshCw
} from 'lucide-react'

// =====================================================
// TIPOS PARA PAGINAÇÃO
// =====================================================

interface PaginationProps {
  // Dados
  totalCount: number
  currentPage: number
  pageSize: number
  
  // Estados
  isLoading?: boolean
  hasMore?: boolean
  
  // Callbacks
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onRefresh?: () => void
  
  // Opções
  showPageSizeSelector?: boolean
  showRefreshButton?: boolean
  showPageInput?: boolean
  pageSizeOptions?: number[]
  
  // Estilo
  className?: string
  compact?: boolean
}

interface PaginationInfo {
  totalPages: number
  startItem: number
  endItem: number
  hasPrevious: boolean
  hasNext: boolean
  isFirstPage: boolean
  isLastPage: boolean
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const PaginationOptimized = ({
  totalCount,
  currentPage,
  pageSize,
  isLoading = false,
  hasMore = false,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  showPageSizeSelector = true,
  showRefreshButton = true,
  showPageInput = true,
  pageSizeOptions = [10, 20, 50, 100],
  className = '',
  compact = false
}: PaginationProps) => {
  const [pageInput, setPageInput] = useState(currentPage.toString())

  // Calcular informações de paginação
  const paginationInfo: PaginationInfo = {
    totalPages: Math.ceil(totalCount / pageSize),
    startItem: (currentPage - 1) * pageSize + 1,
    endItem: Math.min(currentPage * pageSize, totalCount),
    hasPrevious: currentPage > 1,
    hasNext: currentPage < Math.ceil(totalCount / pageSize),
    isFirstPage: currentPage === 1,
    isLastPage: currentPage >= Math.ceil(totalCount / pageSize)
  }

  // Atualizar input quando página mudar
  useEffect(() => {
    setPageInput(currentPage.toString())
  }, [currentPage])

  // Navegação
  const goToFirstPage = useCallback(() => {
    if (!paginationInfo.isFirstPage && !isLoading) {
      onPageChange(1)
    }
  }, [paginationInfo.isFirstPage, isLoading, onPageChange])

  const goToPreviousPage = useCallback(() => {
    if (paginationInfo.hasPrevious && !isLoading) {
      onPageChange(currentPage - 1)
    }
  }, [paginationInfo.hasPrevious, currentPage, isLoading, onPageChange])

  const goToNextPage = useCallback(() => {
    if (paginationInfo.hasNext && !isLoading) {
      onPageChange(currentPage + 1)
    }
  }, [paginationInfo.hasNext, currentPage, isLoading, onPageChange])

  const goToLastPage = useCallback(() => {
    if (!paginationInfo.isLastPage && !isLoading) {
      onPageChange(paginationInfo.totalPages)
    }
  }, [paginationInfo.isLastPage, paginationInfo.totalPages, isLoading, onPageChange])

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= paginationInfo.totalPages && page !== currentPage && !isLoading) {
      onPageChange(page)
    }
  }, [paginationInfo.totalPages, currentPage, isLoading, onPageChange])

  // Handler para input de página
  const handlePageInputChange = useCallback((value: string) => {
    setPageInput(value)
  }, [])

  const handlePageInputSubmit = useCallback(() => {
    const page = parseInt(pageInput)
    if (!isNaN(page)) {
      goToPage(page)
    } else {
      setPageInput(currentPage.toString())
    }
  }, [pageInput, goToPage, currentPage])

  const handlePageInputKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit()
    }
  }, [handlePageInputSubmit])

  // Handler para mudança de tamanho da página
  const handlePageSizeChange = useCallback((newPageSize: string) => {
    const size = parseInt(newPageSize)
    if (onPageSizeChange && size !== pageSize) {
      onPageSizeChange(size)
    }
  }, [onPageSizeChange, pageSize])

  // Gerar números de página para exibição
  const getPageNumbers = useCallback(() => {
    const pages: (number | string)[] = []
    const totalPages = paginationInfo.totalPages
    
    if (totalPages <= 7) {
      // Mostrar todas as páginas se forem poucas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Lógica para muitas páginas
      pages.push(1)
      
      if (currentPage > 4) {
        pages.push('...')
      }
      
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (currentPage < totalPages - 3) {
        pages.push('...')
      }
      
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }
    
    return pages
  }, [paginationInfo.totalPages, currentPage])

  if (totalCount === 0) {
    return null
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Informações da página */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        {!compact && (
          <>
            <span>
              Mostrando {paginationInfo.startItem} a {paginationInfo.endItem} de {totalCount} itens
            </span>
            {hasMore && (
              <span className="text-blue-600">
                (mais disponíveis)
              </span>
            )}
          </>
        )}
      </div>

      {/* Controles de paginação */}
      <div className="flex items-center space-x-2">
        {/* Botão de refresh */}
        {showRefreshButton && onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}

        {/* Seletor de tamanho da página */}
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center space-x-2">
            <Label htmlFor="page-size" className="text-sm">
              Por página:
            </Label>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-8 w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map(size => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Navegação */}
        <div className="flex items-center space-x-1">
          {/* Primeira página */}
          <Button
            variant="outline"
            size="sm"
            onClick={goToFirstPage}
            disabled={paginationInfo.isFirstPage || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Página anterior */}
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={!paginationInfo.hasPrevious || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Números das páginas */}
          {!compact && (
            <div className="flex items-center space-x-1">
              {getPageNumbers().map((page, index) => (
                <div key={index}>
                  {typeof page === 'number' ? (
                    <Button
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      disabled={isLoading}
                      className="h-8 w-8 p-0"
                    >
                      {page}
                    </Button>
                  ) : (
                    <span className="px-2 text-sm text-muted-foreground">
                      {page}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Próxima página */}
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={!paginationInfo.hasNext || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Última página */}
          <Button
            variant="outline"
            size="sm"
            onClick={goToLastPage}
            disabled={paginationInfo.isLastPage || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Input de página */}
        {showPageInput && !compact && (
          <div className="flex items-center space-x-2">
            <Label htmlFor="page-input" className="text-sm">
              Página:
            </Label>
            <Input
              id="page-input"
              type="number"
              min="1"
              max={paginationInfo.totalPages}
              value={pageInput}
              onChange={(e) => handlePageInputChange(e.target.value)}
              onKeyPress={handlePageInputKeyPress}
              onBlur={handlePageInputSubmit}
              disabled={isLoading}
              className="h-8 w-16 text-center"
            />
            <span className="text-sm text-muted-foreground">
              de {paginationInfo.totalPages}
            </span>
          </div>
        )}

        {/* Indicador de carregamento */}
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  )
}

// =====================================================
// COMPONENTE COMPACTO
// =====================================================

export const PaginationCompact = (props: PaginationProps) => {
  return (
    <PaginationOptimized
      {...props}
      compact={true}
      showPageInput={false}
      showPageSizeSelector={false}
    />
  )
}

// =====================================================
// HOOK PARA PAGINAÇÃO
// =====================================================

export const usePagination = (
  totalCount: number,
  initialPageSize: number = 20
) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const totalPages = Math.ceil(totalCount / pageSize)
  const hasMore = currentPage < totalPages
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }, [totalPages])

  const goToNextPage = useCallback(() => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1)
    }
  }, [hasMore])

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }, [currentPage])

  const changePageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset para primeira página
  }, [])

  const reset = useCallback(() => {
    setCurrentPage(1)
    setPageSize(initialPageSize)
  }, [initialPageSize])

  return {
    currentPage,
    pageSize,
    totalPages,
    hasMore,
    startItem,
    endItem,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    changePageSize,
    reset
  }
}
