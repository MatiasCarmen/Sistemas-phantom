# Migración de contraseñas: procedimiento pendiente de autorización

Este procedimiento no se ha ejecutado sobre datos reales. No requiere cambiar la contraseña elegida por ningún usuario: convierte su representación almacenada a scrypt. No elimina ni crea usuarios.

## Preparación y respaldo

1. Obtener autorización explícita para la base objetivo, el horario y el responsable de restauración. Detener todos los procesos del ERP que puedan escribir. La persistencia actual guarda snapshots completos; un proceso con datos anteriores podría sobrescribir los hashes migrados.
2. Guardar un respaldo BSON completo con MongoDB Database Tools, incluidos índices y metadatos. Obtener también una copia exacta de `backend/data/db.json` y cualquier archivo configurado mediante `PHANTOM_DATA_DIR`. Cifrar los respaldos, restringir sus permisos y guardarlos fuera del repositorio. Contienen credenciales heredadas; nunca adjuntarlos al informe ni imprimir su contenido. Usar configuración de conexión protegida y evitar credenciales en argumentos o historial.
3. Registrar fecha, base objetivo, versiones de herramientas, conteos por colección y SHA-256 de los archivos de respaldo. No registrar nombres, correos, contraseñas ni hashes de contraseñas individuales.
4. Restaurar primero el respaldo en una base temporal de nombre único, por ejemplo `phantom_password_rehearsal_<UUID>`, y un directorio temporal exclusivo. Configurar explícitamente `MONGODB_DATABASE` y `PHANTOM_DATA_DIR`; no ejecutar seeds, reset, importación HTTP ni un arranque conectado a la base original.
5. Verificar que la restauración conserva conteos, identificadores y campos. Probar la restauración antes de aprobar cualquier escritura en el origen. El export HTTP del ERP **no sirve como respaldo de credenciales**, porque elimina el campo password.

## Inventario y ensayo aislado

1. Inspeccionar mediante una herramienta controlada la colección `users`, `erp_state` si existe y la copia local. `loadDatabaseSnapshot()` da prioridad a `erp_state/primary.data`; no basta con modificar `users` si ese snapshot sigue presente.
2. Reportar únicamente cantidades: contraseñas scrypt válidas, texto plano heredado, ausentes y hashes corruptos. Un hash válido tiene exactamente `scrypt$<32 caracteres hexadecimales>$<128 caracteres hexadecimales>`. Ante valores ausentes, tipos inesperados o hashes corruptos, detener el ensayo y solicitar una decisión específica; no inventar claves ni tratar un hash roto como texto plano.
3. Para cada contraseña heredada, generar `hashPassword(valorOriginal)` con el código actual de `backend/src/security.ts`. Validar en memoria `verifyPassword(valorOriginal, hashGenerado) === true`. No aplicar la nueva política de longitud al valor heredado durante esta conversión: eso cambiaría el alcance y podría bloquear usuarios existentes.
4. Preparar cambios exclusivamente del campo password. En `users`, aplicar actualizaciones condicionadas por `_id` y el valor anterior de password, con `$set` y sin upsert. Si el filtro no coincide exactamente una vez, detener y restaurar; no continuar sobre un estado diferente al respaldado.
5. Si existe `erp_state/primary`, preparar la misma conversión para sus usuarios, conservar todos los demás campos y condicionar la actualización al arreglo original. No crear colecciones ni snapshots que no existían. Mantener coherencia de credenciales entre representaciones existentes y abortar si están en conflicto.
6. Si MongoDB permite transacciones, ejecutar los cambios de credenciales en una transacción. En una instalación standalone, mantener el servicio detenido durante toda la operación y restaurar el respaldo ante cualquier fallo parcial. Preparar la copia local en un archivo nuevo; validarla antes de reemplazar el archivo activo, únicamente en la ventana autorizada.
7. Comprobar que cada usuario conserva identificador y todos sus campos salvo password, que no cambian conteos, que las otras colecciones conservan sus documentos y que no quedan contraseñas planas en las representaciones incluidas. Para valores nuevos, repetir la verificación en memoria contra los originales sin registrarlos. Los hashes ya válidos deben conservarse exactamente.
8. Ejecutar la suite de seguridad contra el entorno aislado. Probar inicio de sesión con cuentas sintéticas en una copia del ensayo, sin usar cuentas reales ni publicar credenciales. El login actualiza lastLogin; esa comprobación no debe ejecutarse sobre la base original como verificación de solo lectura.

## Aplicación futura y reversión

Tras revisar los resultados del ensayo, solicitar la autorización de escritura con el respaldo verificado y los conteos concretos. Repetir las precondiciones sobre un respaldo reciente y aplicar exclusivamente las actualizaciones ensayadas. Registrar conteos esperados/coincidentes/modificados y checksums de respaldos, nunca valores de contraseñas.

Si falla alguna comprobación, mantener el ERP detenido. Restaurar desde BSON las representaciones afectadas de credenciales (`users` y `erp_state`, según existieran), sus índices y la copia local original. Comprobar conteos y equivalencia con el respaldo antes de reiniciar. Al restaurar se recupera también el riesgo del texto plano; conservar esta deuda explícita hasta repetir satisfactoriamente la migración.

El registro de sesiones vive en memoria: todo reinicio invalida tokens anteriores. No necesita una migración de versiones de sesión ni cambios en documentos de usuarios.

## Cierre de la deuda

Eliminar la rama de compatibilidad plaintext de `verifyPassword()` solo después de verificar todas las representaciones persistidas y adaptar importación, reset y datos iniciales para que no vuelvan a introducir contraseñas planas. Los duplicados existentes e índices únicos normalizados requieren otro inventario y autorización; esta fase valida duplicados dentro del proceso, sin crear índices sobre datos reales.

Conservar los respaldos sensibles durante el plazo acordado y después destruirlos mediante el procedimiento de almacenamiento correspondiente. Nunca subirlos al repositorio.
