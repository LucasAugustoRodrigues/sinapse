# Sinapse — Documento de Planejamento

> **Sinapse** — banco de questões do ENEM com foco em (1) reconhecer a habilidade
> de cada questão e (2) fixar na memória via repetição espaçada.
>
> Documento vivo. Serve como contexto-semente para abrir novas conversas já
> fundamentadas. Traz o **quadro de andamento** (§8 — o que foi feito, o que está em
> desenvolvimento e o que falta), atualizado a cada tarefa fechada, e a **matriz completa
> das 30 habilidades** no Apêndice (§9).
>
> Última atualização: 2026-08-31

---

## 1. Contexto e objetivo

Aplicativo pessoal de estudo feito para a namorada do Lucas, que estuda para
**Medicina** (dois cursinhos, +10h/dia). Foco no **ENEM 2026** (provas em
**8 e 15 de novembro de 2026**); meta de versão utilizável até **8 de novembro**.

Três públicos ao mesmo tempo:

- **Ferramenta de estudo** de verdade, pra ela abrir todo dia.
- **Presente** — feito pra ela, com carinho.
- **Projeto de portfólio** do Lucas (GitHub), estudante de Ciência da Computação.

Dedicação prevista: ~2 a 3 horas por dia (com foco intenso na semana de 31/08).

### Material de origem

**7 simulados SAS + 7 gabaritos** (1º dia; edições 2024 nº 1–6 e o 1º simulado de
2026), em PDF. Foco nas **primeiras 45 questões** (Linguagens) de cada prova =
**315 questões**.

### Objetivo de estudo dela

1. Treinar a **reconhecer qual habilidade (H1–H30)** cada enunciado cobra (a
   matriz de Linguagens tem exatamente 30 habilidades — os "30 padrões de enunciado").
2. Treinar mais as **habilidades em que ela erra mais** (estilo Anki / repetição espaçada).

---

## 2. Descobertas técnicas (inspeção real dos PDFs)

- **PDFs são texto digital limpo — não precisa de OCR.**
- **Gabarito altamente estruturado.** Cada questão: `NN. Resposta correta: X` →
  selo `C <n> H <n>` → `a) (V/F) comentário`, ... É um **gabarito comentado**.
- **A habilidade vem direto da fonte** (sem classificar na mão nem com IA).
- **Simulado parseável** (cada questão começa com "Questão NN").

Pegadinhas reais identificadas:

1. **Questões 1–5 têm duas versões: "opção inglês" e "opção espanhol".**
2. **Imagens são poucas e posicionais** (~16–17 na prova): precisam ser localizadas
   pela posição na página e associadas à questão certa.
3. **Nomes de arquivo sem padrão único** → casar prova↔gabarito por um "mapa de pares".

Confiança pós-inspeção: **alta**.

---

## 3. Decisões tomadas

- **Nome do projeto: Sinapse.** ✅ (identidade visual: rede de neurônios/habilidades
  que "acende" conforme o domínio.)
- **v1 = PWA tablet-first.** Responsivo pensado pro tablet dela, **offline**,
  instalável na tela inicial, progresso salvo no próprio tablet, sem servidor.
- **v2 = full-stack** (stacks mais robustas/pesadas): API + banco na nuvem, contas,
  **sincronização entre dispositivos**, backup. Evolução pós-ENEM, não reescrita.
- **Dois modos de estudo:** "Qual é a habilidade?" e "Resolver".
- **Repetição espaçada (estilo Anki)** priorizando habilidades fracas.
- **Extrair tudo, filtrar depois** (app mostra só as 45 primeiras).
- **Descrições oficiais de H1–H30** embutidas (mostrar "H6 — [descrição]"). ✅ Matriz real
  já salva em `data/matriz/habilidades_enem.json` (lista completa no Apêndice §9).
- **Direitos autorais × portfólio:** repo público com **o código** + **mini-dataset
  de exemplo**; o `questoes.json` real fica **fora do repo público** (uso local +
  deploy privado só pra ela). ✅
- **Inglês e espanhol nas questões 1–5:** guardar **as duas variantes** (campo `idioma`). ✅
- **Stack do front na v1:** **JavaScript puro + Vite**, sem framework pesado. React
  fica pra v2. ✅
