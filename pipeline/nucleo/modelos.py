from typing import Literal, Optional
from pydantic import BaseModel, field_validator, model_validator


LetraAlternativa = Literal["A", "B", "C", "D", "E"]
LETRAS_VALIDAS: set[str] = {"A", "B", "C", "D", "E"}


class Alternativa(BaseModel):
    letra: LetraAlternativa
    texto: str
    correta: bool
    comentario: str

    @field_validator("texto")
    @classmethod
    def texto_nao_vazio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("texto da alternativa não pode ser vazio")
        return v


class Questao(BaseModel):
    id: str
    fonte: str
    simulado: int
    numero: int
    area: str = "Linguagens"
    idioma: Optional[Literal["ingles", "espanhol"]] = None
    enunciado: str
    imagens: list[str] = []
    alternativas: list[Alternativa]
    gabarito: LetraAlternativa
    competencia: int
    habilidade: int
    confianca_extracao: Literal["alta", "revisar"] = "alta"

    @field_validator("id")
    @classmethod
    def id_nao_vazio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("id não pode ser vazio")
        return v

    @field_validator("enunciado")
    @classmethod
    def enunciado_nao_vazio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("enunciado não pode ser vazio")
        return v

    @field_validator("simulado")
    @classmethod
    def simulado_positivo(cls, v: int) -> int:
        if v < 1:
            raise ValueError("simulado deve ser >= 1")
        return v

    @field_validator("numero")
    @classmethod
    def numero_positivo(cls, v: int) -> int:
        if v < 1:
            raise ValueError("numero deve ser >= 1")
        return v

    @field_validator("habilidade")
    @classmethod
    def habilidade_valida(cls, v: int) -> int:
        if not (1 <= v <= 30):
            raise ValueError("habilidade deve estar entre 1 e 30")
        return v

    @field_validator("competencia")
    @classmethod
    def competencia_valida(cls, v: int) -> int:
        if not (1 <= v <= 9):
            raise ValueError("competencia deve estar entre 1 e 9")
        return v

    @model_validator(mode="after")
    def validar_alternativas_e_gabarito(self) -> "Questao":
        alts = self.alternativas

        if len(alts) != 5:
            raise ValueError(f"exatamente 5 alternativas exigidas; recebidas {len(alts)}")

        letras = [a.letra for a in alts]
        if set(letras) != LETRAS_VALIDAS:
            raise ValueError(f"alternativas devem ter as letras A, B, C, D, E (sem repetição); encontradas {letras}")
        if len(letras) != len(set(letras)):
            raise ValueError(f"letras repetidas nas alternativas: {letras}")

        corretas = [a for a in alts if a.correta]
        if len(corretas) != 1:
            raise ValueError(f"exatamente 1 alternativa deve ser correta; encontradas {len(corretas)}")

        letra_correta = corretas[0].letra
        if self.gabarito != letra_correta:
            raise ValueError(
                f"gabarito '{self.gabarito}' difere da letra da alternativa correta '{letra_correta}'"
            )

        if self.idioma is not None and self.numero > 5:
            raise ValueError(
                f"idioma só é permitido nas questões 1–5; questão numero={self.numero} não pode ter idioma"
            )
        if self.numero <= 5 and self.idioma is None:
            raise ValueError(
                f"idioma é obrigatório nas questões 1–5; questão numero={self.numero} recebeu idioma=None"
            )

        return self
