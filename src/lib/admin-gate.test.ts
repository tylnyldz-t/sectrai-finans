import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  closeAdminGateSession,
  resolveAdminGateUser,
} from './admin-gate';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('shared admin gate client', () => {
  it('shows the authenticated gate identity instead of a domain demo identity', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      authenticated: true,
      email: 'admin@sectrai.com',
      name: 'Sectrai Yönetici',
      platformRole: 'ADMIN',
    }));

    const user = await resolveAdminGateUser({
      email: 'owner@demo.local',
      name: 'Demo Owner',
      platformRole: 'ADMIN',
    });

    expect(user).toMatchObject({
      email: 'admin@sectrai.com',
      name: 'Sectrai Yönetici',
      platformRole: 'ADMIN',
    });
  });

  it('closes the outer session with a same-origin POST', async () => {
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 303 }),
    );

    await closeAdminGateSession();

    expect(request).toHaveBeenCalledWith('/__admin-logout', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
      redirect: 'manual',
    }));
  });
});
