/**
 * Interface interativa em linha de comando.
 * Executa um loop pedindo ao usuario que escolha uma operacao.
 */

import * as readline from "readline";
import { ConfiguracaoApp } from "./patterns/singleton/ConfiguracaoApp.js";
import { RepositorioCampus } from "./patterns/singleton/RepositorioCampus.js";
import { SalaFactory } from "./patterns/factory/SalaFactory.js";
import { CentroEventosReserva } from "./patterns/observer/CentroEventosReserva.js";
import { NotificacaoConsoleObservador } from "./patterns/observer/NotificacaoConsoleObservador.js";
import { CacheRelatorioObservador } from "./patterns/observer/CacheRelatorioObservador.js";
import {
  PoliticaPrimeiroAReservar,
  PoliticaPrioridadeDocente,
} from "./patterns/strategy/PoliticaDeReserva.js";
import { ServicoReservas } from "./services/ServicoReservas.js";
import { Usuario } from "./domain/Usuario.js";
import {
  ReservaBaseExtras,
  DecoratorMultimidia,
  DecoratorLimpeza,
} from "./patterns/decorator/ReservaExtras.js";

// ─── helpers de I/O ──────────────────────────────────────────────────────────

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function pergunta(prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

function hr() {
  console.log("─".repeat(52));
}

function parseData(s: string): Date | null {
  // aceita "12/05/2026 09:00" ou "12/05/2026"
  const match = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) return null;
  const [, dia, mes, ano, h = "00", m = "00"] = match;
  const d = new Date(`${ano}-${mes}-${dia}T${h}:${m}:00`);
  return isNaN(d.getTime()) ? null : d;
}

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ─── seed inicial ─────────────────────────────────────────────────────────────

function seed(repo: RepositorioCampus) {
  const factory = new SalaFactory();

  const salas = [
    factory.criar("INDIVIDUAL", "s1", "Cubículo 101", 1),
    factory.criar("INDIVIDUAL", "s2", "Cubículo 102", 1),
    factory.criar("GRUPO", "s3", "Sala Colaborativa A", 8),
    factory.criar("GRUPO", "s4", "Sala Colaborativa B", 10),
    factory.criar("LABORATORIO", "s5", "Lab de Informática", 25),
  ];
  for (const s of salas) repo.salvarSala(s);

  const usuarios = [
    new Usuario("u1", "Ana (Estudante)", "ESTUDANTE"),
    new Usuario("u2", "Bruno (Estudante)", "ESTUDANTE"),
    new Usuario("u3", "Prof. Carlos (Docente)", "DOCENTE"),
  ];
  for (const u of usuarios) repo.salvarUsuario(u);

  console.log("✔ Salas e usuários carregados.");
}

// ─── menus auxiliares ─────────────────────────────────────────────────────────

function menuSalas(repo: RepositorioCampus) {
  console.log("\nSalas cadastradas:");
  for (const s of repo.listarSalas()) {
    console.log(`  [${s.id}] ${s.nome} — ${s.descricaoTipo()} (cap. ${s.capacidade})`);
  }
}

function menuUsuarios(repo: RepositorioCampus) {
  console.log("\nUsuários cadastrados:");
  for (const u of repo.listarTodasReservas === undefined
    ? []
    : [
        repo.obterUsuario("u1"),
        repo.obterUsuario("u2"),
        repo.obterUsuario("u3"),
      ]) {
    if (u) console.log(`  [${u.id}] ${u.nome} (${u.papel})`);
  }
}

// ─── loop principal ───────────────────────────────────────────────────────────

