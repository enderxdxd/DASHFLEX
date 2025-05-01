// src/types/plano.ts
export interface Plano {
  plano:    string;   // nome do plano (ex.: "Semestral")
  min:      number;   // valor mínimo do intervalo
  max:      number;   // valor máximo do intervalo
  semMeta:  number;   // comissão quando NÃO bate a própria meta
  comMeta:  number;   // comissão quando bate a própria meta
  metaTME:  number;   // comissão extra se a unidade bate a metaUnidade
}
