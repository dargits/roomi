import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AnimatedCounter } from '../AnimatedCounter';

describe('AnimatedCounter component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders counter with prefix and suffix', () => {
    render(<AnimatedCounter value={100} prefix="$" suffix=" VNĐ" duration={100} />);
    expect(screen.getByText(/\$/)).toBeInTheDocument();
  });

  it('uses custom formatter if provided', () => {
    const formatter = (val: number) => `Count: ${Math.round(val)}`;
    render(<AnimatedCounter value={50} formatter={formatter} duration={100} />);
    expect(screen.getByText(/count:/i)).toBeInTheDocument();
  });
});
