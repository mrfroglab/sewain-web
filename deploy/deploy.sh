#!/usr/bin/env bash
# Pasang / perbarui stack Sewain di server ini: /opt/stacks/apps/sewain (db + api + web, Caddy, jaringan gateway-net).
# Idempoten. Deploy rutin lewat CI/CD (push ke main di sewain-api / sewain-web); skrip ini untuk setup awal atau darurat.
# Isi skrip ini sama di sewain-api/deploy dan sewain-web/deploy.
#
#   deploy/deploy.sh                 # pakai image terbaru dari GHCR
#   BUILD_LOCAL=1 deploy/deploy.sh   # build image dari source lokal (folder sewain-api & sewain-web bersebelahan)
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$(cd "$SRC/.." && pwd)"
STACK=/opt/stacks/apps/sewain
CADDYFILE=/opt/stacks/reverse-proxy/Caddyfile
HOST="${HOST:-sewain.hallojanu.me}"

mkdir -p "$STACK/data/postgres" "$STACK/data/uploads"
# Container API berjalan sebagai user distroless "nonroot" (uid 65532).
sudo -n chown 65532:65532 "$STACK/data/uploads" 2>/dev/null || chmod 777 "$STACK/data/uploads"

# --- .env: rahasia dibuat sekali, disimpan di server (izin 600) ---
touch "$STACK/.env"; chmod 600 "$STACK/.env"
grep -q '^DB_PASSWORD=.' "$STACK/.env" || printf 'DB_PASSWORD=%s\n' "$(head -c 64 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)" >> "$STACK/.env"

cp "$SRC/deploy/docker-compose.yml" "$STACK/docker-compose.yml"
cd "$STACK"

if [ "${BUILD_LOCAL:-0}" = 1 ]; then
  echo "› Build image lokal"
  docker build -q -t ghcr.io/mrfroglab/sewain-api:latest "$ROOT/sewain-api" >/dev/null
  docker build -q --build-arg "NEXT_PUBLIC_SITE_URL=https://$HOST" -t ghcr.io/mrfroglab/sewain-web:latest "$ROOT/sewain-web" >/dev/null
else
  echo "› Tarik image dari GHCR"
  docker compose pull api web
fi
docker compose up -d --remove-orphans

# --- Rute Caddy: /api/* → sewain-api, sisanya → sewain-web. Diedit di tempat agar inode Caddyfile tetap ---
cp "$CADDYFILE" "$CADDYFILE.bak"
SITE_HOST="$HOST" python3 - "$CADDYFILE" <<'PY'
import os, re, sys
path, host = sys.argv[1], os.environ["SITE_HOST"]
block = f"""# BEGIN sewain (dikelola deploy/deploy.sh di sewain-api dan sewain-web)
http://{host} {{
	encode zstd gzip
	header {{
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		Permissions-Policy "camera=(self), geolocation=(self), microphone=()"
		-Server
	}}
	handle /api/* {{
		reverse_proxy sewain-api:8080 {{
			header_up X-Forwarded-For {{http.request.header.CF-Connecting-IP}}
		}}
	}}
	handle {{
		reverse_proxy sewain-web:3000 {{
			header_up X-Forwarded-For {{http.request.header.CF-Connecting-IP}}
		}}
	}}
}}
# END sewain"""
src = open(path).read()
pattern = re.compile(r"# BEGIN sewain .*?# END sewain", re.S)
src = pattern.sub(block, src) if pattern.search(src) else src.rstrip() + "\n\n" + block + "\n"
with open(path, "r+") as f:
    f.seek(0); f.write(src); f.truncate()
PY
if ! docker exec caddy-proxy caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1; then
  echo "Caddyfile tidak valid, mengembalikan cadangan." >&2
  cat "$CADDYFILE.bak" > "$CADDYFILE"; exit 1
fi
docker exec caddy-proxy caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1

echo "› Menunggu layanan sehat…"
for _ in $(seq 1 60); do
  a="$(docker inspect -f '{{.State.Health.Status}}' sewain-api 2>/dev/null || true)"
  w="$(docker inspect -f '{{.State.Health.Status}}' sewain-web 2>/dev/null || true)"
  [ "$a" = healthy ] && [ "$w" = healthy ] && break; sleep 3
done
docker compose ps --format 'table {{.Name}}\t{{.Status}}'
echo "Selesai: https://$HOST"
