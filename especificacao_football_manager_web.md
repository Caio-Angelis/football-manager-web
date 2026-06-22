# Documento de Especificação Técnica: Clone de Football Manager para Web (Procedural & Algorítmico)

Este documento descreve detalhadamente a arquitetura de escopo, sistemas, botões e interações lógicas necessárias para construir um simulador de gerenciamento de futebol baseado em web. Como todos os jogadores e staff são 100% genéricos e gerados proceduralmente pelo sistema, as regras de distribuição e geração automática são integradas ao núcleo de cada funcionalidade.

---

## 1. O NÚCLEO DA ENGINE: GERAÇÃO PROCEDURAL DE JOGADORES

Sem uma base de dados real, o jogo depende de uma **Engine de Geração Dinâmica**. Cada jogador é uma instância de uma classe gerada por algoritmos baseados em distribuições estatísticas.

### 1.1. Atributos Fundamentais (Escala de 1 a 20)
Cada jogador possui três macrocategorias de atributos visíveis, calculados sob uma distribuição normal com base na reputação do clube e do país de origem:

* **Atributos Técnicos:** Cabeceamento, Cruzamentos, Desarme, Cabeceamento, Técnica, Finalização, Passe, Primeiro Toque, Fintas, Marcação, Cantos, Livres, Grandes Penalidades, Lançamentos Linha Lateral.
* **Atributos Mentais:** Agressividade, Antecipação, Bravura, Compostura, Concentração, Decisões, Determinação, Imprevisto, Posicionamento, Liderança, Trabalho de Equipe, Visão de Jogo, Sem Bola, Índice de Trabalho.
* **Atributos Físicos:** Aceleração, Velocidade, Força, Resistência, Agilidade, Aptidão Física Natural, Impulsão, Equilíbrio.
* **Atributos de Guarda-Redes (Exclusivos):** Alcance Aéreo, Comando de Área, Comunicação, Excentricidade, Jogo de Mãos, Pontapés, Lançamentos, Reflexos, Saídas, Tendência para Sair dos Postos, Agilidade Um contra Um.

### 1.2. O Motor Oculto (Métricas de 1 a 200)
Para regular o desenvolvimento e comportamento real dos atletas:
* **Current Ability (CA - Habilidade Atual):** Determina o nível presente do jogador. Os atributos de 1 a 20 são limitados matematicamente pelo peso que ocupam no CA. (Ex: Um passe alto consome mais pontos de CA em um médio-centro do que em um defesa-central).
* **Potential Ability (PA - Habilidade Potencial):** O teto estático gerado no nascimento do jogador. Nunca muda. Determina até onde o CA pode evoluir.
* **Atributos de Personalidade Ocultos:** Consistência, Propensão a Lesões, Importância em Jogos Grandes, Sujeira (Dirtyness), Adaptabilidade, Ambição, Lealdade, Pressão, Profissionalismo, Desportivismo, Temperamento.

### 1.3. Algoritmo de Geração (Spawner)
* **Nomes e Sobrenomes:** Gerados combinando arrays de nomes/sobrenomes mapeados por nacionalidade (ex: `nomes_pt.json`, `nomes_br.json`).
* **Idade:** Curva demográfica entre 15 (juvenis) e 40 anos (aposentadoria).
* **Posições e Posições Secundárias:** Mapeadas em um vetor de proficiência (0 a 20). Categorias de familiaridade: *Natural (18-20), Eficiente (15-17), Competente (12-14), Inadequado (6-11), Incompetente (1-5)*.

---

## 2. INTERFACE CENTRAL E LOOP DE TEMPO (UI/UX)

A interface segue uma estrutura SPA (Single Page Application) com estados reativos.

