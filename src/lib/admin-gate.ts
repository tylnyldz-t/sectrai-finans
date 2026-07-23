export interface AdminGateSession {
  authenticated: true;
  email: string;
  name: string;
  platformRole: 'ADMIN';
}

interface DisplayUser {
  email: string;
  name?: string;
  platformRole?: string;
}

export async function readAdminGateSession(): Promise<AdminGateSession | null> {
  try {
    const response = await fetch('/__admin-session', {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return null;
    const value = await response.json() as Partial<AdminGateSession>;
    if (
      value.authenticated !== true
      || typeof value.email !== 'string'
      || typeof value.name !== 'string'
      || value.platformRole !== 'ADMIN'
    ) {
      return null;
    }
    return value as AdminGateSession;
  } catch {
    // Local development can run without Vercel Edge Middleware.
    return null;
  }
}

export async function resolveAdminGateUser<T extends DisplayUser>(
  user: T,
): Promise<T> {
  const session = await readAdminGateSession();
  if (!session) return user;
  return {
    ...user,
    email: session.email,
    name: session.name,
    platformRole: session.platformRole,
  };
}

export async function closeAdminGateSession(): Promise<void> {
  try {
    await fetch('/__admin-logout', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
      redirect: 'manual',
    });
  } catch {
    // The local token still has to be cleared when the network is unavailable.
  }
}
