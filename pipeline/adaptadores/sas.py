"""
sas.py — adaptador do formato SAS (padrão Adapter).

Interface comum: extrair(par) -> list[Questao].
Outra fonte no futuro = novo arquivo aqui, sem tocar no resto.
Funções puras de parse não leem/escrevem arquivo; IO fica em _ler_texto_pdf.
"""

import re
import sys
from dataclasses import dataclass
from typing import Literal, Optional


# ---------------------------------------------------------------------------
# Estruturas de dados do gabarito (etapa intermediária antes de Questao)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class AlternativaGabarito:
    letra: str          # A–E
    correta: bool
    comentario: str


@dataclass(frozen=True)
class RespostaGabarito:
    numero: int
    idioma: Optional[Literal["ingles", "espanhol"]]
    competencia: int
    habilidade: int
    gabarito: str       # A–E
    alternativas: list[AlternativaGabarito]


# ---------------------------------------------------------------------------
# Regexes compiladas
# ---------------------------------------------------------------------------

# Cabeçalho de página: "RESOLUÇÃO – ... | 1o DIA" (variações de ano/edição/simulado)
_RE_CABECALHO = re.compile(
    r"^RESOLU[ÇC][ÃA]O\s*[–\-—].*\|\s*1[ºo°]\s*DIA\s*$",
    re.IGNORECASE,
)

# Rodapé: linha com "LINGUAGENS, CÓDIGOS ... / CIÊNCIAS HUMANAS ..."
_RE_RODAPE = re.compile(
    r"LINGUAGENS[,.].*CIÊNCIAS\s+HUMANAS",
    re.IGNORECASE,
)

# Cabeçalho de questão: "01. Resposta correta: A C 2 H 5"
_RE_CABECALHO_QUESTAO = re.compile(
    r"^(\d{1,2})\.\s+Resposta correta:\s+([A-E])\s+C\s+(\d+)\s+H\s+(\d+)\s*$"
)

# Alternativa: "a) (V) texto..." ou "a) (F) texto..."
_RE_ALTERNATIVA = re.compile(
    r"^([a-e])\)\s+\((V|F)\)\s*(.*)"
)

# Marcadores de seção de idioma
_RE_INGLES   = re.compile(r"Questões de 01 a 05\s*\(opção inglês\)",   re.IGNORECASE)
_RE_ESPANHOL = re.compile(r"Questões de 01 a 05\s*\(opção espanhol\)", re.IGNORECASE)

# Início de Linguagens e fim (Ciências Humanas)
_RE_INICIO_LINGUAGENS = re.compile(r"LINGUAGENS,\s+CÓDIGOS\s+E\s+SUAS\s+TECNOLOGIAS\s*$", re.IGNORECASE)
_RE_FIM_ESCOPO        = re.compile(r"Questões de 46 a 90")


# ---------------------------------------------------------------------------
# Função pura: parsear_gabarito
# ---------------------------------------------------------------------------

