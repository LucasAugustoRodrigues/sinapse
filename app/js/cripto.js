// cripto.js — módulo de criptografia do banco de questões.
// Usa apenas globalThis.crypto (Web Crypto API), TextEncoder/TextDecoder e Uint8Array.
// Compatível com browser e Node 22+ sem nada exclusivo de Node.

// ============================================================================
// Constantes
// ============================================================================

/** Iterações PBKDF2 recomendadas pela OWASP para HMAC-SHA-256. */
export const ITERACOES_PADRAO = 600_000;

/** 4 bytes ASCII que identificam o início de um pacote Sinapse v1. */
export const MAGICA = 'SNP1';

// ============================================================================
// Erros
// ============================================================================

export class ErroSenha extends Error {
  constructor(mensagem = 'Senha incorreta ou banco corrompido.') {
    super(mensagem);
    this.name = 'ErroSenha';
  }
}

export class ErroPacote extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroPacote';
  }
}

// ============================================================================
// Utilitários de codificação
// ============================================================================

/** Converte Uint8Array para string hexadecimal em minúsculas. */
export function _paraHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converte string hexadecimal para Uint8Array.
 * @throws {ErroPacote} se o hex for inválido ou tiver comprimento ímpar.
 */
export function _deHex(hex) {
  if (typeof hex !== 'string' || hex.length % 2 !== 0) {
    throw new ErroPacote('Hex inválido: comprimento ímpar ou tipo incorreto.');
  }
  if (hex.length > 0 && !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new ErroPacote('Hex inválido: caracteres fora do alfabeto hexadecimal.');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Gera 16 bytes aleatórios seguros para uso como sal PBKDF2. */
export function novoSal() {
  return globalThis.crypto.getRandomValues(new Uint8Array(16));
}

// ============================================================================
// Derivação de chave
// ============================================================================

/**
 * Deriva uma chave AES-GCM-256 a partir de senha e sal usando PBKDF2-SHA-256.
 * A chave retornada é não-extraível.
 *
 * @param {string} senha - Senha em texto simples (normalizada para NFC internamente).
 * @param {Uint8Array} sal - Sal com no mínimo 16 bytes.
 * @param {number} iteracoes - Número de iterações PBKDF2 (>= 1).
 * @param {string[]} usos - Usos da chave, ex.: ['encrypt'], ['decrypt'], ['encrypt','decrypt'].
 * @returns {Promise<CryptoKey>}
 * @throws {TypeError} se qualquer parâmetro for inválido.
 */
export async function derivarChave(
  senha,
  sal,
  iteracoes = ITERACOES_PADRAO,
  usos = ['decrypt']
) {
  if (typeof senha !== 'string' || senha.length === 0) {
    throw new TypeError('senha deve ser uma string não vazia.');
  }
  if (!(sal instanceof Uint8Array) || sal.byteLength < 16) {
    throw new TypeError('sal deve ser Uint8Array com pelo menos 16 bytes.');
  }
  if (!Number.isInteger(iteracoes) || iteracoes < 1) {
    throw new TypeError('iteracoes deve ser um inteiro >= 1.');
  }

  const encoder = new TextEncoder();
  const senhaNFC = senha.normalize('NFC');
  const senhaBytes = encoder.encode(senhaNFC);

  const chaveBase = await globalThis.crypto.subtle.importKey(
    'raw',
    senhaBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return globalThis.crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes },
    chaveBase,
    { name: 'AES-GCM', length: 256 },
    false, // não extraível
    usos
  );
}

// ============================================================================
// Empacotamento de conteúdo
// ============================================================================

/**
 * Serializa questoes e imagens num único Uint8Array determinístico.
 * Formato: [u32 big-endian = tamanho do índice][índice JSON UTF-8][bytes das imagens].
 *
 * @param {{ questoes: any, imagens: Map<string, Uint8Array> }} param
 * @returns {Uint8Array}
 */
export function empacotarConteudo({ questoes, imagens }) {
  const encoder = new TextEncoder();
  const caminhos = [...imagens.keys()].sort();

  // Monta o mapa de posições percorrendo caminhos em ordem alfabética.
  const indiceImagens = {};
  let offset = 0;
  for (const caminho of caminhos) {
    const bytes = imagens.get(caminho);
    indiceImagens[caminho] = [offset, bytes.byteLength];
    offset += bytes.byteLength;
  }

  const indice = { questoes, imagens: indiceImagens };
  const indiceBytes = encoder.encode(JSON.stringify(indice));

  // Cabeçalho: u32 big-endian com o tamanho do índice.
  const cabecalho = new Uint8Array(4);
  new DataView(cabecalho.buffer).setUint32(0, indiceBytes.byteLength, false);

  // Concatena tudo: cabecalho + índice + bytes de cada imagem.
  const partes = [cabecalho, indiceBytes, ...caminhos.map(c => imagens.get(c))];
  const total = partes.reduce((acc, p) => acc + p.byteLength, 0);
  const resultado = new Uint8Array(total);
  let pos = 0;
  for (const parte of partes) {
    resultado.set(parte, pos);
    pos += parte.byteLength;
  }
  return resultado;
}

/**
 * Desserializa o resultado de `empacotarConteudo`.
 *
 * @param {Uint8Array} bytes
 * @returns {{ questoes: any, imagens: Map<string, Uint8Array> }}
 * @throws {ErroPacote}
 */
export function desempacotarConteudo(bytes) {
  if (bytes.byteLength < 4) {
    throw new ErroPacote('Conteúdo truncado: menos de 4 bytes.');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tamanhoIndice = view.getUint32(0, false);

  if (4 + tamanhoIndice > bytes.byteLength) {
    throw new ErroPacote('Tamanho do índice ultrapassa o fim dos bytes.');
  }

  const indiceBytes = bytes.slice(4, 4 + tamanhoIndice);
  const decoder = new TextDecoder();

  let indice;
  try {
    indice = JSON.parse(decoder.decode(indiceBytes));
  } catch {
    throw new ErroPacote('Índice JSON inválido.');
  }

  const areaImagens = bytes.slice(4 + tamanhoIndice);
  const imagens = new Map();

  for (const [caminho, pos] of Object.entries(indice.imagens)) {
    const [inicio, tamanho] = pos;
    if (
      !Number.isInteger(inicio) || inicio < 0 ||
      !Number.isInteger(tamanho) || tamanho < 0 ||
      inicio + tamanho > areaImagens.byteLength
    ) {
      throw new ErroPacote(`Posição inválida para a imagem "${caminho}".`);
    }
    imagens.set(caminho, areaImagens.slice(inicio, inicio + tamanho));
  }

  return { questoes: indice.questoes, imagens };
}

// ============================================================================
// Cifragem e decifragem
// ============================================================================

/**
 * Cifra um Uint8Array de conteúdo com AES-GCM-256.
 * O chamador é responsável por garantir que `chave` foi derivada com o mesmo
 * `sal` e `iteracoes` passados aqui — esses valores ficam gravados no cabeçalho
 * para que `decifrarPacote` possa reconstituir a chave.
 *
 * @param {CryptoKey} chave - Chave AES-GCM derivada para uso de encrypt.
 * @param {Uint8Array} conteudo - Bytes a cifrar (saída de `empacotarConteudo`).
 * @param {{ sal: Uint8Array, iteracoes: number }} opcoes
 * @returns {Promise<Uint8Array>}
 */
export async function cifrarPacote(chave, conteudo, { sal, iteracoes }) {
  const encoder = new TextEncoder();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));

  const cabecalhoObj = {
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iteracoes,
    sal: _paraHex(sal),
    iv: _paraHex(iv),
  };
  const cabecalhoJSON = encoder.encode(JSON.stringify(cabecalhoObj));

  // Monta cabecalhoBytes = MAGICA (4 bytes) + u32 big-endian + JSON do cabeçalho.
  const magicaBytes = encoder.encode(MAGICA); // 4 bytes ASCII
  const prefixo = new Uint8Array(4);
  new DataView(prefixo.buffer).setUint32(0, cabecalhoJSON.byteLength, false);

  const cabecalhoBytes = new Uint8Array(
    magicaBytes.byteLength + prefixo.byteLength + cabecalhoJSON.byteLength
  );
  cabecalhoBytes.set(magicaBytes, 0);
  cabecalhoBytes.set(prefixo, magicaBytes.byteLength);
  cabecalhoBytes.set(cabecalhoJSON, magicaBytes.byteLength + prefixo.byteLength);

  const cifrado = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: cabecalhoBytes, tagLength: 128 },
    chave,
    conteudo
  );

  const resultado = new Uint8Array(cabecalhoBytes.byteLength + cifrado.byteLength);
  resultado.set(cabecalhoBytes, 0);
  resultado.set(new Uint8Array(cifrado), cabecalhoBytes.byteLength);
  return resultado;
}

