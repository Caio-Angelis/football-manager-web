"""
Baixa imagens de perfil de todos os jogadores da database via Wikipedia API.
Para jogadores sem foto na Wikipedia, gera um avatar SVG com as iniciais.

Uso (todos os times):
    python scripts/download_player_images.py

Uso (time especifico):
    python scripts/download_player_images.py --team flamengo

Uso (paralelo - 10 times simultaneos):
    python scripts/download_player_images.py --parallel 10
"""

import json
import glob
import os
import re
import sys
import time
import random
import subprocess
import urllib.request
import urllib.parse
import urllib.error

# Delay between API requests (seconds)
REQUEST_DELAY = 2.0
# Max retries on HTTP 429
MAX_RETRIES = 5
# User-Agent for Wikipedia API (search)
USER_AGENT = "FootballManagerWeb/1.0 (https://github.com/caioangelis/football-manager-web; contact@example.com)"
# User-Agent for image download (upload.wikimedia.org blocks custom UAs)
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

DB_DIR = r"c:\Users\caioa\Desktop\football-manager-web\DataBase jogadores"
OUTPUT_DIR = r"c:\Users\caioa\Desktop\football-manager-web\frontend\public\players"
MAPPING_DIR = os.path.join(OUTPUT_DIR, "_mappings")

# Wikipedia API endpoint (Portuguese)
WIKI_API = "https://pt.wikipedia.org/w/api.php"

# Team colors for fallback avatars
TEAM_COLORS = {
    "atletico_mineiro": "#000000",
    "bahia": "#00529F",
    "botafogo": "#000000",
    "ceara": "#000000",
    "corinthians": "#000000",
    "cruzeiro": "#1A4D9C",
    "flamengo": "#C8102E",
    "fluminense": "#7A0026",
    "fortaleza": "#003DA5",
    "gremio": "#0078C1",
    "internacional": "#C8102E",
    "juventude": "#00803C",
    "mirassol": "#FFD700",
    "palmeiras": "#006437",
    "red_bull_bragantino": "#E30613",
    "santos": "#000000",
    "sao_paulo": "#FE0000",
    "sport_recife": "#E30613",
    "vasco_da_gama": "#000000",
    "vitoria": "#E30613",
}


def slugify(name: str) -> str:
    """Converte nome do jogador em slug seguro para nome de arquivo."""
    slug = re.sub(r"[^\w\s-]", "", name.strip().lower())
    slug = re.sub(r"[\s_]+", "_", slug)
    slug = re.sub(r"-+", "_", slug)
    return slug.strip("_")


def get_initials(name: str) -> str:
    """Extrai iniciais do nome do jogador (max 2)."""
    parts = name.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    elif len(parts) == 1:
        return parts[0][:2].upper()
    return "??"


def generate_avatar_svg(name: str, team: str, filepath: str):
    """Gera um avatar SVG com as iniciais do jogador e cor do time."""
    initials = get_initials(name)
    bg_color = TEAM_COLORS.get(team, "#333333")

    # Determinar cor do texto (claro ou escuro) baseado no fundo
    bg_hex = bg_color.lstrip("#")
    r, g, b = int(bg_hex[0:2], 16), int(bg_hex[2:4], 16), int(bg_hex[4:6], 16)
    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    text_color = "#FFFFFF" if luminance < 0.5 else "#000000"

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="{bg_color}"/>
  <text x="100" y="105" font-family="Arial, sans-serif" font-size="72" font-weight="bold"
        fill="{text_color}" text-anchor="middle" dominant-baseline="middle">{initials}</text>