- **Idioma do código:** **vocabulário de domínio em português** (`questao`,
  `habilidade`, `gabarito`), com consistência. ✅
- **Modelos da fábrica:** **Pydantic** (validação + serialização de graça). ✅
- **Seletor de habilidade (modo "Qual é a habilidade?"): Opção 1 + confiança da Opção 4.** ✅
  Grade por competência (as 30 agrupadas nas 9 competências, panorama completo) **combinada
  com** a escala de confiança (Chutei · Na dúvida · Tinha certeza). Validado com ela no
  mockup interativo. Detalhe em §5.
- **Motor SRS = acerto × confiança.** ✅ A confiança é medida **antes** da revelação e,
  cruzada com o acerto/erro, deriva sozinha a nota estilo Anki (some o passo separado de
  auto-avaliação). Mapa completo em §5; **matemática fechada em §7**.
- **Matriz das 30 habilidades: recebida, conferida e salva.** ✅ Ela digitou e conferiu a
  matriz (Linguagens e Códigos); guardei em `data/matriz/habilidades_enem.json`. Correção
  aplicada: **H2** de "geralmente focais" → "geralmente **fáceis**" (observação dela). As
  9 competências **reais** (nomes e agrupamento) ficam fixas e substituem os textos-placeholder
  do mockup. Lista completa no Apêndice §9.

### Princípios de arquitetura a NÃO esquecer

> - `adaptadores/sas.py` é onde mora o "jeito SAS" de ler PDF. Quando você quiser
>   outra fonte no futuro, cria `adaptadores/outrocursinho.py` e o resto do
>   projeto não muda. É a extensibilidade que a gente conversou, virada em pasta.
>
> - `app/js/dados.js` é a única peça que fala com o armazenamento. Na v1 ela lê o
>   `questoes.json` e grava o progresso no tablet (IndexedDB). Na v2, você troca
>   só esse arquivo por "chamar a API", e todo o resto do app continua igual. A
>   migração pro full-stack já nasce fácil.

---

## 4. Fluxo de trabalho (quem faz o quê)

- **Conversa com o Opus = arquiteto + revisor + gerador de prompts.** Planejamento,
  arquitetura, revisão de código e redação dos prompts.
- **Claude Code (Sonnet) = as mãos.** Escreve o código braçal a partir de prompts
  fechados. Lucas roda, traz o diff, o Opus revisa. Ciclo:
  *prompt → roda no Sonnet → traz o diff → revisa → próximo prompt.*

### Estratégia de modelo

- **Sonnet** para implementar (melhor custo-benefício em código).
- **Opus** (aqui) para arquitetar e revisar.
- **Haiku evitado** para código (mais barato por token, mas erra mais → falsa economia).

### Economia de tokens (do jeito certo)

O que queima tokens no Claude Code é ele **explorar e errar**, não o código em si.
Então economia vem de **escopo cirúrgico + contexto pronto**, não de pedir brevidade.
Cada prompt entregue ao Sonnet terá: contexto mastigado, **um objetivo** com
**critérios de aceitação**, instrução de ser cirúrgico (mexer só no necessário) e
ordem de **seguir o `CLAUDE.md`**. NÃO cortar testes, tratamento de erro nem clareza
(isso é o que evita retrabalho).

### `CLAUDE.md` no repositório

O Claude Code lê um `CLAUDE.md` na raiz em toda sessão. É onde ficam as convenções e
boas práticas **escritas uma vez** — todo prompt herda de graça, sem repetição.
A gerar assim que o esqueleto do projeto for criado.

### Ritual de organização (novo)

**A cada tarefa que a gente definir, ela entra no quadro de andamento (§8)** com uma
linha do que é, e migra entre *A fazer → Em andamento → Feito* conforme anda, com uma
frase do que foi feito. Assim nunca nos perdemos entre as conversas.

---

## 5. Telas do app (v1)

Desenho **tablet-first** (dedo, não mouse; funciona em pé e deitado). Seis telas +
uma barra de navegação de três destinos (**Início · Estudar · Progresso**; vira coluna
lateral no modo paisagem). Alvos de toque grandes, nada de menu escondido.

