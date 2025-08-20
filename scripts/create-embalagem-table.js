const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Carregar variáveis de ambiente
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Verificando variáveis de ambiente:')
console.log('URL:', supabaseUrl ? '✅ Configurada' : '❌ Não encontrada')
console.log('KEY:', supabaseKey ? '✅ Configurada' : '❌ Não encontrada')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas')
  console.error('Verifique se o arquivo .env existe e contém NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createEmbalagemTable() {
  try {
    console.log('🚀 Iniciando criação da tabela embalagem_notas_bipadas...')
    
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'create-embalagem-notas-bipadas-table.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📄 Conteúdo do SQL carregado')
    
    // Executar o SQL
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent })
    
    if (error) {
      console.error('❌ Erro ao executar SQL:', error)
      
      // Se o RPC não existir, tentar executar diretamente
      console.log('🔄 Tentando executar comandos SQL individualmente...')
      
      const commands = sqlContent.split(';').filter(cmd => cmd.trim())
      
      for (const command of commands) {
        if (command.trim()) {
          console.log('📝 Executando comando:', command.substring(0, 50) + '...')
          
          try {
            const { error: cmdError } = await supabase.rpc('exec_sql', { sql: command + ';' })
            if (cmdError) {
              console.error('❌ Erro no comando:', cmdError)
            } else {
              console.log('✅ Comando executado com sucesso')
            }
          } catch (e) {
            console.error('❌ Erro ao executar comando:', e.message)
          }
        }
      }
    } else {
      console.log('✅ Tabela embalagem_notas_bipadas criada com sucesso!')
    }
    
    // Verificar se a tabela foi criada
    console.log('🔍 Verificando se a tabela foi criada...')
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
      console.log('⚠️ Tabela embalagem_notas_bipadas não foi encontrada. Verifique se o SQL foi executado corretamente.')
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error)
  }
}

// Executar o script
createEmbalagemTable()
  .then(() => {
    console.log('🎉 Script concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })
