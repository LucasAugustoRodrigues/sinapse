"""
imagens.py — recorte e associação de figuras às questões (IO nas bordas).

associar_figuras é função pura. Os helpers _extrair_* e extrair_imagens fazem IO.
"""

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Optional


# ---------------------------------------------------------------------------
# Estruturas de dados
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Marcador:
    pagina: int
    coluna: str                               # "L" (esquerda) ou "R" (direita)
    top: float
    numero: int
    idioma: Optional[Literal["ingles", "espanhol"]]


@dataclass(frozen=True)
class Figura:
    pagina: int
    coluna: str
    top: float
    x0: float
    x1: float
    bottom: float


# ---------------------------------------------------------------------------
# Regexes (usadas nos helpers de IO)
# ---------------------------------------------------------------------------

_RE_IDIOMA_INGLES   = re.compile(r"opção\s*:?\s*inglês",   re.IGNORECASE)
_RE_IDIOMA_ESPANHOL = re.compile(r"opção\s*:?\s*espanhol", re.IGNORECASE)
_RE_QUESTAO         = re.compile(r"^QUEST[ÃA]O$",          re.IGNORECASE)


# ---------------------------------------------------------------------------
# Função pura: associar_figuras
# ---------------------------------------------------------------------------

def _chave_leitura(pagina: int, coluna: str, top: float) -> tuple:
    return (pagina, 0 if coluna == "L" else 1, top)


def associar_figuras(
    marcadores: list[Marcador],
    figuras: list[Figura],
) -> dict[tuple[int, Optional[str]], list[Figura]]:
    """
    Para cada figura, encontra o marcador de questão mais próximo acima:
      1º) mesmo (pagina, coluna), top <= figura.top — pega o de maior top;
      2º) fallback: último marcador anterior em ordem de leitura (pág, L<R, top).
    Descarta números fora de 1–45. Ordena figuras por top dentro de cada questão.

    Função pura — sem IO.
    """
    marcadores_em_ordem = sorted(
        marcadores, key=lambda m: _chave_leitura(m.pagina, m.coluna, m.top)
    )

    resultado: dict[tuple[int, Optional[str]], list[Figura]] = {}

    for figura in figuras:
        marcador_escolhido: Optional[Marcador] = None

        # Passo 1 — mesma coluna e página, acima da figura
        candidatos = [
            m for m in marcadores
            if m.pagina == figura.pagina
            and m.coluna == figura.coluna
            and m.top <= figura.top
        ]
        if candidatos:
            marcador_escolhido = max(candidatos, key=lambda m: m.top)
        else:
            # Passo 2 — último marcador anterior em ordem de leitura
            chave_fig = _chave_leitura(figura.pagina, figura.coluna, figura.top)
            anteriores = [
                m for m in marcadores_em_ordem
                if _chave_leitura(m.pagina, m.coluna, m.top) < chave_fig
            ]
            if anteriores:
                marcador_escolhido = anteriores[-1]

        if marcador_escolhido is None:
            continue

        if not (1 <= marcador_escolhido.numero <= 45):
            continue

        chave = (marcador_escolhido.numero, marcador_escolhido.idioma)
        resultado.setdefault(chave, []).append(figura)

    for chave in resultado:
        resultado[chave].sort(key=lambda f: f.top)

    return resultado


# ---------------------------------------------------------------------------
# Helpers de IO
# ---------------------------------------------------------------------------

