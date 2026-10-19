import "fake-indexeddb/auto";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  desbloquear,
  tentarChaveSalva,
  estaDesbloqueado,
  urlImagem,
  esquecerAparelho,
  pedirArmazenamentoPersistente,
  _redefinirParaTestes,
  ErroSenha,
  lerProgresso,
} from "./dados.js";
import {
  novoSal,
  empacotarConteudo,
  cifrarPacote,
  derivarChave,
} from "./cripto.js";

// ============================================================================
// Fixtures
// ============================================================================

const ITER = 1000;

const QUESTOES_FIXTURE = [
  { id: "Q1", imagens: ["imagens/a.png"] },
  { id: "Q2" },
];
const IMAGEM_A = new Uint8Array([137, 80, 78, 71]);

function imagensFixture() {
  return new Map([["imagens/a.png", IMAGEM_A]]);
}

async function pacoteCom(senha, sal) {
  const chave = await derivarChave(senha, sal, ITER, ["encrypt"]);
  const conteudo = empacotarConteudo({ questoes: QUESTOES_FIXTURE, imagens: imagensFixture() });
  return cifrarPacote(chave, conteudo, { sal, iteracoes: ITER });
}

function servir(pacote) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(pacote)));
}

// ============================================================================
// Teste 1 — upgrade v1→v2 (describe próprio, sem beforeEach geral)
// ============================================================================

describe("upgrade v1→v2", () => {
  test("preserva dados do progresso ao subir de v1 para v2 e permite desbloquear", async () => {
    // Abre o DB em v1, cria só o store "progresso" e grava um registro.
    await new Promise((resolve, reject) => {
      const req = indexedDB.open("sinapse", 1);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore("progresso");
      };
      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction("progresso", "readwrite");
        tx.objectStore("progresso").put({ ease: 2.5 }, "Q9");
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror   = () => reject(tx.error);
      };
      req.onerror = (e) => reject(e.target.error);
    });

    // dados.js abre em v2: deve criar "chave" e preservar "progresso".
    expect(await lerProgresso("Q9")).toEqual({ ease: 2.5 });

    // desbloquear também deve funcionar após o upgrade.
    const sal    = novoSal();
    const pacote = await pacoteCom("senha-upgrade", sal);
    servir(pacote);
    await desbloquear("senha-upgrade");
    expect(estaDesbloqueado()).toBe(true);
    vi.unstubAllGlobals();
    _redefinirParaTestes();
  });
});

// ============================================================================
// Testes 2–11
// ============================================================================

describe("desbloqueio", () => {
  beforeEach(async () => {
    _redefinirParaTestes();
    await esquecerAparelho();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // 2. Estado inicial bloqueado
  test("bloqueado: estaDesbloqueado false, carregarQuestoes rejeita, urlImagem null", async () => {
    const { carregarQuestoes } = await import("./dados.js");
    expect(estaDesbloqueado()).toBe(false);
    await expect(carregarQuestoes()).rejects.toThrow("Banco bloqueado");
    expect(urlImagem("imagens/a.png")).toBeNull();
  });

  // 3. Senha certa
  test("senha certa: desbloquear, questoes, blob URL", async () => {
    const { carregarQuestoes } = await import("./dados.js");
    const sal = novoSal();
    servir(await pacoteCom("senha-certa", sal));

    await desbloquear("senha-certa");

    expect(estaDesbloqueado()).toBe(true);
    expect(await carregarQuestoes()).toEqual(QUESTOES_FIXTURE);
    expect(urlImagem("imagens/a.png")).toMatch(/^blob:/);
    expect(urlImagem("imagens/x.png")).toBeNull();
  });

  // 4. Senha errada: rejeita com ErroSenha, nada é gravado
  test("senha errada: ErroSenha, estaDesbloqueado false, tentarChaveSalva false", async () => {
    const sal = novoSal();
    servir(await pacoteCom("senha-certa", sal));

    await expect(desbloquear("senha-errada")).rejects.toBeInstanceOf(ErroSenha);
    expect(estaDesbloqueado()).toBe(false);

    _redefinirParaTestes();
    expect(await tentarChaveSalva()).toBe(false);
  });

  // 5. Teclado do tablet (normalização de senha)
  test("tablet: pacote cifrado com 'senha certa', desbloquear('  Senha   Certa ') funciona", async () => {
    const sal = novoSal();
    servir(await pacoteCom("senha certa", sal));

    await desbloquear("  Senha   Certa ");
    expect(estaDesbloqueado()).toBe(true);
  });

  // 6. Senha uma vez por aparelho (tentarChaveSalva após restart simulado)
  test("senha uma vez: tentarChaveSalva restaura sessão sem pedir senha", async () => {
    const { carregarQuestoes } = await import("./dados.js");
    const sal    = novoSal();
    const pacote = await pacoteCom("minha-senha", sal);
    servir(pacote);

    await desbloquear("minha-senha");
    _redefinirParaTestes(); // simula fechar e reabrir o app

    expect(await tentarChaveSalva()).toBe(true);
    expect(await carregarQuestoes()).toEqual(QUESTOES_FIXTURE);
  });

  // 7. Sal mudou: tentarChaveSalva apaga registro e retorna false (duas vezes)
  test("sal mudou: tentarChaveSalva false (e continua false)", async () => {
    const sal1 = novoSal();
    const sal2 = novoSal();
    const pacoteA = await pacoteCom("senha", sal1);
    const pacoteB = await pacoteCom("senha", sal2);

    servir(pacoteA);
    await desbloquear("senha");
    _redefinirParaTestes();

    servir(pacoteB);
    expect(await tentarChaveSalva()).toBe(false);
    expect(await tentarChaveSalva()).toBe(false); // registro foi apagado
  });

  // 8. Senha trocada com o mesmo sal
  test("senha trocada, mesmo sal: tentarChaveSalva false (e continua false)", async () => {
    const sal    = novoSal();
    const pacoteA = await pacoteCom("senha1", sal);
    const pacoteC = await pacoteCom("senha2", sal);

    servir(pacoteA);
    await desbloquear("senha1");
    _redefinirParaTestes();

    servir(pacoteC);
    expect(await tentarChaveSalva()).toBe(false);
    expect(await tentarChaveSalva()).toBe(false); // registro foi apagado
  });

  // 9. esquecerAparelho limpa tudo
  test("esquecerAparelho: estaDesbloqueado false, tentarChaveSalva false", async () => {
    const sal = novoSal();
    servir(await pacoteCom("senha", sal));

    await desbloquear("senha");
    await esquecerAparelho();

    expect(estaDesbloqueado()).toBe(false);
    expect(await tentarChaveSalva()).toBe(false);
  });

  // 10. Falha de rede: erro não é ErroSenha mas menciona "banco"
  test("falha de rede: rejeita com erro (não ErroSenha) com mensagem 'banco'", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { status: 404 })));

    await expect(desbloquear("qualquer")).rejects.toSatisfy((e) =>
      e.name !== "ErroSenha" && e.message.toLowerCase().includes("banco")
    );
  });

  // 11. pedirArmazenamentoPersistente no Node (sem navigator.storage)
  test("pedirArmazenamentoPersistente no Node retorna false", async () => {
    expect(await pedirArmazenamentoPersistente()).toBe(false);
  });
});
