export const ContestStatus = {
    DRAFT: "draft",
    RUNNING: "running",
    PAUSED: "paused",
    ENDED: "ended"
} as const;
export type ContestStatus = (typeof ContestStatus)[keyof typeof ContestStatus];

export const ParticipantStatus = {
    CODING: "coding",
    IDLE: "idle",
    SUBMITTED: "submitted",
    OFFLINE: "offline",
    ONLINE: "online",
    UNJOINED: "unjoined"
} as const;
export type ParticipantStatus = (typeof ParticipantStatus)[keyof typeof ParticipantStatus];

export interface ContestInfo {
    _id: string;
    contestCode: string;
    name: string;
    duration: number;
    status: ContestStatus;
    startedAt?: string;
    intendedEndTime?: string;
    problemIds: { _id: string; title: string; difficulty: string }[];
}
