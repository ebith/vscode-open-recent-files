import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractRecentFiles } from '../src/recentFiles';

test('returns no files when the command result is malformed', () => {
  const values = [undefined, null, '', 42, {}, { files: null }, { files: 'not-an-array' }, { files: {} }];

  for (const value of values) {
    assert.deepEqual(extractRecentFiles(value), []);
  }
});

test('keeps files in the order VS Code returned them', () => {
  const result = extractRecentFiles({
    files: [
      { fileUri: { scheme: 'file', path: '/work/first.ts' }, remoteAuthority: 'ssh-remote+dev' },
      { fileUri: { scheme: 'file', authority: '', path: '/work/second.ts' } }
    ]
  });

  assert.deepEqual(result, [
    { uri: { scheme: 'file', path: '/work/first.ts' }, remoteAuthority: 'ssh-remote+dev' },
    { uri: { scheme: 'file', path: '/work/second.ts' } }
  ]);
});

test('preserves remote authorities, queries and fragments in file URIs', () => {
  const result = extractRecentFiles({
    files: [
      {
        fileUri: {
          scheme: 'vscode-remote',
          authority: 'ssh-remote+dev',
          path: '/root/src/main.ts',
          query: 'line=10',
          fragment: 'section'
        }
      }
    ]
  });

  assert.deepEqual(result, [
    {
      uri: {
        scheme: 'vscode-remote',
        authority: 'ssh-remote+dev',
        path: '/root/src/main.ts',
        query: 'line=10',
        fragment: 'section'
      }
    }
  ]);
});

test('skips entries without a usable file URI', () => {
  const result = extractRecentFiles({
    files: [
      null,
      {},
      { fileUri: null },
      { fileUri: 'file:///work/a.ts' },
      { fileUri: { scheme: 'file' } },
      { fileUri: { scheme: '', path: '/work/a.ts' } },
      { fileUri: { scheme: '1bad', path: '/work/a.ts' } },
      { fileUri: { scheme: 1, path: '/work/a.ts' } },
      { fileUri: { scheme: 'file', path: '' } },
      { fileUri: { scheme: 'file', path: 10 } }
    ]
  });

  assert.deepEqual(result, []);
});

test('skips untitled buffers', () => {
  const result = extractRecentFiles({
    files: [{ fileUri: { scheme: 'untitled', path: '/Untitled-1' } }]
  });

  assert.deepEqual(result, []);
});

test('removes duplicate URIs and keeps the first occurrence', () => {
  const result = extractRecentFiles({
    files: [
      { fileUri: { scheme: 'file', path: '/work/a.ts' }, remoteAuthority: 'first' },
      { fileUri: { scheme: 'file', authority: '', path: '/work/a.ts' }, remoteAuthority: 'second' }
    ]
  });

  assert.deepEqual(result, [
    { uri: { scheme: 'file', path: '/work/a.ts' }, remoteAuthority: 'first' }
  ]);
});

test('treats different queries and fragments as different files', () => {
  const result = extractRecentFiles({
    files: [
      { fileUri: { scheme: 'file', path: '/work/a.ts' } },
      { fileUri: { scheme: 'file', path: '/work/a.ts', query: 'line=1' } },
      { fileUri: { scheme: 'file', path: '/work/a.ts', fragment: 'section' } }
    ]
  });

  assert.deepEqual(result, [
    { uri: { scheme: 'file', path: '/work/a.ts' } },
    { uri: { scheme: 'file', path: '/work/a.ts', query: 'line=1' } },
    { uri: { scheme: 'file', path: '/work/a.ts', fragment: 'section' } }
  ]);
});

test('ignores workspace entries', () => {
  const result = extractRecentFiles({
    workspaces: [{ folderUri: { scheme: 'file', path: '/work' } }],
    files: [{ fileUri: { scheme: 'file', path: '/work/a.ts' } }]
  });

  assert.deepEqual(result, [{ uri: { scheme: 'file', path: '/work/a.ts' } }]);
});

test('accepts URI objects that contain extra properties', () => {
  const uri = {
    scheme: 'file',
    path: '/work/a.ts',
    authority: '',
    query: '',
    fragment: '',
    fsPath: '/work/a.ts',
    toString: () => 'file:///work/a.ts'
  };

  assert.deepEqual(extractRecentFiles({ files: [{ fileUri: uri }] }), [
    { uri: { scheme: 'file', path: '/work/a.ts' } }
  ]);
});

test('drops non-string remote authorities', () => {
  const result = extractRecentFiles({
    files: [{ fileUri: { scheme: 'file', path: '/work/a.ts' }, remoteAuthority: 42 }]
  });

  assert.deepEqual(result, [{ uri: { scheme: 'file', path: '/work/a.ts' } }]);
});
