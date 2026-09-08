"""
sas.py — adaptador do formato SAS (padrão Adapter).

Interface comum: extrair(par) -> list[Questao].
Outra fonte no futuro = novo arquivo aqui, sem tocar no resto.
Funções puras de parse não leem/escrevem arquivo; IO fica nos _ler_texto_*.
"""

import re
import sys
from dataclasses import dataclass
from typing import Literal, Optional

from nucleo.modelos import Alternativa, Questao


# ============================================================================
# Estruturas de dados — Gabarito
# ============================================================================

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


# ============================================================================
# Estruturas de dados — Prova
# ============================================================================

@dataclass(frozen=True)
class AlternativaProva:
    letra: str          # A–E
    texto: str


@dataclass(frozen=True)
class QuestaoProva:
    numero: int
    idioma: Optional[Literal["ingles", "espanhol"]]
    enunciado: str
    alternativas: list[AlternativaProva]


# ============================================================================
# Regexes compartilhadas (gabarito e prova)
# ============================================================================

# Marcadores de seção de idioma
_RE_INGLES   = re.compile(r"Questões de 01 a 05\s*\(opção inglês\)",   re.IGNORECASE)
_RE_ESPANHOL = re.compile(r"Questões de 01 a 05\s*\(opção espanhol\)", re.IGNORECASE)

# Início da seção de Linguagens (linha isolada, sem barra e sem "/ Ciências")
_RE_INICIO_LINGUAGENS = re.compile(
    r"^LINGUAGENS,\s+CÓDIGOS\s+E\s+SUAS\s+TECNOLOGIAS\s*$", re.IGNORECASE
)


# ============================================================================
# Regexes do gabarito
# ============================================================================

# Cabeçalho de página: "RESOLUÇÃO – ... | 1o DIA"
_RE_CABECALHO_PAG = re.compile(
    r"^RESOLU[ÇC][ÃA]O\s*[–\-—].*\|\s*1[ºo°]\s*DIA\s*$",
    re.IGNORECASE,
)

# Rodapé: "LINGUAGENS, CÓDIGOS ... / CIÊNCIAS HUMANAS ..."
_RE_RODAPE = re.compile(
    r"LINGUAGENS[,.].*CIÊNCIAS\s+HUMANAS",
    re.IGNORECASE,
)

# Cabeçalho de questão do gabarito: "01. Resposta correta: A C 2 H 5"
_RE_CABECALHO_QUESTAO_GAB = re.compile(
    r"^(\d{1,2})\.\s+Resposta correta:\s+([A-E])\s+C\s+(\d+)\s+H\s+(\d+)\s*$"
)

# Alternativa do gabarito: "a) (V) texto..." ou "a) (F) texto..."
_RE_ALTERNATIVA_GAB = re.compile(
    r"^([a-e])\)\s+\((V|F)\)\s*(.*)"
)

# Fim do escopo do gabarito
_RE_FIM_GABARITO = re.compile(r"Questões de 46 a 90")


# ============================================================================
# Regexes da prova
# ============================================================================

# Marca d'água de lixo: linha que (sem espaços) casa com (?:LUZA|MENE|4202)+
_RE_LIXO_PROVA = re.compile(r"^(?:LUZA|MENE|4202)+$", re.IGNORECASE)

# Copyright
_RE_COPYRIGHT = re.compile(r"Copyright\s*©", re.IGNORECASE)

# "Exame Nacional do Ensino Médio"
_RE_ENEM_LINHA = re.compile(r"^Exame Nacional do Ensino M", re.IGNORECASE)

# Linha sem espaços casa com 2200\d{4} (ex: "22002244")
_RE_NUMERO_2200 = re.compile(r"^2200\d{4}$")

# Linha tipo "42 LC"
_RE_LC_LINHA = re.compile(r"^\d+\s+LC\b")

# Marcador de questão da prova: "QUESTÃO 01"
_RE_QUESTAO_PROVA = re.compile(r"^QUEST[ÃA]O\s+(\d{1,2})\s*$")

# Alternativa da prova: "AA texto..." (letra dobrada)
_RE_ALT_PROVA = re.compile(r"^([A-E])\1\s+(.*)")

# Fim do escopo da prova
_RE_FIM_PROVA = re.compile(r"Proposta de Redação|Questões de 46 a 90")


# ============================================================================
# Helpers internos — limpeza de texto
# ============================================================================

def _dehifenizar(linhas: list[str]) -> list[str]:
    """Junta linha terminada em '-' com a seguinte, sem espaço e sem o hífen."""
    resultado: list[str] = []
    i = 0
    while i < len(linhas):
        linha = linhas[i]
        while linha.endswith("-") and i + 1 < len(linhas):
            i += 1
            linha = linha[:-1] + linhas[i]
        resultado.append(linha)
        i += 1
    return resultado


