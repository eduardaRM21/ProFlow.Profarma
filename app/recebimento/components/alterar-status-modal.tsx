"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertTriangle, CheckCircle, Edit } from "lucide-react"
import type { NotaFiscal } from "@/lib/database-service"
import { useIsColetor } from "@/hooks/use-coletor"

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
      <DialogContent className={`${isColetor ? 'max-w-sm mx-2 coletor-confirmation-modal' : 'max-w-md'}`}>
        <DialogHeader className={`${isColetor ? 'coletor-modal-header' : ''}`}>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5 text-blue-600" />
            <span>Alterar Status da Nota</span>
          </DialogTitle>
          <DialogDescription>
            Selecione o novo status para a nota fiscal {nota.numeroNF}.
          </DialogDescription>
        </DialogHeader>

        <div className={`space-y-${isColetor ? '4' : '6'} ${isColetor ? 'coletor-modal-content' : ''}`}>
          {/* Informações da Nota */}
          <div className={`bg-blue-50 p-${isColetor ? '3' : '4'} rounded-lg`}>
            <h3 className={`font-semibold text-gray-900 mb-${isColetor ? '2' : '3'} ${isColetor ? 'text-sm' : ''}`}>
              Nota Fiscal: {nota.numeroNF}
            </h3>
            <div className={`text-sm ${isColetor ? 'text-xs' : ''}`}>
              <div><strong>Status Atual:</strong> {isOk ? "OK" : "Divergência"}</div>
              <div><strong>Volumes:</strong> {nota.divergencia?.volumesInformados || nota.volumes}</div>
              <div><strong>Fornecedor:</strong> {nota.fornecedor}</div>
            </div>
          </div>

          {/* Opções de Status */}
          <div className="space-y-3">
            {isOk ? (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className={`${isColetor ? 'text-xs' : 'text-sm'} text-gray-700 mb-3`}>
                  A nota está marcada como <strong>OK</strong>. Deseja alterar para <strong>Divergência</strong>?
                </p>
                <Button
                  onClick={onAlterarParaDivergencia}
                  className={`w-full bg-orange-600 hover:bg-orange-700 text-white ${isColetor ? 'h-12 text-sm' : ''}`}
                  size={isColetor ? "default" : "lg"}
                >
                  <AlertTriangle className={`${isColetor ? 'h-4 w-4' : 'h-5 w-5'} mr-2`} />
                  Alterar para Divergência
                </Button>
              </div>
            ) : (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className={`${isColetor ? 'text-xs' : 'text-sm'} text-gray-700 mb-3`}>
                  A nota está marcada como <strong>Divergência</strong>. Deseja alterar para <strong>OK</strong>?
                </p>
                {nota.divergencia && (
                  <div className={`${isColetor ? 'text-xs' : 'text-sm'} text-orange-600 mb-3 p-2 bg-orange-100 rounded`}>
                    <strong>Divergência atual:</strong> {nota.divergencia.observacoes}
                  </div>
                )}
                <Button
                  onClick={onAlterarParaOk}
                  className={`w-full bg-green-600 hover:bg-green-700 text-white ${isColetor ? 'h-12 text-sm' : ''}`}
                  size={isColetor ? "default" : "lg"}
                >
                  <CheckCircle className={`${isColetor ? 'h-4 w-4' : 'h-5 w-5'} mr-2`} />
                  Alterar para OK
                </Button>
              </div>
            )}
          </div>

          {/* Botão Cancelar */}
          <Button
            onClick={onClose}
            variant="outline"
            className={`w-full ${isColetor ? 'h-12 text-sm' : ''}`}
            size={isColetor ? "default" : "lg"}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

