# Contexto do Sinapse

> **Atualizado em 18/10/2026 (noite).** Último commit: `956039d` (já no GitHub, `main` = `origin/main`). Testes: **142 verdes** no app (Vitest) e **59** na fábrica (pytest).
> Este arquivo é a "foto" do projeto para o Claude. **Substitua-o no Projeto sempre que fechar uma etapa.**

## ⏰ Prazo que manda em tudo
- **ENEM 2026, 1º dia: domingo, 8/11.** Cai Linguagens + Ciências Humanas + Redação, em 5h30.
- **2º dia: 15/11.** Cai Natureza + Matemática. ([fonte: Inep](https://www.gov.br/inep/pt-br/centrais-de-conteudo/noticias/enem/enem-2026-falta-um-mes-para-o-primeiro-dia-de-provas))
- **Prioridade até lá:** colocar o app no tablet dela (**deploy protegido + instalação**) **antes** de qualquer polimento. O PWA já está pronto.

## O que é
Um PWA de estudo para Linguagens do ENEM. Para cada questão, ela segue três passos:
1. **Reconhece a habilidade** (H1–H30) e diz o quanto tinha certeza.
2. **Resolve** a questão.
3. Vê a **revelação comentada**.

Um SRS (SM-2 adaptado, acerto × confiança) agenda a próxima vez que cada questão volta. O **mapa do cérebro** mostra as 30 habilidades acendendo conforme o domínio.

O app é presente para a namorada do Lucas (Medicina, ~10h/dia, tablet que **não é** iPad) e também projeto de portfólio público.

## Repositório
- **`pipeline/` (fábrica, Python + Pydantic)**:
  - `adaptadores/sas.py` (o parser);
  - `nucleo/` (`modelos.py`, `imagens.py`, `escrever.py`, `validar.py` (ainda stub));
  - `extrair.py`;
  - `tests/`.

  Ela lê os PDFs de `data/raw/` (fora do git) e gera `data/processed/questoes.json` (**350 questões**, 1,4 MB) e `imagens/` (**75 PNGs**, 4,7 MB), também fora do git. São 7 pares prova+gabarito: SAS 2024 Simulados 1–6 e SAS 2026 Simulado 1.
- **`data/matriz/habilidades_enem.json`**: a matriz oficial, com 9 competências e 30 habilidades.
- **`app/` (PWA, JS puro + Vite 5.4, sem framework)**:
  - `scripts/copiar-dados.mjs` (rodado no `predev` e no `prebuild`) copia o banco para `app/public/`;
  - `vite.config.js` com o **`vite-plugin-pwa` 2.0** (desligado quando `process.env.VITEST`);
  - `public/icons/` (192, 512, maskable 512, apple-touch, favicon.svg), **agora no git**;
  - fontes Sora + Figtree **locais** via `@fontsource` 5.3 (importadas no topo do `ui.js`).
- **`.gitignore`**: de `app/public/` ignora **só** `questoes.json`, `habilidades.json` e `imagens/`. `dist/` e `app/js/perfil.local.js` também ficam fora.
- **`PLANEJAMENTO.md`**: o documento vivo, com o quadro de andamento no §8. **`CLAUDE.md`**: as convenções que o Claude Code segue.
- **`projeto-claude/`**: estes arquivos de contexto.

### Mapa do app (`app/js/`)
- **`dados.js`** (Repository, o único que fala com o IndexedDB):
  - `carregarQuestoes()`, `carregarMatriz()`, `questaoPorId`, `listarPorHabilidade`, `listarPorCompetencia`, `descreverHabilidade(n)` → `{numero, descricao, competencia:{numero,nome}}`;
  - `lerProgresso`, `salvarProgresso`, `lerTodoProgresso()` → `Record<id,estado>`, `limparProgresso`;
  - usa `fetch("/questoes.json")` e `fetch("/habilidades.json")` com **caminho absoluto**, o que só funciona se o deploy for na **raiz** do domínio (num subcaminho, ajustar `base` do Vite, esses `fetch`, `start_url`/`scope` do manifest).
- **`srs.js`** (puro, datas como **número inteiro de dia**):
  - constantes de nota `ERREI`, `ERRO_CONFIANTE`, `DIFICIL`, `BOM`, `FACIL` e de confiança `CHUTEI`, `DUVIDA`, `CERTEZA`;
  - `config` (`novasPorDia` 20, `retentativa` 6, `intervaloMax` 45…), `derivarNota`, `pior`, `estadoInicial`;
  - `revisar(card, {recAcerto, recConfianca, resAcerto, tempoMs}, hoje)`;
  - `contarNovasHoje`, `construirFila(cards, hoje, cfg, filtros)`;
  - `forcaHabilidade(cards,h)` → `0..1 | null`, `dominio(cards,h)` → `0..1`.
- **`estudo.js`** (domínio da sessão):
  - `hojeEmDias()` (dia **local**, via `_diaLocal`);
  - `_filtrarQuestoes` (idioma padrão `'ingles'`);
  - `listarSimulados()`, `contarRevisao(filtros)`, `mapaCerebro(filtros)`;
  - `resumoInicio()` → `{revisaoHoje, dominadas, total, streak, questoesSemana}`;
  - `iniciarSessao(filtros)` → `{atual(), registrar({…, tempoMs}), resumo()}`, onde o `resumo()` já inclui tempo total, médio e o da mais demorada.
- **`perfil.js`**: `NOME`, vindo de `perfil.local.js` (**fora do git**) via `import.meta.glob`; `FRASES` (`{texto, autor}`); `saudacao(hora)`; `fraseDoDia(dia)`.
- **`tempo.js`**: `formatarTempo(ms)` e `criarCronometro(agora)`, que é pausável e tem relógio injetável.
- **`reflow.js`**: `reflowEnunciado(texto)`, que junta as linhas quebradas pela coluna do PDF.
- **`ui.js`** (telas): `renderHome` (a home é o centro da navegação), `renderSelecao`, `iniciarRevisao`, `renderCard` (as 3 telas + timer) e `renderProgresso` (o mapa do cérebro). No fim, na seção Boot: `_mostrarAviso(texto, rotuloBotao, acao)` (toast `.aviso-pwa`, anexado ao `body`), o `registerSW` de `virtual:pwa-register` e o `_boot`, que começa pela `renderHome`.

### Comandos
- **App:** `cd app` e depois `npm test`, `npm run dev` (abre em `localhost:5173` ou `5174`), ou `npm run build` + `npm run preview` (`localhost:4173`, o único lugar local onde o service worker roda).
- **Fábrica:** `cd pipeline`, `python extrair.py` e `pytest`.

## O que já está pronto ✅
- **Fábrica completa:** 7 de 7 pares, 350 questões (35 em inglês, 35 em espanhol, 280 sem idioma), 75 imagens.
- **SRS completo:** acerto × confiança; erro confiante pesa mais; a nota final é a pior entre reconhecimento e resolução; força e domínio são calculados a partir do **reconhecimento**; o limite de novas é **diário e global**.
- **Telas:**
  - **Início:** saudação por horário com o nome dela, frase do dia, "Revisão de hoje — N", os 3 pulsos (dominadas, dias seguidos, questões na semana) e atalhos.
  - **Escolher treino:** idioma (inglês por padrão) + simulado, com "N para revisar hoje" ao vivo.
  - **Card em 3 etapas:** reconhecer + confiança → resolver → revelação comentada, com o aviso do SRS.
  - **Mapa do cérebro:** neurônios por competência, com faixas verde ≥ 0,8 · âmbar 0,5–0,8 · rosado (fraca) < 0,5 · cinza (sem dados), e detalhe ao tocar.
  - **Fim de sessão:** tempos + a referência do ENEM.
- **Sair da sessão sem perder resposta:** a seta curvada fica no canto superior direito, igual em todas as telas.
- **Timer:** o olho esconde o tempo e a escolha fica lembrada; pausa quando ela sai do app; congela na revelação.
- **Reflow do enunciado:** os parágrafos ocupam a largura do card, e poemas e cartazes ficam intactos.
- **PWA instalável e 100% offline (18/10)** — commits `4c47200` (6a) e `e155bc3` (6b):
  - fontes locais, favicon, apple-touch-icon;
  - manifest gerado pelo plugin (`id: '/'`, nome, 3 ícones incluindo o maskable, `standalone`, cores "noite neural");
  - **precache de tudo na instalação**: 109 arquivos, ~6,4 MB (banco, 75 imagens, só os `.woff2`);
  - `registerType: 'prompt'`: aviso "Pronto para estudar offline" (some em 4 s) e "Nova versão disponível" + **Atualizar** (fica até ela tocar; **nunca** recarrega sozinho);
  - testado no `preview`: SW ativo, questão com imagem abrindo em **Offline**, troca de versão #856 → #857 sem recarregar no meio da questão.

## ▶️ Próximo passo exato
1. **Decidir a proteção da versão dela** (tabela abaixo). **Reconferir preços e limites na web** antes de decidir, porque a pesquisa é de 23/09.
2. **Deploy em HTTPS, na raiz do domínio** (evita mexer em `base`, `fetch` e `scope`). O build precisa dos dados do SAS, que **não estão no git**. Então o build roda na máquina do Lucas e se publica a pasta `app/dist/` pronta (upload direto / CLI), **não** um build automático a partir do GitHub.
3. **Instalar no tablet dela**: abrir o endereço no Chrome do tablet → "Instalar app" → abrir uma vez online (para o precache) → testar em modo avião.
4. No tablet, testar também o **"Atualizar" online**: publicar uma versão nova e ver o aviso aparecer e trocar a versão.
5. Primeira rodada de feedback dela.

## ⚖️ Decisão pendente: como proteger a versão dela
O `questoes.json` tem o conteúdo integral do SAS, então a versão dela não pode ficar aberta. Pesquisa feita em **23/09/2026** (vale reconferir):

| Opção | Custo | Prós | Contras |
|---|---|---|---|
| **A) Cloudflare Pages + Access** (código por e-mail) | Grátis (Zero Trust free, < 50 usuários) | Protege de verdade, sem código | O login pode reaparecer dentro do app instalado quando a sessão expira; precisa conferir se o Access deixa passar o `sw.js`/manifest e se o app abre offline com a sessão expirada |
| **B) Senha no app** (banco criptografado com Web Crypto; ela digita a senha 1 vez por aparelho) | Grátis em qualquer host | Combina com offline e app instalado; bom ponto de portfólio | Exige uma fase a mais (~2–3 prompts); a força depende da senha |
| **C) Link secreto** | Grátis | Simples | **Não protege** |
| **D) Netlify ou Vercel com senha** | Pago (Pro; na Vercel, US$ 20/mês por projeto) | Simples | Descartada pelo custo |

