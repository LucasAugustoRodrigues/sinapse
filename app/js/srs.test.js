import { describe, test, expect } from "vitest";
import {
  ERREI, ERRO_CONFIANTE, DIFICIL, BOM, FACIL,
  CHUTEI, DUVIDA, CERTEZA,
  config,
  derivarNota, pior, estadoInicial, revisar,
  construirFila, forcaHabilidade, dominio,
} from "./srs.js";

// ============================================================================
// Fixtures reutilizáveis
// ============================================================================

const QUESTAO = { id: "SAS2024-Q01", habilidade: 5, competencia: 2 };
const HOJE = 100;

// Shortcuts de resultado — recAcerto/recConfianca/resAcerto comuns
const REC_DIFICIL        = { recAcerto: true,  recConfianca: CHUTEI,  resAcerto: true  }; // notaFinal=DIFICIL
const REC_BOM            = { recAcerto: true,  recConfianca: DUVIDA,  resAcerto: true  }; // notaFinal=BOM
const REC_FACIL          = { recAcerto: true,  recConfianca: CERTEZA, resAcerto: true  }; // notaRec=FACIL, notaFinal=BOM
const REC_ERREI          = { recAcerto: false, recConfianca: DUVIDA,  resAcerto: false }; // notaFinal=ERREI
const REC_ERRO_CONFIANTE = { recAcerto: false, recConfianca: CERTEZA, resAcerto: false }; // notaFinal=ERRO_CONFIANTE

// Card em estado "novo" (facilidade=2.5, intervalo=0)
const cardNovo = estadoInicial(QUESTAO);

// Card em estado "revisao" com intervalo=10 e ease=2.5
const cardRevisao = {
  ...estadoInicial(QUESTAO),
  estado: "revisao",
  facilidade: 2.5,
  intervalo: 10,
  repeticoes: 3,
};

// ============================================================================
// derivarNota — as 5 linhas da tabela (§7.2)
// ============================================================================

describe("derivarNota", () => {
  test("errou + chutei → ERREI",           () => expect(derivarNota(false, CHUTEI)).toBe(ERREI));
  test("errou + duvida → ERREI",           () => expect(derivarNota(false, DUVIDA)).toBe(ERREI));
  test("errou + certeza → ERRO_CONFIANTE", () => expect(derivarNota(false, CERTEZA)).toBe(ERRO_CONFIANTE));
  test("acertou + chutei → DIFICIL",       () => expect(derivarNota(true,  CHUTEI)).toBe(DIFICIL));
  test("acertou + duvida → BOM",           () => expect(derivarNota(true,  DUVIDA)).toBe(BOM));
  test("acertou + certeza → FACIL",        () => expect(derivarNota(true,  CERTEZA)).toBe(FACIL));
});

// ============================================================================
// pior — ordenação ERRO_CONFIANTE < ERREI < DIFICIL < BOM < FACIL
// ============================================================================

describe("pior", () => {
  test("pior(FACIL, BOM) = BOM",                       () => expect(pior(FACIL, BOM)).toBe(BOM));
  test("pior(ERRO_CONFIANTE, ERREI) = ERRO_CONFIANTE", () => expect(pior(ERRO_CONFIANTE, ERREI)).toBe(ERRO_CONFIANTE));
  test("pior(DIFICIL, BOM) = DIFICIL",                 () => expect(pior(DIFICIL, BOM)).toBe(DIFICIL));
  test("pior(BOM, BOM) = BOM (idempotente)",           () => expect(pior(BOM, BOM)).toBe(BOM));
  test("pior(ERREI, ERRO_CONFIANTE) = ERRO_CONFIANTE (comutativo)", () =>
    expect(pior(ERREI, ERRO_CONFIANTE)).toBe(ERRO_CONFIANTE));
});

// ============================================================================
// Graduação — card novo no primeiro acerto (§7.4)
// ============================================================================

