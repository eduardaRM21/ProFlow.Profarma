"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertTriangle, CheckCircle, Edit, FileText, Box, Building2, ArrowRight } from "lucide-react"
import type { NotaFiscal } from "@/lib/database-service"
import { useIsColetor } from "@/hooks/use-coletor"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface AlterarStatusModalProps {
  isOpen: boolean
  nota: NotaFiscal
  onAlterarParaDivergencia: () => void
  onAlterarParaOk: () => void
  onClose: () => void
}

export default function AlterarStatusModal({
  isOpen,
  nota,
  onAlterarParaDivergencia,
  onAlterarParaOk,
  onClose,
}: AlterarStatusModalProps) {
  const isColetor = useIsColetor()
  const isOk = nota.status === "ok"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "overflow-y-auto dark:bg-gray-950",
          isColetor 
            ? '!w-screen !h-screen !max-w-none !max-h-none !m-0 !rounded-none !p-6 flex flex-col !left-0 !right-0 !top-0 !bottom-0 !translate-x-0 !translate-y-0' 
            : 'max-w-md'
        )}
      >
        <DialogHeader className={cn(isColetor && "mb-6 flex-shrink-0")}>
          <DialogTitle className={cn("flex items-center space-x-2", isColetor && "text-xl")}>
            <Edit className={cn("text-blue-600", isColetor ? "h-6 w-6" : "h-5 w-5")} />
            <span>Alterar Status da Nota</span>
          </DialogTitle>
          <DialogDescription className={cn(isColetor && "text-base mt-2")}>
            Selecione o novo status para a nota fiscal {nota.numeroNF}.
          </DialogDescription>
        </DialogHeader>

        <div className={cn("space-y-5", isColetor && "flex-1 flex flex-col min-h-0 overflow-y-auto")}>
          {/* Card Principal - Nota Fiscal */}
          <div className={cn(
            "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl shadow-lg",
            isColetor ? "p-6" : "p-4"
          )}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FileText className={cn("text-blue-100", isColetor ? "h-7 w-7" : "h-5 w-5")} />
                <span className={cn("font-semibold", isColetor ? "text-lg" : "text-sm")}>
                  Nota Fiscal
                </span>
              </div>
              <div className={cn("font-bold text-white", isColetor ? "text-2xl" : "text-xl")}>
                {nota.numeroNF}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className={cn("text-blue-100 mb-2", isColetor ? "text-base" : "text-xs")}>
                  Volumes
                </div>
                <div className={cn("font-bold text-white", isColetor ? "text-5xl" : "text-2xl")}>
                  {nota.divergencia?.volumesInformados || nota.volumes}
                </div>
              </div>
              <Box className={cn("text-blue-200", isColetor ? "h-16 w-16" : "h-10 w-10")} />
            </div>
          </div>

          {/* Status Atual */}
          <div className={cn(
            "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl",
            isColetor ? "p-5" : "p-4"
          )}>
            <h3 className={cn(
              "font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2",
              isColetor ? "text-lg" : "text-sm"
            )}>
              <Edit className={cn("text-blue-600", isColetor ? "h-5 w-5" : "h-4 w-4")} />
              <span>Status Atual</span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={cn("text-gray-600 dark:text-gray-400", isColetor ? "text-base" : "text-sm")}>
                  Status:
                </span>
                <Badge 
                  variant={isOk ? "default" : "destructive"}
                  className={cn(
                    isOk 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
                    isColetor && "text-base px-3 py-1"
                  )}
                >
                  {isOk ? "OK" : "Divergência"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className={cn("text-gray-600 dark:text-gray-400", isColetor ? "text-base" : "text-sm")}>
                  Fornecedor:
                </span>
                <span className={cn("font-medium text-gray-900 dark:text-gray-100 truncate max-w-[60%]", isColetor ? "text-base" : "text-sm")} title={nota.fornecedor}>
                  {nota.fornecedor}
                </span>
              </div>
            </div>
          </div>

          {/* Opções de Status */}
          <div className="space-y-4">
            {isOk ? (
              <div className={cn(
                "bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl",
                isColetor ? "p-6" : "p-4"
              )}>
                <div className="flex items-center space-x-2 mb-4">
                  <AlertTriangle className={cn("text-orange-600", isColetor ? "h-6 w-6" : "h-5 w-5")} />
                  <h4 className={cn("font-bold text-gray-900 dark:text-gray-100", isColetor ? "text-lg" : "text-base")}>
                    Alterar para Divergência
                  </h4>
                </div>
                <p className={cn("text-gray-700 dark:text-gray-300 mb-4", isColetor ? "text-base leading-relaxed" : "text-sm")}>
                  A nota está marcada como <strong className="text-green-600">OK</strong>. Deseja alterar para <strong className="text-orange-600">Divergência</strong>?
                </p>
                <Button
                  onClick={onAlterarParaDivergencia}
                  className={cn(
                    "w-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl transition-all",
                    isColetor ? "h-16 text-lg font-bold" : ""
                  )}
                  size={isColetor ? "lg" : "lg"}
                >
                  <AlertTriangle className={cn("mr-2", isColetor ? "h-6 w-6" : "h-5 w-5")} />
                  Alterar para Divergência
                </Button>
              </div>
            ) : (
              <div className={cn(
                "bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl",
                isColetor ? "p-6" : "p-4"
              )}>
                <div className="flex items-center space-x-2 mb-4">
                  <CheckCircle className={cn("text-green-600", isColetor ? "h-6 w-6" : "h-5 w-5")} />
                  <h4 className={cn("font-bold text-gray-900 dark:text-gray-100", isColetor ? "text-lg" : "text-base")}>
                    Alterar para OK
                  </h4>
                </div>
                <p className={cn("text-gray-700 dark:text-gray-300 mb-4", isColetor ? "text-base leading-relaxed" : "text-sm")}>
                  A nota está marcada como <strong className="text-orange-600">Divergência</strong>. Deseja alterar para <strong className="text-green-600">OK</strong>?
                </p>
                {nota.divergencia && (
                  <div className={cn(
                    "mb-4 p-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg",
                    isColetor ? "text-base" : "text-sm"
                  )}>
                    <div className="font-semibold text-orange-700 dark:text-orange-300 mb-1">
                      Divergência atual:
                    </div>
                    <div className="text-orange-600 dark:text-orange-400">
                      {nota.divergencia.observacoes}
                    </div>
                  </div>
                )}
                <Button
                  onClick={onAlterarParaOk}
                  className={cn(
                    "w-full bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all",
                    isColetor ? "h-16 text-lg font-bold" : ""
                  )}
                  size={isColetor ? "lg" : "lg"}
                >
                  <CheckCircle className={cn("mr-2", isColetor ? "h-6 w-6" : "h-5 w-5")} />
                  Alterar para OK
                </Button>
              </div>
            )}
          </div>

          {/* Botão Cancelar */}
          <Button
            onClick={onClose}
            variant="outline"
            className={cn(
              "w-full",
              isColetor ? "h-16 text-lg font-semibold" : ""
            )}
            size={isColetor ? "lg" : "lg"}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

