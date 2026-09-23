// estudo.js — camada de domínio: sessão de estudo.
// Liga renderCard (ui.js) ao motor (srs.js) e ao repositório (dados.js).

import { construirFila, revisar, estadoInicial, config, forcaHabilidade, dominio, contarNovasHoje } from './srs.js';
import { carregarQuestoes, lerTodoProgresso, salvarProgresso } from './dados.js';

// ============================================================================
// Filtros de conteúdo — aplicados antes de montar cards
// ============================================================================

/**
 * Filtra questões por idioma e/ou simulado.
 * - idioma: mantém questoes com idioma===null OU idioma===filtros.idioma.
 *   Default "ingles" (espanhol some se não solicitado explicitamente).
 * - fonte + simulado: se presentes, mantém só as daquele simulado.
 */
export function _filtrarQuestoes(questoes, filtros = {}) {
  const idioma = filtros.idioma ?? 'ingles';
  return questoes.filter(q => {
    if (q.idioma !== null && q.idioma !== undefined && q.idioma !== idioma) return false;
    if (filtros.fonte     != null && q.fonte     !== filtros.fonte)     return false;
    if (filtros.simulado  != null && q.simulado  !== filtros.simulado)  return false;
    return true;
  });
}

/** Extrai o ano de uma string de fonte como "SAS2024" → 2024. */
function _anoFonte(fonte) {
  return parseInt((fonte ?? '').replace(/\D/g, ''), 10) || 0;
}

// ============================================================================
// Funções puras exportadas (testáveis sem IO)
// ============================================================================

/** Converte ms epoch para número de dia no fuso local (offsetMin = Date.getTimezoneOffset()). */
export function _diaLocal(ms, offsetMin) {
  return Math.floor((ms - offsetMin * 60000) / 86400000);
}

/** Dia local atual. Corrige o bug UTC que virava o dia às 21h em Brasília. */
export function hojeEmDias() {
  return _diaLocal(Date.now(), new Date().getTimezoneOffset());
}

/**
 * Monta mapa id→card a partir das questões e do progresso salvo.
 * Questão sem progresso recebe estadoInicial(); com progresso, usa o salvo.
 */
export function _montarCards(questoes, progresso) {
  const mapa = {};
  for (const q of questoes) {
    mapa[q.id] = progresso[q.id] ?? estadoInicial(q);
  }
  return mapa;
}

/**
 * Reinsere fila[indice] ~passo posições à frente na fila restante.
 * Não muta o array original. Clamps no fim da fila.
 *
 * @param {Array}   fila     - fila de cards
 * @param {number}  indice   - posição do card recém-processado
 * @param {boolean} reinsere - se false, devolve a fila original sem cópia
 * @param {number}  passo    - cartas intervenientes antes de rever (config.retentativa)
 */
export function _reenfileirar(fila, indice, reinsere, passo) {
  if (!reinsere) return fila;
  const card = fila[indice];
  const insPos = Math.min(indice + 1 + passo, fila.length);
  const nova = [...fila];
  nova.splice(insPos, 0, card);
  return nova;
}

// ============================================================================
// Helpers para a tela de seleção (passo 2)
// ============================================================================

/**
 * Devolve lista de simulados distintos, ordenados por ano e número.
 * { fonte, ano, simulado, label }
 */
export async function listarSimulados() {
  const questoes  = await carregarQuestoes();
  const vistos    = new Set();
  const resultado = [];
  for (const q of questoes) {
    const chave = `${q.fonte}|${q.simulado}`;
    if (!vistos.has(chave)) {
      vistos.add(chave);
      const ano = _anoFonte(q.fonte);
      resultado.push({ fonte: q.fonte, ano, simulado: q.simulado, label: `SAS ${ano} · Simulado ${q.simulado}` });
    }
  }
  resultado.sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.simulado - b.simulado);
  return resultado;
}

/**
 * Conta quantos cards estão na fila do dia para os filtros dados.
 * Reutiliza a mesma lógica de iniciarSessao sem criar o objeto Sessao.
 */
export async function contarRevisao(filtros = {}) {
  const [questoes, progresso] = await Promise.all([
    carregarQuestoes(),
    lerTodoProgresso(),
  ]);
  const questoesFiltradas = _filtrarQuestoes(questoes, filtros);
  const mapaCards = _montarCards(questoesFiltradas, progresso);
  const hoje = hojeEmDias();
  const novasHoje = contarNovasHoje(Object.values(progresso), hoje);
  return construirFila(Object.values(mapaCards), hoje, config, { ...filtros, novasHoje }).length;
}

// ============================================================================
// _montarMapa — dados da tela Progresso ("mapa do cérebro")
// ============================================================================

/**
 * Recebe o array de cards e devolve, por habilidade presente,
 * { habilidade, forca, dominio, questoes, tentativas }, ordenado crescente.
 */
