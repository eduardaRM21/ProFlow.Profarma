#!/usr/bin/env node

/**
 * Script para corrigir problemas de aria-hidden com elementos focáveis
 * Aplica gerenciamento de foco adequado em componentes Dialog
 */

const fs = require('fs');
const path = require('path');

// Lista de arquivos que podem ter o problema
const filesToCheck = [
  'app/recebimento/components/relatorios-modal.tsx',
  'app/recebimento/components/divergencia-modal.tsx',
  'app/recebimento/components/confirmacao-modal.tsx',
  'app/painel/components/chat-modal.tsx',
  'app/painel/components/confirmacao-modal.tsx',
  'app/admin/components/gerenciar-carros-section.tsx',
  'app/admin/components/lancamento-section.tsx',
  'components/admin/change-password-modal.tsx'
];

function fixAriaHiddenFocus(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Adicionar useRef ao import se não estiver presente
    const reactImportRegex = /import\s*{\s*([^}]*)\s*}\s*from\s*["']react["']/;
    const reactImportMatch = content.match(reactImportRegex);
    
    if (reactImportMatch && !reactImportMatch[1].includes('useRef')) {
      const newImport = reactImportMatch[1].replace('useState', 'useState, useRef');
      content = content.replace(reactImportRegex, `import { ${newImport} } from "react"`);
      modified = true;
      console.log(`✅ Adicionado useRef ao import em: ${filePath}`);
    }

    // 2. Adicionar ref para gerenciar foco
    const componentStartRegex = /export\s+default\s+function\s+(\w+)\s*\(/;
    const componentMatch = content.match(componentStartRegex);
    
    if (componentMatch) {
      const componentName = componentMatch[1];
      const stateRegex = /const\s+\[([^,]+),\s*set\w+\]\s*=\s*useState/;
      const stateMatch = content.match(stateRegex);
      
      if (stateMatch && !content.includes('previousActiveElement')) {
        // Adicionar ref após os estados
        const insertPoint = content.indexOf(stateMatch[0]) + stateMatch[0].length;
        const nextLine = content.indexOf('\n', insertPoint);
        const refLine = `\n  const previousActiveElement = useRef<HTMLElement | null>(null)`;
        
        content = content.slice(0, nextLine) + refLine + content.slice(nextLine);
        modified = true;
        console.log(`✅ Adicionado previousActiveElement ref em: ${filePath}`);
      }
    }

    // 3. Adicionar gerenciamento de foco no useEffect
    const useEffectRegex = /useEffect\s*\(\s*\(\s*\)\s*=>\s*{[\s\S]*?},\s*\[([^\]]+)\]\s*\)/g;
    
    content = content.replace(useEffectRegex, (match, dependencies) => {
      if (match.includes('isOpen') && !match.includes('previousActiveElement')) {
        const newUseEffect = match.replace(
          /if\s*\(\s*isOpen\s*\)\s*{/,
          `if (isOpen) {
      // Salvar elemento ativo antes de abrir o modal
      previousActiveElement.current = document.activeElement as HTMLElement`
        ).replace(
          /}\s*else\s*{/,
          `} else {
      // Restaurar foco para o elemento anterior após um pequeno delay
      // para evitar conflitos com aria-hidden
      setTimeout(() => {
        if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
          previousActiveElement.current.focus()
        }
        previousActiveElement.current = null
      }, 100)`
        );
        
        modified = true;
        console.log(`✅ Adicionado gerenciamento de foco em useEffect em: ${filePath}`);
        return newUseEffect;
      }
      return match;
    });

    // 4. Adicionar função handleClose se não existir
    if (!content.includes('handleClose') && content.includes('onClose')) {
      const functionInsertPoint = content.lastIndexOf('const handle');
      if (functionInsertPoint > 0) {
        const nextFunction = content.indexOf('\n  const ', functionInsertPoint + 1);
        const insertPoint = nextFunction > 0 ? nextFunction : content.indexOf('\n  return');
        
        const handleCloseFunction = `
  const handleClose = () => {
    // Remover foco de qualquer elemento dentro do modal antes de fechar
    const activeElement = document.activeElement as HTMLElement
    if (activeElement && activeElement.blur) {
      activeElement.blur()
    }
    onClose()
  }
`;
        
        content = content.slice(0, insertPoint) + handleCloseFunction + content.slice(insertPoint);
        modified = true;
        console.log(`✅ Adicionado função handleClose em: ${filePath}`);
      }
    }

    // 5. Substituir onClose por handleClose nos botões
    content = content.replace(/onClick={onClose}/g, 'onClick={handleClose}');
    if (content.includes('onClick={handleClose}')) {
      modified = true;
      console.log(`✅ Substituído onClose por handleClose em: ${filePath}`);
    }

    // 6. Salvar arquivo se foi modificado
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
  console.log('🔧 Iniciando correção de aria-hidden com elementos focáveis...\n');

  let totalFiles = 0;
  let modifiedFiles = 0;

  filesToCheck.forEach(filePath => {
    totalFiles++;
    const fullPath = path.join(process.cwd(), filePath);
    if (fixAriaHiddenFocus(fullPath)) {
      modifiedFiles++;
    }
    console.log(''); // Linha em branco para separar
  });

  console.log('📊 Resumo:');
  console.log(`   Total de arquivos verificados: ${totalFiles}`);
  console.log(`   Arquivos modificados: ${modifiedFiles}`);
  console.log(`   Arquivos sem modificação: ${totalFiles - modifiedFiles}`);

  if (modifiedFiles > 0) {
    console.log('\n✅ Correções de aria-hidden aplicadas com sucesso!');
    console.log('💡 Recomendação: Teste os modais para garantir que o foco está sendo gerenciado corretamente.');
  } else {
    console.log('\n✅ Todos os arquivos já estão com gerenciamento de foco correto!');
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { fixAriaHiddenFocus };