def _localizar_inicio_linguagens(linhas: list[str]) -> list[str]:
    """Retorna o slice de linhas a partir da seção de Linguagens."""
    for idx, l in enumerate(linhas):
        if _RE_INICIO_LINGUAGENS.match(l.strip()):
            return linhas[idx:]
    raise ValueError("Seção 'LINGUAGENS, CÓDIGOS E SUAS TECNOLOGIAS' não encontrada no texto.")


# ============================================================================
# Função pura — parsear_gabarito
# ============================================================================

def parsear_gabarito(texto: str) -> list[RespostaGabarito]:
    """
    Recebe o texto completo de um gabarito SAS e devolve as RespostaGabarito
    de Linguagens (questões 01–45), nas duas variantes de idioma quando houver.

    Função pura — sem IO.
    """
    linhas = texto.splitlines()

    # Passo 1 — remover cabeçalhos e rodapés de página
    linhas = [l for l in linhas if not _RE_CABECALHO_PAG.match(l) and not _RE_RODAPE.search(l)]

    # Passo 2 — dehifenização
    linhas = _dehifenizar(linhas)

    # Passo 3 — localizar início de Linguagens
    linhas = _localizar_inicio_linguagens(linhas)

    # Passo 4 — cortar em "Questões de 46 a 90"
    for idx, l in enumerate(linhas):
        if _RE_FIM_GABARITO.search(l):
            linhas = linhas[:idx]
            break

    # Passo 5 — parse linha a linha
    respostas: list[RespostaGabarito] = []

    idioma_atual: Optional[Literal["ingles", "espanhol"]] = None
    numero_atual: Optional[int]    = None
    gabarito_atual: Optional[str]  = None
    competencia_atual: Optional[int] = None
    habilidade_atual: Optional[int] = None
    idioma_questao: Optional[Literal["ingles", "espanhol"]] = None
    alts_atual: list[tuple[str, bool, list[str]]] = []

    def _finalizar_questao_gab() -> None:
        if numero_atual is None:
            return
        _validar_e_registrar_gabarito(
            numero_atual, idioma_questao, competencia_atual,
            habilidade_atual, gabarito_atual, alts_atual, respostas,
        )

    for linha in linhas:
        if _RE_INGLES.search(linha):
            _finalizar_questao_gab()
            numero_atual = None
            alts_atual = []
            idioma_atual = "ingles"
            continue
        if _RE_ESPANHOL.search(linha):
            _finalizar_questao_gab()
            numero_atual = None
            alts_atual = []
            idioma_atual = "espanhol"
            continue

        m = _RE_CABECALHO_QUESTAO_GAB.match(linha.strip())
        if m:
            _finalizar_questao_gab()
            numero_atual      = int(m.group(1))
            gabarito_atual    = m.group(2)
            competencia_atual = int(m.group(3))
            habilidade_atual  = int(m.group(4))
            idioma_questao    = idioma_atual if numero_atual <= 5 else None
            alts_atual = []
            continue

        m = _RE_ALTERNATIVA_GAB.match(linha.strip())
        if m:
            alts_atual.append((m.group(1), m.group(2) == "V", [m.group(3)]))
            continue

        if alts_atual and linha.strip():
            alts_atual[-1][2].append(linha.strip())

    _finalizar_questao_gab()
    return respostas


def _validar_e_registrar_gabarito(
    numero: int,
    idioma: Optional[Literal["ingles", "espanhol"]],
    competencia: int,
    habilidade: int,
    gabarito: str,
    alts_raw: list[tuple[str, bool, list[str]]],
    destino: list[RespostaGabarito],
) -> None:
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

    letra_correta_maiusc = corretas[0][0].upper()
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


# ============================================================================
# Função pura — parsear_prova
# ============================================================================

