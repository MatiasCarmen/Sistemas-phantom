# Auditoría e integración de seguridad OWASP — SGICOP Phantom

Fecha de auditoría: 2026-11-04  
Repositorio: `MatiasCarmen/Sistemas-phantom`

## Alcance y estado de la integración

Se auditaron `main` (`5491f8d`) y `origin/OWASP` (`707fdf2`). La rama OWASP fue
identificada inequívocamente mediante `git ls-remote --heads origin`.

**No se fusionó `origin/OWASP`, no se hizo push y no se desplegó a producción.**
La integración permanece pendiente porque el proyecto tenía controles críticos
incompletos. Se aplicaron únicamente correcciones críticas autorizadas sobre
`main`.

## Arquitectura encontrada

- Frontend React 19 + Vite + TypeScript + Tailwind.
- Backend Express + TypeScript.
- Persistencia MongoDB con fallback local JSON.
- API REST bajo `/api`.
- Autenticación JWT HMAC-SHA256 y contraseñas con scrypt.
- Módulos funcionales: inventario, Kardex, cotizaciones, ventas/POS,
  clientes, proveedores, tiendas, usuarios, auditoría y exportación.

Evidencia principal: `README.md`, `backend/src/routes.ts`,
`backend/src/dataStore.ts`, `backend/src/mongo.ts` y `frontend/src/App.tsx`.

## Comparación de ramas

`origin/OWASP` incorpora:

- `backend/src/middlewares/auth.ts`: autenticación, permisos y rol admin.
- `backend/src/middlewares/loginProtection.ts`: rate limiting y bloqueo por cuenta.
- `backend/src/validation.ts`: validación Zod.
- `backend/src/pricing.ts`: recálculo de precios en servidor.
- `backend/src/sqlEscape.ts`: escape para exportaciones SQL.
- Helmet, CORS allowlist y límites de cuerpo.
- Dependabot, scripts de auditoría/SBOM y pruebas API.
- Evidencias históricas de PoC, `npm audit` y ZAP baseline.

Riesgos de integración:

1. La rama OWASP modifica ampliamente `routes.ts`, `dataStore.ts` y múltiples
   componentes funcionales.
2. Elimina `backend/data/db.json` y `backend/data/audit.json`; esto cambia la
   experiencia de datos demo y debe migrarse de forma controlada.
3. Elimina `@google/genai`; debe verificarse que no exista uso funcional antes
   de conservar esa eliminación.
4. Las evidencias ZAP y `npm audit` están versionadas, pero no fueron
   regeneradas durante esta auditoría; se consideran evidencia histórica, no
   una ejecución nueva.
5. La rama contiene contraseñas de demostración en semillas/pruebas y el
   historial de Git conserva datos antiguos. No se verificaron credenciales
   reales, pero debe mantenerse la separación entre datos académicos y secretos.

## Auditoría de controles

| Control | Estado después de los cambios | Evidencia |
|---|---|---|
| Autenticación por defecto de API | Parcialmente implementado | `backend/src/routes.ts`, middleware global salvo health, login y settings público |
| Autorización administrativa de usuarios/sistema | Implementado para esas rutas | `requireAdmin` en `backend/src/routes.ts` |
| JWT firmado | Implementado | `backend/src/security.ts` |
| Expiración JWT | Implementado para JWT estándar | Validación obligatoria de `exp` en `backend/src/security.ts` |
| Tokens legacy | Corregido | Se eliminó la aceptación de `token_<userId>_<timestamp>` |
| Secreto JWT por defecto | Corregido | `JWT_SECRET` obligatorio, mínimo 32 caracteres |
| Contraseñas | Parcial | Existe scrypt, pero permanecen compatibilidades/datos demo heredados |
| Validación de entradas | Parcial | Validaciones puntuales; la validación Zod de OWASP todavía no está integrada |
| CORS | Parcialmente corregido | Solo se refleja el origen configurado |
| Cabeceras Helmet/CSP | Ausente en `main` | Disponible en `origin/OWASP`, aún no integrado |
| Rate limiting de login | Ausente en `main` | Disponible en `origin/OWASP`, aún no integrado |
| Auditoría | Implementado parcial | `backend/src/audit.ts`; falta integrar eventos de seguridad y cadena HMAC OWASP |
| Inyección/XSS | No completamente verificable | No se ejecutó ZAP nuevo ni se integraron todos los validadores |
| Gestión de sesiones/revocación | Parcial | JWT en `localStorage`, sin revocación server-side en `main` |

