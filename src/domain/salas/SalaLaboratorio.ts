import { Sala } from "../Sala.js";

export class SalaLaboratorio extends Sala {
  descricaoTipo(): string {
    return "Laboratório";
  }
}
