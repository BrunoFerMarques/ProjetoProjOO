import { Sala } from "../Sala.js";

export class SalaTrabalhoGrupo extends Sala {
  descricaoTipo(): string {
    return "Trabalho em grupo";
  }
}
