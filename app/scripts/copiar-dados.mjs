/**
 * copiar-dados.mjs — copia questoes.json, imagens/ e habilidades.json para public/.
 * Rodado como predev/prebuild pelo npm. Cada fonte tem seu próprio guard de existência;
 * avisa e continua (código 0) se algum arquivo/pasta não existir.
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const raiz = join(__dirname, "..", "..");
const destPublic = join(__dirname, "..", "public");

function copiarArquivo(src, dst) {
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
}

function copiarPasta(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dst, entry);
    if (statSync(s).isDirectory()) {
      copiarPasta(s, d);
    } else {
      copiarArquivo(s, d);
    }
  }
}

mkdirSync(destPublic, { recursive: true });

// ── data/processed/ ──────────────────────────────────────────────────────────
const origemProcessed = join(raiz, "data", "processed");

if (!existsSync(origemProcessed)) {
  console.warn(`[copiar-dados] aviso: '${origemProcessed}' não existe — pulando dados processados.`);
} else {
  const srcJson = join(origemProcessed, "questoes.json");
  if (existsSync(srcJson)) {
    copiarArquivo(srcJson, join(destPublic, "questoes.json"));
    console.log("[copiar-dados] questoes.json copiado.");
  } else {
    console.warn("[copiar-dados] aviso: questoes.json não encontrado em data/processed/.");
  }

  const srcImagens = join(origemProcessed, "imagens");
  if (existsSync(srcImagens)) {
    copiarPasta(srcImagens, join(destPublic, "imagens"));
    console.log("[copiar-dados] imagens/ copiado.");
  } else {
    console.warn("[copiar-dados] aviso: pasta imagens/ não encontrada em data/processed/.");
  }
}

// ── data/matriz/ ─────────────────────────────────────────────────────────────
const srcMatriz = join(raiz, "data", "matriz", "habilidades_enem.json");
if (existsSync(srcMatriz)) {
  copiarArquivo(srcMatriz, join(destPublic, "habilidades.json"));
  console.log("[copiar-dados] habilidades.json copiado.");
} else {
  console.warn("[copiar-dados] aviso: habilidades_enem.json não encontrado em data/matriz/.");
}
