#!/usr/bin/env node

/**
 * Script para testar se o serviço intermediário de impressão está acessível
 * 
 * Uso:
 *   node scripts/test-printer-service.js [URL]
 * 
 * Exemplo:
 *   node scripts/test-printer-service.js http://10.27.10.175:3001
 */

const http = require('http');

const SERVICE_URL = process.argv[2] || process.env.NEXT_PUBLIC_PRINTER_SERVICE_URL || 'http://localhost:3001';

// Extrair host e porta da URL
function parseUrl(url) {
  try {
    const urlObj = new URL(url);
    return {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname || '/print',
      protocol: urlObj.protocol
    };
  } catch (error) {
    console.error('❌ URL inválida:', url);
    process.exit(1);
  }
}

async function testConnection() {
  console.log('🧪 Testando conexão com serviço intermediário...\n');
  console.log(`📡 URL: ${SERVICE_URL}\n`);

  const urlParts = parseUrl(SERVICE_URL);
  
  // Corrigir path se não tiver /print
  if (!urlParts.path.includes('/print')) {
    urlParts.path = '/print';
  }
  const testUrl = `${urlParts.protocol}//${urlParts.hostname}:${urlParts.port}${urlParts.path}`;
  
  console.log(`🔍 Testando: ${testUrl}\n`);

  // Teste 1: Verificar se a porta está aberta (TCP)
  console.log('1️⃣ Testando conectividade TCP...');
  await testTCPConnection(urlParts.hostname, urlParts.port);

  // Teste 2: Verificar se o serviço HTTP responde
  console.log('\n2️⃣ Testando requisição HTTP...');
  await testHTTPRequest(testUrl);
}

function testTCPConnection(hostname, port) {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    let connected = false;

    socket.setTimeout(3000);

    socket.on('connect', () => {
      connected = true;
      console.log('   ✅ Porta está aberta e acessível');
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      console.log('   ❌ Timeout - porta não respondeu em 3 segundos');
      console.log('   💡 Verifique se o serviço está rodando');
      socket.destroy();
      resolve(false);
    });

    socket.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log('   ❌ Conexão recusada - serviço não está rodando ou porta bloqueada');
        console.log('   💡 Verifique:');
        console.log('      - Se o serviço está rodando: node scripts/printer-service.js');
        console.log('      - Se o firewall está bloqueando a porta 3001');
        console.log('      - Se o IP está correto');
      } else if (err.code === 'ENOTFOUND') {
        console.log('   ❌ Host não encontrado - IP/hostname incorreto');
      } else if (err.code === 'ETIMEDOUT') {
        console.log('   ❌ Timeout - não foi possível alcançar o host');
        console.log('   💡 Verifique se está na mesma rede');
      } else {
        console.log(`   ❌ Erro: ${err.message}`);
      }
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, hostname);
  });
}

function testHTTPRequest(url) {
  return new Promise((resolve) => {
    const urlParts = parseUrl(url);
    const isHttps = urlParts.protocol === 'https:';
    const httpModule = isHttps ? require('https') : require('http');

    const options = {
      hostname: urlParts.hostname,
      port: urlParts.port,
      path: urlParts.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000
    };

    const req = httpModule.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`   ✅ Serviço respondeu (status ${res.statusCode})`);
        
        try {
          const json = JSON.parse(data);
          if (json.success) {
            console.log('   ✅ Resposta válida do serviço');
          } else {
            console.log(`   ⚠️ Serviço retornou erro: ${json.message || 'Erro desconhecido'}`);
          }
        } catch (e) {
          console.log('   ⚠️ Resposta não é JSON válido');
          console.log(`   📦 Resposta: ${data.substring(0, 200)}`);
        }
        
        resolve(true);
      });
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log('   ❌ Conexão recusada - serviço não está rodando');
      } else if (err.code === 'ETIMEDOUT') {
        console.log('   ❌ Timeout - serviço não respondeu');
      } else {
        console.log(`   ❌ Erro: ${err.message}`);
      }
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('   ❌ Timeout na requisição HTTP');
      req.destroy();
      resolve(false);
    });

    const testData = JSON.stringify({ codigoPalete: 'TESTE' });
    req.write(testData);
    req.end();
  });
}

// Executar testes
testConnection().then(() => {
  console.log('\n✅ Testes concluídos');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Erro ao executar testes:', error);
  process.exit(1);
});

