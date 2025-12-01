#!/usr/bin/env node

/**
 * Serviço de Impressão Standalone
 * 
 * Este script deve ser executado em uma máquina que tenha acesso à rede local da impressora.
 * 
 * Uso:
 *   node scripts/printer-service.js
 * 
 * O serviço ficará escutando na porta 3001 e receberá requisições de impressão do Next.js.
 */

const net = require('net');
const http = require('http');

// Configurações da impressora
const PRINTER_IP = '10.27.30.75';
const PRINTER_PORT = 6101;
const ALTERNATE_PORT = 9100;
const SERVICE_PORT = 3001;

// Função para gerar ZPL
function gerarZPL(codigoPalete, dados) {
  // ZPL para etiqueta de palete
  // Configurações: Largura 100mm x Altura 75mm (4x3" - 10x7.5cm)
  // Margens: Superior/Inferior 0,5mm, Esquerda/Direita 1mm
  // Texto e QR code centralizados
  
  // Conversão para dots (203 dpi: 1mm = 8 dots exatos)
  const larguraMM = 100;
  const alturaMM = 75;
  const margemEsquerdaMM = 2;
  const margemSuperiorMM = 2;
  
  // Conversão precisa: 203 DPI = 7.992 dots/mm (usar 8 para simplificar)
  // Para Zebra ZT411: usar valores em dots
  const larguraDots = Math.round(larguraMM * 8); // 800 dots (100mm)
  const alturaDots = Math.round(alturaMM * 8); // 600 dots (75mm)
  
  // Posições em dots (203 dpi)
  const margemEsquerda = Math.round(margemEsquerdaMM * 8); // 16 dots
  const margemSuperior = Math.round(margemSuperiorMM * 8); // 16 dots
  const centroHorizontal = Math.round(larguraDots / 2); // 400 dots (centro)
  const larguraDisponivel = larguraDots - (margemEsquerda * 2); // 768 dots (largura útil)
  
  // Posições verticais (em dots) - otimizadas para caber em 75mm
  // Total disponível: 600 dots (75mm * 8)
  const yTextoLabel = margemSuperior + 15; // ~31 dots
  const yQRCode = margemSuperior + 50; // ~66 dots
  const tamanhoQRCode = 200; // tamanho do QR code em dots (aumentado para impressão)
  const yCodigoPalete = margemSuperior + 50 + tamanhoQRCode + 15; // abaixo do QR code (~281 dots)
  const yCodigoCargaWMS = margemSuperior + 50 + tamanhoQRCode + 40; // código carga + WMS (~306 dots)
  const yInfoLinha1 = margemSuperior + 50 + tamanhoQRCode + 60; // informações extras linha 1 (~326 dots)
  const yInfoLinha2 = margemSuperior + 50 + tamanhoQRCode + 80; // informações extras linha 2 (~346 dots)
  
  // Preparar código carga + WMS
  const codigoCargaWMS = dados && (dados.codigoCarga || dados.idWMS)
    ? `${dados.codigoCarga || ''}${dados.codigoCarga && dados.idWMS ? ' - ' : ''}${dados.idWMS || ''}`
    : '';
  
  // Preparar informações extras (textos reduzidos para caber no papel menor)
  const infoLinha1 = dados 
    ? `NFs: ${dados.quantidadeNFs || 0} | Vol: ${dados.totalVolumes || 0} | Dest: ${(dados.destino || '').substring(0, 8)}`
    : '';
  const infoLinha2 = dados && (dados.posicoes || dados.quantidadePaletes)
    ? `Pos: ${dados.posicoes ? `${dados.posicoes}` : ''}${dados.posicoes && dados.quantidadePaletes ? ' | ' : ''}${dados.quantidadePaletes ? `Pal: ${dados.quantidadePaletes}` : ''}`
    : '';
  
  // Gerar ZPL com QR code (^BQ = QR code em ZPL)
  // Para Zebra ZT411: usar comandos específicos
  // ^MN = media tracking, ^PR = print rate, ^PW = label width, ^LL = label length
  // Sintaxe: ^BQN,modelo,tamanho^FDLA,dados^FS
  // modelo: 2 (correção de erros), tamanho: 10 (módulo padrão para boa legibilidade)
  // Para centralizar: usar margem esquerda como origem e largura total para ^FB
  const origemX = margemEsquerda; // Começar da margem esquerda
  
  let zpl = `^XA
^MNy
^PR6
^PW${larguraDots}
^LL${alturaDots}
^CF0,60
^FO${origemX},${yTextoLabel}^FB${larguraDisponivel},1,0,C^FDCODIGO PALETE^FS
^FO${centroHorizontal},${yQRCode}^BQN,2,10^FDLA,${codigoPalete}^FS
^CF0,30
^FO${origemX},${yCodigoPalete}^FB${larguraDisponivel},1,0,C^FD${codigoPalete}^FS`;
  
  // Adicionar código da carga e ID WMS se disponíveis
  if (codigoCargaWMS) {
    zpl += `
^CF0,38
^FO${origemX},${yCodigoCargaWMS}^FB${larguraDisponivel},1,0,C^FD${codigoCargaWMS}^FS`;
  }
  
  // Adicionar informações extras se disponíveis
  if (infoLinha1) {
    zpl += `
^CF0,32
^FO${origemX},${yInfoLinha1}^FB${larguraDisponivel},1,0,C^FD${infoLinha1}^FS`;
  }
  if (infoLinha2) {
    zpl += `
^CF0,32
^FO${origemX},${yInfoLinha2}^FB${larguraDisponivel},1,0,C^FD${infoLinha2}^FS`;
  }
  
  zpl += `
^XZ`;
  return zpl;
}

