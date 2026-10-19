import { describe, test, expect } from "vitest";
import {
  ITERACOES_PADRAO,
  MAGICA,
  ErroSenha,
  ErroPacote,
  _paraHex,
  _deHex,
  novoSal,
  derivarChave,
  empacotarConteudo,
  desempacotarConteudo,
  cifrarPacote,
  lerCabecalho,
  decifrarPacote,
} from "./cripto.js";

// ============================================================================
// Fixtures reutilizáveis
// ============================================================================

const ITER = 1000; // Iterações baixas para os testes serem rápidos.

const QUESTOES_FIXTURE = [
  { id: "Q1", enunciado: "ação, você", alternativas: ["a", "b", "c", "d", "e"] },
  { id: "Q2", enunciado: "Texto simples", alternativas: ["a", "b", "c", "d", "e"] },
];

const IMAGEM_A = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x01, 0x02]);
const IMAGEM_B = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x03, 0x04, 0x05]);

function imagensFixture() {
  return new Map([
    ["img/b.png", IMAGEM_B],
    ["img/a.png", IMAGEM_A],
  ]);
}

async function chaveFixture(senha = "senha-secreta", sal = novoSal(), usos = ["encrypt", "decrypt"]) {
  return { chave: await derivarChave(senha, sal, ITER, usos), sal };
}

// ============================================================================
// 1. Ida e volta completa
// ============================================================================

describe("ida e volta completa", () => {
  test("empacotar → cifrar → decifrar → desempacotar preserva questoes e imagens", async () => {
    const sal = novoSal();
    const chave = await derivarChave("senha-secreta", sal, ITER, ["encrypt", "decrypt"]);

    const conteudo = empacotarConteudo({ questoes: QUESTOES_FIXTURE, imagens: imagensFixture() });
    const pacote = await cifrarPacote(chave, conteudo, { sal, iteracoes: ITER });
    const claro = await decifrarPacote(chave, pacote);
    const resultado = desempacotarConteudo(claro);

    expect(resultado.questoes).toEqual(QUESTOES_FIXTURE);
    expect(resultado.imagens.size).toBe(2);
    expect(resultado.imagens.get("img/a.png")).toEqual(IMAGEM_A);
    expect(resultado.imagens.get("img/b.png")).toEqual(IMAGEM_B);
  });
});

// ============================================================================
// 2. Map de imagens vazio
// ============================================================================

describe("imagens vazias", () => {
  test("Map de imagens vazio faz ida e volta", async () => {
    const sal = novoSal();
    const chave = await derivarChave("senha", sal, ITER, ["encrypt", "decrypt"]);

    const conteudo = empacotarConteudo({ questoes: [{ id: "Q1" }], imagens: new Map() });
    const pacote = await cifrarPacote(chave, conteudo, { sal, iteracoes: ITER });
    const claro = await decifrarPacote(chave, pacote);
    const resultado = desempacotarConteudo(claro);

    expect(resultado.questoes).toEqual([{ id: "Q1" }]);
    expect(resultado.imagens.size).toBe(0);
  });
});

// ============================================================================
// 3. Senha errada (mesmo sal)
// ============================================================================

describe("senha errada", () => {
  test("senha errada com mesmo sal → ErroSenha", async () => {
    const sal = novoSal();
    const chaveCerta = await derivarChave("correta", sal, ITER, ["encrypt"]);
    const chaveErrada = await derivarChave("errada", sal, ITER, ["decrypt"]);

    const conteudo = empacotarConteudo({ questoes: [], imagens: new Map() });
    const pacote = await cifrarPacote(chaveCerta, conteudo, { sal, iteracoes: ITER });

    await expect(decifrarPacote(chaveErrada, pacote)).rejects.toBeInstanceOf(ErroSenha);
  });
});

// ============================================================================
// 4. Mesma senha com outro sal
// ============================================================================

