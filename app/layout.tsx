import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata={title:'DataMind AI — Turn data into decisions',description:'AI-powered analytics workspace for datasets and business insights.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
