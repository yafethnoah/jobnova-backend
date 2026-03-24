export type ApplicationStatus = "saved" | "applied" | "interview" | "offer" | "rejected";
export type JobApplication = { id: string; company: string; role: string; status: ApplicationStatus; appliedAt?: string; followUpDate?: string; notes?: string; };
export type CreateJobApplicationPayload = { company: string; role: string; status: ApplicationStatus; appliedAt?: string; followUpDate?: string; notes?: string; };