- A recomendação técnica foi a **B**.
- **Com o prazo de 8/11**, a **A** pode ser o caminho mais rápido de proteção real.
- O Lucas decide.

## Decisões tomadas (não reabrir sem motivo)
- **D-01:** Nome **Sinapse**, identidade visual "noite neural": fundo `#0b0c16`, roxo `--synapse #8b7bf5`, ciano `--signal #3fc7f4`, fontes Sora + Figtree.
- **D-02:** Stack sem framework. Python + Pydantic na fábrica (padrão Adapter); JS puro + Vite no app, com Repository no `dados.js` e camadas dados ↔ domínio ↔ UI. React só na v2.
- **D-03:** **Card = a questão**, num fluxo único de 3 telas. A **confiança é perguntada antes** da revelação.
- **D-04:** O SRS é o do §7. A força e o domínio vêm do **reconhecimento**, e não da nota final.
- **D-05 (22/09):** Foco no **coração**, a revisão espaçada diária. O modo "simulado em ordem Q1→Q45" foi **adiado**.
- **D-06 (22/09):** O **espanhol fica excluído por padrão**, porque ela treina só inglês. Isso é garantido por teste.
- **D-07 (23/09):** O nome dela fica em `perfil.local.js`, **fora do git** (o repositório é público).
- **D-08 (23/09):** **Dia local**, e não UTC. Em UTC, o dia virava às 21h de Brasília.
- **D-09 (23/09):** **`novasPorDia` é um limite diário e global**, que desconta as novas já iniciadas hoje.
- **D-10 (23/09):** A **seta curvada** de voltar ao início fica no **canto superior direito** de todas as telas. Ao sair da revelação, a resposta é salva antes.
- **D-11 (23/09):** O **timer grava sempre** e só **mostra se ela quiser**. Ele pausa fora do app e mede até "Confirmar". O tempo é só registro e **não** afeta o SRS. A referência de ~3 min por questão aparece **só no resumo final**.
- **D-12 (23/09):** O reflow é feito **na exibição** (os dados brutos ficam intactos) e foi **calibrado nos 350 enunciados reais**. Os limiares são **0,72** da largura da coluna e mínimo de **30**. **Não "melhore" esses números sem testar de novo nos dados reais.**
- **D-13:** Ícones sempre em **SVG**, nunca emoji, e frases do dia sempre com **fonte conferida**.
- **D-14:** Modelos: **Sonnet** no Claude Code para implementar; **Opus** aqui para arquitetar e revisar.
- **D-15 (18/10):** **PWA com `vite-plugin-pwa` (generateSW)**, com **precache total** na instalação (o app inteiro funciona sem rede desde o 1º uso) e atualização **por aviso** (`registerType: 'prompt'`): **nunca recarregar sozinho**, para não perder uma questão em andamento. O toast vai no `body`, nunca no `#app`, porque as telas substituem o conteúdo do `#app`.
- **D-16 (18/10):** **Fontes locais** (`@fontsource`, pesos Sora 500/600/700 e Figtree 400–700). O **Sora 500** fica mesmo sem uso explícito no CSS: onde a Sora não tem peso definido, o navegador pede o 400 e cai no 500.

