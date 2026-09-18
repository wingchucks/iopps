export async function updateApplicationBatch(ids: string[], update: (id: string) => Promise<void>) {
  const results = await Promise.allSettled(ids.map(id => update(id)));
  return {
    saved: ids.filter((_, index) => results[index].status === "fulfilled"),
    failed: ids.filter((_, index) => results[index].status === "rejected"),
  };
}
