import { describe, test, expect } from 'vitest';
import { formatarTempo, criarCronometro } from './tempo.js';

// ============================================================================
// formatarTempo
// ============================================================================

describe('formatarTempo', () => {
  test('7000 ms → "0:07"',     () => expect(formatarTempo(7000)).toBe('0:07'));
  test('155000 ms → "2:35"',   () => expect(formatarTempo(155000)).toBe('2:35'));
  test('724000 ms → "12:04"',  () => expect(formatarTempo(724000)).toBe('12:04'));
  test('3900000 ms → "1h 05min"', () => expect(formatarTempo(3900000)).toBe('1h 05min'));
  test('null → "—"',           () => expect(formatarTempo(null)).toBe('—'));
  test('undefined → "—"',      () => expect(formatarTempo(undefined)).toBe('—'));
});

// ============================================================================
// criarCronometro — relógio falso (variável t controlada pelo teste)
// ============================================================================

describe('criarCronometro', () => {
  test('iniciar + avançar 5000 → tempoMs() = 5000', () => {
    let t = 0;
    const c = criarCronometro(() => t);
    c.iniciar();
    t += 5000;
    expect(c.tempoMs()).toBe(5000);
    expect(c.estado).toBe('rodando');
  });

  test('pausa não conta no tempo acumulado', () => {
    let t = 0;
    const c = criarCronometro(() => t);
    c.iniciar();
    t += 5000;
    c.pausar();
    t += 60000;   // 60 s em pausa — não devem contar
    c.retomar();
    t += 2000;
    expect(c.tempoMs()).toBe(7000);
  });

  test('parar() retorna o total; avançar o relógio depois não muda nada', () => {
    let t = 0;
    const c = criarCronometro(() => t);
    c.iniciar();
    t += 10000;
    const total = c.parar();
    expect(total).toBe(10000);
    t += 99999;
    expect(c.tempoMs()).toBe(10000);
    expect(c.estado).toBe('parado');
  });

  test('retomar() após parado não volta a contar', () => {
    let t = 0;
    const c = criarCronometro(() => t);
    c.iniciar();
    t += 3000;
    c.parar();
    c.retomar();    // deve ser ignorado
    t += 5000;
    expect(c.tempoMs()).toBe(3000);
    expect(c.estado).toBe('parado');
  });

  test('pausar duas vezes seguidas não quebra o cálculo', () => {
    let t = 0;
    const c = criarCronometro(() => t);
    c.iniciar();
    t += 4000;
    c.pausar();
    c.pausar();   // idempotente
    t += 1000;
    c.retomar();
    t += 2000;
    expect(c.tempoMs()).toBe(6000);
  });
});
