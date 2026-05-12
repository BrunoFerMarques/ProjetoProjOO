export type StatusReserva = "CONFIRMADA" | "CANCELADA";

export interface Intervalo {
  inicio: Date;
  fim: Date;
}

export function intervalosSobrepostos(a: Intervalo, b: Intervalo): boolean {
  return !(a.fim <= b.inicio || a.inicio >= b.fim);
}

export class Reserva {
  constructor(
    readonly id: string,
    readonly salaId: string,
    readonly usuarioId: string,
    readonly inicio: Date,
    readonly fim: Date,
    public status: StatusReserva
  ) {}

  get intervalo(): Intervalo {
    return { inicio: this.inicio, fim: this.fim };
  }

  cloneCom(
    patch: Partial<{
      salaId: string;
      inicio: Date;
      fim: Date;
      status: StatusReserva;
    }>
  ): Reserva {
    return new Reserva(
      this.id,
      patch.salaId ?? this.salaId,
      this.usuarioId,
      patch.inicio ?? this.inicio,
      patch.fim ?? this.fim,
      patch.status ?? this.status
    );
  }
}
