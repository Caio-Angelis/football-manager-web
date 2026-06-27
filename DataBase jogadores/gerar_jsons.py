import json
import os

output_dir = os.path.dirname(os.path.abspath(__file__))

def calc_over(vel, chute, passe, drible, defesa, fisico, posicao):
    weights = {
        "GOL": {"vel": 0.05, "chute": 0.05, "passe": 0.15, "drible": 0.05, "defesa": 0.40, "fisico": 0.30},
        "ZAG": {"vel": 0.10, "chute": 0.05, "passe": 0.15, "drible": 0.05, "defesa": 0.40, "fisico": 0.25},
        "LAT": {"vel": 0.20, "chute": 0.10, "passe": 0.20, "drible": 0.15, "defesa": 0.20, "fisico": 0.15},
        "VOL": {"vel": 0.10, "chute": 0.10, "passe": 0.25, "drible": 0.10, "defesa": 0.25, "fisico": 0.20},
        "MEI": {"vel": 0.15, "chute": 0.15, "passe": 0.30, "drible": 0.20, "defesa": 0.10, "fisico": 0.10},
        "ATA": {"vel": 0.20, "chute": 0.30, "passe": 0.15, "drible": 0.20, "defesa": 0.05, "fisico": 0.10},
        "PD": {"vel": 0.25, "chute": 0.25, "passe": 0.15, "drible": 0.25, "defesa": 0.05, "fisico": 0.05},
        "PE": {"vel": 0.25, "chute": 0.25, "passe": 0.15, "drible": 0.25, "defesa": 0.05, "fisico": 0.05},
    }
    w = weights.get(posicao, weights["MEI"])
    over = (vel * w["vel"] + chute * w["chute"] + passe * w["passe"] +
            drible * w["drible"] + defesa * w["defesa"] + fisico * w["fisico"])
    return round(over)

def make_player(nome, posicao, jogos, gols, ass, vel, chute, passe, drible, defesa, fisico):
    over = calc_over(vel, chute, passe, drible, defesa, fisico, posicao)
    return {
        "nome": nome,
        "posicao": posicao,
        "jogos": jogos,
        "gols": gols,
        "assistencias": ass,
        "velocidade": vel,
        "chute": chute,
        "passe": passe,
        "drible": drible,
        "defesa": defesa,
        "fisico": fisico,
        "over_geral": over
    }

def save_json(team_name, players):
    filepath = os.path.join(output_dir, f"{team_name}.json")
    data = {"time": team_name, "jogadores": players}
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Arquivo criado: {filepath} ({len(players)} jogadores)")

# ==================== FLAMENGO ====================
flamengo = [
    make_player("Rossi", "GOL", 52, 0, 0, 45, 25, 55, 30, 85, 80),
    make_player("Léo Pereira", "ZAG", 48, 3, 1, 65, 45, 60, 40, 82, 83),
    make_player("Léo Ortiz", "ZAG", 42, 1, 0, 60, 40, 58, 35, 80, 82),
    make_player("Wesley", "LAT", 50, 2, 5, 82, 50, 70, 75, 65, 70),
    make_player("Ayrton Lucas", "LAT", 45, 1, 4, 80, 45, 68, 72, 62, 68),
    make_player("Pulgar", "VOL", 44, 2, 3, 60, 55, 75, 50, 75, 78),
    make_player("De La Cruz", "MEI", 49, 5, 10, 70, 72, 85, 78, 55, 65),
    make_player("Gerson", "MEI", 46, 4, 6, 72, 65, 80, 72, 68, 75),
    make_player("Arrascaeta", "MEI", 44, 8, 12, 68, 78, 88, 82, 45, 60),
    make_player("Pedro", "ATA", 40, 15, 3, 65, 85, 65, 70, 35, 78),
    make_player("Bruno Henrique", "ATA", 38, 8, 5, 85, 75, 65, 80, 40, 72),
    make_player("Léo Pereira II", "ZAG", 35, 0, 0, 62, 35, 55, 35, 78, 80),
    make_player("Pablo", "ATA", 33, 7, 2, 70, 72, 60, 68, 35, 75),
    make_player("Plata", "PD", 30, 5, 4, 88, 65, 60, 80, 30, 55),
    make_player("Everton Cebolinha", "PE", 28, 4, 3, 82, 70, 68, 78, 35, 60),
    make_player("Lyanco", "ZAG", 32, 1, 0, 65, 40, 55, 35, 76, 80),
    make_player("Thiago Maia", "VOL", 30, 0, 2, 65, 45, 72, 50, 70, 72),
    make_player("Matheus Cunha", "GOL", 12, 0, 0, 40, 20, 50, 25, 78, 75),
    make_player("Filipe Luís", "LAT", 25, 0, 3, 65, 40, 72, 55, 68, 65),
    make_player("Michael", "PD", 22, 3, 1, 85, 60, 55, 72, 35, 60),
]

# ==================== PALMEIRAS ====================
palmeiras = [
    make_player("Weverton", "GOL", 56, 0, 0, 45, 25, 55, 30, 86, 82),
    make_player("Gustavo Gómez", "ZAG", 52, 3, 1, 60, 45, 62, 35, 85, 84),
    make_player("Murilo", "ZAG", 48, 1, 0, 68, 40, 60, 40, 80, 80),
    make_player("Piquerez", "LAT", 50, 2, 5, 78, 55, 75, 70, 65, 72),
    make_player("Giay", "LAT", 42, 1, 3, 75, 45, 70, 68, 62, 68),
    make_player("Aníbal Moreno", "VOL", 45, 1, 2, 65, 50, 75, 55, 75, 75),
    make_player("Richard Ríos", "MEI", 50, 3, 4, 75, 65, 78, 75, 65, 72),
    make_player("Raphael Veiga", "MEI", 45, 8, 5, 62, 78, 82, 70, 50, 65),
    make_player("Emiliano Martínez", "MEI", 40, 4, 3, 70, 60, 72, 68, 55, 65),
    make_player("Facundo Torres", "PD", 52, 12, 8, 80, 75, 72, 80, 40, 65),
    make_player("Estêvão", "PD", 48, 13, 5, 85, 72, 70, 82, 35, 60),
    make_player("Flaco López", "ATA", 42, 10, 4, 68, 78, 65, 68, 40, 75),
    make_player("Vitor Roque", "ATA", 40, 8, 3, 80, 75, 60, 75, 35, 72),
    make_player("Maurício", "MEI", 38, 3, 2, 72, 60, 70, 68, 55, 65),
    make_player("Allan", "VOL", 35, 0, 2, 65, 45, 72, 50, 72, 73),
    make_player("Felipe Anderson", "MEI", 33, 2, 3, 75, 65, 75, 72, 50, 65),
    make_player("Vanderlan", "LAT", 30, 0, 1, 78, 40, 65, 65, 60, 65),
    make_player("Bruno Fuchs", "ZAG", 28, 0, 0, 65, 40, 58, 35, 76, 78),
    make_player("Gabriel Menino", "MEI", 30, 1, 2, 65, 55, 72, 60, 60, 68),
    make_player("Marcos Rocha", "LAT", 25, 0, 1, 68, 40, 65, 50, 65, 68),
]

