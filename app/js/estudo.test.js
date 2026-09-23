import 'fake-indexeddb/auto';
import { describe, test, expect } from 'vitest';
import { _reenfileirar, _montarCards, _filtrarQuestoes, _montarMapa } from './estudo.js';
import { estadoInicial, BOM } from './srs.js';

// ============================================================================
// Fixtures
// ============================================================================

const Q1 = { id: 'SAS-Q01', habilidade: 1, competencia: 1 };
const Q2 = { id: 'SAS-Q02', habilidade: 2, competencia: 1 };
const Q3 = { id: 'SAS-Q03', habilidade: 3, competencia: 1 };

// ============================================================================
// Fixtures com campos de filtro
// ============================================================================

const QEN  = { id: 'Q-EN',  habilidade: 1, competencia: 1, idioma: 'ingles',   fonte: 'SAS2024', simulado: 1 };
const QES  = { id: 'Q-ES',  habilidade: 1, competencia: 1, idioma: 'espanhol', fonte: 'SAS2024', simulado: 1 };
const QN1  = { id: 'Q-N1',  habilidade: 2, competencia: 1, idioma: null,       fonte: 'SAS2024', simulado: 1 };
const QN2  = { id: 'Q-N2',  habilidade: 3, competencia: 2, idioma: null,       fonte: 'SAS2024', simulado: 2 };
const QN3  = { id: 'Q-N3',  habilidade: 4, competencia: 2, idioma: null,       fonte: 'SAS2026', simulado: 1 };

// ============================================================================
// _filtrarQuestoes
// ============================================================================

describe('_filtrarQuestoes', () => {
  const todas = [QEN, QES, QN1, QN2, QN3];

  test('idioma "ingles": mantém ingles + null, exclui espanhol', () => {
    const res = _filtrarQuestoes(todas, { idioma: 'ingles' });
    expect(res.map(q => q.id)).toContain('Q-EN');
    expect(res.map(q => q.id)).toContain('Q-N1');
    expect(res.map(q => q.id)).not.toContain('Q-ES');
  });

  test('idioma "espanhol": mantém espanhol + null, exclui ingles', () => {
    const res = _filtrarQuestoes(todas, { idioma: 'espanhol' });
    expect(res.map(q => q.id)).toContain('Q-ES');
    expect(res.map(q => q.id)).toContain('Q-N1');
    expect(res.map(q => q.id)).not.toContain('Q-EN');
  });

  test('filtro por fonte+simulado: mantém só o simulado pedido', () => {
    const res = _filtrarQuestoes(todas, { idioma: 'ingles', fonte: 'SAS2024', simulado: 1 });
    const ids = res.map(q => q.id);
    expect(ids).toContain('Q-EN');
    expect(ids).toContain('Q-N1');
    expect(ids).not.toContain('Q-N2');  // simulado 2
    expect(ids).not.toContain('Q-N3');  // fonte diferente
  });

  test('filtro por fonte sem simulado: mantém toda a fonte', () => {
    const res = _filtrarQuestoes(todas, { idioma: 'ingles', fonte: 'SAS2024' });
    const ids = res.map(q => q.id);
    expect(ids).toContain('Q-N1');
    expect(ids).toContain('Q-N2');
    expect(ids).not.toContain('Q-N3');  // SAS2026
  });

  test('combinação idioma + simulado específico', () => {
    const res = _filtrarQuestoes(todas, { idioma: 'espanhol', fonte: 'SAS2024', simulado: 1 });
    const ids = res.map(q => q.id);
    expect(ids).toContain('Q-ES');
    expect(ids).toContain('Q-N1');
    expect(ids).not.toContain('Q-EN');   // idioma errado
    expect(ids).not.toContain('Q-N2');   // simulado 2
  });

  test('default de idioma (filtros={}) exclui espanhol', () => {
    const res = _filtrarQuestoes(todas, {});
    expect(res.map(q => q.id)).not.toContain('Q-ES');
    expect(res.map(q => q.id)).toContain('Q-EN');
    expect(res.map(q => q.id)).toContain('Q-N1');
  });
});

// ============================================================================
// _reenfileirar
// ============================================================================