1. **Início** — saudação ("Bom estudo!", personalizável com o nome dela) + card grande
   do dia ("Revisão de hoje — N questões") com botão gigante de começar. Três pulsos:
   habilidades dominadas (ex.: 18/30), streak de dias, questões na semana. Atalhos:
   "Treino livre" e "Ver progresso".
2. **Escolher o treino** ("Treino livre") — filtros: por habilidade específica, por
   simulado, ou "focar nas minhas fracas" (o app seleciona as piores).
3. **O card de estudo (fluxo unificado de 3 telas)** — a questão é vivida numa passada
   fluida, com transição de *slide* entre as etapas (os dois modos embutidos no mesmo card):
   - **(a) Reconhecer** — enunciado grande + o **seletor de habilidade** (grade por
     competência, abaixo) + a **régua de confiança**; ao tocar a confiança, desliza pra (b).
   - **(b) Resolver** — o mesmo enunciado + alternativas A–E como botões grandes; ela marca
     e confirma, desliza pra (c). *(Sem confiança aqui neste fluxo.)*
   - **(c) Revelação combinada** — dois vereditos (habilidade: acertou/errou + confiança;
     resposta: certa/errada), a **habilidade correta + descrição oficial**, a resposta
     comentada e o **porquê de cada alternativa**, e o aviso do SRS ("volta em ~X").
4. *(A antiga "tela Resolver" separada e a "tela de auto-avaliação" foram **fundidas** neste
   card único — a confiança entra na etapa (a), antes da revelação.)*
5. **Progresso** — as 30 habilidades como rede/grade que "acende" conforme o domínio
   (verde forte = dominada, apagada = fraca). Tocar numa abre o detalhe (acertos, erros,
   evolução no tempo). É a joia do portfólio e onde o nome brilha.

### Seletor de habilidade — decisão final (Opção 1 + confiança)

Grade por competência **+** régua de confiança. Fluxo:

1. Ela **toca na habilidade** (H1–H30) na grade agrupada nas 9 competências.
2. Aparece **Chutei · Na dúvida · Tinha certeza** e ela toca.
3. O card **desliza para a etapa Resolver** (a revelação só vem depois, na etapa (c)).

A confiança é medida **antes** de saber o resultado (senão vira viés de retrospecto) — ela
marca a habilidade, diz o quanto tinha certeza, e só então segue. É a etapa (a) do card
unificado (§5.3).

> **Atenção — matriz real × mockup:** os nomes e o agrupamento das competências no mockup
> eram *placeholders*. Valem os **reais** da matriz (Apêndice §9). Exemplo: no mockup a
> resposta certa era "H18 = argumentação"; na matriz real, argumentação é a **C7 (H21–24)**
> e H18 é "progressão temática e organização estrutural". O *layout* da grade continua o
> mesmo — muda só o conteúdo (nomes das competências e textos das habilidades).

### Motor de repetição espaçada — mapa acerto × confiança

O app já sabe se acertou; ela informa a confiança. O cruzamento deriva a nota:

| Resultado | Confiança      | Nota (Anki)              | Reaparece                       |
|-----------|----------------|--------------------------|---------------------------------|
| Errou     | qualquer       | Errei                    | logo (fila curta)               |
| Errou     | Tinha certeza  | Errei ⚠️ (erro confiante) | logo **+ destaque no relatório** |
| Acertou   | Chutei         | Difícil                  | intervalo curto                 |
| Acertou   | Na dúvida      | Bom                      | intervalo normal                |
| Acertou   | Tinha certeza  | Fácil                    | intervalo longo                 |

Racional: acertar chutando não é domínio (volta rápido); **errar confiante é o erro
mais perigoso** (crença errada fixada) → volta logo e é sinalizado pra ela caçar.
A **matemática dos intervalos** (dias por nota, fator de facilidade, fila do dia) está
**fechada em §7**.

---

## 6. Arquitetura da v1

### Estrutura de pastas

