import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { Sheet } from './Sheet';

function Two({ a, b }: { a: boolean; b: boolean }) {
  return (
    <>
      <Sheet open={a} onClose={() => {}} title="A">
        a
      </Sheet>
      <Sheet open={b} onClose={() => {}} title="B">
        b
      </Sheet>
    </>
  );
}

describe('Sheet scroll lock', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('locks while open and unlocks on close', () => {
    const { rerender } = render(<Two a b={false} />);
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<Two a={false} b={false} />);
    expect(document.body.style.overflow).toBe('');
  });

  it('never leaves the page stuck when overlapping sheets close in any order', () => {
    const { rerender } = render(<Two a b={false} />);
    rerender(<Two a b />); // second sheet opens on top
    rerender(<Two a={false} b />); // first one closes first
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<Two a={false} b={false} />);
    expect(document.body.style.overflow).toBe('');
  });
});
