// ui.js — camada de apresentação.
// A UI nunca fala direto com o IndexedDB — só via dados.js.

import { derivarNota, pior, BOM, ERREI } from './srs.js';
import { carregarMatriz, descreverHabilidade } from './dados.js';
import { iniciarSessao, listarSimulados, contarRevisao } from './estudo.js';

// ============================================================================
// Ícones SVG (substituem emoji — render idêntico em qualquer tablet)
// Traços finos, paleta "noite neural" (--synapse / --signal / --ok / --err)
// ============================================================================

const SVG = {
  chutei:
    `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">` +
    `<path d="M10.5 10.5a3.5 3.5 0 0 1 7 0c0 2.5-3.2 3-3.5 5.5"` +
    ` stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="14" cy="21" r="1.5" fill="currentColor"/></svg>`,

  duvida:
    `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">` +
    `<path d="M5 14c2-3.5 4.5-3.5 6 0s4 3.5 6 0 4-3.5 6 0"` +
    ` stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>` +
    `</svg>`,

  certeza:
    `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">` +
    `<path d="M15 5L8 16h8L13 24l11-13h-9l3-6z"` +
    ` stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/>` +
    `</svg>`,

  acertou:
    `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">` +
    `<circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.4"/>` +
    `<path d="M6 10l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`,

  errou:
    `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">` +
    `<circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.4"/>` +
    `<path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>` +
    `</svg>`,

  parabens:
    `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">` +
    `<path d="M10 2l2.2 6.5H19l-5.5 4 2.1 6.5L10 15l-5.6 4 2.1-6.5L1 8.5h6.8L10 2z"` +
    ` stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" fill="rgba(52,211,153,.15)"/>` +
    `</svg>`,

  srs:
    `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">` +
    `<path d="M9 9L19 9M9 9L14 19M19 9L14 19" stroke="var(--line2)" stroke-width="1.2"/>` +
    `<circle cx="9" cy="9" r="3.5" fill="var(--synapse)" opacity=".9"/>` +
    `<circle cx="19" cy="9" r="2.8" fill="var(--signal)" opacity=".85"/>` +
    `<circle cx="14" cy="19" r="3.5" fill="var(--signal)" opacity=".85"/>` +
    `</svg>`,
};

// ============================================================================
// Helpers
// ============================================================================

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _enun2html(texto) {
  return _esc(texto).replace(/\n/g, '<br>');
}

function _descHab(matriz, num) {
  for (const comp of matriz.competencias) {
    for (const hab of comp.habilidades) {
      if (hab.numero === num) return hab.descricao;
    }
  }
  return '';
}

const _CONF_LABEL = { chutei: 'Chutei', duvida: 'Na dúvida', certeza: 'Tinha certeza' };
const _IDIOMA_LABEL = { ingles: 'Inglês', espanhol: 'Espanhol' };

function _voltaTexto(nota) {
  return {
    FACIL:          'em ~3 dias',
    BOM:            'amanhã (~1 dia)',
    DIFICIL:        'amanhã (~1 dia)',
    ERREI:          'ainda nesta sessão',
    ERRO_CONFIANTE: 'ainda nesta sessão — e fica marcada para revisão',
  }[nota] ?? '';
}

function _rotuloNota(nota) {
  return {
    ERRO_CONFIANTE: 'erro confiante', ERREI: 'errei',
    DIFICIL: 'difícil', BOM: 'bom', FACIL: 'fácil',
  }[nota] ?? nota;
}

const _LOGO_SVG =
  `<svg viewBox="0 0 40 40" fill="none" width="34" height="34" aria-hidden="true">` +
  `<path d="M11 13 L30 9 M30 9 L27 29 M27 29 L12 30 M12 30 L11 13 M11 13 L27 29 M30 9 L12 30"` +
  ` stroke="#4a4e78" stroke-width="1.3"/>` +
  `<circle cx="11" cy="13" r="4" fill="#8b7bf5"/>` +
  `<circle cx="30" cy="9" r="3.2" fill="#3fc7f4"/>` +
  `<circle cx="27" cy="29" r="4.6" fill="#3fc7f4"/>` +
  `<circle cx="12" cy="30" r="3.2" fill="#8b7bf5"/>` +
  `</svg>`;

