import type { Exercise, PR, Settings, TrainingPlan } from '../types.ts';
import {
  DEFAULT_SETTINGS,
  normalizeExercisesForStorage,
  normalizePlansForStorage,
  normalizePrsForStorage,
  normalizeSettings,
  validateImportedBackup,
  type ImportedBackupData,
} from './backup.ts';
import { DATA_LIMITS, getUtf8ByteLength } from './data-limits.ts';
import {
  normalizeWorkoutDraftArray,
  type WorkoutDrafts,
} from './workout-drafts.ts';

export const WORKOUT_STATE_STORAGE_KEY = 'workout_state_v1';
const WORKOUT_STATE_VERSION = 1;

export const LEGACY_STORAGE_KEYS = {
  exercises: 'workout_exercises',
  prs: 'workout_prs',
  plans: 'workout_plans',
  activePlanId: 'workout_activePlanId',
  settings: 'workout_settings',
  drafts: 'workout_drafts',
} as const;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface WorkoutState extends ImportedBackupData {
  drafts: WorkoutDrafts;
}

type SaveFailure = { ok: false; error: string };
type SaveSuccess = { ok: true };
export type SaveWorkoutStateResult = SaveSuccess | SaveFailure;

export type WorkoutStateCommitResult =
  | { ok: true; state: WorkoutState; cleanupError?: string }
  | SaveFailure;

export interface LoadWorkoutStateResult {
  state: WorkoutState;
  storage?: StorageLike;
  recoveryError?: string;
  saveError?: string;
}

export type RecoveryLockEvent =
  | 'operation-failed'
  | 'import-succeeded'
  | 'overwrite-succeeded'
  | 'wipe-succeeded'
  | 'retry-load-succeeded';

export const resolveRecoveryLock = (
  locked: boolean,
  event: RecoveryLockEvent
): boolean => event === 'operation-failed' ? locked : false;

type CanonicalEnvelope = {
  version: 1;
  exercises: Exercise[];
  prs: PR[];
  plans: TrainingPlan[];
  activePlanId: string | null;
  settings: Settings;
  drafts: WorkoutDraft[];
};

type WorkoutDraft = WorkoutDrafts[string];

