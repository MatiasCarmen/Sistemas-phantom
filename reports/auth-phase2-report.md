# Phantom ERP — Fase 2: autenticación y usuarios

Fecha: 5 de noviembre de 2026, America/Lima.

Se implementaron las correcciones de código y se verificaron con 25 pruebas aprobadas. No se ejecutó la migración de contraseñas, ni seeds, ni reset del sistema. Las escrituras de las pruebas se dirigieron a bases temporales exclusivas y directorios temporales. No se ejecutaron escrituras contra `phantom_erp`, `phantom_erp_demo` ni `phantom_erp_test`.

El repositorio ya contenía numerosos cambios al comenzar. Se conservaron; la lista siguiente corresponde a los archivos intervenidos en esta fase. No se cambió el diseño visual ni se agregaron dependencias.

## Archivos intervenidos

| Archivo | Cambio de esta fase |
| --- | --- |
| `backend/src/security.ts` | Rechazo de contraseñas ausentes y hashes corruptos; comparación heredada; identificadores de sesión aleatorios, registro acotado y revocación; validación estricta de expiración. |
| `backend/src/dataStore.ts` | Autenticación obligatoria, estado activo, validación y duplicados, lista de campos editables, protección del administrador y revocación ante cambios sensibles. Se retiró la conversión automática de contraseñas durante login. |
| `backend/src/routes.ts` | Control de estado en autorización, login genérico, logout efectivo y HTTP 400 para errores de validación de usuarios. |
| `backend/src/app.ts` | Montaje del límite de intentos antes del parser del login. |
| `backend/src/loginRateLimit.ts` | Nuevo middleware: diez solicitudes de login por IP cada quince minutos, HTTP 429 y Retry-After. |
| `shared/userValidation.ts` | Reglas compartidas para correo, usuario, contraseña, rol, estado y los nueve permisos booleanos. |
| `frontend/src/components/UsersManagementModal.tsx` | Validaciones compartidas, comprobación de duplicados y envío de la contraseña sin recortarla. Restricciones HTML de contraseña y autocomplete. |
| `backend/src/security.test.mjs` | Casos unitarios de contraseñas, sesiones, expiración, reinicio de proceso y vencimiento del rate limit. |
| `backend/src/auth-users.test.mjs` | Nueva integración HTTP con MongoDB temporal, credenciales sintéticas y comprobación de eliminación de la base al terminar. |
| `backend/src/api-security.test.mjs` | Aislamiento explícito del directorio y nombre de base. |
| `backend/src/authorization-pricing.test.mjs` | Nombre de base con UUID y validación antes de eliminarla. |
| `backend/src/controlled-persistence.test.mjs` | Nombre de base con UUID y validación antes de eliminarla. |
| `reports/auth-password-migration.md` | Procedimiento de respaldo, ensayo, aplicación autorizada y reversión. |
| `reports/auth-phase2-local-checksums.json` | Checksums de los archivos locales antes de la última ejecución de validación. |
| `reports/auth-phase2-report.md` | Este informe. |

## Correcciones y evidencias

| Hallazgo | Resultado comprobado |
| --- | --- |
| C-01: bypass sin contraseña | Se rechazan undefined, null, vacío, entradas inválidas y hashes corruptos. `authenticateUser()` verifica siempre y exige una contraseña almacenada. |
| A-02: usuario inactivo | Login devuelve 401; `/auth/me` y endpoints protegidos rechazan sesiones de usuarios inactivos. Desactivar mediante el backend revoca todas sus sesiones; reactivar no recupera tokens viejos. |
| A-03: ausencia de límite | Los primeros diez intentos llegan al login; el undécimo devuelve 429 con Retry-After. La ventana vence y otra IP tiene su propio contador. No se bloquean permanentemente cuentas por nombre de usuario. |
| A-04: logout sin revocación | El token cerrado deja de servir en `/auth/me` y productos; otra sesión del mismo usuario continúa funcionando. |
| A-05: clave por defecto y validación | No existe fallback de creación a una contraseña predeterminada. Crear o cambiar contraseña exige 12–128 caracteres, mayúsculas, minúsculas y números. Se rechazan correos, roles, estados y permisos inválidos. |
| A-06: mass assignment | No se propagan campos arbitrarios. Las pruebas conservan id, createdAt, lastLogin y password ante inyección de campos; no incorporan sessionVersion ni estructuras internas enviadas por el cliente. |
| A-06: último administrador | Se impiden eliminación, desactivación, degradación y retirada de cualquiera de los tres permisos esenciales: usuarios, configuración y eliminación de registros. Un administrador inactivo adicional no permite eludir la protección. Se permite modificar o eliminar otro administrador cuando queda uno activo. |
| M-01: enumeración por mensajes | Usuario inexistente, contraseña incorrecta, usuario sin contraseña e inactivo devuelven el mismo 401 y mensaje. Se realiza trabajo scrypt con un hash ficticio cuando falta una credencial almacenada. No se certifica resistencia absoluta frente a análisis de tiempos. |
| M-02: duplicados | Se validan creación y edición sin distinguir mayúsculas, incluyendo colisiones cruzadas entre username y email. |
| M-07: etiqueta de rol | El backend deriva roleLabel del rol permitido; ignora la etiqueta arbitraria enviada por el cliente. |
| JWT | Se rechazan manipulación, expiración exacta o pasada y sesiones no registradas. El rol autorizado se obtiene del DataStore, no del claim del token. |

