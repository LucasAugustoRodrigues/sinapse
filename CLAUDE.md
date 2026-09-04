# CLAUDE.md — Sinapse

Convenções que **toda sessão do Claude Code deve seguir** neste projeto. Contexto completo em `PLANEJAMENTO.md` (arquitetura, telas §5, SRS §7, matriz §9).

## Idioma
- **Vocabulário de domínio em português:** `questao`, `habilidade`, `gabarito`, `alternativa`, `competencia`, `enunciado`. Consistência sempre.
- Comentários e mensagens de commit em português.

## Stack
- **Fábrica:** Python 3.11+, **Pydantic** para modelos. Sem framework web na v1.
- **App:** **JavaScript puro + Vite**, sem framework (React fica pra v2). IndexedDB pro progresso. PWA offline, tablet-first.

## Arquitetura — não quebrar
**Fábrica (`pipeline/`):**
- **Adapter:** cada fonte de PDF é um adaptador (`adaptadores/sas.py`) com a interface `extrair(par) -> list[Questao]`. Fonte nova = arquivo novo, sem tocar no resto.
- **Modelos Pydantic** (`nucleo/modelos.py`): validam (exatamente 5 alternativas, exatamente 1 correta, habilidade 1–30, competencia 1–9) e serializam.
- **Funções puras + IO nas bordas:** parse não lê/escreve arquivo; só `extrair.py`/`escrever.py` fazem IO. Pipeline determinístico e idempotente.
- **Falhar alto na dúvida:** nunca gravar lixo em silêncio — marcar `confianca_extracao: "revisar"` e listar no relatório.

**App (`app/`):**
- **Repository:** `js/dados.js` é a ÚNICA peça que fala com o armazenamento. Na v2 troca-se só ele.
- **Camadas:** dados (`dados.js`) <-> domínio (`srs.js`, `estudo.js`) <-> apresentação (`ui.js`). A UI nunca fala direto com o IndexedDB.
- **Estado único + renderização:** fluxo de dados num sentido só.
- **SRS como funções puras** (`srs.js`): recebe estado + `hoje`, devolve novo estado; sem `Date.now()` interno, sem IO. Especificação em `PLANEJAMENTO.md §7`.
- **Acessibilidade/tablet:** fontes legíveis, alvos de toque grandes; ícones em **SVG** (não emoji do sistema).

## Dados
- Formato do `questoes.json`: ver `PLANEJAMENTO.md §6`. `id` estável e único; comentário por alternativa; `confianca_extracao` (`alta`|`revisar`); `idioma` só nas questões 1–5.
- Matriz oficial H1–H30 em `data/matriz/habilidades_enem.json` (fonte de verdade).

## Testes
- **Regressão no parser:** fixture de uma questão conhecida — se o parser mudar, o teste avisa.
- **SRS:** casos-âncora de `PLANEJAMENTO.md §7.9` (graduação, crescimento, lapso normal × confiante, clamp do ease, teto, ordenação da fila).
- Não entregar código sem os testes que o cobrem.

## Git
- **Você (Claude Code) NUNCA faz commit, `git add`, `git push` nem cria branch.** Só edita arquivos e roda testes; quem commita é o Lucas, depois de revisar. Ao terminar, mostre só o resumo do que mudou e o resultado dos testes (`git diff` somente leitura é ok).
- Commits **pequenos e descritivos**, em português. Uma fatia revisável por vez.
- Nunca commitar: PDFs brutos, dataset real de produção, `data/raw/`, `__pycache__/`, `node_modules/`.

## Como o Sonnet deve trabalhar aqui
- **Cirúrgico:** mexer só nos arquivos do escopo do prompt; não reescrever o que já funciona; não sair do escopo.
- **Não cortar** testes, tratamento de erro nem clareza — isso evita retrabalho.
- Seguir este `CLAUDE.md`; quando faltar contexto, consultar `PLANEJAMENTO.md`.

## Skills
- **Fábrica / PDFs:** usar a skill `pdf` (extração de texto e recorte de imagens por posição).
- **UI do app:** usar `frontend-design`.
- **Testes de fluxo do app:** usar `webapp-testing`.