# ==================== CRUZEIRO ====================
cruzeiro = [
    make_player("Cássio", "GOL", 54, 0, 0, 45, 25, 55, 30, 84, 82),
    make_player("Lucas Romero", "ZAG", 52, 1, 2, 65, 45, 65, 40, 80, 80),
    make_player("Fabrício Bruno", "ZAG", 48, 2, 0, 62, 40, 60, 35, 82, 83),
    make_player("Kaiki", "LAT", 51, 1, 3, 78, 45, 68, 65, 62, 68),
    make_player("William", "LAT", 42, 0, 2, 72, 40, 65, 55, 65, 68),
    make_player("Lucas Silva", "VOL", 50, 1, 3, 60, 50, 75, 50, 72, 72),
    make_player("Walace", "VOL", 45, 0, 2, 62, 45, 70, 48, 75, 75),
    make_player("Matheus Pereira", "MEI", 51, 8, 12, 65, 78, 88, 80, 45, 60),
    make_player("Eduardo", "MEI", 51, 5, 6, 70, 65, 75, 72, 50, 62),
    make_player("Kaio Jorge", "ATA", 48, 15, 4, 72, 80, 65, 70, 38, 75),
    make_player("Gabigol", "ATA", 49, 13, 4, 68, 78, 65, 72, 35, 73),
    make_player("Dante", "ZAG", 40, 1, 0, 60, 38, 55, 33, 78, 80),
    make_player("Marlon", "ZAG", 35, 0, 0, 65, 40, 58, 38, 76, 78),
    make_player("Fernando Henrique", "LAT", 33, 0, 1, 75, 40, 62, 55, 60, 65),
    make_player("Lucas Villalba", "LAT", 30, 0, 1, 72, 38, 60, 52, 58, 65),
    make_player("Araújo", "MEI", 32, 2, 2, 70, 55, 68, 65, 50, 62),
    make_player("Giovani", "MEI", 28, 1, 1, 68, 50, 65, 60, 48, 60),
    make_player("Cristian", "ATA", 30, 3, 1, 75, 65, 55, 70, 35, 65),
    make_player("Rafael Cabral", "GOL", 10, 0, 0, 42, 22, 50, 25, 78, 76),
    make_player("Matheus Pereira II", "MEI", 25, 1, 1, 65, 55, 68, 60, 48, 60),
]

# ==================== MIRASSOL ====================
mirassol = [
    make_player("Walter", "GOL", 45, 0, 0, 42, 25, 55, 28, 82, 80),
    make_player("Jemmes", "ZAG", 42, 1, 0, 62, 40, 58, 35, 78, 80),
    make_player("João Victor", "ZAG", 40, 1, 0, 65, 42, 60, 38, 76, 78),
    make_player("Reinaldo", "LAT", 48, 14, 5, 78, 72, 70, 72, 60, 72),
    make_player("Lucas Ramon", "LAT", 42, 3, 2, 75, 45, 65, 60, 62, 68),
    make_player("Daniel Borges", "LAT", 38, 2, 3, 72, 48, 68, 58, 60, 66),
    make_player("Negueba", "PE", 45, 3, 4, 82, 55, 62, 75, 35, 60),
    make_player("Gabriel", "MEI", 44, 6, 5, 68, 62, 75, 68, 52, 62),
    make_player("Danielzinho", "MEI", 40, 3, 6, 75, 55, 72, 70, 45, 60),
    make_player("Chico Kim", "MEI", 38, 2, 3, 65, 50, 70, 60, 50, 60),
    make_player("Iury Castilho", "ATA", 30, 5, 2, 82, 65, 58, 75, 32, 62),
    make_player("Léo Gamalho", "ATA", 35, 3, 1, 65, 68, 55, 60, 35, 72),
    make_player("Edson Carioca", "ATA", 32, 3, 2, 72, 60, 58, 65, 35, 65),
    make_player("Igor Formiga", "ATA", 28, 5, 1, 78, 68, 55, 68, 32, 65),
    make_player("Nathan Fogaça", "ATA", 25, 4, 1, 75, 65, 52, 65, 30, 65),
    make_player("Matheus Davó", "ATA", 20, 2, 0, 78, 60, 50, 62, 30, 65),
    make_player("Cristian Renato", "ATA", 22, 2, 1, 75, 55, 52, 62, 32, 60),
    make_player("Guilherme Pato", "ATA", 18, 2, 1, 72, 58, 55, 60, 32, 62),
    make_player("Yago", "ZAG", 28, 0, 0, 65, 38, 55, 35, 72, 75),
    make_player("Felipe", "GOL", 15, 0, 0, 40, 22, 48, 25, 75, 72),
]

