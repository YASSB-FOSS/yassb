# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file has been automatially generated with [@bohr/changelogger](https://github.com/bohr-app/changelogger)

---

## [2.0.0] - 2026-10-26
### Added
- watch: every build runs in a fresh process, so config, renderers and directives are reloaded; errors shown in an in-browser overlay without stopping the server; CSS hot swap; whole project watched.
- yassb inspect, yassb check, yassb docs commands; --strict, --clean, --out, --json flags.
- diagnostics with stable codes, file and line.
- output lock: only one build/check/watch at a time writes an output folder; a second one stops with OUTPUT_LOCKED naming the other process.
- sourcePath in renderer props, nested translation keys, i18n.allowHtml, sitemap: false, cleanOut, strict, beforeBuild/afterBuild hooks, esbuildOptions, defineConfig.
- feature catalogue: every export tagged @feature/@featurePart/@internal, build fails if a feature, CLI flag or diagnostic code is undocumented; yassb docs features.
- docs/guide.md, AGENTS.md, llms.txt; starter project with AGENTS.md.

### Changed
- requires Node.js 20+ (or Bun); runtime dependencies reduced from 26 to 5 (esbuild, gray-matter, html-minifier-terser, sass, showdown).
- scripts bundled with esbuild instead of webpack; webpackConfig still honoured when webpack is installed in the site.
- config/*.ts and site code compiled per file with esbuild instead of ts-node; config loading rules unchanged.
- translation edits only translated elements instead of re-serializing pages with cheerio.
- builds about 2.5x faster.

### Fixed
- options containing arrays were silently ignored.
- $$ and $& in content were altered when inserted into pages.
- basicElement wrote <undefined> elements without a tag option.
- an element with both data-attr-t and data-t lost its text translation.
- watch reloaded the browser before the rebuild finished and ignored changes to code outside src.

### Removed
- dependencies no longer installed: react, react-dom, fs-extra, cheerio, lodash, moment, webpack, ts-node, typescript and others; sites importing them must declare them (yassb check lists them).

## [1.4.3] - 2024-07-26
### Fixed
- bin unix.

## [1.4.2] - 2024-07-26
### Fixed
- bin unix.

## [1.4.0] - 2023-03-11
### Added
- remove CSP in watch mode.

## [1.3.3] - 2023-03-09
### Fixed
- reset langs.

## [1.3.2] - 2023-03-09
### Fixed
- rebuilding once with multiple file changed.

## [1.3.1] - 2022-11-26
### Fixed
- reset file list.

## [1.3.0] - 2022-09-28
### Changed
- migrated to dart-sass.

## [1.2.4] - 2022-06-29
### Fixed
- fix.

## [1.2.3] - 2022-06-29
### Added
- line ending.

## [1.2.2] - 2022-06-29
### Fixed
- line ending.

## [1.2.1] - 2022-06-29
### Fixed
- line ending.

## [1.2.0] - 2022-03-13
### Added
- added stats info to webpack.

## [1.1.11] - 2022-02-02
### Fixed
- added webpack to deps.

## [1.1.10] - 2022-02-01
### Fixed
- version number.

## [1.1.9] - 2022-02-01
### Changed
- updated dependencies for compatibility with Node 17.

## [1.1.8] - 2021-11-05
### Changed
- date are now injected as a ISO string.

## [1.1.7] - 2021-11-05
### Fixed
- not minimizing file when post processing a file just generated.

## [1.1.6] - 2021-11-05
### Changed
- converted post processor to sync.

## [1.1.5] - 2021-11-05
### Changed
- running post processor also after a new file is generated from a template to inject matter data before directives are invoked.

## [1.1.4] - 2021-11-05
### Fixed
- fixed import in bin.js.

## [1.1.3] - 2021-11-05
### Changed
- improved how code is packaged for npm to serve modules in subdirs.

## [1.1.2] - 2021-11-05
### Changed
- moved single exports to tools to use index only for CLI commands.

## [1.1.1] - 2021-11-05
### Fixed
- fixed typo in comment.
- exporting YassbBaseDirective so custom directives can import it and extend it .

## [1.1.0] - 2021-11-03
### Added
- added language and excerpt, if set, to the data passed to FrontMatterDataStore.

## [1.0.5] - 2021-10-08
### Added
- Atted typings for clean-css.

### Fixed
- fixed wildcard LANG not being replaced.

## [1.0.4] - 2021-02-27
### Fixed
- fixed script in package.json.

## [1.0.3] - 2021-02-27
### Changed
- improved deploy process by building licenses first.
- improved UI of landing.

## [1.0.2] - 2021-02-27
### Added
- added code quality badge.

## [1.0.1] - 2021-02-27
### Added
- Added npm node and license badges.

### Changed
- improved Readme.

### Fixed
- Fixed typo in guides.
- fixed css formatting.

## [1.0.0] - 2021-01-17
### Added
- Added issues templates.

### Changed
- improved log message for HTML build step with language details (if i18n is enabled).
- improved the README.
- made the creation of new files async when creating a new project.
- switched to changelog-flow for releases management.
- improved README intro.
- clarified in the guides how to define a custom project structure.

### Removed
- removed dependency to codelyzer.

## [0.9.6] - 2020-12-16
### Changed
- improved execution of the watch command.
- code refactoring of the watcher.

## [0.9.5] - 2020-12-16
### Added
- Added changelog.
- Added connection message for live reload.

### Fixed
- Fixed default 404 page for watch server in multi-lang sites.