## Cambios realizados

1. `backend/src/routes.ts`
   - Denegación por defecto para endpoints no públicos.
   - `health`, login y lectura de settings permanecen públicos para conservar
     el arranque y branding del login.
   - Usuarios y operaciones de sistema requieren administrador.

2. `backend/src/security.ts`
   - Eliminación del bypass de tokens legacy.
   - Validación del algoritmo HS256.
   - Expiración JWT obligatoria.
   - Eliminación del secreto embebido.

3. `backend/src/server.ts`
   - El servidor falla al iniciar si `JWT_SECRET` no está configurado o es débil.

4. `backend/src/app.ts`
   - CORS ya no refleja orígenes arbitrarios.

5. `backend/.env.example`
   - Se documenta `JWT_SECRET` como variable requerida.

6. `backend/src/api-security.test.mjs`
   - Se agregaron pruebas HTTP para endpoints sensibles y CORS.

No se creó commit ni rama temporal de integración.

## Validación ejecutada

Resultados reales en el estado modificado de `main`:

```text
npm test
6 tests passed, 0 failed

npm run lint
frontend: passed
backend: passed

npm run build
backend: passed
frontend: passed
```

Las pruebas nuevas verifican:

- `/api/health` público.
- Productos, usuarios y exportación de base de datos rechazan solicitudes sin
  autenticación.
- Orígenes CORS no autorizados no reciben `Access-Control-Allow-Origin`.

No se ejecutó ZAP durante esta sesión. No se ejecutó un escaneo activo contra
producción. Las evidencias ZAP almacenadas en `origin/OWASP` son resultados
versionados de esa rama y deben reproducirse en un entorno local autorizado
antes de presentarlas como validación final.

## Evidencias para APF3

- Control de acceso: `backend/src/routes.ts`.
- JWT y contraseñas: `backend/src/security.ts`.
- Auditoría: `backend/src/audit.ts`.
- Pruebas automatizadas: `backend/src/*test.mjs`.
- Dependencias y versiones: `package.json`, `backend/package.json`,
  `frontend/package.json`.
- Evidencia OWASP preparada: `origin/OWASP/docs/seguridad/`.
- Control de cambios: commits `5491f8d`, `32c03b1`, `fd17d00` y
  `707fdf2`.

## Plan de integración seguro

### Prioridad 1 — completar hardening antes de fusionar

1. Integrar y revisar `auth.ts` y `loginProtection.ts`.
2. Integrar validación Zod por ruta sin reemplazar lógica funcional.
3. Integrar Helmet y cabeceras manteniendo el proxy Vite.
4. Resolver migración segura de `db.json`, auditoría y credenciales demo.
5. Verificar la eliminación de `@google/genai` mediante búsqueda de usos.

### Prioridad 2 — pruebas de regresión

1. Ejecutar pruebas de login, roles, inventario, Kardex, cotización, PDF y POS.
2. Ejecutar las pruebas API OWASP.
3. Ejecutar `npm run lint`, `npm test` y `npm run build`.
4. Ejecutar `npm audit`/SBOM y ZAP baseline únicamente contra localhost.

### Prioridad 3 — integración controlada

1. Confirmar nuevamente el worktree limpio.
2. Crear `integration/apf3-owasp` desde `main` actualizado.
3. Incorporar cambios por grupos pequeños y revisar cada diff.
4. No fusionar, hacer push ni desplegar sin aprobación explícita.

## Pendientes y recomendaciones

- Integrar autorización granular por permisos, no solo protección de usuarios.
- Eliminar contraseñas demo de archivos versionados y rotar cualquier secreto
  que haya sido real.
- Añadir rate limiting, Helmet, validación Zod y revocación de sesiones.
- Añadir pruebas de autorización para cada módulo funcional.
- Añadir CI para lint, pruebas, build, `npm audit` y SBOM.
- Reproducir ZAP baseline en un entorno local y conservar el reporte generado.
