/**
 * Função para converter número da rua para sigla
 * Mapeamento:
 * - Rua 1 = CA
 * - Rua 2 = CB
 * - Rua 3 = PD
 */
export function obterSiglaRua(numeroRua: number): string {
  const mapeamento: Record<number, string> = {
    1: "CA",
    2: "CB",
    3: "PD"
  }
  return mapeamento[numeroRua] || numeroRua.toString()
}

/**
 * Mapeamento de siglas para destinos completos
 */
export const MAPEAMENTO_SIGLAS_DESTINO: Record<string, string> = {
  "VIANA": "VIANA - ES",
  "SAO JO": "SAO JOSE DOS PINHAIS - PR",
  "GRAVAT": "GRAVATAI - RS",
  "DUQUE": "DUQUE DE CAXIAS - RJ",
  "RIBEIR": "RIBEIRAO PRETO - SP",
  "EMBU D": "EMBU DAS ARTES - SP",
  "GUARUL": "GUARULHOS - SP"
}

/**
 * Converte uma sigla de destino para o destino completo
 */
export function obterDestinoCompleto(sigla: string): string | null {
  return MAPEAMENTO_SIGLAS_DESTINO[sigla.toUpperCase()] || null
}

/**
 * Verifica se um código de posição está dentro de uma faixa de endereços
 * IMPORTANTE: A preferência se aplica a TODOS os níveis (1-7) para cada posição
 * Exemplo: Se PD-097-01 é preferencial para RIBEIRAO PRETO - SP, então:
 * - PD-097-01, PD-097-02, PD-097-03, PD-097-04, PD-097-05, PD-097-06, PD-097-07 são preferenciais
 * - E todas as posições de PD-098 até PD-132 em todos os níveis (1-7) também são preferenciais
 * 
 * REGRA: Se uma posição está na faixa de números, TODOS os níveis (1-7) dessa posição são preferenciais
 */
export function estaNaFaixa(codigoPosicao: string, faixaInicio: string, faixaFim: string): boolean {
  // Extrair prefixo, número e sufixo (nível) do código
  // Exemplo: PD-097-01 -> prefixo: PD, número: 097, sufixo: 01 (nível 1)
  // Exemplo: PD-097-07 -> prefixo: PD, número: 097, sufixo: 07 (nível 7)
  const parseCodigo = (codigo: string) => {
    const match = codigo.match(/^([A-Z]+)-(\d+)-(\d+)$/)
    if (!match) return null
    return {
      prefixo: match[1],
      numero: parseInt(match[2], 10),
      sufixo: parseInt(match[3], 10) // Este é o nível (01-07)
    }
  }

  const inicio = parseCodigo(faixaInicio)
  const fim = parseCodigo(faixaFim)
  const posicao = parseCodigo(codigoPosicao)

  if (!inicio || !fim || !posicao) return false

  // Verificar se o prefixo é o mesmo
  if (posicao.prefixo !== inicio.prefixo || posicao.prefixo !== fim.prefixo) {
    return false
  }

  // Verificar se o número da posição está na faixa de números
  if (posicao.numero < inicio.numero || posicao.numero > fim.numero) {
    return false
  }

  // REGRA PRINCIPAL: Se o número está na faixa, aceitar TODOS os níveis de 1 até o nível máximo da faixa
  // O nível máximo é determinado pelo maior nível entre inicio.sufixo e fim.sufixo
  // Isso garante que se CA-001-01 é preferencial, então CA-001-02, CA-001-03, etc. também são
  // E respeita o limite máximo da faixa (ex: CA-032-06 significa máximo nível 6)
  
  const nivelMaximo = Math.max(inicio.sufixo, fim.sufixo)
  
  // Se o número está no meio da faixa (entre inicio.numero e fim.numero, exclusivo)
  if (posicao.numero > inicio.numero && posicao.numero < fim.numero) {
    // Aceitar qualquer nível de 1 até o nível máximo da faixa
    return posicao.sufixo >= 1 && posicao.sufixo <= nivelMaximo
  }

  // Se está no número inicial (ex: CA-001 ou PD-097)
  if (posicao.numero === inicio.numero) {
    // Aceitar todos os níveis de 1 até o nível máximo da faixa
    // Isso garante que CA-001-01, CA-001-02, CA-001-03, CA-001-04, CA-001-05, CA-001-06 são todos preferenciais
    // E PD-097-01, PD-097-02, PD-097-03, PD-097-04, PD-097-05, PD-097-06, PD-097-07 são todos preferenciais
    return posicao.sufixo >= 1 && posicao.sufixo <= nivelMaximo
  }

  // Se está no número final (ex: CA-032 ou PD-132)
  if (posicao.numero === fim.numero) {
    // Aceitar todos os níveis de 1 até o nível final
    // Se o nível final for 7, aceitar 1-7. Se for 6, aceitar 1-6.
    return posicao.sufixo >= 1 && posicao.sufixo <= fim.sufixo
  }

  return false
}

/**
 * Mapeamento de faixas de endereços para destinos preferenciais
 */
export const MAPEAMENTO_ENDERECOS_DESTINO: Array<{
  faixaInicio: string
  faixaFim: string
  destino: string
}> = [
  { faixaInicio: "CA-001-01", faixaFim: "CA-032-06", destino: "DUQUE DE CAXIAS - RJ" },
  { faixaInicio: "PD-066-01", faixaFim: "PD-096-07", destino: "EMBU DAS ARTES - SP" },
  { faixaInicio: "CA-033-01", faixaFim: "CA-050-06", destino: "GRAVATAI - RS" },
  { faixaInicio: "PD-001-01", faixaFim: "PD-065-07", destino: "GUARULHOS - SP" },
  { faixaInicio: "PD-097-01", faixaFim: "PD-132-07", destino: "RIBEIRAO PRETO - SP" },
  { faixaInicio: "CB-001-01", faixaFim: "CB-028-06", destino: "SAO JOSE DOS PINHAIS - PR" },
  { faixaInicio: "CB-029-01", faixaFim: "CB-060-06", destino: "VIANA - ES" }
]

/**
 * Obtém o destino preferencial de um código de posição
 */
export function obterDestinoPreferencial(codigoPosicao: string): string | null {
  for (const mapeamento of MAPEAMENTO_ENDERECOS_DESTINO) {
    if (estaNaFaixa(codigoPosicao, mapeamento.faixaInicio, mapeamento.faixaFim)) {
      return mapeamento.destino
    }
  }
  return null
}

/**
 * Verifica se uma posição é preferencial para um destino específico
 * IMPORTANTE: A preferência se aplica a TODOS os níveis (1-7) - o nível não é considerado
 * Exemplo: Se PD-097-01 é preferencial para RIBEIRAO PRETO - SP, então todas as posições
 * com código PD-097-01 em qualquer nível (1, 2, 3, 4, 5, 6, 7) são preferenciais
 */
export function isPosicaoPreferencial(codigoPosicao: string, destino: string): boolean {
  const destinoPreferencial = obterDestinoPreferencial(codigoPosicao)
  return destinoPreferencial === destino
}

