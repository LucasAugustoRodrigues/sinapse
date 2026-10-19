import { describe, test, expect } from "vitest";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { imagensFaltantes, lerNomeLocal } from "./preparar-dados.mjs";

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

describe("lerNomeLocal", () => {
  test("caminho inexistente → ''", async () => {
    expect(await lerNomeLocal("/caminho/que/nao/existe/perfil.local.js")).toBe('');
  });

  test("arquivo com NOME exportado → valor com trim", async () => {
    const tmp = join(tmpdir(), `sinapse-test-perfil-${Date.now()}.mjs`);
    writeFileSync(tmp, "export const NOME = '  Fulana ';", "utf-8");
    try {
      expect(await lerNomeLocal(tmp)).toBe('Fulana');
    } finally {
      unlinkSync(tmp);
    }
  });
});
