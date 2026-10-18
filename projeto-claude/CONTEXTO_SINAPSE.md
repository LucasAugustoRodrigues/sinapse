# Contexto do Sinapse

> **Atualizado em 18/10/2026.** Último commit: `b868c98` (já no GitHub, `main` = `origin/main`). Testes: **142 verdes** no app (Vitest) e **59** na fábrica (pytest).
> Este arquivo é a "foto" do projeto para o Claude. **Substitua-o no Projeto sempre que fechar uma etapa.**

## ⏰ Prazo que manda em tudo
- **ENEM 2026, 1º dia: domingo, 8/11.** Cai Linguagens + Ciências Humanas + Redação, em 5h30.
- **2º dia: 15/11.** Cai Natureza + Matemática. ([fonte: Inep](https://www.gov.br/inep/pt-br/centrais-de-conteudo/noticias/enem/enem-2026-falta-um-mes-para-o-primeiro-dia-de-provas))
- **Prioridade até lá:** colocar o app no tablet dela (PWA + deploy) **antes** de qualquer polimento.

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
- **`app/` (PWA, JS puro + Vite 5, sem framework)**: o `scripts/copiar-dados.mjs` (rodado no `predev` e no `prebuild`) copia o banco para `app/public/`.
- **`PLANEJAMENTO.md`**: o documento vivo, com o quadro de andamento no §8. **`CLAUDE.md`**: as convenções que o Claude Code segue.
- **`projeto-claude/`**: estes arquivos de contexto.

### Mapa do app (`app/js/`)
- **`dados.js`** (Repository, o único que fala com o IndexedDB):
  - `carregarQuestoes()`, `carregarMatriz()`, `questaoPorId`, `listarPorHabilidade`, `listarPorCompetencia`, `descreverHabilidade(n)` → `{numero, descricao, competencia:{numero,nome}}`;
  - `lerProgresso`, `salvarProgresso`, `lerTodoProgresso()` → `Record<id,estado>`, `limparProgresso`;
  - usa `fetch("/questoes.json")` e `fetch("/habilidades.json")` com **caminho absoluto**, o que precisa de ajuste se o deploy for num subcaminho.
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
- **`ui.js`** (telas): `renderHome` (a home é o centro da navegação), `renderSelecao`, `iniciarRevisao`, `renderCard` (as 3 telas + timer) e `renderProgresso` (o mapa do cérebro). O `_boot` começa pela `renderHome`.

### Comandos
- **App:** `cd app` e depois `npm test`, `npm run dev` (abre em `localhost:5174`), ou `npm run build` + `npm run preview`.
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
- **Ícones do PWA** gerados em `app/public/icons/`: 192, 512, maskable 512, apple-touch e favicon.svg. **Ainda não estão no git**, porque `app/public/` está inteiro no `.gitignore`. O prompt 6a corrige isso.

## ▶️ Próximo passo exato
1. **PWA 6a:** fontes locais (@fontsource) + ícones no `index.html` + `.gitignore` só para os dados. O prompt está pronto no **Apêndice A**.
2. **PWA 6b:** `vite-plugin-pwa` (manifest, service worker, tudo em cache, offline e aviso de atualização). O prompt está pronto no **Apêndice B**. Teste com `npm run build` + `npm run preview`, depois DevTools → Application → modo Offline. Commite **conferindo o `git status`** (nada do SAS pode aparecer).
3. **Decidir a proteção da versão dela** (veja abaixo) e fazer o **deploy**.
4. **Instalar no tablet dela** e fazer a primeira rodada de feedback.

## ⚖️ Decisão pendente: como proteger a versão dela
O `questoes.json` tem o conteúdo integral do SAS, então a versão dela não pode ficar aberta. Pesquisa feita em **23/09/2026** (vale reconferir):

| Opção | Custo | Prós | Contras |
|---|---|---|---|
| **A) Cloudflare Pages + Access** (código por e-mail) | Grátis (Zero Trust free, < 50 usuários) | Protege de verdade, sem código | O login pode reaparecer dentro do app instalado quando a sessão expira |
| **B) Senha no app** (banco criptografado com Web Crypto; ela digita a senha 1 vez por aparelho) | Grátis em qualquer host | Combina com offline e app instalado; bom ponto de portfólio | Exige uma fase a mais (~2–3 prompts); a força depende da senha |
| **C) Link secreto** | Grátis | Simples | **Não protege** |
| **D) Netlify ou Vercel com senha** | Pago (Pro; na Vercel, US$ 20/mês por projeto) | Simples | Descartada pelo custo |

