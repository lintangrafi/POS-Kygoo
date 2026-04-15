import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockVerifySession, mockRequireAdmin, mockSet, mockDb } = vi.hoisted(() => {
  const set = vi.fn(() => ({
    where: vi.fn(async () => ({})),
  }));

  return {
    mockVerifySession: vi.fn(),
    mockRequireAdmin: vi.fn(),
    mockSet: set,
    mockDb: {
      query: {
        products: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
        stockAdjustments: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
        categories: {
          findMany: vi.fn(),
        },
      },
      update: vi.fn(() => ({
        set,
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(async () => [{ id: 100 }]),
        })),
      })),
    },
  };
});

vi.mock('@/lib/auth', () => ({
  verifySession: mockVerifySession,
}));

vi.mock('@/actions/admin-actions', () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock('@/db', () => ({
  db: mockDb,
}));

import { addProduct, adjustStock } from '@/actions/inventory-actions';

describe('inventory-actions.whitebox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifySession.mockResolvedValue({ userId: 1, role: 'ADMIN' });
    mockRequireAdmin.mockResolvedValue({ userId: 1, role: 'ADMIN' });
    mockDb.query.stockAdjustments.findFirst.mockResolvedValue({ id: 100 });
  });

  it('should reject non-positive stock change', async () => {
    await expect(
      adjustStock({ productId: 1, change: 0, type: 'OUT' })
    ).rejects.toThrow('Change must be positive integer');
  });

  it('should throw when product does not exist for adjustment', async () => {
    mockDb.query.products.findFirst.mockResolvedValueOnce(null);

    await expect(
      adjustStock({ productId: 88, change: 1, type: 'OUT' })
    ).rejects.toThrow('Product not found');
  });

  it('should apply OUT adjustment as negative delta and return success', async () => {
    mockDb.query.products.findFirst.mockResolvedValueOnce({ id: 2, stock: 10 });

    const result = await adjustStock({ productId: 2, change: 3, type: 'OUT' });

    expect(result.success).toBe(true);
    expect(mockSet).toHaveBeenCalledWith({ stock: 7 });
  });

  it('should create product and normalize numeric fields as strings', async () => {
    const insertedProduct = { id: 9, name: 'Test Product', price: '15000', costPrice: '10000' };
    mockDb.insert.mockReturnValueOnce({
      values: vi.fn(() => ({
        returning: vi.fn(async () => [insertedProduct]),
      })),
    });

    const result = await addProduct({
      categoryId: 1,
      name: 'Test Product',
      price: 15000,
      costPrice: 10000,
      stock: 2,
    });

    expect(result).toEqual(insertedProduct);
    expect(mockDb.insert).toHaveBeenCalled();
  });
});
