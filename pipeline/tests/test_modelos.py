import pytest
from pydantic import ValidationError

from nucleo.modelos import Alternativa, Questao


def _alternativas(gabarito: str = "A") -> list[dict]:
    """Retorna 5 alternativas com exatamente 1 correta (a letra indicada)."""
    return [
        {"letra": l, "texto": f"Texto {l}", "correta": l == gabarito, "comentario": f"Comentário {l}"}
        for l in ["A", "B", "C", "D", "E"]
    ]


@pytest.fixture
def questao_valida() -> dict:
    return {
        "id": "SAS2024-S1-Q01-EN",
        "fonte": "SAS2024",
        "simulado": 1,
        "numero": 1,
        "area": "Linguagens",
        "idioma": "ingles",
        "enunciado": "Qual o sentido da expressão no contexto?",
        "imagens": [],
        "alternativas": _alternativas("A"),
        "gabarito": "A",
        "competencia": 2,
        "habilidade": 5,
        "confianca_extracao": "alta",
    }


def test_questao_valida_instancia(questao_valida):
    q = Questao(**questao_valida)
    assert q.id == "SAS2024-S1-Q01-EN"
    assert q.gabarito == "A"
    assert q.habilidade == 5
    assert q.competencia == 2


def test_questao_valida_serializa(questao_valida):
    q = Questao(**questao_valida)
    d = q.model_dump()
    assert d["id"] == "SAS2024-S1-Q01-EN"
    assert len(d["alternativas"]) == 5
    assert d["confianca_extracao"] == "alta"


# --- Validações de alternativas ---

def test_4_alternativas_falha(questao_valida):
    questao_valida["alternativas"] = _alternativas()[:4]
    with pytest.raises(ValidationError, match="5 alternativas"):
        Questao(**questao_valida)


def test_6_alternativas_falha(questao_valida):
    alts = _alternativas()
    alts.append({"letra": "A", "texto": "Extra", "correta": False, "comentario": ""})
    questao_valida["alternativas"] = alts
    with pytest.raises(ValidationError):
        Questao(**questao_valida)


def test_letras_repetidas_falha(questao_valida):
    alts = _alternativas()
    alts[4]["letra"] = "A"  # duplica A, remove E
    questao_valida["alternativas"] = alts
    with pytest.raises(ValidationError):
        Questao(**questao_valida)


def test_zero_corretas_falha(questao_valida):
    for a in questao_valida["alternativas"]:
        a["correta"] = False
    with pytest.raises(ValidationError, match="1 alternativa"):
        Questao(**questao_valida)


def test_duas_corretas_falha(questao_valida):
    questao_valida["alternativas"][0]["correta"] = True
    questao_valida["alternativas"][1]["correta"] = True
    with pytest.raises(ValidationError, match="1 alternativa"):
        Questao(**questao_valida)


def test_gabarito_diferente_da_correta_falha(questao_valida):
    # correta é A, gabarito aponta B
    questao_valida["gabarito"] = "B"
    with pytest.raises(ValidationError, match="gabarito"):
        Questao(**questao_valida)


# --- Validações de habilidade e competência ---

def test_habilidade_zero_falha(questao_valida):
    questao_valida["habilidade"] = 0
    with pytest.raises(ValidationError, match="habilidade"):
        Questao(**questao_valida)


def test_habilidade_31_falha(questao_valida):
    questao_valida["habilidade"] = 31
    with pytest.raises(ValidationError, match="habilidade"):
        Questao(**questao_valida)


def test_competencia_zero_falha(questao_valida):
    questao_valida["competencia"] = 0
    with pytest.raises(ValidationError, match="competencia"):
        Questao(**questao_valida)


def test_competencia_10_falha(questao_valida):
    questao_valida["competencia"] = 10
    with pytest.raises(ValidationError, match="competencia"):
        Questao(**questao_valida)


# --- Validação de idioma ---

def test_idioma_em_questao_6_falha(questao_valida):
    questao_valida["numero"] = 6
    questao_valida["idioma"] = "espanhol"
    with pytest.raises(ValidationError, match="idioma"):
        Questao(**questao_valida)


def test_idioma_em_questao_5_ok(questao_valida):
    questao_valida["numero"] = 5
    questao_valida["idioma"] = "espanhol"
    q = Questao(**questao_valida)
    assert q.idioma == "espanhol"


def test_sem_idioma_em_questao_6_ok(questao_valida):
    questao_valida["numero"] = 6
    questao_valida["idioma"] = None
    questao_valida["alternativas"] = _alternativas("A")
    q = Questao(**questao_valida)
    assert q.idioma is None


def test_idioma_obrigatorio_em_questao_1a5_falha(questao_valida):
    questao_valida["numero"] = 3
    questao_valida["idioma"] = None
    with pytest.raises(ValidationError, match="idioma"):
        Questao(**questao_valida)


# --- Validação de enunciado ---

def test_enunciado_vazio_falha(questao_valida):
    questao_valida["enunciado"] = "   "
    with pytest.raises(ValidationError, match="enunciado"):
        Questao(**questao_valida)
