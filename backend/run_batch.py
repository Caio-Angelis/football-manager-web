#!/usr/bin/env python3
"""
run_batch.py — Executa headless_sim.ts 30 vezes via subprocess, coleta métricas
de sim_output.json a cada execução, e gera um relatório final balance_report.txt
com médias e anomalias encontradas.
"""

import json
import os
import subprocess
import sys
from collections import Counter, defaultdict
from statistics import mean, stdev

# ============================================================
# CONFIGURAÇÃO
# ============================================================

NUM_RUNS = 30
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SIM_OUTPUT = os.path.join(SCRIPT_DIR, "sim_output.json")
BALANCE_REPORT = os.path.join(SCRIPT_DIR, "balance_report.txt")
COMMAND = ["npx", "tsx", "headless_sim.ts"]

# ============================================================
# COLETA DE DADOS
# ============================================================

all_runs = []

print(f"=== BATCH SIMULATION: {NUM_RUNS} runs ===\n")

for i in range(1, NUM_RUNS + 1):
    print(f"  Run {i}/{NUM_RUNS}...", end=" ", flush=True)

    result = subprocess.run(
        COMMAND,
        cwd=SCRIPT_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        shell=True,
    )

    if result.returncode != 0:
        print("FAILED")
        continue

    if not os.path.exists(SIM_OUTPUT):
        print("NO OUTPUT")
        continue

    with open(SIM_OUTPUT, "r", encoding="utf-8") as f:
        data = json.load(f)

    all_runs.append(data)
    os.remove(SIM_OUTPUT)
    print("OK")

print(f"\nCollected {len(all_runs)} successful runs.\n")

if not all_runs:
    print("ERROR: No successful runs to analyze.")
    sys.exit(1)

# ============================================================
# AGREGAÇÃO DE MÉTRICAS
# ============================================================

total_seasons = len(all_runs) * 3  # 3 seasons per run

# --- Win-rate por tática (campeonato) ---
champion_tactics = Counter()
champion_teams = Counter()
relegated_teams = Counter()
relegated_tactics = Counter()

for run in all_runs:
    for season in run.get("seasons", []):
        champ = season.get("champion", {})
        champion_tactics[champ.get("tactic", "unknown")] += 1
        champion_teams[champ.get("teamName", "unknown")] += 1
        for rel in season.get("relegated", []):
            relegated_teams[rel.get("teamName", "unknown")] += 1
            relegated_tactics[rel.get("tactic", "unknown")] += 1

# --- Média de gols por partida ---
avg_goals_list = [run.get("avgGoalsPerMatch", 0) for run in all_runs]
avg_goals_mean = mean(avg_goals_list)
avg_goals_stdev = stdev(avg_goals_list) if len(avg_goals_list) > 1 else 0

# --- Orçamento médio Top 4 vs Bottom 4 ---
top4_budgets = [run.get("top4AvgFinalBudget", 0) for run in all_runs]
bottom4_budgets = [run.get("bottom4AvgFinalBudget", 0) for run in all_runs]
top4_mean = mean(top4_budgets)
bottom4_mean = mean(bottom4_budgets)
budget_gap = top4_mean - bottom4_mean

# --- Maior CA sub-21 ---
max_ca_values = []
max_ca_players = Counter()
max_ca_teams = Counter()

for run in all_runs:
    ca_data = run.get("maxCAUnder21")
    if ca_data and isinstance(ca_data, dict):
        max_ca_values.append(ca_data.get("ca", 0))
        max_ca_players[ca_data.get("playerName", "unknown")] += 1
        max_ca_teams[ca_data.get("teamName", "unknown")] += 1

max_ca_mean = mean(max_ca_values) if max_ca_values else 0
max_ca_stdev = stdev(max_ca_values) if len(max_ca_values) > 1 else 0

# ============================================================
# DETECÇÃO DE ANOMALIAS
# ============================================================

anomalies = []

# 1. Tática dominante (win-rate > 50%)
for tactic, count in champion_tactics.most_common():
    win_rate = count / total_seasons * 100
    if win_rate > 50:
        anomalies.append(
            f"  [DOMINÂNCIA] Tática '{tactic}' venceu {count}/{total_seasons} "
            f"({win_rate:.1f}%) dos campeonatos — dominação excessiva."
        )

# 2. Tática que nunca vence
all_tactics_seen = set(champion_tactics.keys()) | set(relegated_tactics.keys())
for tactic in all_tactics_seen:
    if tactic not in champion_tactics:
        count_rel = relegated_tactics.get(tactic, 0)
        anomalies.append(
            f"  [INEFICÁCIA] Tática '{tactic}' nunca venceu campeonatos "
            f"mas foi rebaixada {count_rel} vezes."
        )

# 3. Time que vence demais
for team, count in champion_teams.most_common():
    win_rate = count / total_seasons * 100
    if win_rate > 30:
        anomalies.append(
            f"  [MONOPÓLIO] '{team}' venceu {count}/{total_seasons} "
            f"({win_rate:.1f}%) dos campeonatos — desequilíbrio de força."
        )

# 4. Time rebaixado com frequência anormal
for team, count in relegated_teams.most_common():
    rel_rate = count / total_seasons * 100
    if rel_rate > 40:
        anomalies.append(
            f"  [REBAIXAMENTO CRÔNICO] '{team}' foi rebaixado {count}/{total_seasons} "
            f"({rel_rate:.1f}%) das temporadas — time persistentemente fraco."
        )

# 5. Orçamento: Top 4 vs Bottom 4
if top4_mean > 0 and bottom4_mean > 0:
    ratio = top4_mean / bottom4_mean if bottom4_mean != 0 else float("inf")
    if ratio > 5:
        anomalies.append(
            f"  [DESIGUALDADE FINANCEIRA] Top 4 tem {ratio:.1f}x o orçamento "
            f"dos últimos 4 (gap de {budget_gap:.2f})."
        )
