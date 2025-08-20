"use client";

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
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isColetor ? 'max-w-sm mx-2' : 'max-w-2xl'}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-600" />
            <span>Confirmar Recebimento</span>
          </DialogTitle>
        </DialogHeader>

        <div className={`space-y-${isColetor ? '4' : '6'}`}>
          {/* Informações da Nota */}
          <div className={`bg-blue-50 p-${isColetor ? '3' : '4'} rounded-lg`}>
            <h3 className={`font-semibold text-gray-900 mb-${isColetor ? '2' : '3'} ${isColetor ? 'text-sm' : ''}`}>
              Dados da Nota Fiscal
            </h3>

            <div className={`grid ${isColetor ? 'grid-cols-1' : 'grid-cols-2'} gap-${isColetor ? '3' : '4'}`}>
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
              <div>
                <div className="text-sm text-gray-600">Data</div>
                <div className="font-medium">{nota.data}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Destino</div>
                <Badge variant="outline" className="bg-white">
                  {nota.destino}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-gray-600">Fornecedor</div>
                <div className="font-medium">{nota.fornecedor}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Cliente Destino</div>
                <div className="font-medium">{nota.clienteDestino}</div>
              </div>
              <div className={isColetor ? '' : 'col-span-2'}>
                <div className="text-sm text-gray-600">Tipo de Carga</div>
                <div className="font-medium">{nota.tipoCarga}</div>
              </div>
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
          <div className={`flex ${isColetor ? 'flex-col space-y-2' : 'space-x-4'}`}>
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
              onClick={onConfirmar}
              className={`flex-1 bg-green-600 hover:bg-green-700 text-white ${isColetor ? 'h-12 text-sm' : ''}`}
              size={isColetor ? "default" : "lg"}
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