```
Projeto_Banco_de_Questoes/            (repo: sinapse)
├── README.md
├── CLAUDE.md                   ← convenções lidas pelo Claude Code
├── .gitignore
├── data/
│   ├── raw/                    ← PDFs brutos (só na máquina, fora do Git)
│   │   ├── simulados/
│   │   └── gabaritos/
│   ├── manifest.yaml           ← "mapa de pares" prova↔gabarito + metadados
│   ├── matriz/
│   │   └── habilidades_enem.json   ← descrições oficiais H1–H30 e competências
│   └── processed/              ← o que a fábrica gera
│       ├── questoes.json       ← dataset final que o app consome
│       ├── imagens/            ← figuras recortadas das questões
│       └── revisao.md          ← relatório das questões a conferir
├── pipeline/                   ← a FÁBRICA (Python)
│   ├── requirements.txt
│   ├── extrair.py              ← orquestrador: um comando roda tudo
│   ├── adaptadores/
│   │   └── sas.py              ← parser do formato SAS
│   ├── nucleo/
│   │   ├── modelos.py          ← modelos Pydantic (Questao, Alternativa…)
│   │   ├── imagens.py          ← recorte e associação de figuras
│   │   ├── validar.py          ← checagens de qualidade
│   │   └── escrever.py         ← gera o questoes.json
│   └── tests/
├── app/                        ← o PWA (front-end)
│   ├── index.html
│   ├── manifest.webmanifest    ← instalável no tablet
│   ├── service-worker.js       ← offline
│   ├── css/
│   ├── js/
│   │   ├── dados.js            ← CAMADA DE DADOS (troca na v2)
│   │   ├── srs.js              ← motor de repetição espaçada
│   │   ├── estudo.js           ← lógica dos dois modos
│   │   └── ui.js               ← desenha as telas
│   └── assets/
└── docs/                       ← documentação (este .md, decisões)
```

### Formato dos dados (`questoes.json`)

```json
{
  "id": "SAS2024-S1-Q01-EN",
  "fonte": "SAS2024",
  "simulado": 1,
  "numero": 1,
  "area": "Linguagens",
  "idioma": "ingles",
  "enunciado": "…texto do enunciado…",
  "imagens": [],
  "alternativas": [
    { "letra": "A", "texto": "…", "correta": true,  "comentario": "Correta porque…" },
    { "letra": "B", "texto": "…", "correta": false, "comentario": "Incorreta porque…" }
  ],
  "gabarito": "A",
  "competencia": 2,
  "habilidade": 5,
  "confianca_extracao": "alta"
}
```

- **`id` estável e único** → reprocessar não duplica e o progresso nunca se perde.
- **Comentário por alternativa** → o app explica por que cada uma está certa/errada.
- **`confianca_extracao`** (`alta` | `revisar`) → separa o seguro do que precisa conferência.
- **`idioma`** → só nas questões 1–5.

### Fluxo da fábrica

`python pipeline/extrair.py`: lê o manifest → adaptador SAS extrai gabarito e prova →
casa por número → recorta imagens → valida (marca `alta`/`revisar`) → escreve
`questoes.json` + `revisao.md`. Adicionar simulados: PDF novo → atualizar manifest → rodar.

### Deploy

Host estático (Netlify/Vercel/GitHub Pages); ela abre o link no tablet e "adiciona à
tela inicial". Dataset real fica em **deploy privado**, só pra ela.

---

## 7. Motor de repetição espaçada (SRS) — especificação fechada

**Base: SM-2 adaptado** (o algoritmo clássico do Anki/SuperMemo), simplificado para
**JavaScript puro, offline e testável como funções puras**. Escolhido por ser provado,
explicável e fácil de testar. FSRS (modelo moderno do Anki) fica como upgrade da **v2** —
o `historico` que guardamos por card já serve de base pra migrar sem perda.

Tudo aqui é **função pura** (recebe estado + `hoje`, devolve novo estado; sem `Date.now()`
interno, sem IO) → vive em `app/js/srs.js`, testável com fixtures.

### 7.1 Unidade de estudo: o card = a questão (fluxo unificado)

Uma questão = **um card**, vivido numa passada fluida de **3 telas** (ideia do Lucas):
**reconhecer** a habilidade (+ confiança) → *slide* → **resolver** (marcar a alternativa) →
*slide* → **revelação combinada** (habilidade + descrição, acerto/erro, resposta comentada,
por que as outras erram). Os dois modos ficam embutidos no mesmo card.

Cada card guarda **dois mini-resultados**: `reconhecimento` (acerto da habilidade + confiança)
e `resolucao` (acerto da alternativa).

