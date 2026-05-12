import type { Reserva } from "../../domain/Reserva.js";

export type EventoReserva =
  | { tipo: "CRIADA"; reserva: Reserva }
  | { tipo: "ALTERADA"; antes: Reserva; depois: Reserva }
  | { tipo: "CANCELADA"; reserva: Reserva };
