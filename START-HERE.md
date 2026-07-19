# START HERE — AurumTrace build, in plain language

This is your cheat sheet for turning the files in this folder into working software using
**Claude Code**. No jargon. Follow it top to bottom. Keep this file in the project folder.

---

## The idea in one picture

You are not "merging" the design and the code files. You put **everything in one folder**,
and Claude Code reads it all and does the building.

- The **design files** = the picture of what it should look like.
- The **agent files + plan** = the instructions for how to build it.
- **Claude Code** = the builder who reads both and writes the actual software.

Think of it like a building site:
- `CLAUDE.md` — the house rules on the wall (every worker reads it first)
- `.claude/agents/` — your specialist tradespeople (database, screens, compliance, etc.)
- `docs/AurumTrace_Phase1_ClaudeCode_Plan.md` — the construction schedule
- `docs/brand.md` + `docs/tokens.css` — the exact colours, fonts and finishes
- `docs/design/` — the architect's drawings (your Claude Design screens)
- `docs/goaml-mapping.md` — the legal document your compliance advisor must sign off
- **Claude Code** — the builder

---

## Where every file lives

```
aurumtrace/                         ← the project folder
├─ START-HERE.md                    ← this file
├─ CLAUDE.md                        ← the rulebook (top level)
├─ .claude/
│  └─ agents/                       ← the 7 specialist files
│     ├─ db-schema.md
│     ├─ backend-module.md
│     ├─ frontend-module.md
│     ├─ integrations.md
│     ├─ compliance-logic.md
│     ├─ test-writer.md
│     └─ reviewer.md
└─ docs/
   ├─ AurumTrace_Phase1_ClaudeCode_Plan.md
   ├─ goaml-mapping.md              ← advisor fills this in
   ├─ brand.md
   ├─ tokens.css
   └─ design/                       ← your Claude Design screens (exports/screenshots)
```

The `.claude` folder starts with a dot, so your computer may treat it as "hidden." Don't
worry — if it's fiddly to create, let Claude Code make it for you (Step 5).

---

## Steps

### 1. Install the tools
Install Node.js, then Claude Code. Current instructions and requirements:
https://docs.claude.com/en/docs/claude-code/overview
(Installing the free VS Code editor is optional but makes files easier to see.)

### 2. Make the folder
Create an empty folder called `aurumtrace` somewhere easy to find.

### 3. Save your Claude Design screens
Export what you can from Claude Design (code if offered, otherwise screenshots of each
screen) and put them in `aurumtrace/docs/design/`.

### 4. Drop in the files
Put this `START-HERE.md` and `CLAUDE.md` at the top level; the 7 agent files in
`.claude/agents/`; and the plan, `goaml-mapping.md`, `brand.md`, `tokens.css` in `docs/`.
(If the `.claude/agents/` folder is awkward to create, skip it — Step 5 fixes it.)

### 5. Open Claude Code and let it tidy up
Open your terminal in the `aurumtrace` folder, start Claude Code, and paste this:

> Here are some files in this folder. Please put CLAUDE.md at the project root, move the
> seven agent files into .claude/agents/, and keep the plan, goaml-mapping, brand and
> tokens in docs/. Then read CLAUDE.md and docs/AurumTrace_Phase1_ClaudeCode_Plan.md and
> summarise the build plan back to me so I know you understand it.

### 6. Start building — in order
When it has confirmed it understands, paste:

> Begin Step 1 (Foundations) from the plan. Build the UI to match the screens in
> docs/design/, using docs/brand.md and docs/tokens.css for the look. Pause and show me
> before moving to the next step.

### 7. Go one step at a time, and stop at the checkpoints
Work through the plan's steps in order. Wherever the plan shows a lock (🔒) — anything to
do with the compliance logic, the goAML report, security, or customer data — **stop and
have it reviewed before continuing.** That's the whole point of those markers.

Handy message to run a checkpoint:

> Before we continue, act as the "reviewer" agent: check tenant isolation (RLS), that no
> customer data leaks into logs, and that nothing files a report automatically. List any
> blockers.

---

## Two things to remember (important)

1. **The design files are a reference, not a magic import.** Claude Code looks at your
   screens and rebuilds them as real software, using `brand.md` and `tokens.css` to match
   the look. It doesn't "open" the design directly — those two files are the bridge.

2. **`goaml-mapping.md` stays mostly blank until your compliance advisor fills it in — on
   purpose.** Everything EXCEPT the goAML report part can be built now. The report module
   (Step 8 in the plan) waits for the advisor. Do not fill in the legal values yourself,
   and do not let Claude Code guess them. A wrong filing has real consequences.

---

## If you get stuck
- Ask Claude Code directly: "Explain what you just did in plain language," or "What do you
  need from me to continue?"
- Claude Code docs: https://docs.claude.com/en/docs/claude-code/overview
- Keep moving on the two things only you can do: get your 4 design partners' commitments in
  writing, and get a compliance advisor to complete `docs/goaml-mapping.md`.
```
