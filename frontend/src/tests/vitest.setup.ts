import { vi } from 'vitest';

// Minimal jest shim for projects migrated to Vitest that still use jest.fn() in mocks
// This exposes a global `jest` object with common helpers mapped to Vitest's `vi`.

;(globalThis as any).jest = {
  fn: vi.fn,
  spyOn: vi.spyOn,
  clearAllMocks: vi.clearAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
  // add more adapters if your tests use them
};