describe("sal diferente", () => {
  test("mesma senha com sal diferente → ErroSenha", async () => {
    const sal1 = novoSal();
    const sal2 = novoSal();
    const chave1 = await derivarChave("senha", sal1, ITER, ["encrypt"]);
    const chave2 = await derivarChave("senha", sal2, ITER, ["decrypt"]);

    const conteudo = empacotarConteudo({ questoes: [], imagens: new Map() });
    const pacote = await cifrarPacote(chave1, conteudo, { sal: sal1, iteracoes: ITER });

    await expect(decifrarPacote(chave2, pacote)).rejects.toBeInstanceOf(ErroSenha);
  });
});

// ============================================================================
// 5. Duas derivações com mesma senha+sal → a 2ª decifra o que a 1ª cifrou
// ============================================================================

describe("derivações independentes", () => {
  test("duas derivações idênticas → compatíveis", async () => {
    const sal = novoSal();
    const chave1 = await derivarChave("senha", sal, ITER, ["encrypt"]);
    const chave2 = await derivarChave("senha", sal, ITER, ["decrypt"]);

    const conteudo = empacotarConteudo({ questoes: [{ id: "Q42" }], imagens: new Map() });
    const pacote = await cifrarPacote(chave1, conteudo, { sal, iteracoes: ITER });
    const claro = await decifrarPacote(chave2, pacote);
    const resultado = desempacotarConteudo(claro);

    expect(resultado.questoes).toEqual([{ id: "Q42" }]);
  });
});

// ============================================================================
// 6. Um byte do cifrado alterado
// ============================================================================

describe("integridade do cifrado", () => {
  test("último byte alterado → ErroSenha", async () => {
    const sal = novoSal();
    const chave = await derivarChave("senha", sal, ITER, ["encrypt", "decrypt"]);

    const conteudo = empacotarConteudo({ questoes: [], imagens: new Map() });
    const pacote = await cifrarPacote(chave, conteudo, { sal, iteracoes: ITER });

    const corrompido = pacote.slice();
    corrompido[corrompido.length - 1] ^= 0xff;

    await expect(decifrarPacote(chave, corrompido)).rejects.toBeInstanceOf(ErroSenha);
  });
});

// ============================================================================
// 7. Cabeçalho adulterado (iv trocado dentro do JSON)
// ============================================================================

describe("autenticação do cabeçalho", () => {
  test("iv adulterado no cabeçalho → ErroSenha", async () => {
    const sal = novoSal();
    const chave = await derivarChave("senha", sal, ITER, ["encrypt", "decrypt"]);

    const conteudo = empacotarConteudo({ questoes: [], imagens: new Map() });
    const pacote = await cifrarPacote(chave, conteudo, { sal, iteracoes: ITER });

    // Decodifica o cabeçalho para localizar o campo "iv" no JSON.
    const cab = lerCabecalho(pacote);
    const ivHex = _paraHex(cab.iv);

    // Troca o primeiro caractere do hex do iv por outro (mantendo JSON válido).
    const primeiroChar = ivHex[0];
    const novoChar = primeiroChar === 'f' ? '0' : 'f';
    const ivHexNovo = novoChar + ivHex.slice(1);

    // Reconstrói os bytes do cabeçalho com o iv substituído.
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const jsonOriginal = decoder.decode(pacote.slice(8, cab.tamanhoCabecalho));
    const jsonAdulterado = jsonOriginal.replace(`"iv":"${ivHex}"`, `"iv":"${ivHexNovo}"`);
    const jsonBytes = encoder.encode(jsonAdulterado);

    const cabNovo = new Uint8Array(4 + 4 + jsonBytes.byteLength);
    cabNovo.set(encoder.encode(MAGICA), 0);
    new DataView(cabNovo.buffer).setUint32(4, jsonBytes.byteLength, false);
    cabNovo.set(jsonBytes, 8);

    const pacoteAdulterado = new Uint8Array(cabNovo.byteLength + pacote.byteLength - cab.tamanhoCabecalho);
    pacoteAdulterado.set(cabNovo, 0);
    pacoteAdulterado.set(pacote.slice(cab.tamanhoCabecalho), cabNovo.byteLength);

    await expect(decifrarPacote(chave, pacoteAdulterado)).rejects.toBeInstanceOf(ErroSenha);
  });
});

