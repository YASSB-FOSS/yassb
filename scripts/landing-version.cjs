// No dependencies: the workflow runs this before installing either package.
const { appendFileSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');

function parseVersion(version) {
  const match = typeof version === 'string' && /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(version);
  if (!match) throw new Error(`Invalid landing version: ${String(version)}`);
  const prerelease = match[4] ? match[4].split('.') : [];
  if (prerelease.some(part => /^[0-9]+$/.test(part) && part.length > 1 && part[0] === '0'))
    throw new Error(`Invalid landing version: ${version}`);
  return { core: match.slice(1, 4).map(BigInt), prerelease };
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let i = 0; i < 3; i++)
    if (a.core[i] !== b.core[i]) return a.core[i] > b.core[i] ? 1 : -1;
  if (!a.prerelease.length || !b.prerelease.length)
    return Number(!a.prerelease.length) - Number(!b.prerelease.length);
  for (let i = 0; i < Math.max(a.prerelease.length, b.prerelease.length); i++) {
    const x = a.prerelease[i], y = b.prerelease[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const xn = /^[0-9]+$/.test(x), yn = /^[0-9]+$/.test(y);
    if (xn && yn) return BigInt(x) > BigInt(y) ? 1 : -1;
    if (xn !== yn) return xn ? -1 : 1;
    return x > y ? 1 : -1;
  }
  return 0;
}

async function main() {
  const source = JSON.parse(readFileSync(resolve(__dirname, '../landing/package.json'), 'utf8')).version;
  const response = await fetch('https://api.github.com/repos/YASSB-FOSS/YASSB-FOSS.github.io/contents/package.json?ref=master', {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'yassb-landing-version-check', 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Cannot read the published landing package.json: HTTP ${response.status}`);
  const file = await response.json();
  if (file.encoding !== 'base64' || typeof file.content !== 'string')
    throw new Error('Unexpected response for the published landing package.json');
  const published = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')).version;
  const shouldDeploy = compareVersions(source, published) > 0;
  console.log(`Landing: source ${source}, published ${published}. ${shouldDeploy ? 'Newer version: build and deploy.' : 'No newer version: skip build and deploy.'}`);
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `should_deploy=${shouldDeploy}\n`);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Landing version: **${source}**; published: **${published}**. ${shouldDeploy ? 'Build and deploy required.' : 'Build and deploy skipped.'}\n`);
}

module.exports = { compareVersions };
if (require.main === module) main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
