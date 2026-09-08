from nucleo.imagens import Figura, Marcador, associar_figuras


def _marc(pagina, coluna, top, numero, idioma=None) -> Marcador:
    return Marcador(pagina=pagina, coluna=coluna, top=top, numero=numero, idioma=idioma)


def _fig(pagina, coluna, top, x0=10.0, x1=200.0, bottom=None) -> Figura:
    return Figura(
        pagina=pagina, coluna=coluna, top=top,
        x0=x0, x1=x1, bottom=bottom if bottom is not None else top + 100.0,
    )


def test_figura_associada_ao_marcador_acima():
    """Figura logo abaixo de um marcador na mesma pág/coluna é associada a ele."""
    marcadores = [_marc(1, "L", 100.0, numero=5, idioma="ingles")]
    figuras    = [_fig(1, "L", 180.0)]
    resultado  = associar_figuras(marcadores, figuras)
    assert (5, "ingles") in resultado
    assert len(resultado[(5, "ingles")]) == 1


def test_duas_figuras_mesmo_marcador_ordenadas_por_top():
    """Duas figuras sob o mesmo marcador devem aparecer ordenadas por top crescente."""
    marcadores = [_marc(1, "L", 50.0, numero=10)]
    figuras    = [_fig(1, "L", 300.0), _fig(1, "L", 150.0)]
    resultado  = associar_figuras(marcadores, figuras)
    figs = resultado[(10, None)]
    assert len(figs) == 2
    assert figs[0].top < figs[1].top


def test_figura_ciencias_humanas_descartada():
    """Figura sob marcador numero=60 (fora de 1–45) deve ser descartada."""
    marcadores = [_marc(2, "R", 80.0, numero=60)]
    figuras    = [_fig(2, "R", 200.0)]
    resultado  = associar_figuras(marcadores, figuras)
    assert len(resultado) == 0


def test_figura_idioma_espanhol():
    """Figura sob marcador (numero=2, idioma='espanhol') -> chave (2, 'espanhol')."""
    marcadores = [_marc(1, "R", 60.0, numero=2, idioma="espanhol")]
    figuras    = [_fig(1, "R", 120.0)]
    resultado  = associar_figuras(marcadores, figuras)
    assert (2, "espanhol") in resultado
    assert len(resultado[(2, "espanhol")]) == 1
