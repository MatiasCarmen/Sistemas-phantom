# Informe de Seguridad – Aplicación de OWASP Top 10 (2025) en Sistemas Phantom

**Curso:** Integrador II: Sistemas — Sesiones 13 y 14 (Gestión de Seguridad de la Información)
**Sistema:** Sistemas Phantom – ERP/WMS de inventario, cotizaciones y ventas
**Rama de trabajo:** `feat/owasp`
**Fecha:** 18/10/2026

Este informe sigue las 7 etapas de implementación de un SGSI vistas en clase y usa el **OWASP Top 10 (2025)** como catálogo de riesgos. Las evidencias (antes / después) están en [`evidencias/`](evidencias/) y los scripts que las generan en [`pruebas/`](pruebas/).

## Resumen de resultados

| Indicador | Antes | Después |
|---|---|---|
| Pruebas de concepto (PoC) de explotación protegidas | **0 / 22** | **22 / 22** |
| Vulnerabilidades en dependencias (`npm audit`) | 6 (1 crítica, 1 alta, 3 moderadas, 1 baja) | **0** |
| Alertas ZAP – API | 4 WARN | 1 WARN (informativa) |
| Alertas ZAP – Frontend (desarrollo) | 8 WARN | 5 WARN (propias del modo desarrollo) |
| Alertas ZAP con resultado FAIL | 0 | 0 |
| Pruebas automatizadas | 4 | **22** (13 unitarias + 9 de integración HTTP) |

> **Importante:** ZAP en modo *baseline* (pasivo) **no detectó** los fallos más graves (API sin autenticación, tokens falsificables, escalamiento de privilegios), porque una respuesta `200 OK` le parece normal. Esos fallos se detectaron con revisión de código y con las PoC de `pruebas/poc-owasp.sh`. Un escáner automático no reemplaza la revisión manual.

---

## Etapa 1 – Definición del alcance

**Dentro del alcance**
- Backend API REST (Node.js + Express + TypeScript): autenticación, autorización, validación, persistencia (MongoDB con respaldo local en JSON), bitácora de auditoría y exportaciones (JSON/SQL).
- Frontend SPA (React + Vite): manejo de sesión, cabeceras de seguridad, descargas y exportación CSV.
- Dependencias de terceros (npm) y configuración (`.env`, CORS, cabeceras).

**Fuera del alcance**
- Infraestructura de despliegue (servidor, proxy inverso, certificados TLS, firewall). Se documentan los requisitos en la Etapa 4 (A04).
- El inicio de sesión con "Google Workspace" de la pantalla de login: es un botón **decorativo** sin integración real.

## Etapa 2 – Inventario de activos

Valoración de 1 (bajo) a 3 (alto) en Confidencialidad (C), Integridad (I) y Disponibilidad (D).

| Activo | Tipo | Ubicación | C | I | D |
|---|---|---|---|---|---|
| Credenciales de usuarios (hashes scrypt) | Dato | colección `users` / `data/db.json` | 3 | 3 | 2 |
| Secreto de firma JWT (`JWT_SECRET`) | Secreto | `backend/.env` | 3 | 3 | 3 |
| Ventas, comprobantes y Kardex valorizado | Dato | `sales`, `inventory_movements` | 2 | 3 | 3 |
| Catálogo, precios de venta y **costos** | Dato | `products` | 3 | 3 | 2 |
| Clientes y proveedores (RUC/DNI, correos, teléfonos) | Dato personal | `customers`, `suppliers` | 3 | 2 | 2 |
| Bitácora de auditoría | Dato | `audit_logs` / `data/audit.json` | 2 | 3 | 2 |
| Respaldos (JSON / SQL) | Dato | descargas y `data/backups/` | 3 | 3 | 2 |
| API REST | Servicio | `backend/src/routes.ts` | – | 3 | 3 |
| Dependencias npm | Software | `package-lock.json` | – | 3 | 2 |

## Etapa 3 – Identificación y evaluación de riesgos

Nivel = Probabilidad × Impacto (Bajo / Medio / Alto). El **riesgo residual** es el que queda después de aplicar los controles de la Etapa 4.

