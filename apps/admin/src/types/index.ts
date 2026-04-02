export const ContestStatusEnum = {
  running: 'running',
  ended: 'ended',
  draft: 'draft',
  paused: 'paused',
} as const;

export type ContestStatusEnum = typeof ContestStatusEnum[keyof typeof ContestStatusEnum];