describe("graduação de card novo", () => {
  test("novo + DIFICIL → revisao, intervalo=1, ease=2.35", () => {
    const c = revisar(cardNovo, REC_DIFICIL, HOJE);
    expect(c.estado).toBe("revisao");
    expect(c.intervalo).toBe(1);
    expect(c.facilidade).toBeCloseTo(2.35);
    expect(c.proximaRevisao).toBe(HOJE + 1);
  });

  test("novo + BOM → revisao, intervalo=1, ease=2.5", () => {
    const c = revisar(cardNovo, REC_BOM, HOJE);
    expect(c.estado).toBe("revisao");
    expect(c.intervalo).toBe(1);
    expect(c.facilidade).toBe(2.5);
    expect(c.proximaRevisao).toBe(HOJE + 1);
  });

  test("reconhecimento FACIL (notaRec=FACIL) + resAcerto → notaFinal=BOM, intervalo=1", () => {
    // pior(FACIL, BOM) = BOM → notaFinal não pode ser FACIL com a nova API
    const c = revisar(cardNovo, REC_FACIL, HOJE);
    expect(c.estado).toBe("revisao");
    expect(c.intervalo).toBe(1);
    expect(c.proximaRevisao).toBe(HOJE + 1);
  });
});

// ============================================================================
// Card novo que erra → aprendendo (§7.4, §7.5)
// ============================================================================

describe("card novo que erra", () => {
  test("novo + ERREI → aprendendo, intervalo=0, proximaRevisao=hoje, flagRevisar=false", () => {
    const c = revisar(cardNovo, REC_ERREI, HOJE);
    expect(c.estado).toBe("aprendendo");
    expect(c.intervalo).toBe(0);
    expect(c.proximaRevisao).toBe(HOJE);
    expect(c.flagRevisar).toBe(false);
    expect(c.lapsos).toBe(0); // lapso só conta quando revisao→reaprendendo
  });

  test("novo + ERRO_CONFIANTE → aprendendo, flagRevisar=true", () => {
    const c = revisar(cardNovo, REC_ERRO_CONFIANTE, HOJE);
    expect(c.estado).toBe("aprendendo");
    expect(c.intervalo).toBe(0);
    expect(c.proximaRevisao).toBe(HOJE);
    expect(c.flagRevisar).toBe(true);
    expect(c.lapsos).toBe(0);
  });
});

// ============================================================================
// Crescimento em revisão (intervalo=10, ease=2.5) (§7.4)
// ============================================================================

describe("crescimento em revisão intervalo=10 ease=2.5", () => {
  test("BOM → round(10 × 2.5) = 25", () => {
    expect(revisar(cardRevisao, REC_BOM, HOJE).intervalo).toBe(25);
  });

  test("DIFICIL → round(10 × 1.2) = 12", () => {
    expect(revisar(cardRevisao, REC_DIFICIL, HOJE).intervalo).toBe(12);
  });

  test("repeticoes incrementa num acerto", () => {
    expect(revisar(cardRevisao, REC_BOM, HOJE).repeticoes).toBe(4);
  });
});

// ============================================================================
// Garantia >= intervalo + 1 (§7.4)
// ============================================================================

describe("garantia nova >= intervalo + 1", () => {
  test("intervalo=1 ease=1.3 + BOM → round(1.3)=1, garantia → 2", () => {
    const card = { ...cardNovo, estado: "revisao", facilidade: 1.3, intervalo: 1 };
    expect(revisar(card, REC_BOM, HOJE).intervalo).toBe(2);
  });
});

// ============================================================================
// Teto de intervalo (§7.4)
// ============================================================================

describe("teto intervaloMax=45", () => {
  test("intervalo=40 ease=2.5 + BOM → round(100) capado a 45", () => {
    const card = { ...cardRevisao, intervalo: 40 };
    expect(revisar(card, REC_BOM, HOJE).intervalo).toBe(45);
  });

  test("intervalo=44 ease=2.5 + BOM → round(110) capado a 45", () => {
    const card = { ...cardRevisao, intervalo: 44 };
    expect(revisar(card, REC_BOM, HOJE).intervalo).toBe(45);
  });
});

// ============================================================================
// Lapso: revisao → reaprendendo (§7.4)
// ============================================================================

