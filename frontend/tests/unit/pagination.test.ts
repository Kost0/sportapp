import { describe, expect, it, vi } from 'vitest';
import { ActivityPager } from '../../lib/activity-pager';
const row = (activityId: string) => ({ activityId });
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};

describe('activity pagination', () => {
  it('blocks repeated end-reached calls while refreshing and appends unique IDs', async () => {
    const first = deferred<{ items: { activityId: string }[]; total: number }>();
    const fetch = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce({ items: [row('b'), row('c')], total: 4 });
    const pager = new ActivityPager(fetch);
    const refreshing = pager.refresh();
    await pager.loadMore();
    await pager.loadMore();
    expect(fetch).toHaveBeenCalledTimes(1);
    first.resolve({ items: [row('a'), row('b')], total: 4 });
    await refreshing;
    await pager.loadMore();
    expect(pager.snapshot().items).toEqual([row('a'), row('b'), row('c')]);
    expect(fetch.mock.calls[1][0]).toBe(2);
    expect(pager.snapshot().hasMore).toBe(false);
  });
  it('ignores stale responses when refresh overtakes pagination', async () => {
    const old = deferred<{ items: { activityId: string }[]; total: number }>();
    const fetch = vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce({ items: [row('new')], total: 1 });
    const pager = new ActivityPager(fetch);
    const stale = pager.refresh();
    await pager.refresh();
    old.resolve({ items: [row('old')], total: 50 });
    await stale;
    expect(pager.snapshot().items).toEqual([row('new')]);
    expect(fetch.mock.calls[0][1].aborted).toBe(true);
  });
  it('replaces the first page and retries failed pagination without skipping rows', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ items: [row('a')], total: 2 })
      .mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ items: [row('b')], total: 2 })
      .mockResolvedValueOnce({ items: [row('new')], total: 1 });
    const pager = new ActivityPager(fetch);
    await pager.refresh(); await pager.loadMore(); await pager.loadMore();
    expect(fetch.mock.calls.map(call => call[0])).toEqual([0, 1, 1]);
    expect(pager.snapshot().items).toHaveLength(2);
    await pager.refresh();
    expect(pager.snapshot().items).toEqual([row('new')]);
  });
});
