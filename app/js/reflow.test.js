import { describe, it, expect } from 'vitest';
import { reflowEnunciado } from './reflow.js';

describe('reflowEnunciado', () => {
  it('texto vazio retorna vazio', () => {
    expect(reflowEnunciado('')).toBe('');
  });

  it('texto de uma linha retorna o próprio texto', () => {
    const t = 'Uma linha apenas sem quebra nenhuma.';
    expect(reflowEnunciado(t)).toBe(t);
  });

  it('curto_demais — w < 30, retorna idêntico', () => {
    const entrada = 'DENUNCIE:\n180\nÉ SIGILOSO.';
    expect(reflowEnunciado(entrada)).toBe(entrada);
  });

  it('prosa_dialogo_ref_comando — junta prosa, preserva diálogo/ref', () => {
    const entrada = [
      '— Ah! O senhor é que é o Pestana? perguntou',
      'Sinhazinha Mota, fazendo um largo gesto admirativo. E',
      'logo depois, corrigindo a familiaridade: — Desculpe meu',
      'modo, mas... é mesmo o senhor?',
      'Vexado, aborrecido, Pestana respondeu que sim, que',
      'era ele. Vinha do piano, enxugando a testa com o lenço, e',
      'vez que folgou e riu, pois faleceu nos primeiros dias de',
      '1876. Boa e patusca viúva!',
      '— Diga, minha senhora.',
      'ASSIS, Machado de. Um homem célebre. Obra Completa. Rio de Janeiro: Nova Aguilar',
      '1994.',
      'O trecho do conto de Machado de Assis aborda aspectos',
      'da sociedade brasileira do século XIX. No fragmento, o',
      'ponto de vista do narrador evidencia',
    ].join('\n');

    const esperado = [
      '— Ah! O senhor é que é o Pestana? perguntou Sinhazinha Mota, fazendo um largo gesto admirativo. E logo depois, corrigindo a familiaridade: — Desculpe meu modo, mas... é mesmo o senhor?',
      'Vexado, aborrecido, Pestana respondeu que sim, que era ele. Vinha do piano, enxugando a testa com o lenço, e vez que folgou e riu, pois faleceu nos primeiros dias de 1876. Boa e patusca viúva!',
      '— Diga, minha senhora.',
      'ASSIS, Machado de. Um homem célebre. Obra Completa. Rio de Janeiro: Nova Aguilar',
      '1994.',
      'O trecho do conto de Machado de Assis aborda aspectos da sociedade brasileira do século XIX. No fragmento, o ponto de vista do narrador evidencia',
    ].join('\n');

    expect(reflowEnunciado(entrada)).toBe(esperado);
  });

  it('poema_e_comando — preserva versos, junta só o comando', () => {
    const entrada = [
      'Acordo cedo e abro o livro',
      'O sol ainda nem nasceu',
      'Cada página que eu revivo',
      'É um passo que já é meu',
      '[…]',
      'Poema escrito para este teste.',
      'Nesse poema, a repetição de estruturas sintáticas e a',
      'escolha vocabular contribuem para construir a ideia de',
    ].join('\n');

    const esperado = [
      'Acordo cedo e abro o livro',
      'O sol ainda nem nasceu',
      'Cada página que eu revivo',
      'É um passo que já é meu',
      '[…]',
      'Poema escrito para este teste.',
      'Nesse poema, a repetição de estruturas sintáticas e a escolha vocabular contribuem para construir a ideia de',
    ].join('\n');

    expect(reflowEnunciado(entrada)).toBe(esperado);
  });

  it('cartaz_ref_comando — preserva cartaz e ref, junta comando', () => {
    const entrada = [
      'PREFIRA AS ESCADAS',
      'ECONOMIZE ENERGIA',
      'Disponível em: https://exemplo.gov.br. Acesso em: 1 jan. 2024.',
      'No texto, as informações sobre a utilização de escadas',
      'têm a função principal de',
    ].join('\n');

    const esperado = [
      'PREFIRA AS ESCADAS',
      'ECONOMIZE ENERGIA',
      'Disponível em: https://exemplo.gov.br. Acesso em: 1 jan. 2024.',
      'No texto, as informações sobre a utilização de escadas têm a função principal de',
    ].join('\n');

    expect(reflowEnunciado(entrada)).toBe(esperado);
  });

  it('lista_numerada — preserva todos os itens intactos', () => {
    const entrada = [
      'Leia as afirmativas a seguir sobre o texto apresentado:',
      '1. O autor defende a leitura diária como hábito.',
      '2) O texto apresenta dados estatísticos.',
      'I – A linguagem é predominantemente formal.',
    ].join('\n');

    expect(reflowEnunciado(entrada)).toBe(entrada);
  });
});