</svg>"""

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(svg)


def wiki_request(url: str) -> dict | None:
    """Faz request à Wikipedia com retry e backoff exponencial para HTTP 429."""
    for attempt in range(MAX_RETRIES):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = (2 ** attempt) + random.uniform(0.5, 1.5)
                print(f"  [429] esperando {wait:.1f}s (tentativa {attempt+1}/{MAX_RETRIES})...", end=" ", flush=True)
                time.sleep(wait)
                continue
            print(f"  [WARN] HTTP {e.code}", end=" ", flush=True)
            return None
        except (urllib.error.URLError, TimeoutError) as e:
            print(f"  [WARN] Erro de rede: {e}", end=" ", flush=True)
            time.sleep(2)
            continue
    print(f"  [FAIL] Max retries", end=" ", flush=True)
    return None


def search_wikipedia(player_name: str) -> dict | None:
    """
    Busca jogador na Wikipedia PT e retorna info da imagem se encontrada.
    Usa generator=search com prop=pageimages para obter imagem em uma chamada.
    """
    # Tenta varias buscas: nome + "futebolista", nome sozinho
    queries = [
        f"{player_name} futebolista",
        player_name,
    ]

    for query in queries:
        params = {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrsearch": query,
            "gsrlimit": "3",
            "prop": "pageimages",
            "piprop": "thumbnail",
            "pithumbsize": "300",
            "redirects": "1",
        }

        url = WIKI_API + "?" + urllib.parse.urlencode(params)
        data = wiki_request(url)

        if not data:
            time.sleep(REQUEST_DELAY)
            continue

        pages = data.get("query", {}).get("pages", {})
        if not pages:
            time.sleep(REQUEST_DELAY)
            continue

        # Ordenar paginas por indice de relevancia da busca
        sorted_pages = sorted(pages.values(), key=lambda p: p.get("index", 999))
        # Preferir paginas com "(futebolista)" no titulo
        sorted_pages.sort(key=lambda p: 0 if "futebolista" in p.get("title", "").lower() else 1)

        for page in sorted_pages:
            thumbnail = page.get("thumbnail", {})
            if thumbnail and thumbnail.get("source"):
                return {
                    "title": page.get("title", ""),
                    "image_url": thumbnail["source"],
                    "page_url": f"https://pt.wikipedia.org/?curid={page.get('pageid', '')}",
                }

        time.sleep(REQUEST_DELAY)

    return None


def download_image(url: str, filepath: str) -> bool:
    """Baixa uma imagem de URL para filepath com retry em 429."""
    headers = {
        "User-Agent": BROWSER_UA,
        "Accept": "image/*,*/*;q=0.8",
        "Referer": "https://pt.wikipedia.org/",
    }
    for attempt in range(MAX_RETRIES):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
                if len(data) < 100:
                    return False
                with open(filepath, "wb") as f:
                    f.write(data)
            return True
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = (2 ** attempt) + random.uniform(0.5, 1.5)
                time.sleep(wait)
                continue
            return False
        except (urllib.error.URLError, TimeoutError):
            time.sleep(2)
            continue
    return False


def process_team(team_name: str):
    """Processa um unico time: busca e baixa imagens de todos os jogadores."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(MAPPING_DIR, exist_ok=True)

    team_mapping_file = os.path.join(MAPPING_DIR, f"{team_name}.json")

    # Carregar mapeamento existente do time
    existing = {}
    if os.path.exists(team_mapping_file):
        with open(team_mapping_file, encoding="utf-8") as f:
            existing = json.load(f)

    # Carregar dados do time
    team_file = os.path.join(DB_DIR, f"{team_name}.json")
    if not os.path.exists(team_file):
        print(f"  [ERRO] Arquivo nao encontrado: {team_file}")
        return

    with open(team_file, encoding="utf-8") as f:
        data = json.load(f)

    team = data["time"]
    players = data["jogadores"]
    mapping = dict(existing)
    stats = {"found": 0, "fallback": 0, "skipped": 0}

    print(f"\n=== {team} ({len(players)} jogadores) ===")

    for i, player in enumerate(players, 1):
        name = player["nome"]
        slug = slugify(name)
        mapping_key = f"{team}/{name}"

        # Pular se ja processado e arquivo existe
        if mapping_key in existing:
            existing_file = existing[mapping_key]["file"]
            if os.path.exists(os.path.join(OUTPUT_DIR, existing_file)):
                mapping[mapping_key] = existing[mapping_key]
                stats["skipped"] += 1
                print(f"  [{i}/{len(players)}] {name} -> SKIP")
                continue

        print(f"  [{i}/{len(players)}] {name} -> ", end="", flush=True)

        result = search_wikipedia(name)

        if result:
            img_url = result["image_url"]
            ext = ".jpg"
            if ".png" in img_url:
                ext = ".png"
            elif ".svg" in img_url:
                ext = ".svg"
            elif ".webp" in img_url:
                ext = ".webp"

            filename = f"{slug}{ext}"
            filepath = os.path.join(OUTPUT_DIR, filename)

            if download_image(img_url, filepath):
                mapping[mapping_key] = {
                    "file": filename,
                    "source": "wikipedia",
                    "wiki_title": result["title"],
                    "wiki_url": result["page_url"],
                }
                stats["found"] += 1
                print(f"OK -> {filename}")
            else:
                filename = f"{slug}.svg"
                filepath = os.path.join(OUTPUT_DIR, filename)
                generate_avatar_svg(name, team, filepath)
                mapping[mapping_key] = {"file": filename, "source": "fallback"}
                stats["fallback"] += 1
                print(f"FALLBACK -> {filename}")
        else:
            filename = f"{slug}.svg"
            filepath = os.path.join(OUTPUT_DIR, filename)
            generate_avatar_svg(name, team, filepath)
            mapping[mapping_key] = {"file": filename, "source": "fallback"}
            stats["fallback"] += 1
            print(f"FALLBACK -> {filename}")

        time.sleep(REQUEST_DELAY)

    # Salvar mapeamento do time
    with open(team_mapping_file, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)

    print(f"  [{team}] found={stats['found']} fallback={stats['fallback']} skipped={stats['skipped']}")
    return stats