async function main() {
  ConfiguracaoApp.configurar({ nomeCampus: "Campus POO 2026" });
  RepositorioCampus.resetForTests();

  const repo = RepositorioCampus.getInstance();
  const centro = new CentroEventosReserva(repo);
  const cacheObs = new CacheRelatorioObservador();

  centro.anexar(new NotificacaoConsoleObservador("[NOTIF]"));
  centro.anexar(cacheObs);

  let politicaAtual: "primeiro" | "docente" = "primeiro";
  let servico = new ServicoReservas(repo, centro, new PoliticaPrimeiroAReservar());

  seed(repo);

  console.log(`\n=== Reserva de Salas — ${ConfiguracaoApp.getInstance().nomeCampus} ===`);

  let rodando = true;
  while (rodando) {
    hr();
    console.log(`Política atual: ${politicaAtual === "primeiro" ? "Primeiro a Reservar" : "Prioridade Docente"}`);
    console.log(`
  1. Listar salas disponíveis (RF-01)
  2. Criar reserva             (RF-02)
  3. Alterar reserva           (RF-02)
  4. Cancelar reserva          (RF-02)
  5. Relatório diário          (RF-05)
  6. Trocar política de colisão (Strategy)
  7. Ver extras de uma reserva  (Decorator — bônus)
  0. Sair`);
    hr();

    const opcao = (await pergunta("Opção: ")).trim();

    switch (opcao) {
      // ── RF-01 ──────────────────────────────────────────────────────────────
      case "1": {
        const ini = await pergunta("  Início (ex: 12/05/2026 09:00): ");
        const fim = await pergunta("  Fim    (ex: 12/05/2026 11:00): ");
        const dIni = parseData(ini);
        const dFim = parseData(fim);
        if (!dIni || !dFim) { console.log("  ✗ Data inválida."); break; }
        const livres = servico.salasDisponiveisNoIntervalo(dIni, dFim);
        if (livres.length === 0) {
          console.log("  Nenhuma sala disponível nesse intervalo.");
        } else {
          console.log(`  ${livres.length} sala(s) disponível(is):`);
          for (const s of livres) {
            console.log(`    [${s.id}] ${s.nome} — ${s.descricaoTipo()}`);
          }
        }
        break;
      }

      // ── RF-02: criar ───────────────────────────────────────────────────────
      case "2": {
        menuSalas(repo);
        const salaId = (await pergunta("  ID da sala: ")).trim();
        menuUsuarios(repo);
        const usuarioId = (await pergunta("  ID do usuário: ")).trim();
        const ini = await pergunta("  Início (ex: 12/05/2026 09:00): ");
        const fim = await pergunta("  Fim    (ex: 12/05/2026 11:00): ");
        const dIni = parseData(ini);
        const dFim = parseData(fim);
        if (!dIni || !dFim) { console.log("  ✗ Data inválida."); break; }
        try {
          const r = await servico.criarReserva(salaId, usuarioId, dIni, dFim);
          console.log(`  ✔ Reserva criada: ${r.id}`);
        } catch (e) {
          console.log(`  ✗ Erro: ${(e as Error).message}`);
        }
        break;
      }

      // ── RF-02: alterar ─────────────────────────────────────────────────────
      case "3": {
        const reservas = repo.listarTodasReservas().filter(r => r.status === "CONFIRMADA");
        if (reservas.length === 0) { console.log("  Sem reservas confirmadas."); break; }
        console.log("\n  Reservas confirmadas:");
        for (const r of reservas) {
          const u = repo.obterUsuario(r.usuarioId);
          console.log(`    [${r.id.slice(0, 8)}] sala ${r.salaId} | ${fmt(r.inicio)} → ${fmt(r.fim)} | ${u?.nome}`);
        }
        const rId = (await pergunta("  ID da reserva (8 chars): ")).trim();
        const reserva = reservas.find(r => r.id.startsWith(rId));
        if (!reserva) { console.log("  ✗ Reserva não encontrada."); break; }

        const ini = await pergunta("  Novo início (Enter = manter): ");
        const fim = await pergunta("  Novo fim    (Enter = manter): ");
        const patch: { inicio?: Date; fim?: Date } = {};
        if (ini.trim()) { const d = parseData(ini); if (d) patch.inicio = d; }
        if (fim.trim()) { const d = parseData(fim); if (d) patch.fim = d; }

        try {
          const alt = await servico.alterarReserva(reserva.id, reserva.usuarioId, patch);
          console.log(`  ✔ Reserva alterada: ${fmt(alt.inicio)} → ${fmt(alt.fim)}`);
        } catch (e) {
          console.log(`  ✗ Erro: ${(e as Error).message}`);
        }
        break;
      }

      // ── RF-02: cancelar ────────────────────────────────────────────────────
      case "4": {
        const reservas = repo.listarTodasReservas().filter(r => r.status === "CONFIRMADA");
        if (reservas.length === 0) { console.log("  Sem reservas confirmadas."); break; }
        console.log("\n  Reservas confirmadas:");
        for (const r of reservas) {
          const u = repo.obterUsuario(r.usuarioId);
          console.log(`    [${r.id.slice(0, 8)}] sala ${r.salaId} | ${fmt(r.inicio)} → ${fmt(r.fim)} | ${u?.nome}`);
        }
        const rId = (await pergunta("  ID da reserva (8 chars): ")).trim();
        const reserva = reservas.find(r => r.id.startsWith(rId));
        if (!reserva) { console.log("  ✗ Reserva não encontrada."); break; }
        try {
          await servico.cancelarReserva(reserva.id, reserva.usuarioId);
          console.log("  ✔ Reserva cancelada.");
        } catch (e) {
          console.log(`  ✗ Erro: ${(e as Error).message}`);
        }
        break;
      }

      // ── RF-05: relatório ───────────────────────────────────────────────────
      case "5": {
        const dStr = await pergunta("  Dia do relatório (ex: 12/05/2026): ");
        const dia = new Date(dStr.trim());
        if (isNaN(dia.getTime())) { console.log("  ✗ Data inválida."); break; }
        const rel = servico.relatorioDiarioPorSala(dia);
        let algum = false;
        for (const [sId, lista] of rel) {
          if (lista.length === 0) continue;
          algum = true;
          const sala = repo.obterSala(sId)!;
          console.log(`\n  ${sala.nome} (${sala.descricaoTipo()}):`);
          for (const r of lista) {
            const u = repo.obterUsuario(r.usuarioId);
            console.log(`    ${fmt(r.inicio)} → ${fmt(r.fim)} | ${u?.nome ?? r.usuarioId}`);
          }
        }
        if (!algum) console.log("  Nenhuma reserva confirmada nesse dia.");
        break;
      }

      // ── Strategy: trocar política ──────────────────────────────────────────
      case "6": {
        if (politicaAtual === "primeiro") {
          servico.definirPolitica(new PoliticaPrioridadeDocente());
          politicaAtual = "docente";
          console.log("  ✔ Política alterada para: Prioridade Docente");
        } else {
          servico.definirPolitica(new PoliticaPrimeiroAReservar());
          politicaAtual = "primeiro";
          console.log("  ✔ Política alterada para: Primeiro a Reservar");
        }
        break;
      }

      // ── Decorator: extras ──────────────────────────────────────────────────
      case "7": {
        const reservas = repo.listarTodasReservas();
        if (reservas.length === 0) { console.log("  Sem reservas cadastradas."); break; }
        console.log("\n  Reservas disponíveis:");
        for (const r of reservas) {
          console.log(`    [${r.id.slice(0, 8)}] sala ${r.salaId} | status: ${r.status}`);
        }
        const rId = (await pergunta("  ID da reserva (8 chars): ")).trim();
        const reserva = reservas.find(r => r.id.startsWith(rId));
        if (!reserva) { console.log("  ✗ Reserva não encontrada."); break; }

        console.log("  Extras disponíveis: [M] Multimídia  [L] Limpeza  [A] Ambos");
        const escolha = (await pergunta("  Escolha: ")).trim().toUpperCase();

        let view = new ReservaBaseExtras(reserva) as import("./patterns/decorator/ReservaExtras.js").ReservaComExtras;
        if (escolha === "M" || escolha === "A") view = new DecoratorMultimidia(view);
        if (escolha === "L" || escolha === "A") view = new DecoratorLimpeza(view);

        const extras = view.extras();
        console.log(extras.length > 0
          ? `  ✔ Extras adicionados: ${extras.join(", ")}`
          : "  (nenhum extra selecionado)");
        break;
      }

      // ── Sair ───────────────────────────────────────────────────────────────
      case "0": {
        rodando = false;
        break;
      }

      default:
        console.log("  Opção inválida. Tente novamente.");
    }
  }

  rl.close();
  console.log("\nAté logo!\n");
}

main().catch((e) => {
  console.error("Erro fatal:", e);
  rl.close();
  process.exit(1);
});