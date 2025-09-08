"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package,
  MapPin,
  Barcode,
  FileText,
  Play,
  Square,
  RotateCcw,
  LogOut,
  CheckCircle,
  Clock,
  Trash2,
} from "lucide-react";
import { useSession, useInventario } from "@/hooks/use-database";
import { useRealtimeMonitoring } from "@/hooks/use-realtime-monitoring";
import { BarcodeScanner } from "./components/barcode-scanner";
import { RelatorioModal } from "./components/relatorio-modal";
import { InventarioNotasBipadasService } from "@/lib/inventario-notas-bipadas-service";

interface NotaFiscalInventario {
  id: string;
  codigoCompleto: string;
  data: string;
  numeroNF: string;
  volumes: number;
  destino: string;
  fornecedor: string;
  clienteDestino: string;
  tipoCarga: string;
  rua: string;
  timestamp: string;
  status: 'valida' | 'duplicata' | 'erro_localizacao';
}

interface RelatorioInventario {
  id: string;
  rua: string;
  data: string;
  turno: string;
  colaborador: string;
  notas: NotaFiscalInventario[];
  totalNotas: number;
  tempoInicio: string;
  tempoFim: string;
}

export default function InventarioPage() {
  const [rua, setRua] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [notasInventario, setNotasInventario] = useState<NotaFiscalInventario[]>([]);
  const [showRelatorio, setShowRelatorio] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<any>(null);

  const router = useRouter();
  const { getSession, logout } = useSession();
  const { saveInventario, getInventario, saveRelatorio } = useInventario();
  const { addRealtimeEvent } = useRealtimeMonitoring();

  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionData = await getSession("current");
        if (!sessionData) {
          router.push("/");
          return;
        }
        setSession(sessionData);

        // Carregar inventário salvo
        const inventarioSalvo = await getInventario(sessionData.id);
        if (inventarioSalvo.length > 0) {
          setNotasInventario(inventarioSalvo);
        }
      } catch (error) {
        console.error("Erro ao carregar sessão:", error);
        router.push("/");
      }
    };

    loadSession();
  }, [getSession, router]);

  // Restrição do botão voltar do navegador
  useEffect(() => {
    if (!session) return

    // Função para interceptar tentativas de saída da página
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = 'Você tem certeza que deseja sair? Use o botão "Sair" para sair corretamente.'
      return 'Você tem certeza que deseja sair? Use o botão "Sair" para sair corretamente.'
    }

    // Função para interceptar navegação do botão voltar
    const handlePopState = (event: PopStateEvent) => {
      // Adiciona uma nova entrada no histórico para manter o usuário na página
      window.history.pushState(null, '', window.location.href)
      
      // Mostra um alerta informativo
      alert('Para sair do setor de Inventário, use o botão "Sair" no canto superior direito.')
    }

    // Adiciona uma entrada no histórico para interceptar o botão voltar
    window.history.pushState(null, '', window.location.href)

    // Adiciona os event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    // Cleanup dos event listeners
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [session])

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleIniciarBipagem = () => {
    if (!rua) {
      alert("Por favor, selecione uma rua antes de iniciar a bipagem.");
      return;
    }
    setIsScanning(true);
    console.log("🚀 Iniciando bipagem para rua:", rua);
  };

  const handleFinalizarRelatorio = () => {
    if (notasInventario.length === 0) {
      alert("Não há notas fiscais no inventário para gerar relatório.");
      return;
    }
    setShowRelatorio(true);
  };

  const handleNovaRua = () => {
    if (notasInventario.length > 0) {
      const confirmar = confirm(
        "Existem notas fiscais no inventário atual. Deseja realmente limpar e começar uma nova rua?"
      );
      if (!confirmar) return;
    }
    
    setNotasInventario([]);
    setRua("");
    setIsScanning(false);
    console.log("🔄 Iniciando nova rua");
  };

  const handleBarcodeScanned = async (codigo: string) => {
    if (!rua || !session) return;

    setIsLoading(true);
    
    try {
      // Simular busca de produto (em produção, isso viria do banco)
      const produto = await buscarProduto(codigo);
      
      if (produto) {
        // VERIFICAÇÃO CRÍTICA: Verificar se a nota já foi bipada em algum setor
        console.log("🔍 Verificando se nota já foi bipada em algum setor...");
        const verificarNota = await InventarioNotasBipadasService.verificarNotaJaBipada(codigo.trim());
        
        if (verificarNota.success && verificarNota.jaBipada) {
          // Nota já foi bipada em outro setor - ALERTA CRÍTICO
            const setorInfo = verificarNota.setorInfo;
          const confirmarOutroSetor = confirm(
            `🚨 ALERTA CRÍTICO!\n\n` +
            `NOTA JÁ FOI BIPADA NO SETOR DE EMBALAGEM!\n\n` +
            `NF: ${produto.numeroNF}\n` +
            `Código: ${codigo}\n` +
            `Colaborador que bipou: ${setorInfo?.colaboradores || 'Não informado'}\n` +
            `Data/Hora: ${setorInfo?.timestamp_bipagem}\n\n` +
            `Rua Atual: ${rua}\n` +
            `Esta nota já foi processada na embalagem.\n` +
            `Verifique se não há erro!\n\n` +
            `Deseja continuar mesmo assim?\n\n` +
            `• OK = Adicionar no inventário\n` +
            `• Cancelar = Rejeitar`
          );
          
          if (!confirmarOutroSetor) {
            console.log("❌ Nota rejeitada - já bipada em outro setor:", produto.numeroNF);
            
            addRealtimeEvent({
              id: Date.now().toString(),
              timestamp: new Date().toISOString(),
              sector: 'inventario',
              type: 'inventory_updated',
              message: `NF ${produto.numeroNF} rejeitada - já bipada em outro setor`,
              data: { 
                numeroNF: produto.numeroNF, 
                ruaAtual: rua, 
                setorAnterior: setorInfo?.setor,
                motivo: 'ja_bipada_outro_setor' 
              }
            });
            
            return;
          }
        }
        
        const novaNota: NotaFiscalInventario = {
          id: Date.now().toString(),
          codigoCompleto: codigo,
          data: produto.data,
          numeroNF: produto.numeroNF,
          volumes: produto.volumes,
          destino: produto.destino,
          fornecedor: produto.fornecedor,
          clienteDestino: produto.clienteDestino,
          tipoCarga: produto.tipoCarga,
          rua: rua,
          timestamp: new Date().toISOString(),
          status: 'valida',
        };

        // Verificar se a nota já existe na mesma rua
        const notaExistenteMesmaRua = notasInventario.find(nota => 
          nota.codigoCompleto === codigo && nota.rua === rua
        );
        
        // Verificar se a nota já existe em outras ruas
        const notaExistenteOutrasRuas = notasInventario.find(nota => 
          nota.codigoCompleto === codigo && nota.rua !== rua
        );
        
        let notasAtualizadas: NotaFiscalInventario[];
        
        if (notaExistenteOutrasRuas) {
          // Nota já existe em outra rua - ALERTA CRÍTICO
          const confirmarOutraRua = confirm(
            `🚨 ALERTA CRÍTICO!\n\n` +
            `NOTA JÁ EXISTE EM OUTRA RUA!\n\n` +
            `NF: ${produto.numeroNF}\n` +
            `Código: ${codigo}\n` +
            `Rua Atual: ${rua}\n` +
            `Rua Anterior: ${notaExistenteOutrasRuas.rua}\n\n` +
            `Esta nota já foi escaneada na rua ${notaExistenteOutrasRuas.rua}.\n` +
            `Verifique se não há erro de localização!\n\n` +
            `Deseja continuar mesmo assim?\n\n` +
            `• OK = Adicionar na rua atual\n` +
            `• Cancelar = Rejeitar (verificar localização)`
          );
          
          if (!confirmarOutraRua) {
            console.log("❌ Nota rejeitada - possível erro de localização:", produto.numeroNF);
            
            addRealtimeEvent({
              id: Date.now().toString(),
              timestamp: new Date().toISOString(),
              sector: 'inventario',
              type: 'inventory_updated',
              message: `NF ${produto.numeroNF} rejeitada - possível erro de localização`,
              data: { 
                numeroNF: produto.numeroNF, 
                ruaAtual: rua, 
                ruaAnterior: notaExistenteOutrasRuas.rua,
                motivo: 'erro_localizacao' 
              }
            });
            
            return;
          }
        }
        
        if (notaExistenteMesmaRua) {
          // Nota duplicada na mesma rua - REJEITAR
          alert(
            `❌ NOTA DUPLICADA!\n\n` +
            `NF: ${produto.numeroNF}\n` +
            `Código: ${codigo}\n` +
            `Rua: ${rua}\n\n` +
            `Esta nota fiscal já foi escaneada nesta rua.\n` +
            `Notas duplicadas não são permitidas no inventário.`
          );
          
          console.log("❌ Nota duplicada rejeitada:", produto.numeroNF);
          
          // Disparar evento de duplicata rejeitada
          addRealtimeEvent({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            sector: 'inventario',
            type: 'inventory_updated',
            message: `NF ${produto.numeroNF} duplicada rejeitada na rua ${rua}`,
            data: { numeroNF: produto.numeroNF, rua, motivo: 'duplicata_rejeitada' }
          });
          
          return;
        }
        
        // Adicionar nova nota fiscal
        notasAtualizadas = [...notasInventario, novaNota];
        setNotasInventario(notasAtualizadas);
        console.log("✅ Nota fiscal adicionada:", produto.numeroNF);

        // Salvar no localStorage
        await saveInventario(session.id, notasAtualizadas);
        
        // Salvar nota bipada na tabela centralizada
        try {
          const notaBipada = {
            numero_nf: produto.numeroNF,
            codigo_completo: produto.codigoCompleto,
            rua: rua,
            session_id: `inventario_${session.data}_${session.turno}`,
            colaboradores: Array.isArray(session.colaboradores) && session.colaboradores.length > 0
              ? session.colaboradores
              : ['Não informado'],
            data: session.data || new Date().toISOString().split('T')[0],
            turno: session.turno || '',
            volumes: produto.volumes,
            destino: produto.destino,
            fornecedor: produto.fornecedor,
            cliente_destino: produto.clienteDestino,
            tipo_carga: produto.tipoCarga,
            status: 'bipada',
            observacoes: `NF bipada na rua ${rua} do setor de inventário`,
            timestamp_bipagem: new Date().toISOString()
          };

          await InventarioNotasBipadasService.salvarNotaBipada(notaBipada);
          console.log('✅ Nota bipada salva na tabela centralizada');
        } catch (error) {
          console.error('❌ Erro ao salvar nota bipada na tabela centralizada:', error);
          // Continuar com o processo mesmo se falhar ao salvar na tabela centralizada
        }
        
        // Disparar evento em tempo real
        addRealtimeEvent({
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          sector: 'inventario',
          type: 'inventory_updated',
          message: `NF ${produto.numeroNF} escaneada na rua ${rua}`,
          data: { numeroNF: produto.numeroNF, rua, fornecedor: produto.fornecedor, clienteDestino: produto.clienteDestino }
        });
      } else {
        alert(`Código inválido: ${codigo}\n\nFormato esperado: data|nf|volumes|destino|fornecedor|cliente_destino|tipo_carga\n\nExemplo: 45868|000068310|0014|RJ08|EMS S/A|SAO JO|ROD`);
      }
    } catch (error) {
      console.error("Erro ao processar código:", error);
      alert("Erro ao processar código de barras");
    } finally {
      setIsLoading(false);
    }
  };

  const buscarProduto = async (codigo: string) => {
    // Validar formato do código: data|nf|volumes|destino|fornecedor|cliente_destino|tipo_carga
    const partes = codigo.split("|");
    
    if (partes.length !== 7) {
      return null; // Formato inválido
    }

    const [data, numeroNF, volumesStr, destino, fornecedor, clienteDestino, tipoCarga] = partes;
    const volumes = parseInt(volumesStr, 10);

    if (isNaN(volumes) || volumes <= 0) {
      return null; // Volumes inválidos
    }

    // Retornar objeto com as informações extraídas
    return {
      codigoCompleto: codigo,
      data,
      numeroNF,
      volumes,
      destino,
      fornecedor,
      clienteDestino,
      tipoCarga
    };
  };

  const handleGerarRelatorio = async (relatorio: any) => {
    try {
      await saveRelatorio(relatorio);
      console.log("📊 Relatório salvo:", relatorio.rua);
      
      // Disparar evento em tempo real
      addRealtimeEvent({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        sector: 'inventario',
        type: 'relatorio_finalized',
        message: `Relatório finalizado para rua ${relatorio.rua}`,
        data: { rua: relatorio.rua, totalNotas: relatorio.totalNotas, colaborador: relatorio.colaborador }
      });
      
      // Limpar inventário após salvar relatório
                              setNotasInventario([]);
      setRua("");
      setIsScanning(false);
      setShowRelatorio(false);
      
      alert("Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar relatório:", error);
      alert("Erro ao salvar relatório");
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Package className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventário</h1>
              <p className="text-gray-600">
                {session.colaboradores?.join(", ")} - {session.data} - Turno {session.turno}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Controle */}
        <div className="lg:col-span-1 space-y-6">
          {/* Seleção de Rua */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-purple-600" />
                <span>Seleção de Rua</span>
              </CardTitle>
              <CardDescription>
                Escolha a rua para iniciar o inventário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rua">Rua *</Label>
                <Input
                  id="rua"
                  value={rua}
                  onChange={(e) => setRua(e.target.value)}
                  placeholder="Digite a rua (ex: Duque de Caxias)"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleIniciarBipagem}
                  disabled={!rua || isScanning}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Bipagem
                </Button>

                <Button
                  onClick={handleFinalizarRelatorio}
                  disabled={notasInventario.length === 0}
                  variant="outline"
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Finalizar Relatório
                </Button>

                <Button
                  onClick={handleNovaRua}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Nova Rua
                </Button>
                
                <Button
                  onClick={() => {
                    if (notasInventario.length === 0) {
                      alert("ℹ️ Nenhuma nota fiscal para limpar!");
                      return;
                    }

                    const confirmar = confirm(
                      `🧹 LIMPAR TODAS AS NOTAS BIPADAS!\n\n` +
                      `Rua: ${rua || 'Não selecionada'}\n` +
                      `Notas: ${notasInventario.length}\n` +
                      `Total de Volumes: ${notasInventario.reduce((total, nota) => total + nota.volumes, 0)}\n\n` +
                      `Deseja limpar todas as notas bipadas nesta sessão?\n\n` +
                      `• OK = Limpar todas as notas\n` +
                      `• Cancelar = Manter como está`
                    );
                    
                    if (confirmar) {
                      setNotasInventario([]);
                      if (session) {
                        saveInventario(session.id, []);
                      }
                      console.log("🧹 Todas as notas bipadas foram limpas da sessão ativa");
                      alert("✅ Todas as notas bipadas foram limpas da sessão ativa!");
                    }
                  }}
                  variant="outline"
                  className="w-full bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Notas Bipadas
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Estatísticas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Rua Atual:</span>
                <span className="font-medium">{rua || "Não selecionada"}</span>
              </div>
                                           <div className="flex justify-between">
                <span className="text-gray-600">Notas Fiscais:</span>
                <span className="font-medium">{notasInventario.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total de Volumes:</span>
                <span className="font-medium">
                  {notasInventario.reduce((total, nota) => total + nota.volumes, 0)}
                </span>
              </div>
              
              {/* Estatísticas de Sessão */}
              <div className="flex justify-between">
                <span className="text-gray-600">Sessão Ativa:</span>
                <span className="font-medium">{session?.id ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${isScanning ? 'text-green-600' : 'text-gray-600'}`}>
                  {isScanning ? 'Escaneando' : 'Aguardando'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Área de Bipagem */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scanner */}
          {isScanning && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Barcode className="h-5 w-5 text-blue-600" />
                  <span>Scanner de Código de Barras</span>
                </CardTitle>
                <CardDescription>
                  Escaneie os produtos da rua: {rua}
                  <br />
                  <span className="text-xs text-gray-500">
                    Formato: 45868|000068310|0014|RJ08|EMS S/A|SAO JO|ROD
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarcodeScanner
                  onScan={handleBarcodeScanned}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          )}

          {/* Lista de Itens */}
          <Card>
            <CardHeader>
                             <CardTitle className="flex items-center space-x-2">
                 <Package className="h-5 w-5 text-orange-600" />
                 <span>Notas Fiscais do Inventário</span>
                                 {notasInventario.length > 0 && (
                  <span className="bg-orange-100 text-orange-800 text-sm px-2 py-1 rounded-full">
                    {notasInventario.length}
                  </span>
                )}
               </CardTitle>
              <CardDescription>
                Notas fiscais escaneadas na rua atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notasInventario.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-4 w-4 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma nota fiscal escaneada ainda</p>
                  <p className="text-sm">Inicie a bipagem para começar</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notasInventario.map((nota) => (
                    <div
                      key={nota.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">NF: {nota.numeroNF}</p>
                        <p className="text-sm text-gray-600">
                          {nota.fornecedor} → {nota.clienteDestino}
                        </p>
                        <p className="text-xs text-gray-500">
                          {nota.destino} | {nota.tipoCarga} | {new Date(nota.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                          Volumes: {nota.volumes}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Relatório */}
      {showRelatorio && (
        <RelatorioModal
          rua={rua}
          itens={notasInventario}
          session={session}
          onClose={() => setShowRelatorio(false)}
          onSave={handleGerarRelatorio}
        />
      )}
    </div>
  );
}