# ==================== FLUMINENSE ====================
fluminense = [
    make_player("Fábio", "GOL", 74, 0, 0, 40, 22, 52, 25, 82, 78),
    make_player("Hércules", "VOL", 68, 2, 3, 65, 50, 72, 52, 75, 75),
    make_player("Kevin Serna", "LAT", 67, 1, 4, 78, 50, 70, 65, 62, 68),
    make_player("Martinelli", "VOL", 63, 1, 2, 62, 48, 72, 50, 72, 72),
    make_player("Juan Freytes", "ZAG", 62, 1, 0, 65, 42, 62, 38, 80, 80),
    make_player("Agustín Canobbio", "PD", 58, 4, 5, 82, 65, 70, 78, 40, 62),
    make_player("Everaldo", "LAT", 58, 2, 3, 75, 45, 68, 60, 62, 68),
    make_player("Samuel Xavier", "LAT", 57, 1, 2, 70, 42, 65, 55, 65, 68),
    make_player("Germán Cano", "ATA", 50, 12, 4, 62, 80, 62, 65, 35, 75),
    make_player("Renê", "LAT", 48, 0, 2, 68, 40, 65, 52, 65, 68),
    make_player("Facundo Bernal", "VOL", 47, 1, 2, 62, 48, 70, 50, 70, 70),
    make_player("Lima", "MEI", 47, 3, 3, 65, 55, 72, 62, 52, 62),
    make_player("Thiago Silva", "ZAG", 46, 1, 0, 58, 40, 68, 38, 82, 78),
    make_player("Nonato", "VOL", 46, 0, 2, 62, 45, 68, 48, 72, 72),
    make_player("Ignácio", "ZAG", 42, 0, 0, 62, 38, 55, 35, 78, 78),
    make_player("Guga", "LAT", 41, 0, 1, 72, 40, 62, 52, 60, 65),
    make_player("Keno", "PE", 40, 5, 4, 80, 68, 65, 75, 35, 62),
    make_player("Jhon Arias", "PD", 35, 4, 3, 82, 65, 68, 75, 40, 60),
    make_player("Gabriel Fuentes", "LAT", 28, 0, 2, 72, 42, 65, 55, 58, 62),
    make_player("PH Ganso", "MEI", 28, 2, 3, 55, 60, 80, 65, 45, 58),
]

# ==================== BOTAFOGO ====================
botafogo = [
    make_player("John Victor", "GOL", 48, 0, 0, 45, 25, 55, 30, 82, 80),
    make_player("Gregore", "VOL", 45, 0, 8, 62, 48, 75, 50, 75, 75),
    make_player("Igor Jesus", "ATA", 42, 9, 3, 78, 75, 62, 72, 38, 75),
    make_player("Marlon Freitas", "MEI", 46, 2, 4, 68, 55, 75, 65, 55, 65),
    make_player("Vitinho", "LAT", 40, 0, 3, 75, 45, 68, 60, 62, 68),
    make_player("Alex Telles", "LAT", 38, 7, 4, 72, 65, 75, 62, 60, 68),
    make_player("Jair", "ZAG", 40, 1, 0, 65, 42, 60, 38, 78, 78),
    make_player("Savarino", "MEI", 38, 6, 5, 78, 65, 72, 75, 45, 62),
    make_player("Alexander Barboza", "ZAG", 38, 1, 8, 62, 45, 65, 40, 78, 80),
    make_player("Patrick de Paula", "VOL", 36, 4, 3, 65, 55, 72, 55, 68, 70),
    make_player("Cuiabano", "LAT", 35, 6, 6, 78, 55, 68, 65, 55, 65),
    make_player("Newton", "VOL", 32, 1, 4, 68, 50, 72, 55, 65, 65),
    make_player("Mateo Ponte", "LAT", 33, 0, 3, 72, 42, 65, 55, 60, 65),
    make_player("Serafim", "ZAG", 28, 1, 3, 68, 42, 60, 40, 72, 75),
    make_player("Artur", "ATA", 30, 8, 2, 80, 72, 60, 72, 35, 68),
    make_player("Rwan Cruz", "ATA", 25, 2, 3, 82, 60, 55, 70, 30, 62),
    make_player("David Ricardo", "ZAG", 28, 2, 1, 65, 42, 58, 38, 75, 76),
    make_player("Kayke", "ATA", 22, 3, 1, 75, 62, 52, 62, 32, 65),
    make_player("Danilo Santos", "LAT", 25, 0, 1, 72, 40, 60, 52, 58, 62),
    make_player("Bastos", "ZAG", 22, 0, 0, 62, 38, 55, 35, 74, 76),
]

# ==================== BAHIA ====================
bahia = [
    make_player("Ronaldo", "GOL", 55, 0, 0, 42, 25, 55, 28, 80, 78),
    make_player("Gilberto", "LAT", 52, 1, 3, 75, 45, 68, 60, 62, 68),
    make_player("David Duarte", "ZAG", 50, 1, 0, 65, 42, 62, 38, 78, 78),
    make_player("Ramos Mingo", "ZAG", 48, 2, 0, 62, 40, 60, 35, 80, 80),
    make_player("Luciano Juba", "LAT", 52, 2, 4, 78, 50, 70, 65, 60, 65),
    make_player("Acevedo", "VOL", 48, 1, 2, 65, 50, 72, 52, 72, 72),
    make_player("Jean Lucas", "MEI", 50, 7, 4, 70, 68, 75, 68, 55, 68),
    make_player("Everton Ribeiro", "MEI", 48, 5, 6, 68, 70, 80, 70, 48, 62),
    make_player("Ademir", "PD", 45, 4, 5, 82, 62, 65, 75, 38, 60),
    make_player("Pulga", "PE", 44, 6, 4, 80, 65, 62, 72, 35, 58),
    make_player("Willian José", "ATA", 42, 8, 3, 62, 75, 60, 58, 38, 75),
    make_player("Cauly", "MEI", 40, 4, 3, 72, 65, 72, 70, 45, 60),
    make_player("Estupiñán", "ATA", 38, 8, 2, 78, 72, 58, 68, 32, 68),
    make_player("Luciano Rodríguez", "ATA", 35, 5, 3, 80, 68, 60, 70, 32, 65),
    make_player("Caio Alexandre", "VOL", 30, 1, 2, 68, 50, 72, 55, 65, 65),
    make_player("Everaldo", "PE", 32, 3, 2, 80, 58, 60, 68, 35, 58),
    make_player("Vitor Hugo", "ZAG", 28, 1, 0, 62, 40, 55, 35, 75, 78),
    make_player("Nestor", "MEI", 25, 1, 1, 65, 50, 68, 58, 48, 60),
    make_player("Marcos Felipe", "GOL", 15, 0, 0, 40, 22, 48, 25, 75, 72),
    make_player("Rafael Ramos", "LAT", 22, 0, 1, 70, 40, 60, 50, 58, 62),
]

