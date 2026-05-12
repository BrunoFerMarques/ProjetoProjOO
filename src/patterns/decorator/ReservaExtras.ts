import type { Reserva } from "../../domain/Reserva.js";

/** Bônus: Decorator para anotar extras de uma reserva (ex.: relatório / UI). */
export interface ReservaComExtras {
  readonly reserva: Reserva;
  extras(): string[];
}

export class ReservaBaseExtras implements ReservaComExtras {
  constructor(readonly reserva: Reserva) {}

  extras(): string[] {
    return [];
  }
}

export abstract class ReservaDecorator implements ReservaComExtras {
  constructor(protected readonly inner: ReservaComExtras) {}

  get reserva(): Reserva {
    return this.inner.reserva;
  }

  abstract extras(): string[];
}

export class DecoratorMultimidia extends ReservaDecorator {
  extras(): string[] {
    return [...this.inner.extras(), "Equipamento multimídia"];
  }
}

export class DecoratorLimpeza extends ReservaDecorator {
  extras(): string[] {
    return [...this.inner.extras(), "Serviço de limpeza"];
  }
}
