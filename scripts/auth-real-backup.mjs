import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { MongoClient, BSON } from 'mongodb';
import dotenv from 'dotenv';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const environment = { ...dotenv.parse(fs.readFileSync(path.join(root, 'backend/.env'))), ...process.env };
export const toolsDirectory = 'C:/Program Files/MongoDB/Tools/100/bin';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const quote = value => "'" + value.replaceAll("'", "''") + "'";

export function runTool(name, args) {
  const result = spawnSync(path.join(toolsDirectory, name + '.exe'), args, { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`Falló ${name}; no se publican sus argumentos ni salida sensible`);
}

export function powershell(command) {
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error('Falló la protección de archivos de respaldo: ' + (result.error?.code || result.stderr.trim().slice(0, 1800)));
}

export function protectFile(source, destination, decrypt = false) {
  powershell(`[void][Reflection.Assembly]::LoadWithPartialName('System.Security'); [IO.File]::WriteAllBytes(${quote(destination)}, [Security.Cryptography.ProtectedData]::${decrypt ? 'Unprotect' : 'Protect'}([IO.File]::ReadAllBytes(${quote(source)}), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser))`);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

export const stable = value => JSON.stringify(canonical(BSON.EJSON.serialize(value, { relaxed: false })));

export async function fingerprint(database) {
  const result = {};
  const collections = await database.listCollections().toArray();
  for (const info of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    if (info.type !== 'collection') throw new Error('Tipo de colección no previsto; respaldo detenido');
    const collection = database.collection(info.name);
    const documents = await collection.find({}, { promoteValues: false }).toArray();
    const rows = documents.map(stable).sort();
    const indexes = (await collection.listIndexes().toArray()).map(index => ({ ...index, key: JSON.stringify(index.key) }));
    result[info.name] = { count: rows.length, digest: sha256(rows.join('\n')), options: stable(info.options), indexes: stable(indexes) };
  }
  return result;
}

export function verifyEqual(actual, expected, reason) {
  if (stable(actual) !== stable(expected)) throw new Error(reason);
}

export async function assertNoWrites(client) {
  const active = await client.db('admin').command({ currentOp: 1, active: true });
  const writes = active.inprog.filter(operation => operation.ns?.startsWith('phantom_erp.') && (
    ['insert', 'update', 'remove'].includes(operation.op) ||
    ['insert', 'update', 'delete', 'findAndModify', 'bulkWrite', 'drop', 'dropDatabase', 'renameCollection', 'applyOps'].some(key => key in (operation.command || {}))
  ));
  if (writes.length) throw new Error('Hay escrituras activas sobre phantom_erp; operación detenida');
}

export function readManifest(directory) {
  const absolute = path.resolve(directory);
  const parent = path.resolve(root, '..', '.phantom-backups');
  if (!absolute.startsWith(parent + path.sep)) throw new Error('Ruta de respaldo fuera del directorio permitido');
  const manifest = JSON.parse(fs.readFileSync(path.join(absolute, 'manifest.json'), 'utf8'));
  if (manifest.database !== 'phantom_erp' || !manifest.restoreVerified) throw new Error('El respaldo no está verificado');
  for (const file of manifest.files) {
    if (path.basename(file.encryptedName) !== file.encryptedName) throw new Error('Nombre de archivo de respaldo inválido');
    verifyEqual(sha256(fs.readFileSync(path.join(absolute, file.encryptedName))), file.encryptedSha256, 'Respaldo cifrado alterado');
  }
  return { directory: absolute, manifest };
}

export async function createBackup() {
  if ((environment.MONGODB_DATABASE || 'phantom_erp') !== 'phantom_erp') throw new Error('La configuración no apunta a la base autorizada');
  const id = randomUUID().replaceAll('-', '');
  const directory = path.resolve(root, '..', '.phantom-backups', `auth-${id}`);
  fs.mkdirSync(directory, { recursive: true });
  powershell(`$p=${quote(directory)}; $acl=New-Object Security.AccessControl.DirectorySecurity; $acl.SetAccessRuleProtection($true,$false); $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User; $rule=New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'); $acl.AddAccessRule($rule); [IO.Directory]::SetAccessControl($p,$acl)`);
  const working = path.join(directory, 'working');
  fs.mkdirSync(working);
  const config = path.join(working, 'tools.yml');
  fs.writeFileSync(config, `uri: ${JSON.stringify(environment.MONGODB_URI || 'mongodb://127.0.0.1:27017')}\n`);
  const client = new MongoClient(environment.MONGODB_URI || 'mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 5000 });
  const rehearsal = `phantom_password_rehearsal_${id}`;
  let restored = false;
  try {
    await client.connect();
    await assertNoWrites(client);
    const before = await fingerprint(client.db('phantom_erp'));
    const archive = path.join(working, 'phantom_erp.archive.gz');
    runTool('mongodump', ['--quiet', '--config', config, '--db', 'phantom_erp', '--archive=' + archive, '--gzip']);
    const localDirectory = path.resolve(root, 'backend', environment.PHANTOM_DATA_DIR || 'data');
    const localFiles = fs.readdirSync(localDirectory).filter(name => name.endsWith('.json')).map(name => {
      const source = path.join(localDirectory, name);
      const copy = path.join(working, name);
      const bytes = fs.readFileSync(source);
      JSON.parse(bytes.toString('utf8'));
      fs.writeFileSync(copy, bytes, { flag: 'wx' });
      return { source, copy };
    });
    if (!localFiles.some(file => path.basename(file.source) === 'db.json')) throw new Error('No existe el snapshot local esperado');
    if ((await client.db(rehearsal).listCollections().toArray()).length) throw new Error('La base de ensayo no está vacía');
    runTool('mongorestore', ['--quiet', '--config', config, '--archive=' + archive, '--gzip', '--nsFrom=phantom_erp.*', '--nsTo=' + rehearsal + '.*', '--stopOnError']);
    restored = true;
    verifyEqual(await fingerprint(client.db(rehearsal)), before, 'El respaldo restaurado no coincide con el origen');
    verifyEqual(await fingerprint(client.db('phantom_erp')), before, 'El origen cambió durante el respaldo');
    const files = [];
    for (const entry of [{ source: 'MongoDB:phantom_erp', copy: archive }, ...localFiles]) {
      const plainSha256 = sha256(fs.readFileSync(entry.copy));
      const encryptedName = path.basename(entry.copy) + '.dpapi';
      const encrypted = path.join(directory, encryptedName);
      protectFile(entry.copy, encrypted);
      const verification = path.join(working, 'verify.bin');
      protectFile(encrypted, verification, true);
      verifyEqual(sha256(fs.readFileSync(verification)), plainSha256, 'El respaldo cifrado no se puede recuperar fielmente');
      fs.unlinkSync(verification);
      files.push({ source: entry.source, encryptedName, plainSha256, encryptedSha256: sha256(fs.readFileSync(encrypted)) });
    }
    const manifest = { database: 'phantom_erp', createdAt: new Date().toISOString(), restoreVerified: true, encryption: 'Windows DPAPI CurrentUser', rehearsalDatabase: rehearsal, fingerprint: before, files };
    fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ backupDirectory: directory, restoreVerified: true, collections: Object.keys(before).length, documents: Object.values(before).reduce((total, value) => total + value.count, 0), encryptedFiles: files.length }));
    return directory;
  } finally {
    if (restored) {
      if (!/^phantom_password_rehearsal_[a-f0-9]{32}$/.test(rehearsal)) throw new Error('Nombre de ensayo inesperado');
      await client.db(rehearsal).dropDatabase();
    }
    await client.close();
    if (path.dirname(working) !== directory || !working.endsWith(path.sep + 'working')) throw new Error('Ruta de limpieza inválida');
    fs.rmSync(working, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const action = process.argv[2] === '--verify' ? async () => {
    const { directory, manifest } = readManifest(process.argv[3]);
    const client = new MongoClient(environment.MONGODB_URI || 'mongodb://127.0.0.1:27017');
    try {
      await client.connect();
      verifyEqual(await fingerprint(client.db('phantom_erp')), manifest.fingerprint, 'El origen cambió desde el respaldo');
      for (const file of manifest.files.filter(file => file.source !== 'MongoDB:phantom_erp')) {
        verifyEqual(sha256(fs.readFileSync(file.source)), file.plainSha256, 'Un JSON local cambió desde el respaldo');
      }
      console.log(JSON.stringify({ databaseUnchangedSinceBackup: true, localJsonUnchangedSinceBackup: true, encryptedBackupIntact: true, backupDirectory: directory }));
    } finally {
      await client.close();
    }
  } : createBackup;
  action().catch(error => { console.error(error.message); process.exitCode = 1; });
}
