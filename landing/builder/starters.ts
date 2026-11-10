import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import type { RendererProps } from 'yassb-web';
import { esc } from './docs';

/** src/app/data-sources/starters.json: order and display names of the presets of `yassb new`. */
interface Starters {
  axes: Array<{ axis: string; title: string; fallback?: string; labels: { [preset: string]: string } }>;
}

/** Selected preset per axis (presentation only). */
type Selection = { [axis: string]: string };

interface Preset {
  axis: string;
  name: string;
  label: string;
  description: string;
  files: Array<string>;
}

const TEMPLATES = resolve(__dirname, '..', '..', 'templates');
const AXIS_COLORS: { [axis: string]: string } = { styles: 'bg-pink-400', scripts: 'bg-violet-400', deploy: 'bg-amber-400' };

/**
 * Presets of an axis, read from templates/<axis>/<name>/preset.json in the order of starters.json. A preset on
 * disk without a label (or a label without a preset) fails the build, so the home page never drifts from the CLI.
 */
function presetsOf(axis: Starters['axes'][number]): Array<Preset> {
  const dir = join(TEMPLATES, axis.axis);
  const onDisk = readdirSync(dir).filter(name => existsSync(join(dir, name, 'preset.json')));
  for (const name of onDisk)
    if (!axis.labels[name])
      throw new Error(`Preset ${axis.axis}/${name} has no label in starters.json`);
  return Object.entries(axis.labels).map(([name, label]) => {
    if (!onDisk.includes(name))
      throw new Error(`starters.json lists ${axis.axis}/${name}, which is not in templates/`);
    const manifest = JSON.parse(readFileSync(join(dir, name, 'preset.json'), 'utf8'));
    return { axis: axis.axis, name, label, description: manifest.description, files: listFiles(join(dir, name)) };
  });
}

/** Files a preset writes, as they appear in the project (dot-github → .github). */
function listFiles(root: string, dir: string = root, prefix: string = ''): Array<string> {
  return readdirSync(dir).sort().flatMap(entry => {
    if (dir === root && entry === 'preset.json')
      return [];
    const path = join(dir, entry);
    const output = prefix + (entry.startsWith('dot-') ? `.${entry.slice(4)}` : entry);
    return statSync(path).isDirectory() ? listFiles(root, path, `${output}/`) : [output];
  });
}

/** The flags `yassb new` needs for a selection: default presets are left out. */
function flagsOf(starters: Starters, selection: Selection): string {
  return starters.axes
    .filter(axis => selection[axis.axis] && selection[axis.axis] !== axis.fallback)
    .map(axis => ` --${axis.axis} ${selection[axis.axis]}`)
    .join('');
}

/**
 * The starters block of the home page: a picker (one preset per axis), the output of `yassb new` for the
 * selection, and the files the presets add. `src/app/scripts/starters.ts` updates it when the selection changes;
 * without JavaScript it shows the selection given in options.
 *
 * `<!-- create-from-data-source="starters.json" renderer="starterPicker" options="{"styles":"tailwind"}" -->`
 */