/**
 * Lê e valida o cabeçalho de um pacote Sinapse.
 *
 * @param {Uint8Array} pacote
 * @returns {{ v, kdf, iteracoes, sal: Uint8Array, iv: Uint8Array, tamanhoCabecalho: number }}
 * @throws {ErroPacote}
 */
export function lerCabecalho(pacote) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  // Mínimo: 4 (mágica) + 4 (tamanho) = 8 bytes.
  if (pacote.byteLength < 8) {
    throw new ErroPacote('Pacote truncado.');
  }

  // Verifica a mágica.
  const magicaLida = decoder.decode(pacote.slice(0, 4));
  if (magicaLida !== MAGICA) {
    throw new ErroPacote(`Mágica inválida: esperado "${MAGICA}", encontrado "${magicaLida}".`);
  }

  const view = new DataView(pacote.buffer, pacote.byteOffset, pacote.byteLength);
  const tamanhoJSON = view.getUint32(4, false);
  const fimCabecalho = 8 + tamanhoJSON;

  if (fimCabecalho > pacote.byteLength) {
    throw new ErroPacote('Cabeçalho truncado: JSON ultrapassa o fim do pacote.');
  }

  let cabObj;
  try {
    cabObj = JSON.parse(decoder.decode(pacote.slice(8, fimCabecalho)));
  } catch {
    throw new ErroPacote('Cabeçalho JSON inválido.');
  }

  if (cabObj.v !== 1) {
    throw new ErroPacote(`Versão desconhecida: ${cabObj.v}.`);
  }
  if (cabObj.kdf !== 'PBKDF2-SHA256') {
    throw new ErroPacote(`KDF desconhecido: ${cabObj.kdf}.`);
  }
  if (!Number.isInteger(cabObj.iteracoes) || cabObj.iteracoes < 1) {
    throw new ErroPacote('Campo iteracoes inválido no cabeçalho.');
  }

  // _deHex já lança ErroPacote se o hex for inválido.
  const sal = _deHex(cabObj.sal);
  const iv = _deHex(cabObj.iv);

  if (sal.byteLength < 16) {
    throw new ErroPacote('Sal no cabeçalho tem menos de 16 bytes.');
  }
  if (iv.byteLength !== 12) {
    throw new ErroPacote('IV no cabeçalho deve ter exatamente 12 bytes.');
  }

  return {
    v: cabObj.v,
    kdf: cabObj.kdf,
    iteracoes: cabObj.iteracoes,
    sal,
    iv,
    tamanhoCabecalho: fimCabecalho,
  };
}

/**
 * Decifra um pacote Sinapse e devolve o conteúdo bruto (bytes).
 * Qualquer falha de autenticação AES-GCM é relançada como `ErroSenha`.
 * Erros de formato continuam como `ErroPacote`.
 *
 * @param {CryptoKey} chave - Chave AES-GCM derivada para uso de decrypt.
 * @param {Uint8Array} pacote - Pacote completo (saída de `cifrarPacote`).
 * @returns {Promise<Uint8Array>}
 * @throws {ErroSenha | ErroPacote}
 */
export async function decifrarPacote(chave, pacote) {
  // lerCabecalho lança ErroPacote em caso de formato inválido.
  const { tamanhoCabecalho, iv } = lerCabecalho(pacote);

  const additionalData = pacote.slice(0, tamanhoCabecalho);
  const cifrado = pacote.slice(tamanhoCabecalho);

  try {
    const claro = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData, tagLength: 128 },
      chave,
      cifrado
    );
    return new Uint8Array(claro);
  } catch (e) {
    if (e instanceof ErroPacote) throw e;
    throw new ErroSenha();
  }
}