# ==================== SÃO PAULO ====================
sao_paulo = [
    make_player("Rafael", "GOL", 59, 0, 0, 42, 25, 55, 28, 82, 80),
    make_player("Luciano", "ATA", 56, 17, 7, 72, 78, 72, 72, 40, 68),
    make_player("Enzo Díaz", "LAT", 52, 1, 3, 75, 45, 68, 58, 62, 68),
    make_player("Alisson", "MEI", 49, 2, 4, 68, 55, 75, 65, 52, 62),
    make_player("Robert Arboleda", "ZAG", 49, 2, 0, 60, 45, 58, 35, 82, 83),
    make_player("Alan Franco", "ZAG", 48, 1, 1, 65, 42, 62, 38, 78, 78),
    make_player("André Silva", "ATA", 40, 14, 4, 70, 78, 62, 68, 35, 75),
    make_player("Nahuel Ferraresi", "ZAG", 42, 0, 0, 65, 40, 60, 38, 78, 78),
    make_player("Cédric Soares", "LAT", 38, 0, 2, 68, 42, 65, 52, 62, 65),
    make_player("Oscar", "MEI", 35, 2, 5, 62, 60, 78, 65, 48, 60),
    make_player("Ferreira", "PD", 40, 8, 5, 80, 68, 65, 75, 35, 62),
    make_player("Lucas Moura", "PD", 30, 5, 3, 82, 70, 68, 78, 38, 62),
    make_player("Calleri", "ATA", 18, 3, 4, 68, 75, 62, 65, 38, 75),
    make_player("Bobadilla", "ATA", 28, 4, 3, 72, 65, 58, 62, 32, 68),
    make_player("Marcos Antônio", "MEI", 35, 1, 2, 70, 50, 72, 62, 52, 62),
    make_player("Pablo Maia", "VOL", 32, 0, 1, 65, 45, 70, 48, 70, 70),
    make_player("Aráoz", "ATA", 25, 2, 1, 75, 62, 55, 65, 32, 65),
    make_player("Welington", "LAT", 28, 0, 1, 72, 40, 62, 52, 58, 65),
    make_player("Júnior", "GOL", 12, 0, 0, 40, 22, 48, 25, 76, 74),
    make_player("Ryan Francisco", "ATA", 15, 1, 0, 78, 55, 50, 62, 28, 60),
]

# ==================== GRÊMIO ====================
gremio = [
    make_player("Marchesín", "GOL", 40, 0, 0, 42, 25, 55, 28, 80, 78),
    make_player("Tiago Volpi", "GOL", 49, 0, 0, 45, 28, 58, 30, 82, 80),
    make_player("Dodi", "VOL", 51, 2, 3, 62, 50, 72, 50, 72, 72),
    make_player("Edenilson", "MEI", 50, 5, 5, 68, 65, 78, 68, 52, 65),
    make_player("Cristaldo", "MEI", 47, 4, 4, 65, 62, 75, 68, 48, 62),
    make_player("Pavón", "LAT", 45, 1, 3, 78, 50, 68, 65, 60, 65),
    make_player("Wagner Leonardo", "ZAG", 42, 1, 0, 65, 42, 60, 38, 76, 78),
    make_player("Alysson", "LAT", 39, 0, 2, 75, 42, 65, 58, 58, 65),
    make_player("Cristian Olivera", "PD", 37, 6, 4, 85, 68, 62, 78, 35, 60),
    make_player("Aravena", "MEI", 37, 3, 3, 72, 55, 70, 65, 48, 62),
    make_player("André Henrique", "ZAG", 36, 0, 0, 62, 38, 55, 35, 75, 76),
    make_player("Marlon", "ZAG", 35, 0, 0, 65, 40, 58, 38, 76, 78),
    make_player("Braithwaite", "ATA", 30, 8, 2, 72, 78, 62, 68, 38, 75),
    make_player("Villasanti", "VOL", 28, 1, 2, 62, 48, 70, 50, 72, 75),
    make_player("Balbuena", "ZAG", 25, 0, 0, 60, 40, 60, 35, 80, 80),
    make_player("Soteldo", "PE", 28, 3, 4, 82, 60, 65, 80, 35, 55),
    make_player("Arezo", "ATA", 30, 5, 2, 78, 68, 55, 68, 32, 68),
    make_player("Jhonata Robert", "MEI", 25, 2, 1, 68, 55, 68, 60, 45, 60),
    make_player("Rodrigues", "ZAG", 22, 0, 0, 62, 38, 55, 35, 74, 76),
    make_player("Arthur", "MEI", 20, 1, 1, 70, 50, 65, 60, 45, 58),
]

# ==================== RED BULL BRAGANTINO ====================
bragantino = [
    make_player("Cleiton", "GOL", 38, 0, 0, 42, 25, 55, 28, 80, 78),
    make_player("Jhon Jhon", "MEI", 36, 10, 7, 78, 72, 75, 78, 45, 62),
    make_player("Eduardo Sasha", "ATA", 34, 4, 3, 72, 68, 62, 68, 38, 65),
    make_player("Guzmán Rodríguez", "ZAG", 32, 1, 1, 65, 42, 68, 40, 76, 76),
    make_player("Pedro Henrique", "ZAG", 35, 1, 2, 68, 45, 65, 42, 75, 76),
    make_player("Gabriel", "VOL", 33, 1, 3, 65, 48, 72, 52, 72, 72),
    make_player("Eric Faria", "LAT", 30, 0, 2, 78, 45, 68, 62, 60, 65),
    make_player("Vinícius Tobias", "LAT", 32, 1, 3, 80, 48, 70, 68, 58, 65),
    make_player("Helinho", "PD", 28, 3, 2, 82, 62, 62, 75, 32, 58),
    make_player("Alerrandro", "ATA", 30, 5, 2, 78, 68, 58, 68, 32, 65),
    make_player("Lucas Evangelista", "MEI", 28, 2, 2, 68, 55, 72, 62, 52, 62),
    make_player("Raul", "GOL", 15, 0, 0, 40, 22, 50, 25, 76, 74),
    make_player("Mosquera", "MEI", 25, 2, 3, 72, 55, 68, 65, 45, 60),
    make_player("Juninho Capixaba", "LAT", 24, 0, 1, 72, 42, 62, 52, 58, 62),
    make_player("Henry Vargas", "ATA", 22, 3, 1, 72, 65, 55, 62, 32, 68),
    make_player("Bruno Praxedes", "VOL", 26, 1, 2, 68, 48, 70, 55, 65, 65),
    make_player("Luan Cândido", "LAT", 22, 0, 1, 75, 42, 62, 55, 58, 62),
    make_player("Savio", "PD", 20, 2, 1, 82, 58, 55, 72, 28, 55),
    make_player("Aderlandio", "ZAG", 18, 0, 0, 62, 38, 55, 35, 72, 74),
    make_player("Wanderson", "PE", 18, 1, 1, 80, 55, 55, 68, 30, 55),
]