- A recomendação técnica foi a **B**.
- **Com o prazo de 8/11**, a **A** pode ser o caminho mais rápido de proteção real.
- O Lucas decide.
- Lembrete do deploy: se a hospedagem usar um subcaminho (por exemplo, GitHub Pages em `/sinapse/`), é preciso ajustar o `base` do Vite e os `fetch` absolutos do `dados.js`.

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

## 🪤 Armadilhas já vividas (não repetir)
- **Git pela ligação com o computador** deixa o `.git/index.lock` travado. Todo o git fica com o Lucas, no PowerShell.
- **Prompt grande com effort High** deixa o Claude Code "pensando" por mais de 30 minutos. Quebre em passos Medium.
- **Gabarito 2026:** o formato é diferente do de 2024 ("Gabarito:" em vez de "Resposta correta:", e "CORRETA./INCORRETA." em vez de "(V)/(F)"). A função de localizar a seção é compartilhada entre prova e gabarito.
- **Fim da prova:** o recorte de coluna quebra "PROPOSTA DE REDAÇÃO" em "PROPOSTA D", por isso o corte procura `^PROPOSTA D`.
- **Listener** de clique colocado no `#app` vaza a cada troca de tela. Anexe em elementos que são recriados a cada render.
- **Altura do card:** a imagem carregando depois corta o palco. Isso foi resolvido com `ResizeObserver` e imagens sem `lazy`.
- **CSS:** dois elementos com `margin-left: auto` no mesmo cabeçalho jogam a tag "TREINO" para o meio.
- **Service worker** não roda no `npm run dev`. No tablet, ele só funciona com HTTPS, ou seja, depois do deploy.

