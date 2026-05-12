import type { Reserva } from "../../domain/Reserva.js";
import type { CentroEventosReserva } from "./CentroEventosReserva.js";
import type { EventoReserva } from "./EventoReserva.js";
import type { ObservadorReserva } from "./ObservadorReserva.js";

/**
 * Observador que usa pull para manter cache usado em relatórios (RF-05 auxiliar).
 */
export class CacheRelatorioObservador implements ObservadorReserva {
  private ultimoSnapshot: Reserva[] = [];

  atualizar(_evento: EventoReserva, centro: CentroEventosReserva): void {
    this.ultimoSnapshot = centro.snapshotConfirmadas();
  }

  get ultimasConfirmadas(): Reserva[] {
    return this.ultimoSnapshot;
  }
}
