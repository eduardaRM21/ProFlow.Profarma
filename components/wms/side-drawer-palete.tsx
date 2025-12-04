"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Package, MapPin, FileText, Calendar, X, ArrowRightLeft } from "lucide-react"
import type { WMSPalete, WMSPosicao, WMSCarga } from "@/lib/wms-service"
import type { NotaFiscal } from "@/lib/database-service"
import { obterSiglaRua } from "@/lib/wms-utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface SideDrawerPaleteProps {
  open: boolean
  onClose: () => void
  palete: WMSPalete | null
  posicao: WMSPosicao | null
  carga: WMSCarga | null
  notas: NotaFiscal[]
  onTransferir?: (paleteId: string) => void
  onDetalhes?: (paleteId: string) => void
}

export function SideDrawerPalete({
  open,
  onClose,
  palete,
  posicao,
  carga,
  notas,
  onTransferir,
  onDetalhes
}: SideDrawerPaleteProps) {
  if (!palete) return null

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            {palete.codigo_palete}
          </SheetTitle>
          <SheetDescription>
            Detalhes do palete e informações de armazenamento
          </SheetDescription>
        </SheetHeader>

        <div className="mt-3 space-y-6">
          {/* Status */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Status</h3>
            <Badge 
              variant="outline"
              className={
                palete.status === "armazenado" ? "bg-green-50 text-green-700 border-green-300" :
                palete.status === "em_montagem" ? "bg-yellow-50 text-yellow-700 border-yellow-300" :
                "bg-gray-50 text-gray-700 border-gray-300"
              }
            >
              {palete.status.replace("_", " ").toUpperCase()}
            </Badge>
          </div>

          {/* Posição */}
          {posicao && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Posição
              </h3>
              <div className="space-y-2">
                <p className="text-lg font-mono font-semibold">{posicao.codigo_posicao}</p>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>Rua: {obterSiglaRua(posicao.rua)}</span>
                  <span>Nível: {posicao.nivel}</span>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Carga */}
          {carga && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Carga</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Código:</strong> {carga.codigo_carga}</p>
                <p><strong>Cliente:</strong> {carga.cliente_destino}</p>
                <p><strong>Destino:</strong> {carga.destino}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Estatísticas */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Estatísticas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">Volumes</p>
                <p className="text-2xl font-bold text-gray-900">{palete.quantidade_volumes}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">NFs</p>
                <p className="text-2xl font-bold text-gray-900">{palete.quantidade_nfs}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notas Fiscais */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notas Fiscais ({notas.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notas.length === 0 ? (
                <div className="bg-gray-50 p-3 rounded-lg text-center text-gray-500 text-sm">
                  Nenhuma nota fiscal associada a este palete
                </div>
              ) : (
                notas.map((nota, index) => (
                  <div key={nota.id || index} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">NF: {nota.numeroNF || 'N/A'}</p>
                      <Badge variant="outline">{nota.volumes || 0} vol.</Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {nota.fornecedor || 'N/A'} → {nota.clienteDestino || 'N/A'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <Separator />

          {/* Datas */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Datas
            </h3>
            <div className="space-y-1 text-sm">
              <p>
                <strong>Criação:</strong>{" "}
                {format(new Date(palete.data_criacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
              {palete.data_armazenamento && (
                <p>
                  <strong>Armazenamento:</strong>{" "}
                  {format(new Date(palete.data_armazenamento), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              )}
              {posicao?.data_ocupacao && (
                <p>
                  <strong>Ocupação:</strong>{" "}
                  {format(new Date(posicao.data_ocupacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-4">
            {onTransferir && (
              <Button
                onClick={() => onTransferir(palete.id)}
                variant="outline"
                className="flex-1"
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transferir
              </Button>
            )}
            {onDetalhes && (
              <Button
                onClick={() => onDetalhes(palete.id)}
                variant="outline"
                className="flex-1"
              >
                Ver Detalhes
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

