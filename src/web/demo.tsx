import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/components/App';
import { useData } from '@/lib/data';
import { useUI } from '@/lib/store';
import { demoFolders, demoPosts, demoTags } from './demo-data';
import '@/assets/styles.css';

/* The real dashboard on sample posts, with no login and nothing saved. */
useData.setState({
  demo: true,
  posts: demoPosts(),
  folders: demoFolders,
  tags: demoTags,
  sync: { status: 'idle', found: 14, added: 3, lastSyncAt: Date.now() - 2 * 3_600_000, lastAdded: 3 },
});
useUI.setState({ view: { kind: 'inbox' } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