def parsear_prova(texto: str) -> list[QuestaoProva]:
    """
    Recebe o texto completo de uma prova SAS (pós-recorte de coluna) e devolve
    as QuestaoProva de Linguagens (questões 01–45).

    Função pura — sem IO.
    """
    linhas = texto.splitlines()

    # Passo 1 — remover lixo e cabeçalhos de copyright
    linhas_limpas: list[str] = []
    for l in linhas:
        sem_espacos = l.replace(" ", "")
        if sem_espacos and _RE_LIXO_PROVA.match(sem_espacos):
            continue
        if _RE_COPYRIGHT.search(l):
            continue
        if _RE_ENEM_LINHA.match(l.strip()):
            continue
        if sem_espacos and _RE_NUMERO_2200.match(sem_espacos):
            continue
        if _RE_LC_LINHA.match(l.strip()):
            continue
        linhas_limpas.append(l)
    linhas = linhas_limpas

    # Passo 2 — dehifenização
    linhas = _dehifenizar(linhas)

    # Passo 3 — localizar início de Linguagens PRIMEIRO
    linhas = _localizar_inicio_linguagens(linhas)

    # Passo 4 — cortar em "Proposta de Redação" ou "Questões de 46 a 90" (exclusive)
    for idx, l in enumerate(linhas):
        if _RE_FIM_PROVA.search(l):
            linhas = linhas[:idx]
            break

    # Passo 5 — parse linha a linha
    questoes: list[QuestaoProva] = []

    idioma_atual: Optional[Literal["ingles", "espanhol"]] = None
    numero_atual: Optional[int]    = None
    idioma_questao: Optional[Literal["ingles", "espanhol"]] = None
    enunciado_linhas: list[str]    = []
    # (letra_maiusc, linhas_texto)
    alts_atual: list[tuple[str, list[str]]] = []
    estado: str = "nenhum"  # "nenhum" | "enunciado" | "alternativa"

    def _finalizar_questao_prova() -> None:
        if numero_atual is None:
            return
        _validar_e_registrar_prova(
            numero_atual, idioma_questao, enunciado_linhas, alts_atual, questoes
        )

    for linha in linhas:
        if _RE_INGLES.search(linha):
            _finalizar_questao_prova()
            numero_atual = None
            estado = "nenhum"
            idioma_atual = "ingles"
            continue
        if _RE_ESPANHOL.search(linha):
            _finalizar_questao_prova()
            numero_atual = None
            estado = "nenhum"
            idioma_atual = "espanhol"
            continue

        m = _RE_QUESTAO_PROVA.match(linha.strip())
        if m:
            _finalizar_questao_prova()
            numero_atual     = int(m.group(1))
            idioma_questao   = idioma_atual if numero_atual <= 5 else None
            enunciado_linhas = []
            alts_atual       = []
            estado           = "enunciado"
            continue

        m = _RE_ALT_PROVA.match(linha.strip())
        if m:
            estado = "alternativa"
            alts_atual.append((m.group(1), [m.group(2)]))
            continue

        if estado == "enunciado" and linha.strip():
            enunciado_linhas.append(linha.strip())
        elif estado == "alternativa" and alts_atual and linha.strip():
            alts_atual[-1][1].append(linha.strip())

    _finalizar_questao_prova()
    return questoes


def _validar_e_registrar_prova(
    numero: int,
    idioma: Optional[Literal["ingles", "espanhol"]],
    enunciado_linhas: list[str],
    alts_raw: list[tuple[str, list[str]]],
    destino: list[QuestaoProva],
) -> None:
    LETRAS = list("ABCDE")
    letras_presentes = [a[0] for a in alts_raw]
    if len(alts_raw) != 5 or letras_presentes != LETRAS:
        raise ValueError(
            f"Questão {numero}: esperadas alternativas A–E em ordem, "
            f"encontradas {letras_presentes}."
        )

    alternativas = [
        AlternativaProva(letra=letra, texto=" ".join(linhas).strip())
        for letra, linhas in alts_raw
    ]

    destino.append(QuestaoProva(
        numero=numero,
        idioma=idioma,
        enunciado="\n".join(enunciado_linhas),
        alternativas=alternativas,
    ))


# ============================================================================
# IO isolado (borda — migra pro extrair.py depois)
# ============================================================================

def _ler_texto_pdf(caminho: str) -> str:
    """Lê um gabarito PDF (página simples) e devolve o texto completo."""
    import pdfplumber
    paginas: list[str] = []
    with pdfplumber.open(caminho) as pdf:
        for pagina in pdf.pages:
            t = pagina.extract_text() or ""
            paginas.append(t)
    return "\n".join(paginas)


def _ler_texto_prova(caminho: str) -> str:
    """
    Lê uma prova PDF em duas colunas: recorta cada página ao meio (esquerda e
    direita) e extrai cada metade separadamente, evitando o entrelaçamento de
    colunas que extract_text() normal produziria.
    """
    import pdfplumber
    paginas: list[str] = []
    with pdfplumber.open(caminho) as pdf:
        for p in pdf.pages:
            w, h = p.width, p.height
            esq = p.crop((0, 0, w / 2, h)).extract_text() or ""
            dir_ = p.crop((w / 2, 0, w, h)).extract_text() or ""
            paginas.append(esq + "\n" + dir_)
    return "\n".join(paginas)


# ============================================================================
# Função pura — montar_questoes (merge prova + gabarito -> list[Questao])
# ============================================================================

