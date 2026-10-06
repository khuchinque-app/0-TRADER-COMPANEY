# Wayfinder Agent Instructions for Hermes

This document describes how to use the Wayfinder skill in Hermes Agent context.

## Overview

Wayfinder is a planning skill that helps chart complex projects as a shared map of decision tickets. It uses the issue tracker (GitHub, GitLab, or local markdown) to track progress.

## Installation

```bash
bash scripts/vps-update-wayfinder.sh
```

## Configuration

The skill is installed at:
- `~/.hermes/profiles/herme-khuchinque/skills/engineering/wayfinder/`

## Usage

### Chart a New Map
```
/user invokes with a loose idea
→ Wayfinder creates map on issue tracker
→ Resolves tickets one at a time
```

### Work Through Existing Map
```
/user provides map URL or number
→ Loads map
→ Claims next frontier ticket
→ Resolves decision
→ Records result
```

## Issue Tracker Setup

Run `/setup-matt-pocock-skills` to configure:
- Issue tracker location (GitHub/GitLab/local markdown)
- Triage labels
- Domain docs layout

## Integration with Hermes

Wayfinder integrates with:
- `grilling` - interview primitive for decision-making
- `domain-modeling` - build project domain model
- `research` - subagent for information gathering
- `prototype` - create rough artifacts
- `to-tickets` - convert plans to tracker issues

## Ticket Types

- `research` - Information gathering (AFK)
- `prototype` - Create artifact (HITL)
- `grilling` - Interview conversation (HITL)
- `task` - Manual work before decision (HITL/AFK)

## Fog of War

The map stays deliberately incomplete. "Not yet specified" section tracks suspected decisions that aren't sharp enough to ticket yet.

## Out of Scope

Work beyond the destination gets its own section. Closed tickets go there with explanation.
