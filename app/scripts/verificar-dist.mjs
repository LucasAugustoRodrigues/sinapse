/**
 * verificar-dist.mjs — garante que o dist/ não contém dados em claro do SAS
 * e que o banco.enc está no precache do service worker.
 * Rodado como postbuild pelo npm.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP  = join(__dirname, "..");
const DIST = join(APP, "dist");

const MAGICA_SNP1 = "SNP1";

const EXT_TEXTO = new Set([
  ".js", ".mjs", ".html", ".css", ".json", ".webmanifest", ".svg", ".txt", ".map",
]);

/**
 * Verifica se um dist/ representado como lista de arquivos tem problemas de segurança.
 *
 * @param {Array<{ caminho: string, conteudo: Uint8Array }>} arquivos
 *   caminho RELATIVO ao dist/ com "/" (ex.: "assets/index-abc.js", "banco.enc")
 * @returns {string[]} mensagens de problema em português (vazio = tudo certo)
 */
export function problemasNoDist(arquivos) {
  const problemas = [];
  const decoder = new TextDecoder("utf-8");

  let bancoPresenteEValido = false;
  let swPresenteComBanco   = false;

  for (const { caminho, conteudo } of arquivos) {
    const partes = caminho.split("/");
    const nome   = partes[partes.length - 1];
    const ext    = nome.includes(".") ? "." + nome.split(".").pop().toLowerCase() : "";

    // a) questoes.json em qualquer lugar
    if (nome === "questoes.json") {
      problemas.push(`banco em claro: questoes.json encontrado em "${caminho}"`);
    }

    // b) qualquer arquivo dentro de pasta "imagens"
    if (partes.some((p, i) => i < partes.length - 1 && p === "imagens")) {
      problemas.push(`banco em claro: imagem da pasta imagens/ em "${caminho}"`);
    }

    // c) .png/.jpg/.jpeg/.gif/.webp fora de icons/
    const EXT_IMAGEM = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
    if (EXT_IMAGEM.has(ext) && partes[0] !== "icons") {
      problemas.push(`imagem fora de icons/: "${caminho}"`);
    }

    // d) banco.enc — verifica presença e mágica
    if (caminho === "banco.enc") {
      const magica = decoder.decode(conteudo.slice(0, 4));
      if (magica === MAGICA_SNP1) {
        bancoPresenteEValido = true;
      } else {
        problemas.push(`banco.enc com mágica inválida (esperado "${MAGICA_SNP1}")`);
      }
    }

    // e) arquivo de texto contendo chaves do banco em claro
    if (EXT_TEXTO.has(ext)) {
      const texto = decoder.decode(conteudo);
      if (texto.includes('"enunciado"') || texto.includes('"alternativas"')) {
        problemas.push(`banco em claro dentro de "${caminho}"`);
      }
    }

    // f) sw.js — verifica presença e referência ao banco.enc
    if (caminho === "sw.js") {
      const texto = decoder.decode(conteudo);
      if (texto.includes("banco.enc")) {
        swPresenteComBanco = true;
      }
    }
  }

  // d) banco.enc ausente (nenhum arquivo correspondente foi encontrado válido)
  if (!bancoPresenteEValido && !problemas.some(p => p.startsWith("banco.enc com mágica"))) {
    problemas.push("banco.enc ausente no dist/");
  }

  // f) sw.js ausente ou sem referência ao banco.enc
  if (!swPresenteComBanco) {
    problemas.push("banco.enc fora do precache (sw.js ausente ou não referencia banco.enc)");
  }

  return problemas;
}

function lerDistRecursivo(base, rel, lista) {
  for (const entry of readdirSync(join(base, rel))) {
    const relEntry = rel ? `${rel}/${entry}` : entry;
    const absEntry = join(base, relEntry);
    if (statSync(absEntry).isDirectory()) {
      lerDistRecursivo(base, relEntry, lista);
    } else {
      lista.push({
        caminho: relEntry.replace(/\\/g, "/"),
        conteudo: new Uint8Array(readFileSync(absEntry)),
      });
    }
  }
}

async function main() {
  if (!existsSync(DIST)) {
    console.error("[verificar-dist] erro: pasta dist/ não encontrada. Rode npm run build primeiro.");
    process.exit(1);
  }

  const arquivos = [];
  lerDistRecursivo(DIST, "", arquivos);

  const problemas = problemasNoDist(arquivos);

  if (problemas.length > 0) {
    console.error("[verificar-dist] BUILD BLOQUEADO:");
    for (const p of problemas) console.error(`  - ${p}`);
    process.exit(1);
  }

  console.log(`[verificar-dist] OK: ${arquivos.length} arquivos, nada do SAS em claro, banco.enc no precache.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