// ============================================================================
// 8. Formatos inválidos → ErroPacote
// ============================================================================

describe("formatos inválidos", () => {
  test("mágica errada → ErroPacote", () => {
    const encoder = new TextEncoder();
    const magicaErrada = encoder.encode("XXXX");
    const resto = new Uint8Array(20); // bytes extras para não truncar
    const pacote = new Uint8Array(magicaErrada.byteLength + resto.byteLength);
    pacote.set(magicaErrada, 0);
    pacote.set(resto, magicaErrada.byteLength);
    expect(() => lerCabecalho(pacote)).toThrow(ErroPacote);
  });

  test("pacote truncado (6 bytes) → ErroPacote", () => {
    const pacote = new Uint8Array(6);
    expect(() => lerCabecalho(pacote)).toThrow(ErroPacote);
  });

  test("cabeçalho com v: 2 → ErroPacote", () => {
    const encoder = new TextEncoder();
    const sal = novoSal();
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const cabObj = { v: 2, kdf: "PBKDF2-SHA256", iteracoes: ITER, sal: _paraHex(sal), iv: _paraHex(iv) };
    const cabJSON = encoder.encode(JSON.stringify(cabObj));
    const pacote = new Uint8Array(4 + 4 + cabJSON.byteLength);
    pacote.set(encoder.encode(MAGICA), 0);
    new DataView(pacote.buffer).setUint32(4, cabJSON.byteLength, false);
    pacote.set(cabJSON, 8);
    expect(() => lerCabecalho(pacote)).toThrow(ErroPacote);
  });
});

// ============================================================================
// 9. Dois ciframentos → ivs diferentes e pacotes diferentes
// ============================================================================

describe("iv único por cifragem", () => {
  test("duas cifragens do mesmo conteúdo → ivs e pacotes distintos", async () => {
    const sal = novoSal();
    const chave = await derivarChave("senha", sal, ITER, ["encrypt"]);
    const conteudo = empacotarConteudo({ questoes: [], imagens: new Map() });

    const pacote1 = await cifrarPacote(chave, conteudo, { sal, iteracoes: ITER });
    const pacote2 = await cifrarPacote(chave, conteudo, { sal, iteracoes: ITER });

    const cab1 = lerCabecalho(pacote1);
    const cab2 = lerCabecalho(pacote2);

    expect(_paraHex(cab1.iv)).not.toBe(_paraHex(cab2.iv));
    expect(pacote1).not.toEqual(pacote2);
  });
});

// ============================================================================
// 10. Chave não-extraível
// ============================================================================

describe("propriedades da chave", () => {
  test("chave é não-extraível, AES-GCM 256", async () => {
    const { chave } = await chaveFixture();
    expect(chave.extractable).toBe(false);
    expect(chave.algorithm.name).toBe("AES-GCM");
    expect(chave.algorithm.length).toBe(256);
    await expect(globalThis.crypto.subtle.exportKey("raw", chave)).rejects.toBeDefined();
  });
});

// ============================================================================
// 11. Normalização NFC
// ============================================================================

describe("normalização NFC da senha", () => {
  test("senha composta e decomposta abrem o mesmo pacote", async () => {
    const senhaComposta   = "a\u00e7\u00e3o";       // "ação" pré-composta (NFC)
    const senhaDecomposta = "ac\u0327a\u0303o";     // "ação" decomposta (NFD)
    expect(senhaComposta).not.toBe(senhaDecomposta); // garante que o teste não fica vazio

    const sal = novoSal();
    const chaveEnc = await derivarChave(senhaComposta, sal, ITER, ["encrypt"]);
    const chaveDec = await derivarChave(senhaDecomposta, sal, ITER, ["decrypt"]);

    const conteudo = empacotarConteudo({ questoes: [{ id: "NFC" }], imagens: new Map() });
    const pacote = await cifrarPacote(chaveEnc, conteudo, { sal, iteracoes: ITER });
    const claro = await decifrarPacote(chaveDec, pacote);
    const resultado = desempacotarConteudo(claro);

    expect(resultado.questoes).toEqual([{ id: "NFC" }]);
  });
});

