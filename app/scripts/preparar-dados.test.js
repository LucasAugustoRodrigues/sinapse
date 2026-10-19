import { describe, test, expect } from "vitest";
import { imagensFaltantes } from "./preparar-dados.mjs";

describe("imagensFaltantes", () => {
  test("nenhuma faltando → []", () => {
    const questoes = [
      { id: "Q1", imagens: ["imagens/a.png", "imagens/b.png"] },
    ];
    const imagens = new Map([
      ["imagens/a.png", new Uint8Array([1])],
      ["imagens/b.png", new Uint8Array([2])],
    ]);
    expect(imagensFaltantes(questoes, imagens)).toEqual([]);
  });

  test("uma faltando → [ela]", () => {
    const questoes = [{ id: "Q1", imagens: ["imagens/x.png"] }];
    const imagens  = new Map();
    expect(imagensFaltantes(questoes, imagens)).toEqual(["imagens/x.png"]);
  });

  test("questão sem campo imagens é ignorada", () => {
    const questoes = [{ id: "Q1" }, { id: "Q2", imagens: [] }];
    const imagens  = new Map();
    expect(imagensFaltantes(questoes, imagens)).toEqual([]);
  });

  test("caminho citado por duas questões e ausente aparece uma vez, saída ordenada", () => {
    const questoes = [
      { id: "Q1", imagens: ["imagens/z.png", "imagens/a.png"] },
      { id: "Q2", imagens: ["imagens/z.png"] },
    ];
    const imagens = new Map();
    expect(imagensFaltantes(questoes, imagens)).toEqual(["imagens/a.png", "imagens/z.png"]);
  });
});
