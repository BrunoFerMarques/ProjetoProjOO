export type PapelUsuario = "ESTUDANTE" | "DOCENTE";

export class Usuario {
  constructor(
    readonly id: string,
    readonly nome: string,
    readonly papel: PapelUsuario
  ) {}
}
