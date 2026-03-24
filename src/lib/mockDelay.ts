export async function mockDelay(ms = 350): Promise<void> { await new Promise((resolve) => setTimeout(resolve, ms)); }
