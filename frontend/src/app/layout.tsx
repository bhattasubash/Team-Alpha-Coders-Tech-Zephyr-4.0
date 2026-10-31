import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

export const metadata: Metadata = {
  title: 'CIT Scheduler - Chilika Institute of Technology',
  description:
    'Campus timetable and venue-booking working instrument for Chilika Institute of Technology.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
