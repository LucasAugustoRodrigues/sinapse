// dados.js — CAMADA DE DADOS (padrão Repository).
// A ÚNICA peça que fala com o armazenamento (fetch + IndexedDB).
// v2: troca-se SÓ este arquivo por chamadas a API; o resto do app não muda.

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
// Cache em memória (carregado uma vez por sessão)
// ============================================================================

let _questoes = null;
let _matriz = null;

export async function carregarQuestoes() {
  if (!_questoes) {
    const res = await fetch("/questoes.json");
    _questoes = await res.json();
  }
  return _questoes;
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
// IndexedDB — wrapper interno baseado em Promise (sem biblioteca externa)
// ============================================================================

const DB_NOME = "sinapse";
const DB_VERSAO = 1;
const STORE = "progresso";

function _abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOME, DB_VERSAO);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE);
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function _requisicao(db, modo, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, modo);
    const store = tx.objectStore(STORE);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ============================================================================
// API de progresso — o objeto de estado é OPACO para dados.js
// (quem define a forma é o srs.js, na Fase 2)
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
