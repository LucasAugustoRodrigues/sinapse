# sas.py — adaptador do formato SAS (padrao Adapter).
#
# Interface comum: extrair(par) -> list[Questao].
# Outra fonte no futuro = novo arquivo aqui, sem tocar no resto.
# Funcoes puras de parse (nao leem/escrevem arquivo).
#
# TODO(sonnet): parser do gabarito comentado
#   (NN. Resposta correta: X ; selo C<n> H<n> ; a) (V/F) comentario ...)
#   e do enunciado (cada questao comeca em "Questao NN"), casando por numero.
#   Atencao: questoes 1-5 tem variante ingles/espanhol (campo idioma).