function _buildEnunBloco(questao, isReconhecer) {
  const metaRight = questao.idioma
    ? `<span class="idioma-tag">${_esc(_IDIOMA_LABEL[questao.idioma] ?? questao.idioma)}</span>`
    : `<span>${isReconhecer ? 'identifique a habilidade' : 'agora, resolva'}</span>`;

  const anoFonte   = parseInt((questao.fonte ?? '').replace(/\D/g, ''), 10) || 0;
  const tagSimulado = questao.fonte && questao.simulado
    ? ` · SAS ${anoFonte} · Simulado ${questao.simulado}`
    : '';

  const imgs = (questao.imagens ?? []).map(caminho =>
    `<div class="img-wrap"><img src="/${_esc(caminho)}" alt=""></div>`
  ).join('');

  const cmd = isReconhecer
    ? `<div class="cmd"><b>Qual habilidade esta questão cobra?</b></div>`
    : '';

  return (
    `<div class="enun">` +
      `<div class="meta"><span>Questão · ${_esc(questao.area)}${_esc(tagSimulado)}</span>${metaRight}</div>` +
      `<div class="quote">${_enun2html(questao.enunciado)}</div>` +
      imgs +
      cmd +
    `</div>`
  );
}

// ============================================================================
// renderCard — constrói o card de uma questão e notifica via callback
// ============================================================================

