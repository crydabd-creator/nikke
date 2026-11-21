import type { Metadata } from 'next';
import './globals.css';
import './nikke-cards.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://oh-my-commander-nikke.crydabd.chatgpt.site'),
  title: '오!나의지휘관 — NIKKE 계정 관리',
  description: '내 기기에만 안전하게 저장하는 비공개 개인용 NIKKE 계정 관리 사이트',
  openGraph: {
    title: '오!나의지휘관 — NIKKE 계정 관리',
    description: '내 기기에만 안전하게 저장하는 비공개 개인용 NIKKE 계정 관리 사이트',
    images: [{ url: '/commander-cover.png', width: 2048, height: 768, alt: '오!나의지휘관 대문 이미지' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '오!나의지휘관 — NIKKE 계정 관리',
    description: '내 기기에만 안전하게 저장하는 비공개 개인용 NIKKE 계정 관리 사이트',
    images: ['/commander-cover.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
