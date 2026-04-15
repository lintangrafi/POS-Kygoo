import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCookieStore } = vi.hoisted(() => ({
  mockCookieStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { createSession, decrypt, deleteSession, getSession } from '@/lib/auth';

describe('auth.whitebox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.get.mockReset();
    mockCookieStore.set.mockReset();
    mockCookieStore.delete.mockReset();
  });

  it('should return null when decrypt receives invalid token', async () => {
    const result = await decrypt('not-a-valid-jwt');

    expect(result).toBeNull();
  });

  it('should return null when no session cookie exists', async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const result = await getSession();

    expect(result).toBeNull();
    expect(mockCookieStore.get).toHaveBeenCalledWith('session');
  });

  it('should persist session cookie when createSession is called', async () => {
    await createSession({ userId: 1, name: 'Admin', role: 'ADMIN' });

    expect(mockCookieStore.set).toHaveBeenCalledTimes(1);
    const args = mockCookieStore.set.mock.calls[0];
    expect(args[0]).toBe('session');
    expect(typeof args[1]).toBe('string');
    expect(args[2]).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  });

  it('should delete session cookie on deleteSession', async () => {
    await deleteSession();

    expect(mockCookieStore.delete).toHaveBeenCalledWith('session');
  });
});
