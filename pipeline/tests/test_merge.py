import pytest

from adaptadores.sas import (
    AlternativaGabarito,
    AlternativaProva,
    QuestaoProva,
    RespostaGabarito,
    montar_questoes,
)


def _alt_gabarito(letra: str, correta: bool) -> AlternativaGabarito:
    return AlternativaGabarito(letra=letra, correta=correta, comentario=f"Comentário {letra}.")


def _alt_prova(letra: str) -> AlternativaProva:
    return AlternativaProva(letra=letra, texto=f"Texto da alternativa {letra}.")


def _gabaritos_5(gabarito: str = "B", numero: int = 6, idioma=None) -> list[RespostaGabarito]:
    letras = ["A", "B", "C", "D", "E"]
    alts = [_alt_gabarito(l, l == gabarito) for l in letras]
    return [RespostaGabarito(
        numero=numero,
        idioma=idioma,
        competencia=3,
        habilidade=9,
        gabarito=gabarito,
        alternativas=alts,
    )]


def _provas_5(numero: int = 6, idioma=None) -> list[QuestaoProva]:
    alts = [_alt_prova(l) for l in ["A", "B", "C", "D", "E"]]
    return [QuestaoProva(
        numero=numero,
        idioma=idioma,
        enunciado="Enunciado de teste.",
        alternativas=alts,
    )]


# ---------------------------------------------------------------------------
# Casos de sucesso
# ---------------------------------------------------------------------------

def test_merge_basico_sem_idioma():
    qs = montar_questoes(_provas_5(), _gabaritos_5(), "SAS2024-S1", "SAS2024", 1)
    assert len(qs) == 1
    q = qs[0]
    assert q.id == "SAS2024-S1-Q06"
    assert q.enunciado == "Enunciado de teste."
    assert q.gabarito == "B"
    assert q.competencia == 3
    assert q.habilidade == 9
    assert len(q.alternativas) == 5


def test_merge_alternativas_combinadas():
    qs = montar_questoes(_provas_5(), _gabaritos_5(gabarito="B"), "SAS2024-S1", "SAS2024", 1)
    q = qs[0]
    alt_b = next(a for a in q.alternativas if a.letra == "B")
    assert alt_b.texto == "Texto da alternativa B."
    assert alt_b.correta is True
    assert alt_b.comentario == "Comentário B."
    alt_a = next(a for a in q.alternativas if a.letra == "A")
    assert alt_a.correta is False


def test_merge_idioma_ingles_sufixo():
    provas    = _provas_5(numero=1, idioma="ingles")
    gabaritos = _gabaritos_5(numero=1, idioma="ingles", gabarito="A")
    qs = montar_questoes(provas, gabaritos, "SAS2024-S1", "SAS2024", 1)
    assert qs[0].id == "SAS2024-S1-Q01-EN"
    assert qs[0].idioma == "ingles"


# ---------------------------------------------------------------------------
# Caso de falha
# ---------------------------------------------------------------------------

def test_merge_prova_sem_gabarito_levanta_erro():
    provas    = _provas_5(numero=6, idioma=None)
    gabaritos = _gabaritos_5(numero=7, idioma=None)  # chave diferente
    with pytest.raises(ValueError):
        montar_questoes(provas, gabaritos, "SAS2024-S1", "SAS2024", 1)