// Função para gerar EPL
function gerarEPL(codigoPalete, dados) {
  // EPL para etiqueta de palete
  // Configurações: Largura 100mm x Altura 75mm (4x3" - 10x7.5cm)
  // Margens: Superior/Inferior 0,5mm, Esquerda/Direita 1mm
  // Texto e QR code centralizados
  
  // EPL usa pontos (203 dpi: 1mm ≈ 8 pontos)
  const larguraMM = 100;
  const alturaMM = 75;
  const margemEsquerdaMM = 1;
  const margemSuperiorMM = 0.5;
  
  // Posições em pontos
  const margemEsquerda = Math.round(margemEsquerdaMM * 8); // 8 pontos
  const margemSuperior = Math.round(margemSuperiorMM * 8); // 4 pontos
  const centroHorizontal = Math.round((larguraMM / 2) * 8); // 400 pontos (centro)
  
  // Posições verticais - otimizadas para caber em 75mm
  const yTextoLabel = margemSuperior + 5; // ~9 pontos
  const yQRCode = margemSuperior + 25; // ~29 pontos
  const tamanhoQRCode = 140; // tamanho do QR code em pontos (reduzido para caber melhor)
  const yCodigoPalete = margemSuperior + 25 + tamanhoQRCode + 8; // abaixo do QR code (~177 pontos)
  const yCodigoCargaWMS = margemSuperior + 25 + tamanhoQRCode + 22; // código carga + WMS (~191 pontos)
  const yInfoLinha1 = margemSuperior + 25 + tamanhoQRCode + 36; // informações extras linha 1 (~205 pontos)
  const yInfoLinha2 = margemSuperior + 25 + tamanhoQRCode + 48; // informações extras linha 2 (~217 pontos)
  
  // Preparar código carga + WMS
  const codigoCargaWMS = dados && (dados.codigoCarga || dados.idWMS)
    ? `${dados.codigoCarga || ''}${dados.codigoCarga && dados.idWMS ? ' - ' : ''}${dados.idWMS || ''}`
    : '';
  
  // Preparar informações extras (textos reduzidos para caber no papel menor)
  const infoLinha1 = dados 
    ? `NFs: ${dados.quantidadeNFs || 0} | Vol: ${dados.totalVolumes || 0} | Dest: ${(dados.destino || '').substring(0, 8)}`
    : '';
  const infoLinha2 = dados && (dados.posicoes || dados.quantidadePaletes)
    ? `Pos: ${dados.posicoes ? `1-${dados.posicoes}` : ''}${dados.posicoes && dados.quantidadePaletes ? ' | ' : ''}${dados.quantidadePaletes ? `Pal: ${dados.quantidadePaletes}` : ''}`
    : '';
  
  // EPL: A = texto, b = QR code
  // Sintaxe: bX,Y,Q,modelo,tamanho,N,7,"dados"
  // Para centralizar em EPL, usamos o centro
  let epl = `N
A${centroHorizontal},${yTextoLabel},0,2,1,1,C,"CODIGO PALETE"
b${centroHorizontal},${yQRCode},Q,2,${Math.round(tamanhoQRCode / 10)},M,7,"${codigoPalete}"
A${centroHorizontal},${yCodigoPalete},0,3,1,1,C,"${codigoPalete}"`;
  
  // Adicionar código da carga e ID WMS se disponíveis
  if (codigoCargaWMS) {
    epl += `
A${centroHorizontal},${yCodigoCargaWMS},0,2,1,1,C,"${codigoCargaWMS}"`;
  }
  
  // Adicionar informações extras se disponíveis
  if (infoLinha1) {
    epl += `
A${centroHorizontal},${yInfoLinha1},0,1,1,1,C,"${infoLinha1}"`;
  }
  if (infoLinha2) {
    epl += `
A${centroHorizontal},${yInfoLinha2},0,1,1,1,C,"${infoLinha2}"`;
  }
  
  epl += `
P1`;
  return epl;
}