def parsear_gabarito(texto: str) -> list[RespostaGabarito]:
    """
    Recebe o texto completo de um gabarito SAS e devolve as RespostaGabarito
    de Linguagens (questões 01–45), nas duas variantes de idioma quando houver.

    Função pura — sem IO.
    """
    linhas = texto.splitlines()

    # Passo 1 — remover cabeçalhos e rodapés de página
    linhas = [l for l in linhas if not _RE_CABECALHO.match(l) and not _RE_RODAPE.search(l)]

    # Passo 2 — dehifenização: linha que termina em "-" cola com a próxima sem espaço
    linhas_limpas: list[str] = []
    i = 0
    while i < len(linhas):
        linha = linhas[i]
        while linha.endswith("-") and i + 1 < len(linhas):
            i += 1
            linha = linha[:-1] + linhas[i]
        linhas_limpas.append(linha)
        i += 1
    linhas = linhas_limpas

    # Passo 3 — localizar início da seção de Linguagens
    inicio = None
    for idx, l in enumerate(linhas):
        if _RE_INICIO_LINGUAGENS.match(l.strip()):
            inicio = idx
            break
    if inicio is None:
        raise ValueError("Seção 'LINGUAGENS, CÓDIGOS E SUAS TECNOLOGIAS' não encontrada no texto.")

    linhas = linhas[inicio:]

    # Passo 4 — cortar em "Questões de 46 a 90" (exclusive)
    fim = None
    for idx, l in enumerate(linhas):
        if _RE_FIM_ESCOPO.search(l):
            fim = idx
            break
    if fim is not None:
        linhas = linhas[:fim]

    # Passo 5 — parse linha a linha
    respostas: list[RespostaGabarito] = []

    idioma_atual: Optional[Literal["ingles", "espanhol"]] = None
    # Estado da questão em construção
    numero_atual: Optional[int]    = None
    gabarito_atual: Optional[str]  = None
    competencia_atual: Optional[int] = None
    habilidade_atual: Optional[int] = None
    idioma_questao: Optional[Literal["ingles", "espanhol"]] = None
    alts_atual: list[tuple[str, bool, list[str]]] = []   # (letra_minusc, correta, linhas_comentario)

    def _finalizar_questao() -> None:
        if numero_atual is None:
            return
        _validar_e_registrar(
            numero_atual, idioma_questao, competencia_atual,
            habilidade_atual, gabarito_atual, alts_atual, respostas,
        )

    for linha in linhas:
        # Marcador de idioma
        if _RE_INGLES.search(linha):
            _finalizar_questao()
            numero_atual = None
            alts_atual = []
            idioma_atual = "ingles"
            continue
        if _RE_ESPANHOL.search(linha):
            _finalizar_questao()
            numero_atual = None
            alts_atual = []
            idioma_atual = "espanhol"
            continue

        # Cabeçalho de questão
        m = _RE_CABECALHO_QUESTAO.match(linha.strip())
        if m:
            _finalizar_questao()
            numero_atual    = int(m.group(1))
            gabarito_atual  = m.group(2)
            competencia_atual = int(m.group(3))
            habilidade_atual  = int(m.group(4))
            idioma_questao  = idioma_atual if numero_atual <= 5 else None
            alts_atual = []
            continue

        # Linha de alternativa
        m = _RE_ALTERNATIVA.match(linha.strip())
        if m:
            letra_alt = m.group(1)
            correta   = m.group(2) == "V"
            comentario_inicio = m.group(3)
            alts_atual.append((letra_alt, correta, [comentario_inicio]))
            continue

        # Continuação de comentário da alternativa atual
        if alts_atual and linha.strip():
            alts_atual[-1][2].append(linha.strip())

    _finalizar_questao()
    return respostas


def _validar_e_registrar(
    numero: int,
    idioma: Optional[Literal["ingles", "espanhol"]],
    competencia: int,
    habilidade: int,
    gabarito: str,
    alts_raw: list[tuple[str, bool, list[str]]],
    destino: list[RespostaGabarito],
) -> None:
    """Valida as alternativas e acrescenta a RespostaGabarito à lista destino."""
    LETRAS = list("abcde")

    letras_presentes = [a[0] for a in alts_raw]
    if len(alts_raw) != 5 or letras_presentes != LETRAS:
        raise ValueError(
            f"Questão {numero}: esperadas alternativas a–e em ordem, "
            f"encontradas {letras_presentes}."
        )

    corretas = [a for a in alts_raw if a[1]]
    if len(corretas) != 1:
        raise ValueError(
            f"Questão {numero}: esperado exatamente 1 alternativa (V), "
            f"encontradas {len(corretas)}."
        )

    letra_correta_minusc = corretas[0][0]
    letra_correta_maiusc = letra_correta_minusc.upper()
    if gabarito != letra_correta_maiusc:
        raise ValueError(
            f"Questão {numero}: 'Resposta correta' diz '{gabarito}', "
            f"mas o (V) está em '{letra_correta_maiusc}'."
        )

    alternativas = [
        AlternativaGabarito(
            letra=letra.upper(),
            correta=correta,
            comentario=" ".join(linhas_coment).strip(),
        )
        for letra, correta, linhas_coment in alts_raw
    ]

    destino.append(RespostaGabarito(
        numero=numero,
        idioma=idioma,
        competencia=competencia,
        habilidade=habilidade,
        gabarito=gabarito,
        alternativas=alternativas,
    ))


# ---------------------------------------------------------------------------
# IO isolado (borda — migra pro extrair.py depois)
# ---------------------------------------------------------------------------

def _ler_texto_pdf(caminho: str) -> str:
    """Lê um PDF com pdfplumber e devolve o texto completo (todas as páginas)."""
    import pdfplumber  # importação tardia; não polui quem só usa parsear_gabarito
    paginas: list[str] = []
    with pdfplumber.open(caminho) as pdf:
        for pagina in pdf.pages:
            t = pagina.extract_text() or ""
            paginas.append(t)
    return "\n".join(paginas)


# ---------------------------------------------------------------------------
# Conferência manual via linha de comando
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python -m pipeline.adaptadores.sas <caminho_gabarito.pdf>")
        sys.exit(1)

    caminho = sys.argv[1]
    texto   = _ler_texto_pdf(caminho)
    respostas = parsear_gabarito(texto)
    print(f"Total de questões extraídas: {len(respostas)}")
    if respostas:
        print("Primeira questão:")
        print(respostas[0])
