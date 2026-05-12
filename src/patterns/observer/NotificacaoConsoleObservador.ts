import type { CentroEventosReserva } from "./CentroEventosReserva.js";
import type { EventoReserva } from "./EventoReserva.js";
import type { ObservadorReserva } from "./ObservadorReserva.js";

/** RF-04: notificação imediata (aqui via console). */
export class NotificacaoConsoleObservador implements ObservadorReserva {
  constructor(private readonly prefixo: string = "[NOTIF]") {}

  atualizar(evento: EventoReserva, centro: CentroEventosReserva): void {
    switch (evento.tipo) {
      case "CRIADA":
        console.log(
          `${this.prefixo} Nova reserva ${evento.reserva.id} sala ${evento.reserva.salaId}`
        );
        break;
      case "ALTERADA":
        console.log(
          `${this.prefixo} Reserva ${evento.depois.id} alterada (sala ${evento.depois.salaId})`
        );
        break;
      case "CANCELADA":
        console.log(
          `${this.prefixo} Reserva ${evento.reserva.id} cancelada (sala ${evento.reserva.salaId})`
        );
        break;
    }
    const n = centro.snapshotConfirmadas().length;
    console.log(`${this.prefixo} (pull) Total confirmadas agora: ${n}`);
  }
}
