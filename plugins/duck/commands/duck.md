---
description: Install (or update) the claude-duck swimming-duck status line into your Claude Code settings
---

You are installing the **claude-duck** status line for the user. Be careful and idempotent — do NOT clobber unrelated settings.

## Steps

1. **Resolve the Claude config dir.** This is `~/.claude` with `~` expanded to the real home
   directory (e.g. `C:/Users/<name>/.claude` on Windows, `/home/<name>/.claude` or
   `/Users/<name>/.claude` elsewhere). Call the absolute home path `<HOME>`.

2. **Find the bundled duck script.** It ships in this plugin at `bin/duck.mjs`. Locate the installed
   copy: search under `<HOME>/.claude/plugins/` for a path ending in `duck/bin/duck.mjs` (use Glob).
   Copy that file to **`<HOME>/.claude/duck.mjs`** — a stable location that won't change when the
   plugin updates. (If you can't find the bundled copy, tell the user to install via the README's
   manual steps instead, and stop.)

3. **Wire `settings.json`.** Read `<HOME>/.claude/settings.json` (treat a missing file as `{}`).
   If a `statusLine` key already exists, show the user its current value and ask before replacing it.
   Then merge in — preserving every other key — :

   ```json
   "statusLine": {
     "type": "command",
     "command": "node \"<HOME>/.claude/duck.mjs\"",
     "refreshInterval": 1
   }
   ```

   Substitute the real absolute `<HOME>` path into the command string. Write valid JSON (no comments,
   no trailing commas).

4. **Verify it renders.** Pipe a tiny mock payload to the script and confirm it prints 4 lines whose
   pond rows begin with a `·` waterline:

   ```
   echo '{"model":{"display_name":"Test"},"context_window":{"used_percentage":35}}' | node "<HOME>/.claude/duck.mjs"
   ```

5. **Tell the user:**
   - The duck swims on the next status-line refresh.
   - `refreshInterval` is read **only at Claude Code startup**, so for the per-second swim they should
     **fully restart Claude Code** once. (The `duck.mjs` script itself is re-read every refresh, so
     future tweaks to it are live immediately.)
   - Tuning knobs live near the top of `duck.mjs`: `nrows` (pond height), the `/ 24` in `speed`
     (bigger = slower), and the `waterFg` colour (waterline visibility).

$ARGUMENTS
