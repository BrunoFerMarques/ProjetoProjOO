import { Sala } from "../../domain/Sala.js";
import { SalaEstudoIndividual } from "../../domain/salas/SalaEstudoIndividual.js";
import { SalaLaboratorio } from "../../domain/salas/SalaLaboratorio.js";
import { SalaTrabalhoGrupo } from "../../domain/salas/SalaTrabalhoGrupo.js";
import type { TipoSala } from "./TipoSala.js";

export class SalaFactory {
  criar(tipo: TipoSala, id: string, nome: string, capacidade: number): Sala {
    switch (tipo) {
      case "INDIVIDUAL":
        return new SalaEstudoIndividual(id, nome, capacidade);
      case "GRUPO":
        return new SalaTrabalhoGrupo(id, nome, capacidade);
      case "LABORATORIO":
        return new SalaLaboratorio(id, nome, capacidade);
      default: {
        const _: never = tipo;
        return _;
      }
    }
  }
}