| # | Riesgo encontrado | OWASP | Prob. | Impacto | Nivel inicial | Residual |
|---|---|---|---|---|---|---|
| R1 | Casi todos los endpoints (usuarios, volcado de BD, importar/reiniciar BD, configuración) funcionaban **sin autenticación** | A01 | Alta | Alto | **Alto** | Bajo |
| R2 | Un token sin firma `token_<id>` permitía entrar como cualquier usuario (incluido el admin) | A07 | Alta | Alto | **Alto** | Bajo |
| R3 | `JWT_SECRET` por defecto en el código y publicado en el README: cualquiera podía firmar tokens de admin | A04/A02 | Alta | Alto | **Alto** | Bajo |
| R4 | `db.json` versionado con contraseñas en texto plano (`admin/admin`); contraseña por defecto `123456` | A04/A07 | Alta | Alto | **Alto** | Bajo* |
| R5 | Escalamiento de privilegios: `PUT /users/:id` aceptaba `role: admin` de cualquiera; asignación masiva de campos | A01 | Alta | Alto | **Alto** | Bajo |
| R6 | `verifyPassword` devolvía `true` si el usuario no tenía contraseña (falla abierto) | A07/A10 | Media | Alto | **Alto** | Bajo |
| R7 | CORS reflejaba cualquier origen con credenciales; sin cabeceras de seguridad; cuerpo de 10 MB | A02 | Media | Medio | Medio | Bajo |
| R8 | Precios, totales y vendedor tomados del navegador: cantidades negativas aumentaban el stock y se podía vender a S/ 0.01 | A06/A08 | Media | Alto | **Alto** | Bajo |
| R9 | Inyección SQL en los scripts exportados (valores sin escapar) e inyección de fórmulas en el CSV del Kardex | A05 | Media | Medio | Medio | Bajo |
| R10 | Restauración de respaldo sin validar estructura ni copia previa | A08 | Baja | Alto | Medio | Bajo |
| R11 | Login sin límite de intentos y con mensajes que revelaban si el usuario existía; logout sin efecto en el servidor | A07 | Alta | Medio | **Alto** | Bajo |
| R12 | Sin registro de logins, fallos ni accesos denegados; bitácora modificable sin detección | A09 | Media | Medio | Medio | Bajo |
| R13 | Errores internos (`error.message`) devueltos al cliente | A10 | Media | Bajo | Bajo | Bajo |
| R14 | 6 vulnerabilidades conocidas en dependencias (1 crítica) y un paquete sin uso (`@google/genai`) | A03 | Media | Medio | Medio | Bajo |

\* El archivo `db.json` se retiró del repositorio, pero **sigue en el historial de git** con las contraseñas antiguas. Las contraseñas de demostración se cambiaron, así que las del historial ya no sirven. Ver Riesgos residuales.

## Etapa 4 – Controles implementados (OWASP Top 10 2025)

### A01 – Control de acceso deficiente
- **Denegación por defecto:** `router.use(authenticate)` exige JWT en toda la API salvo `/health`, `/auth/login` y `/settings/public` (solo el nombre de la empresa, para la pantalla de login). → `backend/src/middlewares/auth.ts`, `backend/src/routes.ts`
- **Permisos verificados en el servidor en cada petición:** `requirePermission('canManageInventory' | 'canManageSales' | 'canDeleteRecords' | …)` y `requireAdmin` para usuarios, respaldos, exportaciones y bitácora. El usuario y su rol se leen de la BD en cada petición, nunca del token ni del navegador.
- **Protección de privilegios:** no se puede quitar el rol ni desactivar al último administrador activo, ni eliminar la propia cuenta.
- **Selector de rol solo para administradores:** la "Vista previa por rol" se muestra únicamente si el rol **validado por el servidor** es `admin`. Solo cambia la interfaz: el backend sigue autorizando con el rol real. → `frontend/src/App.tsx`, `frontend/src/components/Header.tsx`
- **Descargas protegidas:** los respaldos JSON/SQL se descargan con `fetch` + token (antes eran enlaces `<a href>` públicos). → `frontend/src/lib/api.ts`
- Los volcados de la BD para el explorador ya no incluyen hashes de contraseña.

