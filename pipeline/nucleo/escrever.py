"""
escrever.py — gera data/processed/questoes.json (IO nas bordas).
"""

import json
from pathlib import Path

from nucleo.modelos import Questao


def escrever_questoes(questoes: list[Questao], caminho: str) -> None:
    """Serializa a lista de Questao em JSON UTF-8 indentado. Cria a pasta se necessário."""
    destino = Path(caminho)
    destino.parent.mkdir(parents=True, exist_ok=True)
    dados = [q.model_dump() for q in questoes]
    destino.write_text(
        json.dumps(dados, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
