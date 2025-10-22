#!/usr/bin/env node

/**
 * Script para corrigir warnings de acessibilidade em componentes Dialog
 * Adiciona DialogDescription onde está faltando
 */

const fs = require('fs');
const path = require('path');

// Lista de arquivos que podem ter o problema
const filesToCheck = [
  'app/recebimento/components/consultar-nfs-faltantes-modal.tsx',
  'app/recebimento/components/selecao-transportadora-modal.tsx',
  'app/recebimento/components/divergencia-modal.tsx',
  'app/recebimento/components/confirmacao-modal.tsx',
  'app/painel/components/nfs-bipadas-section.tsx',
  'app/painel/components/carros-produzidos-section.tsx',
  'app/painel/components/chat-modal.tsx',
  'app/painel/components/confirmacao-modal.tsx',
  'app/inventario/components/relatorio-modal.tsx',
  'app/admin/components/gerenciar-carros-section.tsx',
  'app/admin/components/lancamento-section.tsx'
];

function fixDialogAccessibility(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Adicionar DialogDescription ao import se não estiver presente
    const importRegex = /import\s*{\s*([^}]*Dialog[^}]*)\s*}\s*from\s*["']@\/components\/ui\/dialog["']/;
    const importMatch = content.match(importRegex);
    
    if (importMatch && !importMatch[1].includes('DialogDescription')) {
      const newImport = importMatch[1].replace('DialogContent', 'DialogContent, DialogDescription');
      content = content.replace(importRegex, `import { ${newImport} } from "@/components/ui/dialog"`);
      modified = true;
      console.log(`✅ Adicionado DialogDescription ao import em: ${filePath}`);
    }

    // 2. Encontrar DialogContent sem DialogDescription
    const dialogContentRegex = /<DialogContent[^>]*>[\s\S]*?<DialogHeader>[\s\S]*?<DialogTitle[^>]*>[\s\S]*?<\/DialogTitle>[\s\S]*?<\/DialogHeader>/g;
    
    content = content.replace(dialogContentRegex, (match) => {
      // Verificar se já tem DialogDescription
      if (match.includes('<DialogDescription>')) {
        return match;
      }

      // Adicionar DialogDescription após DialogTitle
      const titleEndRegex = /(<\/DialogTitle>)/;
      const description = `$1
            <DialogDescription>
              Descrição do modal para acessibilidade
            </DialogDescription>`;
      
      modified = true;
      console.log(`✅ Adicionado DialogDescription em: ${filePath}`);
      return match.replace(titleEndRegex, description);
    });

    // 3. Salvar arquivo se foi modificado
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`💾 Arquivo salvo: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  Nenhuma modificação necessária em: ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Iniciando correção de acessibilidade em componentes Dialog...\n');

  let totalFiles = 0;
  let modifiedFiles = 0;

  filesToCheck.forEach(filePath => {
    totalFiles++;
    const fullPath = path.join(process.cwd(), filePath);
    if (fixDialogAccessibility(fullPath)) {
      modifiedFiles++;
    }
    console.log(''); // Linha em branco para separar
  });

  console.log('📊 Resumo:');
  console.log(`   Total de arquivos verificados: ${totalFiles}`);
  console.log(`   Arquivos modificados: ${modifiedFiles}`);
  console.log(`   Arquivos sem modificação: ${totalFiles - modifiedFiles}`);

  if (modifiedFiles > 0) {
    console.log('\n✅ Correções de acessibilidade aplicadas com sucesso!');
    console.log('💡 Recomendação: Revise as descrições adicionadas e personalize conforme necessário.');
  } else {
    console.log('\n✅ Todos os arquivos já estão com acessibilidade correta!');
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { fixDialogAccessibility };
