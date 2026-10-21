# Changelog

All notable changes are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); packages follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `boilerplate`: Button, Dialog, Input, Menu, Select and Sidebar on Base UI, each split into behavior and look, with `scripts/check.mjs` to prove an installed copy kept its behavior.
- `skeleton`: loading skeletons drawn from the component's own markup, only for the parts that wait on data, under ten rules; `scripts/check.mjs` (paint only, never layout) and `scripts/check-drawing.mjs` (chart drawings).
- `@frontendsupply/chart-skeletons` 0.1.1: drawings of 14 common charts at a chart's exact size, and the kit they're drawn with.