# ==================== ATLÉTICO MINEIRO ====================
atletico_mg = [
    make_player("Everson", "GOL", 70, 0, 0, 42, 25, 55, 28, 83, 80),
    make_player("Gustavo Scarpa", "MEI", 68, 3, 12, 65, 68, 82, 68, 50, 65),
    make_player("Natanael", "LAT", 63, 3, 4, 72, 45, 68, 55, 62, 68),
    make_player("Hulk", "ATA", 63, 21, 8, 68, 85, 72, 68, 45, 82),
    make_player("Junior Alonso", "ZAG", 63, 1, 0, 62, 42, 62, 38, 80, 82),
    make_player("Rony", "ATA", 62, 13, 5, 78, 72, 65, 72, 35, 68),
    make_player("Igor Gomes", "MEI", 62, 5, 3, 68, 58, 72, 62, 52, 65),
    make_player("Alan Franco", "ZAG", 58, 1, 1, 65, 42, 62, 38, 78, 78),
    make_player("Bernard", "PE", 54, 5, 2, 80, 60, 68, 75, 35, 58),
    make_player("Guilherme Arana", "LAT", 51, 3, 2, 80, 55, 72, 68, 58, 65),
    make_player("Gabriel Menino", "MEI", 47, 1, 2, 65, 55, 72, 60, 58, 68),
    make_player("Lyanco", "ZAG", 44, 4, 0, 65, 42, 58, 38, 76, 78),
    make_player("Tomás Cuello", "PD", 41, 6, 7, 80, 65, 68, 75, 38, 60),
    make_player("Caio", "MEI", 36, 2, 2, 68, 55, 70, 62, 50, 62),
    make_player("Vitor Hugo", "ZAG", 34, 4, 0, 62, 42, 55, 35, 78, 80),
    make_player("Saravia", "LAT", 33, 0, 1, 68, 40, 60, 50, 60, 65),
    make_player("Rubens", "ZAG", 30, 2, 0, 65, 40, 58, 38, 75, 76),
    make_player("Alexsander", "MEI", 24, 2, 1, 70, 52, 65, 58, 48, 62),
    make_player("Júnior Santos", "ATA", 28, 2, 2, 72, 62, 55, 60, 32, 68),
    make_player("Dudu", "ATA", 26, 4, 4, 75, 68, 62, 70, 35, 72),
]

# ==================== SANTOS ====================
santos = [
    make_player("Gabriel Brazão", "GOL", 40, 0, 0, 42, 25, 55, 28, 78, 76),
    make_player("Guilherme", "GOL", 30, 0, 0, 40, 22, 52, 25, 76, 74),
    make_player("João Schmidt", "VOL", 45, 1, 2, 62, 48, 72, 50, 72, 72),
    make_player("Zé Ivaldo", "ZAG", 42, 2, 0, 62, 42, 60, 38, 78, 78),
    make_player("Gonzalo Escobar", "LAT", 40, 0, 3, 75, 42, 68, 58, 62, 65),
    make_player("Soteldo", "PE", 38, 4, 5, 82, 58, 65, 80, 35, 55),
    make_player("Diego Pituca", "VOL", 42, 1, 2, 62, 48, 70, 50, 70, 72),
    make_player("Tomás Rincón", "VOL", 38, 0, 2, 58, 45, 72, 48, 72, 75),
    make_player("Tiquinho Soares", "ATA", 40, 7, 2, 60, 75, 58, 55, 35, 78),
    make_player("Neymar", "MEI", 28, 11, 4, 72, 78, 85, 82, 40, 62),
    make_player("Luan Peres", "ZAG", 35, 0, 0, 62, 38, 58, 35, 76, 78),
    make_player("Thaciano", "MEI", 31, 5, 2, 68, 60, 68, 62, 45, 62),
    make_player("Lautaro Díaz", "ATA", 20, 3, 1, 75, 65, 55, 65, 30, 65),
    make_player("JP Chermont", "LAT", 25, 0, 1, 78, 42, 62, 55, 58, 62),
    make_player("João Pedro", "ZAG", 28, 1, 0, 65, 40, 58, 38, 75, 76),
    make_player("Zé Rafael", "MEI", 30, 2, 3, 65, 55, 72, 60, 52, 65),
    make_player("Evandro", "MEI", 25, 1, 2, 60, 52, 70, 55, 48, 60),
    make_player("Igor Vinícius", "LAT", 22, 0, 0, 70, 38, 55, 48, 58, 62),
    make_player("Matheus Nascimento", "ATA", 20, 2, 1, 75, 60, 52, 62, 30, 62),
    make_player("Mendoza", "ATA", 18, 3, 0, 72, 62, 50, 58, 28, 65),
]

