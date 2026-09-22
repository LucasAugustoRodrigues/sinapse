import 'fake-indexeddb/auto';
import { describe, test, expect } from 'vitest';
import { _reenfileirar, _montarCards } from './estudo.js';
import { estadoInicial } from './srs.js';

// ============================================================================
// Fixtures
// ============================================================================

const Q1 = { id: 'SAS-Q01', habilidade: 1, competencia: 1 };
const Q2 = { id: 'SAS-Q02', habilidade: 2, competencia: 1 };
const Q3 = { id: 'SAS-Q03', habilidade: 3, competencia: 1 };

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