export function _montarMapa(cards) {
  const habilidades = [...new Set(cards.map(c => c.habilidade))].sort((a, b) => a - b);
  return habilidades.map(h => {
    const cardsH = cards.filter(c => c.habilidade === h);
    return {
      habilidade: h,
      forca:      forcaHabilidade(cards, h),
      dominio:    dominio(cards, h),
      questoes:   cardsH.length,
      tentativas: cardsH.reduce((sum, c) => sum + c.historico.length, 0),
    };
  });
}

/**
 * Carrega questões + progresso, aplica filtros e devolve o mapa de habilidades.
 * Default idioma "ingles" — coerente com a sessão de revisão.
 */
export async function mapaCerebro(filtros = { idioma: 'ingles' }) {
  const [questoes, progresso] = await Promise.all([
    carregarQuestoes(),
    lerTodoProgresso(),
  ]);
  const questoesFiltradas = _filtrarQuestoes(questoes, filtros);
  const mapaCards = _montarCards(questoesFiltradas, progresso);
  return _montarMapa(Object.values(mapaCards));
}

// ============================================================================
// _streak e resumoInicio — dados da tela Início ("pulsos")
// ============================================================================

/**
 * Conta dias de revisão consecutivos terminando em hoje.
 * Se hoje ainda não tem revisão, o streak continua vivo a partir de ontem.
 */
export function _streak(diasComRevisao, hoje) {
  let dia = diasComRevisao.has(hoje) ? hoje : hoje - 1;
  let count = 0;
  while (diasComRevisao.has(dia)) {
    count++;
    dia--;
  }
  return count;
}

/**
 * Carrega questões + progresso e devolve os "pulsos" da tela Início:
 * revisaoHoje, dominadas, total, streak, questoesSemana.
 */
export async function resumoInicio(filtros = { idioma: 'ingles' }) {
  const [questoes, progresso] = await Promise.all([
    carregarQuestoes(),
    lerTodoProgresso(),
  ]);
  const questoesFiltradas = _filtrarQuestoes(questoes, filtros);
  const mapaCards = _montarCards(questoesFiltradas, progresso);
  const cards = Object.values(mapaCards);
  const hoje = hojeEmDias();

  const diasComRevisao = new Set();
  let questoesSemana = 0;
  for (const card of cards) {
    for (const entrada of card.historico) {
      diasComRevisao.add(entrada.data);
      if (entrada.data >= hoje - 6) questoesSemana++;
    }
  }

  const mapa = _montarMapa(cards);

  const novasHoje = contarNovasHoje(Object.values(progresso), hoje);

  return {
    revisaoHoje:    construirFila(cards, hoje, config, { ...filtros, novasHoje }).length,
    dominadas:      mapa.filter(e => e.dominio >= 0.8).length,
    total:          mapa.length,
    streak:         _streak(diasComRevisao, hoje),
    questoesSemana,
  };
}

// ============================================================================
// iniciarSessao — ponto de entrada da camada de domínio
// ============================================================================

/**
 * Carrega questões + progresso, aplica filtros de conteúdo, monta a fila do dia
 * e devolve um objeto Sessao.
 * @param {Object} filtros - idioma, fonte, simulado, habilidade, rng
 */
export async function iniciarSessao(filtros = {}) {
  const [questoes, progresso] = await Promise.all([
    carregarQuestoes(),
    lerTodoProgresso(),
  ]);

  const questoesFiltradas = _filtrarQuestoes(questoes, filtros);
  const questoesById = new Map(questoesFiltradas.map(q => [q.id, q]));
  const mapaCards   = _montarCards(questoesFiltradas, progresso);
  const hoje        = hojeEmDias();
  const novasHoje   = contarNovasHoje(Object.values(progresso), hoje);
  let fila          = construirFila(Object.values(mapaCards), hoje, config, { ...filtros, novasHoje });

  const total = fila.length;  // tamanho original — não cresce com reinserções na contagem
  let indice                = 0;
  let acertosReconhecimento = 0;
  let feitas                = 0;

  return {
    /** { questao, card } para a posição atual, ou null quando a fila acabou. */
    atual() {
      if (indice >= fila.length) return null;
      const ref     = fila[indice];
      const questao = questoesById.get(ref.questaoId);
      if (!questao) return null;
      return { questao, card: mapaCards[ref.questaoId] };
    },

    /** Persiste o resultado, reenfileira se errou, avança o índice. */
    async registrar({ recAcerto, recConfianca, resAcerto }) {
      if (indice >= fila.length) return;
      const ref   = fila[indice];
      const card  = mapaCards[ref.questaoId];
      const card2 = revisar(card, { recAcerto, recConfianca, resAcerto }, hojeEmDias());

      await salvarProgresso(card.cardId, card2);
      mapaCards[card.cardId] = card2;

      if (recAcerto) acertosReconhecimento += 1;
      feitas += 1;

      const reinsere = card2.estado === 'aprendendo' || card2.estado === 'reaprendendo';
      fila   = _reenfileirar(fila, indice, reinsere, config.retentativa);
      indice += 1;
    },

    /** Estatísticas da sessão até o momento. */
    resumo() {
      return { feitas, total, acertosReconhecimento };
    },
  };
}
