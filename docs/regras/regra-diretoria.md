# Regras de Diretoria

## Expectativas da Diretoria

A expectativa é definida baseada na **distribuição relativa** das reputações dentro da liga (percentis), calculada por `assignBoardExpectations(teams)` em `initGame()`:

| Percentil de Reputação | Expectativa |
|------------------------|-------------|
| Top 10% | Título |
| Próximos 30% | G4 / Libertadores |
| Próximos 40% | Meio de tabela |
| Bottom 20% | Evitar rebaixamento |

---

## Satisfação da Diretoria

- Varia de **-100 a 100** (começa em 50)
- Ajustada por:
  - `handleBoardReply` (responder mensagens da diretoria)
  - Resultados de partidas (indiretamente, via inbox)
  - Coletivas de imprensa (respostas diplomáticas melhoram, críticas pioram)
- **Clamp:** -100 a 100 (não 0-100)

---

## Promessas da Diretoria

A diretoria pode estabelecer objetivos com prazo:
- Ex: "alcançar top 4 até a semana 20"
- O não cumprimento afeta a satisfação

---

## Demissão

**Não implementada para o time do usuário.** Não existe verificação de `boardSatisfaction <= 0` em `advanceWeek` ou em qualquer outro ponto. A diretoria pode enviar mensagens críticas, mas não pode demitir o usuário.

### Recomendação (não implementada)

Implementar sistema de ultimato: se `boardSatisfaction <= 0` por N semanas consecutivas, a diretoria dá um ultimato (ex: "alcançar posição X até a semana Y"). Se não cumprido, Game Over com tela de demissão.
