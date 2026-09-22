// estudo.js — camada de domínio: sessão de estudo.
// Liga renderCard (ui.js) ao motor (srs.js) e ao repositório (dados.js).

import { construirFila, revisar, estadoInicial, config } from './srs.js';
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

/** Dias inteiros desde a epoch Unix (UTC). Única conversão Date↔dia do app. */
export function hojeEmDias() {
  return Math.floor(Date.now() / 86400000);
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
  return construirFila(Object.values(mapaCards), hojeEmDias(), config, filtros).length;
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
  let fila          = construirFila(Object.values(mapaCards), hojeEmDias(), config, filtros);

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
