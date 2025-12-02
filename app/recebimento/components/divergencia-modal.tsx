"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, CheckCircle, FileText, Box, Building2, MapPin, Calendar, ArrowRight } from "lucide-react"
import type { NotaFiscal } from "@/lib/database-service"
import { useIsColetor } from "@/hooks/use-coletor"
import { cn } from "@/lib/utils"

interface TipoDivergencia {
  codigo: string
  descricao: string
}

interface DivergenciaModalProps {
  isOpen: boolean
  nota: NotaFiscal
  tiposDivergencia: TipoDivergencia[]
  onConfirmar: (tipoDivergencia: string, volumesInformados: number) => void
  onClose: () => void
}

export default function DivergenciaModal({
  isOpen,
  nota,
  tiposDivergencia,
  onConfirmar,
  onClose,
}: DivergenciaModalProps) {
  const isColetor = useIsColetor();
  const [volumesInformados, setVolumesInformados] = useState(nota.volumes.toString())
  const [tipoDivergencia, setTipoDivergencia] = useState("")
  const [modalConfirmacao, setModalConfirmacao] = useState(false)

  const handleSubmit = () => {
    const volumes = Number.parseInt(volumesInformados)

    if (isNaN(volumes) || volumes < 0) {
      alert("Por favor, informe uma quantidade válida de volumes.")
      return
    }

    if (!tipoDivergencia) {
      alert("Por favor, selecione o tipo de divergência.")
      return
    }

    setModalConfirmacao(true)
  }

  const confirmarDivergencia = () => {
    const volumes = Number.parseInt(volumesInformados)
    onConfirmar(tipoDivergencia, volumes)
    setModalConfirmacao(false)
    resetForm()
  }

  const resetForm = () => {
    setVolumesInformados(nota.volumes.toString())
    setTipoDivergencia("")
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const tipoSelecionado = tiposDivergencia.find((t) => t.codigo === tipoDivergencia)

  return (
    <>
      {/* Modal Principal de Divergência */}
      <Dialog open={isOpen && !modalConfirmacao} onOpenChange={handleClose}>
        <DialogContent 
          className={cn(
            "overflow-y-auto dark:bg-gray-950",
            isColetor 
              ? '!w-screen !h-screen !max-w-none !max-h-none !m-0 !rounded-none !p-6 flex flex-col !left-0 !right-0 !top-0 !bottom-0 !translate-x-0 !translate-y-0' 
              : 'max-w-2xl'
          )}
        >
          <DialogHeader className={cn(isColetor && "mb-6 flex-shrink-0")}>
            <DialogTitle className={cn("flex items-center space-x-2", isColetor && "text-xl")}>
              <AlertTriangle className={cn("text-orange-600", isColetor ? "h-6 w-6" : "h-5 w-5")} />
              <span>Informar Divergência</span>
            </DialogTitle>
            <DialogDescription className={cn(isColetor && "text-base mt-2")}>
              Informe os detalhes da divergência encontrada na nota fiscal.
            </DialogDescription>
          </DialogHeader>

          <div className={cn("space-y-5", isColetor && "flex-1 flex flex-col min-h-0 overflow-y-auto")}>
            {/* Card Principal - Nota Fiscal */}
            <div className={cn(
              "bg-gradient-to-br from-orange-600 to-orange-700 text-white rounded-xl shadow-lg",
              isColetor ? "p-6" : "p-4"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <FileText className={cn("text-orange-100", isColetor ? "h-7 w-7" : "h-5 w-5")} />
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
                  <div className={cn("text-orange-100 mb-2", isColetor ? "text-base" : "text-xs")}>
                    Volumes Originais
                  </div>
                  <div className={cn("font-bold text-white", isColetor ? "text-5xl" : "text-2xl")}>
                    {nota.volumes}
                  </div>
                </div>
                <Box className={cn("text-orange-200", isColetor ? "h-16 w-16" : "h-10 w-10")} />
              </div>
            </div>

            {/* Informações Detalhadas */}
            <div className={cn(
              "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl",
              isColetor ? "p-5" : "p-4"
            )}>
              <h3 className={cn(
                "font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2",
                isColetor ? "text-lg" : "text-sm"
              )}>
                <AlertTriangle className={cn("text-orange-600", isColetor ? "h-5 w-5" : "h-4 w-4")} />
                <span>Informações da Nota</span>
              </h3>

              <div className={cn("grid gap-4", isColetor ? "grid-cols-1" : "grid-cols-2")}>
                {/* Fornecedor */}
                <div className={cn("flex items-start space-x-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg", isColetor ? "p-4" : "p-2")}>
                  <Building2 className={cn("text-orange-600 flex-shrink-0 mt-0.5", isColetor ? "h-6 w-6" : "h-4 w-4")} />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-gray-600 dark:text-gray-400 mb-1", isColetor ? "text-sm font-medium" : "text-xs")}>
                      Fornecedor
                    </div>
                    <div className={cn("font-medium text-gray-900 dark:text-gray-100 truncate", isColetor ? "text-base" : "text-sm")} title={nota.fornecedor}>
                      {nota.fornecedor}
                    </div>
                  </div>
                </div>

                {/* Destino */}
                <div className={cn("flex items-start space-x-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg", isColetor ? "p-4" : "p-2")}>
                  <MapPin className={cn("text-orange-600 flex-shrink-0 mt-0.5", isColetor ? "h-6 w-6" : "h-4 w-4")} />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-gray-600 dark:text-gray-400 mb-1", isColetor ? "text-sm font-medium" : "text-xs")}>
                      Destino
                    </div>
                    <div className={cn("font-medium text-gray-900 dark:text-gray-100 truncate", isColetor ? "text-base" : "text-sm")}>
                      {nota.destino}
                    </div>
                  </div>
                </div>

                {/* Data */}
                <div className={cn("flex items-start space-x-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg", isColetor ? "p-4 col-span-1" : "p-2 col-span-2")}>
                  <Calendar className={cn("text-orange-600 flex-shrink-0 mt-0.5", isColetor ? "h-6 w-6" : "h-4 w-4")} />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-gray-600 dark:text-gray-400 mb-1", isColetor ? "text-sm font-medium" : "text-xs")}>
                      Data
                    </div>
                    <div className={cn("font-medium text-gray-900 dark:text-gray-100", isColetor ? "text-base" : "text-sm")} title={nota.data}>
                      {nota.data}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulário de Divergência */}
            <div className={cn(
              "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-5",
              isColetor ? "p-5" : "p-4"
            )}>
              <h3 className={cn(
                "font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2",
                isColetor ? "text-lg" : "text-sm"
              )}>
                <AlertTriangle className={cn("text-orange-600", isColetor ? "h-5 w-5" : "h-4 w-4")} />
                <span>Informar Divergência</span>
              </h3>

              <div className="space-y-5">
                {/* Campo de Volumes */}
                <div>
                  <Label htmlFor="volumes" className={cn(isColetor && "text-base font-semibold mb-2 block")}>
                    Quantidade de Volumes Recebidos *
                  </Label>
                  <Input
                    id="volumes"
                    type="number"
                    min="0"
                    value={volumesInformados}
                    onChange={(e) => setVolumesInformados(e.target.value)}
                    className={cn(
                      "text-lg font-semibold",
                      isColetor && "h-14 text-xl"
                    )}
                    placeholder="Informe a quantidade real recebida"
                  />
                  <div className={cn("mt-2 flex items-center space-x-2", isColetor && "text-base")}>
                    <span className="text-gray-500">Original:</span>
                    <span className="font-semibold text-red-600">{nota.volumes} volumes</span>
                  </div>
                </div>

                {/* Campo de Tipo de Divergência */}
                <div>
                  <Label htmlFor="tipoDivergencia" className={cn(isColetor && "text-base font-semibold mb-2 block")}>
                    Tipo de Divergência *
                  </Label>
                  <Select value={tipoDivergencia} onValueChange={setTipoDivergencia}>
                    <SelectTrigger className={cn(isColetor && "h-14 text-base")}>
                      <SelectValue placeholder="Selecione o tipo de divergência" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 z-[110]">
                      {tiposDivergencia.map((tipo) => (
                        <SelectItem key={tipo.codigo} value={tipo.codigo}>
                          <div className="flex items-center space-x-2">
                            <span className={cn("font-mono bg-gray-100 px-2 py-1 rounded", isColetor ? "text-sm" : "text-xs")}>
                              {tipo.codigo}
                            </span>
                            <span className={isColetor ? "text-base" : "text-sm"}>{tipo.descricao}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Resumo da Divergência */}
            {tipoDivergencia && (
              <div className={cn(
                "bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl",
                isColetor ? "p-6" : "p-4"
              )}>
                <h4 className={cn(
                  "font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2",
                  isColetor ? "text-lg" : "text-base"
                )}>
                  <AlertTriangle className={cn("text-yellow-600", isColetor ? "h-6 w-6" : "h-5 w-5")} />
                  <span>Resumo da Divergência</span>
                </h4>
                <div className={cn("space-y-3", isColetor ? "text-base" : "text-sm")}>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Tipo:</span>
                    <span className="font-mono bg-yellow-100 dark:bg-yellow-900/40 px-2 py-1 rounded text-sm">
                      {tipoDivergencia}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">- {tipoSelecionado?.descricao}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Volumes:</span>
                    <span className="text-red-600 font-bold">{nota.volumes}</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <span className="text-green-600 font-bold">{volumesInformados}</span>
                    {Number.parseInt(volumesInformados) !== nota.volumes && (
                      <span className={cn(
                        "ml-2 px-2 py-1 rounded font-semibold",
                        Number.parseInt(volumesInformados) > nota.volumes 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      )}>
                        {Number.parseInt(volumesInformados) > nota.volumes ? '+' : ''}
                        {Number.parseInt(volumesInformados) - nota.volumes}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Botões */}
            <div className={cn(
              "flex gap-4 flex-shrink-0",
              isColetor ? "flex-col mt-2" : "space-x-4"
            )}>
              <Button
                onClick={handleSubmit}
                disabled={!tipoDivergencia || !volumesInformados}
                className={cn(
                  "bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl transition-all",
                  isColetor ? "w-full h-16 text-lg font-bold" : "flex-1"
                )}
                size={isColetor ? "lg" : "lg"}
              >
                <AlertTriangle className={cn("mr-2", isColetor ? "h-6 w-6" : "h-5 w-5")} />
                Confirmar Divergência
              </Button>
              <Button 
                onClick={handleClose} 
                variant="outline" 
                className={cn(
                  isColetor ? "w-full h-16 text-lg font-semibold" : "flex-1"
                )} 
                size={isColetor ? "lg" : "lg"}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação Final */}
      <Dialog open={modalConfirmacao} onOpenChange={() => setModalConfirmacao(false)}>
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
              <CheckCircle className={cn("text-green-600", isColetor ? "h-6 w-6" : "h-5 w-5")} />
              <span>Confirmar Divergência</span>
            </DialogTitle>
            <DialogDescription className={cn(isColetor && "text-base mt-2")}>
              Confirme se os dados da divergência estão corretos antes de salvar.
            </DialogDescription>
          </DialogHeader>

          <div className={cn("space-y-5", isColetor && "flex-1 flex flex-col min-h-0")}>
            <div className={cn(
              "text-center p-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl",
              isColetor && "p-8"
            )}>
              <CheckCircle className={cn("text-green-600 mx-auto mb-4", isColetor ? "h-12 w-12" : "h-8 w-8")} />
              <p className={cn("text-gray-700 dark:text-gray-300", isColetor ? "text-lg leading-relaxed" : "text-base")}>
                Confirma que a nota <strong className="text-blue-600">{nota.numeroNF}</strong> possui{" "}
                <strong className="text-orange-600">{tipoSelecionado?.descricao}</strong>?
              </p>

              {Number.parseInt(volumesInformados) !== nota.volumes && (
                <div className={cn("mt-4 flex items-center justify-center space-x-2", isColetor && "text-base")}>
                  <span className="text-gray-600 dark:text-gray-400">Volumes alterados:</span>
                  <span className="text-red-600 font-bold">{nota.volumes}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="text-green-600 font-bold">{volumesInformados}</span>
                </div>
              )}
            </div>

            <div className={cn(
              "flex gap-4 flex-shrink-0",
              isColetor ? "flex-col mt-2" : "space-x-4"
            )}>
              <Button 
                onClick={confirmarDivergencia} 
                className={cn(
                  "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all",
                  isColetor ? "w-full h-16 text-lg font-bold" : "flex-1"
                )}
                size={isColetor ? "lg" : "lg"}
              >
                <CheckCircle className={cn("mr-2", isColetor ? "h-6 w-6" : "h-4 w-4")} />
                Confirmar
              </Button>
              <Button 
                onClick={() => setModalConfirmacao(false)} 
                variant="outline" 
                className={cn(
                  isColetor ? "w-full h-16 text-lg font-semibold" : "flex-1"
                )}
                size={isColetor ? "lg" : "lg"}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