## 🪤 Armadilhas já vividas (não repetir)
- **Git pela ligação com o computador** deixa o `.git/index.lock` travado. Todo o git fica com o Lucas, no PowerShell.
- **Prompt grande com effort High** deixa o Claude Code "pensando" por mais de 30 minutos. Quebre em passos Medium.
- **Gabarito 2026:** o formato é diferente do de 2024 ("Gabarito:" em vez de "Resposta correta:", e "CORRETA./INCORRETA." em vez de "(V)/(F)"). A função de localizar a seção é compartilhada entre prova e gabarito.
- **Fim da prova:** o recorte de coluna quebra "PROPOSTA DE REDAÇÃO" em "PROPOSTA D", por isso o corte procura `^PROPOSTA D`.
- **Listener** de clique colocado no `#app` vaza a cada troca de tela. Anexe em elementos que são recriados a cada render.
- **Altura do card:** a imagem carregando depois corta o palco. Isso foi resolvido com `ResizeObserver` e imagens sem `lazy`.
- **CSS:** dois elementos com `margin-left: auto` no mesmo cabeçalho jogam a tag "TREINO" para o meio.
- **Service worker** não roda no `npm run dev`. No tablet, ele só funciona com HTTPS, ou seja, depois do deploy.
- **Cada endereço tem seu próprio progresso** (5173, 5174, 4173 e o domínio do deploy são "apps" diferentes no navegador). O progresso dela começa do zero no endereço final.
- **Testar "Atualizar" com a rede em Offline** gera 2 erros no console (o navegador não consegue buscar o `sw.js` novo). É benigno: a versão nova assume quando a rede volta. Teste o fluxo de atualização **online**.
- **`npm install` sem versão** pode trazer uma major nova (veio o `vite-plugin-pwa` 2.0 em vez do 1.x). Confira o `peerDependencies` no `node_modules` antes de aprovar.
- **`.cta`** tem `width: 100%` e `margin-top`; não reaproveite essa classe em botão pequeno.

