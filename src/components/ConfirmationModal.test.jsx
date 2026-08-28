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

  describe('Action: SET (Regression Tests)', () => {
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

    it('renders set proposal with modified hours correctly', () => {
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
      expect(screen.getByText('09:00 - 13:00')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Conferma e Salva/i })).toBeInTheDocument();
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
  });
});
