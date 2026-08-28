import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActiveExceptions } from './ActiveExceptions';
import * as api from '../services/api';

describe('ActiveExceptions Component', () => {
  const mockGeneralInfo = {
    id: 'general_info_doc',
    type: 'general_info',
    orariFormia: {
      defaults: [],
      overrides: [
        {
          id: 'ovr-past',
          dateFrom: '2020-01-01',
          dateTo: '2020-01-01',
          closed: true,
        },
        {
          id: 'ovr-future-formia',
          dateFrom: '2099-12-24',
          dateTo: '2099-12-25',
          closed: true,
        },
        {
          id: 'ovr-today-formia',
          dateFrom: new Date().toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '13:00',
          closed: false,
        },
      ],
    },
    orariSecondoStudio: {
      defaults: [],
      overrides: [
        {
          id: 'ovr-future-secondo',
          dateFrom: '2099-12-31',
          startTime: '15:00',
          endTime: '19:00',
          closed: false,
        },
      ],
    },
  };

  beforeEach(() => {
    vi.spyOn(api, 'fetchPublicContent').mockResolvedValue(mockGeneralInfo);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders active exceptions correctly filtering out past ones', async () => {
    render(<ActiveExceptions selectedStudio="orariFormia" />);

    expect(screen.getByText(/Caricamento eccezioni attive/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Caricamento eccezioni attive/i)).not.toBeInTheDocument();
    });

    // Formia has 2 active overrides (today + future), past one should NOT be rendered
    expect(screen.getByText('Eccezioni Orarie Attive')).toBeInTheDocument();
    expect(screen.getByText(/Chiuso/i)).toBeInTheDocument();
    expect(screen.getByText(/09:00 - 13:00/i)).toBeInTheDocument();

    // Total count badge is 2 (2 in Formia)
    expect(screen.getByText('2 attive')).toBeInTheDocument();
  });

  it('switches between studio tabs and displays their respective overrides', async () => {
    render(<ActiveExceptions selectedStudio="orariFormia" />);

    await waitFor(() => {
      expect(screen.queryByText(/Caricamento eccezioni attive/i)).not.toBeInTheDocument();
    });

    // Click on Secondo Studio tab
    const secondoTab = screen.getByRole('button', { name: /2° Studio/i });
    fireEvent.click(secondoTab);

    // Should now show Secondo Studio override
    expect(screen.getByText(/15:00 - 19:00/i)).toBeInTheDocument();
  });

  it('toggles the 3-minute cache info banner when clicking info icon', async () => {
    render(<ActiveExceptions />);

    await waitFor(() => {
      expect(screen.queryByText(/Caricamento eccezioni attive/i)).not.toBeInTheDocument();
    });

    const infoBtn = screen.getByRole('button', { name: /Informazioni sulla cache del sito/i });
    
    // Initially hidden
    expect(screen.queryByText(/Nota di sincronizzazione:/i)).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(infoBtn);
    expect(screen.getByText(/Nota di sincronizzazione:/i)).toBeInTheDocument();
    expect(screen.getByText(/3 minuti/i)).toBeInTheDocument();

    // Click close button inside banner
    const closeBtn = screen.getByRole('button', { name: /Chiudi avviso/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Nota di sincronizzazione:/i)).not.toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    vi.spyOn(api, 'fetchPublicContent').mockRejectedValueOnce(new Error('Network error'));

    render(<ActiveExceptions />);

    await waitFor(() => {
      expect(screen.getByText(/Impossibile recuperare le eccezioni attive/i)).toBeInTheDocument();
    });
  });

  it('re-fetches when refreshTrigger changes', async () => {
    const { rerender } = render(<ActiveExceptions refreshTrigger={0} />);

    await waitFor(() => {
      expect(api.fetchPublicContent).toHaveBeenCalledTimes(1);
    });

    rerender(<ActiveExceptions refreshTrigger={1} />);

    await waitFor(() => {
      expect(api.fetchPublicContent).toHaveBeenCalledTimes(2);
    });
  });
});