# ==================== CORINTHIANS ====================
corinthians = [
    make_player("Hugo Souza", "GOL", 56, 0, 0, 42, 25, 55, 28, 83, 80),
    make_player("Yuri Alberto", "ATA", 58, 19, 3, 70, 82, 65, 70, 38, 78),
    make_player("Matheuzinho", "LAT", 54, 0, 3, 78, 42, 68, 60, 62, 65),
    make_player("Breno Bidon", "MEI", 50, 2, 4, 72, 55, 72, 65, 52, 62),
    make_player("Romero", "ATA", 53, 5, 13, 72, 68, 72, 70, 40, 68),
    make_player("André Carrillo", "PD", 48, 2, 9, 78, 62, 68, 72, 38, 65),
    make_player("Raniele", "VOL", 52, 0, 2, 62, 45, 70, 48, 72, 72),
    make_player("José Martínez", "MEI", 50, 1, 10, 65, 50, 75, 58, 65, 68),
    make_player("Memphis Depay", "ATA", 45, 6, 3, 72, 78, 75, 78, 38, 72),
    make_player("Matheus Bidu", "LAT", 42, 2, 3, 78, 48, 65, 62, 58, 62),
    make_player("Talles Magno", "PE", 48, 5, 18, 80, 60, 65, 75, 32, 60),
    make_player("André Ramalho", "ZAG", 40, 1, 0, 62, 40, 58, 35, 78, 78),
    make_player("Maycon", "VOL", 38, 1, 1, 62, 48, 70, 50, 68, 72),
    make_player("Fabrizio Angileri", "LAT", 35, 0, 2, 70, 42, 62, 52, 60, 65),
    make_player("Gustavo Henrique", "ZAG", 39, 4, 0, 62, 45, 60, 38, 80, 80),
    make_player("Rodrigo Garro", "MEI", 35, 3, 5, 68, 62, 80, 70, 45, 60),
    make_player("Charles", "ZAG", 30, 0, 0, 65, 38, 55, 35, 75, 76),
    make_player("Cacá", "ZAG", 28, 0, 0, 62, 38, 55, 35, 74, 76),
    make_player("João Pedro", "ATA", 25, 2, 1, 72, 60, 55, 62, 32, 68),
    make_player("Félix Torres", "ZAG", 22, 0, 0, 62, 40, 55, 35, 76, 78),
]

# ==================== VASCO DA GAMA ====================
vasco = [
    make_player("Léo Jardim", "GOL", 45, 0, 0, 42, 25, 55, 28, 80, 78),
    make_player("João Victor", "ZAG", 42, 1, 0, 62, 40, 60, 38, 78, 78),
    make_player("Lucas Piton", "LAT", 40, 1, 3, 78, 45, 68, 65, 60, 65),
    make_player("Pablo Vegetti", "ATA", 42, 15, 4, 62, 80, 62, 60, 38, 80),
    make_player("Hugo Moura", "VOL", 40, 1, 2, 62, 48, 70, 50, 70, 70),
    make_player("Paulo Henrique", "LAT", 38, 0, 2, 75, 42, 65, 58, 60, 65),
    make_player("Philippe Coutinho", "MEI", 35, 3, 4, 65, 72, 82, 75, 42, 58),
    make_player("Tchê Tchê", "VOL", 32, 0, 1, 60, 45, 68, 48, 70, 72),
    make_player("Rayan", "LAT", 30, 0, 1, 78, 42, 62, 55, 58, 62),
    make_player("Lucas Freitas", "ZAG", 28, 0, 0, 62, 38, 55, 35, 75, 76),
    make_player("Léo", "LAT", 25, 0, 1, 72, 40, 60, 52, 58, 62),
    make_player("Hugo", "ATA", 28, 5, 2, 75, 68, 58, 65, 32, 68),
    make_player("Payet", "MEI", 25, 2, 3, 58, 65, 78, 65, 38, 55),
    make_player("Vegetti II", "ATA", 22, 3, 1, 68, 62, 55, 58, 32, 70),
    make_player("Coutinho", "MEI", 20, 1, 1, 62, 55, 68, 58, 42, 55),
    make_player("Maicon", "VOL", 18, 0, 0, 55, 42, 65, 45, 65, 65),
    make_player("Marlon", "ZAG", 20, 0, 0, 62, 38, 55, 35, 72, 74),
    make_player("Garrido", "ZAG", 15, 0, 0, 60, 38, 52, 33, 72, 74),
    make_player("Léo Pereira", "ZAG", 18, 0, 0, 62, 38, 55, 35, 74, 76),
    make_player("Jorginho", "LAT", 12, 0, 0, 75, 38, 55, 50, 55, 60),
]

# ==================== VITÓRIA ====================
vitoria = [
    make_player("Lucas Arcanjo", "GOL", 51, 0, 0, 42, 25, 55, 28, 80, 78),
    make_player("Lucas Halter", "ZAG", 48, 5, 0, 62, 45, 60, 38, 80, 80),
    make_player("Ronald", "VOL", 48, 1, 2, 62, 48, 70, 50, 70, 70),
    make_player("Gabriel Baralhas", "VOL", 46, 5, 3, 65, 50, 72, 52, 72, 72),
    make_player("Matheuzinho", "PE", 44, 6, 3, 78, 62, 65, 72, 38, 60),
    make_player("Osvaldo", "MEI", 44, 3, 2, 70, 55, 68, 62, 48, 62),
    make_player("Zé Marcos", "ZAG", 41, 0, 0, 62, 38, 55, 35, 76, 78),
    make_player("Raúl Cáceres", "LAT", 40, 1, 3, 72, 45, 65, 55, 60, 65),
    make_player("Erick", "PD", 38, 3, 5, 78, 60, 68, 72, 40, 62),
    make_player("Renato Kayzer", "ATA", 31, 9, 1, 68, 75, 58, 62, 35, 75),
    make_player("Aitor Cantalapiedra", "MEI", 19, 3, 3, 62, 65, 78, 68, 42, 58),
    make_player("Janderson", "ATA", 34, 8, 4, 72, 70, 62, 68, 35, 65),
    make_player("Gustavo Mosquito", "PD", 35, 4, 5, 82, 58, 60, 72, 32, 58),
    make_player("Wellington Rato", "MEI", 24, 2, 5, 68, 55, 72, 62, 45, 60),
    make_player("Thiago Couto", "GOL", 20, 0, 0, 40, 22, 50, 25, 76, 74),
    make_player("Edu", "ZAG", 30, 0, 0, 62, 38, 55, 35, 76, 78),
    make_player("Camutanga", "ZAG", 28, 1, 0, 62, 40, 55, 35, 78, 78),
    make_player("Ramon", "LAT", 25, 0, 1, 72, 40, 60, 52, 58, 65),
    make_player("Willian Oliveira", "VOL", 22, 0, 1, 62, 45, 65, 48, 68, 68),
    make_player("Carlinhos", "ATA", 25, 4, 1, 75, 62, 55, 62, 32, 62),
]

