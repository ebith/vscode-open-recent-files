import * as vscode from 'vscode';
import { extractRecentFiles, type RecentFile } from './recentFiles';

// VS Code does not expose its recent-file history through the public API.
const GET_RECENTLY_OPENED = '_workbench.getRecentlyOpened';
const ADD_TO_RECENTLY_OPENED = '_workbench.addToRecentlyOpened';

interface RecentFileQuickPickItem extends vscode.QuickPickItem {
  resourceUri: vscode.Uri;
  recentFile: RecentFile;
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(vscode.commands.registerCommand('openRecentFiles.open', openRecentFiles));
}

async function openRecentFiles(): Promise<void> {
  let commandResult: unknown;
  try {
    commandResult = await vscode.commands.executeCommand(GET_RECENTLY_OPENED);
  } catch (error) {
    void vscode.window.showErrorMessage(
      `Could not read VS Code's recently opened files: ${toErrorMessage(error)}`
    );
    return;
  }

  const files = extractRecentFiles(commandResult);
  if (files.length === 0) {
    await showNoRecentFilesMessage();
    return;
  }

  const selected = await pickRecentFile(files);
  if (selected) {
    await openRecentFile(selected);
  }
}

async function pickRecentFile(files: RecentFile[]): Promise<RecentFile | undefined> {
  const quickPick = vscode.window.createQuickPick<RecentFileQuickPickItem>();
  const items: RecentFileQuickPickItem[] = files.map((recentFile) => ({
    label: '',
    resourceUri: vscode.Uri.from(recentFile.uri),
    iconPath: vscode.ThemeIcon.File,
    recentFile
  }));

  quickPick.title = 'Open Recent Files';
  quickPick.placeholder = 'Type to filter recently opened files';
  quickPick.matchOnDescription = true;
  quickPick.items = items;
  const firstItem = items[0];
  if (firstItem) {
    quickPick.activeItems = [firstItem];
  }

  // Implemented by VS Code's QuickPick but missing from the stable typings.
  // Without it, typing re-sorts matches by label instead of recency.
  (quickPick as typeof quickPick & { sortByLabel: boolean }).sortByLabel = false;

  try {
    return await new Promise<RecentFile | undefined>((resolve) => {
      quickPick.onDidAccept(() => resolve(
        quickPick.activeItems[0]?.recentFile ?? quickPick.selectedItems[0]?.recentFile
      ));
      quickPick.onDidHide(() => resolve(undefined));
      quickPick.show();
    });
  } finally {
    quickPick.dispose();
  }
}

async function openRecentFile(file: RecentFile): Promise<void> {
  const uri = vscode.Uri.from(file.uri);
  try {
    await vscode.commands.executeCommand('vscode.open', uri, { preview: false });
  } catch (error) {
    void vscode.window.showErrorMessage(`Could not open ${uri.toString()}: ${toErrorMessage(error)}`);
    return;
  }

  // Opening a file with vscode.open does not update VS Code's Open Recent
  // list, so the next invocation would otherwise show stale order.
  try {
    await vscode.commands.executeCommand(ADD_TO_RECENTLY_OPENED, {
      uri,
      type: 'file',
      remoteAuthority: file.remoteAuthority
    });
  } catch {
    // The file opened; failing to reorder the history is harmless.
  }
}

async function showNoRecentFilesMessage(): Promise<void> {
  const openFileAction = 'Open File...';
  const selected = await vscode.window.showInformationMessage(
    'No recently opened files found.',
    openFileAction
  );

  if (selected === openFileAction) {
    try {
      await vscode.commands.executeCommand('workbench.action.files.openFile');
    } catch {
      // The built-in command may be unavailable in some hosts.
    }
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
