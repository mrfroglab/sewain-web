#!/usr/bin/env bash
# Pasang / perbarui stack Sewain di server ini: /opt/stacks/apps/sewain (Docker + Caddy, jaringan gateway-net).
# Idempoten. Deploy rutin berjalan lewat CI/CD (push ke main); skrip ini untuk setup awal atau darurat.
#
#   deploy/deploy.sh            # pakai image terbaru dari GHCR
#   BUILD_LOCAL=1 deploy/deploy.sh   # build image dari source lokal (tanpa GHCR)
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK=/opt/stacks/apps/sewain
CADDYFILE=/opt/stacks/reverse-proxy/Caddyfile
HOST="${HOST:-sewain.hallojanu.me}"

mkdir -p "$STACK"
cp "$SRC/deploy/docker-compose.yml" "$STACK/docker-compose.yml"

if [ "${BUILD_LOCAL:-0}" = 1 ]; then
  echo "› Build image lokal"
  docker build -q --build-arg "NEXT_PUBLIC_SITE_URL=https://$HOST" -t ghcr.io/mrfroglab/sewain-web:latest "$SRC" >/dev/null
else
  echo "› Tarik image dari GHCR"
  docker compose -f "$STACK/docker-compose.yml" pull web
fi
docker compose -f "$STACK/docker-compose.yml" up -d --remove-orphans

# --- Rute Caddy: blok dikelola skrip ini, diedit di tempat agar inode Caddyfile tetap ---
cp "$CADDYFILE" "$CADDYFILE.bak"
SITE_HOST="$HOST" python3 - "$CADDYFILE" <<'PY'
import os, re, sys
path, host = sys.argv[1], os.environ["SITE_HOST"]
block = f"""# BEGIN sewain (dikelola sewain-web/deploy/deploy.sh)
http://{host} {{
	encode zstd gzip
	header {{
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		Permissions-Policy "camera=(self), geolocation=(self), microphone=()"
		-Server
	}}
	reverse_proxy sewain-web:3000 {{
		header_up X-Forwarded-For {{http.request.header.CF-Connecting-IP}}
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

echo "› Menunggu container sehat…"
for _ in $(seq 1 40); do
  s="$(docker inspect -f '{{.State.Health.Status}}' sewain-web 2>/dev/null || true)"
  [ "$s" = healthy ] && break; sleep 3
done
docker compose -f "$STACK/docker-compose.yml" ps --format 'table {{.Name}}\t{{.Status}}'
echo "Selesai: https://$HOST"
