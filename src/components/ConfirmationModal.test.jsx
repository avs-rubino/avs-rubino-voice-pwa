import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmationModal } from './ConfirmationModal';

describe('ConfirmationModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ConfirmationModal
        isOpen={false}
        proposal={{ action: 'delete', date: '2026-08-25' }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  describe('Action: DELETE', () => {
    const deleteProposal = {
      action: 'delete',
      date: '2026-08-25',
    };

    it('renders delete badge, title and confirm button correctly', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          proposal={deleteProposal}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText('Conferma Eliminazione Eccezione')).toBeInTheDocument();
      expect(screen.getByText('Eliminazione / Ripristino Standard')).toBeInTheDocument();
      expect(screen.getByText('Data da Eliminare')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Conferma ed Elimina/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Annulla \/ Correggi/i })).toBeInTheDocument();

      // Ensure "Orari di Ricevimento" is NOT in the DOM
      expect(screen.queryByText(/Orari di Ricevimento/i)).not.toBeInTheDocument();
    });

    it('triggers onConfirm when clicking confirm button', () => {
      const handleConfirm = vi.fn();
      render(
        <ConfirmationModal
          isOpen={true}
          proposal={deleteProposal}
          onConfirm={handleConfirm}
          onCancel={vi.fn()}
        />
      );

      const confirmBtn = screen.getByRole('button', { name: /Conferma ed Elimina/i });
      fireEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    it('triggers onCancel when clicking cancel button', () => {
      const handleCancel = vi.fn();
      render(
        <ConfirmationModal
          isOpen={true}
          proposal={deleteProposal}
          onConfirm={vi.fn()}
          onCancel={handleCancel}
        />
      );

      const cancelBtn = screen.getByRole('button', { name: /Annulla \/ Correggi/i });
      fireEvent.click(cancelBtn);
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Action: SET (Regression Tests & Input Handling)', () => {
    const setOpenProposal = {
      action: 'set',
      dateFrom: '2026-12-25',
      dateTo: '2026-12-25',
      startTime: '09:00',
      endTime: '13:00',
      closed: false,
    };

    const setClosedProposal = {
      action: 'set',
      dateFrom: '2026-12-25',
      dateTo: '2026-12-26',
      closed: true,
    };

    const setIncompleteProposal = {
      action: 'set',
      dateFrom: '2026-12-25',
      closed: false,
    };

    it('renders set proposal with modified hours correctly with interactive inputs', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          proposal={setOpenProposal}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText('Conferma Eccezione Oraria')).toBeInTheDocument();
      expect(screen.getByText('Variazione Orario')).toBeInTheDocument();
      expect(screen.getByText('Data Interessata')).toBeInTheDocument();
      expect(screen.getByText('Orari di Ricevimento')).toBeInTheDocument();
      
      const startInput = screen.getByLabelText(/Orario di inizio/i);
      const endInput = screen.getByLabelText(/Orario di fine/i);
      expect(startInput).toHaveValue('09:00');
      expect(endInput).toHaveValue('13:00');
      
      const confirmBtn = screen.getByRole('button', { name: /Conferma e Salva/i });
      expect(confirmBtn).toBeEnabled();
    });

    it('renders set proposal with extraordinary closure correctly', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          proposal={setClosedProposal}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText('Conferma Eccezione Oraria')).toBeInTheDocument();
      expect(screen.getByText('Chiusura Straordinaria')).toBeInTheDocument();
      expect(screen.getByText('Periodo Interessato')).toBeInTheDocument();
      expect(screen.queryByText(/Orari di Ricevimento/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Conferma e Salva/i })).toBeInTheDocument();
    });

    it('omits startTime and endTime when confirming a closed proposal', () => {
      const handleConfirm = vi.fn();
      render(
        <ConfirmationModal
          isOpen={true}
          proposal={setClosedProposal}
          onConfirm={handleConfirm}
          onCancel={vi.fn()}
        />
      );

      const confirmBtn = screen.getByRole('button', { name: /Conferma e Salva/i });
      fireEvent.click(confirmBtn);

      expect(handleConfirm).toHaveBeenCalledTimes(1);
      const callArg = handleConfirm.mock.calls[0][0];
      expect(callArg.closed).toBe(true);
      expect(callArg.startTime).toBeUndefined();
      expect(callArg.endTime).toBeUndefined();
    });

    it('renders error alert banner when errorMessage prop is provided', () => {
      render(
        <ConfirmationModal
          isOpen={true}
          proposal={setClosedProposal}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
          errorMessage="Errore durante l'applicazione dell'orario"
        />
      );

      expect(screen.getByText(/Errore durante l'applicazione dell'orario/i)).toBeInTheDocument();
    });

    it('handles incomplete proposal: disables confirm button, displays warning, and enables on manual input', () => {
      const handleConfirm = vi.fn();
      render(
        <ConfirmationModal
          isOpen={true}
          proposal={setIncompleteProposal}
          onConfirm={handleConfirm}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText(/Orario Richiesto/i)).toBeInTheDocument();
      expect(screen.getByText(/Non è stato specificato alcun orario/i)).toBeInTheDocument();
      
      const confirmBtn = screen.getByRole('button', { name: /Conferma e Salva/i });
      expect(confirmBtn).toBeDisabled();

      const startInput = screen.getByLabelText(/Orario di inizio/i);
      fireEvent.change(startInput, { target: { value: '10:00' } });

      expect(confirmBtn).toBeEnabled();

      fireEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);
      expect(handleConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: '2026-12-25',
          startTime: '10:00',
        })
      );
    });
  });
});