// ============================================================================
// 12. Validação de parâmetros de derivarChave
// ============================================================================

describe("validação de parâmetros", () => {
  test("senha vazia → TypeError", async () => {
    await expect(derivarChave("", novoSal(), ITER)).rejects.toBeInstanceOf(TypeError);
  });

  test("sal de 8 bytes → TypeError", async () => {
    const salCurto = new Uint8Array(8);
    await expect(derivarChave("senha", salCurto, ITER)).rejects.toBeInstanceOf(TypeError);
  });

  test("iteracoes = 0 → TypeError", async () => {
    await expect(derivarChave("senha", novoSal(), 0)).rejects.toBeInstanceOf(TypeError);
  });
});

// ============================================================================
// 13. desempacotarConteudo com offset fora dos limites
// ============================================================================

describe("desempacotarConteudo inválido", () => {
  test("imagem com offset fora dos limites → ErroPacote", () => {
    const encoder = new TextEncoder();
    // Índice aponta para uma imagem que ultrapassa a área de imagens.
    const indice = {
      questoes: [],
      imagens: {
        "img/a.png": [0, 9999], // tamanho muito grande
      },
    };
    const indiceBytes = encoder.encode(JSON.stringify(indice));
    const pacote = new Uint8Array(4 + indiceBytes.byteLength + 10); // apenas 10 bytes de "imagens"
    new DataView(pacote.buffer).setUint32(0, indiceBytes.byteLength, false);
    pacote.set(indiceBytes, 4);
    // Os 10 bytes finais são a "área de imagens" (todos zero).

    expect(() => desempacotarConteudo(pacote)).toThrow(ErroPacote);
  });
});

// ============================================================================
// 14. _paraHex / _deHex
// ============================================================================

describe("_paraHex e _deHex", () => {
  test("ida e volta: bytes → hex → bytes", () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255]);
    expect(_deHex(_paraHex(bytes))).toEqual(bytes);
  });

  test("_paraHex produz minúsculas", () => {
    const bytes = new Uint8Array([0xab, 0xcd, 0xef]);
    expect(_paraHex(bytes)).toBe("abcdef");
  });

  test("_deHex com comprimento ímpar → ErroPacote", () => {
    expect(() => _deHex("abc")).toThrow(ErroPacote);
  });

  test("_deHex com string vazia → Uint8Array vazio", () => {
    expect(_deHex("")).toEqual(new Uint8Array(0));
  });
});

// ============================================================================
// 15. ITERACOES_PADRAO e ida e volta com padrão
// ============================================================================

describe("ITERACOES_PADRAO", () => {
  test("ITERACOES_PADRAO === 600000", () => {
    expect(ITERACOES_PADRAO).toBe(600_000);
  });

  test(
    "ida e volta usando iterações padrão",
    async () => {
      const sal = novoSal();
      const chave = await derivarChave("senha-padrao", sal, ITERACOES_PADRAO, ["encrypt", "decrypt"]);
      const conteudo = empacotarConteudo({ questoes: [{ id: "PADRAO" }], imagens: new Map() });
      const pacote = await cifrarPacote(chave, conteudo, { sal, iteracoes: ITERACOES_PADRAO });
      const claro = await decifrarPacote(chave, pacote);
      const resultado = desempacotarConteudo(claro);
      expect(resultado.questoes).toEqual([{ id: "PADRAO" }]);
    },
    15_000 // timeout de 15 s para PBKDF2 com 600 mil iterações
  );
});
