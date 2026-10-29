import { readFileSync, statSync } from 'fs';
import Module from 'module';

/**
 * Lets Node `require()` TypeScript and JSX files of the site (config, renderers, directives…).
 *
 * Each file is compiled on its own to CommonJS with esbuild, like `ts-node --transpile-only` did in 1.x:
 * `__dirname`, relative imports and the site's `tsconfig.json` (jsx, decorators, class fields) behave the same.
 * Bun runs TypeScript natively, so the hook is not installed there.
 */

const EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.jsx'];

let installed = false;

/** Compiled code of each file, with the size and modification time it was compiled from. */
const compiled = new Map<string, { mtimeMs: number; size: number; code: string }>();

/**
 * Files compiled by the hook in this process (used to know which site modules the config loaded).
 *
 * @internal
 */
export const COMPILED_FILES = new Set<string>();

/**
 * @internal
 */
export function isBun(): boolean {
  return typeof (process.versions as { bun?: string }).bun === 'string';
}

/**
 * @feature behaviour.site-code
 * @summary Configuration and site code can be TypeScript, TSX or JavaScript.
 * @usage config/default.ts importing builder/renderers.tsx
 * @options The site's tsconfig.json (jsx, decorators, class fields).
 * @rules Under Node each file is compiled on its own to CommonJS with esbuild (like ts-node --transpile-only): __dirname, relative imports and require work as in Node; no type checking; stack traces point to the TS lines; Bun runs TypeScript natively; a syntax error is reported with file and line.
 * @errors CONFIG_LOAD_FAILED
 * @status stable
 * @since 1.0.0
 * @related config.files
 */
export function installTsRequireHook(): void {
  if (installed || isBun())
    return;
  installed = true;

  // Lazily loaded: commands that do not load site code never start esbuild.
  let esbuild: typeof import('esbuild') | undefined;
  const target = `node${process.versions.node.split('.')[0]}`;
  const extensions = (Module as unknown as { _extensions: { [ext: string]: (module: NodeModuleWithCompile, filename: string) => void } })._extensions;

  for (const extension of EXTENSIONS)
    extensions[extension] = (module: NodeModuleWithCompile, filename: string) => {
      // The long-lived build process of `watch` loads site modules again for every build: unchanged files are
      // not compiled again.
      const stats = statSync(filename);
      const cached = compiled.get(filename);
      if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
        COMPILED_FILES.add(filename);
        module._compile(cached.code, filename);
        return;
      }
      esbuild = esbuild || require('esbuild') as typeof import('esbuild');
      let result: import('esbuild').BuildResult;
      try {
        result = esbuild.buildSync({
        entryPoints: [filename],
        // Output next to the source, so that source map paths resolve to the original file.
        outfile: `${filename}.js`,
        bundle: false,
        write: false,
        format: 'cjs',
        platform: 'node',
        target,
        sourcemap: 'inline',
        logLevel: 'silent',
        loader: { '.ts': 'ts', '.tsx': 'tsx', '.mts': 'ts', '.cts': 'ts', '.jsx': 'jsx' }
        });
      } catch (error) {
        const first = (error as { errors?: Array<import('esbuild').Message> }).errors?.[0];
        if (!first)
          throw error;
        throw new SourceCompileError(first.text, first.location ? first.location.file : filename, first.location?.line, first.location?.lineText);
      }
      const code = result.outputFiles && result.outputFiles[0] ? result.outputFiles[0].text : readFileSync(filename, 'utf8');
      compiled.set(filename, { mtimeMs: stats.mtimeMs, size: stats.size, code });
      COMPILED_FILES.add(filename);
      module._compile(code, filename);
    };

  // Inline source maps make stack traces of site code point to the TypeScript lines.
  const processWithSourceMaps = process as unknown as { setSourceMapsEnabled?: (enabled: boolean) => void };
  if (typeof processWithSourceMaps.setSourceMapsEnabled === 'function')
    processWithSourceMaps.setSourceMapsEnabled(true);
}

/**
 * A site file could not be compiled (syntax error).
 *
 * @featurePart behaviour.site-code
 */
export class SourceCompileError extends Error {
  constructor(message: string, public file: string, public line?: number, public lineText?: string) {
    super(`${file}${line ? `:${line}` : ''}: ${message}`);
    this.name = 'SourceCompileError';
  }
}

interface NodeModuleWithCompile {
  _compile(code: string, filename: string): void;
}
