import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceDirectory = join(projectRoot, 'models', 'cases');
const publicDirectory = join(projectRoot, 'public', 'models', 'cases');

mkdirSync(publicDirectory, { recursive: true });
cpSync(sourceDirectory, publicDirectory, { recursive: true });