### 2.1. O Botão "Continuar" (The Time Driver)
Localizado no canto superior direito. É o gatilho que processa o loop de tempo.
* **Comportamento:** Ao clicar, o sistema altera o status para "Processando" e executa os cronjobs diários ou de hora em hora do backend (atualização de treinos, simulação de jogos de outras ligas, ofertas de IA para IA).
* **Interrupção Forçada:** O processamento para imediatamente e abre uma tela modal ou direciona para a Caixa de Entrada caso ocorra um evento crítico (Dia de Jogo, Proposta recebida pelo clube do usuário, Lesão grave no plantel, Prazo final de inscrições).

### 2.2. A Caixa de Entrada (Inbox Hub)
Central de notificações e tomada de decisões estruturada como um cliente de e-mail.
* **Botões de Ação por Mensagem:** Dependendo do tipo de e-mail, os botões inferiores mudam dinamicamente:
    * *Mensagem de Transferência:* Botões `Aceitar`, `Recusar`, `Negociar`, `Adiar`.
    * *Relatório de Olheiro:* Botões `Adicionar à Lista de Alvos`, `Acompanhar por 3 meses`, `Iniciar Negociações`.
    * *Recomendação de Treino:* Botões `Aplicar Sugestões`, `Dispensar Relatório`.

### 2.3. O Menu Lateral de Navegação
Navegação persistente com os seguintes botões-âncora:
1.  **Plantel:** Lista de jogadores, condições físicas, moral e seleção rápida de status.
2.  **Dinâmica:** Gráficos de hierarquia e grupos sociais.
3.  **Táticas:** Tela de arrastar e soltar (drag and drop) de posições e definição de instruções.
4.  **Relatório de Equipa:** Gráficos de prós e contras gerados pelo treinador adjunto.
5.  **Treino:** Calendários semanais e focos individuais.
6.  **Centro de Olheiros:** Painel de missões de busca e base de dados de mercado.
7.  **Transferências:** Cláusulas contratuais ativas, propostas enviadas e recebidas.
8.  **Finanças:** Balanços de receitas/despesas, gráficos de projeção e aba de salários.
9.  **Visão do Clube:** Painel com o nível de satisfação da diretoria e dos adeptos.

---

## 3. MÓDULO DE TÁTICAS E ESTRATÉGIA

Sistema onde o usuário configura as variáveis que serão injetadas no Motor de Jogo.

### 3.1. Mentalidade da Equipa
Um seletor que dita o viés de risco intrínseco. Altera os valores padrão ocultos de largura, ritmo e bloco defensivo:
* *Muito Defensiva / Defensiva / Cautelosa / Equilibrada / Positiva / Ofensiva / Muito Ofensiva.*

### 3.2. As Três Fases de Instruções Coletivas
* **Em Posse (Ataque):**
    * *Largura de Ataque:* Controlada por um slider (Estreito, Equilibrado, Largo).
    * *Estilo de Passe:* Slider de comprimento (Muito Curto a Muito Direto).
    * *Ritmo de Jogo:* Slider de velocidade (Muito Baixo a Extremamente Alto).
    * *Foco de Jogo:* Botões de alternância (`Focar pelo Centro`, `Explorar a Ala Direita`, `Explorar a Ala Esquerda`).
    * *Terço Final:* Botões de decisão (`Rematar Sempre que Possível`, `Levar a Bola até à Área`, `Cruzar Cedo`).
* **Em Transição (Momento da Perda/Ganho de Bola):**
    * *Após Perder a Posse:* Alternância entre `Contra-Pressionar` (Gegenpress) ou `Recuar/Reagrupar`.
    * *Após Ganhar a Posse:* Alternância entre `Contra-Atacar` ou `Manter a Posse/Estrutura`.
    * *Distribuição do Guarda-Redes:* Botões para selecionar o destino (Defesas Laterais, Centrais, Médios ou Ponta de Lança) e o método (Passar Curto, Pontapé Longo, Lançar com a Mão).
* **Sem Posse (Defesa):**
    * *Linha de Engajamento & Linha Defensiva:* Sliders verticais correlacionados (Bloco Alto, Médio ou Baixo).
    * *Intensidade de Pressão:* Slider de frequência de abordagem física.
    * *Desarmes:* Botões alternáveis entre `Fazer Desarmes Agressivos` ou `Conter o Adversário`.
    * *Linha de Fora de Jogo:* Botão de ativação/desativação da armadilha de impedimento.

