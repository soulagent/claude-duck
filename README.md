# 🦆 claude-duck

A swimming ASCII duck for your [Claude Code](https://claude.com/claude-code) status line.

A little duck snakes **up and down a 3-row pond**, flipping to face the way it's going and trailing a
fading wake — on top of a rainbow status line (model · session/weekly usage bars · context · cost · git
branch). It animates on its own (one second per step) while Claude works *and* while you're idle.

```
Opus 4.8 | Session ██████──────── 40% | Weekly ██──────────── 12% | ctx █████───────── 35% | $1.23 | ⎇ main
································<o_/~~~··············································································
·····················································································································
·····················································································································
```

The duck cruises a row (~25s), drops to the next, swims back, drops again, hits the bottom, then snakes
all the way back up. A full lap is a couple of minutes.

Cross-platform — it's a dependency-free Node script (Claude Code ships Node), so it runs the same on
Windows, macOS, and Linux.

---

## Install (plugin)

```
/plugin marketplace add soulagent/claude-duck
/plugin install duck@claude-duck
/duck
```

`/duck` copies the duck script to `~/.claude/duck.mjs` and wires your `~/.claude/settings.json` for you
(it won't touch your other settings). Then **fully restart Claude Code once** — `refreshInterval` is
only read at startup, and that's what makes the duck swim every second.

## Install (manual)

If you'd rather not use the plugin:

1. Download [`plugins/duck/bin/duck.mjs`](plugins/duck/bin/duck.mjs) to `~/.claude/duck.mjs`.
2. Add this to `~/.claude/settings.json` (keep your other keys):

   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "node \"/ABSOLUTE/PATH/TO/.claude/duck.mjs\"",
       "refreshInterval": 1
     }
   }
   ```

   Use the real absolute path to the file (`node` does not expand `~`). On Windows use forward slashes,
   e.g. `node "C:/Users/you/.claude/duck.mjs"`.
3. Restart Claude Code.

---

## How it works (and one gotcha worth knowing)

Claude Code runs your status-line `command`, pipes the session JSON to it on **stdin**, and prints
whatever the command writes to **stdout**. `refreshInterval` (in **seconds**, minimum `1`) re-runs the
command on a timer so time-based output stays live. The duck's position is derived from the wall clock,
so each re-run advances it one step.

**The gotcha:** Claude Code *trims leading/empty whitespace* on each status-line line. The obvious way
to position a duck — pad it with leading spaces — therefore pins it to the left edge: it flips direction
but never moves. The fix is to fill the whole track with a faint, non-space "waterline" character (`·`)
and draw the duck on top. That's why there's a barely-visible dotted line under the duck. (Discovered
the hard way; see the comments at the top of `duck.mjs`.)

The duck only moves when Claude Code re-runs the script — there's no streaming/animation API — so
`refreshInterval: 1` is what frees it.

---

## Tuning

All knobs are near the top of [`duck.mjs`](plugins/duck/bin/duck.mjs):

| Want | Change |
| --- | --- |
| Bigger pond | `const nrows = 3` → 4, 5, … |
| Slower / faster duck | the `/ 24` in `speed` (bigger = slower per crossing) |
| More/less visible water | `waterFg = fg([42, 48, 58])` (brighter = more visible) |
| Duck colours | `gold` (beak) / `white` (body) |

Per-second refresh spawns Node once a second. If that feels heavy, bump `refreshInterval` to `2`–`3`
(the duck just steps a little less often).

---

## Notes

- The session/weekly usage bars only show on Pro/Max plans (they come from the session JSON); the
  context bar, cost, and git branch show for everyone. Segments with no data are skipped.
- Truecolor (24-bit ANSI) is used for the rainbow — it renders in modern terminals (Windows Terminal,
  iTerm2, most Linux terminals). On a 16-color terminal the colours degrade but the duck still swims.

## License

MIT © soulagent. Built with [Claude Code](https://claude.com/claude-code).
