import type { Reserva } from "../../domain/Reserva.js";
import { intervalosSobrepostos } from "../../domain/Reserva.js";
import type { Usuario } from "../../domain/Usuario.js";

export interface ResultadoPolitica {
  permitido: boolean;
  motivo?: string;
  cancelarIds: string[];
}

export interface PoliticaDeReserva {
  avaliar(
    candidata: Reserva,
    outrasConfirmadasNaSala: Reserva[],
    solicitante: Usuario,
    obterUsuario: (id: string) => Usuario | undefined,
    ignorarReservaId?: string
  ): ResultadoPolitica;
}

function sobrepostasCom(
  candidata: Reserva,
  outras: Reserva[],
  ignorarId?: string
): Reserva[] {
  return outras.filter(
    (r) =>
      r.id !== ignorarId &&
      r.status === "CONFIRMADA" &&
      intervalosSobrepostos(candidata.intervalo, r.intervalo)
  );
}

/** RF-03: quem reservou primeiro mantém o horário; novas colisões são bloqueadas. */
export class PoliticaPrimeiroAReservar implements PoliticaDeReserva {
  avaliar(
    candidata: Reserva,
    outrasConfirmadasNaSala: Reserva[],
    _solicitante: Usuario,
    _obterUsuario: (id: string) => Usuario | undefined,
    ignorarReservaId?: string
  ): ResultadoPolitica {
    const colisao = sobrepostasCom(
      candidata,
      outrasConfirmadasNaSala,
      ignorarReservaId
    );
    if (colisao.length > 0) {
      return {
        permitido: false,
        motivo: "Colisão de horário: política primeiro a reservar.",
        cancelarIds: [],
      };
    }
    return { permitido: true, cancelarIds: [] };
  }
}

/**
 * Docente pode obter o slot cancelando reservas de estudantes em conflito.
 * Estudante não pode reservar sobre horário já ocupado por docente.
 */
export class PoliticaPrioridadeDocente implements PoliticaDeReserva {
  avaliar(
    candidata: Reserva,
    outrasConfirmadasNaSala: Reserva[],
    solicitante: Usuario,
    obterUsuario: (id: string) => Usuario | undefined,
    ignorarReservaId?: string
  ): ResultadoPolitica {
    const colisao = sobrepostasCom(
      candidata,
      outrasConfirmadasNaSala,
      ignorarReservaId
    );
    if (colisao.length === 0) {
      return { permitido: true, cancelarIds: [] };
    }

    if (solicitante.papel === "DOCENTE") {
      const cancelarIds: string[] = [];
      for (const r of colisao) {
        if (r.usuarioId === solicitante.id) {
          return {
            permitido: false,
            motivo: "Conflito com outra reserva sua na mesma sala.",
            cancelarIds: [],
          };
        }
        const dono = obterUsuario(r.usuarioId);
        if (!dono || dono.papel !== "ESTUDANTE") {
          return {
            permitido: false,
            motivo:
              "Conflito com reserva de outro docente ou usuário desconhecido.",
            cancelarIds: [],
          };
        }
        cancelarIds.push(r.id);
      }
      return { permitido: true, cancelarIds };
    }

    for (const r of colisao) {
      if (r.usuarioId === solicitante.id) {
        return {
          permitido: false,
          motivo: "Conflito com outra reserva sua.",
          cancelarIds: [],
        };
      }
      const dono = obterUsuario(r.usuarioId);
      if (dono?.papel === "DOCENTE") {
        return {
          permitido: false,
          motivo: "Horário ocupado por docente (prioridade).",
          cancelarIds: [],
        };
      }
    }

    return {
      permitido: false,
      motivo: "Colisão com outra reserva.",
      cancelarIds: [],
    };
  }
}
