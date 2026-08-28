import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deleteScheduleOverrideFromBackend, fetchPublicContent } from './api';

describe('deleteScheduleOverrideFromBackend', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('throws error if token is missing', async () => {
    await expect(deleteScheduleOverrideFromBackend('2026-08-25', ''))
      .rejects.toThrow('Authentication token is required');
  });

  it('throws error if date is missing', async () => {
    await expect(deleteScheduleOverrideFromBackend('', 'fake-token'))
      .rejects.toThrow('Date parameter is required for deletion');
  });

  it('sends DELETE request with proper query params and Authorization header', async () => {
    const mockResponse = {
      success: true,
      message: 'Eliminate 1 eccezione/i',
      deletedCount: 1,
      date: '2026-08-25',
      clinicLocation: 'orariFormia',
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await deleteScheduleOverrideFromBackend('2026-08-25', 'fake-token-123', 'orariFormia');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];

    expect(url).toContain('/api/admin/content/override/by-date?clinicLocation=orariFormia&date=2026-08-25');
    expect(options.method).toBe('DELETE');
    expect(options.headers).toEqual({
      Authorization: 'Bearer fake-token-123',
    });
    expect(result).toEqual(mockResponse);
  });

  it('handles backend error responses correctly', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Parametri query non validi' }),
    });

    await expect(deleteScheduleOverrideFromBackend('2026-08-25', 'fake-token', 'orariFormia'))
      .rejects.toThrow('Errore Backend (HTTP 400): Parametri query non validi');
  });
});

describe('fetchPublicContent', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('fetches and returns the general_info content object on success', async () => {
    const mockGeneralInfo = {
      id: 'general_info_1',
      type: 'general_info',
      orariFormia: {
        defaults: [],
        overrides: [
          { id: '1', dateFrom: '2026-08-30', closed: true },
        ],
      },
      orariSecondoStudio: {
        defaults: [],
        overrides: [],
      },
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'gallery_1', type: 'gallery' },
        mockGeneralInfo,
      ],
    });

    const result = await fetchPublicContent();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/public/content');
    expect(result).toEqual(mockGeneralInfo);
  });

  it('handles HTTP error responses gracefully', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Database connection failed' }),
    });

    await expect(fetchPublicContent()).rejects.toThrow('Errore Backend (HTTP 500): Database connection failed');
  });

  it('throws an error if general_info is not found in backend payload', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'gallery_1', type: 'gallery' }],
    });

    await expect(fetchPublicContent()).rejects.toThrow("Contenuto 'general_info' non trovato nella risposta del backend.");
  });
});

