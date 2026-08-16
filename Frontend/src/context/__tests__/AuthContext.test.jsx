import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import authApi from '../../services/authApi';

vi.mock('../../services/authApi', () => ({
  default: {
    login: vi.fn(),
  }
}));

const TestAuthConsumer = () => {
  const { user, login, logout } = useAuth();

  const handleLogin = async () => {
    await login('letan', 'pass@123', true);
  };

  return (
    <div>
      <div data-testid="user-role">{user ? user.role : 'GUEST'}</div>
      <div data-testid="user-name">{user ? user.name : 'NO_USER'}</div>
      <button onClick={handleLogin}>Login Receptionist</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('provides guest state initially when not logged in', () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-role')).toHaveTextContent('GUEST');
    expect(screen.getByTestId('user-name')).toHaveTextContent('NO_USER');
  });

  it('updates state upon user login and preserves role', async () => {
    authApi.login.mockResolvedValue({
      token: 'mock-jwt-token',
      user: { id: 1, name: 'Lê Ngọc Hân', role: 'RECEPTIONIST' }
    });

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Login Receptionist').click();
    });

    expect(screen.getByTestId('user-role')).toHaveTextContent('RECEPTIONIST');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Lê Ngọc Hân');
  });

  it('clears state upon logout', async () => {
    authApi.login.mockResolvedValue({
      token: 'mock-jwt-token',
      user: { id: 1, name: 'Lê Ngọc Hân', role: 'RECEPTIONIST' }
    });

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Login Receptionist').click();
    });
    expect(screen.getByTestId('user-role')).toHaveTextContent('RECEPTIONIST');

    act(() => {
      screen.getByText('Logout').click();
    });
    expect(screen.getByTestId('user-role')).toHaveTextContent('GUEST');
  });
});
