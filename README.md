# Sinapse

**Banco de questões do ENEM (Linguagens) com foco em reconhecer a habilidade de cada questão e fixá-la na memória por repetição espaçada.**

A pessoa vê uma questão, tenta **reconhecer qual habilidade (H1–H30)** ela cobra, **resolve**, e o app usa **repetição espaçada** (estilo Anki) pra trazer de volta o que ela mais erra. As 30 habilidades formam uma rede que vai "acendendo" conforme o domínio.

> Projeto pessoal + portfólio. Planejamento completo em [`PLANEJAMENTO.md`](./PLANEJAMENTO.md).

## Como funciona

- **Dois modos, num card só:** reconhecer a habilidade (+ o quanto tinha certeza) -> resolver -> revelação comentada.
- **Repetição espaçada:** cada questão volta na hora certa; erro confiante é sinalizado; prioriza as habilidades fracas.
- **Mapa do cérebro:** as 30 habilidades acendem conforme o domínio.

## Arquitetura

Duas partes independentes:

- **A fábrica (`pipeline/`, Python):** lê os PDFs dos simulados/gabaritos SAS e gera um `questoes.json`. Padrão **Adapter**, modelos **Pydantic**, funções puras com IO só nas bordas.
- **O app (`app/`, PWA em JavaScript + Vite):** tablet-first, offline, instalável. Padrão **Repository** (`dados.js` esconde onde os dados moram), camadas (dados <-> domínio <-> UI), SRS como funções puras.

```
pipeline/  -> a fábrica (Python): PDFs -> questoes.json
app/       -> o PWA (JS/Vite): consome questoes.json, roda offline
data/      -> matriz das habilidades, manifest, dados gerados
docs/      -> decisões de projeto
```

## Rodando

**Fábrica:**
```
cd pipeline
pip install -r requirements.txt
python extrair.py
```

**App:**
```
cd app
npm install
npm run dev
```

## Stack

Python + Pydantic (fábrica) · JavaScript + Vite, sem framework (app) · IndexedDB (progresso) · PWA offline.

## Direitos autorais

O código é aberto; o **dataset real** dos simulados **não** vai no repositório (fica local + deploy privado). Um mini-dataset de exemplo acompanha o projeto pra demonstração.

## Roadmap

- **v1 (atual):** PWA offline, tablet-first, sem servidor.
- **v2 (pós-ENEM):** full-stack — API + banco, contas, sincronização. A migração já nasce fácil (troca-se só o `dados.js`).