export function renderCard(container, { questao, matriz, habilidadeCorreta }, { onConcluir }) {
  // Constrói o HTML completo no container
  container.innerHTML =
    `<div class="sinapse-app">` +
      `<div class="bar">` +
        `<div class="brand">` +
          _LOGO_SVG +
          `<h1>Sinapse</h1>` +
          `<span class="tag">Treino</span>` +
        `</div>` +
        `<div class="rail" id="rail">` +
          `<div class="seg" data-step="0"><div class="track"><i></i></div><span class="lbl">Reconhecer</span></div>` +
          `<div class="seg" data-step="1"><div class="track"><i></i></div><span class="lbl">Resolver</span></div>` +
          `<div class="seg" data-step="2"><div class="track"><i></i></div><span class="lbl">Revelação</span></div>` +
        `</div>` +
      `</div>` +

      `<div class="stage" id="stage">` +
        `<div class="track3" id="track3">` +

          `<section class="panel" id="panel0">` +
            _buildEnunBloco(questao, true) +
            `<div class="ask"><span class="n">1</span> Toque na habilidade que você acha que é:</div>` +
            `<div id="grade"></div>` +
            `<div class="conf-wrap" id="confWrap">` +
              `<p class="conf-lead">Quão certa você estava?</p>` +
              `<div class="conf" id="confButtons"></div>` +
            `</div>` +
          `</section>` +

          `<section class="panel" id="panel1">` +
            _buildEnunBloco(questao, false) +
            `<div class="ask"><span class="n">2</span> Qual é a resposta?</div>` +
            `<div class="alts" id="alts"></div>` +
            `<button class="cta" id="confirmAlt" disabled>Confirmar resposta</button>` +
          `</section>` +

          `<section class="panel" id="panel2">` +
            `<div class="ask"><span class="n">3</span> Como você foi</div>` +
            `<div class="verdicts" id="verdicts"></div>` +
            `<div class="rcard" id="revHab"></div>` +
            `<div class="ask" style="margin-top:20px"><span class="n" aria-hidden="true">✓</span> A resposta, comentada</div>` +
            `<div class="alts" id="altsReveal"></div>` +
            `<div class="srs" id="srsNote"></div>` +
          `</section>` +

        `</div>` +
      `</div>` +
    `</div>`;

  // Referências ao DOM recém-criado
  const gradeEl    = container.querySelector('#grade');
  const confBtnsEl = container.querySelector('#confButtons');
  const confWrapEl = container.querySelector('#confWrap');
  const altsEl     = container.querySelector('#alts');
  const confirmBtn = container.querySelector('#confirmAlt');
  const track3El   = container.querySelector('#track3');
  const stageEl    = container.querySelector('#stage');
  const segs       = [...container.querySelectorAll('#rail .seg')];

  // Estado local da questão (fechado na closure)
  let selHab = null, confHab = null, selAlt = null, step = 0;

  // --------------------------------------------------------------------------
  // Navegação
  // --------------------------------------------------------------------------

  function atualizarAltura() {
    const p = container.querySelector('#panel' + step);
    if (p) stageEl.style.height = p.offsetHeight + 'px';
  }

  function irPara(s) {
    step = s;
    track3El.style.transform = `translateX(${-100 * s}%)`;
    segs.forEach((seg, i) => {
      seg.classList.toggle('on',   i === s);
      seg.classList.toggle('done', i < s);
      seg.querySelector('i').style.width = i <= s ? '100%' : '0';
    });
    setTimeout(atualizarAltura, 30);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --------------------------------------------------------------------------
  // Grade de habilidades (da matriz real)
  // --------------------------------------------------------------------------

  matriz.competencias.forEach(comp => {
    const header = document.createElement('div');
    header.className = 'comp';
    header.textContent = `C${comp.numero} · ${comp.nome}`;
    gradeEl.appendChild(header);

    const row = document.createElement('div');
    row.className = 'chips';
    comp.habilidades.forEach(hab => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.textContent = `H${hab.numero}`;
      btn.dataset.n = hab.numero;
      btn.title = hab.descricao;
      btn.addEventListener('click', () => selecionarHab(hab.numero));
      row.appendChild(btn);
    });
    gradeEl.appendChild(row);
  });

  function selecionarHab(num) {
    selHab = num;
    gradeEl.querySelectorAll('.chip').forEach(c =>
      c.classList.toggle('sel', +c.dataset.n === num)
    );
    if (!confWrapEl.classList.contains('show')) {
      confWrapEl.classList.add('show');
      confWrapEl.addEventListener('transitionend', function onExpandEnd(e) {
        if (e.propertyName !== 'max-height') return;
        confWrapEl.removeEventListener('transitionend', onExpandEnd);
        atualizarAltura();
        confWrapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    atualizarAltura();
  }

  // --------------------------------------------------------------------------
  // Régua de confiança
  // --------------------------------------------------------------------------

  [
    { id: 'chutei',  label: 'Chutei',       icon: SVG.chutei  },
    { id: 'duvida',  label: 'Na dúvida',     icon: SVG.duvida  },
    { id: 'certeza', label: 'Tinha certeza', icon: SVG.certeza },
  ].forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.c = opt.id;
    btn.innerHTML = `<span class="ic">${opt.icon}</span><span class="t">${opt.label}</span>`;
    btn.addEventListener('click', () => {
      confHab = opt.id;
      confBtnsEl.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b === btn));
      setTimeout(() => irPara(1), 340);
    });
    confBtnsEl.appendChild(btn);
  });

  // --------------------------------------------------------------------------
  // Alternativas (do questao.alternativas real)
  // --------------------------------------------------------------------------

  questao.alternativas.forEach(alt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'alt';
    btn.dataset.l = alt.letra;
    btn.innerHTML =
      `<span class="letter">${_esc(alt.letra)}</span><span>${_esc(alt.texto)}</span>`;
    btn.addEventListener('click', () => {
      selAlt = alt.letra;
      altsEl.querySelectorAll('.alt').forEach(x =>
        x.classList.toggle('sel', x.dataset.l === alt.letra)
      );
      confirmBtn.disabled = false;
    });
    altsEl.appendChild(btn);
  });

  confirmBtn.addEventListener('click', () => {
    if (!selAlt) return;
    _renderRevelacao();
    irPara(2);
  });

  // --------------------------------------------------------------------------
  // Revelação
  // --------------------------------------------------------------------------

  function _renderRevelacao() {
    const recAcerto = selHab === questao.habilidade;
    const resAcerto = selAlt === questao.gabarito;
    const notaRec   = derivarNota(recAcerto, confHab);
    const notaRes   = resAcerto ? BOM : ERREI;
    const notaFinal = pior(notaRec, notaRes);

    // Vereditos
    container.querySelector('#verdicts').innerHTML =
      `<div class="vd ${recAcerto ? 'good' : 'bad'}">` +
        `<div class="k">Habilidade</div>` +
        `<div class="v">${recAcerto ? SVG.acertou : SVG.errou} ${recAcerto ? 'Acertou' : 'Errou'}</div>` +
        `<div class="sub">confiança: ${_CONF_LABEL[confHab]}</div>` +
      `</div>` +
      `<div class="vd ${resAcerto ? 'good' : 'bad'}">` +
        `<div class="k">Resposta</div>` +
        `<div class="v">${resAcerto ? SVG.acertou : SVG.errou} ${resAcerto ? 'Certa' : 'Errada'}</div>` +
        `<div class="sub">você marcou ${_esc(selAlt)}</div>` +
      `</div>`;

    // Card da habilidade correta
    const youpick = recAcerto
      ? `<div class="youpick ok">Você reconheceu certo. <b>${SVG.parabens}</b></div>`
      : `<div class="youpick">Você marcou <b>H${selHab}</b> — ${_esc(_descHab(matriz, selHab))}</div>`;

    container.querySelector('#revHab').innerHTML =
      `<h3>A habilidade era</h3>` +
      `<div class="hbadge"><span class="code">H${habilidadeCorreta.numero}</span> ${_esc(habilidadeCorreta.competencia.nome)}</div>` +
      `<div class="desc">${_esc(habilidadeCorreta.descricao)}</div>` +
      youpick;

    // Alternativas comentadas
    const altsRevEl = container.querySelector('#altsReveal');
    altsRevEl.innerHTML = '';
    questao.alternativas.forEach(alt => {
      const correct   = alt.correta;
      const wrongPick = alt.letra === selAlt && !correct;
      const el = document.createElement('div');
      el.className = `alt ${correct ? 'correct' : wrongPick ? 'wrong' : ''}`;
      el.innerHTML =
        `<span class="letter">${_esc(alt.letra)}</span>` +
        `<span>${_esc(alt.texto)}<span class="cmt ${correct ? 'g' : wrongPick ? 'r' : ''}">${_esc(alt.comentario)}</span></span>`;
      altsRevEl.appendChild(el);
    });

    // Aviso SRS
    container.querySelector('#srsNote').innerHTML =
      `<div class="ic">${SVG.srs}</div>` +
      `<div class="body">No Sinapse, esta questão <b>volta ${_voltaTexto(notaFinal)}</b>.` +
      `<span class="hint">Agendada pela parte mais fraca — reconhecimento: ${_rotuloNota(notaRec)}; resolução: ${_rotuloNota(notaRes)} → ${_rotuloNota(notaFinal)}.</span></div>`;

    // Botão de avanço — o driver só é notificado quando o usuário termina de ler
    const proxBtn = document.createElement('button');
    proxBtn.className = 'cta';
    proxBtn.style.marginTop = '20px';
    proxBtn.textContent = 'Próxima questão →';
    proxBtn.addEventListener('click', () => {
      proxBtn.disabled = true;
      onConcluir?.({ habilidadeMarcada: selHab, confianca: confHab, alternativaMarcada: selAlt, recAcerto, resAcerto });
    }, { once: true });
    container.querySelector('#panel2').appendChild(proxBtn);
    setTimeout(atualizarAltura, 30);
  }

  // --------------------------------------------------------------------------
  // ResizeObserver — recalcula a altura em qualquer mudança de conteúdo
  // (imagem carregando, fonte, conf-wrap expandindo, resize de janela)
  // --------------------------------------------------------------------------

  if (window._sinapseResizeObserver) {
    window._sinapseResizeObserver.disconnect();
  }
  if (window._sinapseResizeHandler) {
    window.removeEventListener('resize', window._sinapseResizeHandler);
    window._sinapseResizeHandler = null;
  }

  const _ro = new ResizeObserver(() => atualizarAltura());
  [0, 1, 2].forEach(i => {
    const p = container.querySelector(`#panel${i}`);
    if (p) _ro.observe(p);
  });
  window._sinapseResizeObserver = _ro;

  // Cinto e suspensório: listener de load em cada imagem do enunciado
  container.querySelectorAll('.img-wrap img').forEach(img => {
    if (!img.complete) img.addEventListener('load', atualizarAltura, { once: true });
  });

  irPara(0);
}

