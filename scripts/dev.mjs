import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const services = [
  {
    name: 'BACK',
    color: '\x1b[32m', // Green
    cwd: path.join(ROOT_DIR, 'backend'),
    args: ['run', 'dev'],
  },
  {
    name: 'FRONT',
    color: '\x1b[36m', // Cyan
    cwd: path.join(ROOT_DIR, 'frontend'),
    args: ['run', 'dev'],
  },
];

const resetColor = '\x1b[0m';
const children = [];

function prefixLines(prefix, color, chunk, stream) {
  const text = chunk.toString();
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === lines.length - 1 && line === '') continue;
    stream.write(`${color}[${prefix}]${resetColor} ${line}\n`);
  }
}

console.log('\x1b[1m🚀 Iniciando Sistemas Phantom ERP & WMS (Frontend + Backend)...\x1b[0m\n');

for (const svc of services) {
  const child = spawn(npmCmd, svc.args, {
    cwd: svc.cwd,
    env: { ...process.env, FORCE_COLOR: '1' },
    shell: isWin,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => prefixLines(svc.name, svc.color, chunk, process.stdout));
  child.stderr.on('data', (chunk) => prefixLines(svc.name, svc.color, chunk, process.stderr));

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`${svc.color}[${svc.name}]${resetColor} Proceso finalizado con código ${code}`);
    }
  });

  children.push(child);
}

function shutdown() {
  for (const child of children) {
    try {
      child.kill('SIGINT');
    } catch {}
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
