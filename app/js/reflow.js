const REF  = /^[A-ZÀ-ÖØ-Ý][A-ZÀ-ÖØ-Ý''\-]+,\s|Disponível em|Acesso em|https?:\/\/|^\[…\]$|^\[\.\.\.\]$/;
const NOVO = /^(—|–|-\s|•|\d{1,2}[.)]\s|[IVX]+\s[–-]\s|\[…\])/;

export function reflowEnunciado(texto) {
  const linhas = texto.split('\n');

  const naoRef = linhas.filter(l => l.trim() !== '' && !REF.test(l.trim()));
  const w = naoRef.reduce((max, l) => Math.max(max, l.length), 0);

  if (naoRef.length === 0 || w < 30) return texto;

  const out = [linhas[0]];
  let ult = linhas[0];

  for (let i = 1; i < linhas.length; i++) {
    const nxt = linhas[i];
    const deveJuntar =
      ult.length >= 0.72 * w &&
      ult.trim() !== '' &&
      nxt.trim() !== '' &&
      !REF.test(ult.trim()) &&
      !REF.test(nxt.trim()) &&
      !NOVO.test(nxt.trim());

    if (deveJuntar) {
      out[out.length - 1] = out[out.length - 1].trimEnd() + ' ' + nxt.trimStart();
    } else {
      out.push(nxt);
    }
    ult = nxt;
  }

  return out.join('\n');
}