def _extrair_marcadores(pdf) -> list[Marcador]:
    """
    Percorre o PDF e devolve os Marcadores de "QUESTÃO NN" com coluna, top e
    idioma rastreado em ordem de leitura (coluna L antes de R por página).
    """
    marcadores: list[Marcador] = []
    idioma_atual: Optional[Literal["ingles", "espanhol"]] = None

    for i_pag, page in enumerate(pdf.pages):
        w = page.width
        palavras = page.extract_words()

        linhas_esq: dict[int, list[dict]] = {}
        linhas_dir: dict[int, list[dict]] = {}
        for p in palavras:
            topo = round(p["top"])
            if p["x0"] < w / 2:
                linhas_esq.setdefault(topo, []).append(p)
            else:
                linhas_dir.setdefault(topo, []).append(p)

        for coluna_str, linhas in (("L", linhas_esq), ("R", linhas_dir)):
            for topo in sorted(linhas.keys()):
                palavras_linha = sorted(linhas[topo], key=lambda p: p["x0"])
                texto_linha = " ".join(p["text"] for p in palavras_linha)

                if _RE_IDIOMA_INGLES.search(texto_linha):
                    idioma_atual = "ingles"
                    continue
                if _RE_IDIOMA_ESPANHOL.search(texto_linha):
                    idioma_atual = "espanhol"
                    continue

                for idx, p in enumerate(palavras_linha):
                    if _RE_QUESTAO.match(p["text"]) and idx + 1 < len(palavras_linha):
                        prox = palavras_linha[idx + 1]
                        if prox["text"].isdigit():
                            numero = int(prox["text"])
                            idioma_questao = idioma_atual if numero <= 5 else None
                            marcadores.append(Marcador(
                                pagina=i_pag,
                                coluna=coluna_str,
                                top=float(p["top"]),
                                numero=numero,
                                idioma=idioma_questao,
                            ))

    return marcadores


def _extrair_figuras(pdf) -> list[Figura]:
    """
    Coleta imagens das páginas de questões (pula capa/página 0),
    filtrando imagem quase-página-inteira e logos pequenos (área < 8000).
    """
    figuras: list[Figura] = []

    for i_pag, page in enumerate(pdf.pages):
        if i_pag == 0:
            continue

        w_pag = page.width
        h_pag = page.height

        for img in page.images:
            x0     = float(img["x0"])
            x1     = float(img["x1"])
            top    = float(img["top"])
            bottom = float(img["bottom"])

            largura = x1 - x0
            altura  = bottom - top

            if largura >= 0.8 * w_pag and altura >= 0.8 * h_pag:
                continue
            if largura * altura < 8000:
                continue

            coluna = "L" if x0 < w_pag / 2 else "R"
            figuras.append(Figura(
                pagina=i_pag,
                coluna=coluna,
                top=top,
                x0=x0,
                x1=x1,
                bottom=bottom,
            ))

    return figuras


def construir_id(id_base: str, numero: int, idioma: Optional[str]) -> str:
    sufixo = {"ingles": "-EN", "espanhol": "-ES", None: ""}[idioma]
    return f"{id_base}-Q{numero:02d}{sufixo}"


def extrair_imagens(
    caminho_prova: str,
    dir_saida: str,
    id_base: str,
) -> dict[str, list[str]]:
    """
    Abre o PDF da prova, associa figuras às questões, renderiza e salva em
    dir_saida como PNG (padding 6 px, 150 dpi).

    Retorna {questao_id: ["imagens/<arquivo>.png", ...]}
    (caminhos relativos a data/processed/).
    """
    import pdfplumber

    dir_saida_path = Path(dir_saida)
    dir_saida_path.mkdir(parents=True, exist_ok=True)

    mapa: dict[str, list[str]] = {}

    with pdfplumber.open(caminho_prova) as pdf:
        marcadores = _extrair_marcadores(pdf)
        figuras    = _extrair_figuras(pdf)
        associacao = associar_figuras(marcadores, figuras)

        for (numero, idioma), figs in associacao.items():
            questao_id = construir_id(id_base, numero, idioma)
            caminhos: list[str] = []

            for i, fig in enumerate(figs):
                nome = (
                    f"{questao_id}.png" if len(figs) == 1
                    else f"{questao_id}-{i + 1}.png"
                )
                caminho_arquivo = dir_saida_path / nome

                page = pdf.pages[fig.pagina]
                bbox = (
                    max(0.0, fig.x0    - 6),
                    max(0.0, fig.top   - 6),
                    min(float(page.width),  fig.x1     + 6),
                    min(float(page.height), fig.bottom + 6),
                )
                page.crop(bbox).to_image(resolution=150).save(str(caminho_arquivo))
                caminhos.append(f"imagens/{nome}")

            mapa[questao_id] = caminhos

    return mapa
