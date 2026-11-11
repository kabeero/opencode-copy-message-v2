# opencode-copy-message-v2

Pick **any** message from your OpenCode session history and copy it to the clipboard.

A TUI plugin for **OpenCode v2**. OpenCode's built-in copy command only grabs the last assistant reply. This plugin opens a searchable picker of every message in the session, so you can walk back through the conversation and copy the one you want.

```
  Here's the change: the redirect now happens after…         14:35 ai
  fix the login redirect bug when the session expires        14:32 me
  Done. I moved the check into the middleware and…      11/9 09:11 ai
  can you also cover the logout flow?                   11/9 09:10 me
```

Newest messages first. Your own messages (`me`) are dimmed, the model's (`ai`) are normal text, and each role gets its own theme color.

## Features

- **Whole session history.** Asks OpenCode to load older pages of long sessions, not just the most recent ones.
- **Search by content.** Type to filter by the full text of a message, not just the visible preview.
- **Timestamps.** `HH:MM` for today, `M/D HH:MM` for older messages.
- **Theme-aware colors.** Roles use your OpenCode theme's tokens, so they follow theme changes. Nothing is hardcoded.
- **Sized for reading.** The picker is widened to 88 columns (or your terminal width) and previews fill the row.
- **Reliable copying.** On a local Mac it uses `pbcopy`. Over SSH, or elsewhere, it falls back to OSC 52.
- **Zero config, zero dependencies.** Drop in one file.

## Install

Clone into OpenCode's global plugin directory. OpenCode discovers it automatically.

```sh
git clone https://github.com/kabeero/opencode-copy-message-v2 ~/.config/opencode/plugins/copy-message
```

If you set `$XDG_CONFIG_HOME`, use `$XDG_CONFIG_HOME/opencode/plugins/copy-message` instead.

Then run `/reload` in OpenCode, or restart it. Confirm it loaded with `opencode plugin list`.

To update, `git pull` inside that folder and `/reload`. To remove, delete the folder.

## Usage

| How | What |
| --- | --- |
| Your leader key, then `Shift+Y` | Open the picker |
| `/copy-message` | Open the picker from the prompt |
| `Ctrl+P`, then "Copy message from history" | Open it from the command palette |

In the picker: type to search, arrow keys to move, `Enter` to copy, `Esc` to cancel. A toast confirms the copy.

OpenCode's built-in "Copy last assistant message" command is unchanged. This plugin doesn't touch it.

## Customize

Edit `tui.ts`.

- **Key binding:** change `bind: "<leader>shift+y"` near the bottom.
- **Width:** `DIALOG_SIZE` and `DIALOG_COLUMNS` at the top. `"large"` is 88 columns and `"xlarge"` is 116 (set `DIALOG_COLUMNS` to match). The default dialog is 60.
- **Role labels:** `labelOf()` returns `me` and `ai`. They should be the same length so the columns align. If you change the length, update `ROLE_WIDTH`.
- **Role colors:** `humanColor` and `robotColor` read `text.feedback.info.base` and `text.feedback.success.base` from the theme. Any token under `context.theme.text` works.

## Compared to the v1 plugin

This is a rewrite of the idea behind [`opencode-copy-message`](https://www.npmjs.com/package/opencode-copy-message) by jeromepo, which targets OpenCode 1.x. V1 plugins don't run on OpenCode v2, because the plugin API changed. This version uses the v2 API (`@opencode/plugin/tui`).

| | v1 plugin | this plugin |
| --- | --- | --- |
| OpenCode version | 1.18.x | v2 |
| Setup | npm install, plus an entry and options in `tui.json` | clone one folder |
| Dependencies | `@opentui/*`, `@opencode-ai/plugin` | none |
| Picker rows | `N. role` plus the first line | message, time, role |
| Colors | none | per role, from the theme |
| Clipboard | OSC 52 | `pbcopy` on local macOS, OSC 52 otherwise |

**Not included.** The v1 plugin also has a transcript popup, "open transcript in `nvim`" and a mouse-capture toggle. This plugin only does the picker. OpenCode v2 already has built-in commands for copying the last reply and for exporting the session to your editor.

## Compatibility and limits

- Developed and tested on **macOS** with **OpenCode v2.2.5**.
- On Linux and Windows the plugin relies on **OSC 52**. Your terminal has to support it (WezTerm, Ghostty, kitty, iTerm2 and tmux generally do). A terminal that ignores OSC 52 may still show a success toast without copying. Contributions adding `wl-copy`, `xclip` or `clip.exe` fallbacks are welcome.
- Only message text is copied. Tool calls, reasoning blocks and attachments are skipped.
- The plugin uses some OpenCode internals that the v2 docs don't fully cover (for example, loading older message pages). If a future version changes them, the picker should fall back to the recent messages rather than break. Please open an issue if it doesn't.

## Credits

Inspired by [`opencode-copy-message`](https://www.npmjs.com/package/opencode-copy-message) by jeromepo (MIT). The code here is a v2 rewrite, not a port.

## License

[MIT](LICENSE)
