import { mockDelay } from "@/src/lib/mockDelay";
import { mockResources } from "@/src/mocks/mockData";
import type { ResourceItem } from "@/src/features/resources/resources.types";

export const mockResourcesApi = { async list(): Promise<ResourceItem[]> { await mockDelay(); return [...mockResources]; } };
