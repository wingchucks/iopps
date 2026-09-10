export async function assertLaunchAvailable(request: typeof fetch = fetch): Promise<void> {
  try {
    const response = await request('/api/launch-status', { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (!response.ok || (await response.json()).status !== 'active') throw new Error('Unavailable');
  } catch {
    throw new Error('IOPPS is temporarily unavailable. Keep your entered text and try again after maintenance.');
  }
}