### A02 – Configuración de seguridad incorrecta
- **CORS con lista blanca** (`FRONTEND_URL`, admite varios orígenes separados por coma) y sin `Allow-Credentials` (la API usa Bearer, no cookies). → `backend/src/app.ts`
- **Cabeceras con Helmet:** `X-Content-Type-Options`, `X-Frame-Options`, HSTS, CSP `default-src 'none'` para respuestas JSON, `Cache-Control: no-store`, sin `X-Powered-By`.
- **Frontend:** CSP, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP y CORP en `vite.config.ts`. CSP estricta (`script-src 'self'`) en producción (`vite preview`).
- **Límites de tamaño:** 1 MB por petición (5 MB solo para restaurar respaldos).
- `HOST` y `TRUST_PROXY` configurables; `.env.example` documentado.

### A03 – Fallos en la cadena de suministro
- `npm audit fix`: de 6 vulnerabilidades a **0**. Se eliminó la dependencia sin uso `@google/genai`.
- **SBOM** CycloneDX 1.5 con 124 componentes: `docs/seguridad/sbom.cdx.json` (se regenera con `npm run sbom`).
- **Dependabot** semanal: `.github/dependabot.yml`. Script `npm run audit:security` (falla si hay vulnerabilidades altas o críticas).
- Versiones fijadas mediante `package-lock.json`.

### A04 – Fallos criptográficos
- Contraseñas con **scrypt** y salt aleatorio. Comparación en tiempo constante (`timingSafeEqual`).
- **Migración automática** de cualquier contraseña en texto plano a scrypt al iniciar el servidor o importar un respaldo. Ya no se acepta texto plano.
- `JWT_SECRET` **obligatorio** (32 caracteres como mínimo) y sin valor por defecto en el código: si falta, el servidor no arranca. Se quitó del README.
- JWT HS256: se rechaza `alg: none`, firmas alteradas y tokens sin `exp`.
- Los scripts SQL exportados ya no incluyen hashes.
- **TLS (requisito de despliegue):** en producción la API y el frontend deben servirse por HTTPS (TLS 1.2 o superior) detrás de un proxy inverso (Nginx/Caddy) con `TRUST_PROXY=1`. HSTS ya está activo.

### A05 – Inyección
- **Validación con `zod`** en todos los endpoints de escritura: lista blanca de campos, tipos, rangos y longitudes. Por ejemplo: cantidades ≥ 1, descuento entre 0 y 100, roles en una enumeración, URLs de imagen solo `/`, `http(s)` o `data:image`. → `backend/src/validation.ts`
- **Escape por dialecto** en los scripts SQL exportados (PostgreSQL y MySQL). → `backend/src/sqlEscape.ts`
- **Inyección CSV:** las celdas que empiezan con `= + - @` se neutralizan en el Kardex. → `frontend/src/components/KardexView.tsx`
- La búsqueda en MongoDB ya escapaba expresiones regulares. React escapa la salida HTML y no se usa `dangerouslySetInnerHTML`.

### A06 – Diseño inseguro
- **No confiar en el cliente:** el servidor recalcula precios, costos, subtotales, IGV y totales a partir del catálogo. Ignora `unitPrice`, `total` y `sellerName` enviados por el navegador. → `backend/src/pricing.ts`
- El stock se verifica sumando todas las líneas del mismo producto. Una cotización no se puede convertir dos veces.
- Toda cotización nueva nace "Enviada": aprobarla o rechazarla es exclusivo del administrador.
- Límites de confianza documentados: el navegador solo decide qué mostrar; toda decisión de seguridad se toma en el servidor.

### A07 – Fallos de autenticación
- **Rate limiting** por IP: 20 intentos fallidos cada 15 minutos. **Bloqueo de cuenta** tras 5 fallos, durante 15 minutos (HTTP 429). → `backend/src/middlewares/loginProtection.ts`
- **Mensaje genérico** ("Usuario o contraseña incorrectos") y mismo costo de cómputo exista o no el usuario, para evitar la enumeración.
- **Revocación de sesión:** el logout y el cambio de contraseña incrementan la `sessionVersion` del usuario e invalidan en el servidor todos sus JWT anteriores. Los usuarios desactivados pierden el acceso de inmediato.
- **Política de contraseñas:** 8 a 128 caracteres, con letras y números. Se eliminó la contraseña por defecto `123456`.
- Se eliminaron los tokens "legacy" sin firma.

### A08 – Fallos de integridad de software y datos
- **Restauración de respaldos:** validación completa del esquema (debe incluir al menos un administrador activo) y **copia automática previa** en `data/backups/` (se conservan las últimas 10). Lo mismo al reiniciar los datos demo.
- Integridad de documentos comerciales: los totales se recalculan en el servidor (ver A06).
- Integridad de la cadena de suministro: lockfile, SBOM y Dependabot (ver A03).

