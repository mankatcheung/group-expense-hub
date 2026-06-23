import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary.js';

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders a generic message and a retry button', () => {
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error('boom')} reset={reset} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go Home' })).toBeInTheDocument();
  });

  it('calls reset when "Try Again" is clicked', () => {
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error('boom')} reset={reset} />);

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(reset).toHaveBeenCalled();
  });

  it('shows the error message in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    render(<ErrorBoundary error={new Error('specific failure')} reset={vi.fn()} />);

    expect(screen.getByText('specific failure')).toBeInTheDocument();
  });

  it('hides the error message outside development', () => {
    vi.stubEnv('NODE_ENV', 'production');
    render(<ErrorBoundary error={new Error('specific failure')} reset={vi.fn()} />);

    expect(screen.queryByText('specific failure')).not.toBeInTheDocument();
  });
});
