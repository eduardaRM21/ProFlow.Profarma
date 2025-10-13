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
import { Loader } from "@/components/ui/loader";

export default function LoginPage() {
  const [colaboradores, setColaboradores] = useState([""]);
  const [colaborador, setColaborador] = useState("");
  const [data, setData] = useState<Date>();
  const [turno, setTurno] = useState("");
  const [area, setArea] = useState("");
  const [usuarioCustos, setUsuarioCustos] = useState("");
  const [senhaCustos, setSenhaCustos] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const norm = (s?: string) => (s ?? "").trim().toLowerCase();
  const same = (a?: string, b?: string) => norm(a) === norm(b);


  const { saveSession } = useSession();

  const colaboradoresPreenchidos = colaboradores.filter((c) => c.trim() !== "");

  // REMOVIDO: Listas de usuários hardcoded - agora busca no banco
  // const usuariosCustos = [...]
  // const usuariosCRDK = [...]
  // const usuariosAdminEmbalagem = [...]

  const validarUsuarioCustos = async () => {
    try {
      // Verificar se a senha foi informada
      if (!senhaCustos.trim()) {
        alert("Por favor, informe a senha.");
        return false;
      }

      // Importar AuthService dinamicamente
      const authModule = await import('@/lib/auth-service')
      const AuthService = authModule.AuthService
      
      if (!AuthService) {
        throw new Error('AuthService não foi encontrado no módulo')
      }

      // Autenticar usuário com senha
      const result = await AuthService.authenticateUser(usuarioCustos.trim(), senhaCustos.trim(), area)
      
      if (!result.success) {
        console.error("❌ Falha na autenticação:", result.error);
        alert(result.error || "Erro na autenticação.");
        return false;
      }

      console.log("✅ Usuário administrativo autenticado para área:", area, "ID:", result.user?.id);
      return true;
    } catch (error: any) {
      console.error("❌ Erro ao validar usuário administrativo:", error);
      alert(`Erro ao validar usuário: ${error.message || 'Tente novamente.'}`);
      return false;
    }
  };

  // NOVA FUNÇÃO: Validar usuário para áreas operacionais (recebimento e embalagem)
  const validarUsuarioOperacional = async (nomeUsuario: string, areaSelecionada: string) => {
    try {
      // Importar getSupabase dinamicamente
      const supabaseModule = await import('@/lib/supabase-client')
      const getSupabase = supabaseModule.getSupabase
      
      if (!getSupabase) {
        throw new Error('getSupabase não foi encontrado no módulo')
      }

      const supabase = getSupabase()

      // Buscar usuário na tabela users para setores operacionais
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, nome, area, ativo')
        .eq('nome', nomeUsuario.trim())
        .eq('ativo', true)
        .single()

      if (userError) {
        console.error("❌ Erro ao buscar usuário:", userError);
        alert(`Erro ao buscar usuário: ${userError.message}`);
        return false;
      }

      if (!userData) {
        alert("Usuário não encontrado ou inativo.");
        return false;
      }

      // Verificar se a área do usuário corresponde à área selecionada
      if (userData.area !== areaSelecionada) {
        alert(`Usuário não tem acesso à área ${areaSelecionada}. Área autorizada: ${userData.area}`);
        return false;
      }

      console.log("✅ Usuário operacional validado:", nomeUsuario, "ID:", userData.id, "para área:", areaSelecionada);
      return true;
    } catch (error: any) {
      console.error("❌ Erro ao validar usuário operacional:", error);
      alert(`Erro ao validar usuário: ${error.message || 'Tente novamente.'}`);
      return false;
    }
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
      // Recebimento e Embalagem: validação no banco (sem senha)
      if (area === "embalagem") {
        if (colaboradoresPreenchidos.length === 0 || !data || !turno) {
          alert("Preencha todos os campos obrigatórios.");
          return;
        }

        // Validar usuário no banco para embalagem
        const usuarioValido = await validarUsuarioOperacional(colaboradoresPreenchidos[0], area);
        if (!usuarioValido) {
          return;
        }

        console.log("✅ Login autorizado (banco): setor Embalagem ->", colaboradoresPreenchidos);
      } else if (area === "recebimento") {
        if (!colaborador.trim() || !data || !turno) {
          alert("Por favor, preencha todos os campos.");
          return;
        }

        // Validar usuário no banco para recebimento
        const usuarioValido = await validarUsuarioOperacional(colaborador, area);
        if (!usuarioValido) {
          return;
        }

        console.log("✅ Login autorizado (banco): setor Recebimento ->", colaborador);
      } else {
        if (!colaborador.trim() || !data || !turno) {
          alert("Por favor, preencha todos os campos.");
          return;
        }

        // Validar usuário no banco para inventário
        const usuarioValido = await validarUsuarioOperacional(colaborador, area);
        if (!usuarioValido) {
          return;
        }

        console.log("✅ Login autorizado (banco): setor", area, "->", colaborador);
      }
    } else if (LocalAuthService.isDatabaseAuthArea(area)) {
      // Custos, CRDK e Admin Embalagem: validação no banco (com senha)
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
      colaboradores: area === "embalagem" ? colaboradoresPreenchidos :
        (LocalAuthService.isDatabaseAuthArea(area) ? [usuarioCustos] : [colaborador]), // Usuário administrativo para setores administrativos
      data: data ? format(data, "yyyy-MM-dd") : new Date().toISOString().split('T')[0], // Data atual para setores administrativos
      turno: turno || "manhã", // Turno padrão para setores administrativos
      usuarioCustos: area === "custos" || area === "crdk" || area === "admin-embalagem" ? usuarioCustos : undefined,
      loginTime: new Date().toISOString(), // CAMPO OBRIGATÓRIO ADICIONADO
    };

    // DEBUG: Verificar dados antes de enviar
    console.log("🔍 Dados de login a serem enviados:", loginData);
    console.log("🔍 Validação dos campos:");
    console.log("  - area:", !!loginData.area, loginData.area);
    console.log("  - colaboradores:", !!loginData.colaboradores, loginData.colaboradores);
    console.log("  - data:", !!loginData.data, loginData.data);
    console.log("  - turno:", !!loginData.turno, loginData.turno);
    console.log("  - loginTime:", !!loginData.loginTime, loginData.loginTime);

    try {
      // SOLUÇÃO: Salvar sessão com identificação única por usuário
      const sessionId = await saveSession(loginData);
      console.log("✅ Sessão salva com sucesso:", loginData);
      console.log("🆔 ID da sessão gerado:", sessionId);

      // SOLUÇÃO ADICIONAL: Salvar no localStorage com ID da sessão específica
      // Isso evita conflitos quando múltiplas pessoas fazem login no mesmo setor
      const sessionKey = 'sistema_session'
      const sessionData = {
        ...loginData,
        loginTime: new Date().toISOString(),
        // NOVO: Usar o ID da sessão do banco para identificação única
        sessionId: sessionId,
        userHash: `${area}_${(area === "embalagem" ? colaboradoresPreenchidos.join('_') : colaborador)}_${Date.now()}`,
        timestamp: new Date().toISOString()
      }

      localStorage.setItem(sessionKey, JSON.stringify(sessionData))
      console.log("✅ Sessão também salva no localStorage com ID específico:", sessionId)

      // Desativar loading de processamento
      setIsLoading(false);

      // Redirecionar para a área correspondente imediatamente
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
      } else if (area === "inventario") {
        router.push("/inventario");
      } else {
        router.push("/painel");
      }

    } catch (error: any) {
      console.error("❌ Erro ao salvar sessão:", error);
      alert(`Erro ao fazer login: ${error.message || 'Tente novamente.'}`);
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
    <>
      {isLoading && <Loader text="Processando login..." duration={0} />}
      <div className={`min-h-screen bg-gradient-to-br ${getAreaColor(area)} flex items-center justify-center p-4`}>
        <Card className="w-full max-w-md bg-white border-gray-200 shadow-lg">
        <CardHeader className="text-center bg-white">
          <div className="flex justify-center mb-4">
            {!area ? (
              // Logo ProFlow quando nenhum setor estiver selecionado
              <div className="flex items-center space-x-3">
                {/* Logo SVG */}
                <div className="w-14 h-15">
                  <svg width="60" height="60" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" role="img">
                    <circle cx="256" cy="256" r="216" fill="#48C142"/>
                    <rect x="196" y="140" width="20" height="232" rx="8" fill="#FFFFFF"/>
                    <rect x="236" y="120" width="24" height="272" rx="8" fill="#FFFFFF"/>
                    <rect x="280" y="140" width="20" height="232" rx="8" fill="#FFFFFF"/>
                    <rect x="316" y="160" width="16" height="192" rx="8" fill="#FFFFFF"/>
                  </svg>
                </div>

                {/* Texto ProFlow */}   
                <div className="text-left">
                  <div className="text-3xl font-bold text-gray-900">ProFlow</div>
                  <div className="text-sm font-medium" style={{ color: "rgb(72, 193, 66)" }}>Fluxo Profissional entre setores</div>
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

          <CardDescription className="text-lg text-center mb-2 mt-2 text-gray-600">
            {area === "recebimento" && "Recebimento de Notas Fiscais"}
            {area === "embalagem" && "Embalagem e Expedição"}
            {area === "admin-embalagem" && "Administração do Setor de Embalagem"}
            {area === "crdk" && "CRDK e Controle"}
            {area === "inventario" && "Inventário por Rua"}
            {area === "custos" && "Custos e Relatórios"}
            {!area && "Selecione sua área de trabalho"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 bg-white">
          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-700">Área de Trabalho *</Label>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className="h-12 text-base hover:bg-green-50 border-green-200 bg-white text-gray-900" onKeyDown={handleKeyPress}>
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
                <Label className="text-base font-medium text-gray-700">Usuário (Custos) *</Label>
                <Input placeholder="Usuário autorizado para Custos" value={usuarioCustos} onChange={(e) => setUsuarioCustos(e.target.value)} className="text-base h-12 bg-white text-gray-900" onKeyPress={handleKeyPress} />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-700">Senha *</Label>
                <Input type="password" placeholder="Senha" value={senhaCustos} onChange={(e) => setSenhaCustos(e.target.value)} className="text-base h-12 bg-white text-gray-900" onKeyPress={handleKeyPress} />
              </div>
            </>
          )}

          {area === "crdk" && (
            <>
              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-700">Usuário (CRDK) *</Label>
                <Input placeholder="Usuário autorizado para CRDK" value={usuarioCustos} onChange={(e) => setUsuarioCustos(e.target.value)} className="text-base h-12 bg-white text-gray-900" onKeyPress={handleKeyPress} />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-700">Senha *</Label>
                <Input type="password" placeholder="Senha" value={senhaCustos} onChange={(e) => setSenhaCustos(e.target.value)} className="text-base h-12 bg-white text-gray-900" onKeyPress={handleKeyPress} />
              </div>
            </>
          )}

          {/* Login personalizado para Admin Embalagem */}
          {area === "admin-embalagem" && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium flex items-center space-x-2 text-gray-700">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span>Usuário Admin *</span>
                  </Label>
                  <Input
                    placeholder="Nome do usuário autorizado"
                    value={usuarioCustos}
                    onChange={(e) => setUsuarioCustos(e.target.value)}
                    className="text-base h-12 border-blue-200 hover:border-blue-300 bg-white text-gray-900"
                    required
                    onKeyPress={handleKeyPress}
                  />
                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded-md">
                    <strong>Apenas usuários autorizados</strong>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium flex items-center space-x-2 text-gray-700">
                    <Lock className="h-4 w-4 text-blue-600" />
                    <span>Senha *</span>
                  </Label>
                  <Input
                    type="password"
                    placeholder="Digite a senha"
                    value={senhaCustos}
                    onChange={(e) => setSenhaCustos(e.target.value)}
                    className="text-base h-12 border-blue-200 hover:border-blue-300 bg-white text-gray-900"
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
                  <Label className="text-base font-medium flex items-center space-x-2 text-gray-700">
                    <Users className="h-4 w-4 text-green-600" />
                    <span>Colaborador(es) *</span>
                  </Label>
                  {colaboradores.length < 3 && (
                    <Button type="button" variant="outline" size="sm" onClick={adicionarColaborador} className="text-green-600 border-green-300 hover:bg-green-50 bg-white">
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
                      className="text-base h-12 flex-1 bg-white text-gray-900"
                      onKeyPress={handleKeyPress}
                    />
                    {colaboradores.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removerColaborador(i)}
                        className="text-red-500 border-red-300 hover:bg-red-50 h-12 px-3 bg-white"
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
                  <Label className="text-base font-medium text-gray-700">Colaborador *</Label>
                  <Input placeholder="Nome do colaborador" value={colaborador} onChange={(e) => setColaborador(e.target.value)} className="text-base h-12 bg-white text-gray-900" onKeyPress={handleKeyPress} />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-700">Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-12 text-base bg-white hover:bg-green-50 border-green-200 text-gray-900" onKeyDown={handleKeyPress}>
                      <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                      {data ? format(data, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white">
                    <Calendar mode="single" selected={data} onSelect={setData} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-700">Turno *</Label>
                <Select value={turno} onValueChange={setTurno}>
                  <SelectTrigger className="h-12 text-base hover:bg-green-50 border-green-200 bg-white text-gray-900" onKeyDown={handleKeyPress}>
                    <SelectValue placeholder="Selecione o turno" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="A" className="text-base py-3 text-gray-900">A (Manhã)</SelectItem>
                    <SelectItem value="B" className="text-base py-3 text-gray-900">B (Tarde)</SelectItem>
                    <SelectItem value="C" className="text-base py-3 text-gray-900">C (Noite)</SelectItem>
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
    </>
  );
}

