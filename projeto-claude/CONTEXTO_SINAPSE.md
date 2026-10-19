# Contexto do Sinapse

> **Atualizado em 18/10/2026 (noite, fim da senha no app).** Último commit: `45f1569` (já no GitHub, `main` = `origin/main`). Testes: **196 verdes** no app (Vitest) e **59** na fábrica (pytest).
> Este arquivo é a "foto" do projeto para o Claude. **Substitua-o no Projeto sempre que fechar uma etapa.**

## ⏰ Prazo que manda em tudo
- **ENEM 2026, 1º dia: domingo, 8/11.** Cai Linguagens + Ciências Humanas + Redação, em 5h30.
- **2º dia: 15/11.** Cai Natureza + Matemática. ([fonte: Inep](https://www.gov.br/inep/pt-br/centrais-de-conteudo/noticias/enem/enem-2026-falta-um-mes-para-o-primeiro-dia-de-provas))
- **Prioridade até lá:** colocar o app no tablet dela. O PWA e a **senha no app** já estão prontos; falta **deploy + instalação** (fatia 7e) **antes** de qualquer polimento.

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

  Ela lê os PDFs de `data/raw/` (fora do git) e gera `data/processed/questoes.json` (**350 questões**, 1,4 MB) e `imagens/` (**78 PNGs**, 4,7 MB), também fora do git. São 7 pares prova+gabarito: SAS 2024 Simulados 1–6 e SAS 2026 Simulado 1.
- **`data/matriz/habilidades_enem.json`**: a matriz oficial, com 9 competências e 30 habilidades (pública, vai em claro).
- **`app/` (PWA, JS puro + Vite 5.4, sem framework)**:
  - `scripts/preparar-dados.mjs` (rodado no `predev` e no `prebuild`): copia o `habilidades.json`, **apaga** do `public/` qualquer `questoes.json`/`imagens/` em claro, lê a senha de `SINAPSE_SENHA` (falha com código 1 se faltar), usa o sal de `app/.sal-banco` (gera na 1ª vez) e grava **`public/banco.enc`** (~5,8 MB). Se faltar imagem citada por questão, falha.
  - `scripts/verificar-dist.mjs` (rodado no `postbuild`): **bloqueia o build** se houver no `dist/` `questoes.json`, pasta `imagens/`, imagem fora de `icons/`, texto com `"enunciado"`/`"alternativas"`, `banco.enc` ausente/sem a mágica `SNP1`, ou `sw.js` sem o `banco.enc`.
  - `vite.config.js` com o **`vite-plugin-pwa` 2.0** (desligado quando `process.env.VITEST`); `globPatterns` inclui `enc`; `maximumFileSizeToCacheInBytes` = 10 MB. Precache: **31 entradas, ~6,1 MB**.
  - `public/icons/` (192, 512, maskable 512, apple-touch, favicon.svg), no git;
  - fontes Sora + Figtree **locais** via `@fontsource` 5.3 (importadas no topo do `ui.js`).
- **`.gitignore`**: de `app/public/` ignora `questoes.json`, `habilidades.json`, `imagens/` e **`banco.enc`**; ignora também **`app/.sal-banco`**, `dist/` e `app/js/perfil.local.js`.
- **`PLANEJAMENTO.md`**: o documento vivo, com o quadro de andamento no §8. **`CLAUDE.md`**: as convenções que o Claude Code segue.
- **`projeto-claude/`**: estes arquivos de contexto.

### Mapa do app (`app/js/`)
- **`cripto.js`** (puro, Web Crypto nativa; roda no Node 22 e no navegador):
  - `ITERACOES_PADRAO` = 600 000 (OWASP, PBKDF2-HMAC-SHA256), `MAGICA` = `'SNP1'`, `ErroSenha`, `ErroPacote`;
  - `normalizarSenha(s)` → NFC, minúsculas, sem espaços nas pontas, espaços internos colapsados (contra a maiúscula automática e o espaço extra do teclado do tablet);
  - `derivarChave(senha, sal, iteracoes, usos=['decrypt'])` → `CryptoKey` AES-GCM 256 **não-extraível**;
  - `empacotarConteudo({questoes, imagens: Map})` / `desempacotarConteudo(bytes)`: `[u32 tam. índice][índice JSON][bytes das imagens]`;
  - `cifrarPacote(chave, conteudo, {sal, iteracoes})` / `lerCabecalho(pacote)` / `decifrarPacote(chave, pacote)`: pacote = `SNP1` + u32 + cabeçalho JSON `{v:1, kdf, iteracoes, sal, iv}` + cifrado; o **cabeçalho inteiro é o AAD** do GCM (adulterar sal/iv/iterações é detectado); IV novo a cada cifragem.
- **`dados.js`** (Repository, o único que fala com o armazenamento):
  - IndexedDB `sinapse` **v2**, stores `progresso` e `chave` (upgrade seguro: cria só o que falta; `onversionchange` fecha a conexão);
  - `desbloquear(senha)` (baixa `/banco.enc`, deriva, decifra; **só grava a chave depois de abrir**), `tentarChaveSalva()` → boolean (senha uma vez por aparelho; apaga a chave e devolve `false` se o sal, as iterações ou a senha mudarem), `estaDesbloqueado()`, `urlImagem(caminho)` → blob URL | null, `esquecerAparelho()`, `pedirArmazenamentoPersistente()`, `_redefinirParaTestes()`; reexporta `ErroSenha`;
  - registro no store `chave`: `{chave: CryptoKey, sal: hex, iteracoes}` sob a chave `"banco"`. **O banco decifrado fica só em memória.**
  - `carregarQuestoes()` (lança se bloqueado), `carregarMatriz()` (`fetch("/habilidades.json")`), `questaoPorId`, `listarPorHabilidade`, `listarPorCompetencia`, `descreverHabilidade(n)`;
  - `lerProgresso`, `salvarProgresso`, `lerTodoProgresso()`, `limparProgresso`;
  - `fetch` com **caminho absoluto** (`/banco.enc`, `/habilidades.json`): só funciona com deploy na **raiz** do domínio.
- **`srs.js`** (puro, datas como **número inteiro de dia**): constantes de nota e confiança, `config` (`novasPorDia` 20, `retentativa` 6, `intervaloMax` 45…), `derivarNota`, `pior`, `estadoInicial`, `revisar(...)`, `contarNovasHoje`, `construirFila(...)`, `forcaHabilidade`, `dominio`.
- **`estudo.js`** (domínio da sessão): `hojeEmDias()` (dia **local**), `_filtrarQuestoes` (idioma padrão `'ingles'`), `listarSimulados()`, `contarRevisao(filtros)`, `mapaCerebro(filtros)`, `resumoInicio()`, `iniciarSessao(filtros)`.
- **`perfil.js`**: `NOME`, vindo de `perfil.local.js` (**fora do git**) via `import.meta.glob`; `FRASES`; `saudacao(hora)`; `fraseDoDia(dia)`.
- **`tempo.js`**: `formatarTempo(ms)` e `criarCronometro(agora)`.
- **`reflow.js`**: `reflowEnunciado(texto)`.
- **`ui.js`** (telas): `renderDesbloqueio(app, {onDesbloqueado})` (tela "Bem-vinda": campo de senha com `autocapitalize="none"`, `autocorrect="off"`, olho em SVG 44 px, "Decifrando…", "Senha incorreta. Confira e tente de novo."), `renderHome`, `renderSelecao`, `iniciarRevisao`, `renderCard` (imagens via `urlImagem`), `renderProgresso`. No fim: `_mostrarAviso`, `registerSW` e o `_boot`: `tentarChaveSalva()` → home direto; senão, tela de senha. Ao entrar, chama `pedirArmazenamentoPersistente()`.

### Comandos
- **Senha no terminal (mascarada, não fica no histórico do PowerShell; vale só para aquele terminal):**
  `$env:SINAPSE_SENHA = [System.Net.NetworkCredential]::new('', (Read-Host 'Senha do Sinapse' -AsSecureString)).Password`
- **App:** `cd app` e depois `npm test`, `npm run dev` (precisa da senha; abre em `localhost:5173` ou `5174`), ou `npm run build` (precisa da senha; termina com `[verificar-dist] OK`) + `npm run preview` (`localhost:4173`, o único lugar local onde o service worker roda).
- **Fábrica:** `cd pipeline`, `python extrair.py` e `pytest`.

## O que já está pronto ✅
- **Fábrica completa:** 7 de 7 pares, 350 questões (35 em inglês, 35 em espanhol, 280 sem idioma), 78 imagens.
- **SRS completo:** acerto × confiança; erro confiante pesa mais; nota final = a pior entre reconhecimento e resolução; força e domínio a partir do **reconhecimento**; limite de novas **diário e global**.
- **Telas:** Início, Escolher treino, Card em 3 etapas, Mapa do cérebro, Fim de sessão, seta de sair no canto superior direito, timer com olho, reflow do enunciado.
- **PWA instalável e 100% offline (18/10)**: fontes locais, manifest, precache total, aviso "Pronto para estudar offline" / "Nova versão disponível" + **Atualizar** (nunca recarrega sozinho).
- **Senha no app (Fase 7, 18/10)** — commits `f720264` (7a), `c4ef804` (7b1), `6876e00` (7b2), `ac90ba5` (7c), `45f1569` (7d):
  - banco **e** imagens num pacote só, `banco.enc`, cifrado com PBKDF2-SHA256 600 mil → AES-GCM 256;
  - o `dist/` não tem nada do SAS em claro, garantido pelo `verificar-dist` no `postbuild`;
  - senha **uma vez por aparelho** (chave não-extraível no IndexedDB);
  - **testado no `preview`:** senha certa → home; **em modo Offline**, F5 abre direto na home e a questão com imagem aparece (tudo vindo do precache); o progresso antigo do endereço sobreviveu ao upgrade do IndexedDB v1 → v2.

## ▶️ Próximo passo exato: fatia 7e, deploy + instalação (sem código novo)
1. **Escolher o nome do projeto no Cloudflare Pages.** Ele vira a URL `<nome>.pages.dev`. Algo neutro, **sem o nome dela**.
2. **Conferir na web** os comandos atuais do Wrangler para Direct Upload (a pesquisa de 18/10 indicou `npx wrangler pages project create` e `npx wrangler pages deploy dist --project-name <nome>`; limite de 25 MiB por arquivo e 20 000 arquivos; projeto Direct Upload não vira Git depois, o que não importa aqui). Usar via `npx`, **sem** adicionar o Wrangler ao `package.json`. Conferir se ele cria alguma pasta (ex.: `.wrangler/`) que precise ir para o `.gitignore`.
3. `npx wrangler login` (abre o navegador; conta grátis da Cloudflare) → criar o projeto → `npm run build` com a senha → deploy do `app/dist/`.
4. Testar no PC em `https://<nome>.pages.dev`: senha, home, F5 direto, modo Offline.
5. **Instalar no tablet dela** (de preferência com o Lucas digitando a senha): Chrome → endereço → senha → "Instalar app" → abrir uma vez online (precache; aqui deve aparecer "Pronto para estudar offline") → testar em **modo avião**.
6. **Testar o "Atualizar" online no tablet:** publicar um build novo (todo build gera um IV novo, então o `banco.enc` muda de revisão) e ver o aviso aparecer e trocar a versão.
7. Primeira rodada de feedback dela. **Meta: no tablet até ~1/11.**

## 🔐 Fase 7: senha no app, desenho final (D-17 + D-18)
**Modelo de ameaça (honesto):** o conteúdo do SAS **não fica legível para quem achar a URL ou o repositório**. Quem tem a senha consegue extrair o conteúdo, e isso é aceitável. A força depende da senha: **frase-senha de 5 a 6 palavras aleatórias, em minúsculas, separadas por espaço, sem acento**; passada pessoalmente, **nunca** em arquivo versionado.

- **Sal estável:** `app/.sal-banco` (fora do git) é gerado uma vez e reaproveitado em todo build. Assim a chave guardada no tablet continua valendo depois de cada deploy. Se o sal ou a senha mudarem, o app detecta e pede a senha de novo (uma vez). O IV muda a cada build.
- **A senha só é pedida de novo** se ela limpar os dados do site, trocar de aparelho ou o Lucas trocar a senha/sal. O progresso não depende da senha.
- **Progresso sem cifra** (só ids e números; quem tem o tablet já tem a chave).
- **Hospedagem:** Cloudflare Pages com Direct Upload (HTTPS, raiz do domínio, grátis). Descartadas: Netlify (plano grátis por créditos: 15 por deploy de produção, 300/mês, site **pausado** ao zerar) e GitHub Pages (subcaminho e exigiria versionar o `dist/`).

## Decisões tomadas (não reabrir sem motivo)
- **D-01:** Nome **Sinapse**, identidade visual "noite neural": fundo `#0b0c16`, roxo `--synapse #8b7bf5`, ciano `--signal #3fc7f4`, fontes Sora + Figtree.
- **D-02:** Stack sem framework. Python + Pydantic na fábrica (padrão Adapter); JS puro + Vite no app, com Repository no `dados.js` e camadas dados ↔ domínio ↔ UI. React só na v2.
- **D-03:** **Card = a questão**, num fluxo único de 3 telas. A **confiança é perguntada antes** da revelação.
- **D-04:** O SRS é o do §7. A força e o domínio vêm do **reconhecimento**, e não da nota final.
- **D-05 (22/09):** Foco no **coração**, a revisão espaçada diária. O modo "simulado em ordem Q1→Q45" foi **adiado**.
- **D-06 (22/09):** O **espanhol fica excluído por padrão**, porque ela treina só inglês. Isso é garantido por teste.
- **D-07 (23/09):** O nome dela fica em `perfil.local.js`, **fora do git** (o repositório é público).
- **D-08 (23/09):** **Dia local**, e não UTC.
- **D-09 (23/09):** **`novasPorDia` é um limite diário e global**.
- **D-10 (23/09):** A **seta curvada** de voltar ao início fica no **canto superior direito** de todas as telas.
- **D-11 (23/09):** O **timer grava sempre** e só **mostra se ela quiser**; não afeta o SRS.
- **D-12 (23/09):** O reflow é feito **na exibição**, calibrado nos 350 enunciados reais (limiares **0,72** e **30**). **Não "melhore" esses números sem testar de novo nos dados reais.**
- **D-13:** Ícones sempre em **SVG**, nunca emoji, e frases do dia sempre com **fonte conferida**.
- **D-14:** Modelos: **Sonnet** no Claude Code para implementar; **Opus** aqui para arquitetar e revisar.
- **D-15 (18/10):** **PWA com `vite-plugin-pwa` (generateSW)**, precache total e atualização **por aviso** (`registerType: 'prompt'`), **nunca recarregar sozinho**. O toast vai no `body`, nunca no `#app`.
- **D-16 (18/10):** **Fontes locais** (`@fontsource`).
- **D-17 (18/10):** **Proteção da versão dela = opção B (senha no app)**, com o banco **e as imagens** cifrados com a Web Crypto, a chave guardada como `CryptoKey` não-extraível no IndexedDB e deploy estático do `dist/` montado localmente.
- **D-18 (18/10):** Desenho final da senha: **um pacote só** (`banco.enc`) com o **cabeçalho autenticado** (AAD do GCM); **PBKDF2-SHA256 600 mil** (OWASP); **sal estável** em `app/.sal-banco` fora do git; senha **normalizada** (NFC + minúsculas + espaços); banco **cifrado também no `dev`** (um caminho só; o JSON em claro nunca entra no `public/`); **progresso sem cifra**; `verificar-dist` no `postbuild`; deploy no **Cloudflare Pages via Direct Upload**.

## 🪤 Armadilhas já vividas (não repetir)
- **Git pela ligação com o computador** deixa o `.git/index.lock` travado. Todo o git fica com o Lucas, no PowerShell.
- **A ligação com o computador não apaga arquivos.** Não criar arquivos temporários dentro da pasta do repositório (sobrou um `.teste-chave.mjs` em 18/10 que o Lucas teve de apagar). Teste rápido: rodar fora da pasta ou com `node -e`.
- **Prompt grande com effort High** deixa o Claude Code "pensando" por mais de 30 minutos. Quebre em passos Medium.
- **Senha nunca digitada direto como `$env:SINAPSE_SENHA = '...'`**: o PowerShell grava o comando em texto puro no histórico. Use o `Read-Host -AsSecureString` (em "Comandos").
- **Sem a senha no ambiente, `npm run dev` e `npm run build` falham** (código 1), de propósito. Cada terminal novo precisa da senha de novo.
- **Web Crypto só existe em contexto seguro** (HTTPS ou `localhost`). Não dá para testar no tablet por `http://192.168…`; no tablet, só depois do deploy.
- **"Pronto para estudar offline" só aparece na 1ª instalação** do service worker num endereço. Num endereço que já tinha uma versão (ex.: `localhost:4173`), aparece "Nova versão disponível" no lugar, e isso é o certo.
- **Gabarito 2026:** formato diferente do de 2024 ("Gabarito:" / "CORRETA./INCORRETA.").
- **Fim da prova:** o corte procura `^PROPOSTA D`.
- **Listener** de clique colocado no `#app` vaza a cada troca de tela. Anexe em elementos recriados a cada render.
- **Altura do card:** resolvido com `ResizeObserver` e imagens sem `lazy`.
- **CSS:** dois `margin-left: auto` no mesmo cabeçalho jogam a tag "TREINO" para o meio.
- **Service worker** não roda no `npm run dev`.
- **Cada endereço tem seu próprio progresso e sua própria chave** (5173, 5174, 4173 e o domínio do deploy são "apps" diferentes). O progresso dela começa do zero no endereço final.
- **Testar "Atualizar" com a rede em Offline** gera 2 erros benignos no console. Teste o fluxo de atualização **online**.
- **`npm install` sem versão** pode trazer uma major nova. Confira o `peerDependencies`.
- **`.cta`** tem `width: 100%` e `margin-top`; não reaproveite em botão pequeno.

## 🧹 Pendências de dados (`validar.py`, depois do deploy)
- Linhas **"ENEM2024AZUL"** (marca d'água) no enunciado, ex.: SAS2024-S2-Q22 e S5-Q02-EN.
- **Texto embaralhado de cartaz** (letras soltas ou invertidas, ex.: "kcotS ebodA"), ex.: SAS2024-S5-Q06, S2-Q27 e a tirinha "I forgot to put a smiley face" (SAS 2026 S1).
- **Recorte da imagem SAS2024-S1-Q19:** o PNG traz um pedaço de "TEXTO I" no topo; revisar a margem do recorte em `nucleo/imagens.py`.
- **2 alternativas residuais** de 2026: Q10-E e Q39-E.
- **5 questões de 2026 sem o texto de apoio:** Q06 a Q10.
- Detector de palavras coladas (por exemplo, "aesperança").

## 📋 Backlog (depois do ENEM, ou guiado pelo feedback dela)
- **Resíduos de UI:** trocar o emoji 🎉 de "Tudo em dia" (home) por SVG/texto (D-13); atualizar as dicas antigas "Rode `npm run dev`…" nos `catch` da `renderSelecao` e demais telas.
- **Toast do PWA cobre o fim da página:** dar um `padding-bottom` extra enquanto o `.aviso-pwa` estiver aberto.
- **Treino livre (§5.2):** uma habilidade específica e "focar nas minhas fracas".
- "N a revisar" em cada simulado da seleção.
- Frases do dia reais, com fonte conferida.
- Modo "simulado em ordem".
- Detalhe da habilidade com evolução ao longo do tempo (v2).
- Screenshots no manifest (opcional).
- README de portfólio (destacar a Fase 7: Web Crypto, pacote autenticado, `verificar-dist`) + versão pública com um mini-dataset de exemplo.