// Função para imprimir via TCP
function imprimirViaTCP(dados, porta = PRINTER_PORT) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let connected = false;
    let dadosEnviados = false;

    socket.setTimeout(8000);

    socket.on('connect', () => {
      connected = true;
      console.log(`✅ Conectado à impressora ${PRINTER_IP}:${porta}`);
      
      const dadosCompletos = dados.endsWith('\n') ? dados : dados + '\n';
      
      socket.write(dadosCompletos, 'utf8', (err) => {
        if (err) {
          socket.destroy();
          reject(err);
        } else {
          dadosEnviados = true;
          console.log('📤 Dados enviados para impressora');
          setTimeout(() => {
            socket.end();
          }, 300);
        }
      });
    });

    socket.on('close', () => {
      if (connected && dadosEnviados) {
        resolve(true);
      } else if (!connected) {
        reject(new Error('Conexão fechada antes de ser estabelecida'));
      } else {
        reject(new Error('Conexão fechada antes de enviar dados'));
      }
    });

    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`Timeout ao conectar com a impressora ${PRINTER_IP}:${porta}`));
    });

    socket.connect(porta, PRINTER_IP);
  });
}

// Headers CORS padrão
function getCorsHeaders(origin) {
  // Permitir qualquer origem em desenvolvimento, ou origem específica em produção
  const allowOrigin = origin || '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Access-Control-Allow-Credentials': 'false',
    'Access-Control-Max-Age': '86400'
  };
}

