"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InstallButton from "@/components/InstallButton";
import { DEMO_EXAMPLES, Analysis } from "@/lib/analyze";

export default function HomePage() {
  const [history, setHistory] = useState<Analysis[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Read history from localStorage
    try {
      const stored = localStorage.getItem("eljumush:history");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, 20));
        }
      }
    } catch (e) {
      console.warn("Could not read analysis history from localStorage:", e);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleClearHistory = () => {
    if (typeof window === "undefined") return;
    const confirmed = window.confirm("Вы действительно хотите удалить всю историю сохранённых анализов?");
    if (confirmed) {
      try {
        localStorage.removeItem("eljumush:history");
        setHistory([]);
      } catch (e) {
        console.warn("Could not clear localStorage history:", e);
      }
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Offline banner */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2 shadow-sm"
        >
          <svg
            className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-12.728 0m0 0l2.829-2.829m-2.829 2.829L3 21M8.464 15.536a5 5 0 010-7.072m0 0l2.829 2.829M1 1l22 22"
            />
          </svg>
          <div>
            <p className="font-semibold">Вы офлайн</p>
            <p className="mt-0.5">
              Анализ текста работает полностью автономно, но внешняя ссылка не откроется.
            </p>
          </div>
        </div>
      )}

      {/* Hero section */}
      <section className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="space-y-2">
          <span className="inline-block px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 rounded-full">
            Кыргызстан · Прозрачность вакансий
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
            Поймите реальные условия вакансии до отклика
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Проверьте оклад, периодичность выплат, график и скрытые платежи. Полностью автономный анализ по правилам без сторонних серверов и без ИИ.
          </p>
        </div>

        <Link
          href="/form"
          className="w-full min-h-[44px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-semibold text-sm sm:text-base shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>Проанализировать вакансию</span>
        </Link>

        <InstallButton />
      </section>

      {/* Demo Examples section (4 cards) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Примеры (ДЕМО)
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Готовые тексты для проверки
          </span>
        </div>

        <div className="space-y-2.5">
          {DEMO_EXAMPLES.slice(0, 4).map((demo, idx) => (
            <Link
              key={idx}
              href={`/form?demo=${idx}`}
              className="block p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 group"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  ДЕМО-пример #{idx + 1}
                </span>
                <span className="text-xs text-teal-700 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform font-medium">
                  Открыть →
                </span>
              </div>
              <h3 className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                {demo.title.replace(/^ДЕМО-пример \d+:\s*/, "")}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {demo.text}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* History section */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            История анализов
          </h2>
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline min-h-[36px] px-2 py-1 focus:outline-none focus:ring-2 focus:ring-rose-500 rounded"
            >
              Очистить историю
            </button>
          )}
        </div>

        {!mounted ? (
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
            Загрузка истории...
          </div>
        ) : history.length === 0 ? (
          <div className="p-6 rounded-xl bg-white dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-1">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Пока нет анализов
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Проверьте первую вакансию или откройте один из ДЕМО-примеров выше.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => {
              const unresolvedCount = item.fields.filter(
                (f) => f.status === "missing" || f.status === "ambiguous" || f.status === "contradiction"
              ).length;

              const positionField = item.fields.find((f) => f.key === "position");
              const titleText = positionField?.value || item.text.slice(0, 60).trim() + "...";

              const formattedDate = new Date(item.createdAt).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
              });

              return (
                <Link
                  key={item.id}
                  href={`/form?id=${item.id}`}
                  className="block p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 group"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <time dateTime={item.createdAt}>{formattedDate}</time>
                    <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                      Вопросов к условиям: {unresolvedCount}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                    {titleText}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {item.text.slice(0, 75)}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Transparency & Disclaimer footer */}
      <footer className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Важное примечание:
          </p>
          ElJumush анализирует текст объявления. Он не подтверждает личность работодателя и не гарантирует безопасность вакансии.
        </div>
      </footer>
    </div>
  );
}
