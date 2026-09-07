// The service reads the very same data file the app bundles, so there is only
// ever one source of truth for the names. deploy.sh copies it next to the
// service.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export function loadNames() {
  return JSON.parse(readFileSync(join(here, 'names.ru.json'), 'utf8'));
}
