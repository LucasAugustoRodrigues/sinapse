// srs.js — motor de repetição espaçada (SM-2 adaptado, funções puras).
// Recebe estado + `hoje` (inteiro de dia), devolve novo estado. Sem Date.now(), sem IO.
// Especificação completa: PLANEJAMENTO.md §7.

// ============================================================================
// Constantes de nota e confiança
// ============================================================================

export const ERREI          = "ERREI";
export const ERRO_CONFIANTE = "ERRO_CONFIANTE";
export const DIFICIL        = "DIFICIL";
export const BOM            = "BOM";
export const FACIL          = "FACIL";

export const CHUTEI  = "chutei";
export const DUVIDA  = "duvida";
export const CERTEZA = "certeza";

// ============================================================================
// Config — knobs ajustáveis (§7.8)
// ============================================================================

export const config = {
  easeInicial:   2.5,
  easeMin:       1.3,
  easeMax:       3.0,
  deltaEase: {
    [FACIL]:          +0.15,
    [BOM]:             0.00,
    [DIFICIL]:        -0.15,
    [ERREI]:          -0.20,
    [ERRO_CONFIANTE]: -0.30,
  },
  graduacao:       { dificil: 1, bom: 1, facil: 3 },
  multDificil:     1.2,
  bonusFacil:      1.3,
  intervaloMax:    45,
  novasPorDia:     20,
  reinicioPosLapso: 1,
  janelaForca:     20,
  retentativa:     6,
};

// ============================================================================
// Helpers internos
// ============================================================================

const _ORDEM = [ERRO_CONFIANTE, ERREI, DIFICIL, BOM, FACIL];

function _clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

function _ehAcerto(nota) { return nota === DIFICIL || nota === BOM || nota === FACIL; }
function _ehLapso(nota)  { return nota === ERREI || nota === ERRO_CONFIANTE; }

