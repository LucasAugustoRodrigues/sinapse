const locais = import.meta.glob('./perfil.local.js', { eager: true });
const local  = Object.values(locais)[0] ?? {};

export const NOME = (local.NOME ?? '').trim();

export const FRASES = [
  { texto: "Cada revisão de hoje é uma conexão mais forte amanhã.", autor: null },
  { texto: "Constância vence intensidade. Um pouco todo dia.", autor: null },
  { texto: "Todo erro revisado vira acerto guardado.", autor: null },
  { texto: "Você não precisa saber tudo hoje, só um pouco mais que ontem.", autor: null },
  { texto: "Pequenos passos diários constroem grandes aprovações.", autor: null },
  { texto: "A medicina começa aqui: uma questão de cada vez.", autor: null },
];

export function saudacao(hora, nome = NOME) {
  let periodo;
  if (hora >= 5 && hora <= 11) {
    periodo = "Bom dia";
  } else if (hora >= 12 && hora <= 17) {
    periodo = "Boa tarde";
  } else {
    periodo = "Boa noite";
  }
  const n = (nome ?? '').trim();
  return n ? `${periodo}, ${n}!` : `${periodo}!`;
}

export function fraseDoDia(dia, frases = FRASES) {
  const n = frases.length;
  return frases[((dia % n) + n) % n];
}