## 🧹 Pendências de dados (`validar.py`, depois do deploy)
- Linhas **"ENEM2024AZUL"** (marca d'água) no enunciado, por exemplo em SAS2024-S2-Q22 e S5-Q02-EN.
- **Texto embaralhado de cartaz** (letras soltas), por exemplo em SAS2024-S5-Q06 e S2-Q27.
- **2 alternativas residuais** de 2026: Q10-E e Q39-E.
- **5 questões de 2026 sem o texto de apoio:** Q06 a Q10.
- Detector de palavras coladas (por exemplo, "aesperança").

## 📋 Backlog (depois do ENEM, ou guiado pelo feedback dela)
- **Toast do PWA cobre o fim da página:** enquanto o `.aviso-pwa` estiver aberto, dar um `padding-bottom` extra ao conteúdo, para ele não cobrir a caixa do SRS nem o "Próxima questão" em telas menores.
- **Treino livre (§5.2):** treinar uma habilidade específica e o modo "focar nas minhas fracas".
- "N a revisar" em cada simulado da seleção.
- Frases do dia reais, com fonte conferida.
- Modo "simulado em ordem".
- Detalhe da habilidade com evolução ao longo do tempo (v2).
- Screenshots no manifest (para a tela de instalação mais rica; opcional).
- README de portfólio + versão pública com um mini-dataset de exemplo.
