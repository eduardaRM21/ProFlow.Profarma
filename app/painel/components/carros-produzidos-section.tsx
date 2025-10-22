"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog,
  DialogContent, DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
 } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Package,
  Calendar,
  MapPin,
  Eye,
  Filter,
  Copy,
  HelpCircle,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import ChatModal from "./chat-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRealtimeMonitoring } from "@/hooks/use-realtime-monitoring";
import { createClient } from '@supabase/supabase-js'
import { EmbalagemNotasBipadasService } from "@/lib/embalagem-notas-bipadas-service";
import { useCarrosRealtime } from "@/hooks/use-carros-realtime";
import { CarroStatus } from "@/lib/carros-status-service";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

const supabaseUrl = 'https://auiidcxarcjjxvyswwhf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1aWlkY3hhcmNqanh2eXN3d2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjcxNjAsImV4cCI6MjA2ODkwMzE2MH0.KCMuEq5p1UHtZp-mJc5RKozEyWhpZg8J023lODrr3rY'
const supabase = createClient(supabaseUrl, supabaseKey)

// Função para determinar o tipo do carro baseado nas NFs
const determinarTipoCarro = (nfs: Array<{ tipoCarga: string }>): "ROD" | "CON" => {
  // Verificar se há pelo menos uma NF com tipo "ROD"
  const temROD = nfs.some(nf => nf.tipoCarga?.toUpperCase().includes('ROD'));
  // Verificar se há pelo menos uma NF com tipo "CON" ou "CONTROLADO"
  const temCON = nfs.some(nf => 
    nf.tipoCarga?.toUpperCase().includes('CON') || 
    nf.tipoCarga?.toUpperCase().includes('CONTROLADO')
  );
  
  // Priorizar ROD se existir, senão CON
  if (temROD) return "ROD";
  if (temCON) return "CON";
  
  // Padrão: ROD (assumindo que a maioria é rodoviária)
  return "ROD";
};

const copiarNFsParaSAP = (nfs: Array<{ numeroNF: string }>) => {
  // Manter o formato original das NFs com zeros à esquerda
  const nfsTexto = nfs.map((nf) => nf.numeroNF.toString()).join("\n");

  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(nfsTexto)
      .then(() => {
        alert(
          `${nfs.length} NFs copiadas para a área de transferência!\n\nFormato: com zeros à esquerda\nPronto para colar no SAP.`
        );
      })
      .catch(() => {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement("textarea");
        textArea.value = nfsTexto;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert(
          `${nfs.length} NFs copiadas para a área de transferência!\n\nFormato: com zeros à esquerda\nPronto para colar no SAP.`
        );
      });
  } else {
    // Fallback para navegadores muito antigos
    const textArea = document.createElement("textarea");
    textArea.value = nfsTexto;
    document.body.appendChild(textArea);
    textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert(
          `${nfs.length} NFs copiadas para a área de transferência!\n\nFormato: com zeros à esquerda\nPronto para colar no SAP.`
        );
  }
};

interface CarroProduzido {
  id: string;
  nomeCarro: string;
  colaboradores: string[];
  data: string;
  turno: string;
  destinoFinal: string;
  quantidadeNFs: number;
  totalVolumes: number;
  dataCriacao: string;
  dataProducao?: string;
  nfs?: Array<{
    id: string;
    numeroNF: string;
    volume: number;
    fornecedor: string;
    codigo: string;
    destino: string;
    tipoCarga: string;
  }>;
  estimativaPallets?: number;
  status?: "embalando" | "divergencia" | "finalizado" | "aguardando_lancamento" | "lancado";
  posicoes?: number | null;
  palletes?: number | null;
  gaiolas?: number | null;
  caixasMangas?: number | null;
  dataInicioEmbalagem?: string;
  dataFinalizacao?: string;
  tipoCarro?: "ROD" | "CON";
}

interface SessionData {
  colaboradores: string[];
  data: string;
  turno: string;
  loginTime: string;
}

interface CarrosProduzidosSectionProps {
  sessionData: SessionData;
}

// Função para formatar data de forma segura
const formatarData = (dataString: string | null | undefined): string => {
  if (!dataString) return "Data não disponível";
  
  try {
    const data = new Date(dataString);
    if (isNaN(data.getTime())) {
      console.warn('Data inválida recebida:', dataString);
      return "Data inválida";
    }
    return data.toLocaleString("pt-BR");
  } catch (error) {
    console.error('Erro ao formatar data:', error, 'Valor recebido:', dataString);
    return "Erro na data";
  }
};

