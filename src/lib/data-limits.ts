const maxScheduledExercisesPerDay = 100;
const maxTextLength = 200;

export const DATA_LIMITS = {
  maxBackupBytes: 2 * 1024 * 1024,
  maxExercises: 1_000,
  maxPrRecords: 1_000,
  maxPlans: 100,
  maxSetsPerExercise: 100,
  maxLogsPerExercise: 100,
  maxPlanWeeks: 520,
  maxScheduledExercisesPerDay,
  maxPlanExerciseSetCountEntries: 1_000,
  maxPrHistoryEntries: 60,
  maxIdentifierLength: 128,
  maxTextLength,
  maxScheduleDescriptionLength:
    maxScheduledExercisesPerDay * maxTextLength +
    (maxScheduledExercisesPerDay - 1) * 2,
  maxDateLength: 64,
} as const;

export const getUtf8ByteLength = (value: string): number => {
  let byteLength = 0;

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x7f) {
      byteLength += 1;
    } else if (codeUnit <= 0x7ff) {
      byteLength += 2;
    } else if (
      codeUnit >= 0xd800 &&
      codeUnit <= 0xdbff &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 &&
      value.charCodeAt(index + 1) <= 0xdfff
    ) {
      byteLength += 4;
      index += 1;
    } else {
      byteLength += 3;
    }
  }

  return byteLength;
};

export const isBoundedText = (value: unknown, maxLength: number): value is string =>
  typeof value === 'string' && value.length <= maxLength;

export const isBoundedArray = <T = unknown>(
  value: unknown,
  maxLength: number
): value is T[] => Array.isArray(value) && value.length <= maxLength;

export const isSafeIntegerInRange = (
  value: unknown,
  minimum: number,
  maximum: number
): value is number =>
  typeof value === 'number' &&
  Number.isSafeInteger(value) &&
  value >= minimum &&
  value <= maximum;
