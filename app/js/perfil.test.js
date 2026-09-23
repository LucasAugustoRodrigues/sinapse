import { describe, test, expect } from "vitest";
import { saudacao, fraseDoDia, FRASES } from "./perfil.js";

describe("saudacao — períodos", () => {
  test.each([
    [5,  "Bom dia"],
    [11, "Bom dia"],
    [12, "Boa tarde"],
    [17, "Boa tarde"],
    [18, "Boa noite"],
    [23, "Boa noite"],
    [0,  "Boa noite"],
    [4,  "Boa noite"],
  ])("hora %i → contém %s", (hora, esperado) => {
    expect(saudacao(hora, '')).toContain(esperado);
  });
});

describe("saudacao — com nome / sem nome", () => {
  test("com nome retorna saudação personalizada", () => {
    expect(saudacao(20, 'Ana')).toBe("Boa noite, Ana!");
  });

  test("sem nome retorna saudação genérica", () => {
    expect(saudacao(20, '')).toBe("Boa noite!");
  });
});

describe("fraseDoDia", () => {
  const frases = [
    { texto: "Frase A", autor: null },
    { texto: "Frase B", autor: null },
    { texto: "Frase C", autor: null },
  ];

  test("mesmo dia dá a mesma frase", () => {
    expect(fraseDoDia(7, frases)).toEqual(fraseDoDia(7, frases));
  });

  test("dias consecutivos dão frases diferentes quando n > 1", () => {
    expect(fraseDoDia(0, frases)).not.toEqual(fraseDoDia(1, frases));
  });

  test("dia = n dá a mesma frase que dia = 0 (ciclo)", () => {
    expect(fraseDoDia(frases.length, frases)).toEqual(fraseDoDia(0, frases));
  });

  test("sempre retorna um item com texto preenchido", () => {
    for (let d = 0; d < frases.length * 2; d++) {
      const f = fraseDoDia(d, frases);
      expect(f).toBeDefined();
      expect(f.texto.length).toBeGreaterThan(0);
    }
  });

  test("funciona com dia negativo (wrap correto)", () => {
    const f = fraseDoDia(-1, frases);
    expect(f).toBeDefined();
    expect(f.texto.length).toBeGreaterThan(0);
  });
});

describe("FRASES — invariantes", () => {
  test("todas têm texto não vazio", () => {
    for (const f of FRASES) {
      expect(typeof f.texto).toBe("string");
      expect(f.texto.trim().length).toBeGreaterThan(0);
    }
  });
});
