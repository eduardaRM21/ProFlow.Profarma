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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Building2,
  Package,
  Truck,
  Calculator,
  FileText,
  Users,
  Plus,
  X,
  Shield,
  Square,
  ClipboardList,
  ChartColumnIncreasing,
  Lock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSession } from "@/hooks/use-database";
import { LocalAuthService } from "@/lib/local-auth-service";
import { LoginButton } from "@/components/ui/loading-button";

export default function LoginPage() {
  const [colaboradores, setColaboradores] = useState([""]);
  const [colaborador, setColaborador] = useState("");
  const [data, setData] = useState<Date>();
  const [turno, setTurno] = useState("");
  const [area, setArea] = useState("");
  const [usuarioCustos, setUsuarioCustos] = useState("");
  const [senhaCustos, setSenhaCustos] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { saveSession } = useSession();

  const colaboradoresPreenchidos = colaboradores.filter((c) => c.trim() !== "");

  const usuariosCustos = [
    { usuario: "Eduarda", senha: "Prof@123" },
    { usuario: "Silmar", senha: "Prof@123" },
    { usuario: "Josue", senha: "Prof@123" },
    { usuario: "Fernando", senha: "Prof@123" },
    { usuario: "Ediandro", senha: "Prof@123" },
    { usuario: "Sergio", senha: "Prof@123" },
  ];

  const usuariosCRDK = [
    { usuario: "franklin.viana", senha: "crdkes2025" },
    { usuario: "eduarda.medeiros", senha: "crdkes2025" },
    { usuario: "ramon.fraga", senha: "crdkes2025" },
    { usuario: "alessandro.santos", senha: "crdkes2025" },
    { usuario: "rafael.lobo", senha: "crdkes2025" },
  ];

  const usuariosAdminEmbalagem = [
    { usuario: "Amanda", senha: "20252025" },
    { usuario: "Eduarda", senha: "20252025" },
    { usuario: "Philipe", senha: "20252025" },
    { usuario: "Crispiniana", senha: "20252025" },
    { usuario: "Miqueias", senha: "20252025" },
  ];

  const validarUsuarioCustos = async () => {
    let usuarioValido = null;
    
    if (area === "custos") {
      usuarioValido = usuariosCustos.find(
        (u: { usuario: string; senha: string }) => u.usuario === usuarioCustos && u.senha === senhaCustos
      );
    } else if (area === "crdk") {
      usuarioValido = usuariosCRDK.find(
        (u: { usuario: string; senha: string }) => u.usuario === usuarioCustos && u.senha === senhaCustos
      );
    } else if (area === "admin-embalagem") {
      usuarioValido = usuariosAdminEmbalagem.find(
        (u: { usuario: string; senha: string }) => u.usuario === usuarioCustos && u.senha === senhaCustos
      );
    }

    if (!usuarioValido) {
      alert("Usuário ou senha inválidos.");
      return false;
    }

    return true;
  };

  const router = useRouter();

  useEffect(() => {
    // Inicializar data apenas para áreas operacionais
    // Para Custos e CRDK, a data será definida no momento do login
    setData(new Date());
  }, []);

  const adicionarColaborador = () => {
    if (colaboradores.length < 3) {
      setColaboradores([...colaboradores, ""]);
    }
  };

  const atualizarColaborador = (index: number, valor: string) => {
    const novos = [...colaboradores];
    novos[index] = valor;
    setColaboradores(novos);
  };

  const removerColaborador = (index: number) => {
    const novos = colaboradores.filter((_, i) => i !== index);
    setColaboradores(novos);
  };

  const handleLogin = async () => {
    if (!area) {
      alert("Por favor, selecione a área de trabalho.");
      return;
    }

    // Ativar estado de loading
    setIsLoading(true);

    // Verificar se é área que usa autenticação local
    if (LocalAuthService.isLocalAuthArea(area)) {
      // Recebimento e Embalagem: validação local
      if (area === "embalagem") {
        if (colaboradoresPreenchidos.length === 0 || !data || !turno) {
          alert("Preencha todos os campos obrigatórios.");
          return;
        }
        console.log("✅ Login autorizado (local): setor Embalagem ->", colaboradoresPreenchidos);
      } else {
        if (!colaborador.trim() || !data || !turno) {
          alert("Por favor, preencha todos os campos.");
          return;
        }
        console.log("✅ Login autorizado (local): setor", area, "->", colaborador);
      }
    } else if (LocalAuthService.isDatabaseAuthArea(area)) {
      // Custos, CRDK e Admin Embalagem: validação no banco
      if (!usuarioCustos.trim() || !senhaCustos.trim()) {
        alert("Por favor, preencha o usuário e a senha.");
        return;
      }
    
      const autorizado = await validarUsuarioCustos();
      if (!autorizado) return;
    
      console.log("✅ Login autorizado (banco): setor", area, "->", usuarioCustos);
    }

    // Garantir que a data está definida (apenas para áreas operacionais)
    if (LocalAuthService.isLocalAuthArea(area) && !data) {
      alert("Erro: Data não foi inicializada. Recarregue a página e tente novamente.");
      return;
    }

    // Verificar turno apenas para áreas operacionais (não para Custos e CRDK)
    if (LocalAuthService.isLocalAuthArea(area) && !turno.trim()) {
      alert("Erro: Turno não foi selecionado.");
      return;
    }

    const loginData = {
      area,
      colaboradores: area === "embalagem" ? colaboradoresPreenchidos : [colaborador],
      data: data ? format(data, "yyyy-MM-dd") : undefined,
      turno,
      usuarioCustos: area === "custos" || area === "crdk" || area === "admin-embalagem" ? usuarioCustos : undefined,
    };

    try {
      await saveSession(loginData);
      console.log("✅ Sessão salva com sucesso:", loginData);
      
      // Redirecionar para a área correspondente
      if (area === "recebimento") {
        router.push("/recebimento");
      } else if (area === "embalagem") {
        router.push("/painel");
      } else if (area === "custos") {
        router.push("/custos");
      } else if (area === "crdk") {
        router.push("/crdk");
      } else if (area === "admin-embalagem") {
        router.push("/admin");
      } else {
        router.push("/painel");
      }
    } catch (error) {
      console.error("❌ Erro ao salvar sessão:", error);
      alert("Erro ao fazer login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler para tecla Enter em qualquer campo
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Verificar se todos os campos obrigatórios estão preenchidos antes de fazer login
      if (canProceedWithLogin()) {
        handleLogin();
      }
    }
  };

  // Função para verificar se pode prosseguir com o login
  const canProceedWithLogin = () => {
    if (!area) return false;
    
    if (LocalAuthService.isLocalAuthArea(area)) {
      if (area === "embalagem") {
        return colaboradoresPreenchidos.length > 0 && data && turno;
      } else {
        return colaborador.trim() && data && turno;
      }
    } else if (LocalAuthService.isDatabaseAuthArea(area)) {
      return usuarioCustos.trim() && senhaCustos.trim();
    }
    
    return false;
  };

  const getAreaIcon = (areaCode: string) => {
    const icons: { [key: string]: JSX.Element } = {
      recebimento: <Package className="h-8 w-8 text-blue-600" />,
      embalagem: <Truck className="h-8 w-8 text-green-600" />,
      "admin-embalagem": <Shield className="h-8 w-8 text-blue-600" />,
      crdk: <ChartColumnIncreasing className="h-8 w-8 text-yellow-600" />,
      custos: <Calculator className="h-8 w-8 text-orange-600" />,
      inventario: <ClipboardList className="h-8 w-8 text-purple-600" />,
    };
    return icons[areaCode] || <Building2 className="h-8 w-8 text-gray-600" />;
  };

  const getAreaColor = (areaCode: string) => {
    const colors: { [key: string]: string } = {
      recebimento: "from-blue-50 to-blue-100",
      embalagem: "from-green-50 to-green-100",
      "admin-embalagem": "from-blue-50 to-blue-100",
      crdk: "from-yellow-50 to-yellow-100",
      custos: "from-orange-50 to-yellow-100",
      inventario: "from-purple-50 to-purple-100",
    };
    return colors[areaCode] || "from-gray-50 to-gray-100";
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getAreaColor(area)} flex items-center justify-center p-4`}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {!area ? (
              // Logo ProFlow quando nenhum setor estiver selecionado
              <div className="flex items-center space-x-3">
                {/* Círculo verde com linhas brancas */}
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="flex space-x-1">
                    <div className="w-0.5 h-8 bg-white"></div>
                    <div className="w-0.5 h-8 bg-white"></div>
                    <div className="w-0.5 h-8 bg-white"></div>
                    <div className="w-0.5 h-8 bg-white"></div>
                  </div>
                </div>
                
                {/* Texto ProFlow */}
                <div className="text-left">
                  <div className="text-3xl font-bold text-gray-900">ProFlow</div>
                  <div className="text-sm text-green-500 font-medium">Fluxo profissional entre setores</div>
                </div>
              </div>
            ) : (
              // Ícone e título do setor quando um setor estiver selecionado
              <div className="flex flex-col items-center mb-2 mt-2">
                {getAreaIcon(area)}
                <div className="text-xl font-semibold text-gray-900">
                  {area === "recebimento" && "Recebimento"}
                  {area === "embalagem" && "Embalagem"}
                  {area === "admin-embalagem" && "Admin Embalagem"}
                  {area === "crdk" && "CRDK"}
                  {area === "inventario" && "Inventário"}
                  {area === "custos" && "Custos"}
                </div>
              </div>
            )}
          </div>
          
          <CardDescription className="text-lg text-center mb-2 mt-2">
            {area === "recebimento" && "Recebimento de Notas Fiscais"}
            {area === "embalagem" && "Embalagem e Expedição"}
            {area === "admin-embalagem" && "Administração do Setor de Embalagem"}
            {area === "crdk" && "CRDK e Controle"}
            {area === "inventario" && "Inventário por Rua"}
            {area === "custos" && "Custos e Relatórios"}
            {!area && "Selecione sua área de trabalho"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-base font-medium">Área de Trabalho *</Label>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className="h-12 text-base hover:bg-green-50 border-green-200" onKeyDown={handleKeyPress}>
                <SelectValue placeholder="Selecione sua área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recebimento" className="text-base py-3">📦 Recebimento</SelectItem>
                <SelectItem value="custos" className="text-base py-3">💰 Custos</SelectItem>
                <SelectItem value="embalagem" className="text-base py-3">🚚 Embalagem</SelectItem>
                <SelectItem value="admin-embalagem" className="text-base py-3">🛡️ Admin Embalagem</SelectItem>
                <SelectItem value="inventario" className="text-base py-3">📋 Inventário</SelectItem>
                <SelectItem value="crdk" className="text-base py-3"> 📊 CRDK </SelectItem>
                
              </SelectContent>
            </Select>
          </div>

          {area === "custos" && (
            <>
              <div className="space-y-2">
                <Label className="text-base font-medium">Usuário (Custos) *</Label>
                <Input placeholder="Usuário autorizado para Custos" value={usuarioCustos} onChange={(e) => setUsuarioCustos(e.target.value)} className="text-base h-12" onKeyPress={handleKeyPress} />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">Senha *</Label>
                <Input type="password" placeholder="Senha" value={senhaCustos} onChange={(e) => setSenhaCustos(e.target.value)} className="text-base h-12" onKeyPress={handleKeyPress} />
              </div>
            </>
          )}

          {area === "crdk" && (
            <>
              <div className="space-y-2">
                <Label className="text-base font-medium">Usuário (CRDK) *</Label>
                <Input placeholder="Usuário autorizado para CRDK" value={usuarioCustos} onChange={(e) => setUsuarioCustos(e.target.value)} className="text-base h-12" onKeyPress={handleKeyPress} />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">Senha *</Label>
                <Input type="password" placeholder="Senha" value={senhaCustos} onChange={(e) => setSenhaCustos(e.target.value)} className="text-base h-12" onKeyPress={handleKeyPress} />
              </div>
            </>
          )}

          {/* Login personalizado para Admin Embalagem */}
          {area === "admin-embalagem" && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span>Usuário Admin *</span>
                  </Label>
                  <Input
                    placeholder="Nome do usuário autorizado"
                    value={usuarioCustos}
                    onChange={(e) => setUsuarioCustos(e.target.value)}
                    className="text-base h-12 border-blue-200 hover:border-blue-300"
                    required
                    onKeyPress={handleKeyPress}
                  />
                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded-md">
                    <strong>Apenas usuários autorizados</strong>
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-base font-medium flex items-center space-x-2">
                    <Lock className="h-4 w-4 text-blue-600" />
                    <span>Senha *</span>
                  </Label>
                  <Input
                    type="password"
                    placeholder="Digite a senha"
                    value={senhaCustos}
                    onChange={(e) => setSenhaCustos(e.target.value)}
                    className="text-base h-12 border-blue-200 hover:border-blue-300"
                    required
                    onKeyPress={handleKeyPress}
                  />
                </div>
              </div>
            </>
          )}

          {/* Login personalizado para Embalagem */}
          {area === "embalagem" && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium flex items-center space-x-2">
                    <Users className="h-4 w-4 text-green-600" />
                    <span>Colaborador(es) *</span>
                  </Label>
                  {colaboradores.length < 3 && (
                    <Button type="button" variant="outline" size="sm" onClick={adicionarColaborador} className="text-green-600 border-green-300 hover:bg-green-50 bg-transparent">
                      <Plus className="h-4 w-4 mr-1" />Adicionar
                    </Button>
                  )}
                </div>
                {colaboradores.map((colab, i) => (
                  <div key={i} className="flex space-x-2">
                    <Input
                      placeholder={`Nome do ${i === 0 ? "colaborador" : `${i + 1}º colaborador`}`}
                      value={colab}
                      onChange={(e) => atualizarColaborador(i, e.target.value)}
                      className="text-base h-12 flex-1"
                      onKeyPress={handleKeyPress}
                    />
                    {colaboradores.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removerColaborador(i)}
                        className="text-red-500 border-red-300 hover:bg-red-50 h-12 px-3"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {colaboradoresPreenchidos.length > 1 && (
                  <div className="text-sm text-green-600 bg-green-50 p-2 rounded-md">
                    <strong>Dupla:</strong> {colaboradoresPreenchidos.join(" + ")}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Áreas comuns (exceto custos, crdk e admin-embalagem) */}
          {area !== "custos" && area !== "crdk" && area !== "admin-embalagem" && (
            <>
              {area !== "embalagem" && (
                <div className="space-y-2">
                  <Label className="text-base font-medium">Colaborador *</Label>
                  <Input placeholder="Nome do colaborador" value={colaborador} onChange={(e) => setColaborador(e.target.value)} className="text-base h-12" onKeyPress={handleKeyPress} />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-base font-medium">Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-12 text-base bg-transparent hover:bg-green-50 border-green-200" onKeyDown={handleKeyPress}>
                      <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                      {data ? format(data, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={data} onSelect={setData} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Turno *</Label>
                <Select value={turno} onValueChange={setTurno}>
                  <SelectTrigger className="h-12 text-base hover:bg-green-50 border-green-200" onKeyDown={handleKeyPress}>
                    <SelectValue placeholder="Selecione o turno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A" className="text-base py-3">A (Manhã)</SelectItem>
                    <SelectItem value="B" className="text-base py-3">B (Tarde)</SelectItem>
                    <SelectItem value="C" className="text-base py-3">C (Noite)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <LoginButton
            loading={isLoading}
            disabled={
              area === "custos" || area === "crdk"
                ? !usuarioCustos.trim() || !senhaCustos.trim()
                : area === "embalagem"
                ? colaboradoresPreenchidos.length === 0 || !data || !turno
                : area === "admin-embalagem"
                ? !usuarioCustos.trim() || !senhaCustos.trim()
                : !colaborador.trim() || !data || !turno || !area
            }
            onClick={handleLogin}
            area={area}
          />
        </CardContent>
      </Card>
    </div>
  );
}

