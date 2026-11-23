export type Session = { accessToken: string; refreshToken: string; expiresAt: number };
export type Tokens = { accessToken: string; refreshToken: string; expiresIn: number };
export type SessionStorage = {
  read: () => Promise<string | null>;
  write: (value: string | null) => Promise<void>;
};

export class SessionManager {
  current: Session | null = null;
  private revision = 0;
  private writes: Promise<void> = Promise.resolve();
  private refreshing: Promise<string | null> | null = null;
  private listeners = new Set<() => void>();

  constructor(
    private storage: SessionStorage,
    private refreshRequest: (token: string) => Promise<{ accessToken: string; expiresIn: number }>,
  ) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish() { this.listeners.forEach(listener => listener()); }

  private persist() {
    const value = this.current ? JSON.stringify(this.current) : null;
    this.writes = this.writes.catch(() => {}).then(() => this.storage.write(value));
    return this.writes;
  }

  async restore() {
    const revision = this.revision;
    try {
      const raw = await this.storage.read();
      if (revision !== this.revision || !raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved.accessToken !== 'string' || !saved.accessToken ||
          typeof saved.refreshToken !== 'string' || !saved.refreshToken ||
          !Number.isFinite(saved.expiresAt)) {
        await this.clear();
        return;
      }
      this.current = saved;
      this.publish();
    } catch {
      // Unavailable browser/device storage must not block the login screen.
      if (revision === this.revision) await this.clear().catch(() => {});
    }
  }

  async set(tokens: Tokens) {
    const revision = ++this.revision;
    this.refreshing = null;
    this.current = { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000 };
    // A storage failure must be visible to the person signing in.
    try {
      await this.persist();
    } catch (error) {
      if (revision === this.revision) {
        this.current = null;
        this.publish();
      }
      throw error;
    }
    this.publish();
  }

  clear() {
    this.revision++;
    this.current = null;
    this.refreshing = null;
    this.publish();
    return this.persist();
  }

  async accessToken() {
    if (!this.current) return null;
    return this.current.expiresAt <= Date.now() + 30_000
      ? this.refresh(this.current.accessToken) : this.current.accessToken;
  }

  async refresh(rejectedToken: string): Promise<string | null> {
    const saved = this.current;
    if (!saved) return null;
    if (saved.accessToken !== rejectedToken) return saved.accessToken;
    if (this.refreshing) return this.refreshing;
    const revision = this.revision;
    const pending = (async () => {
      try {
        const result = await this.refreshRequest(saved.refreshToken);
        if (revision !== this.revision) return null;
        this.current = { ...saved, accessToken: result.accessToken,
          expiresAt: Date.now() + result.expiresIn * 1000 };
        await this.persist();
        if (revision !== this.revision) return null;
        this.publish();
        return result.accessToken;
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (revision === this.revision &&
            ['TOKEN_EXPIRED', 'TOKEN_REVOKED', 'INVALID_CREDENTIALS', 'UNAUTHORIZED'].includes(code ?? '')) {
          await this.clear().catch(() => {});
        }
        // Network/server failures leave the saved session available for a retry.
        throw error;
      } finally {
        if (revision === this.revision) this.refreshing = null;
      }
    })();
    this.refreshing = pending;
    return pending;
  }
}