# ==================== INTERNACIONAL ====================
internacional = [
    make_player("Rochet", "GOL", 35, 0, 0, 42, 25, 55, 28, 82, 80),
    make_player("Anthoni", "GOL", 39, 0, 0, 40, 22, 52, 25, 78, 76),
    make_player("Braian Aguirre", "LAT", 55, 1, 3, 75, 45, 68, 60, 62, 68),
    make_player("Vitão", "ZAG", 53, 2, 0, 65, 42, 62, 38, 80, 80),
    make_player("Alexandro Bernabei", "LAT", 51, 1, 4, 78, 48, 70, 65, 60, 65),
    make_player("Alan Patrick", "MEI", 51, 21, 13, 62, 82, 85, 72, 45, 65),
    make_player("Thiago Maia", "VOL", 50, 1, 2, 65, 48, 72, 52, 72, 72),
    make_player("Vitinho", "PD", 49, 5, 5, 80, 65, 68, 75, 40, 62),
    make_player("Bruno Henrique", "PE", 49, 4, 3, 78, 62, 65, 72, 38, 62),
    make_player("Rafael Borré", "ATA", 48, 8, 4, 72, 75, 65, 68, 38, 72),
    make_player("Wesley", "LAT", 39, 0, 2, 75, 42, 65, 58, 60, 65),
    make_player("Carbonero", "ATA", 39, 8, 3, 78, 70, 62, 70, 35, 65),
    make_player("Bruno Tabata", "PD", 33, 3, 2, 78, 60, 65, 68, 38, 58),
    make_player("Ronaldo", "ATA", 33, 4, 2, 80, 65, 58, 68, 32, 62),
    make_player("Victor Gabriel", "ZAG", 32, 0, 0, 65, 40, 58, 38, 76, 78),
    make_player("Valencia", "ATA", 32, 5, 2, 78, 72, 58, 65, 35, 72),
    make_player("Mercado", "ZAG", 25, 0, 0, 60, 40, 58, 35, 78, 78),
    make_player("Fernando", "VOL", 28, 0, 1, 62, 45, 68, 48, 70, 72),
    make_player("Bruno Gomes", "LAT", 15, 0, 0, 72, 40, 60, 52, 58, 62),
    make_player("Rômulo", "VOL", 22, 0, 1, 62, 42, 65, 48, 65, 65),
]

# ==================== CEARÁ ====================
ceara = [
    make_player("Fernando Miguel", "GOL", 40, 0, 0, 42, 25, 55, 28, 78, 76),
    make_player("Bruno Ferreira", "GOL", 30, 0, 0, 40, 22, 52, 25, 76, 74),
    make_player("Antonio Galeano", "ATA", 57, 12, 4, 72, 75, 65, 70, 38, 72),
    make_player("Lourenço", "PD", 54, 3, 3, 82, 60, 62, 72, 35, 60),
    make_player("Willian Machado", "ZAG", 51, 0, 0, 62, 40, 60, 38, 78, 78),
    make_player("Lucas Mugni", "MEI", 51, 4, 10, 62, 65, 80, 62, 48, 62),
    make_player("Dieguinho", "VOL", 51, 0, 2, 62, 45, 70, 48, 72, 72),
    make_player("Fernando Sobral", "MEI", 49, 0, 2, 65, 48, 68, 55, 52, 62),
    make_player("Fabiano Souza", "LAT", 48, 0, 2, 72, 42, 65, 55, 62, 68),
    make_player("Pedro Raul", "ATA", 43, 17, 2, 60, 78, 58, 55, 35, 78),
    make_player("Pedro Henrique", "PD", 35, 8, 3, 78, 68, 60, 68, 35, 62),
    make_player("Aylon", "ATA", 30, 5, 1, 75, 65, 55, 62, 32, 65),
    make_player("Fernandinho", "MEI", 28, 4, 2, 70, 58, 65, 60, 45, 60),
    make_player("Matheus Bahia", "LAT", 30, 0, 3, 75, 42, 62, 55, 58, 62),
    make_player("Marllon", "ZAG", 36, 0, 0, 62, 38, 55, 35, 76, 76),
    make_player("Nicolas", "MEI", 28, 2, 2, 68, 52, 65, 58, 48, 60),
    make_player("Rafael Ramos", "LAT", 25, 0, 1, 70, 40, 58, 50, 58, 62),
    make_player("Matheus Araújo", "MEI", 22, 1, 2, 68, 50, 62, 55, 45, 58),
    make_player("Vinicius", "ATA", 20, 2, 0, 75, 55, 50, 58, 28, 62),
    make_player("Richard", "GOL", 15, 0, 0, 38, 20, 48, 22, 74, 72),
]

# ==================== FORTALEZA ====================
fortaleza = [
    make_player("João Ricardo", "GOL", 48, 0, 0, 42, 25, 55, 28, 80, 78),
    make_player("Pikachu", "PD", 53, 6, 3, 82, 62, 65, 75, 38, 60),
    make_player("Breno Lopes", "ATA", 52, 10, 7, 72, 72, 65, 68, 38, 70),
    make_player("Lucero", "ATA", 50, 11, 3, 70, 78, 62, 65, 35, 72),
    make_player("Mancuso", "LAT", 47, 2, 5, 72, 48, 70, 55, 62, 68),
    make_player("Lucas Sasha", "VOL", 46, 1, 2, 65, 48, 72, 50, 70, 70),
    make_player("Gastón Ávila", "ZAG", 38, 1, 0, 65, 42, 62, 38, 78, 78),
    make_player("Brítez", "ZAG", 40, 1, 0, 62, 42, 58, 38, 80, 82),
    make_player("Deyverson", "ATA", 35, 9, 2, 65, 75, 58, 58, 38, 80),
    make_player("Bareiro", "ATA", 32, 7, 2, 70, 72, 58, 62, 35, 72),
    make_player("Pochettino", "MEI", 30, 2, 6, 68, 55, 72, 62, 48, 62),
    make_player("Marinho", "PD", 28, 3, 4, 82, 60, 62, 72, 32, 58),
    make_player("Bruno Pacheco", "LAT", 30, 0, 1, 72, 42, 62, 52, 60, 65),
    make_player("Martínez", "ZAG", 28, 1, 0, 62, 40, 58, 35, 78, 78),
    make_player("Tinga", "LAT", 25, 0, 1, 75, 42, 60, 52, 58, 62),
    make_player("Marcelo Benevenuto", "ZAG", 28, 0, 0, 62, 40, 55, 35, 76, 78),
    make_player("Thiago Galhardo", "ATA", 22, 3, 1, 72, 65, 58, 62, 32, 65),
    make_player("Moisés", "MEI", 20, 1, 1, 68, 52, 65, 55, 45, 60),
    make_player("Kevyson", "LAT", 18, 0, 1, 78, 40, 55, 52, 55, 60),
    make_player("Edinho", "LAT", 15, 0, 0, 68, 38, 52, 48, 55, 62),
]

