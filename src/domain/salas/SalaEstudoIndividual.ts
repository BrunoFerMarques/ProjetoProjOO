import { Sala } from "../Sala.js";

export class SalaEstudoIndividual extends Sala {
  descricaoTipo(): string {
    return "Estudo individual (silêncio)";
  }
}
