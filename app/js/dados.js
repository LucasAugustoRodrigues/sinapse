// dados.js — CAMADA DE DADOS (padrão Repository).
// A ÚNICA peça que fala com o armazenamento (fetch + IndexedDB).
// v2: troca-se SÓ este arquivo por chamadas a API; o resto do app não muda.

import {
  lerCabecalho,
  derivarChave,
  decifrarPacote,
  desempacotarConteudo,
  _paraHex,
} from "./cripto.js";

export { ErroSenha } from "./cripto.js";

// ============================================================================
// Lógica pura — exportada para ser testável sem fetch
// ============================================================================

export function _indexarPorId(lista) {
  const idx = new Map();
  for (const q of lista) idx.set(q.id, q);
  return idx;
}

export function _filtrarPorHabilidade(lista, numeroHabilidade) {
  return lista.filter((q) => q.habilidade === numeroHabilidade);
}

export function _filtrarPorCompetencia(lista, numeroCompetencia) {
  return lista.filter((q) => q.competencia === numeroCompetencia);
}

/** Localiza uma habilidade dentro da estrutura da Matriz e devolve seu contexto. */
export function _acharHabilidade(matriz, numeroHabilidade) {
  for (const comp of matriz.competencias ?? []) {
    for (const hab of comp.habilidades ?? []) {
      if (hab.numero === numeroHabilidade) {
        return {
          numero: hab.numero,
          descricao: hab.descricao,
          competencia: { numero: comp.numero, nome: comp.nome },
        };
      }
    }
  }
  return null;
}

// ============================================================================
// IndexedDB — constantes e wrapper interno
// ============================================================================

const DB_NOME   = "sinapse";
const DB_VERSAO = 2;
const STORE       = "progresso";
const STORE_CHAVE = "chave";

function _abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOME, DB_VERSAO);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
      if (!db.objectStoreNames.contains(STORE_CHAVE)) {
        db.createObjectStore(STORE_CHAVE);
      }
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

function _requisicao(db, modo, fn, store = STORE) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, modo);
    const objectStore = tx.objectStore(store);
    const req = fn(objectStore);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ============================================================================
// Estado em memória do banco desbloqueado (nunca persistido em claro)
// ============================================================================

let _conteudo = null; // { questoes, urls: Map<caminho, string> }
let _matriz   = null;

// ============================================================================
// Funções privadas de desbloqueio
// ============================================================================

function _tipoMime(caminho) {
  const ext = caminho.split(".").pop().toLowerCase();
  const tipos = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" };
  return tipos[ext] ?? "application/octet-stream";
}

async function _baixarPacote() {
  const res = await fetch("/banco.enc");
  if (!res.ok) throw new Error("Não foi possível carregar o banco (HTTP " + res.status + ").");
  return new Uint8Array(await res.arrayBuffer());
}

async function _abrir(chave, pacote) {
  const conteudo = desempacotarConteudo(await decifrarPacote(chave, pacote));
  const urls = new Map();
  for (const [caminho, bytes] of conteudo.imagens) {
    urls.set(caminho, URL.createObjectURL(new Blob([bytes], { type: _tipoMime(caminho) })));
  }
  // Revoga URLs da sessão anterior antes de substituir
  if (_conteudo) {
    for (const url of _conteudo.urls.values()) URL.revokeObjectURL(url);
  }
  _conteudo = { questoes: conteudo.questoes, urls, perfil: conteudo.perfil };
}

// ============================================================================
// API de desbloqueio — pública
// ============================================================================

export async function desbloquear(senha) {
  const pacote = await _baixarPacote();
  const cab    = lerCabecalho(pacote);
  const chave  = await derivarChave(senha, cab.sal, cab.iteracoes);
  await _abrir(chave, pacote); // ErroSenha propaga; nada é gravado em caso de falha
  const db = await _abrirDB();
  await _requisicao(db, "readwrite", (s) => s.put(
    { chave, sal: _paraHex(cab.sal), iteracoes: cab.iteracoes },
    "banco"
  ), STORE_CHAVE);
}

