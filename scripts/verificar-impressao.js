#!/usr/bin/env node

/**
 * Script para verificar a configuração do serviço de impressão
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🔍 Verificando configuração do serviço de impressão...\n');

// Verificar arquivo .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

console.log('1️⃣ Verificando arquivo .env.local:');
if (envExists) {
  console.log('   ✅ Arquivo .env.local existe');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  if (envContent.includes('NEXT_PUBLIC_PRINTER_SERVICE_URL')) {
    const lines = envContent.split('\n');
    const printerLine = lines.find(line => line.includes('NEXT_PUBLIC_PRINTER_SERVICE_URL'));
    console.log(`   ✅ Variável encontrada: ${printerLine.trim()}`);
    
    // Extrair o valor
    const match = printerLine.match(/NEXT_PUBLIC_PRINTER_SERVICE_URL=(.+)/);
    if (match) {
      const url = match[1].trim();
      console.log(`   📋 URL configurada: ${url}`);
      
      // Verificar se está correto
      if (url.includes('/api/print') || url.includes('/print')) {
        console.log('   ⚠️  ATENÇÃO: A URL não deve incluir /print ou /api/print');
        console.log('   ✅ Correto seria: ' + url.replace(/\/api\/print.*$/, '').replace(/\/print.*$/, ''));
      } else {
        console.log('   ✅ URL está no formato correto (sem /print no final)');
      }
    }
  } else {
    console.log('   ❌ Variável NEXT_PUBLIC_PRINTER_SERVICE_URL não encontrada');
    console.log('   📝 Adicione esta linha ao arquivo .env.local:');
    console.log('      NEXT_PUBLIC_PRINTER_SERVICE_URL=http://localhost:3001');
  }
} else {
  console.log('   ❌ Arquivo .env.local não existe');
  console.log('   📝 Crie o arquivo .env.local na raiz do projeto com:');
  console.log('      NEXT_PUBLIC_PRINTER_SERVICE_URL=http://localhost:3001');
}

console.log('\n2️⃣ Verificando se o serviço intermediário está rodando:');

// Tentar conectar ao serviço
const testUrl = 'http://localhost:3001/print';
const url = new URL(testUrl);

const req = http.request({
  hostname: url.hostname,
  port: url.port,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 2000
}, (res) => {
  console.log(`   ✅ Serviço está respondendo (status: ${res.statusCode})`);
  console.log('   ✅ O serviço intermediário está rodando corretamente!');
  process.exit(0);
});

req.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.log('   ❌ Serviço não está rodando na porta 3001');
    console.log('   📝 Para iniciar o serviço, execute:');
    console.log('      npm run printer-service');
  } else {
    console.log(`   ❌ Erro ao conectar: ${err.message}`);
  }
  process.exit(1);
});

req.on('timeout', () => {
  console.log('   ⏱️  Timeout ao conectar ao serviço');
  console.log('   📝 Verifique se o serviço está rodando: npm run printer-service');
  req.destroy();
  process.exit(1);
});

req.write(JSON.stringify({ codigoPalete: 'TESTE' }));
req.end();

