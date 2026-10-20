"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  analyze,
  validate,
  DEMO_EXAMPLES,
  Analysis,
  FieldResult,
  Status
} from "@/lib/analyze";

interface ReportItem {
  id: string;
  analysisId: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
}

const REPORT_CATEGORIES = [
  "Вакансия устарела",
  "Условия изменились после отклика",
  "Просят деньги за трудоустройство",
  "Подозрение на фиктивную вакансию",
  "Другое"
];

function FormAndResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [demoIndex, setDemoIndex] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [copied, setCopied] = useState(false);

  // Report state
  const [reportCategory, setReportCategory] = useState(REPORT_CATEGORIES[0]);
  const [reportDescription, setReportDescription] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reports, setReports] = useState<ReportItem[]>([]);

  const formRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Handle URL query parameters (?demo=N or ?id=X)
  useEffect(() => {
    const demoParam = searchParams.get("demo");
    const idParam = searchParams.get("id");

    if (demoParam !== null) {
      const idx = parseInt(demoParam, 10);
      if (!isNaN(idx) && DEMO_EXAMPLES[idx]) {
        const demo = DEMO_EXAMPLES[idx];
        setText(demo.text);
        setSourceUrl(demo.sourceUrl || "");
        setIsDemo(true);
        setDemoIndex(idx);
        setValidationError(null);

        // Run validation & analysis if valid demo
        const err = validate(demo.text);
        if (err) {
          setValidationError(err);
          setAnalysis(null);
        } else {
          const res = analyze(demo.text, demo.sourceUrl);
          setAnalysis(res);
        }
      }
    } else if (idParam) {
      try {
        const stored = localStorage.getItem("eljumush:history");
        if (stored) {
          const list: Analysis[] = JSON.parse(stored);
          const found = list.find((item) => item.id === idParam);
          if (found) {
            setText(found.text);
            setSourceUrl(found.sourceUrl || "");
            setIsDemo(false);
            setDemoIndex(null);
            setAnalysis(found);
            setValidationError(null);
          }
        }
      } catch (err) {
        console.warn("Could not load analysis by id from localStorage:", err);
      }
    }
  }, [searchParams]);

  // Load existing reports
  useEffect(() => {
    try {
      const storedReports = localStorage.getItem("eljumush:reports");
      if (storedReports) {
        const parsed: ReportItem[] = JSON.parse(storedReports);
        if (Array.isArray(parsed)) {
          setReports(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not load reports from localStorage:", e);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const err = validate(text);
    if (err) {
      setValidationError(err);
      setAnalysis(null);
      return;
    }

    setValidationError(null);
    const result = analyze(text, sourceUrl);
    setAnalysis(result);

    // Save to history
    try {
      const stored = localStorage.getItem("eljumush:history");
      let list: Analysis[] = [];
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) list = parsed;
      }
      // Deduplicate by exact text
      list = list.filter((item) => item.text.trim() !== text.trim());
      list.unshift(result);
      localStorage.setItem("eljumush:history", JSON.stringify(list.slice(0, 20)));
    } catch (e) {
      console.warn("Could not save to history:", e);
    }

    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 120);
  };

  const handleClear = () => {
    setText("");
    setSourceUrl("");
    setValidationError(null);
    setAnalysis(null);
    setIsDemo(false);
    setDemoIndex(null);
    router.replace("/form");
  };

  const handleCopyQuestions = async () => {
    if (!analysis || analysis.questions.length === 0) return;
    const formatted = analysis.questions.map((q, idx) => `${idx + 1}. ${q}`).join("\n");

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formatted);
      } else {
        const ta = document.createElement("textarea");
        ta.value = formatted;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn("Failed to copy questions to clipboard:", err);
    }
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDescription.trim()) return;

    const newReport: ReportItem = {
      id: "rep_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      analysisId: analysis?.id || "unknown",
      category: reportCategory,
      description: reportDescription.trim(),
      status: "Получена",
      createdAt: new Date().toISOString()
    };

    try {
      const updated = [newReport, ...reports];
      localStorage.setItem("eljumush:reports", JSON.stringify(updated.slice(0, 50)));
      setReports(updated);
      setReportSuccess(true);
      setReportDescription("");
      setTimeout(() => setReportSuccess(false), 4000);
    } catch (err) {
      console.warn("Could not save report to localStorage:", err);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case "found":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            Указано в объявлении
          </span>
        );
      case "missing":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            Не указано
          </span>
        );
      case "ambiguous":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            Неоднозначно
          </span>
        );
      case "contradiction":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            Обнаружено противоречие
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Form section */}
      <div ref={formRef} className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Анализ текста вакансии
          </h1>
          {isDemo && demoIndex !== null && (
            <span className="px-2 py-1 rounded text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              ДЕМО-пример #{demoIndex + 1}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <label htmlFor="vacancy-text" className="font-semibold text-slate-800 dark:text-slate-200">
                Текст вакансии <span className="text-rose-500">*</span>
              </label>
              <span id="char-counter" className="tabular-nums">
                {text.length} симв.
              </span>
            </div>

            <textarea
              id="vacancy-text"
              name="vacancyText"
              rows={10}
              className="w-full min-h-[40vh] p-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              placeholder="Вставьте сюда полный текст объявления о работе (должность, зарплата, график, требования, контакты)..."
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (validationError) setValidationError(null);
                if (isDemo) setIsDemo(false);
              }}
              aria-describedby="char-counter error-message"
              required
            />

            {validationError && (
              <div
                id="error-message"
                role="alert"
                aria-live="polite"
                className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs sm:text-sm font-medium flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4 flex-shrink-0 text-rose-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {/* Optional Source URL */}
          <div className="space-y-1">
            <label htmlFor="source-url" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Ссылка на объявление (необязательно)
            </label>
            <input
              type="url"
              id="source-url"
              name="sourceUrl"
              placeholder="https://..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ссылка сохраняется как источник. Содержимое сайта не читается.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={!text.trim()}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <span>Проанализировать</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Очистить
            </button>
          </div>
        </form>
      </div>

      {/* Result view */}
      {analysis && (
        <div ref={resultRef} className="space-y-6 pt-4 border-t-2 border-slate-200 dark:border-slate-800">
          {/* Result Header */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Дата анализа:{" "}
                <time dateTime={analysis.createdAt} className="font-medium text-slate-700 dark:text-slate-300">
                  {new Date(analysis.createdAt).toLocaleString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </time>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                Метод: правила и шаблоны, без ИИ
              </span>
            </div>

            {analysis.sourceUrl && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Источник:{" "}
                <span className="text-teal-700 dark:text-teal-400 underline">
                  {analysis.sourceUrl}
                </span>
              </p>
            )}
          </div>

          {/* Red flags section (only if any) */}
          {analysis.redFlags.length > 0 && (
            <div
              className="p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-900 space-y-3"
              role="alert"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h2 className="text-sm font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wide">
                  Обратите внимание (красные флаги)
                </h2>
              </div>

              <div className="space-y-2">
                {analysis.redFlags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white dark:bg-slate-900/80 rounded-xl border border-rose-200 dark:border-rose-900/80 text-xs sm:text-sm space-y-1"
                  >
                    <p className="font-semibold text-rose-800 dark:text-rose-300">
                      {flag.title}
                    </p>
                    <blockquote className="italic text-slate-600 dark:text-slate-300 bg-rose-50/50 dark:bg-rose-950/30 p-2 rounded border-l-2 border-rose-400">
                      «{flag.quote}»
                    </blockquote>
                  </div>
                ))}
              </div>

              <p className="text-xs text-rose-700 dark:text-rose-300 italic pt-1">
                Это сигнал, который стоит проверить, а не доказательство мошенничества.
              </p>
            </div>
          )}

          {/* Fields analysis cards */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Результаты проверки по критериям
            </h2>

            <div className="space-y-3">
              {analysis.fields.map((field: FieldResult) => (
                <div
                  key={field.key}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      {field.label}
                    </span>
                    {getStatusBadge(field.status)}
                  </div>

                  {field.value && (
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {field.value}
                    </div>
                  )}

                  {field.quotes.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {field.quotes.map((q, qIdx) => (
                        <blockquote
                          key={qIdx}
                          className="text-xs italic text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border-l-2 border-slate-300 dark:border-slate-700"
                        >
                          «{q}»
                        </blockquote>
                      ))}
                    </div>
                  )}

                  {field.note && (
                    <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-900">
                      💡 {field.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Questions section */}
          {analysis.questions.length > 0 && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Вопросы работодателю
                </h2>
                <button
                  type="button"
                  onClick={handleCopyQuestions}
                  className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900 active:bg-teal-200 transition-colors inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  aria-label="Скопировать вопросы работодателю"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                  <span>Скопировать вопросы</span>
                </button>
              </div>

              <div aria-live="polite">
                {copied && (
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-medium rounded-lg text-center animate-fade-in">
                    ✓ Скопировано в буфер обмена!
                  </div>
                )}
              </div>

              <ol className="space-y-2 list-decimal list-inside text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {analysis.questions.map((q, idx) => (
                  <li key={idx} className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <span className="font-medium text-slate-900 dark:text-white">{q}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Report Problem section */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Сообщить о проблеме
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Если в вакансии обнаружены скрытые условия или подозрительные требования, вы можете сохранить обращение.
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label htmlFor="report-category" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Категория проблемы
                </label>
                <select
                  id="report-category"
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {REPORT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="report-desc" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Описание проблемы
                </label>
                <textarea
                  id="report-desc"
                  rows={3}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Опишите, что именно произошло или что вызвало подозрение..."
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!reportDescription.trim()}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 active:bg-slate-950 font-semibold text-xs sm:text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Отправить обращение
              </button>

              <div aria-live="polite">
                {reportSuccess && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg text-center">
                    ✓ Обращение успешно зарегистрировано в локальном хранилище.
                  </p>
                )}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                Жалоба — это повод для проверки, а не вердикт.
              </p>
            </form>

            {/* My Reports list */}
            {reports.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Мои обращения ({reports.length})
                </h3>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {reports.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {rep.category}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          {rep.status}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 line-clamp-2">
                        {rep.description}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(rep.createdAt).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Limitations block */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
            <span className="font-semibold">Ограничения инструмента:</span> Это анализ текста объявления. Он не подтверждает личность работодателя, регистрацию бизнеса и честность условий.
          </div>

          {/* Navigation and Action buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={scrollToForm}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-teal-600 dark:border-teal-500 text-teal-800 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950 font-medium text-xs sm:text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              Изменить текст
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 font-medium text-xs sm:text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Новый анализ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FormPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Загрузка страницы анализа...
        </div>
      }
    >
      <FormAndResultContent />
    </Suspense>
  );
}
