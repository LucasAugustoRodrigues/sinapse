"""
extrair.py — orquestrador da fábrica (IO vive aqui).

Fluxo: lê data/manifest.yaml -> para cada par chama o adaptador SAS
-> junta todas as Questao -> escreve data/processed/questoes.json.

Uso: python extrair.py  (rodando de dentro de pipeline/)
"""

from pathlib import Path

import yaml

import adaptadores.sas as sas
from nucleo.escrever import escrever_questoes
from nucleo.modelos import Questao

# Raiz do projeto = pai de pipeline/
_RAIZ = Path(__file__).resolve().parent.parent


def main() -> None:
    manifest_path = _RAIZ / "data" / "manifest.yaml"
    with manifest_path.open(encoding="utf-8") as f:
        manifest = yaml.safe_load(f)

    todas_questoes: list[Questao] = []
    erros: list[tuple[str, str]] = []

    for par in manifest["pares"]:
        par_resolvido = dict(par)
        par_resolvido["prova"]    = str(_RAIZ / par["prova"])
        par_resolvido["gabarito"] = str(_RAIZ / par["gabarito"])

        try:
            questoes = sas.extrair(par_resolvido)
            todas_questoes.extend(questoes)
            print(f"  OK  {par['id']} — {len(questoes)} questões")
        except Exception as exc:
            erros.append((par["id"], str(exc)))
            print(f"ERRO  {par['id']} — {exc}")

    destino = str(_RAIZ / "data" / "processed" / "questoes.json")
    escrever_questoes(todas_questoes, destino)

    # Resumo
    contagem_idioma: dict[str, int] = {}
    for q in todas_questoes:
        chave = q.idioma or "sem_idioma"
        contagem_idioma[chave] = contagem_idioma.get(chave, 0) + 1

    print()
    print("=" * 50)
    print(f"Pares processados com sucesso : {len(manifest['pares']) - len(erros)}/{len(manifest['pares'])}")
    print(f"Pares com erro                : {len(erros)}")
    for id_par, motivo in erros:
        print(f"  {id_par}: {motivo[:120]}")
    print(f"Total de questões geradas     : {len(todas_questoes)}")
    print("Por idioma:")
    for idioma, n in sorted(contagem_idioma.items()):
        print(f"  {idioma}: {n}")
    print(f"Arquivo gerado: {destino}")


if __name__ == "__main__":
    main()