# ==================== JUVENTUDE ====================
juventude = [
    make_player("Gustavo", "GOL", 35, 0, 0, 42, 25, 55, 28, 78, 76),
    make_player("Jadson", "VOL", 45, 1, 2, 62, 48, 72, 50, 72, 72),
    make_player("Ewerthon", "LAT", 42, 0, 2, 75, 42, 65, 55, 62, 65),
    make_player("Batalla", "ATA", 38, 5, 3, 68, 68, 60, 62, 35, 72),
    make_player("Giraldo", "MEI", 35, 2, 2, 65, 55, 68, 60, 48, 60),
    make_player("Abner", "LAT", 32, 0, 1, 72, 40, 62, 52, 58, 62),
    make_player("Mandaca", "ZAG", 30, 0, 0, 62, 38, 55, 35, 75, 76),
    make_player("Ênio", "MEI", 28, 1, 1, 68, 50, 65, 55, 48, 60),
    make_player("Alan Ruschel", "LAT", 30, 0, 0, 62, 38, 58, 45, 65, 65),
    make_player("Marcos Paulo", "ATA", 25, 2, 1, 72, 60, 55, 58, 32, 68),
    make_player("Erick Farias", "MEI", 28, 1, 1, 70, 52, 62, 55, 45, 60),
    make_player("Felipinho", "ATA", 25, 1, 1, 75, 55, 52, 58, 30, 60),
    make_player("Taliari", "ATA", 22, 3, 0, 68, 62, 52, 55, 32, 68),
    make_player("Adriano Martins", "MEI", 20, 1, 1, 65, 50, 60, 52, 45, 58),
    make_player("Jean Carlos", "MEI", 18, 0, 1, 68, 48, 58, 52, 42, 55),
    make_player("Giovanny", "ATA", 15, 1, 0, 72, 55, 50, 55, 28, 62),
    make_player("Wilker Ángel", "ZAG", 15, 0, 0, 60, 38, 52, 33, 74, 76),
    make_player("Gilberto", "ATA", 12, 2, 0, 68, 58, 48, 52, 28, 65),
    make_player("Nenê", "MEI", 15, 0, 0, 55, 45, 68, 52, 42, 55),
    make_player("Moreschi", "GOL", 20, 0, 0, 40, 22, 50, 25, 75, 72),
]

# ==================== SPORT RECIFE ====================
sport = [
    make_player("Caíque França", "GOL", 35, 0, 0, 42, 25, 55, 28, 76, 74),
    make_player("Thiago Couto", "GOL", 15, 0, 0, 40, 22, 52, 25, 74, 72),
    make_player("Ramon Menezes", "ZAG", 38, 0, 0, 62, 38, 55, 35, 75, 76),
    make_player("Matheus Alexandre", "LAT", 35, 0, 2, 75, 42, 62, 55, 58, 62),
    make_player("Aderlan", "LAT", 32, 1, 1, 78, 45, 62, 58, 58, 62),
    make_player("Rafael Thyere", "ZAG", 30, 0, 0, 62, 38, 55, 35, 76, 78),
    make_player("João Silva", "ZAG", 28, 0, 0, 62, 38, 55, 35, 75, 76),
    make_player("Chico", "ZAG", 25, 0, 0, 60, 38, 52, 33, 74, 76),
    make_player("Igor Cariús", "LAT", 30, 0, 1, 72, 40, 58, 50, 58, 62),
    make_player("Christian Rivera", "VOL", 35, 1, 2, 62, 48, 68, 50, 68, 68),
    make_player("Sérgio Oliveira", "VOL", 30, 1, 1, 60, 48, 68, 48, 68, 70),
    make_player("Du Queiroz", "MEI", 28, 1, 1, 65, 50, 62, 55, 48, 60),
    make_player("Lucas Lima", "MEI", 30, 1, 2, 58, 52, 72, 55, 42, 55),
    make_player("Chrystian Barletta", "PD", 34, 2, 1, 75, 58, 60, 65, 35, 60),
    make_player("Lenny Lobato", "PE", 30, 1, 1, 78, 52, 55, 65, 30, 55),
    make_player("Pablo", "ATA", 25, 2, 0, 72, 62, 52, 55, 30, 68),
    make_player("Carlos Alberto", "PE", 28, 1, 1, 72, 55, 58, 62, 32, 58),
    make_player("Carlos de Pena", "PD", 25, 2, 2, 78, 58, 62, 68, 35, 58),
    make_player("Zé Lucas", "VOL", 32, 0, 1, 62, 45, 65, 48, 68, 65),
    make_player("Gonçalo Paciência", "ATA", 22, 2, 0, 65, 65, 55, 55, 32, 72),
]

# ==================== GERAR TODOS OS ARQUIVOS ====================
teams = {
    "flamengo": flamengo,
    "palmeiras": palmeiras,
    "cruzeiro": cruzeiro,
    "mirassol": mirassol,
    "fluminense": fluminense,
    "botafogo": botafogo,
    "bahia": bahia,
    "sao_paulo": sao_paulo,
    "gremio": gremio,
    "red_bull_bragantino": bragantino,
    "atletico_mineiro": atletico_mg,
    "santos": santos,
    "corinthians": corinthians,
    "vasco_da_gama": vasco,
    "vitoria": vitoria,
    "internacional": internacional,
    "ceara": ceara,
    "fortaleza": fortaleza,
    "juventude": juventude,
    "sport_recife": sport,
}

print(f"\nGerando {len(teams)} arquivos JSON...\n")
for team_name, players in teams.items():
    save_json(team_name, players)

print(f"\nConcluído! {len(teams)} arquivos JSON gerados em: {output_dir}")
