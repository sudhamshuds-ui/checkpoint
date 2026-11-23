import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    name: 'Checkpoint',
    description: 'Sort your X bookmarks into a calm, personal inspiration board.',
    permissions: ['storage', 'tabs'],
    host_permissions: ['https://x.com/*', 'https://twitter.com/*'],
    action: { default_title: 'Open Checkpoint' },
    commands: {
      _execute_action: {
        suggested_key: { default: 'Ctrl+Shift+O', mac: 'Command+Shift+O' },
        description: 'Open Checkpoint',
      },
    },
  },
});
