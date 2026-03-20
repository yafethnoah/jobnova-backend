import { apiRequest } from "@/src/api/client";
import { env } from "@/src/lib/env";
import { mockResourcesApi } from "@/src/mocks/mockResourcesApi";
import type { ResourceItem } from "@/src/features/resources/resources.types";

export const resourcesApi = {
  list(token: string | null) { return env.useMockApi ? mockResourcesApi.list() : apiRequest<ResourceItem[]>("/resources", { token }); }
};