// Servidor HTTP para receber requisições
const server = http.createServer(async (req, res) => {
  // Log detalhado para debug
  console.log('\n' + '='.repeat(60));
  console.log(`📥 NOVA REQUISIÇÃO RECEBIDA`);
  console.log(`   Método: ${req.method}`);
  console.log(`   URL: ${req.url}`);
  console.log(`   Origin: ${req.headers.origin || 'sem origin'}`);
  console.log(`   Headers recebidos:`, JSON.stringify(req.headers, null, 2));
  console.log('='.repeat(60));
  
  // Obter origem da requisição
  const origin = req.headers.origin || req.headers.referer || '*';
  const corsHeaders = getCorsHeaders(origin);
  
  // Responder imediatamente para requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    console.log('🔄 Processando requisição OPTIONS (preflight CORS)...');
    console.log(`   Origin recebido: ${origin}`);
    const responseHeaders = {
      ...corsHeaders,
      'Content-Length': '0',
      'Vary': 'Origin'
    };
    console.log('📤 Headers de resposta OPTIONS:', JSON.stringify(responseHeaders, null, 2));
    res.writeHead(200, responseHeaders);
    res.end();
    console.log('✅ Resposta OPTIONS enviada com headers CORS');
    return;
  }

  // Obter origem da requisição (já definido acima, mas garantir que está disponível)
  const corsHeadersForResponse = getCorsHeaders(origin);
  
  if (req.method !== 'POST') {
    console.log(`❌ Método ${req.method} não permitido. Apenas POST é aceito.`);
    res.writeHead(405, { 
      ...corsHeadersForResponse,
      'Content-Type': 'application/json',
      'Vary': 'Origin'
    });
    res.end(JSON.stringify({ success: false, message: 'Método não permitido' }));
    return;
  }

  if (req.url !== '/print') {
    console.log(`❌ Rota ${req.url} não encontrada. Esperado: /print`);
    res.writeHead(404, { 
      ...corsHeadersForResponse,
      'Content-Type': 'application/json',
      'Vary': 'Origin'
    });
    res.end(JSON.stringify({ success: false, message: 'Rota não encontrada' }));
    return;
  }

  console.log('✅ Requisição POST para /print aceita. Processando...');

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
    console.log(`📦 Recebendo dados... (${chunk.length} bytes)`);
  });

  req.on('end', async () => {
    console.log(`📦 Body completo recebido (${body.length} bytes):`, body);
    try {
      const parsedBody = JSON.parse(body);
      console.log('📋 Body parseado:', JSON.stringify(parsedBody, null, 2));
      const { 
        codigoPalete,
        quantidadeNFs,
        totalVolumes,
        destino,
        posicoes,
        quantidadePaletes,
        codigoCarga,
        idWMS
      } = parsedBody;
      
      console.log('📋 Dados adicionais recebidos:', { quantidadeNFs, totalVolumes, destino, posicoes, quantidadePaletes, codigoCarga, idWMS });

      if (!codigoPalete) {
        res.writeHead(400, { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({ success: false, message: 'Código do palete é obrigatório' }));
        return;
      }

      console.log(`📦 Recebida solicitação de impressão para palete: ${codigoPalete}`);

      const zpl = gerarZPL(codigoPalete, {
        quantidadeNFs: quantidadeNFs || 0,
        totalVolumes: totalVolumes || 0,
        destino: destino || '',
        posicoes: posicoes || null,
        quantidadePaletes: quantidadePaletes || null
      });
      const epl = gerarEPL(codigoPalete, {
        quantidadeNFs: quantidadeNFs || 0,
        totalVolumes: totalVolumes || 0,
        destino: destino || '',
        posicoes: posicoes || null,
        quantidadePaletes: quantidadePaletes || null
      });

      let impressaoSucesso = false;
      let erroDetalhado = '';

      // Tentar ZPL na porta principal
      try {
        impressaoSucesso = await imprimirViaTCP(zpl, PRINTER_PORT);
        console.log('✅ Impressão bem-sucedida com ZPL na porta principal');
      } catch (err) {
        erroDetalhado = `Porta ${PRINTER_PORT} (ZPL): ${err.message}`;
        
        // Tentar ZPL na porta alternativa
        try {
          impressaoSucesso = await imprimirViaTCP(zpl, ALTERNATE_PORT);
          console.log('✅ Impressão bem-sucedida com ZPL na porta alternativa');
        } catch (err2) {
          erroDetalhado += ` | Porta ${ALTERNATE_PORT} (ZPL): ${err2.message}`;
          
          // Tentar EPL
          try {
            impressaoSucesso = await imprimirViaTCP(epl, PRINTER_PORT);
            console.log('✅ Impressão bem-sucedida com EPL na porta principal');
          } catch (err3) {
            erroDetalhado += ` | Porta ${PRINTER_PORT} (EPL): ${err3.message}`;
            
            // Última tentativa: EPL na porta alternativa
            try {
              impressaoSucesso = await imprimirViaTCP(epl, ALTERNATE_PORT);
              console.log('✅ Impressão bem-sucedida com EPL na porta alternativa');
            } catch (err4) {
              erroDetalhado += ` | Porta ${ALTERNATE_PORT} (EPL): ${err4.message}`;
            }
          }
        }
      }

      // Obter origem novamente para garantir que está disponível no escopo
      const originForResponse = req.headers.origin || req.headers.referer || '*';
      const corsHeadersForResponse = getCorsHeaders(originForResponse);
      
      if (impressaoSucesso) {
        console.log('✅ Impressão bem-sucedida! Enviando resposta 200...');
        const responseData = {
          success: true,
          message: `Etiqueta do palete ${codigoPalete} impressa com sucesso`
        };
        const responseHeaders = {
          ...corsHeadersForResponse,
          'Content-Type': 'application/json',
          'Vary': 'Origin'
        };
        console.log('📤 Headers de resposta:', JSON.stringify(responseHeaders, null, 2));
        console.log('📤 Dados de resposta:', JSON.stringify(responseData, null, 2));
        res.writeHead(200, responseHeaders);
        res.end(JSON.stringify(responseData));
        console.log('✅ Resposta 200 enviada com sucesso');
      } else {
        console.log('❌ Impressão falhou. Enviando resposta 500...');
        const responseData = {
          success: false,
          message: `Erro ao imprimir etiqueta: ${erroDetalhado}`
        };
        const responseHeaders = {
          ...corsHeadersForResponse,
          'Content-Type': 'application/json',
          'Vary': 'Origin'
        };
        console.log('📤 Headers de resposta:', JSON.stringify(responseHeaders, null, 2));
        console.log('📤 Dados de resposta:', JSON.stringify(responseData, null, 2));
        res.writeHead(500, responseHeaders);
        res.end(JSON.stringify(responseData));
        console.log('✅ Resposta 500 enviada');
      }
    } catch (error) {
      console.error('❌ Erro ao processar requisição:', error);
      console.error('❌ Stack trace:', error.stack);
      const originForError = req.headers.origin || req.headers.referer || '*';
      const corsHeadersForError = getCorsHeaders(originForError);
      const responseData = {
        success: false,
        message: `Erro ao processar impressão: ${error.message}`
      };
      const responseHeaders = {
        ...corsHeadersForError,
        'Content-Type': 'application/json',
        'Vary': 'Origin'
      };
      console.log('📤 Headers de resposta (erro):', JSON.stringify(responseHeaders, null, 2));
      console.log('📤 Dados de resposta (erro):', JSON.stringify(responseData, null, 2));
      res.writeHead(500, responseHeaders);
      res.end(JSON.stringify(responseData));
      console.log('✅ Resposta 500 (erro) enviada');
    }
    console.log('='.repeat(60) + '\n');
  });
});

