import type { Reserva } from "../../domain/Reserva.js";
import { RepositorioCampus } from "../singleton/RepositorioCampus.js";
import type { EventoReserva } from "./EventoReserva.js";
import type { ObservadorReserva } from "./ObservadorReserva.js";

/** Subject do Observer: notifica assinantes (push) e expõe snapshot (pull). */
export class CentroEventosReserva {
  private readonly observadores: ObservadorReserva[] = [];

  constructor(private readonly repo: RepositorioCampus) {}

  anexar(o: ObservadorReserva): void {
    this.observadores.push(o);
  }

  remover(o: ObservadorReserva): void {
    const i = this.observadores.indexOf(o);
    if (i >= 0) this.observadores.splice(i, 1);
  }

  /** Pull: estado atual após eventos (RF-04 + relatórios). */
  snapshotConfirmadas(): Reserva[] {
    return this.repo.listarReservasConfirmadas();
  }

  notificar(evento: EventoReserva): void {
    for (const o of this.observadores) {
      o.atualizar(evento, this);
    }
  }
}
