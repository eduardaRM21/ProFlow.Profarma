#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Fazendo deploy das Edge Functions...');

try {
  // Verificar se o Supabase CLI está instalado
  try {
    execSync('supabase --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Supabase CLI não encontrado. Instale com: npm install -g supabase');
    process.exit(1);
  }

  // Fazer login no Supabase (se necessário)
  console.log('🔐 Verificando autenticação...');
  try {
    execSync('supabase projects list', { stdio: 'pipe' });
  } catch (error) {
    console.log('⚠️ Faça login no Supabase CLI primeiro: supabase login');
    process.exit(1);
  }

  // Deploy das Edge Functions
  console.log('📦 Fazendo deploy das Edge Functions...');
  
  const functionsDir = path.join(__dirname, '..', 'supabase', 'functions');
  
  // Deploy da função divergencias-batch
  console.log('📤 Deploying divergencias-batch...');
  execSync(`supabase functions deploy divergencias-batch --project-ref ${process.env.SUPABASE_PROJECT_REF || 'ehqxboqxtubeumaupjeq'}`, {
    cwd: functionsDir,
    stdio: 'inherit'
  });

  console.log('✅ Deploy concluído com sucesso!');
  console.log('🔗 Edge Functions disponíveis em:');
  console.log('   - divergencias-batch: https://ehqxboqxtubeumaupjeq.supabase.co/functions/v1/divergencias-batch');

} catch (error) {
  console.error('❌ Erro no deploy:', error.message);
  process.exit(1);
}
