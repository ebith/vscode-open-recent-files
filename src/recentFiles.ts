export interface RecentFileUri {
  scheme: string;
  authority?: string;
  path: string;
  query?: string;
  fragment?: string;
}

export interface RecentFile {
  uri: RecentFileUri;
  remoteAuthority?: string;
}

/**
 * Extracts the file entries from the value returned by
 * `_workbench.getRecentlyOpened`. The command returns workspace entries in a
 * separate array, so only `files` has to be considered here.
 */
export function extractRecentFiles(value: unknown): RecentFile[] {
  if (!isRecord(value) || !Array.isArray(value.files)) {
    return [];
  }

  const seen = new Set<string>();
  const files: RecentFile[] = [];

  for (const entry of value.files) {
    if (!isRecord(entry)) {
      continue;
    }

    const uri = toUri(entry.fileUri);
    if (!uri || uri.scheme === 'untitled') {
      continue;
    }

    const key = uriKey(uri);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    const file: RecentFile = { uri };
    const remoteAuthority = toNonEmptyString(entry.remoteAuthority);
    if (remoteAuthority !== undefined) {
      file.remoteAuthority = remoteAuthority;
    }

    files.push(file);
  }

  return files;
}

function toUri(value: unknown): RecentFileUri | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const scheme = toNonEmptyString(value.scheme);
  const path = toNonEmptyString(value.path);
  if (scheme === undefined || !/^[a-zA-Z][a-zA-Z0-9+.-]*$/.test(scheme) || path === undefined) {
    return undefined;
  }

  const uri: RecentFileUri = { scheme, path };
  const authority = toNonEmptyString(value.authority);
  if (authority !== undefined) {
    uri.authority = authority;
  }

  const query = toNonEmptyString(value.query);
  if (query !== undefined) {
    uri.query = query;
  }

  const fragment = toNonEmptyString(value.fragment);
  if (fragment !== undefined) {
    uri.fragment = fragment;
  }

  return uri;
}

function uriKey(uri: RecentFileUri): string {
  let key = `${uri.scheme}://${uri.authority ?? ''}${uri.path}`;
  if (uri.query !== undefined) {
    key += `?${uri.query}`;
  }
  if (uri.fragment !== undefined) {
    key += `#${uri.fragment}`;
  }
  return key;
}

function toNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
