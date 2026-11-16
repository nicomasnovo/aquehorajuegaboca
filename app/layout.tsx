import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata:Metadata={title:'¿A qué hora juega Boca? · Todos los torneos',description:'La agenda xeneize: partidos, competencias nacionales e internacionales y el camino de Boca en cada copa.',manifest:(process.env.GITHUB_PAGES==='true'?'/aquehorajuegaboca':'')+'/manifest.webmanifest',icons:{icon:(process.env.GITHUB_PAGES==='true'?'/aquehorajuegaboca':'')+'/images/boca.png',apple:(process.env.GITHUB_PAGES==='true'?'/aquehorajuegaboca':'')+'/images/boca.png'}};
export const viewport:Viewport={themeColor:'#090f1c',viewportFit:'cover'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
