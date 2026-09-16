/**
 * copiar-dados.mjs — copia questoes.json e imagens/ de data/processed/ para public/.
 * Rodado como predev/prebuild pelo npm. Sai com código 0 mesmo se a origem não existir.
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const raiz = join(__dirname, "..", "..");          // raiz do repositório
const origem = join(raiz, "data", "processed");
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

if (!existsSync(origem)) {
  console.warn(`[copiar-dados] aviso: '${origem}' não existe — pulando cópia de dados.`);
  process.exit(0);
}

mkdirSync(destPublic, { recursive: true });

const srcJson = join(origem, "questoes.json");
if (existsSync(srcJson)) {
  copiarArquivo(srcJson, join(destPublic, "questoes.json"));
  console.log("[copiar-dados] questoes.json copiado.");
} else {
  console.warn("[copiar-dados] aviso: questoes.json não encontrado em data/processed/.");
}

const srcImagens = join(origem, "imagens");
if (existsSync(srcImagens)) {
  copiarPasta(srcImagens, join(destPublic, "imagens"));
  console.log("[copiar-dados] imagens/ copiado.");
} else {
  console.warn("[copiar-dados] aviso: pasta imagens/ não encontrada em data/processed/.");
}
