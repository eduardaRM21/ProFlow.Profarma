"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle, Edit } from "lucide-react";
import type { NotaFiscal } from "@/lib/database-service";
import { useIsColetor } from "@/hooks/use-coletor";

interface ConfirmacaoModalProps {
  isOpen: boolean;
  nota: NotaFiscal;
  onConfirmar: () => void;
  onAlterar: () => void;
  onClose: () => void;
}

export default function ConfirmacaoModal({
  isOpen,
  nota,
  onConfirmar,
  onAlterar,
  onClose,
}: ConfirmacaoModalProps) {
  const isColetor = useIsColetor();
  const confirmarButtonRef = useRef<HTMLButtonElement>(null);

  // Garantir foco automático no botão de confirmar quando o modal abrir
  useEffect(() => {
    if (isOpen && confirmarButtonRef.current) {
      // Pequeno delay para garantir que o modal esteja totalmente renderizado
      const timer = setTimeout(() => {
        confirmarButtonRef.current?.focus();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handler para tecla Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onConfirmar();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isColetor ? 'max-w-sm mx-2 coletor-confirmation-modal' : 'max-w-2xl'}`}>
        <DialogHeader className={`${isColetor ? 'coletor-modal-header' : ''}`}>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-600" />
            <span>Confirmar Recebimento</span>
          </DialogTitle>
        </DialogHeader>

        <div className={`space-y-${isColetor ? '4' : '6'} ${isColetor ? 'coletor-modal-content' : ''}`}>
          {/* Informações da Nota */}
          <div className={`bg-blue-50 p-${isColetor ? '3' : '4'} rounded-lg`}>
            <h3 className={`font-semibold text-gray-900 mb-${isColetor ? '2' : '3'} ${isColetor ? 'text-sm' : ''}`}>
              Dados da Nota Fiscal
            </h3>

            <div className={`grid ${isColetor ? 'grid-cols-2' : 'grid-cols-2'} gap-${isColetor ? '3' : '4'}`}>
              {/* Primeira linha - Número da NF e Volumes */}
              <div>
                <div className="text-sm text-gray-600">Número da NF</div>
                <div className="font-semibold text-lg">{nota.numeroNF}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Volumes</div>
                <div className="font-semibold text-lg text-blue-600">
                  {nota.volumes}
                </div>
              </div>
              
              {/* Segunda linha - Data e Destino */}
              <div>
                <div className="text-sm text-gray-600">Data</div>
                <div className="font-medium text-xs truncate">{nota.data}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Destino</div>
                <div className="font-medium text-xs truncate">
                  {nota.destino}
                </div>  
              </div>
              
              {/* Terceira linha - Fornecedor e Cliente Destino */}
              <div>
                <div className="text-sm text-gray-600">Fornecedor</div>
                <div className="font-medium text-xs truncate" title={nota.fornecedor}>
                  {nota.fornecedor}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Cliente Destino</div>
                <div className="font-medium text-xs truncate" title={nota.clienteDestino}>
                  {nota.clienteDestino}
                </div>
              </div>
              
              {/* Tipo de Carga - apenas na versão desktop */}
              {!isColetor && (
                <div className="col-span-2">
                  <div className="text-sm text-gray-600">Tipo de Carga</div>
                  <div className="font-medium">{nota.tipoCarga}</div>
                </div>
              )}
            </div>
          </div>

          {/* Pergunta de Confirmação */}
          <div className="text-center">
            <h3 className={`${isColetor ? 'text-base' : 'text-lg'} font-semibold text-gray-900 mb-2`}>
              Os dados estão corretos?
            </h3>
            <p className={`${isColetor ? 'text-xs' : 'text-sm'} text-gray-600`}>
              Confirme se a nota <strong>{nota.numeroNF}</strong> possui{" "}
              <strong>{nota.volumes} volumes</strong> e está liberada para
              lançamento?
            </p>
          </div>

          {/* Botões */}
          <div className={`flex ${isColetor ? 'flex-col space-y-2 coletor-modal-buttons' : 'space-x-4'}`}>
            <Button
              onClick={onAlterar}
              variant="outline"
              className={`flex-1 border-orange-300 text-orange-700 hover:bg-orange-50 bg-transparent ${isColetor ? 'h-12 text-sm' : ''}`}
              size={isColetor ? "default" : "lg"}
            >
              <Edit className={`${isColetor ? 'h-4 w-4' : 'h-5 w-5'} mr-2`} />
              ALTERAR
            </Button>
            <Button
              ref={confirmarButtonRef}
              onClick={onConfirmar}
              onKeyDown={handleKeyDown}
              className={`flex-1 bg-green-600 hover:bg-green-700 text-white ${isColetor ? 'h-12 text-sm' : ''}`}
              size={isColetor ? "default" : "lg"}
              autoFocus
            >
              <CheckCircle className={`${isColetor ? 'h-4 w-4' : 'h-5 w-5'} mr-2`} />
              OK - Confirmar
            </Button>
          </div>

          {/* Código Completo */}
          <div className={`${isColetor ? 'text-xs' : 'text-xs'} text-gray-500 bg-gray-50 p-2 rounded font-mono break-all`}>
            <strong>Código:</strong> {nota.codigoCompleto}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