describe("lapso em revisão", () => {
  test("ERREI → reaprendendo, lapsos=1, ease=2.30, flagRevisar=false, repeticoes=0", () => {
    const c = revisar(cardRevisao, REC_ERREI, HOJE);
    expect(c.estado).toBe("reaprendendo");
    expect(c.lapsos).toBe(1);
    expect(c.facilidade).toBeCloseTo(2.30);
    expect(c.flagRevisar).toBe(false);
    expect(c.repeticoes).toBe(0);
    expect(c.proximaRevisao).toBe(HOJE);
  });

  test("ERRO_CONFIANTE → reaprendendo, lapsos=1, ease=2.20, flagRevisar=true", () => {
    const c = revisar(cardRevisao, REC_ERRO_CONFIANTE, HOJE);
    expect(c.estado).toBe("reaprendendo");
    expect(c.lapsos).toBe(1);
    expect(c.facilidade).toBeCloseTo(2.20);
    expect(c.flagRevisar).toBe(true);
    expect(c.proximaRevisao).toBe(HOJE);
  });

  test("flagRevisar prévio é mantido após ERREI (não limpa)", () => {
    const cardComFlag = { ...cardRevisao, flagRevisar: true };
    expect(revisar(cardComFlag, REC_ERREI, HOJE).flagRevisar).toBe(true);
  });

  test("acerto após lapso desliga flagRevisar", () => {
    const cardReap = { ...cardNovo, estado: "reaprendendo", intervalo: 0, flagRevisar: true };
    expect(revisar(cardReap, REC_BOM, HOJE).flagRevisar).toBe(false);
  });
});

// ============================================================================
// Clamp do ease nos extremos (§7.4, §7.8)
// ============================================================================

describe("clamp do ease", () => {
  test("ease=1.35 + ERRO_CONFIANTE (1.35-0.30=1.05) → clampado a 1.3", () => {
    const card = { ...cardRevisao, facilidade: 1.35, intervalo: 5 };
    expect(revisar(card, REC_ERRO_CONFIANTE, HOJE).facilidade).toBeCloseTo(1.3);
  });

  test("ease=1.3 (mínimo) + ERREI (1.3-0.20=1.10) → clampado a 1.3", () => {
    const card = { ...cardRevisao, facilidade: 1.3, intervalo: 5 };
    expect(revisar(card, REC_ERREI, HOJE).facilidade).toBeCloseTo(1.3);
  });
});

// ============================================================================
// Pureza — revisar() não muta o card de entrada (§7)
// ============================================================================

describe("pureza de revisar()", () => {
  test("card original não é mutado após revisar()", () => {
    const antes = JSON.parse(JSON.stringify(cardNovo));
    revisar(cardNovo, REC_BOM, HOJE);
    expect(cardNovo).toEqual(antes);
  });

  test("historico do card original não cresce", () => {
    const h0 = cardNovo.historico.length;
    revisar(cardNovo, REC_BOM, HOJE);
    expect(cardNovo.historico.length).toBe(h0);
  });

  test("historico do card retornado tem todos os campos §7.3", () => {
    const c = revisar(cardNovo, REC_BOM, HOJE);
    expect(c.historico.length).toBe(cardNovo.historico.length + 1);
    expect(c.historico.at(-1)).toMatchObject({
      data:         HOJE,
      recAcerto:    true,
      recConfianca: DUVIDA,
      resAcerto:    true,
      notaRec:      BOM,
      notaRes:      BOM,
      notaFinal:    BOM,
    });
  });
});

// ============================================================================
// Reaprendendo acerta → volta a revisao com reinicioPosLapso (§7.4)
// ============================================================================

describe("reaprendendo que acerta", () => {
  test("reaprendendo + BOM → revisao, intervalo=reinicioPosLapso=1", () => {
    const cardReap = { ...cardNovo, estado: "reaprendendo", intervalo: 0, lapsos: 1 };
    const c = revisar(cardReap, REC_BOM, HOJE);
    expect(c.estado).toBe("revisao");
    expect(c.intervalo).toBe(config.reinicioPosLapso);
    expect(c.proximaRevisao).toBe(HOJE + 1);
    expect(c.lapsos).toBe(1); // lapsos não reseta
  });
});