`cardId = questaoId`. *(Substitui a ideia anterior de 2 cards/baralhos por modo — o fluxo
unificado tornou o agendamento separado desnecessário e mais simples. **Decidido; em
validação com ela** pelo mockup interativo.)*

### 7.2 Da resposta à nota — por parte e combinada

A confiança é tocada **antes** da revelação; o acerto o app já sabe. `derivarNota(acerto,
confianca)` (tabela abaixo) roda em **cada parte**:

- `notaRec` = `derivarNota(acertouHabilidade, confianca)`
- `notaRes` = `acertouAlternativa ? BOM : ERREI` *(a resolução, neste fluxo, não pede
  confiança; dá pra adicionar depois se quisermos SRS mais rico na resolução.)*

| Acerto  | Confiança          | Nota                | Efeito                                   |
|---------|--------------------|---------------------|------------------------------------------|
| Errou   | Chutei / Na dúvida | **ERREI**           | lapso → reaprender                       |
| Errou   | Tinha certeza      | **ERRO_CONFIANTE** ⚠️ | lapso + penalidade extra + sinalizado   |
| Acertou | Chutei             | **DIFICIL**         | avança pouco, ease ↓                     |
| Acertou | Na dúvida          | **BOM**             | avança normal                            |
| Acertou | Tinha certeza      | **FACIL**           | avança mais, ease ↑                      |

ERREI e ERRO_CONFIANTE são ambos **lapso**; o confiante penaliza mais o ease e liga
`flagRevisar` (vai pro relatório e pro topo da fila).

**A nota que agenda o card é a pior das duas:** `notaFinal = pior(notaRec, notaRes)` — a
questão só está "dominada" quando ela **reconhece e resolve**. Se qualquer parte for
ERRO_CONFIANTE, o lapso conta como confiante. As estatísticas por habilidade (força, mapa
do cérebro) saem do **`reconhecimento`** (objetivo nº 1 dela).

### 7.3 Estado de cada card (store IndexedDB `progresso`)

```js
{
  cardId,                 // = questaoId  (chave; 1 card por questão)
  questaoId,              // identidade
  habilidade, competencia,// desnormalizado p/ agregações rápidas (1..30 / 1..9)
  estado,                 // "novo" | "aprendendo" | "revisao" | "reaprendendo"
  facilidade,             // ease; começa 2.5; preso em [1.3, 3.0]
  intervalo,              // dias (0 enquanto novo/aprendendo)
  repeticoes,             // acertos consecutivos em revisao (reseta no lapso)
  lapsos,                 // nº de vezes que caiu p/ reaprender
  ultimaRevisao,          // timestamp (dia)
  proximaRevisao,         // timestamp (dia) — critério de "vencido"
  flagRevisar,            // bool — erro confiante recente
  historico: [ { data, recAcerto, recConfianca, resAcerto, notaRec, notaRes, notaFinal } ]
}
```

### 7.4 As contas — `revisar(card, notaFinal, hoje) -> card'`

Onde `notaFinal = pior(notaRec, notaRes)` (§7.2). As tabelas abaixo usam `notaFinal`.

**Ajuste do fator de facilidade (ease):**

| Nota            | Δ ease |
|-----------------|--------|
| FACIL           | +0.15  |
| BOM             |  0.00  |
| DIFICIL         | −0.15  |
| ERREI           | −0.20  |
| ERRO_CONFIANTE  | −0.30  |

Sempre clampar em **[1.3, 3.0]**.

**Graduação (card `novo`, no primeiro acerto):**

- DIFICIL → intervalo **1 dia** (venceu, mas frágil)
- BOM → **1 dia**
- FACIL → **3 dias**
- (ERREI/ERRO_CONFIANTE em card novo → não gradua; vai pra `aprendendo`, ver §7.5.)

**Crescimento do intervalo (card `revisao`, acertou):**

- DIFICIL → `round(intervalo × 1.2)`
- BOM → `round(intervalo × facilidade)`
- FACIL → `round(intervalo × facilidade × 1.3)`
- Garantia: novo intervalo **≥ intervalo + 1** (nunca encolhe num acerto).
- **Teto: 45 dias** (casado com a janela até o ENEM; refinamento opcional:
  `min(45, diasAteProva)`).