server.listen(SERVICE_PORT, '0.0.0.0', () => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let localIP = 'localhost';
  
  // Tentar encontrar o IP local
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
    if (localIP !== 'localhost') break;
  }
  
  console.log('🚀 Serviço de Impressão iniciado!');
  console.log(`📡 Escutando na porta ${SERVICE_PORT} em todas as interfaces (0.0.0.0)`);
  console.log(`🖨️ Impressora configurada: ${PRINTER_IP}:${PRINTER_PORT} (alternativa: ${ALTERNATE_PORT})`);
  console.log('');
  
  // Detectar todas as interfaces de rede
  const allIPs = [];
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        allIPs.push(iface.address);
      }
    }
  }
  
  console.log('📋 IPs disponíveis nesta máquina:');
  allIPs.forEach(ip => {
    console.log(`   • ${ip}`);
  });
  console.log('');
  
  // Verificar se está na rede da impressora
  const isInPrinterNetwork = allIPs.some(ip => ip.startsWith('10.27.30.'));
  const isInCollectorNetwork = allIPs.some(ip => ip.startsWith('10.27.10.'));
  
  console.log('⚠️  IMPORTANTE: Este serviço deve rodar em uma máquina que tenha acesso à rede da impressora.');
  console.log(`   Impressora: ${PRINTER_IP} (rede 10.27.30.0/24)`);
  console.log(`   Coletor: 10.27.10.137 (rede 10.27.10.0/24)`);
  console.log('');
  
  if (isInPrinterNetwork) {
    console.log('✅ Esta máquina está na rede da impressora (10.27.30.0/24)');
  } else {
    console.log('⚠️  Esta máquina NÃO está na rede da impressora');
  }
  
  if (isInCollectorNetwork) {
    console.log('✅ Esta máquina está na rede do coletor (10.27.10.0/24)');
  } else {
    console.log('⚠️  Esta máquina NÃO está na rede do coletor');
  }
  console.log('');
  
  if (isInPrinterNetwork && isInCollectorNetwork) {
    console.log('🎉 PERFEITO! Esta máquina tem acesso a ambas as redes!');
    console.log('   O coletor pode acessar este serviço diretamente.');
  } else if (isInPrinterNetwork) {
    console.log('✅ Esta máquina tem acesso à impressora');
    console.log('⚠️  Para o coletor acessar, é necessário roteamento entre as redes');
  } else {
    console.log('❌ ATENÇÃO: Esta máquina pode não ter acesso à impressora');
    console.log('   Verifique se há roteamento configurado para a rede 10.27.30.0/24');
  }
  console.log('');
  
  console.log('📝 Para configurar no coletor, use um dos IPs acima:');
  allIPs.forEach(ip => {
    console.log(`   NEXT_PUBLIC_PRINTER_SERVICE_URL=http://${ip}:${SERVICE_PORT}`);
  });
  console.log('');
  
  // Testar conectividade
  const testSocket = new net.Socket();
  testSocket.setTimeout(3000);
  testSocket.on('connect', () => {
    console.log('✅ Teste de conectividade: CONECTADO à impressora!');
    testSocket.destroy();
  });
  testSocket.on('timeout', () => {
    console.log('❌ Teste de conectividade: TIMEOUT - não foi possível conectar à impressora');
    console.log('   Isso confirma que as redes são diferentes e não há roteamento configurado.');
    testSocket.destroy();
  });
  testSocket.on('error', (err) => {
    console.log(`❌ Teste de conectividade: ERRO - ${err.message}`);
    console.log('   Isso confirma que as redes são diferentes e não há roteamento configurado.');
  });
  
  console.log('🔍 Testando conectividade com a impressora...');
  testSocket.connect(PRINTER_PORT, PRINTER_IP);
});

