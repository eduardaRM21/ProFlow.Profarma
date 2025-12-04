/**
 * Script para corrigir quantidade_volumes e quantidade_nfs em todos os paletes
 * Atualiza todos os paletes de cada carga com os valores totais da carga
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function corrigirContadoresPaletes() {
  try {
    console.log('🔧 Iniciando correção de contadores dos paletes...\n')

    // Buscar todas as cargas
    const { data: cargas, error: cargasError } = await supabase
      .from('wms_cargas')
      .select('id, codigo_carga, notas, total_volumes, total_nfs')
      .order('data_criacao', { ascending: false })

    if (cargasError) {
      throw cargasError
    }

    if (!cargas || cargas.length === 0) {
      console.log('⚠️ Nenhuma carga encontrada')
      return
    }

    console.log(`📦 Encontradas ${cargas.length} carga(s)\n`)

    let totalPaletesCorrigidos = 0
    let totalCargasProcessadas = 0

    for (const carga of cargas) {
      try {
        // Calcular totais da carga baseado nas notas
        const notasUnicas = carga.notas || []
        const total_volumes = notasUnicas.reduce((acc, nota) => {
          const volumes = typeof nota.volumes === 'number' 
            ? nota.volumes 
            : Number(nota.volumes) || 0
          return acc + volumes
        }, 0)
        const total_nfs = notasUnicas.length

        // Se não houver notas, usar os valores da carga se existirem
        const volumes_finais = total_volumes > 0 ? total_volumes : (carga.total_volumes || 0)
        const nfs_finais = total_nfs > 0 ? total_nfs : (carga.total_nfs || 0)

        if (volumes_finais === 0 && nfs_finais === 0) {
          console.log(`⚠️ Carga ${carga.codigo_carga}: Sem volumes ou NFs, pulando...`)
          continue
        }

        // Buscar todos os paletes da carga
        const { data: paletes, error: paletesError } = await supabase
          .from('wms_paletes')
          .select('id, codigo_palete, quantidade_volumes, quantidade_nfs')
          .eq('carga_id', carga.id)

        if (paletesError) {
          console.error(`❌ Erro ao buscar paletes da carga ${carga.codigo_carga}:`, paletesError)
          continue
        }

        if (!paletes || paletes.length === 0) {
          console.log(`⚠️ Carga ${carga.codigo_carga}: Nenhum palete encontrado`)
          continue
        }

        console.log(`\n📦 Carga: ${carga.codigo_carga}`)
        console.log(`   - Total volumes: ${volumes_finais}`)
        console.log(`   - Total NFs: ${nfs_finais}`)
        console.log(`   - Paletes encontrados: ${paletes.length}`)

        // Atualizar cada palete
        let paletesAtualizados = 0
        for (const palete of paletes) {
          // Verificar se precisa atualizar
          if (palete.quantidade_volumes === volumes_finais && palete.quantidade_nfs === nfs_finais) {
            console.log(`   ✓ Palete ${palete.codigo_palete}: Já está correto`)
            continue
          }

          const { error: updateError } = await supabase
            .from('wms_paletes')
            .update({
              quantidade_volumes: volumes_finais,
              quantidade_nfs: nfs_finais
            })
            .eq('id', palete.id)

          if (updateError) {
            console.error(`   ❌ Erro ao atualizar palete ${palete.codigo_palete}:`, updateError)
          } else {
            console.log(`   ✅ Palete ${palete.codigo_palete}: ${palete.quantidade_volumes}/${palete.quantidade_nfs} → ${volumes_finais}/${nfs_finais}`)
            paletesAtualizados++
            totalPaletesCorrigidos++
          }
        }

        if (paletesAtualizados > 0) {
          totalCargasProcessadas++
        }
      } catch (error) {
        console.error(`❌ Erro ao processar carga ${carga.codigo_carga}:`, error)
      }
    }

    console.log(`\n✅ Correção concluída!`)
    console.log(`   - Cargas processadas: ${totalCargasProcessadas}`)
    console.log(`   - Paletes corrigidos: ${totalPaletesCorrigidos}`)
  } catch (error) {
    console.error('❌ Erro ao corrigir contadores:', error)
    process.exit(1)
  }
}

// Executar o script
corrigirContadoresPaletes()
  .then(() => {
    console.log('\n✅ Script executado com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })

