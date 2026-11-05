# Migración real de autenticación — estado de ejecución

Fecha: 5 de noviembre de 2026, America/Lima.

La migración real fue autorizada por el usuario. Se completaron el respaldo verificable y las comprobaciones previas. La escritura de contraseñas permanece detenida porque se encontró una diferencia de lastLogin entre MongoDB y el JSON local, y el usuario indicó detenerse ante inconsistencias. Se solicitó confirmar si se conserva el valor de cada representación y se modifican exclusivamente los campos password.

## Resultado del respaldo

- Base respaldada: `phantom_erp`.
- Herramientas: mongodump y mongorestore 100.20.1.
- Respaldo completo BSON en formato archive gzip: 12 colecciones y 91 documentos.
- Verificación: restauración en `phantom_password_rehearsal_072eae7d2271422abf933f8d04a3076f`, comparación de todos los documentos, opciones e índices, y eliminación posterior de esa base temporal.
- Archivos locales incluidos: `backend/data/db.json` y `backend/data/audit.json`.
- Protección: directorio con ACL privada y tres archivos cifrados con Windows DPAPI CurrentUser. Se verificó descifrado y coincidencia SHA-256 antes de eliminar las copias de trabajo sin cifrar.
- Ubicación fuera del repositorio: `C:\Users\mathi\Downloads\Sistemas-phantom\.phantom-backups\auth-072eae7d2271422abf933f8d04a3076f`.
- El directorio incluye `manifest.json` con conteos, huellas y resultados de verificación, sin contraseñas ni hashes de contraseña individuales.
- DPAPI requiere el mismo perfil de Windows para descifrar. La restauración y el descifrado se probaron con ese perfil. El proceso restringido necesita la elevación de ejecución correspondiente para acceder a la ACL privada; no se relajaron permisos del respaldo.

## MongoDB, usuarios e inconsistencia detectada

MongoDB está conectado. La inspección de procesos no encontró ningún backend de Phantom ERP activo. No se detuvo MongoDB ni otros servicios. La consulta de operaciones activas no mostró escrituras sobre la base objetivo.

Se conservan los cinco usuarios. Tanto MongoDB como el JSON local contienen cuatro contraseñas heredadas y un hash scrypt válido. No existe `erp_state/primary` en la base inspeccionada.

Las cinco credenciales de MongoDB y del JSON local son equivalentes. El usuario que ya tiene scrypt posee hashes diferentes entre ambas representaciones; se comprobó en memoria que admiten la misma contraseña, sin mostrarla. Los cuatro valores heredados coinciden. La diferencia pendiente afecta únicamente lastLogin de un usuario; identificadores, roles, permisos, estados y restantes campos de usuario coinciden.

**Usuarios migrados en la base real: 0.** No se ejecutaron actualizaciones, eliminaciones, reset, seeds ni pruebas de login sobre la base real. No hubo fallo parcial que requiriera restaurar el origen. Una verificación posterior a las pruebas confirmó que las 12 colecciones y ambos JSON seguían coincidiendo con las huellas del respaldo.

## Código preparado y pruebas

Se convirtieron las cinco credenciales de los datos iniciales del código a hashes scrypt, conservando sus contraseñas de acceso. El reset utiliza esos datos iniciales. No se ejecutó un reset.

La importación ahora rechaza texto plano, hashes corruptos e identificadores duplicados. Una exportación sin password puede conservar el hash de un usuario existente por identificador; un usuario nuevo sin un hash válido se rechaza. La importación debe conservar un administrador activo. No se ejecutó importación sobre datos reales.

Se mantienen temporalmente la autenticación heredada y el backend sin iniciar. Su retirada y el arranque real quedan pendientes de que se complete y verifique la migración autorizada. Retirar la compatibilidad ahora impediría entrar a los cuatro usuarios aún sin migrar.

| Comprobación | Resultado |
| --- | --- |
| Respaldo BSON completo y restauración aislada | Aprobados |
| Descifrado y fidelidad de archivos locales | Aprobados |
| Equivalencia de las cinco credenciales entre representaciones | Aprobada |
| Huellas de la base real y JSON después de las pruebas | Sin cambios |
| `npm.cmd test` | 28 aprobadas, 0 fallidas, 0 omitidas |
| `npm.cmd run lint` | TypeScript aprobado en frontend y backend |

Las pruebas de escritura se ejecutaron exclusivamente en bases temporales. Las tres pruebas nuevas cubren datos iniciales hashed, conservación de hashes al importar y rechazo de credenciales inseguras.

## Archivos intervenidos en esta solicitud

- `scripts/auth-real-backup.mjs`: respaldo, restauración de ensayo, comparación, cifrado y verificación posterior.
- `backend/src/security.ts`: función de reconocimiento estricto de hashes scrypt. La rama de compatibilidad heredada no se retiró todavía.
- `backend/src/initialData.ts`: contraseñas iniciales representadas mediante hashes.
- `backend/src/userCredentials.ts`: preparación segura de usuarios importados.
- `backend/src/userCredentials.test.mjs`: pruebas de credenciales iniciales e importación.
- `backend/src/dataStore.ts`: importación validada antes de modificar el estado.
- `backend/src/routes.ts`: HTTP 400 para errores de validación de importación.
- `reports/auth-real-migration-status.md`: este estado verificable.

## Pendientes para cerrar la fase

Resolver la decisión sobre lastLogin preservando los valores existentes de cada representación, volver a verificar que el origen no cambió desde el respaldo, migrar solo las cuatro credenciales necesarias y comprobar todos los campos y colecciones. Después retirar la autenticación plaintext, actualizar las pruebas correspondientes, compilar e iniciar el backend con la conexión real. La validación de login real debe evitar la persistencia de snapshots empresariales o restaurar exclusivamente el metadato de login autorizado; no se usará como una supuesta comprobación de solo lectura.

También se mantienen los riesgos de la fase anterior que no dependen de esta migración: sesiones en un único proceso, scrypt síncrono, controles contra fuerza bruta distribuida, índices únicos pendientes, cabeceras/CSP y bitácora de autenticación. Las contraseñas heredadas conservadas pueden ser débiles o conocidas en los datos históricos; convertir su almacenamiento no modifica su fortaleza.