export async function tentarChaveSalva() {
  const db      = await _abrirDB();
  const registro = await _requisicao(db, "readonly", (s) => s.get("banco"), STORE_CHAVE);
  if (!registro) return false;

  const pacote = await _baixarPacote();
  const cab    = lerCabecalho(pacote);

  if (registro.sal !== _paraHex(cab.sal) || registro.iteracoes !== cab.iteracoes) {
    const db2 = await _abrirDB();
    await _requisicao(db2, "readwrite", (s) => s.delete("banco"), STORE_CHAVE);
    return false;
  }

  try {
    await _abrir(registro.chave, pacote);
    return true;
  } catch (e) {
    if (e.name === "ErroSenha") {
      const db2 = await _abrirDB();
      await _requisicao(db2, "readwrite", (s) => s.delete("banco"), STORE_CHAVE);
      return false;
    }
    throw e;
  }
}

export function estaDesbloqueado() {
  return _conteudo !== null;
}

export function nomeDoPerfil() {
  return String(_conteudo?.perfil?.nome ?? '').trim();
}

export function urlImagem(caminho) {
  return _conteudo?.urls.get(caminho) ?? null;
}

export async function esquecerAparelho() {
  const db = await _abrirDB();
  await _requisicao(db, "readwrite", (s) => s.delete("banco"), STORE_CHAVE);
  if (_conteudo) {
    for (const url of _conteudo.urls.values()) URL.revokeObjectURL(url);
  }
  _conteudo = null;
}

export async function pedirArmazenamentoPersistente() {
  if (!navigator?.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export function _redefinirParaTestes() {
  if (_conteudo) {
    for (const url of _conteudo.urls.values()) URL.revokeObjectURL(url);
  }
  _conteudo = null;
}

// ============================================================================
// API de questões
// ============================================================================

export async function carregarQuestoes() {
  if (!_conteudo) throw new Error("Banco bloqueado: chame desbloquear() ou tentarChaveSalva() antes.");
  return _conteudo.questoes;
}

export async function carregarMatriz() {
  if (!_matriz) {
    const res = await fetch("/habilidades.json");
    _matriz = await res.json();
  }
  return _matriz;
}

export async function questaoPorId(id) {
  const lista = await carregarQuestoes();
  return _indexarPorId(lista).get(id) ?? null;
}

export async function listarPorHabilidade(numeroHabilidade) {
  const lista = await carregarQuestoes();
  return _filtrarPorHabilidade(lista, numeroHabilidade);
}

export async function listarPorCompetencia(numeroCompetencia) {
  const lista = await carregarQuestoes();
  return _filtrarPorCompetencia(lista, numeroCompetencia);
}

export async function descreverHabilidade(numeroHabilidade) {
  const matriz = await carregarMatriz();
  return _acharHabilidade(matriz, numeroHabilidade);
}

// ============================================================================
// API de progresso — o objeto de estado é OPACO para dados.js
// (quem define a forma é o srs.js)
// ============================================================================

export async function lerProgresso(id) {
  const db = await _abrirDB();
  const val = await _requisicao(db, "readonly", (s) => s.get(id));
  return val ?? null;
}

export async function salvarProgresso(id, estado) {
  const db = await _abrirDB();
  await _requisicao(db, "readwrite", (s) => s.put(estado, id));
}

export async function lerTodoProgresso() {
  const db = await _abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const keysReq = store.getAllKeys();
    const valsReq = store.getAll();
    tx.oncomplete = () => {
      const result = {};
      for (let i = 0; i < keysReq.result.length; i++) {
        result[keysReq.result[i]] = valsReq.result[i];
      }
      resolve(result);
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function limparProgresso() {
  const db = await _abrirDB();
  await _requisicao(db, "readwrite", (s) => s.clear());
}
