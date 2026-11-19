# Open Recent Files

Open a file from VS Code's Open Recent history with a filterable Quick Pick.
The list is ordered by recency and contains files only; folders and workspaces are excluded.

## Usage

1. Run `File: Open Recent Files...` from the Command Palette.
2. Type part of a file name or path.
3. Press Enter to open the selected file in the current window.

No default keybinding is assigned.
To use `Ctrl+R`, add this to your `keybindings.json`:

```json
[
  {
    "key": "ctrl+r",
    "command": "openRecentFiles.open"
  },
  {
    "key": "ctrl+alt+r",
    "command": "workbench.action.openRecent",
    "when": "!terminalFocus"
  }
]
```

This moves the built-in Open Recent command to `Ctrl+Alt+R`.

## Notes

- This command mirrors Open Recent's file history.
  Files opened from the Explorer or Quick Open are not automatically added to that history, so they may not appear here.

## Development

```powershell
pnpm install
pnpm test
pnpm run compile
```

Press `F5` to launch an Extension Development Host.