export function starterPicker({ source, options }: RendererProps<Starters, Selection>): string {
  const selection: Selection = {};
  for (const axis of source.axes)
    selection[axis.axis] = options?.[axis.axis] ?? axis.fallback ?? '';
  const axes = source.axes.map(axis => ({ ...axis, presets: presetsOf(axis) }));
  const all = axes.flatMap(axis => axis.presets);
  const command = `npx yassb-web new my-site${flagsOf(source, selection)}`;

  const chip = (axis: string, value: string, label: string, note: string, checked: boolean, description: string) => `
        <label class="cursor-pointer">
          <input type="radio" name="${esc(axis)}" value="${esc(value)}" data-description="${esc(description)}" class="peer sr-only"${checked ? ' checked' : ''}>
          <span class="block rounded-full bg-white px-4 py-1.5 text-sm/6 font-medium text-gray-700 ring-1 ring-gray-200 transition peer-checked:bg-gray-950 peer-checked:text-white peer-checked:ring-gray-950 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pink-500 hover:ring-gray-400">${esc(label)}${note ? ` <span class="font-normal opacity-60">${esc(note)}</span>` : ''}</span>
        </label>`;

  const picker = axes.map(axis => `
      <fieldset>
        <legend class="font-mono text-xs/5 font-semibold tracking-widest text-gray-500 uppercase">${esc(axis.title)}</legend>
        <div class="mt-3 flex flex-wrap gap-2">${axis.presets.map(preset => chip(axis.axis, preset.name, preset.label, preset.name === axis.fallback ? 'default' : '', selection[axis.axis] === preset.name, preset.description)).join('')}${axis.fallback ? '' : chip(axis.axis, '', 'None', '', !selection[axis.axis], '')}
        </div>
      </fieldset>`).join('');

  const line = (axis: string) => {
    const preset = all.find(item => item.axis === axis && item.name === selection[axis]);
    return `<span data-starter-line="${esc(axis)}"${preset ? '' : ' hidden'}>    <span class="text-slate-500">${esc(axis.padEnd(8))}</span><span class="text-white" data-starter-name>${esc(preset?.name ?? '')}</span> <span class="text-slate-500" data-starter-description>— ${esc(preset?.description ?? '')}</span>\n</span>`;
  };

  const files = all.flatMap(preset => preset.files.map(file => ({ file, preset })))
    .sort((a, b) => a.file.localeCompare(b.file))
    .map(({ file, preset }) => `<li data-starter-file="${esc(preset.axis)}:${esc(preset.name)}" class="flex items-center gap-2.5"${selection[preset.axis] === preset.name ? '' : ' hidden'}><span class="h-1.5 w-1.5 shrink-0 rounded-full ${AXIS_COLORS[preset.axis] || 'bg-gray-300'}"></span>${esc(file)}</li>`)
    .join('');

  return `
  <div class="mt-12 grid grid-cols-1 items-start gap-x-16 gap-y-16 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]" data-starter-picker data-fallbacks="${esc(JSON.stringify(Object.fromEntries(source.axes.map(axis => [axis.axis, axis.fallback ?? ''])))).replace(/\{/g, '&#123;')}">
    <div class="space-y-8">${picker}
      <p class="max-w-md text-sm/6 text-gray-500">Each preset brings its own files and packages. A styles preset writes the pages and components for its framework; <code class="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[13px]">AGENTS.md</code> tells your coding agent what was chosen.</p>
    </div>
    <div class="relative">
      <div aria-hidden="true" class="absolute -inset-x-10 -inset-y-16 bg-[radial-gradient(45%_40%_at_65%_35%,#fce7f3,transparent),radial-gradient(40%_35%_at_30%_80%,#fef3c7,transparent)] blur-2xl"></div>
      <div class="relative overflow-hidden rounded-xl bg-[#0a101f] shadow-xl ring-1 ring-black/10">
        <div class="flex items-center gap-2 border-b border-white/5 bg-[#121829] px-4 py-2.5">
          <span class="h-2.5 w-2.5 rounded-full bg-white/15"></span><span class="h-2.5 w-2.5 rounded-full bg-white/15"></span><span class="h-2.5 w-2.5 rounded-full bg-white/15"></span>
          <span class="ml-2 flex-1 font-mono text-xs text-slate-500">~/projects</span>
          <button type="button" data-copy="${esc(command)}" data-starter-copy class="rounded-md px-2 py-0.5 font-mono text-xs text-slate-400 ring-1 ring-white/10 hover:bg-white/5 hover:text-white">Copy</button>
        </div>
        <pre class="px-5 pt-5 pb-12 font-mono text-[12.5px]/6 break-words whitespace-pre-wrap text-slate-300"><span class="text-pink-300">$</span> <span class="text-white">npx yassb-web new my-site</span><span class="text-violet-300" data-starter-flags>${esc(flagsOf(source, selection))}</span>

  <span class="text-green-400">✓</span> created <span class="font-bold text-white">my-site/</span>
${source.axes.map(axis => line(axis.axis)).join('')}
  <span class="font-bold text-white">NEXT STEPS</span>

    <span class="text-slate-500">$</span> <span class="text-violet-300">cd my-site</span>
    <span class="text-slate-500">$</span> <span class="text-violet-300">npm install</span>
    <span class="text-slate-500">$</span> <span class="text-violet-300">npm run watch</span>  <span class="text-slate-500">→ http://localhost:3000</span></pre>
      </div>
      <div class="relative -mt-8 ml-auto w-[92%] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 sm:mr-6 sm:w-[62%]">
        <div class="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2.5 font-mono text-xs text-gray-500">
          <span>my-site/</span><span class="text-gray-400">added by the presets</span>
        </div>
        <ul class="space-y-0.5 px-4 py-3 font-mono text-xs/5 text-gray-700">${files}</ul>
        <p class="border-t border-gray-100 px-4 py-2.5 text-xs/5 text-gray-500">Plus the base: <code class="font-mono">config/</code>, a renderer, a data source, <code class="font-mono">AGENTS.md</code>.</p>
      </div>
    </div>
  </div>`;
}