### 3.3. Funções (Roles) e Tarefas (Duties) por Posição
O usuário atribui a cada posição em campo um papel que altera drasticamente a taxa de ocupação de espaços. Cada função recebe uma Tarefa: `Defender`, `Apoiar` ou `Atacar`.
* *Exemplos de Funções de Campo:* Falso 9, Avançado-Centro, Extremo Invertido, Construtor de Jogo Recuado, Médio Recuperador de Bolas, Ala Completo, Defesa Central Limitado.

---

## 4. SISTEMA DE DINÂMICA DO BALNEÁRIO (DYNAMICS)

Uma rede de relacionamentos simulada por grafos que mede o impacto psicológico das decisões do treinador.

### 4.1. Pirâmide de Hierarquia
Os jogadores ocupam níveis baseados em seu tempo de clube, idade, atributos de Liderança e relevância contratual:
* *Líderes de Equipa -> Jogadores Altamente Influentes -> Jogadores Influentes -> Outros.*
* **Regra de Impacto:** Se um Líder de Equipa ficar insatisfeito (ex: falta de tempo de jogo), ele inicia uma "revolta". O sistema reduz automaticamente o moral de todos os jogadores conectados a ele na árvore social.

### 4.2. Grupos Sociais (Panelinhas)
Mapeamento automático de afinidades baseado em semelhanças geradas no Spawner:
* Jogadores da mesma nacionalidade, que chegaram na mesma janela de transferências, ou com idades próximas entram no mesmo array de grupo.

### 4.3. Monitor de Felicidade e Promessas
Uma tabela de status de satisfação dividida em: *Tempo de Jogo, Tratamento pelo Treinador, Condições Contratuais, Performance do Clube*.
* **Mecânica de Promessas:** Ao contratar ou acalmar um jogador, o usuário pode clicar em botões de compromisso (Ex: `Prometer Melhorar o Treino de Ataque`, `Prometer Subir de Divisão esta Época`). O sistema ativa um contador de dias. Se o objetivo não for cumprido no prazo, o jogador exige ser listado para transferência.

---

## 5. MERCADO DE TRANSFERÊNCIAS E OLHEIROS ALGORÍTMICOS

Uma simulação de economia fechada onde clubes controlados por IA competem diretamente com o usuário.

### 5.1. O Nevoeiro de Atributos (Scouting Fog)
Quando o usuário pesquisa a lista de jogadores genéricos do mundo, os atributos de 1 a 20 não são exibidos explicitamente se o jogador não estiver na área de conhecimento do clube. Eles aparecem como intervalos (ex: Passe: 8-14).
* **Botão "Atribuir Olheiro":** Despacha um funcionário técnico para observar o atleta. A cada X dias, o intervalo diminui até revelar o atributo exato e o intervalo estimado de PA (ex: 3 a 5 estrelas de potencial).

### 5.2. Painel de Negociação de Transferência
Dividido em duas etapas com botões de proposta financeira:
1.  **Acordo entre Clubes:**
    * *Taxa Fixa:* Valor pago imediatamente.
    * *Cláusulas Parceladas:* Valores divididos em até 36 meses.
    * *Bónus por Performance:* Dinheiro extra após X jogos ou X golos marcados.
    * *Percentagem de Venda Futura:* Cláusula de mais-valia (0% a 50%).
2.  **Acordo Contratual com o Jogador:**
    * *Estatuto do Plantel:* Dropdown crucial (`Jogador Chave`, `Titular Regular`, `Jogador de Rotação`, `Jovem Promessa`, `Excedente`). Errar nesta escolha destrói o moral do jogador no futuro.
    * *Salário e Duração do Vínculo.*
    * *Cláusulas de Rescisão:* Valor que força o clube a aceitar a proposta.

---

