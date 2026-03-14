import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const [, , ...argv] = process.argv;
if (argv.length === 0) {
  console.error('Usage: node scripts/run-with-env.mjs <command> [args...]');
  process.exit(1);
}

function parseEnvFile(filePath) {
  const entries = {};
  if (!existsSync(filePath)) return entries;

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }
  return entries;
}

const cwd = process.cwd();
const mergedEnv = {
  ...parseEnvFile(path.join(cwd, '.env')),
  ...parseEnvFile(path.join(cwd, '.env.local')),
  ...process.env,
};

function resolveCommand(command) {
  if (command.includes(path.sep) || path.isAbsolute(command)) {
    return command;
  }

  const localBin = path.join(
    cwd,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? `${command}.cmd` : command,
  );

  if (existsSync(localBin)) {
    return localBin;
  }

  return command;
}

const command = resolveCommand(argv[0]);

const child = spawn(command, argv.slice(1), {
  cwd,
  env: mergedEnv,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