**Lapso (card `revisao`, errou → ERREI/ERRO_CONFIANTE):**

- `estado = "reaprendendo"`, aplica o Δ ease, `lapsos += 1`, `repeticoes = 0`.
- Ao acertar de novo (na sessão), volta a `revisao` com intervalo **1 dia** (reinício suave).
- ERRO_CONFIANTE: além do −0.30, liga `flagRevisar` → relatório + topo da fila.

### 7.5 Passos de aprendizado (dentro da sessão, sem timer)

Cards `novo`/`reaprendendo` que ela erra **não avançam intervalo**: voltam ~6 posições
depois na fila da sessão (pilha de retentativa) e só "graduam" quando ela acerta uma vez.
Se a sessão acabar antes, ficam com `proximaRevisao = hoje` (primeiros na próxima sessão).
Determinístico → testável.

### 7.6 Fila do dia — `construirFila(cards, hoje, config, filtros)`

Ordem dos grupos (embaralhar levemente **dentro** de cada grupo, mantendo a ordem entre grupos):

1. **Reaprendendo** vencidos — `flagRevisar` (erro confiante) primeiro.
2. **Revisão** vencidos (`proximaRevisao ≤ hoje`) — mais atrasados primeiro; desempate por
   habilidade mais fraca (§7.7).
3. **Novos** — até `novasPorDia`, escolhidos priorizando habilidades fracas e respeitando
   os filtros do "Treino livre" (por habilidade, por simulado, ou "focar nas fracas").

### 7.7 Força da habilidade & mapa do cérebro

**`forcaHabilidade(h)`** (p/ o filtro "focar nas fracas" e p/ priorizar novos): olha as
últimas ~20 tentativas da habilidade `h`; `forca = acertos_ponderados / tentativas`, onde
**erro confiante pesa mais** que erro normal. Poucas tentativas (<5) = incerta (prioridade
média). "Focar nas fracas" ordena por `forca` ascendente.

**`dominio(h)`** (brilho das 30 na tela Progresso): 
`0.6 × taxaAcertoRecente(h) + 0.4 × (cardsMaduros(h) / totalCards(h))`, onde *maduro* =
`estado "revisao"` e `intervalo ≥ 7`. Faixas: **≥0.8** verde forte (dominada) · **0.5–0.8**
médio · **<0.5** apagado · sem dados = cinza.

*(A `streak` de dias é métrica de app, não de card: dias-corridos com ≥1 revisão, calculada
do histórico.)*

### 7.8 Knobs ajustáveis (ficam em um `config`)

`easeInicial=2.5` · `easeMin=1.3` · `easeMax=3.0` · deltas de ease (§7.4) · graduação
(1/1/3 dias) · multiplicador DIFICIL=1.2 · bônus FACIL=1.3 · `intervaloMax=45` ·
`novasPorDia=20` · reinício pós-lapso=1 dia · janela de `forcaHabilidade`=20 tentativas ·
retentativa=6 posições. Todos com default acima; fáceis de calibrar depois de ela usar.

### 7.9 Testabilidade (regressão)

Fixtures de card + sequência de notas → estado esperado. Casos-âncora: graduação por cada
nota; crescimento de intervalo em revisão; lapso normal vs. confiante (Δ ease e flag);
clamp do ease nos extremos; teto de intervalo; ordenação da fila.

---

## 8. Quadro de andamento

> Regra: toda tarefa nova entra aqui e migra **A fazer → Em andamento → Feito**, com
> uma frase do que rolou. Atualizado a cada fechamento.

### ✅ Feito

- **Planejamento e arquitetura base** — fluxo de trabalho, stack (PWA JS+Vite),
  convenções (português + Pydantic), estrutura de pastas e formato do `questoes.json`.
- **Nome e identidade** — Sinapse, com a metáfora da rede de neurônios que acende.
- **Inspeção dos PDFs** — confirmado que dá pra extrair sem OCR; confiança alta.
- **Design das telas + navegação** — definido (§5).
- **Seletor de habilidade** — decidido: Opção 1 (grade por competência) + confiança da
  Opção 4. Validado com ela no mockup interativo.