## 6. MOTOR DE JOGO (MATCH ENGINE) E SIMULAÇÃO DE PARTIDA

O simulador de jogos funciona de forma puramente estatística e matemática rodando em turnos invisíveis (ticks de tempo).

### 6.1. O Algoritmo de Cálculo Estatístico
A cada minuto virtual de jogo, o motor coleta as configurações táticas das duas equipas, os atributos dos 22 jogadores em campo e processa equações de probabilidade:
* *Cálculo de Posse de Bola:* Baseado na soma dos atributos de Passe, Visão e Decisões dos médios, contra Desarme, Concentração e Posicionamento dos defesas adversários.
* *Geração de Destaques (Highlights):* Quando a equação matemática de ataque supera significativamente a de defesa, o motor calcula um evento de perigo, escolhendo a rota da jogada (Ala, Centro, Bola Parada) com base nas instruções táticas.

### 6.2. Interface de Dia de Jogo e Comandos em Tempo Real
Durante a partida, a tela exibe um sumário estatístico instantâneo e disponibiliza os seguintes botões de intervenção imediata:
* **Botão "Fazer Substituição":** Abre o mini-gráfico do campo para trocar jogadores cansados (Condição Física cai ao longo do jogo).
* **Botão "Gritos à Equipa" (Shouts):** Instruções verbais que alteram o moral momentâneo instantaneamente durante o jogo:
    * *Exigir Mais:* Aumenta o Índice de Trabalho, mas pode causar ansiedade se o time estiver perdendo por muito.
    * *Encorajar:* Aumenta o moral de jogadores jovens ou sob pressão.
    * *Elogiar:* Ativado após marcar um golo. Mantém o foco alto.
    * *Criticar:* Usado em exibições péssimas. Aumenta a agressividade e determinação temporariamente.
* **Centro de Dados ao Vivo (Live Data Hub):** Exibição de gráficos em tempo real de xG (Gols Esperados), Mapa de Calor das posições e Gráfico de Eficiência de Passes.

---

## 7. DIRETORIA, TREINAMENTO E INFRAESTRUTURA

### 7.1. Sistema de Treino Semanal
O utilizador configura a agenda dividindo os dias da semana em 3 blocos diários de treino. Cada bloco pode ser preenchido com rotinas específicas que aplicam modificadores de ganho ou perda nos atributos e na fadiga:
* *Treino Físico:* Aumenta Velocidade/Resistência, mas eleva drasticamente a probabilidade de lesão a curto prazo.
* *Treino de Coesão Equipa:* Não altera atributos técnicos, mas aumenta a velocidade de ganho de familiaridade tática e melhora os grupos sociais.

### 7.2. Conselho de Administração (The Board)
A IA da diretoria julga o desempenho do usuário com base em notas de letras (A+ a F). O sistema analisa três pilares através de KPIs (Indicadores de Desempenho):
1.  **Resultados Desportivos:** Cumprimento das metas da competição (ex: Evitar a descida de divisão).
2.  **Controlo Financeiro:** Manutenção da folha salarial dentro do teto estipulado.
3.  **Cultura de Jogo:** Seguir filosofias de longo prazo exigidas pela diretoria (ex: `Contratar apenas jogadores com menos de 21 anos` ou `Jogar futebol esteticamente ofensivo`).

* **Botão "Fazer Pedido à Direção":** Permite abrir uma interface de negociação com os cartolas para solicitar: `Aumento do Orçamento de Transferências`, `Melhoria das Instalações de Treino`, `Melhoria do Recrutamento de Jovens` ou `Aumento do Limite de Staff Técnico`.

### 7.3. Fornada de Jovens Regens (Youth Intake)
Uma vez por ano, o sistema executa um script de spawn massivo de novos jogadores de 15 anos nas academias das equipas.
* A qualidade média de CA e PA dessa fornada é diretamente indexada ao nível das estruturas de "Recrutamento de Jovens" e "Condições das Instalações das Camadas Jovem" que o clube evoluiu através dos pedidos à direção.