## 🧹 Pendências de dados (`validar.py`, depois do deploy)
- Linhas **"ENEM2024AZUL"** (marca d'água) no enunciado, por exemplo em SAS2024-S2-Q22 e S5-Q02-EN.
- **Texto embaralhado de cartaz** (letras soltas), por exemplo em SAS2024-S5-Q06 e S2-Q27.
- **2 alternativas residuais** de 2026: Q10-E e Q39-E.
- **5 questões de 2026 sem o texto de apoio:** Q06 a Q10.
- Detector de palavras coladas (por exemplo, "aesperança").

## 📋 Backlog (depois do ENEM, ou guiado pelo feedback dela)
- **Treino livre (§5.2):** treinar uma habilidade específica e o modo "focar nas minhas fracas".
- "N a revisar" em cada simulado da seleção.
- Frases do dia reais, com fonte conferida.
- Modo "simulado em ordem".
- Detalhe da habilidade com evolução ao longo do tempo (v2).
- README de portfólio + versão pública com um mini-dataset de exemplo.

---

## Apêndice A — Prompt 6a (pronto) · [Sonnet] · effort Low

**CONTEXTO**
Estamos preparando o app para funcionar **offline**. Hoje as fontes Sora e Figtree vêm do Google Fonts (tem um `TODO(fase-6)` no `index.html`). Os ícones já estão em `app/public/icons/`: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` e `favicon.svg`. **Não** gere nem altere ícones.

**OBJETIVO**
1. **Fontes locais:** em `app/`, rode `npm install @fontsource/sora @fontsource/figtree` (dependência normal). No **topo** de `app/js/ui.js`, importe:
   ```js
   import '@fontsource/sora/500.css';
   import '@fontsource/sora/600.css';
   import '@fontsource/sora/700.css';
   import '@fontsource/figtree/400.css';
   import '@fontsource/figtree/500.css';
   import '@fontsource/figtree/600.css';
   import '@fontsource/figtree/700.css';
   ```
   No `app/index.html`, **remova** os dois `preconnect`, o `<link>` do Google Fonts e o comentário `TODO(fase-6)`.
2. **Ícones no `index.html`:** `<link rel="icon" type="image/svg+xml" href="/icons/favicon.svg" />` e `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />`.
3. **`.gitignore` (raiz):** troque a linha `app/public/` por estas três:
   ```
   app/public/questoes.json
   app/public/habilidades.json
   app/public/imagens/
   ```
   **Os dados do SAS nunca podem ir pro git.** Confira no `copiar-dados.mjs` que essas três linhas cobrem tudo o que ele escreve.

**NÃO FAÇA:** não mexa em manifest nem em service worker. Não toque nos testes nem na lógica. Não rode git. Rode `npm test` (tem que continuar com **142**) e `npm run dev`, e confirme que as fontes carregam sem erro. **Não commite.**

---

## Apêndice B — Prompt 6b (pronto) · [Sonnet] · effort Medium

**CONTEXTO**
Vamos transformar o app num **PWA instalável e 100% offline** usando o `vite-plugin-pwa` (Workbox). Os dados (`questoes.json` ~1,4 MB, `habilidades.json` e `imagens/` ~4,7 MB, 75 PNGs) são copiados para `app/public/` antes do build. Então **tudo** entra no cache já na instalação.

**OBJETIVO**
1. `npm install -D vite-plugin-pwa` em `app/`.
2. **Crie `app/vite.config.js`**:
   ```js
   import { defineConfig } from 'vite';
   import { VitePWA } from 'vite-plugin-pwa';

   export default defineConfig({
     plugins: process.env.VITEST ? [] : [
       VitePWA({
         registerType: 'prompt',
         injectRegister: false,
         includeAssets: ['icons/*'],
         manifest: {
           name: 'Sinapse',
           short_name: 'Sinapse',
           description: 'Revisão espaçada de Linguagens para o ENEM.',
           lang: 'pt-BR',
           start_url: '/',
           scope: '/',
           display: 'standalone',
           orientation: 'any',
           background_color: '#0b0c16',
           theme_color: '#0b0c16',
           icons: [
             { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
             { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
             { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
           ],
         },
         workbox: {
           globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
           maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
           navigateFallback: 'index.html',
         },
       }),
     ],
   });
   ```
   Se o Vitest reclamar do arquivo de config, mantenha a guarda `process.env.VITEST` e ajuste só o mínimo.
3. **Remova os esqueletos antigos**: `app/manifest.webmanifest`, `app/service-worker.js` e a linha `<link rel="manifest" ...>` do `index.html`.
4. **Registro + aviso de atualização**, em `ui.js`:
   ```js
   import { registerSW } from 'virtual:pwa-register';
   const updateSW = registerSW({
     onNeedRefresh() { _mostrarAviso('Nova versão disponível', 'Atualizar', () => updateSW(true)); },
     onOfflineReady() { _mostrarAviso('Pronto para estudar offline', null, null); },
   });
   ```
   - `_mostrarAviso(texto, rotuloBotao, acao)` mostra um **toast fixo no rodapé** (`.aviso-pwa`) no estilo "noite neural": fundo `var(--panel2)`, borda `var(--line)`, texto `var(--ink)` e botão no estilo `.cta` pequeno.
   - O aviso de offline some sozinho depois de ~4s.
   - O de atualização fica até ela tocar. **Nunca** recarregue sozinho: o recarregamento só acontece pelo botão, para não perder uma questão em andamento.
   - Se `document.body` ainda não existir, espere o `DOMContentLoaded`.

**NÃO FAÇA:** não mude `base` nem caminhos de `fetch` (isso é do deploy). Não toque em `srs.js`, `estudo.js`, `dados.js`, `perfil.js`, `tempo.js`, `reflow.js` nem nos testes. Não rode git. Rode `npm test` (tem que continuar com **142**) e `npm run build`, e diga se o build terminou sem erro e **quantos arquivos o Workbox pré-cacheou**. **Não commite.**

**Como testar:**
1. Rode `npm run build` e depois `npm run preview`, e abra `localhost:4173`. O progresso começa zerado porque o endereço é outro, e isso é normal.
2. No DevTools → Application, confira o **Manifest** (nome e ícones) e o **Service worker** (status *activated*).
3. Na aba Network, marque **Offline** e recarregue: o app tem que abrir e uma questão com imagem tem que funcionar.
4. Para commitar: rode `git add -A app .gitignore` e depois `git status`. **Na lista não pode aparecer** `questoes.json`, `habilidades.json` nem `imagens/`.
