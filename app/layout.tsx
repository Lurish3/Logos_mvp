import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "ElJumush — прозрачные условия вакансий",
  description: "Инструмент проверки прозрачности условий вакансий в Кыргызстане. Анализ текста на основе правил без ИИ и внешних серверов.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ElJumush",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="max-w-md mx-auto min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] antialiased">
        <ServiceWorkerRegister />
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-lg p-1 -m-1"
            aria-label="На главную ElJumush"
          >
            <div
              className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white font-bold text-base shadow-sm"
              aria-hidden="true"
            >
              E
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                ElJumush
              </span>
              <span className="block text-[10px] uppercase font-semibold tracking-wider text-teal-700 dark:text-teal-400 leading-none">
                ЭлЖумуш
              </span>
            </div>
          </Link>
          <nav>
            <Link
              href="/form"
              className="text-xs font-medium px-3 py-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900 active:bg-teal-200 transition-colors inline-flex items-center min-h-[38px] focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              Анализ вакансии
            </Link>
          </nav>
        </header>

        <main className="flex-1 px-4 py-4">
          {children}
        </main>
      </body>
    </html>
  );
}
