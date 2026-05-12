export abstract class Sala {
  constructor(
    readonly id: string,
    readonly nome: string,
    readonly capacidade: number
  ) {}

  abstract descricaoTipo(): string;
}
