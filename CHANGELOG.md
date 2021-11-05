# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file has been automatially generated with [@bohr/changelogger](https://github.com/bohr-app/changelogger)

---

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

