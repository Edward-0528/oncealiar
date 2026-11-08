// global styles first so component CSS (same specificity) wins the cascade
import './styles/tokens.css';
import './styles/base.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import type { Transport } from './lib/transport';
import { createSocketTransport } from './lib/socketTransport';
import { applyTheme, loadTheme } from './lib/theme';
import { unlockAudio } from './lib/sound';
import { loadProfile } from './lib/profile';

applyTheme(loadTheme(), false);
window.addEventListener('pointerdown', unlockAudio, { once: true });

const params = new URLSearchParams(window.location.search);
const mockPhase = import.meta.env.DEV ? params.get('mock') : null;

if (mockPhase === 'characters') {
  // dev-only character gallery: every character × mood
  void import('./components/avatars/Gallery').then(({ CharacterGallery }) => {
    createRoot(document.getElementById('root')!).render(<CharacterGallery />);
  });
} else {
  const transportPromise: Promise<Transport> = mockPhase
    ? import('./lib/mock').then((m) => m.createMockTransport(mockPhase, params, loadProfile()))
    : Promise.resolve(createSocketTransport());
  void startApp(transportPromise);
}

async function startApp(transportPromise: Promise<Transport>) {
  const transport = await transportPromise;
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App transport={transport} />
    </React.StrictMode>
  );
}