// ============================================================================
// Tela de seleção
// ============================================================================

async function renderSelecao(app) {
  let simulados;
  try {
    simulados = await listarSimulados();
  } catch (e) {
    app.innerHTML =
      `<div class="loading-state">` +
        `<p>Não foi possível carregar as questões.</p>` +
        `<p style="font-size:.8rem;color:var(--muted2);margin-top:6px">Rode <code>npm run dev</code> para copiar os dados para public/.</p>` +
      `</div>`;
    console.error('[Sinapse] renderSelecao error:', e);
    return;
  }

  app.innerHTML =
    `<div class="sinapse-app">` +
      `<div class="selecao">` +

        `<div class="sel-brand">` +
          _LOGO_SVG +
          `<h1>Sinapse</h1>` +
        `</div>` +

        `<h2 class="sel-titulo">Revisão do dia</h2>` +
        `<p class="sel-sub">Escolha o que treinar hoje.</p>` +

        `<div class="sel-section">` +
          `<div class="sel-label">Idioma</div>` +
          `<div class="idioma-toggle" id="idiomaToggle">` +
            `<button class="it-btn sel" data-idioma="ingles">Inglês</button>` +
            `<button class="it-btn" data-idioma="espanhol">Espanhol</button>` +
          `</div>` +
        `</div>` +

        `<div class="sel-section">` +
          `<div class="sel-label">Simulado</div>` +
          `<div class="sim-lista" id="simLista">` +
            `<button class="sim-item sel" data-sim="todos">Todos os simulados</button>` +
            simulados.map((s, i) =>
              `<button class="sim-item" data-sim="${i}">${_esc(s.label)}</button>`
            ).join('') +
          `</div>` +
        `</div>` +

        `<div class="sel-section">` +
          `<div class="sel-contador">` +
            `<span class="cont-num" id="contNum">—</span>` +
            `<span class="cont-label">para revisar hoje</span>` +
          `</div>` +
          `<div class="zero-state" id="zeroState" hidden>` +
            `Nada para revisar hoje 🎉 — volte amanhã` +
          `</div>` +
        `</div>` +

        `<button class="cta" id="comecarBtn" disabled>Começar revisão</button>` +

      `</div>` +
    `</div>`;

  // Estado local
  let idiomaSel = 'ingles';
  let simSel    = null;   // null = "Todos os simulados"
  let _seq      = 0;      // guarda de sequência para contarRevisao

  const idiomaToggleEl = app.querySelector('#idiomaToggle');
  const simListaEl     = app.querySelector('#simLista');
  const contNumEl      = app.querySelector('#contNum');
  const zeroStateEl    = app.querySelector('#zeroState');
  const comecarBtn     = app.querySelector('#comecarBtn');

  function _getFiltros() {
    const f = { idioma: idiomaSel };
    if (simSel) { f.fonte = simSel.fonte; f.simulado = simSel.simulado; }
    return f;
  }

  async function recalcular() {
    const seq = ++_seq;
    contNumEl.textContent = '—';
    comecarBtn.disabled = true;
    zeroStateEl.hidden = true;

    let n = 0;
    try { n = await contarRevisao(_getFiltros()); } catch { n = 0; }

    if (seq !== _seq) return;  // resposta obsoleta — descarta

    contNumEl.textContent = String(n);
    if (n > 0) {
      comecarBtn.disabled = false;
    } else {
      zeroStateEl.hidden = false;
    }
  }

  idiomaToggleEl.addEventListener('click', e => {
    const btn = e.target.closest('.it-btn');
    if (!btn) return;
    idiomaSel = btn.dataset.idioma;
    idiomaToggleEl.querySelectorAll('.it-btn').forEach(b =>
      b.classList.toggle('sel', b === btn)
    );
    recalcular();
  });

  simListaEl.addEventListener('click', e => {
    const item = e.target.closest('.sim-item');
    if (!item) return;
    simSel = item.dataset.sim === 'todos' ? null : simulados[parseInt(item.dataset.sim, 10)];
    simListaEl.querySelectorAll('.sim-item').forEach(el =>
      el.classList.toggle('sel', el === item)
    );
    recalcular();
  });

  comecarBtn.addEventListener('click', () => {
    if (comecarBtn.disabled) return;
    iniciarRevisao(app, _getFiltros());
  });

  recalcular();  // contagem inicial
}

