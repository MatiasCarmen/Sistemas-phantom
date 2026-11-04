#!/usr/bin/env bash
# Escaneo pasivo OWASP ZAP (baseline) del frontend y de la API.
# Requiere Docker y la app corriendo (npm run dev).
#
# Uso:  bash docs/seguridad/pruebas/zap-baseline.sh <etiqueta> [url_frontend]
#   ej. antes / despues (dev en :5173) o despues-produccion http://localhost:4173 (npx vite preview)

set -u
label="${1:-scan}"
out="$(cd "$(dirname "$0")/../evidencias" && pwd)"
image="ghcr.io/zaproxy/zaproxy:stable"

chmod 777 "$out"
scan() {
  local name="$1" target="$2"
  docker run --rm --network host -v "$out":/zap/wrk:rw "$image" zap-baseline.py \
    -t "$target" -r "zap-$label-$name.html" -J "zap-$label-$name.json" -m 2 -I \
    > "$out/zap-$label-$name.log" 2>&1
  echo "== $name ($target) =="
  grep -E '^WARN-NEW|^FAIL-NEW' "$out/zap-$label-$name.log"
}
scan frontend "${2:-http://localhost:5173}"
scan api "http://localhost:3000/api/products"
chmod 755 "$out"
