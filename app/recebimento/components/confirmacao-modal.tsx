"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle, Edit, FileText, Calendar, MapPin, Building2, User, Box } from "lucide-react";
import type { NotaFiscal } from "@/lib/database-service";
import { useIsColetor } from "@/hooks/use-coletor";
import { cn } from "@/lib/utils";

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
      <DialogContent 
        className={cn(
          "overflow-y-auto dark:bg-gray-950",
          isColetor 
            ? '!w-screen !h-screen !max-w-none !max-h-none !m-0 !rounded-none !p-6 flex flex-col !left-0 !right-0 !top-0 !bottom-0 !translate-x-0 !translate-y-0' 
            : 'max-w-2xl'
        )}
        onEscapeKeyDown={(e) => {
          // Permitir fechar com ESC
          onClose();
        }}
      >
        <DialogHeader className={cn(isColetor && "mb-1 flex-shrink-0")}>
          <DialogTitle className={cn("flex items-center space-x-2", isColetor && "text-xl")}>
            <Package className={cn("text-blue-600", isColetor ? "h-6 w-6" : "h-5 w-5")} />
            <span>Confirmar Recebimento</span>
          </DialogTitle>
          <DialogDescription className={cn(isColetor && "text-base mt-1")}>
            Verifique os dados antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className={cn("space-y-4", isColetor && "flex-1 flex flex-col min-h-0 overflow-y-auto")}>
          {/* Card Principal - Número da NF e Volumes (Destaque) */}
          <div className={cn(
            "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl shadow-lg",
            isColetor ? "p-5" : "p-3"
          )}>
            <div className={cn("flex items-center justify-between", isColetor ? "mb-4" : "mb-3")}>
              <div className="flex items-center space-x-2">
                <FileText className={cn("text-blue-100", isColetor ? "h-7 w-7" : "h-5 w-5")} />
                <span className={cn("font-semibold", isColetor ? "text-lg" : "text-sm")}>
                  Nota Fiscal
                </span>
              </div>
              <Badge variant="secondary" className={cn("bg-white/20 text-white border-white/30", isColetor && "text-base px-3 py-1")}>
                {nota.numeroNF}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className={cn("text-blue-100 mb-2", isColetor ? "text-base" : "text-xs")}>
                  Volumes
                </div>
                <div className={cn("font-bold text-white", isColetor ? "text-5xl" : "text-2xl")}>
                  {nota.volumes}
                </div>
              </div>
              <Box className={cn("text-blue-200", isColetor ? "h-16 w-16" : "h-10 w-10")} />
            </div>
          </div>

          {/* Informações Detalhadas */}
          <div className={cn(
            "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4",
            isColetor ? "p-5" : "p-4"
          )}>
            <h3 className={cn(
              "font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2",
              isColetor ? "text-lg" : "text-sm"
            )}>
              <Package className={cn("text-blue-600", isColetor ? "h-5 w-5" : "h-4 w-4")} />
              <span>Informações da Nota</span>
            </h3>

            <div className={cn("grid", isColetor ? "grid-cols-1 gap-4" : "grid-cols-2 gap-3")}>
              {/* Data */}
              <div className={cn("flex items-start space-x-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg", isColetor ? "p-4" : "p-2")}>
                <Calendar className={cn("text-blue-600 flex-shrink-0 mt-0.5", isColetor ? "h-6 w-6" : "h-4 w-4")} />
                <div className="flex-1 min-w-0">
                  <div className={cn("text-gray-600 dark:text-gray-400 mb-1", isColetor ? "text-sm font-medium" : "text-xs")}>
                    Data
                  </div>
                  <div className={cn("font-medium text-gray-900 dark:text-gray-100", isColetor ? "text-base" : "text-sm")}>
                    {nota.data}
                  </div>
                </div>
              </div>

              {/* Destino */}
              <div className={cn("flex items-start space-x-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg", isColetor ? "p-4" : "p-2")}>
                <MapPin className={cn("text-blue-600 flex-shrink-0 mt-0.5", isColetor ? "h-6 w-6" : "h-4 w-4")} />
                <div className="flex-1 min-w-0">
                  <div className={cn("text-gray-600 dark:text-gray-400 mb-1", isColetor ? "text-sm font-medium" : "text-xs")}>
                    Destino
                  </div>
                  <div className={cn("font-medium text-gray-900 dark:text-gray-100 truncate", isColetor ? "text-base" : "text-sm")} title={nota.destino}>
                    {nota.destino}
                  </div>
                </div>
              </div>

              {/* Fornecedor */}
              <div className={cn("flex items-start space-x-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg", isColetor ? "p-4" : "p-2")}>
                <Building2 className={cn("text-blue-600 flex-shrink-0 mt-0.5", isColetor ? "h-6 w-6" : "h-4 w-4")} />
                <div className="flex-1 min-w-0">
                  <div className={cn("text-gray-600 dark:text-gray-400 mb-1", isColetor ? "text-sm font-medium" : "text-xs")}>
                    Fornecedor
                  </div>
                  <div className={cn("font-medium text-gray-900 dark:text-gray-100 truncate", isColetor ? "text-base" : "text-sm")} title={nota.fornecedor}>
                    {nota.fornecedor}
                  </div>
                </div>
              </div>

              {/* Cliente Destino */}
              <div className={cn("flex items-start space-x-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg", isColetor ? "p-4" : "p-2")}>
                <User className={cn("text-blue-600 flex-shrink-0 mt-0.5", isColetor ? "h-6 w-6" : "h-4 w-4")} />
                <div className="flex-1 min-w-0">
                  <div className={cn("text-gray-600 dark:text-gray-400 mb-1", isColetor ? "text-sm font-medium" : "text-xs")}>
                    Cliente Destino
                  </div>
                  <div className={cn("font-medium text-gray-900 dark:text-gray-100 truncate", isColetor ? "text-base" : "text-sm")} title={nota.clienteDestino}>
                    {nota.clienteDestino}
                  </div>
                </div>
              </div>

              {/* Tipo de Carga */}
              {nota.tipoCarga && (
                <div className={cn("flex items-start space-x-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg", isColetor ? "p-4 col-span-1" : "p-2 col-span-2")}>
                  <Box className={cn("text-blue-600 flex-shrink-0 mt-0.5", isColetor ? "h-6 w-6" : "h-4 w-4")} />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-gray-600 dark:text-gray-400 mb-1", isColetor ? "text-sm font-medium" : "text-xs")}>
                      Tipo de Carga
                    </div>
                    <div className={cn("font-medium text-gray-900 dark:text-gray-100", isColetor ? "text-base" : "text-sm")}>
                      {nota.tipoCarga}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pergunta de Confirmação - Destaque */}
          <div className={cn(
            "text-center bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl",
            isColetor ? "p-6" : "p-4"
          )}>
            <CheckCircle className={cn("text-green-600 mx-auto mb-3", isColetor ? "h-10 w-10" : "h-8 w-8")} />
            <h3 className={cn("font-bold text-gray-900 dark:text-gray-100 mb-3", isColetor ? "text-xl" : "text-base")}>
              Os dados estão corretos?
            </h3>
            <p className={cn("text-gray-700 dark:text-gray-300", isColetor ? "text-base leading-relaxed" : "text-sm")}>
              Confirme se a nota <strong className="text-blue-600">{nota.numeroNF}</strong> possui{" "}
              <strong className="text-blue-600">{nota.volumes} volumes</strong> e está liberada para lançamento.
            </p>
          </div>

          {/* Código Completo - Colapsável */}
          <details className={cn(
            "bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden",
            isColetor && "text-base"
          )}>
            <summary className={cn(
              "cursor-pointer font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              isColetor ? "p-4 text-base" : "p-2 text-xs"
            )}>
              📋 Ver código completo
            </summary>
            <div className={cn("text-gray-600 dark:text-gray-400 font-mono break-all", isColetor ? "p-4 pt-0 text-sm" : "p-3 pt-0 text-xs")}>
              {nota.codigoCompleto}
            </div>
          </details>

          {/* Botões de Ação */}
          <div className={cn(
            "flex gap-4 flex-shrink-0",
            isColetor ? "flex-col mt-2" : "space-x-4"
          )}>
            <Button
              onClick={onAlterar}
              variant="outline"
              className={cn(
                "border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-900/20",
                isColetor ? "w-full h-16 text-lg font-bold" : "flex-1"
              )}
              size={isColetor ? "lg" : "lg"}
            >
              <Edit className={cn("mr-2", isColetor ? "h-6 w-6" : "h-4 w-4")} />
              ALTERAR DADOS
            </Button>
            <Button
              ref={confirmarButtonRef}
              onClick={onConfirmar}
              onKeyDown={handleKeyDown}
              className={cn(
                "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all",
                isColetor ? "w-full h-16 text-lg font-bold" : "flex-1"
              )}
              size={isColetor ? "lg" : "lg"}
              autoFocus
            >
              <CheckCircle className={cn("mr-2", isColetor ? "h-6 w-6" : "h-4 w-4")} />
              CONFIRMAR ✓
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
