import { Reserva } from "../domain/Reserva.js";
import { intervalosSobrepostos } from "../domain/Reserva.js";
import type { Sala } from "../domain/Sala.js";
import type { Usuario } from "../domain/Usuario.js";
import { CentroEventosReserva } from "../patterns/observer/CentroEventosReserva.js";
import type { PoliticaDeReserva } from "../patterns/strategy/PoliticaDeReserva.js";
import { RepositorioCampus } from "../patterns/singleton/RepositorioCampus.js";

function inicioDoDia(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fimDoDia(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function cruzaIntervaloDia(r: Reserva, dia: Date): boolean {
  const a = inicioDoDia(dia);
  const b = fimDoDia(dia);
  return intervalosSobrepostos(
    { inicio: r.inicio, fim: r.fim },
    { inicio: a, fim: b }
  );
}

export class ServicoReservas {
  constructor(
    private readonly repo: RepositorioCampus,
    private readonly eventos: CentroEventosReserva,
    private politica: PoliticaDeReserva
  ) {}

  definirPolitica(p: PoliticaDeReserva): void {
    this.politica = p;
  }

  /** RF-01: salas livres em todo o intervalo solicitado (sem sobreposição com confirmadas). */
  salasDisponiveisNoIntervalo(inicio: Date, fim: Date): Sala[] {
    if (!(inicio < fim)) return [];
    const candidato = new Reserva(
      "__consulta__",
      "",
      "",
      inicio,
      fim,
      "CONFIRMADA"
    );
    return this.repo.listarSalas().filter((sala) => {
      const naSala = this.repo.listarReservasNaSala(sala.id);
      return !naSala.some(
        (r) =>
          r.status === "CONFIRMADA" &&
          intervalosSobrepostos(candidato.intervalo, r.intervalo)
      );
    });
  }

  private obterUsuarioFn(): (id: string) => Usuario | undefined {
    return (id) => this.repo.obterUsuario(id);
  }

  async criarReserva(
    salaId: string,
    usuarioId: string,
    inicio: Date,
    fim: Date
  ): Promise<Reserva> {
    return this.repo.runExclusive(async () => {
      const usuario = this.repo.obterUsuario(usuarioId);
      const sala = this.repo.obterSala(salaId);
      if (!usuario) throw new Error("Usuário inexistente.");
      if (!sala) throw new Error("Sala inexistente.");

      const id = crypto.randomUUID();
      const nova = new Reserva(id, salaId, usuarioId, inicio, fim, "CONFIRMADA");
      const naSala = this.repo.listarReservasNaSala(salaId);
      const resultado = this.politica.avaliar(
        nova,
        naSala,
        usuario,
        this.obterUsuarioFn()
      );
      if (!resultado.permitido) {
        throw new Error(resultado.motivo ?? "Reserva não permitida.");
      }

      for (const rid of resultado.cancelarIds) {
        const ex = this.repo.obterReserva(rid);
        if (ex && ex.status === "CONFIRMADA") {
          const cancelada = ex.cloneCom({ status: "CANCELADA" });
          this.repo.salvarReserva(cancelada);
          this.eventos.notificar({ tipo: "CANCELADA", reserva: cancelada });
        }
      }

      this.repo.salvarReserva(nova);
      this.eventos.notificar({ tipo: "CRIADA", reserva: nova });
      return nova;
    });
  }

  async alterarReserva(
    reservaId: string,
    solicitanteId: string,
    patch: { inicio?: Date; fim?: Date; salaId?: string }
  ): Promise<Reserva> {
    return this.repo.runExclusive(async () => {
      const atual = this.repo.obterReserva(reservaId);
      if (!atual) throw new Error("Reserva inexistente.");
      if (atual.usuarioId !== solicitanteId) {
        throw new Error("Somente o titular pode alterar.");
      }
      if (atual.status !== "CONFIRMADA") {
        throw new Error("Reserva não está confirmada.");
      }

      const usuario = this.repo.obterUsuario(solicitanteId);
      if (!usuario) throw new Error("Usuário inexistente.");

      const salaId = patch.salaId ?? atual.salaId;
      const inicio = patch.inicio ?? atual.inicio;
      const fim = patch.fim ?? atual.fim;
      if (!(inicio < fim)) throw new Error("Intervalo inválido.");

      const sala = this.repo.obterSala(salaId);
      if (!sala) throw new Error("Sala inexistente.");

      const depois = atual.cloneCom({
        salaId,
        inicio,
        fim,
        status: "CONFIRMADA",
      });

      const naSala = this.repo.listarReservasNaSala(salaId);
      const resultado = this.politica.avaliar(
        depois,
        naSala,
        usuario,
        this.obterUsuarioFn(),
        reservaId
      );
      if (!resultado.permitido) {
        throw new Error(resultado.motivo ?? "Alteração não permitida.");
      }

      for (const rid of resultado.cancelarIds) {
        const ex = this.repo.obterReserva(rid);
        if (ex && ex.status === "CONFIRMADA") {
          const cancelada = ex.cloneCom({ status: "CANCELADA" });
          this.repo.salvarReserva(cancelada);
          this.eventos.notificar({ tipo: "CANCELADA", reserva: cancelada });
        }
      }

      const antes = atual.cloneCom({});
      this.repo.salvarReserva(depois);
      this.eventos.notificar({ tipo: "ALTERADA", antes, depois });
      return depois;
    });
  }

  async cancelarReserva(
    reservaId: string,
    solicitanteId: string
  ): Promise<void> {
    return this.repo.runExclusive(async () => {
      const atual = this.repo.obterReserva(reservaId);
      if (!atual) throw new Error("Reserva inexistente.");
      if (atual.usuarioId !== solicitanteId) {
        throw new Error("Somente o titular pode cancelar.");
      }
      if (atual.status !== "CONFIRMADA") return;

      const cancelada = atual.cloneCom({ status: "CANCELADA" });
      this.repo.salvarReserva(cancelada);
      this.eventos.notificar({ tipo: "CANCELADA", reserva: cancelada });
    });
  }

  /** RF-05: reservas confirmadas de cada sala que intersectam o dia civil. */
  relatorioDiarioPorSala(dia: Date): Map<string, Reserva[]> {
    const mapa = new Map<string, Reserva[]>();
    for (const s of this.repo.listarSalas()) {
      mapa.set(s.id, []);
    }
    for (const r of this.repo.listarReservasConfirmadas()) {
      if (!cruzaIntervaloDia(r, dia)) continue;
      const lista = mapa.get(r.salaId);
      if (lista) lista.push(r);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
    }
    return mapa;
  }
}
