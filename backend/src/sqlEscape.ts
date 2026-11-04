/**
 * OWASP A05 (inyección): los scripts SQL exportados se arman como texto, por eso cada valor
 * se escapa según el dialecto antes de interpolarlo. Así un nombre o teléfono con comillas
 * (ej. "x'); DROP TABLE users; --") queda como dato y no como sentencia al ejecutar el script.
 */

/** Literal de texto PostgreSQL (standard_conforming_strings = on). */
export function pgString(value: unknown): string {
  const text = String(value ?? '').replace(/\0/g, '');
  return `'${text.replace(/'/g, "''")}'`;
}

/** Literal de texto MySQL (modo por defecto, la barra invertida es carácter de escape). */
export function mysqlString(value: unknown): string {
  const escaped = String(value ?? '').replace(/[\0\n\r\x1a\\'"]/g, (char) => {
    switch (char) {
      case '\0': return '\\0';
      case '\n': return '\\n';
      case '\r': return '\\r';
      case '\x1a': return '\\Z';
      default: return `\\${char}`;
    }
  });
  return `'${escaped}'`;
}

/** Literal numérico: cualquier valor no numérico se exporta como el valor por defecto. */
export function sqlNumber(value: unknown, fallback = 0): string {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : String(fallback);
}
