import type { Reserva } from "../../domain/Reserva.js";
import type { Sala } from "../../domain/Sala.js";
import type { Usuario } from "../../domain/Usuario.js";

/**
 * Singleton com fila de exclusão mútua para operações assíncronas concorrentes
 * (evita corrupção do estado sob várias Promises em paralelo).
 */
export class RepositorioCampus {
  private static instance: RepositorioCampus | undefined;

  private readonly salas = new Map<string, Sala>();
  private readonly usuarios = new Map<string, Usuario>();
  private readonly reservas = new Map<string, Reserva>();
  private mutex: Promise<void> = Promise.resolve();

  private constructor() {}

  static getInstance(): RepositorioCampus {
    if (!RepositorioCampus.instance) {
      RepositorioCampus.instance = new RepositorioCampus();
    }
    return RepositorioCampus.instance;
  }

  /** Expõe reset apenas para testes / demos isoladas */
  static resetForTests(): void {
    RepositorioCampus.instance = undefined;
  }

  runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.mutex.then(fn);
    this.mutex = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  salvarSala(s: Sala): void {
    this.salas.set(s.id, s);
  }

  obterSala(id: string): Sala | undefined {
    return this.salas.get(id);
  }

  listarSalas(): Sala[] {
    return [...this.salas.values()];
  }

  salvarUsuario(u: Usuario): void {
    this.usuarios.set(u.id, u);
  }

  obterUsuario(id: string): Usuario | undefined {
    return this.usuarios.get(id);
  }

  salvarReserva(r: Reserva): void {
    this.reservas.set(r.id, r);
  }

  obterReserva(id: string): Reserva | undefined {
    return this.reservas.get(id);
  }

  listarReservasNaSala(salaId: string): Reserva[] {
    return [...this.reservas.values()].filter((r) => r.salaId === salaId);
  }

  listarTodasReservas(): Reserva[] {
    return [...this.reservas.values()];
  }

  listarReservasConfirmadas(): Reserva[] {
    return [...this.reservas.values()].filter((r) => r.status === "CONFIRMADA");
  }
}