Las validaciones de datos se comparten con el formulario de usuarios. Su compilación y comprobación de tipos pasan; no se ejecutó una prueba de navegador del formulario ni una revisión visual nueva.

## Sesiones y compatibilidad

El servidor actual mantiene un DataStore y un registro de sesiones en un único proceso. Cada JWT nuevo contiene un jti criptográficamente aleatorio y requiere una sesión registrada. El registro admite hasta 10 000 sesiones y elimina las expiradas al emitir nuevos tokens. El TTL sigue siendo de ocho horas.

Logout elimina únicamente la sesión correspondiente. Cambiar contraseña, rol, estado o permisos mediante el backend invalida todas las sesiones del usuario afectado. Eliminar usuarios revoca sus sesiones; importación y reset invalidan todas las sesiones si esos flujos se ejecutan posteriormente. Estos dos últimos enlaces se implementaron, pero no se ejecutaron sus rutas en esta fase; la operación de revocación global sí tiene una prueba unitaria.

Al desplegar esta versión, los JWT anteriores y los tokens de un proceso reiniciado dejan de ser válidos. Los usuarios deben volver a iniciar sesión. No se agregan versiones de sesión ni campos internos a documentos existentes.

Se conserva la verificación de los hashes scrypt existentes con salt hexadecimal de 16 bytes y clave de 64 bytes. También se admite temporalmente texto plano heredado no vacío. Esa compatibilidad es deuda de seguridad: las contraseñas existentes no se cambiaron ni se convirtieron automáticamente. Los valores nuevos y los cambios de contraseña sí se almacenan mediante scrypt.

## Validación ejecutada

| Comando | Resultado |
| --- | --- |
| `npm.cmd run lint` | Aprobado. En este proyecto lint ejecuta `tsc --noEmit` en frontend y backend; no hay un linter de estilo separado configurado. |
| `npm.cmd test` | 25 pruebas aprobadas, 0 fallidas, 0 omitidas. Incluye unitarias, integración HTTP de autenticación y usuarios, autorización y persistencia existentes. |
| `npm.cmd run build` | Aprobado para backend y frontend. Se necesitó ejecutar fuera del entorno restringido porque esbuild recibía Access is denied al buscar directorios superiores. |

Vite emitió una advertencia por un bundle de más de 500 kB; la compilación terminó correctamente. No se modificó la configuración de bundling para esta fase.

La nueva integración utilizó `phantom_security_59ad4ee8107c4d0eb31973a47b67a9c7` en la última ejecución. La limpieza verificó que no quedaban colecciones y registró su eliminación. Las integraciones preexistentes utilizaron nombres `phantom_erp_controlled_<UUID>` y `phantom_erp_auth_pricing_<UUID>`, con directorios locales temporales.

Los archivos `backend/data/db.json` y `backend/data/audit.json` conservaron sus SHA-256 entre el inicio y el final de la última ejecución de pruebas. La referencia está en `auth-phase2-local-checksums.json`. Esto es evidencia sobre los archivos locales; no es un checksum nuevo del contenido de la base principal ni una comparación con el checksum del informe anterior.

## Pendientes, migración y riesgos residuales

1. **Texto plano existente:** sigue pendiente su migración, incluidos snapshots y respaldos locales. El procedimiento verificable y reversible está en `auth-password-migration.md`; cualquier escritura sobre datos reales requiere autorización adicional. No se volvió a contar cuántas contraseñas reales están planas: la cifra de cuatro pertenece a la auditoría recibida.
2. **Reset, datos iniciales e importación:** todavía pueden reintroducir contraseñas heredadas. Se deben adaptar antes de retirar la compatibilidad plaintext. No se ejecutaron seeds ni reset.
3. **Un solo proceso:** sesiones, límites de intentos, validación de duplicados y protección del administrador dependen del estado de ese proceso. Antes de usar múltiples instancias se necesita estado de sesiones y rate limiting compartido, lecturas coherentes y operaciones de usuarios atómicas. Los cambios directos en MongoDB no actualizan automáticamente el DataStore en memoria.
4. **Índices únicos:** no se crearon sobre datos reales. Su aplicación necesita inventariar y resolver posibles duplicados existentes y revisar la persistencia de snapshots. Las validaciones implementadas protegen las operaciones del proceso actual.
5. **Fuerza bruta distribuida y disponibilidad:** el límite por IP reduce intentos, pero no sustituye controles de infraestructura contra tráfico distribuido. scrypt sigue siendo síncrono y puede bloquear el event loop; su conversión a ejecución asíncrona queda pendiente. Detrás de un proxy, sin una configuración de confianza específica, los clientes comparten la IP del proxy; no se habilitó confianza indiscriminada en X-Forwarded-For.
6. **Auditoría:** la colección vacía, la recuperación de eventos históricos y eventos específicos de login/logout no se corrigieron. La prueba existente de redacción de secretos sigue pasando; eso no demuestra que la bitácora real esté poblada.
7. **Cliente y cabeceras:** siguen pendientes almacenamiento del token en localStorage, CSP/cabeceras, cierre automático del cliente ante 401, recuperación de contraseña y otros hallazgos de UX/accesibilidad. No se realizó un rediseño visual.

No se certifica el módulo completo para producción. Esta entrega aporta correcciones verificadas dentro de la arquitectura actual, con las operaciones sobre datos reales separadas para una migración autorizada.