// ============================================================================
// construirFila — ordem dos grupos com rng determinístico (§7.6)
// ============================================================================

describe("construirFila", () => {
  // rng = () => 0.9999 → Fisher-Yates com j=i sempre = sem swaps (ordem preservada)
  const rng = () => 0.9999;
  const hoje = 5;

  const cReapFlag = {
    cardId: "reap-flag", estado: "reaprendendo",
    proximaRevisao: 0, flagRevisar: true, habilidade: 1, historico: [],
  };
  const cReap = {
    cardId: "reap", estado: "reaprendendo",
    proximaRevisao: 3, flagRevisar: false, habilidade: 2, historico: [],
  };
  const cRevAtrasado = {
    cardId: "rev-atrasado", estado: "revisao",
    proximaRevisao: 1, flagRevisar: false, habilidade: 3, historico: [],
  };
  const cRevMenos = {
    cardId: "rev-menos", estado: "revisao",
    proximaRevisao: 4, flagRevisar: false, habilidade: 4, historico: [],
  };
  const cNovo = {
    cardId: "novo", estado: "novo",
    proximaRevisao: 0, flagRevisar: false, habilidade: 5, historico: [],
  };
  const cFuturo = {
    cardId: "futuro", estado: "revisao",
    proximaRevisao: 10, flagRevisar: false, habilidade: 6, historico: [],
  };

  const todos = [cReapFlag, cReap, cRevAtrasado, cRevMenos, cNovo, cFuturo];
  const fila = construirFila(todos, hoje, config, { rng });

  test("fila tem 5 itens (cFuturo excluído — não vencido)", () => {
    expect(fila).toHaveLength(5);
  });

  test("posição 0: reaprendendo com flagRevisar=true", () => {
    expect(fila[0].cardId).toBe("reap-flag");
  });

  test("posição 1: reaprendendo sem flag", () => {
    expect(fila[1].cardId).toBe("reap");
  });

  test("posição 2: revisao mais atrasado (proximaRevisao=1)", () => {
    expect(fila[2].cardId).toBe("rev-atrasado");
  });

  test("posição 3: revisao menos atrasado (proximaRevisao=4)", () => {
    expect(fila[3].cardId).toBe("rev-menos");
  });

  test("posição 4: card novo", () => {
    expect(fila[4].cardId).toBe("novo");
  });

  test("novasPorDia limita novos na fila", () => {
    const novos = Array.from({ length: 25 }, (_, i) => ({
      cardId: `n${i}`, estado: "novo",
      proximaRevisao: 0, flagRevisar: false, habilidade: 1, historico: [],
    }));
    const f = construirFila(novos, hoje, config, { rng });
    expect(f).toHaveLength(config.novasPorDia);
  });

  test("itens não empatados preservam ordem com qualquer rng", () => {
    // rng=0 forçaria swap máximo num embaralhamento global; com tiebreak, ordem entre grupos distintos é mantida
    const rngZero = () => 0;
    const f = construirFila(todos, hoje, config, { rng: rngZero });
    const idxAtrasado = f.findIndex((c) => c.cardId === "rev-atrasado");
    const idxMenos    = f.findIndex((c) => c.cardId === "rev-menos");
    expect(idxAtrasado).toBeLessThan(idxMenos);
  });

  test("itens empatados podem trocar de posição com rng favorável", () => {
    // Dois cards com mesma chave (mesmo proximaRevisao, mesma habilidade sem histórico → forca=0.5)
    const cA = { cardId: "a", estado: "revisao", proximaRevisao: 2, flagRevisar: false, habilidade: 7, historico: [] };
    const cB = { cardId: "b", estado: "revisao", proximaRevisao: 2, flagRevisar: false, habilidade: 7, historico: [] };
    // rng=0 → Fisher-Yates i=1: j=floor(0*2)=0, swap → [cB, cA]
    const rng0 = () => 0;
    const f = construirFila([cA, cB], hoje, config, { rng: rng0 });
    expect(f[0].cardId).toBe("b");
    expect(f[1].cardId).toBe("a");
  });
});

// ============================================================================
// forcaHabilidade (§7.7) — usa e.notaRec
// ============================================================================