def montar_questoes(
    provas: list[QuestaoProva],
    gabaritos: list[RespostaGabarito],
    id_base: str,
    fonte: str,
    simulado: int,
) -> list[Questao]:
    """
    Casa QuestaoProva e RespostaGabarito pela chave (numero, idioma) e devolve
    a lista de Questao Pydantic na ordem das provas.

    Função pura — sem IO.
    """
    _SUFIXO_IDIOMA: dict[Optional[str], str] = {
        "ingles": "-EN",
        "espanhol": "-ES",
        None: "",
    }

    indice_gab: dict[tuple[int, Optional[str]], RespostaGabarito] = {
        (g.numero, g.idioma): g for g in gabaritos
    }

    # Verifica se há gabaritos sem prova correspondente
    chaves_prova: set[tuple[int, Optional[str]]] = {(p.numero, p.idioma) for p in provas}
    for chave in indice_gab:
        if chave not in chaves_prova:
            raise ValueError(
                f"Gabarito sem prova correspondente: numero={chave[0]}, idioma={chave[1]}"
            )

    questoes: list[Questao] = []
    for prova in provas:
        chave = (prova.numero, prova.idioma)
        if chave not in indice_gab:
            raise ValueError(
                f"Prova sem gabarito correspondente: numero={prova.numero}, idioma={prova.idioma}"
            )
        gab = indice_gab[chave]

        sufixo = _SUFIXO_IDIOMA[prova.idioma]
        id_questao = f"{id_base}-Q{prova.numero:02d}{sufixo}"

        # Monta alternativas combinando texto (prova) + correta/comentario (gabarito)
        if len(prova.alternativas) != len(gab.alternativas):
            raise ValueError(
                f"Questão {prova.numero} (idioma={prova.idioma}): "
                f"prova tem {len(prova.alternativas)} alternativas, "
                f"gabarito tem {len(gab.alternativas)}."
            )

        alternativas: list[Alternativa] = []
        for alt_prova, alt_gab in zip(prova.alternativas, gab.alternativas):
            if alt_prova.letra != alt_gab.letra:
                raise ValueError(
                    f"Questão {prova.numero}: letra da prova '{alt_prova.letra}' "
                    f"difere da letra do gabarito '{alt_gab.letra}'."
                )
            alternativas.append(Alternativa(
                letra=alt_prova.letra,
                texto=alt_prova.texto,
                correta=alt_gab.correta,
                comentario=alt_gab.comentario,
            ))

        questoes.append(Questao(
            id=id_questao,
            fonte=fonte,
            simulado=simulado,
            numero=prova.numero,
            area="Linguagens",
            idioma=prova.idioma,
            enunciado=prova.enunciado,
            imagens=[],
            alternativas=alternativas,
            gabarito=gab.gabarito,
            competencia=gab.competencia,
            habilidade=gab.habilidade,
            confianca_extracao="alta",
        ))

    return questoes


# ============================================================================
# Entry-point do adaptador (IO nas bordas)
# ============================================================================

def extrair(par: dict) -> list[Questao]:
    """
    Lê os PDFs de prova e gabarito do par, parseia e monta as Questao finais.
    Interface do padrão Adapter: nova fonte = novo arquivo, sem tocar aqui.
    """
    texto_prova    = _ler_texto_prova(par["prova"])
    texto_gabarito = _ler_texto_pdf(par["gabarito"])

    provas    = parsear_prova(texto_prova)
    gabaritos = parsear_gabarito(texto_gabarito)

    ano = par.get("ano", "")
    return montar_questoes(
        provas,
        gabaritos,
        id_base=par["id"],
        fonte=f"SAS{ano}",
        simulado=par["numero"],
    )


# ============================================================================
# Conferência manual via linha de comando
# ============================================================================

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python -m adaptadores.sas <gabarito|prova> <caminho.pdf>")
        sys.exit(1)

    subcomando = sys.argv[1].lower()
    caminho    = sys.argv[2]

    if subcomando == "gabarito":
        texto     = _ler_texto_pdf(caminho)
        respostas = parsear_gabarito(texto)
        print(f"Total de questões extraídas: {len(respostas)}")
        if respostas:
            print("Primeira questão:")
            print(respostas[0])
    elif subcomando == "prova":
        texto    = _ler_texto_prova(caminho)
        questoes = parsear_prova(texto)
        print(f"Total de questões extraídas: {len(questoes)}")
        if questoes:
            print("Primeira questão:")
            print(questoes[0])
    else:
        print(f"Subcomando desconhecido: '{subcomando}'. Use 'gabarito' ou 'prova'.")
        sys.exit(1)
