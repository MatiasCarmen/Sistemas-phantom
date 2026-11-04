#!/usr/bin/env bash
# Pruebas de concepto (PoC) de los hallazgos OWASP Top 10 sobre la API.
# No son destructivas: cada prueba solo verifica el código HTTP / cabeceras devueltas.
#
# Uso:  bash docs/seguridad/pruebas/poc-owasp.sh [BASE_URL]
# Variables opcionales:
#   COLLAB_USER / COLLAB_PASS  credenciales de un usuario NO administrador (prueba de 403).
#                              En la línea base (antes) se usó mgarcia / carlos123.
#   OLD_JWT_SECRET             secreto filtrado en el README original (prueba de JWT falsificado)

BASE="${1:-http://localhost:3000}/api"
COLLAB_USER="${COLLAB_USER:-mgarcia}"
COLLAB_PASS="${COLLAB_PASS:-Ventas.Phantom2026}"
OLD_JWT_SECRET="${OLD_JWT_SECRET:-phantom_erp_hmac_secret_key_2026_secure}"

pass=0
fail=0

check() {
  # check <owasp> <descripción> <resultado_seguro(true/false)> <detalle>
  if [ "$3" = "true" ]; then
    printf '  [PROTEGIDO]  %-4s %s (%s)\n' "$1" "$2" "$4"
    pass=$((pass + 1))
  else
    printf '  [VULNERABLE] %-4s %s (%s)\n' "$1" "$2" "$4"
    fail=$((fail + 1))
  fi
}

status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
is401() { [ "$1" = "401" ] && echo true || echo false; }

echo "== PoC OWASP Top 10 contra $BASE =="

echo "-- A01 Control de acceso (peticiones SIN token) --"
for route in "GET /system/raw-db" "GET /system/export" "GET /system/sql-export" "GET /users" "GET /products" "GET /sales" "GET /settings"; do
  set -- $route
  code=$(status -X "$1" "$BASE$2")
  check A01 "$1 $2 sin autenticación" "$(is401 "$code")" "HTTP $code"
done
code=$(status -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/system/import")
check A01 "POST /system/import sin autenticación" "$(is401 "$code")" "HTTP $code"
code=$(status -X PUT -H 'Content-Type: application/json' -d '{"role":"admin"}' "$BASE/users/usuario-inexistente")
check A01 "PUT /users/:id (escalar a admin) sin autenticación" "$(is401 "$code")" "HTTP $code"
code=$(status -X PUT -H 'Content-Type: application/json' -d '{}' "$BASE/settings")
check A01 "PUT /settings sin autenticación" "$(is401 "$code")" "HTTP $code"

echo "-- A07 Fallos de autenticación --"
code=$(status -H 'Authorization: Bearer token_usr-admin_1' "$BASE/audit/logs")
check A07 "Token legacy sin firma (token_usr-admin_1) rechazado" "$(is401 "$code")" "HTTP $code"

forged=$(OLD_JWT_SECRET="$OLD_JWT_SECRET" node -e '
const c=require("crypto");const b=s=>Buffer.from(s).toString("base64url");
const now=Math.floor(Date.now()/1000);
const h=b(JSON.stringify({alg:"HS256",typ:"JWT"}));
const p=b(JSON.stringify({sub:"usr-admin",username:"jperez",role:"admin",iat:now,exp:now+3600}));
const s=c.createHmac("sha256",process.env.OLD_JWT_SECRET).update(h+"."+p).digest("base64url");
console.log(h+"."+p+"."+s)')
code=$(status -H "Authorization: Bearer $forged" "$BASE/audit/logs")
check A04 "JWT falsificado con el secreto publicado en el README" "$(is401 "$code")" "HTTP $code"

collab_token=$(curl -s -H 'Content-Type: application/json' \
  -d "{\"username\":\"$COLLAB_USER\",\"password\":\"$COLLAB_PASS\"}" "$BASE/auth/login" |
  node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{console.log(JSON.parse(d).token||"")}catch{console.log("")}})')
if [ -n "$collab_token" ]; then
  code=$(status -H "Authorization: Bearer $collab_token" "$BASE/users")
  check A01 "Colaborador NO puede listar usuarios (GET /users)" "$([ "$code" = 403 ] && echo true || echo false)" "HTTP $code"
  code=$(status -H "Authorization: Bearer $collab_token" "$BASE/system/raw-db")
  check A01 "Colaborador NO puede volcar la BD (GET /system/raw-db)" "$([ "$code" = 403 ] && echo true || echo false)" "HTTP $code"
  code=$(status -X PUT -H "Authorization: Bearer $collab_token" -H 'Content-Type: application/json' \
    -d '{"role":"collaborator"}' "$BASE/users/usr-vendedor-1")
  check A01 "Colaborador NO puede modificar usuarios (PUT /users/:id)" "$([ "$code" = 403 ] && echo true || echo false)" "HTTP $code"
else
  echo "  (omitido) no se pudo iniciar sesión como $COLLAB_USER para las pruebas de rol"
fi

msg_user=$(curl -s -H 'Content-Type: application/json' -d '{"username":"no_existe_xyz","password":"x"}' "$BASE/auth/login")
msg_pass=$(curl -s -H 'Content-Type: application/json' -d "{\"username\":\"$COLLAB_USER\",\"password\":\"incorrecta\"}" "$BASE/auth/login")
check A07 "Login no revela si el usuario existe" "$([ "$msg_user" = "$msg_pass" ] && echo true || echo false)" "mensajes $([ "$msg_user" = "$msg_pass" ] && echo iguales || echo distintos)"

limited=false
for _ in $(seq 1 15); do
  code=$(status -H 'Content-Type: application/json' -d '{"username":"fuerza_bruta","password":"x"}' "$BASE/auth/login")
  [ "$code" = "429" ] && limited=true && break
done
check A07 "Rate limiting en /auth/login (15 intentos)" "$limited" "último HTTP $code"

echo "-- A02 Configuración de seguridad --"
acao=$(curl -s -D - -o /dev/null -H 'Origin: https://atacante.example' "$BASE/health" | tr -d '\r' | grep -i '^access-control-allow-origin:' | cut -d' ' -f2)
check A02 "CORS no refleja orígenes arbitrarios" "$([ "$acao" != "https://atacante.example" ] && echo true || echo false)" "ACAO=${acao:-ninguno}"
headers=$(curl -s -D - -o /dev/null "$BASE/health" | tr -d '\r')
echo "$headers" | grep -qi '^x-content-type-options: nosniff' && h=true || h=false
check A02 "Cabecera X-Content-Type-Options: nosniff" "$h" ""
echo "$headers" | grep -qi '^x-powered-by' && h=false || h=true
check A02 "Sin cabecera X-Powered-By" "$h" ""
code=$(head -c 2000000 /dev/zero | tr '\0' 'a' | sed 's/^/{"x":"/;s/$/"}/' | status -H 'Content-Type: application/json' --data-binary @- "$BASE/auth/login")
check A02 "Rechaza cuerpos de 2 MB (límite de tamaño)" "$([ "$code" = 413 ] && echo true || echo false)" "HTTP $code"

echo "-- A10 Manejo de condiciones excepcionales --"
body=$(curl -s -H 'Content-Type: application/json' -d '{"username":' "$BASE/auth/login")
echo "$body" | grep -qiE 'unexpected|JSON at position|SyntaxError|stack' && h=false || h=true
check A10 "JSON malformado no filtra detalles internos" "$h" "$(echo "$body" | head -c 90)"

echo
echo "Resultado: $pass protegidos, $fail vulnerables"
