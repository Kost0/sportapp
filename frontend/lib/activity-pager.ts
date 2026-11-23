type Item = { activityId: string };
type Page<T> = { items: T[] | null; total: number };
export type FeedState<T> = { items: T[]; loading: boolean; refreshing: boolean; hasMore: boolean; error: unknown };

export class ActivityPager<T extends Item> {
  private state: FeedState<T> = { items: [], loading: false, refreshing: false, hasMore: true, error: null };
  private offset = 0;
  private generation = 0;
  private controller?: AbortController;
  private listeners = new Set<() => void>();

  constructor(private fetchPage: (offset: number, signal: AbortSignal) => Promise<Page<T>>) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private update(patch: Partial<FeedState<T>>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  cancel = () => {
    this.generation++;
    this.controller?.abort();
    this.update({ loading: false, refreshing: false });
  };
  refresh = () => this.load(true);
  loadMore = () => {
    if (this.state.loading || this.state.refreshing || !this.state.hasMore) return Promise.resolve();
    return this.load(false);
  };

  private async load(replace: boolean) {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const generation = ++this.generation;
    const offset = replace ? 0 : this.offset;
    this.update({ loading: true, refreshing: replace, error: null });
    try {
      const result = await this.fetchPage(offset, controller.signal);
      if (generation !== this.generation) return;
      const incoming = result.items ?? [];
      const unique = new Map((replace ? [] : this.state.items).map(item => [item.activityId, item]));
      incoming.forEach(item => unique.set(item.activityId, item));
      this.offset = offset + incoming.length;
      this.update({ items: [...unique.values()], hasMore: incoming.length > 0 && this.offset < result.total });
    } catch (error) {
      if (generation === this.generation) this.update({ error });
    } finally {
      if (generation === this.generation) this.update({ loading: false, refreshing: false });
    }
  }
}
