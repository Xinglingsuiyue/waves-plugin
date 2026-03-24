import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { pluginResources } from '../../model/path.js';

const shanghaiDir = path.join(pluginResources, 'Shanghai');

async function loadModuleByName(folder, name) {
  if (!name) return null;

  const filePath = path.join(shanghaiDir, folder, `${name}.js`);
  if (!fs.existsSync(filePath)) return null;

  const stat = fs.statSync(filePath);
  const fileUrl = `${pathToFileURL(filePath).href}?t=${stat.mtimeMs}`;

  const mod = await import(fileUrl);
  return mod?.default || mod;
}

export async function loadCharacterModule(name) {
  return loadModuleByName('characters', name);
}

export async function loadWeaponModule(name) {
  return loadModuleByName('weapons', name);
}

export async function loadPhantomModule(name) {
  return loadModuleByName('phantoms', name);
}

export async function loadGroupModule(name) {
  return loadModuleByName('groups', name);
}

export async function loadEnemyModule(name) {
  return loadModuleByName('enemies', name);
}
