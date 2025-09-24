import '@testing-library/jest-dom';
import { vi, afterAll } from 'vitest';

// Create a mock supabase client
const createMockSupabaseClient = () => ({
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        is: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn(() => ({ data: [], error: null }))
        })),
        match: vi.fn(() => ({
          is: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    }))
  })),
  auth: {
    getUser: vi.fn().mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } }, 
      error: null 
    })
  }
});

// Mock the supabase module
vi.mock('./src/lib/supabase', () => ({
  supabase: createMockSupabaseClient(),
}));

// Mock matchMedia for Jest environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.alert for tests
global.alert = vi.fn();

// Mock console methods to reduce noise in tests (except when testing error handling)
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

// Suppress console output during tests unless specifically testing it
console.error = vi.fn();
console.warn = vi.fn();
console.log = vi.fn();

// Restore original methods after all tests (for debugging if needed)
afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
  console.log = originalLog;
});