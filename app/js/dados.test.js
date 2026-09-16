import { describe, test, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  _acharHabilidade,
  _indexarPorId,
  _filtrarPorHabilidade,
  _filtrarPorCompetencia,
  salvarProgresso,
  lerProgresso,
  lerTodoProgresso,
  limparProgresso,
} from "./dados.js";

// ============================================================================
// Fixtures
// ============================================================================

const MATRIZ_FIXTURE = {
  area: "Linguagens",
  titulo: "LINGUAGENS, CÓDIGOS E SUAS TECNOLOGIAS",
  competencias: [
    {
      numero: 2,
      nome: "Compreensão de texto",
      habilidades: [
        { numero: 5, descricao: "Identificar tema central" },
        { numero: 6, descricao: "Reconhecer argumentação" },
      ],
    },
    {
      numero: 3,
      nome: "Variação linguística",
      habilidades: [
        { numero: 9, descricao: "Reconhecer registro informal e formal" },
      ],
    },
  ],
};

const QUESTOES_FIXTURE = [
  { id: "SAS2024-Q01", habilidade: 5, competencia: 2 },
  { id: "SAS2024-Q02", habilidade: 6, competencia: 2 },
  { id: "SAS2024-Q06", habilidade: 9, competencia: 3 },
];

// ============================================================================
// Lógica pura
// ============================================================================

describe("_acharHabilidade", () => {
  test("encontra habilidade existente e devolve contexto completo", () => {
    expect(_acharHabilidade(MATRIZ_FIXTURE, 5)).toEqual({
      numero: 5,
      descricao: "Identificar tema central",
      competencia: { numero: 2, nome: "Compreensão de texto" },
    });
  });

  test("encontra habilidade em competência diferente", () => {
    const res = _acharHabilidade(MATRIZ_FIXTURE, 9);
    expect(res?.competencia.numero).toBe(3);
  });

  test("retorna null para habilidade inexistente", () => {
    expect(_acharHabilidade(MATRIZ_FIXTURE, 99)).toBeNull();
  });
});

describe("_filtrarPorHabilidade", () => {
  test("retorna apenas as questões com a habilidade pedida", () => {
    const res = _filtrarPorHabilidade(QUESTOES_FIXTURE, 5);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("SAS2024-Q01");
  });

  test("retorna array vazio quando nenhuma questão bate", () => {
    expect(_filtrarPorHabilidade(QUESTOES_FIXTURE, 99)).toHaveLength(0);
  });
});

describe("_filtrarPorCompetencia", () => {
  test("retorna todas as questões da competência", () => {
    const res = _filtrarPorCompetencia(QUESTOES_FIXTURE, 2);
    expect(res).toHaveLength(2);
    expect(res.map((q) => q.id)).toContain("SAS2024-Q01");
    expect(res.map((q) => q.id)).toContain("SAS2024-Q02");
  });

  test("retorna array vazio quando competência não tem questões", () => {
    expect(_filtrarPorCompetencia(QUESTOES_FIXTURE, 9)).toHaveLength(0);
  });
});

describe("_indexarPorId", () => {
  test("indexa cada questão pelo id", () => {
    const idx = _indexarPorId(QUESTOES_FIXTURE);
    expect(idx.get("SAS2024-Q01")).toBe(QUESTOES_FIXTURE[0]);
    expect(idx.get("SAS2024-Q06")).toBe(QUESTOES_FIXTURE[2]);
  });

  test("retorna undefined para id ausente", () => {
    const idx = _indexarPorId(QUESTOES_FIXTURE);
    expect(idx.get("nao-existe")).toBeUndefined();
  });
});

// ============================================================================
// Progresso (IndexedDB via fake-indexeddb)
// ============================================================================

describe("progresso IndexedDB", () => {
  beforeEach(async () => {
    await limparProgresso();
  });

  test("salvarProgresso + lerProgresso faz roundtrip", async () => {
    const estado = { intervalo: 3, easeFactor: 2.5, proxima: "2026-09-20" };
    await salvarProgresso("SAS2024-Q01", estado);
    expect(await lerProgresso("SAS2024-Q01")).toEqual(estado);
  });

  test("lerProgresso de id inexistente retorna null", async () => {
    expect(await lerProgresso("nao-existe-999")).toBeNull();
  });

  test("lerTodoProgresso devolve todos os registros salvos", async () => {
    await salvarProgresso("SAS2024-Q01", { easeFactor: 2.5 });
    await salvarProgresso("SAS2024-Q02", { easeFactor: 2.1 });
    const todos = await lerTodoProgresso();
    expect(Object.keys(todos)).toHaveLength(2);
    expect(todos["SAS2024-Q01"]).toEqual({ easeFactor: 2.5 });
    expect(todos["SAS2024-Q02"]).toEqual({ easeFactor: 2.1 });
  });

  test("limparProgresso esvazia o store", async () => {
    await salvarProgresso("SAS2024-Q01", { easeFactor: 2.5 });
    await limparProgresso();
    expect(Object.keys(await lerTodoProgresso())).toHaveLength(0);
  });

  test("salvarProgresso sobrescreve estado anterior do mesmo id", async () => {
    await salvarProgresso("SAS2024-Q01", { easeFactor: 2.5 });
    await salvarProgresso("SAS2024-Q01", { easeFactor: 1.8 });
    expect(await lerProgresso("SAS2024-Q01")).toEqual({ easeFactor: 1.8 });
  });
});
