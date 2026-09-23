import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../Modal';

describe('Modal component', () => {
  it('does not render when isOpen=false', () => {
    render(
      <Modal isOpen={false} title="Tiêu đề Modal">
        <p>Nội dung modal</p>
      </Modal>
    );

    expect(screen.queryByText('Tiêu đề Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Nội dung modal')).not.toBeInTheDocument();
  });

  it('renders title and children when isOpen=true', () => {
    render(
      <Modal isOpen={true} title="Tiêu đề Modal">
        <p>Nội dung modal</p>
      </Modal>
    );

    expect(screen.getByText('Tiêu đề Modal')).toBeInTheDocument();
    expect(screen.getByText('Nội dung modal')).toBeInTheDocument();
  });

  it('calls onClose when clicking close button', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} title="Tiêu đề Modal" onClose={handleClose}>
        <p>Nội dung modal</p>
      </Modal>
    );

    const closeBtn = screen.getByRole('button');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
