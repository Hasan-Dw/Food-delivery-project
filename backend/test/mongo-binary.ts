import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Locates a locally installed `mongod` so e2e runs do not depend on
 * downloading a binary from fastdl.mongodb.org. If nothing is found, returns
 * undefined and the caller falls back to mongodb-memory-server's downloader.
 *
 * Set `MONGOMS_SYSTEM_BINARY` to point at a specific executable.
 */
export function findMongodBinary(): string | undefined {
  const configured = process.env.MONGOMS_SYSTEM_BINARY?.trim();
  if (configured) return configured;

  const candidates: string[] = [];

  if (process.platform === 'win32') {
    const root = 'C:\\Program Files\\MongoDB\\Server';
    if (existsSync(root)) {
      const versions = readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
        .reverse();

      for (const version of versions) {
        candidates.push(join(root, version, 'bin', 'mongod.exe'));
      }
    }
  } else {
    candidates.push('/usr/bin/mongod', '/usr/local/bin/mongod', '/opt/homebrew/bin/mongod');
  }

  return candidates.find((candidate) => existsSync(candidate));
}