export default function CarrosProduzidosSection({
  sessionData,
}: CarrosProduzidosSectionProps) {
  const [carros, setCarros] = useState<CarroProduzido[]>([]);
  const [filtroDestino, setFiltroDestino] = useState<string>("todos");
  const [filtroColaborador, setFiltroColaborador] = useState<string>("todos");
  const [ajudaVisivel, setAjudaVisivel] = useState(false);
  const [chatAberto, setChatAberto] = useState(false);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  const [modalPallets, setModalPallets] = useState<{
    aberto: boolean;
    carroId: string;
    nomeCarro: string;
  }>({ aberto: false, carroId: "", nomeCarro: "" });
  const [quantidadePosicoes, setQuantidadePosicoes] = useState("");
  const [tiposPosicao, setTiposPosicao] = useState<{
    paletes: boolean;
    gaiolas: boolean;
    caixaManga: boolean;
  }>({ paletes: false, gaiolas: false, caixaManga: false });
  const [quantidadePaletesReais, setQuantidadePaletesReais] = useState("");
  const [quantidadeGaiolas, setQuantidadeGaiolas] = useState("");
  const [quantidadeCaixaManga, setQuantidadeCaixaManga] = useState("");

  const { addRealtimeEvent, carroExcluidoEvent } = useRealtimeMonitoring();
  const { toast } = useToast();

  const conversaId = `${sessionData.colaboradores.join("_")}_${sessionData.data
    }_${sessionData.turno}`;

  const verificarMensagensNaoLidas = async () => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`remetente_id.eq.${conversaId},destinatario_id.eq.${conversaId}`)
        .eq('remetente_tipo', 'admin')
        .eq('lida', false)

      if (data) {
        setMensagensNaoLidas(data.length)
      }
    } catch (error) {
      console.error('Erro ao verificar mensagens não lidas:', error)
    }
  };

  const abrirChat = () => {
    setChatAberto(true);
    setMensagensNaoLidas(0);
  };

  const finalizarEmbalagem = async () => {
    if (
      !quantidadePosicoes.trim() ||
      isNaN(Number(quantidadePosicoes)) ||
      Number(quantidadePosicoes) <= 0
    ) {
      alert("Por favor, informe uma quantidade válida de posições!");
      return;
    }

    const posicoes = Number(quantidadePosicoes);

    // Preparar dados detalhados
    const dadosDetalhados = {
      quantidadePosicoes: posicoes,
      tipoPosicao: tiposPosicao,
      quantidadePaletesReais: quantidadePaletesReais.trim() ? Number(quantidadePaletesReais) : null,
      quantidadeGaiolas: quantidadeGaiolas.trim() ? Number(quantidadeGaiolas) : null,
      quantidadeCaixaManga: quantidadeCaixaManga.trim() ? Number(quantidadeCaixaManga) : null
    };

    try {
      // 1. Se o carro já estiver lançado, apenas atualizar pallets sem alterar status
      const carroAtual = carros.find(c => c.id === modalPallets.carroId);
      const carroJaLancado = carroAtual?.status === "lancado";

      if (carroJaLancado) {
        const resultado = await EmbalagemNotasBipadasService.atualizarPalletsCarro(
          modalPallets.carroId,
          posicoes,
          dadosDetalhados
        );

        if (!resultado.success) {
          alert(`Erro ao atualizar pallets: ${resultado.error}`);
          return;
        }
      } else {
        // 2. Se não estiver lançado, finalizar normalmente
        const resultado = await EmbalagemNotasBipadasService.finalizarCarro(
          modalPallets.carroId,
          posicoes,
          dadosDetalhados
        );

        if (!resultado.success) {
          alert(`Erro ao finalizar carro: ${resultado.error}`);
          return;
        }
      }

      // 2. Atualizar o carro na lista de embalagem
      const carrosEmbalagem = localStorage.getItem("profarma_carros_embalagem");
      if (carrosEmbalagem) {
        const carros = JSON.parse(carrosEmbalagem);
        const carroIndex = carros.findIndex(
          (c: any) => c.id === modalPallets.carroId
        );

        if (carroIndex !== -1) {
          carros[carroIndex] = {
            ...carros[carroIndex],
            status: carroJaLancado ? "lancado" : "finalizado",
            posicoes: posicoes,
            palletes: dadosDetalhados.quantidadePaletesReais || null,
            gaiolas: dadosDetalhados.quantidadeGaiolas || null,
            caixasMangas: dadosDetalhados.quantidadeCaixaManga || null,
            dataFinalizacao: new Date().toISOString(),
          };

          localStorage.setItem(
            "profarma_carros_embalagem",
            JSON.stringify(carros)
          );
        }
      }

      // 3. Atualizar o carro na lista de carros produzidos
      const carrosProduzidos = localStorage.getItem("profarma_carros_produzidos");
      if (carrosProduzidos) {
        const carros = JSON.parse(carrosProduzidos);
        const carroIndex = carros.findIndex(
          (c: any) => c.id === modalPallets.carroId
        );

        if (carroIndex !== -1) {
          carros[carroIndex] = {
            ...carros[carroIndex],
            status: carroJaLancado ? "lancado" : "finalizado",
            posicoes: posicoes,
            palletes: dadosDetalhados.quantidadePaletesReais || null,
            gaiolas: dadosDetalhados.quantidadeGaiolas || null,
            caixasMangas: dadosDetalhados.quantidadeCaixaManga || null,
            dataFinalizacao: new Date().toISOString(),
          };

          localStorage.setItem(
            "profarma_carros_produzidos",
            JSON.stringify(carros)
          );
        }
      }

      // 4. Disparar evento em tempo real
      addRealtimeEvent({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        sector: 'embalagem',
        type: 'carro_created',
        message: `Carro ${modalPallets.nomeCarro} finalizado`,
        data: { 
          nomeCarro: modalPallets.nomeCarro, 
          posicoes, 
          carroId: modalPallets.carroId,
          ...dadosDetalhados
        }
      });

      // 5. Atualizar o carro na lista atual
      setCarros(prevCarros =>
        prevCarros.map(carro =>
          carro.id === modalPallets.carroId
            ? { 
                ...carro, 
                status: carroJaLancado ? "lancado" : "finalizado", 
                posicoes: posicoes,
                palletes: dadosDetalhados.quantidadePaletesReais || null,
                gaiolas: dadosDetalhados.quantidadeGaiolas || null,
                caixasMangas: dadosDetalhados.quantidadeCaixaManga || null,
                dataFinalizacao: new Date().toISOString() 
              }
            : carro
        )
      );

      // 6. Recarregar a lista para sincronizar com o banco
      await carregarCarrosProduzidos();

      // 7. Fechar modal e limpar campos
      setModalPallets({ aberto: false, carroId: "", nomeCarro: "" });
      setQuantidadePosicoes("");
      setTiposPosicao({ paletes: false, gaiolas: false, caixaManga: false });
      setQuantidadePaletesReais("");
      setQuantidadeGaiolas("");
      setQuantidadeCaixaManga("");

      // 8. Mostrar mensagem de sucesso com detalhes
      const mensagemDetalhes = [
        `Posições: ${posicoes} (${Object.entries(tiposPosicao)
          .filter(([key, value]) => value)
          .map(([key]) => {
            if (key === 'paletes') return 'Paletes';
            if (key === 'gaiolas') return 'Gaiolas';
            if (key === 'caixaManga') return 'Caixa Manga';
            return key;
          })
          .join(", ")})`,
        dadosDetalhados.quantidadePaletesReais ? `Posições Reais: ${dadosDetalhados.quantidadePaletesReais}` : null,
        dadosDetalhados.quantidadeGaiolas ? `Gaiolas: ${dadosDetalhados.quantidadeGaiolas}` : null,
        dadosDetalhados.quantidadeCaixaManga ? `Caixa Manga: ${dadosDetalhados.quantidadeCaixaManga}` : null
      ].filter(Boolean).join(" | ");

      alert(
        carroJaLancado 
          ? `${modalPallets.nomeCarro} - Posições atualizadas com sucesso!\n${mensagemDetalhes}`
          : `${modalPallets.nomeCarro} finalizado com sucesso!\n${mensagemDetalhes}`
      );
    } catch (error) {
      console.error('Erro ao finalizar carro:', error);
      alert(`Erro ao finalizar carro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const abrirModalPallets = (carroId: string, nomeCarro: string) => {
    setModalPallets({ aberto: true, carroId, nomeCarro });
    setQuantidadePosicoes("");
    setTiposPosicao({ paletes: false, gaiolas: false, caixaManga: false });
    setQuantidadePaletesReais("");
    setQuantidadeGaiolas("");
    setQuantidadeCaixaManga("");
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "embalando":
        return "Embalando";
      case "divergencia":
        return "Divergência";
      case "aguardando_lancamento":
        return "Aguardando Lançamento";
      case "finalizado":
        return "Finalizado";
      case "lancado":
        return "Lançado";
      default:
        return "Finalizado";
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "embalando":
        return "bg-orange-100 text-orange-800";
      case "divergencia":
        return "bg-red-100 text-red-800";
      case "aguardando_lancamento":
        return "bg-yellow-100 text-yellow-800";
      case "finalizado":
        return "bg-blue-100 text-blue-800";
      case "lancado":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  useEffect(() => {
    carregarCarrosProduzidos();
    
    // Sincronização automática a cada 5 segundos para capturar mudanças do admin
    const interval = setInterval(() => {
      carregarCarrosProduzidos();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    verificarMensagensNaoLidas();
    const interval = setInterval(() => {
      verificarMensagensNaoLidas();
    }, 3000);
    return () => clearInterval(interval);
  }, [conversaId]);

  // Escutar eventos de exclusão de carros em tempo real
  useEffect(() => {
    if (carroExcluidoEvent) {
      console.log('📡 [CARROS_PRODUZIDOS] Evento de exclusão recebido:', carroExcluidoEvent)
      
      // Remover o carro excluído da lista local
      setCarros(prevCarros => {
        const carrosFiltrados = prevCarros.filter(carro => carro.id !== carroExcluidoEvent.carro_id)
        console.log(`🗑️ [CARROS_PRODUZIDOS] Carro ${carroExcluidoEvent.carro_id} removido da lista. Total: ${prevCarros.length} -> ${carrosFiltrados.length}`)
        return carrosFiltrados
      })
      
      // Mostrar toast de confirmação
      toast({
        title: "Carro Excluído",
        description: `Carro ${carroExcluidoEvent.carro_id} foi excluído e removido da lista`,
        duration: 3000,
      })
      
      // Recarregar carros para sincronização completa
      setTimeout(() => {
        carregarCarrosProduzidos()
      }, 1000)
    }
  }, [carroExcluidoEvent, toast]);

  const carregarCarrosProduzidos = async () => {
    try {
      console.log('🚛 Carregando carros produzidos...')

      const carrosEncontrados: CarroProduzido[] = [];
      
      // Obter data atual para filtro
      const hoje = new Date().toISOString().split('T')[0] // Formato YYYY-MM-DD
      console.log('📅 Filtrando carros do dia:', hoje)

      // 1. Buscar carros da tabela embalagem_notas_bipadas
      const resultado = await EmbalagemNotasBipadasService.buscarCarrosProduzidos()
      if (resultado.success && resultado.carros) {
        console.log(`✅ Carregados ${resultado.carros.length} carros da tabela embalagem_notas_bipadas`)
        
        // Filtrar apenas carros do dia atual
        const carrosHoje = resultado.carros.filter(carro => {
          const dataCarro = carro.dataProducao || carro.dataInicioEmbalagem
          if (!dataCarro) return false
          
          const dataCarroFormatada = new Date(dataCarro).toISOString().split('T')[0]
          return dataCarroFormatada === hoje
        })
        
        console.log(`📊 Carros filtrados para hoje: ${carrosHoje.length} de ${resultado.carros.length} total`)
        
        carrosEncontrados.push(...(carrosHoje.map(carro => ({
          ...carro,
          dataCriacao: carro.dataProducao || carro.dataInicioEmbalagem || new Date().toISOString()
        })) as CarroProduzido[]))
        
        // Debug: verificar as datas dos carros após mapeamento
        console.log('🔍 Carros após mapeamento:', carrosEncontrados.map(carro => ({
          id: carro.id,
          dataCriacao: carro.dataCriacao,
          tipoDataCriacao: typeof carro.dataCriacao,
          dataValida: carro.dataCriacao ? !isNaN(new Date(carro.dataCriacao).getTime()) : false,
          dataFormatada: carro.dataCriacao ? formatarData(carro.dataCriacao) : 'N/A'
        })));
      }

      // 2. Buscar carros em embalagem do localStorage (carros marcados como "Embalar carro")
      const carrosEmbalagem = localStorage.getItem("profarma_carros_embalagem");
      if (carrosEmbalagem) {
        try {
          const carros = JSON.parse(carrosEmbalagem);
          carros.forEach((carro: any) => {
            // Verificar se o carro já não foi adicionado da tabela
            const carroJaExiste = carrosEncontrados.find(c => c.id === carro.id);
            
            // Filtrar apenas carros do dia atual
            const dataCarro = carro.dataInicioEmbalagem || carro.dataCriacao
            let carroDoDiaAtual = false
            if (dataCarro) {
              const dataCarroFormatada = new Date(dataCarro).toISOString().split('T')[0]
              carroDoDiaAtual = dataCarroFormatada === hoje
            }
            
            if (!carroJaExiste && carro.statusCarro === "embalando" && carroDoDiaAtual) {
              const carroFormatado: CarroProduzido = {
                id: carro.id,
                nomeCarro: carro.nomeCarro || `${carro.colaboradores.join(" + ")}`,
                colaboradores: carro.colaboradores,
                data: carro.data,
                turno: carro.turno,
                destinoFinal: carro.destinoFinal,
                quantidadeNFs: carro.quantidadeNFs,
                totalVolumes: carro.totalVolumes,
                dataCriacao: carro.dataInicioEmbalagem || carro.dataCriacao,
                status: "embalando", // Carros do localStorage marcados como "embalando"
                posicoes: carro.posicoes,
                palletes: carro.palletes,
                gaiolas: carro.gaiolas,
                caixasMangas: carro.caixasMangas,
                dataInicioEmbalagem: carro.dataInicioEmbalagem,
                dataFinalizacao: carro.dataFinalizacao,
              };
              carrosEncontrados.push(carroFormatado);
            }
          });
        } catch (error) {
          console.error("Erro ao processar carros em embalagem:", error);
        }
      }

      // 3. Fallback para outros carros do localStorage se necessário
      if (carrosEncontrados.length === 0) {
        console.log('🔄 Nenhum carro encontrado, carregando do localStorage como fallback...')
        carregarCarrosDoLocalStorage()
        return
      }

      // Ordenar por data de produção (mais recente primeiro)
      carrosEncontrados.sort(
        (a, b) => {
          const dataA = new Date(a.dataCriacao);
          const dataB = new Date(b.dataCriacao);
          
          // Se alguma data for inválida, colocar no final
          if (isNaN(dataA.getTime())) return 1;
          if (isNaN(dataB.getTime())) return -1;
          
          return dataB.getTime() - dataA.getTime();
        }
      );

      console.log(`✅ Total de ${carrosEncontrados.length} carros carregados`)
      setCarros(carrosEncontrados)

    } catch (error) {
      console.error('❌ Erro inesperado ao carregar carros:', error)
      // Fallback para localStorage em caso de erro
      carregarCarrosDoLocalStorage()
    }
  };

  const carregarCarrosDoLocalStorage = () => {
    console.log('🔄 Carregando carros do localStorage como fallback...')
    // Buscar todos os carros produzidos no localStorage
    const carrosEncontrados: CarroProduzido[] = [];
    
    // Obter data atual para filtro
    const hoje = new Date().toISOString().split('T')[0] // Formato YYYY-MM-DD
    console.log('📅 Filtrando carros do localStorage para o dia:', hoje)

    // Buscar carros da nova lista de carros produzidos
    const carrosProduzidos = localStorage.getItem("profarma_carros_produzidos");
    if (carrosProduzidos) {
      try {
        const carros = JSON.parse(carrosProduzidos);
        carros.forEach((carro: any) => {
          // Filtrar apenas carros do dia atual
          const dataCarro = carro.dataProducao || carro.dataInicioEmbalagem || carro.dataCriacao
          let carroDoDiaAtual = false
          if (dataCarro) {
            const dataCarroFormatada = new Date(dataCarro).toISOString().split('T')[0]
            carroDoDiaAtual = dataCarroFormatada === hoje
          }
          
          if (carroDoDiaAtual) {
            const carroFormatado: CarroProduzido = {
              id: carro.id,
              nomeCarro: carro.nomeCarro || `${carro.colaboradores.join(" + ")}`,
              colaboradores: carro.colaboradores,
              data: carro.data,
              turno: carro.turno,
              destinoFinal: carro.destinoFinal,
              quantidadeNFs: carro.quantidadeNFs,
              totalVolumes: carro.totalVolumes,
              dataCriacao: carro.dataProducao || carro.dataInicioEmbalagem || carro.dataCriacao || new Date().toISOString(),
              status: carro.status,
              posicoes: carro.posicoes,
              palletes: carro.palletes,
              gaiolas: carro.gaiolas,
              caixasMangas: carro.caixasMangas,
              dataInicioEmbalagem: carro.dataInicioEmbalagem,
              dataFinalizacao: carro.dataFinalizacao,
            };
            carrosEncontrados.push(carroFormatado);
          }
        });
      } catch (error) {
        console.error("Erro ao processar carros produzidos:", error);
      }
    }

    // Buscar carros em embalagem (fallback para compatibilidade)
    const carrosEmbalagem = localStorage.getItem("profarma_carros_embalagem");
    if (carrosEmbalagem) {
      try {
        const carros = JSON.parse(carrosEmbalagem);
        carros.forEach((carro: any) => {
          // Verificar se o carro já não foi adicionado da lista de carros produzidos
          const carroJaExiste = carrosEncontrados.find(c => c.id === carro.id);
          
          // Filtrar apenas carros do dia atual
          const dataCarro = carro.dataInicioEmbalagem || carro.dataCriacao
          let carroDoDiaAtual = false
          if (dataCarro) {
            const dataCarroFormatada = new Date(dataCarro).toISOString().split('T')[0]
            carroDoDiaAtual = dataCarroFormatada === hoje
          }
          
          if (!carroJaExiste && carroDoDiaAtual) {
            const carroFormatado: CarroProduzido = {
              id: carro.id,
              nomeCarro: carro.nomeCarro || `${carro.colaboradores.join(" + ")}`,
              colaboradores: carro.colaboradores,
              data: carro.data,
              turno: carro.turno,
              destinoFinal: carro.destinoFinal,
              quantidadeNFs: carro.quantidadeNFs,
              totalVolumes: carro.totalVolumes,
              dataCriacao: carro.dataInicioEmbalagem || carro.dataCriacao || new Date().toISOString(),
              status: carro.status,
              posicoes: carro.posicoes,
              palletes: carro.palletes,
              gaiolas: carro.gaiolas,
              caixasMangas: carro.caixasMangas,
              dataInicioEmbalagem: carro.dataInicioEmbalagem,
              dataFinalizacao: carro.dataFinalizacao,
            };
            carrosEncontrados.push(carroFormatado);
          }
        });
      } catch (error) {
        console.error("Erro ao processar carros em embalagem:", error);
      }
    }

    // Iterar por todas as chaves do localStorage para encontrar sessões finalizadas antigas
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (chave?.startsWith("profarma_nfs_")) {
        const dados = localStorage.getItem(chave);
        if (dados) {
          try {
            const sessao = JSON.parse(dados);

            // Verificar se o carro foi finalizado (tem status "finalizado" ou "em_producao")
            if (
              sessao.statusCarro === "em_producao"
            ) {
              const nfsValidas =
                sessao.nfs?.filter((nf: any) => nf.status === "valida") || [];

              if (nfsValidas.length > 0) {
                // Extrair informações da chave (formato: profarma_nfs_colaborador_data_turno)
                const partesChave = chave.split("_");
                const colaboradoresStr = partesChave.slice(2, -2).join("_");
                const data = partesChave[partesChave.length - 2];
                const turno = partesChave[partesChave.length - 1];

                const destinosUnicos = [
                  ...new Set(nfsValidas.map((nf: any) => nf.destinoFinal)),
                ];
                const totalVolumes = nfsValidas.reduce(
                  (sum: number, nf: any) => sum + nf.volume,
                  0
                );

                const carro: CarroProduzido = {
                  id: chave,
                  nomeCarro: `Carro ${chave}`,
                  colaboradores: colaboradoresStr
                    .split("+")
                    .map((c) => c.trim()),
                  data,
                  turno,
                  destinoFinal: destinosUnicos.join(", "),
                  quantidadeNFs: nfsValidas.length,
                  totalVolumes,
                  dataCriacao:
                    sessao.ultimaAtualizacao || new Date().toISOString(),
                  nfs: nfsValidas.map((nf: any) => ({
                    id: nf.id,
                    numeroNF: nf.numeroNF,
                    volume: nf.volume,
                    fornecedor: nf.nomeFornecedor,
                    codigo: nf.codigo,
                  })),
                  estimativaPallets: Math.ceil(totalVolumes / 100), // Estimativa: 100 volumes por pallet
                  status:
                    sessao.statusCarro === "em_producao"
                      ? "embalando"
                      : "finalizado",
                };

                carrosEncontrados.push(carro);
              }
            }
          } catch (error) {
            console.error("Erro ao processar dados do localStorage:", error);
          }
        }
      }
    }

    // Ordenar por data de produção (mais recente primeiro)
    carrosEncontrados.sort(
      (a, b) => {
        const dataA = new Date(a.dataCriacao);
        const dataB = new Date(b.dataCriacao);
        
        // Se alguma data for inválida, colocar no final
        if (isNaN(dataA.getTime())) return 1;
        if (isNaN(dataB.getTime())) return -1;
        
        return dataB.getTime() - dataA.getTime();
      }
    );

    setCarros(carrosEncontrados);
  };

  const getTurnoLabel = (turno: string) => {
    switch (turno) {
      case "A":
        return "Manhã";
      case "B":
        return "Tarde";
      case "C":
        return "Noite";
      default:
        return turno;
    }
  };

  const getTurnoColor = (turno: string) => {
    switch (turno) {
      case "A":
        return "bg-yellow-100 text-yellow-800";
      case "B":
        return "bg-orange-100 text-orange-800";
      case "C":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Filtrar carros
  const carrosFiltrados = carros.filter((carro) => {
    const filtroDestinoOk =
      filtroDestino === "todos" || carro.destinoFinal.includes(filtroDestino);
    const filtroColaboradorOk =
      filtroColaborador === "todos" ||
      carro.colaboradores.some((col) =>
        col.toLowerCase().includes(filtroColaborador.toLowerCase())
      );

    return filtroDestinoOk && filtroColaboradorOk;
  });

  // Obter listas únicas para filtros
  const destinosUnicos = [
    ...new Set(carros.flatMap((c) => c.destinoFinal.split(", "))),
  ];
  const colaboradoresUnicos = [
    ...new Set(carros.flatMap((c) => c.colaboradores)),
  ];

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <Card className="border-emerald-200">
        <CardHeader className="pb-2 sm:pb-6 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 flex-shrink-0" />
              <span className="text-sm sm:text-base lg:text-lg truncate">
                Carros Produzidos
              </span>
            </div>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              <Calendar className="h-3 w-3 mr-1" />
              Hoje
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-3 sm:mb-4">
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">
                {carros.length}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Total de Carros
              </div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">
                {carros.reduce((sum, c) => sum + c.quantidadeNFs, 0)}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Total de NFs
              </div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">
                {carros.reduce((sum, c) => sum + c.totalVolumes, 0)}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Total Volumes
              </div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">
                {carros.reduce((sum, c) => sum + (c.posicoes || 0), 0)}
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                Qtdd Posições Pallets
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Filtros:</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="flex items-center space-x-2 flex-1">
                <span className="text-xs sm:text-sm text-gray-600 min-w-0 flex-shrink-0">
                  Destino:
                </span>
                <Select value={filtroDestino} onValueChange={setFiltroDestino}>
                  <SelectTrigger className="w-full sm:w-40 h-8 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {destinosUnicos.map((destino) => (
                      <SelectItem key={destino} value={destino}>
                        {destino}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 flex-1">
                <span className="text-xs sm:text-sm text-gray-600 min-w-0 flex-shrink-0">
                  Colaborador:
                </span>
                <Select
                  value={filtroColaborador}
                  onValueChange={setFiltroColaborador}
                >
                  <SelectTrigger className="w-full sm:w-40 h-8 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {colaboradoresUnicos.map((colaborador) => (
                      <SelectItem key={colaborador} value={colaborador}>
                        {colaborador}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                onClick={() => carregarCarrosProduzidos()}
                size="sm"
                className="w-full sm:w-auto text-xs sm:text-sm px-3 sm:px-4"
              >
                <span className="hidden sm:inline">Atualizar Lista</span>
                <span className="sm:hidden">Atualizar</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de carros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
        {carrosFiltrados.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-8 text-gray-500 text-sm">
              {carros.length === 0
                ? "Nenhum carro produzido ainda."
                : "Nenhum carro encontrado com os filtros selecionados."}
            </CardContent>
          </Card>
        ) : (
          carrosFiltrados.map((carro) => (
            <Card
              key={carro.id}
              className="border-emerald-200 hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-2 sm:pb-3 px-2 sm:px-4 md:px-6 pt-2 sm:pt-4 md:pt-6">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 flex-shrink-0" />
                    <span className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                      {carro.colaboradores.length === 1
                        ? carro.colaboradores[0]
                        : `${carro.colaboradores.join(" + ")} (Dupla)`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <Badge
                      className={`text-xs ${getStatusColor(carro.status)}`}
                    >
                      {getStatusLabel(carro.status)}
                    </Badge>

                    <Badge className={`text-xs ${getTurnoColor(carro.turno)}`}>
                      <span className="hidden sm:inline">Turno</span>
                      {" "} {carro.turno}
                      <span className="hidden sm:inline">
                        {" "}
                        - {getTurnoLabel(carro.turno)}
                      </span>
                    </Badge>
                    
                    {/* Badge do tipo do carro */}
                    <Badge 
                      className={`text-xs ${
                        determinarTipoCarro(carro.nfs || []) === "ROD" 
                          ? "bg-blue-100 text-blue-800 border-blue-200" 
                          : "bg-orange-100 text-orange-800 border-orange-200"
                      }`}
                    >
                      {determinarTipoCarro(carro.nfs || []) === "ROD" ? "🚛 ROD" : "📦 CON"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2 sm:space-y-3 px-2 sm:px-4 md:px-6">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{carro.data}</span>
                  <span>•</span>
                  <span>
                    {formatarData(carro.dataCriacao)}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">Destino:</span>
                  <span>{carro.destinoFinal}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 py-2">
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-bold text-emerald-600">
                      {carro.quantidadeNFs}
                    </div>
                    <div className="text-xs text-gray-500">NFs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-bold text-green-600">
                      {carro.totalVolumes}
                    </div>
                    <div className="text-xs text-gray-500">Volumes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-bold text-blue-600">
                      {carro.estimativaPallets || 0}
                    </div>
                    <div className="text-xs text-gray-500">Estimativa</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-bold text-purple-600">
                      {carro.posicoes || 0}
                    </div>
                    <div className="text-xs text-gray-500">Posições</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-2 bg-transparent text-xs sm:text-sm"
                        size="sm"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Ver NFs do Carro</span>
                        <span className="sm:hidden">Ver NFs</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] md:max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                          <Package className="h-5 w-5 text-emerald-600" />
                          <span>
                            NFs do Carro - {carro.colaboradores.join(" + ")}
                          </span>
                        </DialogTitle>
            <DialogDescription>
              Descrição do modal para acessibilidade
            </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 p-2 sm:p-4 bg-gray-50 rounded-lg">
                          <div>
                            <div className="text-sm text-gray-600">Data</div>
                            <div className="font-medium">{carro.data}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Turno</div>
                            <div className="font-medium">
                              Turno {carro.turno} - {getTurnoLabel(carro.turno)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Destino</div>
                            <div className="font-medium">
                              {carro.destinoFinal}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">
                              Produzido em
                            </div>
                            <div className="font-medium text-xs">
                              {formatarData(carro.dataCriacao)}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900">
                            Lista de NFs ({carro.quantidadeNFs} itens)
                          </h4>
                          <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full text-xs sm:text-sm text-left">
                              <thead className="bg-gray-50 text-gray-700 font-medium">
                                <tr>
                                  <th className="px-2 sm:px-4 py-1 sm:py-2">Código</th>
                                  <th className="px-2 sm:px-4 py-1 sm:py-2">NF</th>
                                  <th className="px-2 sm:px-4 py-1 sm:py-2">Forn</th>
                                  <th className="px-2 sm:px-4 py-1 sm:py-2">Destino</th>
                                  <th className="px-2 sm:px-4 py-1 sm:py-2">Tipo</th>
                                  <th className="px-2 sm:px-4 py-1 sm:py-2 text-center">
                                    Volume
                                  </th>
                                  <th className="px-2 sm:px-4 py-1 sm:py-2 text-center">
                                    Total
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {carro.nfs?.map((nf, index) => (
                                  <tr
                                    key={nf.id}
                                    className={
                                      index % 2 === 0
                                        ? "bg-white"
                                        : "bg-gray-50"
                                    }
                                  >
                                    <td className="px-2 sm:px-4 py-1 sm:py-2 font-mono text-xs">
                                      {nf.codigo}
                                    </td>
                                    <td className="px-2 sm:px-4 py-1 sm:py-2 font-medium">
                                      {nf.numeroNF}
                                    </td>
                                    <td
                                      className="px-2 sm:px-4 py-1 sm:py-2 truncate max-w-[80px] sm:max-w-[120px]"
                                      title={nf.fornecedor}
                                    >
                                      {nf.fornecedor}
                                    </td>
                                    <td className="px-2 sm:px-4 py-1 sm:py-2 truncate max-w-[80px] sm:max-w-[120px]">
                                      {nf.destino}
                                    </td>
                                    <td className="px-2 sm:px-4 py-1 sm:py-2 truncate max-w-[80px] sm:max-w-[120px]">
                                      {nf.tipoCarga}
                                    </td>

                                    <td className="px-2 sm:px-4 py-1 sm:py-2 text-center">
                                      {nf.volume}
                                    </td>
                                    <td className="px-2 sm:px-4 py-1 sm:py-2 text-center font-semibold">
                                      {nf.volume}
                                    </td>
                                  </tr>
                                ))}
                                <tr className="bg-emerald-100 text-emerald-800 font-bold">
                                  <td
                                    className="px-2 sm:px-4 py-1 sm:py-2 text-right"
                                    colSpan={6}
                                  >
                                    Total do Carro:
                                  </td>
                                  <td className="px-2 sm:px-4 py-1 sm:py-2 text-center">
                                    {carro.totalVolumes}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {(carro.status === "embalando" || carro.status === "divergencia" || carro.status === "aguardando_lancamento" || carro.status === "finalizado" || carro.status === "lancado") && (
                    <Button
                      onClick={() =>
                        abrirModalPallets(
                          carro.id,
                          `${carro.colaboradores.join(" + ")}`
                        )
                      }
                      className={`flex-2 ${(carro.status as string) === "embalando"
                        ? "bg-green-600 hover:bg-green-700"
                        : (carro.status as string) === "aguardando_lancamento"
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : (carro.status as string) === "finalizado"
                            ? "bg-gray-600 hover:bg-gray-700"
                            : (carro.status as string) === "lancado"
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : "bg-blue-600 hover:bg-blue-700"
                        } text-white text-xs sm:text-sm`}
                      size="sm"
                    >
                      <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline">
                        {(carro.status as string) === "embalando" ? "Finalizar" : (carro.status as string) === "divergencia" ? "Finalizar mesmo assim" : (carro.status as string) === "aguardando_lancamento" ? "Finalizar" : (carro.status as string) === "finalizado" ? "Finalizado" : (carro.status as string) === "lancado" ? "Atualizar Pallets" : "Atualizar Pallets"}
                      </span>
                      <span className="sm:hidden">
                        {(carro.status as string) === "embalando" ? "Finalizar" : (carro.status as string) === "divergencia" ? "Finalizar" : (carro.status as string) === "aguardando_lancamento" ? "Finalizar" : (carro.status as string) === "finalizado" ? "Finalizado" : (carro.status as string) === "lancado" ? "Pallets" : "Pallets"}
                      </span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Botões de Ajuda e Chat Flutuantes */}
      <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 flex flex-col space-y-2 sm:space-y-3 z-50">
        {/* Botão Chat */}
        <button
          onClick={abrirChat}
          className="relative bg-green-600 hover:bg-green-700 text-white rounded-full p-3 sm:p-4 shadow-lg transition-all duration-200 hover:scale-110"
          title="Chat Interno"
        >
          <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
          {mensagensNaoLidas > 0 && (
            <span className="absolute -top-1 sm:-top-2 -right-1 sm:-right-2 bg-red-500 text-white rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center text-xs font-bold">
              {mensagensNaoLidas}
            </span>
          )}
        </button>

        {/* Botão Ajuda */}
        <button
          onClick={() => setAjudaVisivel(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 sm:p-4 shadow-lg transition-all duration-200 hover:scale-110"
          title="Ajuda"
        >
          <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>

      {/* Modal de Ajuda */}
      <Dialog open={ajudaVisivel} onOpenChange={setAjudaVisivel}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] md:max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <HelpCircle className="h-6 w-6 text-blue-600" />
              <span>Central de Ajuda - Carros Produzidos</span>
            </DialogTitle>
            <DialogDescription>
              Descrição do modal para acessibilidade
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                🚛 Como Usar esta Seção
              </h3>
              <div className="space-y-3">
                <div className="border-l-4 border-emerald-500 pl-4">
                  <h4 className="font-medium text-gray-900">
                    1. Visualizar Carros Finalizados
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Esta seção mostra todos os carros que foram embalados e
                    estão prontos para entrega.
                  </p>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium text-gray-900">
                    2. Filtros Disponíveis
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Use os filtros por destino e colaborador para encontrar
                    carros específicos rapidamente.
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium text-gray-900">
                    3. Detalhes do Carro
                  </h4>
                  <p className="text-sm text-gray-600 mt-1 j">
                    Clique em "Ver NFs do Carro" para visualizar todas as notas
                    fiscais incluídas no carro.
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-medium text-gray-900">
                    4. Copiar NFs para SAP
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Use o botão "Copiar NFs" para copiar a lista de números das
                    notas fiscais e colar diretamente no SAP.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                📊 Informações Exibidas
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <h4 className="font-medium text-emerald-900">
                    Total de Carros
                  </h4>
                  <p className="text-xs text-emerald-700">
                    Quantidade total de carros produzidos
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <h4 className="font-medium text-green-900">Total de NFs</h4>
                  <p className="text-xs text-green-700">
                    Soma de todas as notas fiscais
                  </p>
                </div>
                <div className="bg-teal-50 p-3 rounded-lg">
                  <h4 className="font-medium text-teal-900">
                    Total de Volumes
                  </h4>
                  <p className="text-xs text-teal-700">
                    Soma de todos os volumes bipados
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-900">
                    Pallets Estimados
                  </h4>
                  <p className="text-xs text-blue-700">
                    Estimativa baseada em 100 volumes por pallet
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                💡 Dicas Importantes
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  • Os carros são ordenados por data de produção (mais recentes
                  primeiro)
                </p>
                <p>
                  • Use o botão "Atualizar Lista" para recarregar os dados se
                  necessário
                </p>
                <p>
                  • A função "Copiar NFs" mantém o formato original com zeros à
                  esquerda
                </p>
                <p>
                  • Cada carro mostra o colaborador responsável e o turno de
                  produção
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Quantidade de Pallets */}
      <Dialog
        open={modalPallets.aberto}
        onOpenChange={(open) =>
          !open &&
          setModalPallets({ aberto: false, carroId: "", nomeCarro: "" })
        }
      >
        <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Package className="h-6 w-6 text-green-600" />
              <span>
                {carros.find(c => c.id === modalPallets.carroId)?.status === "lancado" 
                  ? "Atualizar Posições - " 
                  : "Finalizar Embalagem - "
                }
                {modalPallets.nomeCarro}
              </span>
            </DialogTitle>
            <DialogDescription>
              Descrição do modal para acessibilidade
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6 p-1 sm:p-2">
            <div>
              <Label htmlFor="quantidadePosicoes">
                Quantidade de Posições *
              </Label>
              <Input
                id="quantidadePosicoes"
                type="number"
                min="1"
                placeholder="Ex: 3"
                value={quantidadePosicoes}
                onChange={(e) => setQuantidadePosicoes(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    finalizarEmbalagem();
                  }
                }}
                className="mt-1 w-full text-base sm:text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Informe a quantidade de posições onde os pallets foram colocados.
              </p>
            </div>

            {/* Opções de tipo de posição - só aparecem após informar quantidade */}
            {quantidadePosicoes.trim() && (
              <div className="space-y-3">
                <Label>Tipos de Posição</Label>
                <p className="text-xs text-gray-500">
                  Marque quais tipos de posição foram utilizados:
                </p>
                
                <div className="space-y-3 sm:space-y-2">
                  <div className="flex items-center space-x-3 sm:space-x-2">
                    <input
                      type="checkbox"
                      id="paletes"
                      checked={tiposPosicao.paletes}
                      onChange={(e) => setTiposPosicao(prev => ({
                        ...prev,
                        paletes: e.target.checked
                      }))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4 sm:w-3 sm:h-3"
                    />
                    <Label htmlFor="paletes" className="text-base sm:text-sm font-normal cursor-pointer">
                      Paletes
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 sm:space-x-2">
                    <input
                      type="checkbox"
                      id="gaiolas"
                      checked={tiposPosicao.gaiolas}
                      onChange={(e) => setTiposPosicao(prev => ({
                        ...prev,
                        gaiolas: e.target.checked
                      }))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4 sm:w-3 sm:h-3"
                    />
                    <Label htmlFor="gaiolas" className="text-base sm:text-sm font-normal cursor-pointer">
                      Gaiolas
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 sm:space-x-2">
                    <input
                      type="checkbox"
                      id="caixaManga"
                      checked={tiposPosicao.caixaManga}
                      onChange={(e) => setTiposPosicao(prev => ({
                        ...prev,
                        caixaManga: e.target.checked
                      }))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4 sm:w-3 sm:h-3"
                    />
                    <Label htmlFor="caixaManga" className="text-base sm:text-sm font-normal cursor-pointer">
                      Caixa Manga
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* Quantidades detalhadas - só aparecem após marcar tipos */}
            {Object.values(tiposPosicao).some(Boolean) && (
              <div className="space-y-3">
                <Label>Quantidades Detalhadas</Label>
                
                {tiposPosicao.paletes && (
                  <div>
                    <Label htmlFor="quantidadePaletesReais">
                      Quantidade palletes reais
                    </Label>
                    <Input
                      id="quantidadePaletesReais"
                      type="number"
                      min="0"
                      placeholder="Ex: 5 (pode ser maior que posições)"
                      value={quantidadePaletesReais}
                      onChange={(e) => setQuantidadePaletesReais(e.target.value)}
                      className="mt-1 w-full text-base sm:text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Pode ser maior que posições (paletes dobrados)
                    </p>
                  </div>
                )}

                {tiposPosicao.gaiolas && (
                  <div>
                    <Label htmlFor="quantidadeGaiolas">
                      Quantidade de Gaiolas
                    </Label>
                    <Input
                      id="quantidadeGaiolas"
                      type="number"
                      min="0"
                      placeholder="Ex: 0"
                      value={quantidadeGaiolas}
                      onChange={(e) => setQuantidadeGaiolas(e.target.value)}
                      className="mt-1 w-full text-base sm:text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Quantidade total de gaiolas utilizadas
                    </p>
                  </div>
                )}

                {tiposPosicao.caixaManga && (
                  <div>
                    <Label htmlFor="quantidadeCaixaManga">
                      Quantidade de Caixa Manga
                    </Label>
                    <Input
                      id="quantidadeCaixaManga"
                      type="number"
                      min="0"
                      placeholder="Ex: 8 (pode ser maior que posições)"
                      value={quantidadeCaixaManga}
                      onChange={(e) => setQuantidadeCaixaManga(e.target.value)}
                      className="mt-1 w-full text-base sm:text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Pode ser maior que posições (caixas dobradas)
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="text-sm sm:text-xs text-gray-600 space-y-1 sm:space-y-0.5 bg-gray-50 p-3 sm:p-2 rounded-lg">
              <p>• Quantidade de posições é obrigatório (onde os pallets foram colocados)</p>
              <p>• Marque quais tipos de posição foram utilizados (pode marcar múltiplos)</p>
              <p>• Campos de quantidade aparecem apenas para os tipos marcados</p>
              <p>• Quantidades podem ser maiores que posições (itens dobrados)</p>
              <p>• Esta informação será registrada para controle</p>
              <p>• {carros.find(c => c.id === modalPallets.carroId)?.status === "lancado" 
                  ? "Após confirmar, os pallets serão atualizados sem alterar o status do carro" 
                  : "Após confirmar, o carro será marcado como concluído"
                }</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
              <Button
                onClick={() => finalizarEmbalagem()}
                disabled={!quantidadePosicoes.trim() || !Object.values(tiposPosicao).some(Boolean)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-base sm:text-sm h-12 sm:h-10"
              >
                <CheckCircle2 className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
                {carros.find(c => c.id === modalPallets.carroId)?.status === "lancado" 
                  ? "Atualizar Pallets" 
                  : "Finalizar Embalagem"
                }
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setModalPallets({
                    aberto: false,
                    carroId: "",
                    nomeCarro: "",
                  });
                  setQuantidadePosicoes("");
                  setTiposPosicao({ paletes: false, gaiolas: false, caixaManga: false });
                  setQuantidadePaletesReais("");
                  setQuantidadeGaiolas("");
                  setQuantidadeCaixaManga("");
                }}
                className="text-base sm:text-sm h-12 sm:h-10"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Modal */}
      <ChatModal
        isOpen={chatAberto}
        onClose={() => setChatAberto(false)}
        sessionData={sessionData}
      />
    </div>
  );
}
