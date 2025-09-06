import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { App } from './App';

// Basic render smoke test (socket will attempt connection but that's fine for smoke)

describe('App component', () => {
  it('renders heading', () => {
    const { getByText } = render(<App />);
    expect(getByText(/Once A Liar/i)).toBeTruthy();
  });
});
