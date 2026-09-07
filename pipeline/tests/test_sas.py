import pytest

from adaptadores.sas import parsear_gabarito, parsear_prova

FIXTURE = """\
LINGUAGENS, CÓDIGOS E SUAS TECNOLOGIAS
Questões de 01 a 45
Questões de 01 a 05 (opção inglês)
01. Resposta correta: A C 2 H 5
a) (V) A alternativa está correta porque o uso dos termos reforça a capacidade da espe-
rança de resistir.
b) (F) A alternativa está incorreta porque o texto não afirma que a esperança soluciona tudo.
RESOLUÇÃO – 1o SIMULADO SAS ENEM 2024 | 1o DIA
c) (F) A alternativa está incorreta porque os termos tratam apenas de tormentas.
d) (F) A alternativa está incorreta porque o poema traz a imagem de um pássaro que canta.
e) (F) A alternativa está incorreta porque o eu lírico não aborda a autoconfiança.
LINGUAGENS, CÓDIGOS E SUAS TECNOLOGIAS / CIÊNCIAS HUMANAS E SUAS TECNOLOGIAS 2
Questões de 01 a 05 (opção espanhol)
01. Resposta correta: C C 2 H 7
a) (F) Comentário a.
b) (F) Comentário b.
c) (V) Comentário c, o correto.
d) (F) Comentário d.
e) (F) Comentário e.
06. Resposta correta: B C 3 H 9
a) (F) Comentário a.
b) (V) Comentário b, o correto.
c) (F) Comentário c.
d) (F) Comentário d.
e) (F) Comentário e.
CIÊNCIAS HUMANAS E SUAS TECNOLOGIAS
Questões de 46 a 90
46. Resposta correta: A C 5 H 20
a) (V) Não deve ser parseado.
b) (F) x.
c) (F) x.
d) (F) x.
e) (F) x.
"""


def test_total_questoes():
    qs = parsear_gabarito(FIXTURE)
    assert len(qs) == 3, f"esperadas 3 questões, obtidas {len(qs)}"


def test_q0_ingles(  ):
    q = parsear_gabarito(FIXTURE)[0]
    assert q.numero     == 1
    assert q.idioma     == "ingles"
    assert q.competencia == 2
    assert q.habilidade == 5
    assert q.gabarito   == "A"
    assert len(q.alternativas) == 5


def test_q0_alternativa_correta():
    q = parsear_gabarito(FIXTURE)[0]
    corretas = [a for a in q.alternativas if a.correta]
    assert len(corretas) == 1
    assert corretas[0].letra == "A"


def test_q0_dehifenizacao():
    """O comentário da alternativa A deve conter 'esperança de resistir' (sem hífem de quebra)."""
    q = parsear_gabarito(FIXTURE)[0]
    alt_a = next(a for a in q.alternativas if a.letra == "A")
    assert "esperança de resistir" in alt_a.comentario


def test_q1_espanhol():
    q = parsear_gabarito(FIXTURE)[1]
    assert q.numero     == 1
    assert q.idioma     == "espanhol"
    assert q.habilidade == 7
    assert q.gabarito   == "C"
    corretas = [a for a in q.alternativas if a.correta]
    assert corretas[0].letra == "C"


def test_q2_sem_idioma():
    q = parsear_gabarito(FIXTURE)[2]
    assert q.numero  == 6
    assert q.idioma  is None
    assert q.gabarito == "B"


def test_divergencia_v_gabarito_levanta_erro():
    """(V) numa letra diferente do 'Resposta correta:' deve levantar ValueError."""
    texto_invalido = """\
LINGUAGENS, CÓDIGOS E SUAS TECNOLOGIAS
Questões de 01 a 45
Questões de 01 a 05 (opção inglês)
01. Resposta correta: A C 2 H 5
a) (F) Comentário a.
b) (V) Comentário b — deveria ser A, mas o (V) está em b.
c) (F) Comentário c.
d) (F) Comentário d.
e) (F) Comentário e.
"""
    with pytest.raises(ValueError, match="1"):
        parsear_gabarito(texto_invalido)


# ============================================================================
# Testes — parsear_prova
# ============================================================================

FIXTURE_PROVA = """\
LINGUAGENS, CÓDIGOS E SUAS TECNOLOGIAS
Questões de 01 a 45
Questões de 01 a 05 (opção inglês)
QUESTÃO 01
"Hope" is the thing with feathers –
That perches in the soul –
LUZA4202MENE
No poema de Emily Dickinson, as palavras revelam, por parte do eu lírico, uma
AA impressão de que a esperança é inabalá-
vel, mesmo diante de uma perturbação.
BB simpatia pela ideia de que a esperança soluciona as situações.
Copyright © 2024 de SAS Plataforma de Educação
CC definição de esperança como algo presente.
DD percepção da esperança pelo ressurgimento.
EE expectativa de manter as pessoas confiantes.
Questões de 01 a 05 (opção espanhol)
QUESTÃO 01
Texto em espanhol de exemplo.
La pregunta correcta es
AA alternativa a espanhol.
BB alternativa b.
CC alternativa c.
DD alternativa d.
EE alternativa e.
QUESTÃO 06
Enunciado da questão seis.
AA alternativa a.
BB alternativa b.
CC alternativa c.
DD alternativa d.
EE alternativa e.
Proposta de Redação
QUESTÃO 46
Não deve aparecer (Ciências Humanas).
AA x.
BB x.
CC x.
DD x.
EE x.
"""


def test_prova_total_questoes():
    qs = parsear_prova(FIXTURE_PROVA)
    assert len(qs) == 3, f"esperadas 3 questões, obtidas {len(qs)}"


def test_prova_q0_ingles():
    q = parsear_prova(FIXTURE_PROVA)[0]
    assert q.numero == 1
    assert q.idioma == "ingles"
    assert len(q.alternativas) == 5
    assert [a.letra for a in q.alternativas] == ["A", "B", "C", "D", "E"]


def test_prova_q0_enunciado():
    q = parsear_prova(FIXTURE_PROVA)[0]
    assert "Hope" in q.enunciado
    assert "eu lírico" in q.enunciado
    assert "LUZA4202MENE" not in q.enunciado


def test_prova_q0_dehifenizacao():
    """Alternativa A deve conter 'inabalável' (dehifenização de 'inabalá-\\nvel')."""
    q = parsear_prova(FIXTURE_PROVA)[0]
    alt_a = next(a for a in q.alternativas if a.letra == "A")
    assert "inabalável" in alt_a.texto


def test_prova_q0_sem_copyright():
    """Copyright removido mesmo quando cai no meio das alternativas."""
    q = parsear_prova(FIXTURE_PROVA)[0]
    for alt in q.alternativas:
        assert "Copyright" not in alt.texto


def test_prova_q1_espanhol():
    q = parsear_prova(FIXTURE_PROVA)[1]
    assert q.numero == 1
    assert q.idioma == "espanhol"


def test_prova_q2_sem_idioma():
    q = parsear_prova(FIXTURE_PROVA)[2]
    assert q.numero == 6
    assert q.idioma is None


def test_prova_4_alternativas_levanta_erro():
    """Questão com apenas 4 alternativas deve levantar ValueError."""
    texto_invalido = """\
LINGUAGENS, CÓDIGOS E SUAS TECNOLOGIAS
Questões de 01 a 45
QUESTÃO 07
Enunciado qualquer.
AA alternativa a.
BB alternativa b.
CC alternativa c.
DD alternativa d.
"""
    with pytest.raises(ValueError):
        parsear_prova(texto_invalido)
