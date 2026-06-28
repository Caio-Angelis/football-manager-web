import json, os

AGES = {
  "atletico_mineiro": {"Everson":35,"Gustavo Scarpa":31,"Natanael":28,"Hulk":38,"Junior Alonso":32,"Rony":30,"Igor Gomes":26,"Alan Franco":27,"Bernard":32,"Guilherme Arana":27,"Gabriel Menino":24,"Lyanco":27,"Tomás Cuello":25,"Caio":23,"Vitor Hugo":30,"Saravia":31,"Rubens":27,"Alexsander":21,"Júnior Santos":24,"Dudu":28},
  "bahia": {"Ronaldo":25,"Gilberto":31,"David Duarte":25,"Ramos Mingo":23,"Luciano Juba":26,"Acevedo":28,"Jean Lucas":24,"Everton Ribeiro":35,"Ademir":28,"Pulga":24,"Willian José":33,"Cauly":28,"Estupiñán":24,"Luciano Rodríguez":22,"Caio Alexandre":25,"Everaldo":30,"Vitor Hugo":30,"Nestor":24,"Marcos Felipe":26,"Rafael Ramos":30},
  "botafogo": {"John Victor":24,"Gregore":30,"Igor Jesus":23,"Marlon Freitas":30,"Vitinho":24,"Alex Telles":32,"Jair":29,"Savarino":28,"Alexander Barboza":28,"Patrick de Paula":24,"Cuiabano":22,"Newton":24,"Mateo Ponte":22,"Serafim":23,"Artur":23,"Rwan Cruz":22,"David Ricardo":23,"Kayke":24,"Danilo Santos":23,"Bastos":33},
  "ceara": {"Fernando Miguel":37,"Bruno Ferreira":24,"Antonio Galeano":25,"Lourenço":23,"Willian Machado":27,"Lucas Mugni":33,"Dieguinho":27,"Fernando Sobral":28,"Fabiano Souza":31,"Pedro Raul":28,"Pedro Henrique":24,"Aylon":25,"Fernandinho":35,"Matheus Bahia":23,"Marllon":27,"Nicolas":23,"Rafael Ramos":30,"Matheus Araújo":23,"Vinicius":22,"Richard":24},
  "corinthians": {"Hugo Souza":25,"Yuri Alberto":24,"Matheuzinho":23,"Breno Bidon":21,"Romero":34,"André Carrillo":33,"Raniele":28,"José Martínez":31,"Memphis Depay":31,"Matheus Bidu":25,"Talles Magno":23,"André Ramalho":33,"Maycon":27,"Fabrizio Angileri":31,"Gustavo Henrique":31,"Rodrigo Garro":26,"Charles":28,"Cacá":24,"João Pedro":24,"Félix Torres":28},
  "cruzeiro": {"Cássio":34,"Lucas Romero":31,"Fabrício Bruno":24,"Kaiki":22,"William":28,"Lucas Silva":29,"Walace":30,"Matheus Pereira":28,"Eduardo":25,"Kaio Jorge":23,"Gabigol":28,"Dante":41,"Marlon":30,"Fernando Henrique":24,"Lucas Villalba":22,"Araújo":25,"Giovani":22,"Cristian":24,"Rafael Cabral":34,"Matheus Pereira II":22},
  "flamengo": {"Rossi":29,"Léo Pereira":29,"Léo Ortiz":28,"Wesley":21,"Ayrton Lucas":27,"Pulgar":26,"De La Cruz":27,"Gerson":27,"Arrascaeta":30,"Pedro":28,"Bruno Henrique":34,"Léo Pereira II":23,"Pablo":33,"Plata":23,"Everton Cebolinha":28,"Lyanco":27,"Thiago Maia":27,"Matheus Cunha":22,"Filipe Luís":39,"Michael":24},
  "fluminense": {"Fábio":44,"Hércules":24,"Kevin Serna":23,"Martinelli":23,"Juan Freytes":25,"Agustín Canobbio":27,"Everaldo":30,"Samuel Xavier":34,"Germán Cano":37,"Renê":32,"Facundo Bernal":22,"Lima":29,"Thiago Silva":40,"Nonato":27,"Ignácio":25,"Guga":27,"Keno":35,"Jhon Arias":27,"Gabriel Fuentes":27,"PH Ganso":35},
  "fortaleza": {"João Ricardo":31,"Pikachu":28,"Breno Lopes":29,"Lucero":28,"Mancuso":29,"Lucas Sasha":29,"Gastón Ávila":28,"Brítez":31,"Deyverson":33,"Bareiro":29,"Pochettino":23,"Marinho":31,"Bruno Pacheco":28,"Martínez":28,"Tinga":24,"Marcelo Benevenuto":33,"Thiago Galhardo":32,"Moisés":25,"Kevyson":21,"Edinho":35},
  "gremio": {"Marchesín":36,"Tiago Volpi":33,"Dodi":31,"Edenilson":35,"Cristaldo":28,"Pavón":30,"Wagner Leonardo":27,"Alysson":24,"Cristian Olivera":25,"Aravena":22,"André Henrique":24,"Marlon":30,"Braithwaite":33,"Villasanti":27,"Balbuena":33,"Soteldo":27,"Arezo":23,"Jhonata Robert":25,"Rodrigues":28,"Arthur":23},
  "internacional": {"Rochet":32,"Anthoni":24,"Braian Aguirre":23,"Vitão":25,"Alexandro Bernabei":24,"Alan Patrick":33,"Thiago Maia":27,"Vitinho":24,"Bruno Henrique":34,"Rafael Borré":29,"Wesley":21,"Carbonero":24,"Bruno Tabata":28,"Ronaldo":29,"Victor Gabriel":22,"Valencia":35,"Mercado":37,"Fernando":37,"Bruno Gomes":22,"Rômulo":35},
  "juventude": {"Gustavo":28,"Jadson":34,"Ewerthon":27,"Batalla":28,"Giraldo":33,"Abner":25,"Mandaca":24,"Ênio":24,"Alan Ruschel":35,"Marcos Paulo":23,"Erick Farias":23,"Felipinho":21,"Taliari":27,"Adriano Martins":28,"Jean Carlos":26,"Giovanny":22,"Wilker Ángel":37,"Gilberto":33,"Nenê":43,"Moreschi":24},
  "mirassol": {"Walter":36,"Jemmes":28,"João Victor":28,"Reinaldo":32,"Lucas Ramon":24,"Daniel Borges":30,"Negueba":28,"Gabriel":26,"Danielzinho":27,"Chico Kim":24,"Iury Castilho":28,"Léo Gamalho":31,"Edson Carioca":27,"Igor Formiga":26,"Nathan Fogaça":24,"Matheus Davó":25,"Cristian Renato":28,"Guilherme Pato":28,"Yago":28,"Felipe":27},
  "palmeiras": {"Weverton":37,"Gustavo Gómez":31,"Murilo":27,"Piquerez":28,"Giay":19,"Aníbal Moreno":24,"Richard Ríos":24,"Raphael Veiga":30,"Emiliano Martínez":23,"Facundo Torres":24,"Estêvão":17,"Flaco López":24,"Vitor Roque":20,"Maurício":21,"Allan":28,"Felipe Anderson":32,"Vanderlan":23,"Bruno Fuchs":25,"Gabriel Menino":24,"Marcos Rocha":32},
  "red_bull_bragantino": {"Cleiton":28,"Jhon Jhon":21,"Eduardo Sasha":32,"Guzmán Rodríguez":21,"Pedro Henrique":24,"Gabriel":21,"Eric Faria":22,"Vinícius Tobias":20,"Helinho":24,"Alerrandro":24,"Lucas Evangelista":30,"Raul":22,"Mosquera":25,"Juninho Capixaba":27,"Henry Vargas":23,"Bruno Praxedes":24,"Luan Cândido":24,"Savio":21,"Aderlandio":30,"Wanderson":24},
  "santos": {"Gabriel Brazão":24,"Guilherme":22,"João Schmidt":29,"Zé Ivaldo":28,"Gonzalo Escobar":24,"Soteldo":27,"Diego Pituca":32,"Tomás Rincón":37,"Tiquinho Soares":34,"Neymar":33,"Luan Peres":30,"Thaciano":29,"Lautaro Díaz":26,"JP Chermont":19,"João Pedro":22,"Zé Rafael":30,"Evandro":38,"Igor Vinícius":28,"Matheus Nascimento":21,"Mendoza":30},
  "sao_paulo": {"Rafael":36,"Luciano":31,"Enzo Díaz":28,"Alisson":30,"Robert Arboleda":33,"Alan Franco":28,"André Silva":24,"Nahuel Ferraresi":26,"Cédric Soares":33,"Oscar":33,"Ferreira":28,"Lucas Moura":32,"Calleri":31,"Bobadilla":36,"Marcos Antônio":25,"Pablo Maia":23,"Aráoz":24,"Welington":23,"Júnior":21,"Ryan Francisco":20},
  "sport_recife": {"Caíque França":28,"Thiago Couto":24,"Ramon Menezes":24,"Matheus Alexandre":28,"Aderlan":29,"Rafael Thyere":30,"João Silva":24,"Chico":30,"Igor Cariús":28,"Christian Rivera":27,"Sérgio Oliveira":33,"Du Queiroz":25,"Lucas Lima":35,"Chrystian Barletta":24,"Lenny Lobato":23,"Pablo":28,"Carlos Alberto":34,"Carlos de Pena":31,"Zé Lucas":24,"Gonçalo Paciência":29},
  "vasco_da_gama": {"Léo Jardim":30,"João Victor":28,"Lucas Piton":24,"Pablo Vegetti":35,"Hugo Moura":26,"Paulo Henrique":21,"Philippe Coutinho":32,"Tchê Tchê":32,"Rayan":20,"Lucas Freitas":24,"Léo":28,"Hugo":26,"Payet":38,"Vegetti II":21,"Coutinho":22,"Maicon":36,"Marlon":30,"Garrido":22,"Léo Pereira":29,"Jorginho":21},
  "vitoria": {"Lucas Arcanjo":25,"Lucas Halter":25,"Ronald":29,"Gabriel Baralhas":24,"Matheuzinho":23,"Osvaldo":33,"Zé Marcos":25,"Raúl Cáceres":24,"Erick":25,"Renato Kayzer":27,"Aitor Cantalapiedra":29,"Janderson":24,"Gustavo Mosquito":28,"Wellington Rato":32,"Thiago Couto":24,"Edu":28,"Camutanga":27,"Ramon":27,"Willian Oliveira":24,"Carlinhos":24}
}

base = os.path.dirname(os.path.abspath(__file__))
for team, ages in AGES.items():
    path = os.path.join(base, f"{team}.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    for p in data["jogadores"]:
        name = p["nome"]
        if name in ages:
            p["idade"] = ages[name]
        else:
            print(f"WARN: {team} - {name} not found in ages dict")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Updated {team}: {len(data['jogadores'])} players")
