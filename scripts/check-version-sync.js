const { readFileSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
const read = (file) => readFileSync(join(root, file), 'utf8');

const pkgVersion = JSON.parse(read('package.json')).version;
const phpVersion = (read('litera.php').match(/^\s*\*\s*Version:\s*(\S+)/m) || [])[1];
const stableTag = (read('readme.txt').match(/^Stable tag:\s*(\S+)/m) || [])[1];
const releaseNotes = read('release_notes.md');

const semver = /^\d+\.\d+\.\d+$/;
const errors = [];

for (const [label, value] of [
  ['package.json version', pkgVersion],
  ['litera.php Version', phpVersion],
  ['readme.txt Stable tag', stableTag],
]) {
  if (!semver.test(value || '')) {
    errors.push(`${label} "${value}" bukan semver MAJOR.MINOR.PATCH`);
  }
}

if (new Set([pkgVersion, phpVersion, stableTag]).size > 1) {
  errors.push(
    `Versi tidak sinkron: package.json=${pkgVersion}, litera.php=${phpVersion}, readme.txt=${stableTag}`,
  );
}

if (!releaseNotes.includes(`## v${phpVersion}`)) {
  errors.push(`release_notes.md belum punya bagian "## v${phpVersion}"`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}

console.log(`Version sync OK: ${pkgVersion}`);
