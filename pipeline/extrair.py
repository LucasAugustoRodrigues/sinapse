# extrair.py — orquestrador da fábrica (IO vive aqui).
#
# Fluxo (ver PLANEJAMENTO.md §6):
#   le data/manifest.yaml -> para cada par, o adaptador SAS extrai gabarito+prova
#   -> casa por numero -> recorta imagens -> valida (alta/revisar)
#   -> escreve data/processed/questoes.json + revisao.md
#
# TODO(sonnet): implementar. Um comando roda tudo: `python extrair.py`.


def main() -> None:
    raise NotImplementedError("Ver PLANEJAMENTO.md §6 e o CLAUDE.md.")


if __name__ == "__main__":
    main()
