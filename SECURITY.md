# Security

## What is in scope

These skills are instructions, component source files and local Node scripts. The scripts (`check.mjs`, `check-drawing.mjs`) only read the files you point them at and print a report; they start no browser and reach no network. The package, `@frontendsupply/chart-skeletons`, renders SVG from numbers and has no dependencies besides React.

A security problem is anything here that could run code, read files or reach the network in a way the user didn't ask for: in the scripts, the components or the package, or in instructions in a `SKILL.md` or a reference that would lead an agent to do something unsafe in someone's project.

## Supported versions

Only the latest commit on `main`, and the latest version of each package.

## Reporting a vulnerability

Please don't open a public issue for a security problem. Report it privately through GitHub's [private vulnerability reporting](https://github.com/frontendsupply/skills/security/advisories/new) for this repository.

Include what you found, how to reproduce it, and what it could let someone do.
