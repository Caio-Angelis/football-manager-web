# Regras de Base de Juvenis

## Fornada de Juvenis (Youth Intake)

- Na **semana 1** de cada temporada, uma fornada de **6 jogadores juvenis** é gerada automaticamente e adicionada ao elenco.
- A qualidade dos juvenis depende do **nível das instalações de base** do clube.

---

## Promoção de Jogadores

- O usuário pode promover jogadores da base para o elenco principal via `promoteYouthPlayer`.
- Ao promover, os atributos técnicos, mentais e físicos do jovem são **copiados diretamente** (preservando o desenvolvimento da academia).

---

## Equipe Reserva

- Existe uma equipe reserva para desenvolvimento de jogadores.
- `setReserveTraining` armazena `trainingType` em cada `ReserveTeamPlayer` para definir o tipo de treino individual.

---

## Academia de Juvenis

- `setAcademyTraining` permite configurar o treino da academia.
- `generateYouthPlayers` gera novos jogadores juvenis.

---

## Problema de Pacing

Com apenas 3 temporadas (114 semanas), o sistema de base juvenil **praticamente não dá retorno** dentro da vida útil do save. Um juvenil promovido na temporada 1 teria apenas ~2 anos de evolução antes do fim do jogo.

O ritmo acelerado de treino (~20x mais rápido que a realidade) faz que juvenis atinjam o teto de atributos rapidamente, eliminando a progressão como mecânica de longo prazo.
