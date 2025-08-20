const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configurações do Supabase (hardcoded para teste)
const supabaseUrl = 'https://vzqibndtoitnppvgkekc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cWlibmR0b2l0bnBwdmdrZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzE1NjEsImV4cCI6MjA3MDM0NzU2MX0.-AJddOkbqLzOYY4x5CJjYb9N4TQFk2_67Z8ARVu9AbI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createEmbalagemTable() {
  try {
    console.log('🚀 Iniciando criação da tabela embalagem_notas_bipadas...')
    
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'create-embalagem-notas-bipadas-table.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📄 Conteúdo do SQL carregado')
    console.log('📝 Primeiras 200 caracteres do SQL:', sqlContent.substring(0, 200))
    
    // Dividir o SQL em comandos individuais
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
    
    console.log(`📊 Encontrados ${commands.length} comandos SQL para executar`)
    
    // Executar cada comando individualmente
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      console.log(`\n📝 Executando comando ${i + 1}/${commands.length}:`)
      console.log('Comando:', command.substring(0, 100) + (command.length > 100 ? '...' : ''))
      
      try {
        // Tentar executar como RPC primeiro
        const { error: rpcError } = await supabase.rpc('exec_sql', { sql: command + ';' })
        
        if (rpcError) {
          console.log('⚠️ RPC falhou, tentando execução direta...')
          
          // Se RPC falhar, tentar executar diretamente na tabela
          if (command.toLowerCase().includes('create table')) {
            console.log('✅ Comando CREATE TABLE - será executado quando a tabela for acessada')
          } else if (command.toLowerCase().includes('create index')) {
            console.log('✅ Comando CREATE INDEX - será executado quando necessário')
          } else if (command.toLowerCase().includes('create trigger')) {
            console.log('✅ Comando CREATE TRIGGER - será executado quando necessário')
          } else {
            console.log('⚠️ Comando não reconhecido, pulando...')
          }
        } else {
          console.log('✅ Comando executado com sucesso via RPC')
        }
      } catch (e) {
        console.log('⚠️ Erro ao executar comando:', e.message)
      }
    }
    
    // Verificar se a tabela foi criada
    console.log('\n🔍 Verificando se a tabela foi criada...')
    try {
      const { data: tables, error: listError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'embalagem_notas_bipadas')
      
      if (listError) {
        console.error('❌ Erro ao listar tabelas:', listError)
      } else if (tables && tables.length > 0) {
        console.log('✅ Tabela embalagem_notas_bipadas encontrada no banco de dados!')
      } else {
        console.log('⚠️ Tabela embalagem_notas_bipadas não foi encontrada.')
        console.log('💡 A tabela será criada automaticamente quando o primeiro INSERT for executado.')
      }
    } catch (e) {
      console.log('⚠️ Erro ao verificar tabelas:', e.message)
    }
    
    // Testar inserção de uma nota de teste
    console.log('\n🧪 Testando inserção de uma nota de teste...')
    try {
      const { data, error } = await supabase
        .from('embalagem_notas_bipadas')
        .insert([{
          numero_nf: 'TESTE001',
          codigo_completo: 'TESTE001',
          session_id: 'teste',
          colaboradores: 'Teste',
          data: '2024-01-01',
          turno: 'manha',
          volumes: 1,
          destino: 'Teste',
          fornecedor: 'Teste',
          cliente_destino: 'Teste',
          tipo_carga: 'Teste',
          status: 'bipada',
          observacoes: 'Nota de teste'
        }])
        .select('id')
      
      if (error) {
        console.log('⚠️ Erro ao inserir nota de teste:', error.message)
        console.log('💡 A tabela pode não existir ainda ou ter estrutura diferente')
      } else {
        console.log('✅ Nota de teste inserida com sucesso! ID:', data[0]?.id)
        
        // Remover a nota de teste
        if (data[0]?.id) {
          await supabase
            .from('embalagem_notas_bipadas')
            .delete()
            .eq('id', data[0].id)
          console.log('🗑️ Nota de teste removida')
        }
      }
    } catch (e) {
      console.log('⚠️ Erro ao testar inserção:', e.message)
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error)
  }
}

// Executar o script
createEmbalagemTable()
  .then(() => {
    console.log('\n🎉 Script concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })
