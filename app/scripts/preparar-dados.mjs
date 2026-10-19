/**
 * preparar-dados.mjs — cifra o banco de questões e grava public/banco.enc.
 * Requer a variável de ambiente SINAPSE_SENHA.
 * Rodado como predev/prebuild pelo npm.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  novoSal,
  derivarChave,
  cifrarPacote,
  empacotarConteudo,
  normalizarSenha,
  _paraHex,
  _deHex,
  ITERACOES_PADRAO,
} from "../js/cripto.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP       = join(__dirname, "..");
const RAIZ      = join(APP, "..");
const PUBLIC    = join(APP, "public");
const PROCESSED = join(RAIZ, "data", "processed");
const SAL       = join(APP, ".sal-banco");

/**
 * Retorna os caminhos de imagens referenciados pelas questões que não estão no Map,
 * ordenados e sem repetição.
 *
 * @param {object[]} questoes
 * @param {Map<string, Uint8Array>} imagens
 * @returns {string[]}
 */
export function imagensFaltantes(questoes, imagens) {
  const faltantes = new Set();
  for (const q of questoes) {
    if (Array.isArray(q.imagens)) {
      for (const caminho of q.imagens) {
        if (!imagens.has(caminho)) {
          faltantes.add(caminho);
        }
      }
    }
  }
  return [...faltantes].sort();
}

async function main() {
  mkdirSync(PUBLIC, { recursive: true });

  // a) Copia habilidades (avisa e segue se faltar)
  const srcMatriz = join(RAIZ, "data", "matriz", "habilidades_enem.json");
  if (existsSync(srcMatriz)) {
    writeFileSync(join(PUBLIC, "habilidades.json"), readFileSync(srcMatriz));
  } else {
    console.warn("[preparar-dados] aviso: habilidades_enem.json não encontrado em data/matriz/ — pulando.");
  }

  // b) Remove arquivos em claro do public/
  const questoesPublic = join(PUBLIC, "questoes.json");
  const imagensPublic  = join(PUBLIC, "imagens");
  if (existsSync(questoesPublic)) {
    rmSync(questoesPublic, { force: true });
    console.log("[preparar-dados] removido do public/: questoes.json");
  }
  if (existsSync(imagensPublic)) {
    rmSync(imagensPublic, { recursive: true, force: true });
    console.log("[preparar-dados] removido do public/: imagens/");
  }

  // c) Sem dados processados → avisa e termina normalmente
  const srcJson = join(PROCESSED, "questoes.json");
  if (!existsSync(srcJson)) {
    console.warn("[preparar-dados] aviso: sem dados do SAS em data/processed/ — banco.enc não gerado.");
    process.exit(0);
  }

  // d) Senha obrigatória via variável de ambiente
  const senhaRaw = process.env.SINAPSE_SENHA;
  if (!senhaRaw || normalizarSenha(senhaRaw) === '') {
    console.error(
      "[preparar-dados] erro: variável SINAPSE_SENHA não definida ou vazia.\n" +
      "No PowerShell (mascarado, não fica no histórico):\n" +
      "  $env:SINAPSE_SENHA = [System.Net.NetworkCredential]::new('', (Read-Host 'Senha do Sinapse' -AsSecureString)).Password"
    );
    process.exit(1);
  }
  const senha = normalizarSenha(senhaRaw);

  // e) Sal: reutiliza se existir, gera novo caso contrário
  let sal;
  if (existsSync(SAL)) {
    const salHex = readFileSync(SAL, "utf-8").trim();
    if (!/^[0-9a-f]{32}$/.test(salHex)) {
      console.error(
        "[preparar-dados] erro: arquivo .sal-banco tem conteúdo inválido " +
        "(esperado 32 caracteres hex minúsculos)."
      );
      process.exit(1);
    }
    sal = _deHex(salHex);
  } else {
    sal = novoSal();
    writeFileSync(SAL, _paraHex(sal) + "\n", "utf-8");
    console.warn(
      "[preparar-dados] sal NOVO gerado em app/.sal-banco — aparelhos já desbloqueados vão pedir a senha de novo."
    );
  }

  // f) Lê questões e monta Map de imagens
  const questoes = JSON.parse(readFileSync(srcJson, "utf-8"));
  const imagens  = new Map();
  const srcImagens = join(PROCESSED, "imagens");
  if (existsSync(srcImagens)) {
    for (const nome of readdirSync(srcImagens)) {
      imagens.set(`imagens/${nome}`, new Uint8Array(readFileSync(join(srcImagens, nome))));
    }
  }

  // g) Imagens referenciadas mas ausentes → erro
  const faltantes = imagensFaltantes(questoes, imagens);
  if (faltantes.length > 0) {
    console.error(
      "[preparar-dados] erro: imagens referenciadas mas não encontradas em data/processed/imagens/:"
    );
    for (const f of faltantes) console.error(`  - ${f}`);
    process.exit(1);
  }

  // h) Cifra e grava
  const t0     = Date.now();
  const chave  = await derivarChave(senha, sal, ITERACOES_PADRAO, ["encrypt"]);
  const pacote = await cifrarPacote(
    chave,
    empacotarConteudo({ questoes, imagens }),
    { sal, iteracoes: ITERACOES_PADRAO }
  );
  writeFileSync(join(PUBLIC, "banco.enc"), pacote);

  // i) Resumo
  const duracao = (Date.now() - t0) / 1000;
  const mb      = pacote.byteLength / 1024 / 1024;
  console.log(
    `[preparar-dados] banco.enc gerado: ${questoes.length} questões, ${imagens.size} imagens, ` +
    `${mb.toFixed(1).replace(".", ",")} MB em ${duracao.toFixed(1).replace(".", ",")} s.`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