// ============================================================================
// Sessão de revisão (loop de cards + fim de sessão)
// ============================================================================

async function iniciarRevisao(app, filtros) {
  let matriz, sessao;
  try {
    [matriz, sessao] = await Promise.all([carregarMatriz(), iniciarSessao(filtros)]);
  } catch (e) {
    app.innerHTML =
      `<div class="loading-state">` +
        `<p>Não foi possível carregar as questões.</p>` +
        `<p style="font-size:.8rem;color:var(--muted2);margin-top:6px">Rode <code>npm run dev</code> para copiar os dados para public/.</p>` +
      `</div>`;
    console.error('[Sinapse] iniciarRevisao error:', e);
    return;
  }

  async function mostrarAtual() {
    const prox = sessao.atual();

    if (!prox) {
      const { feitas, acertosReconhecimento } = sessao.resumo();
      app.innerHTML =
        `<div class="sinapse-app">` +
          `<div class="fim-sessao">` +
            `<div class="fim-icone">✓</div>` +
            `<h2 class="fim-titulo">Sessão concluída</h2>` +
            `<p class="fim-stats">${feitas} questão${feitas !== 1 ? 'ões' : ''} · ${acertosReconhecimento} de reconhecimento certo</p>` +
            `<button class="cta" id="voltarBtn">Escolher outra revisão</button>` +
          `</div>` +
        `</div>`;
      app.querySelector('#voltarBtn').addEventListener('click', () => renderSelecao(app));
      return;
    }

    const { questao } = prox;
    const habCorreta = await descreverHabilidade(questao.habilidade);
    renderCard(app, { questao, matriz, habilidadeCorreta: habCorreta }, {
      onConcluir: async ({ recAcerto, confianca, resAcerto }) => {
        await sessao.registrar({ recAcerto, recConfianca: confianca, resAcerto });
        await mostrarAtual();
      },
    });
  }

  await mostrarAtual();
}

// ============================================================================
// Boot — roteador de telas
// ============================================================================

async function _boot() {
  await renderSelecao(document.getElementById('app'));
}

_boot().catch(err => console.error('[Sinapse] boot error:', err));
