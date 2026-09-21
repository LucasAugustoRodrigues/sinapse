// ui.js — camada de apresentação.
// A UI nunca fala direto com o IndexedDB — só via dados.js.
// TODO(fase4): substituir o driver temporário abaixo por estudo.js.

"use strict";

// ============================================================================
// Ícones SVG (substituem emoji para render idêntico em qualquer tablet)
// Estilo: traços finos, paleta "noite neural" (--synapse / --signal / --ok / --err)
// ============================================================================

const SVG = {
  // Régua de confiança
  chutei: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M10.5 10.5a3.5 3.5 0 0 1 7 0c0 2.5-3.2 3-3.5 5.5"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="14" cy="21" r="1.5" fill="currentColor"/>
  </svg>`,

  duvida: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <line x1="14" y1="4" x2="14" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="10" y1="22" x2="18" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="4"  y1="11" x2="24" y2="11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M4 11c0 3 4 5 4 5S4 18 4 21" stroke="currentColor" stroke-width="1.3"
          stroke-linecap="round" fill="none"/>
    <path d="M24 11c0 3-4 5-4 5s4 2 4 5" stroke="currentColor" stroke-width="1.3"
          stroke-linecap="round" fill="none"/>
  </svg>`,

  certeza: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M15 5L8 16h8L13 24l11-13h-9l3-6z"
          stroke="currentColor" stroke-width="1.7"
          stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`,

  // Veredito — acertou (usa currentColor, herda cor do .vd.good / .vd.bad)
  acertou: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.4"/>
    <path d="M6 10l3 3 5-5" stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  // Veredito — errou
  errou: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.4"/>
    <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  // Parabéns (estrela, usa --ok via currentColor da classe .youpick.ok b)
  parabens: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M10 2l2.2 6.5H19l-5.5 4 2.1 6.5L10 15l-5.6 4 2.1-6.5L1 8.5h6.8L10 2z"
          stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"
          fill="rgba(52,211,153,.15)"/>
  </svg>`,

  // Aviso do SRS — 3 nós neurais (miniatura do logo)
  srs: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M9 9L19 9M9 9L14 19M19 9L14 19"
          stroke="var(--line2)" stroke-width="1.2"/>
    <circle cx="9"  cy="9"  r="3.5" fill="var(--synapse)" opacity=".9"/>
    <circle cx="19" cy="9"  r="2.8" fill="var(--signal)"  opacity=".85"/>
    <circle cx="14" cy="19" r="3.5" fill="var(--signal)"  opacity=".85"/>
  </svg>`,
};

// ============================================================================
// Dados de exemplo (hardcoded — substituídos por dados.js na Fase 4)
// ============================================================================

const COMPS = [
  { n: 1, nome: "Gêneros Textuais e Prática Social", habs: [
    [1,  "Identificar recursos expressivos e características textuais do gênero."],
    [2,  "Resolver problemas sociais (geralmente fáceis)."],
    [3,  "Relacionar informações do texto, função social do gênero e como opera socialmente."],
    [4,  "Reconhecer posições críticas aos usos sociais da linguagem."],
  ]},
  { n: 2, nome: "Língua Estrangeira", habs: [
    [5,  "Associar vocábulos e expressões ao seu contexto."],
    [6,  "Utilizar conhecimento sobre cultura e tecnologia."],
    [7,  "Relacionar função social."],
    [8,  "Reconhecer a diversidade linguística e cultural."],
  ]},
  { n: 3, nome: "Linguagem Corporal", habs: [
    [9,  "Reconhecer manifestações corporais associadas ao cotidiano."],
    [10, "Reconhecer a necessidade de transformar hábitos corporais / padrões de beleza."],
    [11, "Reconhecer a linguagem corporal para interação e adaptação social."],
  ]},
  { n: 4, nome: "Artes", habs: [
    [12, "Reconhecer funções da arte (geralmente em imagens)."],
    [13, "Analisar produções artísticas, padrões de beleza e preconceitos."],
    [14, "Reconhecer a interrelação de elementos e o valor da diversidade artística."],
  ]},
  { n: 5, nome: "Literatura", habs: [
    [15, "Estabelecer relações entre o texto literário e o contexto de produção."],
    [16, "Relacionar concepções artísticas aos procedimentos de construção do texto."],
    [17, "Reconhecer a presença de valores sociais e humanos."],
  ]},
  { n: 6, nome: "Sistemas Simbólicos", habs: [
    [18, "Identificar elementos de progressão temática e organização estrutural."],
    [19, "Analisar a função da linguagem."],
    [20, "Reconhecer patrimônio linguístico para memória nacional."],
  ]},
  { n: 7, nome: "Argumentação e Opinião", habs: [
    [21, "Reconhecer recursos verbais e não verbais."],
    [22, "Relacionar dois ou mais textos."],
    [23, "Inferir os objetivos do autor através de marcas linguísticas."],
    [24, "Reconhecer as estratégias argumentativas."],
  ]},
  { n: 8, nome: "Variantes Linguísticas e Norma-padrão", habs: [
    [25, "Identificar marcas linguísticas que singularizam variedades."],
    [26, "Relacionar variantes a situações de uso."],
    [27, "Reconhecer os usos da norma-padrão."],
  ]},
  { n: 9, nome: "Tecnologias da Informação e Comunicação", habs: [
    [28, "Reconhecer a função e o impacto das novas tecnologias."],
    [29, "Identificar as características da tecnologia."],
    [30, "Relacionar o desenvolvimento da sociedade ao uso das tecnologias."],
  ]},
];

const DESC = {};
COMPS.forEach(c => c.habs.forEach(h => { DESC[h[0]] = h[1]; }));

const HAB_CORRETA = 23;
const ALT_CORRETA = "B";
const ALTS = [
  ["A", "exaltar as vantagens da vida conectada e o convívio virtual.",
        "O elogio é só aparente — \"acompanhado na minha solidão\" desfaz a exaltação. O tom é irônico."],
  ["B", "criticar, com ironia, o isolamento mascarado pelo excesso de conexão.",
        "A contradição proposital revela a crítica: a conexão que, em vez de aproximar, isola."],
  ["C", "descrever de modo neutro a rotina de quem vive nas redes.",
        "Há forte juízo de valor; o texto não tem nada de neutro."],
  ["D", "defender que as amizades virtuais substituem as presenciais.",
        "O texto sugere o oposto: a companhia virtual não preenche."],
  ["E", "alertar sobre a falta de acesso à internet em certas regiões.",
        "O tema é o efeito do excesso de conexão, não o acesso à internet."],
];

// ============================================================================
// Opções da régua de confiança
// ============================================================================

const CONF_OPTIONS = [
  { id: "chutei",  label: "Chutei",          icon: SVG.chutei  },
  { id: "duvida",  label: "Na dúvida",        icon: SVG.duvida  },
  { id: "certeza", label: "Tinha certeza",    icon: SVG.certeza },
];
const CONF_LABEL = { chutei: "Chutei", duvida: "Na dúvida", certeza: "Tinha certeza" };

// ============================================================================
// Lógica SRS (inline pra esta fase — Fase 4 importará de srs.js)
// ============================================================================

function _derivarNota(acerto, conf) {
  if (!acerto) return conf === "certeza" ? "ERRO_CONFIANTE" : "ERREI";
  return { chutei: "DIFICIL", duvida: "BOM", certeza: "FACIL" }[conf];
}

const _RANK = { ERRO_CONFIANTE: 0, ERREI: 1, DIFICIL: 2, BOM: 3, FACIL: 4 };
function _pior(a, b) { return _RANK[a] <= _RANK[b] ? a : b; }

function _voltaTexto(nota) {
  switch (nota) {
    case "FACIL":          return "em ~3 dias";
    case "BOM":            return "amanhã (~1 dia)";
    case "DIFICIL":        return "amanhã (~1 dia)";
    case "ERREI":          return "ainda nesta sessão";
    case "ERRO_CONFIANTE": return "ainda nesta sessão — e fica marcada para revisão";
  }
}

function _rotulo(nota) {
  return { ERRO_CONFIANTE: "erro confiante", ERREI: "errei",
           DIFICIL: "difícil", BOM: "bom", FACIL: "fácil" }[nota];
}

// ============================================================================
// Estado
// ============================================================================

let selHab = null;
let confHab = null;
let selAlt = null;
let step = 0;

// ============================================================================
// Referências ao DOM
// ============================================================================

const gradeEl     = document.getElementById("grade");
const confBtnsEl  = document.getElementById("confButtons");
const confWrapEl  = document.getElementById("confWrap");
const altsEl      = document.getElementById("alts");
const confirmBtn  = document.getElementById("confirmAlt");
const track3El    = document.getElementById("track3");
const stageEl     = document.getElementById("stage");
const segs        = [...document.querySelectorAll("#rail .seg")];

// ============================================================================
// Render — grade de habilidades
// ============================================================================

function renderGrade() {
  COMPS.forEach(comp => {
    const header = document.createElement("div");
    header.className = "comp";
    header.textContent = `C${comp.n} · ${comp.nome}`;
    gradeEl.appendChild(header);

    const row = document.createElement("div");
    row.className = "chips";
    comp.habs.forEach(([num, descricao]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = `H${num}`;
      btn.dataset.n = num;
      btn.title = descricao;
      btn.addEventListener("click", () => selecionarHab(num));
      row.appendChild(btn);
    });
    gradeEl.appendChild(row);
  });
}

// ============================================================================
// Render — régua de confiança
// ============================================================================

function renderConf() {
  CONF_OPTIONS.forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.c = opt.id;
    btn.innerHTML = `<span class="ic">${opt.icon}</span><span class="t">${opt.label}</span>`;
    btn.addEventListener("click", () => {
      confHab = opt.id;
      confBtnsEl.querySelectorAll("button").forEach(b => b.classList.toggle("sel", b === btn));
      setTimeout(() => irPara(1), 340);
    });
    confBtnsEl.appendChild(btn);
  });
}

// ============================================================================
// Render — alternativas (passo 2)
// ============================================================================

function renderAlts() {
  ALTS.forEach(([letra, texto]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "alt";
    btn.dataset.l = letra;
    btn.innerHTML = `<span class="letter">${letra}</span><span>${texto}</span>`;
    btn.addEventListener("click", () => {
      selAlt = letra;
      altsEl.querySelectorAll(".alt").forEach(x => x.classList.toggle("sel", x.dataset.l === letra));
      confirmBtn.disabled = false;
    });
    altsEl.appendChild(btn);
  });
}

// ============================================================================
// Interação — seleção de habilidade
// ============================================================================

function selecionarHab(num) {
  selHab = num;
  gradeEl.querySelectorAll(".chip").forEach(c => c.classList.toggle("sel", +c.dataset.n === num));
  if (!confWrapEl.classList.contains("show")) {
    confWrapEl.classList.add("show");
    setTimeout(() => {
      confWrapEl.scrollIntoView({ behavior: "smooth", block: "center" });
      atualizarAltura();
    }, 80);
  }
  atualizarAltura();
}

// ============================================================================
// Navegação / slide entre painéis
// ============================================================================

function atualizarAltura() {
  const painel = document.getElementById("panel" + step);
  stageEl.style.height = painel.offsetHeight + "px";
}

function irPara(s) {
  step = s;
  track3El.style.transform = `translateX(${-100 * s}%)`;
  segs.forEach((seg, i) => {
    seg.classList.toggle("on",   i === s);
    seg.classList.toggle("done", i < s);
    seg.querySelector("i").style.width = i <= s ? "100%" : "0";
  });
  setTimeout(atualizarAltura, 30);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================================
// Revelar resultado (passo 3)
// ============================================================================

function renderRevelacao() {
  const acertoH = selHab === HAB_CORRETA;
  const acertoR = selAlt === ALT_CORRETA;
  const notaH     = _derivarNota(acertoH, confHab);
  const notaR     = acertoR ? "BOM" : "ERREI";
  const notaFinal = _pior(notaH, notaR);

  // Vereditos
  document.getElementById("verdicts").innerHTML = `
    <div class="vd ${acertoH ? "good" : "bad"}">
      <div class="k">Habilidade</div>
      <div class="v">${acertoH ? SVG.acertou : SVG.errou} ${acertoH ? "Acertou" : "Errou"}</div>
      <div class="sub">confiança: ${CONF_LABEL[confHab]}</div>
    </div>
    <div class="vd ${acertoR ? "good" : "bad"}">
      <div class="k">Resposta</div>
      <div class="v">${acertoR ? SVG.acertou : SVG.errou} ${acertoR ? "Certa" : "Errada"}</div>
      <div class="sub">você marcou ${selAlt}</div>
    </div>
  `;

  // Card da habilidade correta
  const compCorreta = COMPS.find(c => c.habs.some(h => h[0] === HAB_CORRETA));
  const youpick = acertoH
    ? `<div class="youpick ok">Você reconheceu certo. <b>${SVG.parabens}</b></div>`
    : `<div class="youpick">Você marcou <b>H${selHab}</b> — ${DESC[selHab]}</div>`;

  document.getElementById("revHab").innerHTML = `
    <h3>A habilidade era</h3>
    <div class="hbadge">
      <span class="code">H${HAB_CORRETA}</span>
      ${compCorreta.nome}
    </div>
    <div class="desc">${DESC[HAB_CORRETA]}</div>
    <div class="gloss">
      A ironia é a <em>marca linguística</em>; o objetivo do autor,
      inferido por ela, é criticar o isolamento por trás da hiperconexão.
    </div>
    ${youpick}
  `;

  // Alternativas comentadas
  const altsRevealEl = document.getElementById("altsReveal");
  altsRevealEl.innerHTML = "";
  ALTS.forEach(([letra, texto, comentario]) => {
    const correct    = letra === ALT_CORRETA;
    const wrongPick  = letra === selAlt && !correct;
    const el = document.createElement("div");
    el.className = `alt ${correct ? "correct" : wrongPick ? "wrong" : ""}`;
    el.innerHTML = `
      <span class="letter">${letra}</span>
      <span>${texto}<span class="cmt ${correct ? "g" : wrongPick ? "r" : ""}">${comentario}</span></span>
    `;
    altsRevealEl.appendChild(el);
  });

  // Aviso do SRS
  document.getElementById("srsNote").innerHTML = `
    <div class="ic">${SVG.srs}</div>
    <div class="body">
      No Sinapse, esta questão <b>volta ${_voltaTexto(notaFinal)}</b>.
      <span class="hint">
        Agendada pela parte mais fraca — reconhecimento + resolução:
        ${_rotulo(notaH)} + ${_rotulo(notaR)} → ${_rotulo(notaFinal)}.
      </span>
    </div>
  `;
}

// ============================================================================
// Eventos
// ============================================================================

confirmBtn.addEventListener("click", () => {
  if (!selAlt) return;
  renderRevelacao();
  irPara(2);
});

document.getElementById("restart").addEventListener("click", () => {
  selHab = null;
  confHab = null;
  selAlt = null;
  gradeEl.querySelectorAll(".chip").forEach(c => c.classList.remove("sel", "correct", "wrong"));
  confWrapEl.classList.remove("show");
  confBtnsEl.querySelectorAll("button").forEach(b => b.classList.remove("sel"));
  altsEl.querySelectorAll(".alt").forEach(x => x.classList.remove("sel"));
  confirmBtn.disabled = true;
  irPara(0);
});

window.addEventListener("resize", atualizarAltura);

// ============================================================================
// Inicialização
// ============================================================================

renderGrade();
renderConf();
renderAlts();
irPara(0);
window.addEventListener("load", atualizarAltura);
