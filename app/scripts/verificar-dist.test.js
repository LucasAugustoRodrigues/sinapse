import { describe, test, expect } from "vitest";
import { problemasNoDist } from "./verificar-dist.mjs";

// ============================================================================
// Fixtures
// ============================================================================

const enc = new TextEncoder();

function snp1() {
  // 4 bytes "SNP1" seguidos de zeros (simula banco.enc mínimo válido)
  const b = new Uint8Array(64);
  b.set(enc.encode("SNP1"), 0);
  return b;
}

/** Dist "bom": todas as regras satisfeitas. */
function distBom() {
  return [
    { caminho: "index.html",           conteudo: enc.encode("<!DOCTYPE html><html></html>") },
    { caminho: "assets/index-x.js",    conteudo: enc.encode("console.log('ok')") },
    { caminho: "habilidades.json",     conteudo: enc.encode('{"competencias":[]}') },
    { caminho: "icons/icon-192.png",   conteudo: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) },
    { caminho: "banco.enc",            conteudo: snp1() },
    { caminho: "sw.js",                conteudo: enc.encode('self.addEventListener("install",()=>{});// banco.enc') },
  ];
}

// ============================================================================
// Dist bom → nenhum problema
// ============================================================================

describe("dist bom", () => {
  test("dist bom → []", () => {
    expect(problemasNoDist(distBom())).toEqual([]);
  });
});

// ============================================================================
// Regra a) — questoes.json
// ============================================================================

describe("regra a: questoes.json", () => {
  test("questoes.json na raiz dispara problema", () => {
    const arquivos = [
      ...distBom(),
      { caminho: "questoes.json", conteudo: enc.encode("[]") },
    ];
    const p = problemasNoDist(arquivos);
    expect(p.some(m => m.includes("questoes.json"))).toBe(true);
  });

  test("questoes.json em subpasta dispara problema", () => {
    const arquivos = [
      ...distBom(),
      { caminho: "assets/questoes.json", conteudo: enc.encode("[]") },
    ];
    const p = problemasNoDist(arquivos);
    expect(p.some(m => m.includes("questoes.json"))).toBe(true);
  });
});

// ============================================================================
// Regra b) — pasta imagens/
// ============================================================================

describe("regra b: pasta imagens/", () => {
  test("arquivo dentro de imagens/ dispara problema", () => {
    const arquivos = [
      ...distBom(),
      { caminho: "imagens/foto.png", conteudo: new Uint8Array([1, 2, 3]) },
    ];
    const p = problemasNoDist(arquivos);
    expect(p.some(m => m.includes("imagens/"))).toBe(true);
  });

  test("arquivo em subpasta/imagens/ também dispara problema", () => {
    const arquivos = [
      ...distBom(),
      { caminho: "assets/imagens/foto.png", conteudo: new Uint8Array([1]) },
    ];
    const p = problemasNoDist(arquivos);
    expect(p.some(m => m.includes("imagens/"))).toBe(true);
  });
});

// ============================================================================
// Regra c) — imagem fora de icons/
// ============================================================================

describe("regra c: imagem fora de icons/", () => {
  test(".png em assets/ dispara problema", () => {
    const arquivos = [
      ...distBom(),
      { caminho: "assets/grafico.png", conteudo: new Uint8Array([0xff]) },
    ];
    const p = problemasNoDist(arquivos);
    expect(p.some(m => m.includes("imagem fora de icons/"))).toBe(true);
  });

  test(".png em icons/ NÃO dispara regra c", () => {
    const p = problemasNoDist(distBom()); // icons/icon-192.png já está no dist bom
    expect(p.some(m => m.includes("imagem fora de icons/"))).toBe(false);
  });
});

// ============================================================================
// Regra d) — banco.enc ausente ou mágica errada
// ============================================================================

describe("regra d: banco.enc", () => {
  test("banco.enc ausente dispara problema", () => {
    const arquivos = distBom().filter(a => a.caminho !== "banco.enc");
    const p = problemasNoDist(arquivos);
    expect(p.some(m => m.includes("banco.enc"))).toBe(true);
  });

  test("banco.enc com mágica errada dispara problema", () => {
    const conteudo = new Uint8Array(64);
    conteudo.set(enc.encode("XXXX"), 0);
    const arquivos = [
      ...distBom().filter(a => a.caminho !== "banco.enc"),
      { caminho: "banco.enc", conteudo },
    ];
    const p = problemasNoDist(arquivos);
    expect(p.some(m => m.includes("banco.enc"))).toBe(true);
  });
});

// ============================================================================
// Regra e) — banco em claro em arquivo de texto
// ============================================================================

describe("regra e: banco em claro em texto", () => {
  test(".js contendo \"enunciado\" dispara problema", () => {
    const arquivos = [
      ...distBom(),
      { caminho: "assets/leak.js", conteudo: enc.encode('const x = {"enunciado":"texto"}') },
    ];
    const p = problemasNoDist(arquivos);
    expect(p.some(m => m.includes("banco em claro dentro de"))).toBe(true);
  });

  test(".js contendo \"alternativas\" dispara problema", () => {
    const arquivos = [
      ...distBom(),
      { caminho: "assets/leak2.js", conteudo: enc.encode('{"alternativas":["a","b","c","d","e"]}') },
    ];
    const p = problemasNoDist(arquivos);
    expect(p.some(m => m.includes("banco em claro dentro de"))).toBe(true);
  });
});

// ============================================================================
// Regra f) — sw.js ausente ou sem "banco.enc"
// ============================================================================

describe("regra f: sw.js e precache", () => {
  test("sw.js ausente dispara problema", () => {
    const arquivos = distBom().filter(a => a.caminho !== "sw.js");
    const p = problemasNoDist(arquivos);
    expect(p.some(m => m.includes("banco.enc fora do precache"))).toBe(true);
  });

  test("sw.js sem referência a banco.enc dispara problema", () => {
    const arquivos = [
      ...distBom().filter(a => a.caminho !== "sw.js"),
      { caminho: "sw.js", conteudo: enc.encode("self.addEventListener('install',()=>{})") },
    ];
    const p = problemasNoDist(arquivos);
    expect(p.some(m => m.includes("banco.enc fora do precache"))).toBe(true);
  });
});