const errorMessage = (prefix: string, error: unknown) =>
  `${prefix}: ${error instanceof Error ? error.message : 'unknown error'}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const createDefaultWorkoutState = (
  starterExercises: Exercise[] = []
): WorkoutState => ({
  exercises: starterExercises.map((exercise) => ({
    ...exercise,
    logs: [...exercise.logs],
    lastLogs: exercise.lastLogs ? [...exercise.lastLogs] : undefined,
    recommended: exercise.recommended ? { ...exercise.recommended } : undefined,
  })),
  prs: [],
  plans: [],
  activePlanId: null,
  settings: { ...DEFAULT_SETTINGS },
  drafts: {},
});

const normalizeCompleteState = (value: unknown): WorkoutState | null => {
  try {
    if (!isRecord(value)) {
      return null;
    }
    let exercises = value.exercises;
    if (Array.isArray(exercises) && exercises.length <= DATA_LIMITS.maxExercises) {
      exercises = exercises.map((exercise) => {
        if (!isRecord(exercise)) return exercise;
        const normalizeLogs = (logs: unknown) =>
          Array.isArray(logs) && logs.length <= DATA_LIMITS.maxLogsPerExercise
            ? Array.from(logs, (log) => log === undefined ? null : log)
            : logs;
        return {
          ...exercise,
          logs: normalizeLogs(exercise.logs),
          ...(exercise.lastLogs === undefined
            ? {}
            : { lastLogs: normalizeLogs(exercise.lastLogs) }),
        };
      });
    }
    const candidate: Record<string, unknown> = { ...value, exercises };
    const primary = validateImportedBackup(candidate);
    if (!primary.ok) {
      return null;
    }
    const drafts = normalizeWorkoutDraftArray(candidate.drafts);
    if (!drafts) {
      return null;
    }
    return { ...primary.value, drafts };
  } catch {
    return null;
  }
};

const createEnvelope = (state: WorkoutState): CanonicalEnvelope => ({
  version: WORKOUT_STATE_VERSION,
  exercises: state.exercises,
  prs: state.prs,
  plans: state.plans,
  activePlanId: state.activePlanId,
  settings: state.settings,
  drafts: Object.values(state.drafts),
});

const prepareCanonicalState = (
  state: WorkoutState
): { ok: true; state: WorkoutState; raw: string } | SaveFailure => {
  try {
    const normalized = normalizeCompleteState(createEnvelope(state));
    if (!normalized) {
      return { ok: false, error: 'SAVE FAILED: current data is outside safe limits' };
    }
    const raw = JSON.stringify(createEnvelope(normalized));
    if (getUtf8ByteLength(raw) > DATA_LIMITS.maxBackupBytes) {
      return { ok: false, error: 'SAVE FAILED: current data exceeds 2 MiB limit' };
    }
    return { ok: true, state: normalized, raw };
  } catch (error) {
    return { ok: false, error: errorMessage('SAVE FAILED', error) };
  }
};

export const saveWorkoutState = (
  storage: StorageLike,
  state: WorkoutState
): SaveWorkoutStateResult => {
  const prepared = prepareCanonicalState(state);
  if (!prepared.ok) {
    return prepared;
  }
  try {
    storage.setItem(WORKOUT_STATE_STORAGE_KEY, prepared.raw);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage('SAVE FAILED', error) };
  }
};

const parseCanonical = (raw: string): WorkoutState | null => {
  if (getUtf8ByteLength(raw) > DATA_LIMITS.maxBackupBytes) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.version !== WORKOUT_STATE_VERSION) {
      return null;
    }
    return normalizeCompleteState(parsed);
  } catch {
    return null;
  }
};

const parseLegacyValue = <T>(
  raw: string | null,
  fallback: T,
  normalize: (value: unknown) => T | null
): T | null => {
  if (raw === null) return fallback;
  if (getUtf8ByteLength(raw) > DATA_LIMITS.maxBackupBytes) return null;
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
};

const readLegacyState = (
  storage: StorageLike,
  defaults: WorkoutState
): { state: WorkoutState; found: boolean } | null => {
  const raw = {
    exercises: storage.getItem(LEGACY_STORAGE_KEYS.exercises),
    prs: storage.getItem(LEGACY_STORAGE_KEYS.prs),
    plans: storage.getItem(LEGACY_STORAGE_KEYS.plans),
    activePlanId: storage.getItem(LEGACY_STORAGE_KEYS.activePlanId),
    settings: storage.getItem(LEGACY_STORAGE_KEYS.settings),
    drafts: storage.getItem(LEGACY_STORAGE_KEYS.drafts),
  };
  const found = Object.values(raw).some((value) => value !== null);
  const exercises = parseLegacyValue(raw.exercises, defaults.exercises, normalizeExercisesForStorage);
  const prs = parseLegacyValue(raw.prs, defaults.prs, normalizePrsForStorage);
  const plans = parseLegacyValue(raw.plans, defaults.plans, normalizePlansForStorage);
  const settings = parseLegacyValue(raw.settings, defaults.settings, normalizeSettings);
  let drafts: WorkoutDrafts | null = {};
  if (raw.drafts !== null) {
    if (getUtf8ByteLength(raw.drafts) > DATA_LIMITS.maxBackupBytes) return null;
    try {
      const parsed = JSON.parse(raw.drafts) as Record<string, unknown>;
      drafts = parsed.version === 1 ? normalizeWorkoutDraftArray(parsed.drafts) : null;
    } catch {
      drafts = null;
    }
  }
  if (!exercises || !prs || !plans || !settings || !drafts) {
    return null;
  }
  const activePlanId = raw.activePlanId;
  if (activePlanId !== null && activePlanId.length > DATA_LIMITS.maxIdentifierLength) {
    return null;
  }
  if (
    activePlanId !== null &&
    !plans.some((plan) => plan.id === activePlanId)
  ) {
    return { state: { exercises, prs, plans, activePlanId: null, settings, drafts }, found };
  }
  return { state: { exercises, prs, plans, activePlanId, settings, drafts }, found };
};

export const loadWorkoutState = (
  getStorage: () => StorageLike,
  defaults: WorkoutState = createDefaultWorkoutState()
): LoadWorkoutStateResult => {
  let storage: StorageLike;
  try {
    storage = getStorage();
  } catch (error) {
    return {
      state: defaults,
      recoveryError: errorMessage('STORAGE ACCESS FAILED', error),
    };
  }
  try {
    const canonicalRaw = storage.getItem(WORKOUT_STATE_STORAGE_KEY);
    if (canonicalRaw !== null) {
      const state = parseCanonical(canonicalRaw);
      return state
        ? { state, storage }
        : {
            state: defaults,
            storage,
            recoveryError: 'SAVED DATA COULD NOT BE READ. Import a backup or overwrite it with a wipe.',
          };
    }
    const legacy = readLegacyState(storage, defaults);
    if (!legacy) {
      return {
        state: defaults,
        storage,
        recoveryError: 'SAVED DATA COULD NOT BE READ. Import a backup or overwrite it with a wipe.',
      };
    }
    if (!legacy.found) {
      return { state: legacy.state, storage };
    }
    const migrated = saveWorkoutState(storage, legacy.state);
    return 'error' in migrated
      ? { state: legacy.state, storage, saveError: migrated.error }
      : { state: legacy.state, storage };
  } catch (error) {
    return {
      state: defaults,
      storage,
      recoveryError: errorMessage('STORAGE READ FAILED', error),
    };
  }
};

export const commitImportedWorkoutState = (
  storage: StorageLike,
  imported: ImportedBackupData
): WorkoutStateCommitResult => {
  const state = normalizeCompleteState({ ...imported, drafts: [] });
  if (!state) {
    return { ok: false, error: 'IMPORT FAILED: backup data is malformed' };
  }
  const saved = saveWorkoutState(storage, state);
  return 'error' in saved ? saved : { ok: true, state };
};

export const wipeWorkoutState = (
  storage: StorageLike,
  state: WorkoutState = createDefaultWorkoutState()
): WorkoutStateCommitResult => {
  const saved = saveWorkoutState(storage, state);
  if ('error' in saved) {
    return saved;
  }
  const cleanupFailures: string[] = [];
  for (const key of Object.values(LEGACY_STORAGE_KEYS)) {
    try {
      storage.removeItem(key);
    } catch {
      cleanupFailures.push(key);
    }
  }
  return cleanupFailures.length === 0
    ? { ok: true, state }
    : {
        ok: true,
        state,
        cleanupError: `LEGACY CLEANUP FAILED: ${cleanupFailures.join(', ')}`,
      };
};

export const exportWorkoutBackup = (
  state: WorkoutState,
  exportedAt: string
): { ok: true; json: string } | SaveFailure => {
  try {
    const normalized = normalizeCompleteState({ ...state, drafts: [] });
    if (!normalized) {
      return { ok: false, error: 'EXPORT FAILED: current data is outside safe limits' };
    }
    const json = JSON.stringify({
      version: 1,
      exportedAt,
      exercises: normalized.exercises,
      prs: normalized.prs,
      plans: normalized.plans,
      activePlanId: normalized.activePlanId,
      settings: normalized.settings,
    });
    if (getUtf8ByteLength(json) > DATA_LIMITS.maxBackupBytes) {
      return { ok: false, error: 'EXPORT FAILED: backup exceeds 2 MiB import limit' };
    }
    return { ok: true, json };
  } catch (error) {
    return { ok: false, error: errorMessage('EXPORT FAILED', error) };
  }
};

export const exportRawStoredData = (
  storage: StorageLike,
  exportedAt: string
): { ok: true; json: string } | SaveFailure => {
  try {
    const entries: Record<string, string> = {};
    const keys = [WORKOUT_STATE_STORAGE_KEY, ...Object.values(LEGACY_STORAGE_KEYS)];
    for (const key of keys) {
      const raw = storage.getItem(key);
      if (raw !== null) {
        entries[key] = raw;
      }
    }
    return {
      ok: true,
      json: JSON.stringify({ version: 1, exportedAt, entries }),
    };
  } catch (error) {
    return { ok: false, error: errorMessage('RAW RECOVERY EXPORT FAILED', error) };
  }
};
