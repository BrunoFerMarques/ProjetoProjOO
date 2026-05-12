import type { CentroEventosReserva } from "./CentroEventosReserva.js";
import type { EventoReserva } from "./EventoReserva.js";

export interface ObservadorReserva {
  /**
   * Push: dados do evento; pull opcional via `centro` (ex.: snapshotConfirmadas).
   */
  atualizar(evento: EventoReserva, centro: CentroEventosReserva): void;
}