### A09 – Fallos en registros y alertas
- Nuevos **eventos de seguridad** en la bitácora: `login`, `login_failed`, `account_locked`, `logout` y `access_denied` (401 con token inválido y todos los 403).
- **Bitácora a prueba de manipulación:** cada evento se encadena con **HMAC-SHA256** al anterior. `GET /api/audit/verify` y el botón "Verificar integridad" del modal de auditoría detectan registros editados o eliminados. → `backend/src/audit.ts`
- El vendedor de una venta y el responsable de un ajuste de stock se toman del usuario autenticado (no se pueden suplantar).
- Los valores sensibles se ocultan en la bitácora (`[REDACTADO]`).

### A10 – Manejo inadecuado de condiciones excepcionales
- **Falla cerrado:** usuario sin contraseña → no inicia sesión; sin `JWT_SECRET` → el servidor no arranca; token sin `exp` → se rechaza.
- **Errores sin detalles internos:** los 5xx devuelven un mensaje genérico y un `errorId` que se correlaciona con el log del servidor. Los errores del parser JSON se traducen a mensajes propios. → `backend/src/middlewares/errorHandler.ts`
- Registro de promesas rechazadas sin manejar (`unhandledRejection`).
- El frontend cierra la sesión local automáticamente ante un 401 (token vencido o revocado).

### Controles frente al OWASP API Security Top 10 (2023)

Las diapositivas del curso tituladas "OWASP API Security Top 10" muestran en realidad la lista **OWASP Mobile Top 10 (2024)** (M1 a M10). Como este sistema es una API web, este es el mapeo correcto con la lista API1–API10:

| Riesgo API | Control en el proyecto |
|---|---|
| API1 Autorización a nivel de objeto (BOLA) | Todos los registros son de la empresa y no de cada usuario. El acceso se controla por permiso de módulo (ver API5). |
| API2 Autenticación rota | JWT firmado obligatorio, rate limiting, bloqueo de cuenta, revocación de sesión (A07). |
| API3 Autorización a nivel de propiedad (BOPLA / asignación masiva) | Esquemas `zod` con lista blanca de campos: `role`, `createdAt`, `sessionVersion` y hashes no se pueden inyectar. |
| API4 Consumo de recursos sin restricción | Límite de 1 MB por petición, máximo de 200 líneas por documento, paginación de la bitácora y rate limiting del login. |
| API5 Autorización a nivel de función (BFLA) | `requirePermission` y `requireAdmin` en cada endpoint. |
| API6 Acceso sin restricción a flujos de negocio sensibles | Precios y totales recalculados en el servidor; conversión de cotizaciones protegida. |
| API7 Falsificación de peticiones del lado del servidor (SSRF) | No aplica: el servidor no hace peticiones a URLs que proporcione el usuario. |
| API8 Mala configuración de seguridad | CORS, Helmet, secretos obligatorios (A02). |
| API9 Gestión inadecuada del inventario de la API | Endpoints documentados en este informe. `mysql-script` y `sql-export` restringidos a admin. |
| API10 Consumo inseguro de APIs | No aplica: el sistema no consume APIs de terceros. |

## Etapa 5 – Pruebas de seguridad

| Prueba | Herramienta | Cómo ejecutarla | Evidencia |
|---|---|---|---|
| PoC de explotación (22 casos A01, A02, A04, A07, A10) | `curl` | `bash docs/seguridad/pruebas/poc-owasp.sh` (con el backend en ejecución) | `evidencias/poc-antes.txt`, `evidencias/poc-despues.txt` |
| Escaneo pasivo (baseline) | OWASP ZAP (Docker) | `bash docs/seguridad/pruebas/zap-baseline.sh despues` | `evidencias/zap-*.html` |
| Análisis de dependencias (SCA) | `npm audit` | `npm run audit:security` | `evidencias/npm-audit-*.txt` |
| Pruebas unitarias y de integración | `node:test` | `npm test` | 22 pruebas en verde |

**Resultados de ZAP (antes → después):**

