import {
  parseImportedBackupFile,
  type ImportValidationResult,
} from './backup.ts';
import { DATA_LIMITS, isSafeIntegerInRange } from './data-limits.ts';

export type BackupFileLike = {
  size: number;
};

export type BackupTextReader = (file: BackupFileLike) => Promise<string>;

const invalidResult = (error: string): ImportValidationResult => ({
  ok: false,
  error,
});

export const readImportedBackupFile = async (
  file: BackupFileLike,
  readText: BackupTextReader
): Promise<ImportValidationResult> => {
  if (!isSafeIntegerInRange(file.size, 0, Number.MAX_SAFE_INTEGER)) {
    return invalidResult('INVALID BACKUP FILE: file size is invalid');
  }

  if (file.size > DATA_LIMITS.maxBackupBytes) {
    return invalidResult('INVALID BACKUP FILE: file exceeds 2 MiB limit');
  }

  try {
    const raw = await readText(file);
    if (typeof raw !== 'string') {
      return invalidResult('BACKUP FILE READ FAILED: expected text content');
    }
    return parseImportedBackupFile(raw);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError'
    ) {
      return invalidResult('BACKUP FILE READ ABORTED');
    }

    const message = error instanceof Error ? error.message : 'unknown read error';
    return invalidResult(`BACKUP FILE READ FAILED: ${message}`);
  }
};