- **Card de estudo — fluxo unificado (§5.3, §7.1)** — 3 telas numa passada só (reconhecer
  + confiança → resolver → revelação combinada), 1 card por questão, agendado pela **pior
  das duas partes**. Mockup interativo publicado pra ela testar.
- **Fluxo do card validado com ela (02/09)** — **aprovado**; amou especialmente a etapa de
  revelação. Notas pra fase de código: (a) o "abre outra aba" ao tocar é só o preview do
  artifact compartilhado — os botões não abrem aba e no PWA instalado não acontece;
  (b) trocar os **emoji do sistema por ícones SVG** (render idêntico em qualquer tablet).
- **Esqueleto do projeto criado (03/09)** — estrutura `pipeline/` + `app/`, `README`,
  `CLAUDE.md`, `.gitignore`, `manifest.yaml` (os 7 pares) e stubs com a responsabilidade de
  cada módulo. `git init` feito; o **1º commit fica pra você** (autoria sua, é portfólio).
- **Repo no GitHub + 1º commit (04/09)** — `sinapse` público no ar em
  github.com/LucasAugustoRodrigues/sinapse (esqueleto commitado e enviado).
- **PDFs movidos** — de `Docs/PDFs/` para `data/raw/{simulados,gabaritos}/` (7 provas + 7
  gabaritos; ficam locais, fora do Git).
- **Skills instaladas e funcionando (§10)** — `pdf`, `frontend-design` e `webapp-testing`
  no Claude Code (copiadas pra `.claude/skills/`, todas "on").
- **Regra do motor SRS (acerto × confiança)** — mapa fechado (§5); confiança medida
  antes da revelação, nota Anki derivada, "erro confiante" sinalizado.
- **Matriz das 30 habilidades** — recebida dela, conferida (H2 corrigido de "focais" →
  "fáceis") e salva em `data/matriz/habilidades_enem.json`; as 9 competências reais ficam
  fixas. Lista completa no Apêndice §9.
- **Motor SRS — matemática fechada (§7)** — SM-2 adaptado; card = (questão × modo); notas
  por acerto × confiança; contas de ease/intervalo; lapso normal × confiante; fila do dia;
  força/domínio por habilidade; knobs ajustáveis; casos de teste. Pronto pra virar `srs.js`.

### 🔨 Em andamento

- **Documento vivo + quadro de andamento** — este arquivo, agora com o board.
- **Construir a fábrica** — começando agora pelo 1º prompt (modelos Pydantic).

### 📋 A fazer

- [ ] **Implementar o `srs.js`** (funções puras) conforme §7, com testes de regressão
      (fixtures dos casos-âncora de §7.9). → prompt pro Sonnet depois do esqueleto.
- [ ] **(Opcional) Mockup navegável das 6 telas** — bom pro portfólio e pra sentir o app
      antes do código.
- [ ] **Construir a fábrica (pipeline Python)** → gerar o `questoes.json` real.
      **← EM FOCO:** 1º prompt = modelos Pydantic (`modelos.py`) + testes; depois o parser SAS.
- [ ] **Construir o app PWA** (dados → domínio → UI; offline; instalável).
- [ ] **Deploy** — público (portfólio, código + mini-dataset) e privado (dataset real, pra ela).
- [ ] **(Opcional) Saudação personalizada** com o nome dela.

---

## 9. Apêndice — Matriz das 30 habilidades (Linguagens e Códigos)

> Fonte de verdade das habilidades. Digitada por ela (com apoio de IA) e conferida
> manualmente. Cópia machine-readable em `data/matriz/habilidades_enem.json`.
> **Correção aplicada:** H2 — "geralmente focais" → "geralmente **fáceis**" (observação dela).
> Os textos entre parênteses são **dicas práticas dela**, não parte da descrição oficial.

**C1 · Gêneros Textuais e Prática Social**

- **H1** — Identificar recursos expressivos e características textuais do gênero.
- **H2** — Resolver problemas sociais (geralmente fáceis).
- **H3** — Relacionar informações do texto, função social do gênero e como opera socialmente.
- **H4** — Reconhecer posições críticas aos usos sociais da linguagem.

**C2 · Língua Estrangeira**