| Alerta | Antes | Después |
|---|---|---|
| Missing Anti-clickjacking Header | ⚠️ | ✅ corregida |
| X-Content-Type-Options Header Missing | ⚠️ (frontend y API) | ✅ corregida |
| Content Security Policy Header Not Set | ⚠️ | ✅ corregida (CSP definida) |
| Permissions Policy Header Not Set | ⚠️ | ✅ corregida |
| Server Leaks Information via "X-Powered-By" | ⚠️ (API) | ✅ corregida |
| Timestamp Disclosure (API) | ⚠️ | ✅ ya no aparece |
| CSP: `unsafe-inline` en estilos | – | Aceptada: React y las animaciones usan estilos inline |
| CSP: `script-src unsafe-inline` / `ws:` | – | Solo en modo desarrollo (HMR de Vite); en producción `script-src 'self'` |
| Sub Resource Integrity Missing | ⚠️ | Aceptada: Google Fonts genera CSS dinámico (recomendación: alojar las fuentes en el proyecto) |
| Cross-Origin-Embedder-Policy | ⚠️ | Aceptada: `require-corp` bloquearía Google Fonts |

## Etapa 6 – Capacitación y sensibilización (guía para el equipo)

1. **Nunca** subir `.env`, `data/*.json` ni respaldos al repositorio (ya están en `.gitignore`).
2. Todo endpoint nuevo pasa por `authenticate` y debe declarar su permiso (`requirePermission` o `requireAdmin`) y su esquema `validateBody(...)`.
3. No confiar en datos del navegador: precios, totales, roles, vendedor y fechas de sistema se calculan en el servidor.
4. Los errores 5xx se responden con `sendError(res, error)`. Nunca devolver `error.message` ni la traza al cliente.
5. Antes de cada entrega: `npm run lint && npm test && npm run audit:security`.
6. Revisar semanalmente los PR de Dependabot y la bitácora de seguridad (filtro "Seguridad").

## Etapa 7 – Mantenimiento y actualización

- **Semanal:** PR de Dependabot y revisión de eventos `login_failed`, `account_locked` y `access_denied`.
- **Por entrega:** `npm run audit:security`, `npm run sbom`, PoC y ZAP (scripts en `pruebas/`).
- **Rotación de secretos:** cambiar `JWT_SECRET` (cierra todas las sesiones) si se sospecha una filtración o al menos una vez por ciclo académico.
- **Respaldos:** descargar el respaldo JSON (solo admin) y guardarlo fuera del servidor.

## Riesgos residuales y recomendaciones

| Riesgo residual | Recomendación |
|---|---|
| No hay MFA | Agregar TOTP (Google Authenticator) para administradores. Es lo que recomienda el material del curso para A07. |
| El token se guarda en `localStorage` (expuesto si hubiera XSS) | Mitigado con CSP estricta en producción. Alternativa: cookie `HttpOnly` + `SameSite=Strict` con protección CSRF. |
| Los roles sin `canViewCosts` igual reciben `costPrice` en la API (la interfaz lo oculta) | Filtrar el campo en el servidor según el permiso. |
| Rate limiting y bloqueo de cuentas en memoria (se reinician con el servidor) | Usar Redis o MongoDB si se despliegan varias instancias. |
| La verificación HMAC cubre la bitácora local (últimos 1000 eventos) | Exportar la bitácora periódicamente a un almacenamiento de solo escritura (WORM) o a un SIEM. |
| El historial de git conserva el `db.json` antiguo con contraseñas demo | Las contraseñas ya se cambiaron. Para eliminarlo del historial: `git filter-repo --path backend/data/db.json --invert-paths` (reescribe el historial; coordinarlo con el equipo). |
| Google Fonts sin SRI | Alojar las fuentes en `frontend/public/fonts`. |

## Credenciales de demostración (solo entorno académico)

Las contraseñas débiles anteriores (`admin`, `carlos123`, `123456`, etc.) se reemplazaron por estas, que cumplen la nueva política:

| Usuario | Rol | Contraseña |
|---|---|---|
| `jperez` | Administrador | `Admin.Phantom2026` |
| `mgarcia` | Colaborador | `Ventas.Phantom2026` |
| `lrojas` | Almacén | `Almacen.Phantom2026` |
| `cvasquez` | Caja | `Caja.Phantom2026` |
| `dsilva` | Colaborador | `Asesor.Phantom2026` |

> Cámbialas antes de cualquier despliegue real.
