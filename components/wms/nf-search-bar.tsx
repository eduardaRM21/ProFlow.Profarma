"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Loader2 } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { WMSService } from "@/lib/wms-service"
import type { NotaFiscal } from "@/lib/database-service"

interface NFSearchBarProps {
  onResult?: (result: {
    palete: any
    posicao: any
    carga: any
    notas_palete: NotaFiscal[]
  }) => void
  placeholder?: string
  className?: string
}

export function NFSearchBar({ onResult, placeholder = "Buscar por número da NF...", className }: NFSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const debouncedSearch = useDebounce(searchTerm, 500)

  useEffect(() => {
    if (debouncedSearch.trim().length >= 3) {
      handleSearch(debouncedSearch)
    } else if (debouncedSearch.trim().length === 0 && onResult) {
      onResult({
        palete: null,
        posicao: null,
        carga: null,
        notas_palete: []
      })
    }
  }, [debouncedSearch])

  const handleSearch = async (term: string) => {
    if (term.trim().length < 3) return

    setIsSearching(true)
    try {
      const result = await WMSService.buscarPorNotaFiscal(term.trim())
      if (onResult) {
        onResult(result)
      }
    } catch (error) {
      console.error("Erro ao buscar NF:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim().length >= 3) {
      handleSearch(searchTerm)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>
    </form>
  )
}