describe('_reenfileirar', () => {
  const mk = (id) => ({ questaoId: id, cardId: id });
  const [A, B, C, D, E, F, G, H] = 'ABCDEFGH'.split('').map(mk);
  const fila8 = [A, B, C, D, E, F, G, H];

  test('erro reinsere ~6 posições à frente (6 cartas intervenientes)', () => {
    // indice=0, passo=6 → insere em 0+1+6=7
    const nova = _reenfileirar(fila8, 0, true, 6);
    expect(nova).toHaveLength(9);
    expect(nova[0]).toBe(A);  // posição original preservada
    expect(nova[7]).toBe(A);  // reinserido após 6 intervenientes (B..G)
    expect(nova[1]).toBe(B);
    expect(nova[6]).toBe(G);
  });

  test('graduou — reinsere=false retorna a mesma referência sem cópia', () => {
    const nova = _reenfileirar(fila8, 0, false, 6);
    expect(nova).toBe(fila8);
    expect(nova).toHaveLength(8);
  });

  test('fila curta não estoura — clamp coloca no fim', () => {
    const filaCorta = [A, B];
    const nova = _reenfileirar(filaCorta, 0, true, 6);
    expect(nova).toHaveLength(3);
    expect(nova[2]).toBe(A);  // inserido no fim
  });

  test('reinserção no meio da fila com clamp', () => {
    // indice=3, passo=6 → 3+1+6=10, clamp → fim (8)
    const nova = _reenfileirar(fila8, 3, true, 6);
    expect(nova).toHaveLength(9);
    expect(nova[3]).toBe(D);  // posição original intacta
    expect(nova[8]).toBe(D);  // inserido no fim
  });

  test('reinserção imediata com passo=1', () => {
    // indice=0, passo=1 → insere em posição 2 (após um interveniente)
    const nova = _reenfileirar([A, B, C], 0, true, 1);
    expect(nova).toHaveLength(4);
    expect(nova[2]).toBe(A);
    expect(nova[1]).toBe(B);
  });
});

// ============================================================================
// _montarMapa
// ============================================================================

describe('_montarMapa', () => {
  const card = (habilidade, historico = [], estado = 'novo', intervalo = 0) =>
    ({ habilidade, estado, intervalo, historico });

  test('devolve uma entrada por habilidade presente, ordenadas crescente', () => {
    const cards = [card(3), card(1), card(2), card(1)];
    const mapa  = _montarMapa(cards);
    expect(mapa).toHaveLength(3);
    expect(mapa.map(e => e.habilidade)).toEqual([1, 2, 3]);
  });

  test('card sem histórico → forca null, tentativas 0, dominio é número', () => {
    const [entrada] = _montarMapa([card(5)]);
    expect(entrada.forca).toBeNull();
    expect(entrada.tentativas).toBe(0);
    expect(typeof entrada.dominio).toBe('number');
  });

  test('habilidade com < 5 tentativas → forca null', () => {
    const hist4 = Array.from({ length: 4 }, (_, i) => ({ data: i, notaRec: BOM }));
    const [entrada] = _montarMapa([card(7, hist4, 'revisao', 5)]);
    expect(entrada.forca).toBeNull();
  });

  test('≥ 5 acertos BOM + estado revisao + intervalo 10 → forca > 0.9 e dominio > 0.5', () => {
    const hist6 = Array.from({ length: 6 }, (_, i) => ({ data: i, notaRec: BOM }));
    const [entrada] = _montarMapa([card(8, hist6, 'revisao', 10)]);
    expect(entrada.forca).toBeGreaterThan(0.9);
    expect(entrada.dominio).toBeGreaterThan(0.5);
  });

  test('questoes conta os cards da habilidade; tentativas soma historico.length', () => {
    const cards = [
      card(5, [{ data: 0, notaRec: BOM }]),
      card(5, [{ data: 1, notaRec: BOM }, { data: 2, notaRec: BOM }]),
      card(6),
    ];
    const [h5, h6] = _montarMapa(cards);
    expect(h5.questoes).toBe(2);
    expect(h5.tentativas).toBe(3);
    expect(h6.questoes).toBe(1);
    expect(h6.tentativas).toBe(0);
  });
});

// ============================================================================
// _montarCards
// ============================================================================

describe('_montarCards', () => {
  test('questão sem progresso recebe estadoInicial', () => {
    const mapa = _montarCards([Q1], {});
    expect(mapa[Q1.id]).toEqual(estadoInicial(Q1));
    expect(mapa[Q1.id].estado).toBe('novo');
  });

  test('questão com progresso existente usa o objeto salvo (mesma referência)', () => {
    const salvo = { estado: 'revisao', intervalo: 5, cardId: Q1.id };
    const mapa  = _montarCards([Q1, Q2], { [Q1.id]: salvo });
    expect(mapa[Q1.id]).toBe(salvo);         // mesma referência — não cria cópia
    expect(mapa[Q2.id]).toEqual(estadoInicial(Q2)); // sem progresso → inicial
  });

  test('mapa cobre todas as questões passadas', () => {
    const mapa = _montarCards([Q1, Q2, Q3], {});
    expect(Object.keys(mapa)).toHaveLength(3);
    for (const q of [Q1, Q2, Q3]) {
      expect(mapa[q.id].cardId).toBe(q.id);
      expect(mapa[q.id].estado).toBe('novo');
    }
  });

  test('progresso parcial: mistura salvo com inicial sem colisão', () => {
    const salvo = { estado: 'aprendendo', intervalo: 0, cardId: Q2.id };
    const mapa  = _montarCards([Q1, Q2, Q3], { [Q2.id]: salvo });
    expect(mapa[Q1.id].estado).toBe('novo');
    expect(mapa[Q2.id]).toBe(salvo);
    expect(mapa[Q3.id].estado).toBe('novo');
  });
});
