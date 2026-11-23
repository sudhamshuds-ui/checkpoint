import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { DEFAULT_APP_URL } from './src/app-url';

const appOrigin = new URL(process.env.VITE_APP_URL || DEFAULT_APP_URL).origin;

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    // Public key only. It pins the extension ID so saved posts survive reinstalls and moving the folder.
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAldjm+IGNsl9vK5QTB1UKSo19juvz58BSDvfNftKT1jVX/I4xkyZEkCwwnSxzglzv7lfhRNSCH2FmuMi2MNE8tN5+sIbDlZ2Ay0j4a72F/D2CGV86hImMzDrYMvkIFPXNjJGVdddgzdm/T9N3WRDA1rnNCAjUE69bP+CfxckiITiu4h8h25jbAYqjp+JTsmGk9MTZaFRgedOv3CQJ+AyXdZ0LZl6xAnzkjTVghRypkeUhgOTp69xJaEzSyGkwqNND/KBY0Y4HuHYScd6z34JkyqJ9vveefCRYjfJLtYLKGEeKw+iSJdkBhllkExT1B5Ku7dWSufIp9WmHEcL4DS9cowIDAQAB',
    name: 'Checkpoint',
    description: 'Sort your X bookmarks into a calm, personal inspiration board.',
    permissions: ['storage', 'tabs', 'alarms'],
    host_permissions: ['https://x.com/*', 'https://twitter.com/*', 'https://*.supabase.co/*'],
    // Only the Checkpoint website may talk to the extension.
    externally_connectable: { matches: [`${appOrigin}/*`] },
    action: { default_title: 'Open Checkpoint' },
    commands: {
      _execute_action: {
        suggested_key: { default: 'Ctrl+Shift+O', mac: 'Command+Shift+O' },
        description: 'Open Checkpoint',
      },
    },
  },
});