describe("forcaHabilidade", () => {
  test("< 5 tentativas → null (incerta)", () => {
    const cards = [{ habilidade: 5, historico: [{ data: 1, notaRec: BOM }] }];
    expect(forcaHabilidade(cards, 5)).toBeNull();
  });

  test("habilidade sem cards → null", () => {
    expect(forcaHabilidade([], 5)).toBeNull();
  });

  test("3 acertos + 1 ERREI + 1 ERRO_CONFIANTE: num=3, den=6 → 0.5", () => {
    const historico = [
      { data: 1, notaRec: BOM },
      { data: 2, notaRec: BOM },
      { data: 3, notaRec: DIFICIL },
      { data: 4, notaRec: ERREI },
      { data: 5, notaRec: ERRO_CONFIANTE },
    ];
    const cards = [{ habilidade: 5, historico }];
    expect(forcaHabilidade(cards, 5)).toBeCloseTo(0.5);
  });

  test("5 FACIL (notaRec) → forca=1.0", () => {
    const historico = Array.from({ length: 5 }, (_, i) => ({ data: i, notaRec: FACIL }));
    const cards = [{ habilidade: 5, historico }];
    expect(forcaHabilidade(cards, 5)).toBeCloseTo(1.0);
  });

  test("5 ERRO_CONFIANTE (notaRec) → numerador=0, denominador=10 → 0.0", () => {
    const historico = Array.from({ length: 5 }, (_, i) => ({ data: i, notaRec: ERRO_CONFIANTE }));
    const cards = [{ habilidade: 5, historico }];
    expect(forcaHabilidade(cards, 5)).toBeCloseTo(0.0);
  });

  test("notaRec=FACIL conta como acerto mesmo quando notaFinal=ERREI", () => {
    // recAcerto=true, recConfianca=CERTEZA, resAcerto=false → notaRec=FACIL, notaFinal=ERREI
    const historico = Array.from({ length: 5 }, (_, i) => ({
      data: i, notaRec: FACIL, notaFinal: ERREI,
    }));
    const cards = [{ habilidade: 5, historico }];
    expect(forcaHabilidade(cards, 5)).toBeCloseTo(1.0);
  });
});

// ============================================================================
// dominio (§7.7) — taxa de acerto recente usa e.notaRec
// ============================================================================

describe("dominio", () => {
  test("sem cards para a habilidade → 0", () => {
    expect(dominio([], 5)).toBe(0);
  });

  test("5 acertos recentes (notaRec), nenhum maduro: 0.6×1.0 + 0.4×0 = 0.6", () => {
    const historico = Array.from({ length: 5 }, (_, i) => ({ data: i, notaRec: FACIL }));
    const cards = [{ habilidade: 5, estado: "revisao", intervalo: 3, historico }];
    expect(dominio(cards, 5)).toBeCloseTo(0.6);
  });

  test("1 card maduro (revisao, intervalo>=7), sem historico: 0.6×0.5 + 0.4×1 = 0.7", () => {
    const cards = [{ habilidade: 5, estado: "revisao", intervalo: 7, historico: [] }];
    expect(dominio(cards, 5)).toBeCloseTo(0.7);
  });

  test("intervalo=6 não é maduro: apenas taxa de acerto conta", () => {
    const historico = Array.from({ length: 5 }, (_, i) => ({ data: i, notaRec: FACIL }));
    const cards = [{ habilidade: 5, estado: "revisao", intervalo: 6, historico }];
    // maduro=0/1=0; taxa=1.0 → 0.6*1 + 0.4*0 = 0.6
    expect(dominio(cards, 5)).toBeCloseTo(0.6);
  });

  test("notaRec=FACIL conta como acerto em dominio mesmo com notaFinal=ERREI", () => {
    const historico = Array.from({ length: 5 }, (_, i) => ({
      data: i, notaRec: FACIL, notaFinal: ERREI,
    }));
    const cards = [{ habilidade: 5, estado: "revisao", intervalo: 3, historico }];
    expect(dominio(cards, 5)).toBeCloseTo(0.6);
  });
});
