# Regras de Classificação e Liga

## Cálculo da Classificação

A classificação é recalculada após cada rodada via `calculateLeagueStandings`, considerando todas as partidas completadas.

### Pontuação

| Resultado | Pontos |
|-----------|--------|
| Vitória | 3 |
| Empate | 1 |
| Derrota | 0 |

### Critérios de Desempate (em ordem)

1. **Pontos**
2. **Saldo de gols** (gols pró - gols contra)
3. **Gols pró**

---

## Forma Recente

- Últimos 5 resultados (V/E/D) exibidos ao lado de cada time.
- Pontuação de forma: V=3, E=1, D=0.

---

## Zonas da Tabela

| Zona | Posição | Significado |
|------|---------|-------------|
| **Título (Libertadores)** | Top 4 | Classificação para torneios continentais |
| **Sul-Americana** | 5º ao 8º | Zona intermediária |
| **Segura** | 9º ao antepenúltimo | Sem risco |
| **Rebaixamento** | Últimos 3 | Marcados como rebaixados ao final da temporada (semana 38) |

---

## Exibição na Interface

- **Mini Classificação (Dashboard):** Top 5 + posição do usuário (se fora do top 5, com separador "···"). Colunas: posição, nome, pontos, jogos, saldo de gols. Linha do usuário destacada. Bordas coloridas por zona.
- **LeagueTable:** Classificação completa com cabeçalhos clicáveis para ordenação (asc/desc) via `useSortable`.
- **MatchCenter:** Classificação inline com marcadores coloridos por zona + legenda.

### Cores por Zona

| Zona | Cor |
|------|-----|
| Libertadores | Roxo |
| Sul-Americana | Âmbar |
| Rebaixamento | Vermelho |