function _shuffleCopia(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Embaralha apenas elementos empatados (mesma chave), preservando a ordem entre grupos distintos.
function _embaralharComTiebreak(arr, keyFn, rng) {
  const resultado = [];
  let i = 0;
  while (i < arr.length) {
    const chave = keyFn(arr[i]);
    let j = i + 1;
    while (j < arr.length && keyFn(arr[j]) === chave) j++;
    resultado.push(..._shuffleCopia(arr.slice(i, j), rng));
    i = j;
  }
  return resultado;
}

// ============================================================================
// API pública — notas e combinação
// ============================================================================

/** Cruza acerto × confiança → nota (§7.2). */
export function derivarNota(acerto, confianca) {
  if (!acerto && confianca === CERTEZA) return ERRO_CONFIANTE;
  if (!acerto)                          return ERREI;
  if (confianca === CHUTEI)             return DIFICIL;
  if (confianca === DUVIDA)             return BOM;
  return FACIL;
}

/** Retorna a pior das duas notas (ERRO_CONFIANTE < ERREI < DIFICIL < BOM < FACIL). */
export function pior(notaA, notaB) {
  return _ORDEM.indexOf(notaA) <= _ORDEM.indexOf(notaB) ? notaA : notaB;
}

// ============================================================================
// estadoInicial — cria card novo (§7.3)
// ============================================================================

export function estadoInicial(questao, cfg = config) {
  return {
    cardId:      questao.id,
    questaoId:   questao.id,
    habilidade:  questao.habilidade,
    competencia: questao.competencia,
    estado:      "novo",
    facilidade:  cfg.easeInicial,
    intervalo:   0,
    repeticoes:  0,
    lapsos:      0,
    ultimaRevisao:  null,
    proximaRevisao: 0,
    flagRevisar:    false,
    historico:      [],
  };
}

// ============================================================================
// revisar — coração do SRS (§7.4, §7.5)
// ============================================================================

export function revisar(card, resultado, hoje, cfg = config) {
  const { recAcerto, recConfianca, resAcerto } = resultado;
  const notaRec   = derivarNota(recAcerto, recConfianca);
  const notaRes   = resAcerto ? BOM : ERREI;
  const notaFinal = pior(notaRec, notaRes);

  // 1. Novo ease (clamped)
  const novaFacilidade = _clamp(
    card.facilidade + cfg.deltaEase[notaFinal],
    cfg.easeMin,
    cfg.easeMax
  );

  // 2. flagRevisar: ERRO_CONFIANTE liga, acerto desliga, ERREI mantém
  const novaFlag = notaFinal === ERRO_CONFIANTE
    ? true
    : _ehAcerto(notaFinal) ? false : card.flagRevisar;

  // 3. Transições de estado e intervalo
  let novoEstado     = card.estado;
  let novoIntervalo  = card.intervalo;
  let novasRepetices = card.repeticoes;
  let novosLapsos    = card.lapsos;

  const lapso = _ehLapso(notaFinal);

  if (card.estado === "novo") {
    if (lapso) {
      novoEstado    = "aprendendo";
      novoIntervalo = 0;
    } else {
      novoEstado = "revisao";
      novoIntervalo = notaFinal === FACIL
        ? cfg.graduacao.facil
        : notaFinal === BOM
        ? cfg.graduacao.bom
        : cfg.graduacao.dificil;
    }

  } else if (card.estado === "aprendendo" || card.estado === "reaprendendo") {
    if (lapso) {
      novoIntervalo = 0;
      // novoEstado já é card.estado (aprendendo ou reaprendendo — mantém)
    } else {
      novoEstado    = "revisao";
      novoIntervalo = cfg.reinicioPosLapso;
    }

  } else {
    // "revisao"
    if (lapso) {
      novoEstado     = "reaprendendo";
      novosLapsos    = card.lapsos + 1;
      novasRepetices = 0;
      novoIntervalo  = 0;
    } else {
      let crescido;
      if (notaFinal === DIFICIL) {
        crescido = Math.round(card.intervalo * cfg.multDificil);
      } else if (notaFinal === BOM) {
        crescido = Math.round(card.intervalo * card.facilidade);
      } else {
        crescido = Math.round(card.intervalo * card.facilidade * cfg.bonusFacil);
      }
      novoIntervalo  = Math.min(cfg.intervaloMax, Math.max(crescido, card.intervalo + 1));
      novasRepetices = card.repeticoes + 1;
    }
  }

  // 4. proximaRevisao
  const proximaRevisao = lapso ? hoje : hoje + novoIntervalo;

  return {
    ...card,
    estado:         novoEstado,
    facilidade:     novaFacilidade,
    intervalo:      novoIntervalo,
    repeticoes:     novasRepetices,
    lapsos:         novosLapsos,
    ultimaRevisao:  hoje,
    proximaRevisao,
    flagRevisar:    novaFlag,
    historico:      [...card.historico, { data: hoje, recAcerto, recConfianca, resAcerto, notaRec, notaRes, notaFinal }],
  };
}

// ============================================================================
// construirFila — fila do dia (§7.6)
// ============================================================================

export function construirFila(cards, hoje, cfg = config, filtros = {}) {
  const rng = filtros.rng ?? Math.random;

  // Pré-computa força por habilidade (para tiebreak e priorização)
  const _forcaCache = new Map();
  const _getForca = (h) => {
    if (!_forcaCache.has(h)) {
      _forcaCache.set(h, forcaHabilidade(cards, h, cfg) ?? 0.5);
    }
    return _forcaCache.get(h);
  };

  const filtrar = (c) => {
    if (filtros.habilidade != null && c.habilidade !== filtros.habilidade) return false;
    return true;
  };

  // Grupo 1: aprendendo + reaprendendo vencidos (flagRevisar primeiro)
  const aprendendo = cards.filter(
    (c) => (c.estado === "aprendendo" || c.estado === "reaprendendo")
      && c.proximaRevisao <= hoje && filtrar(c)
  );
  const g1Flag  = _shuffleCopia(aprendendo.filter((c) => c.flagRevisar), rng);
  const g1Resto = _shuffleCopia(aprendendo.filter((c) => !c.flagRevisar), rng);
  const grupo1  = [...g1Flag, ...g1Resto];

  // Grupo 2: revisao vencidos — mais atrasados primeiro, tiebreak por habilidade mais fraca
  const revisaoVencidos = cards
    .filter((c) => c.estado === "revisao" && c.proximaRevisao <= hoje && filtrar(c))
    .sort((a, b) => {
      if (a.proximaRevisao !== b.proximaRevisao) return a.proximaRevisao - b.proximaRevisao;
      return _getForca(a.habilidade) - _getForca(b.habilidade);
    });
  const grupo2 = _embaralharComTiebreak(
    revisaoVencidos,
    (c) => `${c.proximaRevisao}|${_getForca(c.habilidade)}`,
    rng
  );

  // Grupo 3: novos até novasPorDia, priorizando habilidades fracas
  const novos = cards
    .filter((c) => c.estado === "novo" && filtrar(c))
    .sort((a, b) => _getForca(a.habilidade) - _getForca(b.habilidade))
    .slice(0, cfg.novasPorDia);
  const grupo3 = _shuffleCopia(novos, rng);

  return [...grupo1, ...grupo2, ...grupo3];
}

// ============================================================================
// forcaHabilidade — score [0,1] da habilidade h (§7.7)
// ============================================================================

/**
 * Últimas ~janelaForca tentativas da habilidade h.
 * ERRO_CONFIANTE conta como 2 "tentativas" no denominador (penaliza mais).
 * Retorna null se < 5 tentativas (incerta — prioridade média na fila).
 */
export function forcaHabilidade(cards, h, cfg = config) {
  const entradas = [];
  for (const card of cards) {
    if (card.habilidade !== h) continue;
    for (const e of card.historico) entradas.push(e);
  }
  entradas.sort((a, b) => a.data - b.data);
  const janela = entradas.slice(-cfg.janelaForca);

  if (janela.length < 5) return null;

  let numerador = 0;
  let denominador = 0;
  for (const e of janela) {
    const peso = e.notaRec === ERRO_CONFIANTE ? 2 : 1;
    denominador += peso;
    if (_ehAcerto(e.notaRec)) numerador += 1;
  }

  return denominador === 0 ? null : numerador / denominador;
}

// ============================================================================
// dominio — brilho no mapa do cérebro (§7.7)
// ============================================================================

/**
 * 0.6 × taxaAcertoRecente + 0.4 × (cardsMaduros / totalCards).
 * Maduro = estado "revisao" e intervalo >= 7.
 * Sem dados de tentativas → taxaAcertoRecente = 0.5 (neutro).
 */
export function dominio(cards, h, cfg = config) {
  const cardsH = cards.filter((c) => c.habilidade === h);
  if (cardsH.length === 0) return 0;

  // Taxa de acerto recente (simples, sem peso extra)
  const entradas = [];
  for (const card of cardsH) {
    for (const e of card.historico) entradas.push(e);
  }
  entradas.sort((a, b) => a.data - b.data);
  const janela = entradas.slice(-cfg.janelaForca);

  const taxaAcertoRecente = janela.length === 0
    ? 0.5
    : janela.filter((e) => _ehAcerto(e.notaRec)).length / janela.length;

  const maduros   = cardsH.filter((c) => c.estado === "revisao" && c.intervalo >= 7).length;
  const maturidade = maduros / cardsH.length;

  return 0.6 * taxaAcertoRecente + 0.4 * maturidade;
}
