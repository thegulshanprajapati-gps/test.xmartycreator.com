import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers/app-providers';

export const metadata: Metadata = {
  title: 'Test Management System',
  description: 'Admin + Student test management experience',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var raw=localStorage.getItem('tms-theme-mode');if(!raw)return;var data=JSON.parse(raw);var theme=data&&data.state&&data.state.theme;if(theme==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}}catch(e){}})();",
          }}
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
