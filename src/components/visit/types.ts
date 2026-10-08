import type { VisitEvent, WorkItem } from "@/db/schema";

export type TimelineEvent = Pick<VisitEvent, "id" | "kind" | "author" | "status" | "message" | "photoUrl" | "amount" | "data" | "createdAt">;
export type VisitWork = Pick<WorkItem, "id" | "name" | "category" | "type" | "cost" | "quantity" | "approved" | "partNumber" | "notes" | "receiptUrl">;
