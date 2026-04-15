import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockVerifySession, mockDb } = vi.hoisted(() => ({
  mockVerifySession: vi.fn(),
  mockDb: {
    query: {
      orders: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      users: {
        findMany: vi.fn(),
      },
      products: {
        findMany: vi.fn(),
      },
      auditLogs: {
        findMany: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => ({})),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(async () => ({})),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async () => ({})),
    })),
  },
}));

vi.mock('@/lib/auth', () => ({
  verifySession: mockVerifySession,
}));

vi.mock('@/db', () => ({
  db: mockDb,
}));

import { deleteOrder, requireAdmin, voidOrder } from '@/actions/admin-actions';

describe('admin-actions.whitebox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw not authorized when role is CASHIER', async () => {
    mockVerifySession.mockResolvedValue({ userId: 2, role: 'CASHIER' });

    await expect(requireAdmin()).rejects.toThrow('Not authorized');
  });

  it('should return session for ADMIN role', async () => {
    const session = { userId: 1, role: 'ADMIN' };
    mockVerifySession.mockResolvedValue(session);

    await expect(requireAdmin()).resolves.toEqual(session);
  });

  it('should throw when voidOrder target does not exist', async () => {
    mockVerifySession.mockResolvedValue({ userId: 1, role: 'ADMIN' });
    mockDb.query.orders.findFirst.mockResolvedValueOnce(null);

    await expect(voidOrder(999)).rejects.toThrow('Order not found');
  });

  it('should mark order as VOID and write audit log', async () => {
    mockVerifySession.mockResolvedValue({ userId: 1, role: 'ADMIN' });
    mockDb.query.orders.findFirst.mockResolvedValueOnce({
      id: 10,
      status: 'COMPLETED',
      totalAmount: '120000',
    });

    const result = await voidOrder(10);

    expect(result).toEqual({ success: true });
    expect(mockDb.update).toHaveBeenCalledTimes(1);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });

  it('should throw when deleteOrder target does not exist', async () => {
    mockVerifySession.mockResolvedValue({ userId: 1, role: 'SUPERADMIN' });
    mockDb.query.orders.findFirst.mockResolvedValueOnce(null);

    await expect(deleteOrder(77)).rejects.toThrow('Order not found');
  });

  it('should delete linked records and return success', async () => {
    mockVerifySession.mockResolvedValue({ userId: 1, role: 'SUPERADMIN' });
    mockDb.query.orders.findFirst.mockResolvedValueOnce({
      id: 12,
      invoiceNumber: 'INV-12',
      totalAmount: '50000',
    });

    const result = await deleteOrder(12);

    expect(result).toEqual({ success: true });
    expect(mockDb.delete).toHaveBeenCalledTimes(3);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });
});