- **H5** — Associar vocábulos e expressões ao seu contexto.
- **H6** — Utilizar conhecimento sobre cultura e tecnologia.
- **H7** — Relacionar função social.
- **H8** — Reconhecer a diversidade linguística e cultural.

**C3 · Linguagem Corporal**

- **H9** — Reconhecer manifestações corporais associadas ao cotidiano.
- **H10** — Reconhecer a necessidade de transformar hábitos corporais / padrões de beleza.
- **H11** — Reconhecer a linguagem corporal para interação e adaptação social.

**C4 · Artes**

- **H12** — Reconhecer funções da arte (geralmente em imagens).
- **H13** — Analisar produções artísticas, padrões de beleza e preconceitos.
- **H14** — Reconhecer a interrelação de elementos e o valor da diversidade artística.

**C5 · Literatura**

- **H15** — Estabelecer relações entre o texto literário e o contexto de produção.
- **H16** — Relacionar concepções artísticas aos procedimentos de construção do texto.
- **H17** — Reconhecer a presença de valores sociais e humanos.

**C6 · Sistemas Simbólicos**

- **H18** — Identificar elementos de progressão temática e organização estrutural.
- **H19** — Analisar a função da linguagem.
- **H20** — Reconhecer patrimônio linguístico para memória nacional.

**C7 · Argumentação e Opinião**

- **H21** — Reconhecer recursos verbais e não verbais.
- **H22** — Relacionar dois ou mais textos.
- **H23** — Inferir os objetivos do autor através de marcas linguísticas.
- **H24** — Reconhecer as estratégias argumentativas.

**C8 · Variantes Linguísticas e Norma-padrão**

- **H25** — Identificar marcas linguísticas que singularizam variedades.
- **H26** — Relacionar variantes a situações de uso.
- **H27** — Reconhecer os usos da norma-padrão.

**C9 · Tecnologias da Informação e Comunicação**

- **H28** — Reconhecer a função e o impacto das novas tecnologias.
- **H29** — Identificar as características da tecnologia.
- **H30** — Relacionar o desenvolvimento da sociedade ao uso das tecnologias.

---

## 10. Skills e ferramentas (por ambiente)

Dois ambientes, dois papéis:

- **Aqui (Opus/Cowork — planejar, revisar, desenhar):** as skills já vêm provisionadas; uso
  automático quando a tarefa combina. **Não** se instala via `npx`.
- **Claude Code (Sonnet — escrever código):** instala via `npx skills add <repo> --skill
  <nome>` **de dentro da pasta do projeto** → cai em `.claude/skills/<nome>/`, escopo só
  deste projeto (não polui os outros).

**Instalar no Claude Code (as que valem pra codar):**

- `pdf` — a fábrica: parsear os PDFs SAS e **recortar imagens por posição** (pegadinha nº 2).
- `frontend-design` — a UI do PWA (o card, as telas, a tela Progresso), tablet-first.
- `webapp-testing` — testar os fluxos do app (o card, a navegação).

**Aqui comigo (já disponíveis — é o nosso lado do ciclo):**

- `code-review` — revisar os diffs que o Sonnet trouxer.
- `testing-strategy` — desenhar os testes do parser e do `srs.js` (§7.9).
- `architecture` — registrar decisões grandes (o `PLANEJAMENTO.md` já faz a maior parte).
- `artifact-design` + `dataviz` — mockups e a **viz do mapa do cérebro** (tela Progresso).
- `documentation` — o README de portfólio.
- `deploy-checklist` — na hora do deploy.
- `skill-creator` — criar a **skill "Sinapse" própria** (depois do esqueleto existir).

**Fora do projeto (e por quê):** `python-backend` e `shadcn` (são de backend-API / React —
território da v2, não da v1 vanilla), `docx` (não geramos Word), `mcp-builder` (não há
servidor MCP), `code-ultrareview` (redundante com `code-review` e não vetado — só 215
installs), `obra/superpowers` inteiro (bundle grande = skill-bloat), `find-skills` (meta-busca,
opcional/global). `brainstorming` fica como opcional do nosso lado.

**Nota de repo:** ao instalar, o `npx` cria `.claude/skills/` no projeto. No `.gitignore`,
recomendo **ignorar as skills externas vendorizadas** (são ferramenta, não o projeto) e
**commitar só a nossa `Sinapse`** quando existir.