def merge_mappings():
    """Junta todos os mapeamentos por time em um unico player_images.json."""
    merged = {}
    if not os.path.exists(MAPPING_DIR):
        return merged

    for mf in glob.glob(os.path.join(MAPPING_DIR, "*.json")):
        with open(mf, encoding="utf-8") as f:
            merged.update(json.load(f))

    final_file = os.path.join(OUTPUT_DIR, "player_images.json")
    with open(final_file, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    return merged


def run_parallel(num_workers: int):
    """Lanca N processos em paralelo, cada um processando um time."""
    json_files = sorted(glob.glob(os.path.join(DB_DIR, "*.json")))
    teams = [os.path.basename(f).replace(".json", "") for f in json_files]

    print(f"Modo paralelo: {len(teams)} times, {num_workers} workers simultaneos\n")

    script_path = os.path.abspath(__file__)
    processes = []
    team_queue = list(teams)
    completed = 0

    while team_queue or processes:
        # Preencher slots vazios
        while team_queue and len(processes) < num_workers:
            team = team_queue.pop(0)
            print(f">>> Iniciando: {team}")
            p = subprocess.Popen(
                [sys.executable, script_path, "--team", team],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
            processes.append((team, p))

        # Verificar processos concluidos
        still_running = []
        for team, p in processes:
            if p.poll() is not None:
                completed += 1
                output = p.stdout.read() if p.stdout else ""
                # Mostrar apenas as ultimas linhas (resumo)
                lines = output.strip().split("\n")
                summary_lines = [l for l in lines if "found=" or "===" in l]
                print(f"<<< Concluido ({completed}/{len(teams)}): {team}")
                for l in lines[-3:]:
                    print(f"    {l}")
            else:
                still_running.append((team, p))

        processes = still_running
        if processes:
            time.sleep(2)

    # Juntar mapeamentos
    print("\n>>> Juntando mapeamentos...")
    merged = merge_mappings()
    found = sum(1 for v in merged.values() if v.get("source") == "wikipedia")
    fallback = sum(1 for v in merged.values() if v.get("source") == "fallback")
    print(f"\n{'='*60}")
    print(f"RESUMO FINAL:")
    print(f"  Fotos reais (Wikipedia): {found}")
    print(f"  Avatares de fallback:     {fallback}")
    print(f"  Total:                    {len(merged)}")
    print(f"  Mapeamento:               {os.path.join(OUTPUT_DIR, 'player_images.json')}")


def main():
    args = sys.argv[1:]

    if "--parallel" in args:
        idx = args.index("--parallel")
        num_workers = int(args[idx + 1]) if idx + 1 < len(args) else 10
        run_parallel(num_workers)
    elif "--team" in args:
        idx = args.index("--team")
        team = args[idx + 1]
        process_team(team)
    else:
        # Modo sequencial (todos os times)
        json_files = sorted(glob.glob(os.path.join(DB_DIR, "*.json")))
        teams = [os.path.basename(f).replace(".json", "") for f in json_files]
        for team in teams:
            process_team(team)
        print("\n>>> Juntando mapeamentos...")
        merged = merge_mappings()
        found = sum(1 for v in merged.values() if v.get("source") == "wikipedia")
        fallback = sum(1 for v in merged.values() if v.get("source") == "fallback")
        print(f"\n{'='*60}")
        print(f"RESUMO FINAL:")
        print(f"  Fotos reais (Wikipedia): {found}")
        print(f"  Avatares de fallback:     {fallback}")
        print(f"  Total:                    {len(merged)}")
        print(f"  Mapeamento:               {os.path.join(OUTPUT_DIR, 'player_images.json')}")


if __name__ == "__main__":
    main()