elif top4_mean <= 0 and bottom4_mean <= 0:
    anomalies.append(
        "  [COLAPSO FINANCEIRO] Todos os clubes terminam com orçamento ~0 — "
        "wage bill supera receitas em todas as simulações."
    )

# 6. Média de gols anormal
if avg_goals_mean > 3.5:
    anomalies.append(
        f"  [GOLS EXCESSIVOS] Média de {avg_goals_mean:.2f} gols/partida "
        f"(esperado: 2.0-3.0)."
    )
elif avg_goals_mean < 1.0:
    anomalies.append(
        f"  [GOLS INSUFICIENTES] Média de {avg_goals_mean:.2f} gols/partida "
        f"(esperado: 2.0-3.0)."
    )

# 7. CA sub-21 anormalmente alto
if max_ca_mean > 180:
    anomalies.append(
        f"  [CRESCIMENTO EXCESSIVO] CA médio sub-21 = {max_ca_mean:.1f} "
        f"(máximo teórico 200)."
    )

# ============================================================
# GERAÇÃO DO RELATÓRIO
# ============================================================

lines = []
lines.append("=" * 70)
lines.append("BALANCE REPORT — Football Manager Web")
lines.append(f"Simulações: {len(all_runs)} runs × 3 temporadas = {total_seasons} campeonatos")
lines.append("=" * 70)
lines.append("")

# Seção 1: Win-rate por tática
lines.append("1. WIN-RATE POR TÁTICA (CAMPEÕES)")
lines.append("-" * 40)
for tactic, count in champion_tactics.most_common():
    win_rate = count / total_seasons * 100
    bar = "█" * int(win_rate / 2)
    lines.append(f"  {tactic:<15} {count:>3}/{total_seasons}  {win_rate:>6.1f}%  {bar}")
lines.append("")

# Seção 2: Táticas mais rebaixadas
lines.append("2. REBAIXAMENTOS POR TÁTICA")
lines.append("-" * 40)
for tactic, count in relegated_tactics.most_common():
    rel_rate = count / total_seasons * 100
    bar = "█" * int(rel_rate / 2)
    lines.append(f"  {tactic:<15} {count:>3}/{total_seasons}  {rel_rate:>6.1f}%  {bar}")
lines.append("")

# Seção 3: Campeões por time
lines.append("3. CAMPEÕES POR TIME")
lines.append("-" * 40)
for team, count in champion_teams.most_common():
    win_rate = count / total_seasons * 100
    bar = "█" * int(win_rate / 2)
    lines.append(f"  {team:<25} {count:>3}/{total_seasons}  {win_rate:>6.1f}%  {bar}")
lines.append("")

# Seção 4: Rebaixados por time
lines.append("4. REBAIXAMENTOS POR TIME")
lines.append("-" * 40)
for team, count in relegated_teams.most_common():
    rel_rate = count / total_seasons * 100
    bar = "█" * int(rel_rate / 2)
    lines.append(f"  {team:<25} {count:>3}/{total_seasons}  {rel_rate:>6.1f}%  {bar}")
lines.append("")

# Seção 5: Média de gols
lines.append("5. MÉDIA DE GOLS POR PARTIDA")
lines.append("-" * 40)
lines.append(f"  Média:    {avg_goals_mean:.2f}")
lines.append(f"  Desvio:   ±{avg_goals_stdev:.2f}")
lines.append(f"  Mín:      {min(avg_goals_list):.2f}")
lines.append(f"  Máx:      {max(avg_goals_list):.2f}")
lines.append("")

# Seção 6: Orçamento
lines.append("6. SALDO FINANCEIRO FINAL (MÉDIA)")
lines.append("-" * 40)
lines.append(f"  Top 4 (média):     {top4_mean:.2f}")
lines.append(f"  Bottom 4 (média):  {bottom4_mean:.2f}")
lines.append(f"  Gap:               {budget_gap:.2f}")
if top4_mean > 0 and bottom4_mean > 0:
    lines.append(f"  Razão T4/B4:       {top4_mean / bottom4_mean:.2f}x")
lines.append("")

# Seção 7: CA sub-21
lines.append("7. MAIOR CA — JOGADORES SUB-21")
lines.append("-" * 40)
lines.append(f"  CA médio (max/run): {max_ca_mean:.1f}")
lines.append(f"  Desvio:             ±{max_ca_stdev:.1f}")
if max_ca_values:
    lines.append(f"  Mín:                {min(max_ca_values)}")
    lines.append(f"  Máx:                {max(max_ca_values)}")
lines.append("")
lines.append("  Jogadores mais frequentes como maior CA sub-21:")
for player, count in max_ca_players.most_common(5):
    lines.append(f"    {player:<30} {count}x")
lines.append("  Times mais frequentes:")
for team, count in max_ca_teams.most_common(5):
    lines.append(f"    {team:<30} {count}x")
lines.append("")

# Seção 8: Anomalias
lines.append("8. ANOMALIAS DETECTADAS")
lines.append("-" * 40)
if anomalies:
    for a in anomalies:
        lines.append(a)
else:
    lines.append("  Nenhuma anomalia significativa detectada.")
lines.append("")
lines.append("=" * 70)
lines.append("Fim do relatório")
lines.append("=" * 70)

report_text = "\n".join(lines)

with open(BALANCE_REPORT, "w", encoding="utf-8") as f:
    f.write(report_text)

print(report_text)
print(f"\nReport saved to: {BALANCE_REPORT}")
