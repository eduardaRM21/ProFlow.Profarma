"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Package,
  Truck,
  Calculator,
  BarChart3,
  Users,
  LogOut,
  CalendarIcon,
  FileText,
  RotateCcw,
} from "lucide-react";
import ChangePasswordModal from "@/components/admin/change-password-modal";

interface SessionData {
  colaborador: string;
  data: string;
  turno: string;
  area: string;
  loginTime: string;
}

export default function CRDKPage() {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [recebimentoStats, setRecebimentoStats] = useState({
    totalNFs: 0,
    totalVolumes: 0,
    totalDivergencias: 0,
    totalRelatorios: 0,
  });
  const [embalagemStats, setEmbalagemStats] = useState({
    totalCarros: 0,
    carrosEmProducao: 0,
    totalNFs: 0,
    totalVolumes: 0,
  });
  const [custosStats, setCustosStats] = useState({
    totalRelatorios: 0,
    aguardandoLancamento: 0,
    emLancamento: 0,
    lancados: 0,
    totalNFs: 0,
    totalVolumes: 0,
  });
  const [inventarioStats, setInventarioStats] = useState({
    totalNFs: 0,
    totalVolumes: 0,
    totalRuas: 0,
    ruasAtivas: 0,
  });

  const router = useRouter();

  // Carregar dados da sessão
  useEffect(() => {
    const loadSessionData = () => {
      try {
        const session = localStorage.getItem("sistema_session");
        if (session) {
          const sessionData = JSON.parse(session);
          setSessionData(sessionData);
        } else {
          // Se não há sessão, redirecionar para login
          router.push("/");
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados da sessão:', error);
        router.push("/");
      }
    };

    loadSessionData();
  }, [router]);

  // Carregar dados locais
  useEffect(() => {
    if (sessionData) {
      try {
        // Carregar dados de recebimento
        let totalNFs = 0;
        let totalVolumes = 0;
        let totalDivergencias = 0;
        let totalRelatorios = 0;

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith("recebimento_")) {
            try {
              const notas = JSON.parse(localStorage.getItem(key) || "[]");
              totalNFs += notas.length;
              totalVolumes += notas.reduce(
                (sum: number, nota: any) =>
                  sum + (nota.divergencia?.volumesInformados || nota.volumes || 0),
                0
              );
              totalDivergencias += notas.filter(
                (n: any) => n.status === "divergencia"
              ).length;
            } catch (e) {
              console.error(`Error parsing localStorage key ${key}:`, e);
            }
          }
        }

        const relatoriosCustos = JSON.parse(
          localStorage.getItem("relatorios_custos") || "[]"
        );
        totalRelatorios = relatoriosCustos.filter(
          (rel: any) => rel.area === "recebimento"
        ).length;

        setRecebimentoStats({
          totalNFs,
          totalVolumes,
          totalDivergencias,
          totalRelatorios,
        });

        // Carregar dados de embalagem
        let totalCarros = 0;
        let carrosEmProducao = 0;
        let totalNFsEmb = 0;
        let totalVolumesEmb = 0;

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith("profarma_carros_")) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || "{}");
              const carros = data.carros || [];

              carros.forEach((carro: any) => {
                totalCarros++;
                if (carro.statusCarro === "em_producao") {
                  carrosEmProducao++;
                }
                const nfsValidas = carro.nfs.filter(
                  (nf: any) => nf.status === "valida"
                );
                totalNFsEmb += nfsValidas.length;
                totalVolumesEmb += nfsValidas.reduce(
                  (sum: number, nf: any) => sum + (nf.volume || 0),
                  0
                );
              });
            } catch (e) {
              console.error(`Error parsing localStorage key ${key}:`, e);
            }
          }
        }

        setEmbalagemStats({
          totalCarros,
          carrosEmProducao,
          totalNFs: totalNFsEmb,
          totalVolumes: totalVolumesEmb,
        });

        // Carregar dados de inventário
        let totalNFsInv = 0;
        let totalVolumesInv = 0;
        let totalRuas = 0;
        const ruasUnicas = new Set<string>();

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith("inventario_")) {
            try {
              const itens = JSON.parse(localStorage.getItem(key) || "[]");
              totalNFsInv += itens.length;
              totalVolumesInv += itens.reduce(
                (sum: number, item: any) => sum + (item.volumes || 0) * (item.quantidade || 1),
                0
              );

              itens.forEach((item: any) => {
                if (item.rua) {
                  ruasUnicas.add(item.rua);
                }
              });
            } catch (e) {
              console.error(`Error parsing localStorage key ${key}:`, e);
            }
          }
        }

        totalRuas = ruasUnicas.size;

        setInventarioStats({ 
          totalNFs: totalNFsInv, 
          totalVolumes: totalVolumesInv, 
          totalRuas, 
          ruasAtivas: totalRuas 
        });

        // Carregar dados de custos
        const relatorios = JSON.parse(
          localStorage.getItem("relatorios_custos") || "[]"
        );
        const aguardandoLancamento = relatorios.filter(
          (r: any) => r.status === "aguardando_lancamento"
        ).length;
        const emLancamento = relatorios.filter(
          (r: any) => r.status === "em_lancamento"
        ).length;
        const lancados = relatorios.filter((r: any) => r.status === "lancado").length;
        const totalNFsCustos = relatorios.reduce((sum: number, r: any) => sum + (r.quantidadeNotas || 0), 0);
        const totalVolumesCustos = relatorios.reduce((sum: number, r: any) => sum + (r.somaVolumes || 0), 0);

        setCustosStats({
          totalRelatorios: relatorios.length,
          aguardandoLancamento,
          emLancamento,
          lancados,
          totalNFs: totalNFsCustos,
          totalVolumes: totalVolumesCustos,
        });

        setIsLoading(false);
      } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        setIsLoading(false);
      }
    }
  }, [sessionData]);

  const handleLogout = () => {
    localStorage.removeItem("sistema_session");
    router.push("/");
  };

  if (!sessionData || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Carregando Torre de Controle CRDK...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-yellow-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Torre de Controle CRDK
                </h1>
                <p className="text-sm text-gray-500">
                  Visão Geral e Produtividade dos Setores
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <CalendarIcon className="h-3 w-3" />
                    <span>{sessionData.data}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Tempo Real</span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChangePassword(true)}
                className="flex items-center space-x-2 bg-transparent hover:bg-indigo-50 border-indigo-200"
                title="Alterar Senha"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Alterar Senha</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-transparent hover:bg-indigo-50 border-indigo-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Visão Geral dos Setores
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
          {/* Card Recebimento */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Package className="h-5 w-5 text-blue-600" />
                <span>Setor de Recebimento</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    {recebimentoStats.totalNFs}
                  </div>
                  <div className="text-sm text-gray-600">NFs Bipadas</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    {recebimentoStats.totalVolumes}
                  </div>
                  <div className="text-sm text-gray-600">Volumes Totais</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    {recebimentoStats.totalDivergencias}
                  </div>
                  <div className="text-sm text-gray-600">Divergências</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    {recebimentoStats.totalRelatorios}
                  </div>
                  <div className="text-sm text-gray-600">
                    Relatórios Finalizados
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Embalagem */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Truck className="h-5 w-5 text-green-600" />
                <span>Setor de Embalagem</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {embalagemStats.totalNFs}
                  </div>
                  <div className="text-sm text-gray-600">NFs Embaladas</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {embalagemStats.totalVolumes}
                  </div>
                  <div className="text-sm text-gray-600">Volumes Embalados</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {embalagemStats.totalCarros}
                  </div>
                  <div className="text-sm text-gray-600">Total de Carros</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {embalagemStats.carrosEmProducao}
                  </div>
                  <div className="text-sm text-gray-600">
                    Carros em Produção
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Custos */}
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Calculator className="h-5 w-5 text-purple-600" />
                <span>Setor de Custos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-2 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">
                    {custosStats.totalRelatorios}
                  </div>
                  <div className="text-sm text-gray-600">
                    Total de Lançamentos
                  </div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">
                    {custosStats.aguardandoLancamento}
                  </div>
                  <div className="text-sm text-gray-600">Aguardando</div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">
                    {custosStats.emLancamento}
                  </div>
                  <div className="text-sm text-gray-600">Em Lançamento</div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">
                    {custosStats.lancados}
                  </div>
                  <div className="text-sm text-gray-600">Lançados</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Inventário */}
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Package className="h-5 w-5 text-orange-600" />
                <span>Setor de Inventário</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-2 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">
                    {inventarioStats.totalNFs}
                  </div>
                  <div className="text-sm text-gray-600">NFs Bipadas</div>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">
                    {inventarioStats.totalVolumes}
                  </div>
                  <div className="text-sm text-gray-600">Volumes Totais</div>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">
                    {inventarioStats.totalRuas}
                  </div>
                  <div className="text-sm text-gray-600">Ruas Ativas</div>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">
                    {inventarioStats.ruasAtivas}
                  </div>
                  <div className="text-sm text-gray-600">Ruas em Uso</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-sm text-gray-600">
          <p>
            <strong>Observação:</strong> Os dados exibidos nesta Torre de
            Controle são agregados do armazenamento local (localStorage) do seu
            navegador. Para uma visão em tempo real e compartilhada entre
            múltiplos usuários, seria necessária a integração com um banco de
            dados centralizado.
          </p>
        </div>
      </main>

      {/* Modal de Alterar Senha */}
      {sessionData && (
        <ChangePasswordModal
          isOpen={showChangePassword}
          onClose={() => setShowChangePassword(false)}
          usuario={sessionData.colaborador || ""}
          area="crdk"
          onSuccess={() => {
            alert("Senha alterada com sucesso!")
          }}
        />
      )}
    </div>
  );
}
