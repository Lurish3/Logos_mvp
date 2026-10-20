export type Status = "found" | "missing" | "ambiguous" | "contradiction";

export type FieldResult = {
  key: string;
  label: string;
  status: Status;
  value: string | null;
  quotes: string[];
  note?: string;
};

export type Analysis = {
  id: string;
  createdAt: string;
  sourceUrl?: string;
  text: string;
  fields: FieldResult[];
  redFlags: { title: string; quote: string }[];
  questions: string[];
};

export interface DemoExample {
  title: string;
  text: string;
  sourceUrl?: string;
}

export const DEMO_EXAMPLES: DemoExample[] = [
  {
    title: "ДЕМО-пример 1: Подробная вакансия со всеми условиями",
    sourceUrl: "https://example.kg/jobs/101",
    text: `Требуется бариста-кассир в кофейню "Бишкек Кофе".
Зарплата: 35 000 сом в месяц. Выплаты два раза в месяц.
График работы: сменный график 2/2, с 08:00 до 20:00.
Обязанности: приготовление кофе и напитков по техкартам, расчет гостей на кассе, ведение кассовой дисциплины, поддержание чистоты барной зоны.
Требования: вежливость, пунктуальность, аккуратность, знание стандартов сервиса, наличие медкнижки.
Опыт работы: опыт от 1 года в кофейнях или предприятиях общепита.
Адрес: г. Бишкек, ул. Киевская, д. 120 (пересечение с ул. Тоголок Молдо).
Испытательный срок: стажировка 5 дней, полностью оплачивается работодателем.
Проживание: проживание не предоставляется.
Дополнительные расходы для соискателя: фирменная одежда и оформление медкнижки за счет компании, никаких взносов и плат не требуется.
Контакты для отклика: звонить или писать на WhatsApp +996 555 12-34-56.`
  },
  {
    title: "ДЕМО-пример 2: Вакансия с размытыми условиями",
    sourceUrl: "https://example.kg/jobs/102",
    text: "Требуется продавец. Зарплата до 40 000 сом. График обсуждается. Опыт приветствуется. Подробности по телефону: +996 700 98-76-54."
  },
  {
    title: "ДЕМО-пример 3: Вакансия с противоречиями",
    sourceUrl: "https://example.kg/jobs/103",
    text: `Срочно ищем менеджера по работе с клиентами в компанию в г. Бишкек.
Зарплата 30 000 сом на первый месяц, при этом в шапке указан фиксированный оклад 55 000 сом. Выплаты в месяц.
График работы: фиксированный 5/2, но при этом сменный график с дежурствами в выходные.
Обязанности: звонки клиентам, заключение договоров и ведение базы данных.
Требования: коммуникабельность, грамотная речь.
Опыт работы: берем без опыта, всему обучим. При этом обязателен опыт от 2 лет в активных продажах.
Адрес: г. Бишкек, район Азия Молл.
Испытательный срок: 2 месяца.
Проживание не предоставляется.
Дополнительные расходы: отсутствуют.
Контакт для связи: +996 770 44-55-66.`
  },
  {
    title: "ДЕМО-пример 4: Запрос денег и сомнительные требования",
    sourceUrl: "https://example.kg/jobs/104",
    text: `Срочно требуется удаленный оператор базы данных.
Зарплата от 75 000 сом в месяц, гарантированный доход без усилий с первого дня работы!
График работы гибкий, от 2 часов в день. Опыт работы: без опыта.
Обязанности: обработка входящих заявок и документов.
Внимание соискателям: перед получением доступа к базе требуется страховой взнос 1200 сом за предоставление материалов и лицензии. Оплата за оформление переводится на электронный кошелек куратора.
Для проверки вашей анкеты срочно отправьте паспорт в мессенджер WhatsApp: +996 999 00-11-22.`
  },
  {
    title: "ДЕМО-пример 5: Слишком короткий текст (ошибка)",
    text: "Требуется грузчик. Звонить срочно."
  }
];

export function validate(text: string): string | null {
  if (!text) {
    return "Введите текст объявления для анализа.";
  }

  const trimmed = text.trim();

  if (trimmed.length < 40) {
    return "Текст объявления слишком короткий (минимум 40 символов для анализа).";
  }

  // Letters check (Kyrgyz + Russian + Latin)
  const letters = trimmed.match(/[a-zA-Zа-яА-ЯёЁөүңӨҮҢ]/g) || [];
  if (letters.length < 10) {
    return "В тексте недостаточно буквенных символов (минимум 10 букв).";
  }

  // Repetition check: the same character repeated for most of the text
  const noSpace = trimmed.replace(/\s+/g, "");
  if (noSpace.length > 0) {
    const counts: Record<string, number> = {};
    for (const char of noSpace) {
      counts[char] = (counts[char] || 0) + 1;
    }
    const maxCount = Math.max(...Object.values(counts));
    if (maxCount > noSpace.length * 0.5) {
      return "Текст содержит повторяющиеся символы и не похож на объявление о вакансии.";
    }
  }

  return null;
}

function findExactMatches(text: string, regex: RegExp): { quote: string; index: number }[] {
  const flags = regex.flags.includes("g") ? regex.flags : regex.flags + "g";
  const rx = new RegExp(regex.source, flags);
  const results: { quote: string; index: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = rx.exec(text)) !== null) {
    if (match[0].length > 0) {
      const quote = text.substring(match.index, match.index + match[0].length);
      results.push({ quote, index: match.index });
    }
  }

  return results;
}

export function analyze(text: string, sourceUrl?: string): Analysis {
  const fields: FieldResult[] = [];
  const redFlags: { title: string; quote: string }[] = [];
  const questions: string[] = [];

  // ================= 1. ДОЛЖНОСТЬ =================
  const posRegex = /(?:требуется|ищем|вакансия|должность|на\s+позицию|открыта\s+вакансия)[:\s]+([^\n.,;!]+)/i;
  const posMatches = findExactMatches(text, posRegex);
  if (posMatches.length > 0) {
    const fullMatch = posMatches[0].quote;
    // Extract the title part while keeping quote exact
    fields.push({
      key: "position",
      label: "Должность",
      status: "found",
      value: fullMatch.trim(),
      quotes: [fullMatch]
    });
  } else {
    // Check first line for title-like patterns
    const firstLine = text.trim().split("\n")[0].trim();
    if (firstLine.length > 3 && firstLine.length < 60 && !/[0-9]{5,}/.test(firstLine)) {
      fields.push({
        key: "position",
        label: "Должность",
        status: "found",
        value: firstLine,
        quotes: [firstLine]
      });
    } else {
      fields.push({
        key: "position",
        label: "Должность",
        status: "missing",
        value: null,
        quotes: []
      });
      questions.push("На какую конкретно должность или специальность открыта вакансия?");
    }
  }

  // ================= 2. ЗАРПЛАТА =================
  // Patterns for salary
  const currencyPart = `(?:тыс(?:\\.|яч)?(?:\\s*(?:сом(?:а|ов)?|KGS|с\\b|\\.с))?|сом(?:а|ов)?|KGS|с\\b|\\.с)`;
  const upToRegex = new RegExp(
    `(?:(?:зарплат[а-я]*|оклад[а-я]*|доход[а-я]*|з\\/п|зп)\\s*(?:составляет|:)?\\s*до\\s+[0-9][0-9\\s.,]*(?:\\s*${currencyPart})?|до\\s+[0-9][0-9\\s.,]*\\s*${currencyPart})`,
    "i"
  );
  const fromRegex = new RegExp(
    `(?:(?:зарплат[а-я]*|оклад[а-я]*|доход[а-я]*|з\\/п|зп)\\s*(?:составляет|:)?\\s*от\\s+[0-9][0-9\\s.,]*(?:\\s*${currencyPart})?|от\\s+[0-9][0-9\\s.,]*\\s*${currencyPart})`,
    "i"
  );
  const rangeRegex = new RegExp(
    `(?:(?:зарплат[а-я]*|оклад[а-я]*|доход[а-я]*|з\\/п|зп)\\s*(?:составляет|:)?\\s*(?:от\\s+)?[0-9][0-9\\s.,]*(?:\\s*[-–—]|\\s+до\\s+)[0-9][0-9\\s.,]*(?:\\s*${currencyPart})?|(?:от\\s+)?[0-9][0-9\\s.,]*(?:\\s*[-–—]|\\s+до\\s+)[0-9][0-9\\s.,]*\\s*${currencyPart})`,
    "i"
  );
  const fixedSalaryRegex = /(?:оклад|зарплата|з\/п|зп|доход)?\s*(?:составляет|:)?\s*([0-9][0-9\s.,]*\s*(?:тыс(?:\.|яч)?)?\s*(?:сом(?:а|ов)?|KGS|с\b))/i;
  const salaryWordRegex = /(?:зарплата|з\/п|зп|оклад|доход)[:\s]+([^\n.;!]+)/i;

  const upToMatches = findExactMatches(text, upToRegex);
  const fromMatches = findExactMatches(text, fromRegex);
  const rangeMatches = findExactMatches(text, rangeRegex);
  const fixedMatches = findExactMatches(text, fixedSalaryRegex);
  const salaryWordMatches = findExactMatches(text, salaryWordRegex);

  // Check contradiction: two distinct declared salaries that conflict
  // E.g., "Зарплата 30 000 сом" and "оклад 55 000 сом"
  const salaryDeclRegex = /(?:зарплат[а-я]*|оклад[а-я]*|доход[а-я]*|ставка|з\/п|зп)[^.\n,;]{0,25}?([0-9]{1,3}(?:[ \u00a0][0-9]{3})+|[0-9]{4,6})\s*(?:сом(?:а|ов)?|KGS|с\b)/gi;
  const salaryDeclMatches = findExactMatches(text, salaryDeclRegex);
  const uniqueDeclaredSums = new Map<string, string>();
  for (const sm of salaryDeclMatches) {
    const digits = sm.quote.replace(/[^0-9]/g, "");
    if (!uniqueDeclaredSums.has(digits)) {
      uniqueDeclaredSums.set(digits, sm.quote);
    }
  }

  const hasRangePhrase = rangeMatches.length > 0;
  if (!hasRangePhrase && uniqueDeclaredSums.size >= 2) {
    const sums = Array.from(uniqueDeclaredSums.values());
    fields.push({
      key: "salary",
      label: "Зарплата",
      status: "contradiction",
      value: sums.join(" vs "),
      quotes: sums.slice(0, 2),
      note: "В тексте указаны несовпадающие суммы зарплаты (противоречивые условия)"
    });
    questions.push("Какая реальная гарантированная зарплата согласована для данной вакансии?");
  } else if (upToMatches.length > 0 && !hasRangePhrase && fromMatches.length === 0) {
    const q = upToMatches[0].quote;
    fields.push({
      key: "salary",
      label: "Зарплата",
      status: "ambiguous",
      value: q.trim(),
      quotes: [q],
      note: "Это верхняя граница, а не гарантированная сумма"
    });
    questions.push("Какая фиксированная часть зарплаты (оклад) гарантирована и от чего зависит остальная сумма?");
  } else if (hasRangePhrase) {
    const q = rangeMatches[0].quote;
    fields.push({
      key: "salary",
      label: "Зарплата",
      status: "found",
      value: q.trim(),
      quotes: [q],
      note: "Указан диапазон заработной платы"
    });
  } else if (fromMatches.length > 0) {
    const q = fromMatches[0].quote;
    fields.push({
      key: "salary",
      label: "Зарплата",
      status: "found",
      value: q.trim(),
      quotes: [q],
      note: "нижняя граница"
    });
  } else if (fixedMatches.length > 0) {
    const q = fixedMatches[0].quote;
    fields.push({
      key: "salary",
      label: "Зарплата",
      status: "found",
      value: q.trim(),
      quotes: [q]
    });
  } else if (salaryWordMatches.length > 0) {
    const q = salaryWordMatches[0].quote;
    const lower = q.toLowerCase();
    if (lower.includes("договор") || lower.includes("собеседован") || lower.includes("сдельн") || lower.includes("процент")) {
      fields.push({
        key: "salary",
        label: "Зарплата",
        status: "ambiguous",
        value: q.trim(),
        quotes: [q],
        note: "Сумма не зафиксирована, условия определяются по договорённости"
      });
      questions.push("Какая базовая ставка или фиксированный оклад предусмотрен до вычета процентов?");
    } else {
      fields.push({
        key: "salary",
        label: "Зарплата",
        status: "found",
        value: q.trim(),
        quotes: [q]
      });
    }
  } else {
    fields.push({
      key: "salary",
      label: "Зарплата",
      status: "missing",
      value: null,
      quotes: []
    });
    questions.push("Каков размер заработной платы и форма оплаты?");
  }

  // ================= 3. ПЕРИОД ВЫПЛАТЫ =================
  const periodRegex = /(?:в\s+месяц|в\s+день|за\s+смену|в\s+час|за\s+проект|еженедельно|раз\s+в\s+неделю|раз\s+в\s+месяц|два\s+раза\s+в\s+месяц|ежедневно|посменно|помесячно|каждую\s+неделю)/i;
  const periodMatches = findExactMatches(text, periodRegex);
  const salaryField = fields.find(f => f.key === "salary");
  const salaryExists = salaryField && salaryField.status !== "missing";

  if (periodMatches.length > 0) {
    const q = periodMatches[0].quote;
    fields.push({
      key: "pay_period",
      label: "Период выплаты",
      status: "found",
      value: q.trim(),
      quotes: [q]
    });
  } else {
    if (salaryExists) {
      fields.push({
        key: "pay_period",
        label: "Период выплаты",
        status: "missing",
        value: null,
        quotes: [],
        note: "Зарплата указана, но период и регулярность выплат не уточнены"
      });
      questions.push("С какой периодичностью выплачивается зарплата (два раза в месяц, раз в неделю или ежедневно)?");
    } else {
      fields.push({
        key: "pay_period",
        label: "Период выплаты",
        status: "missing",
        value: null,
        quotes: []
      });
    }
  }

  // ================= 4. ГРАФИК РАБОТЫ =================
  const scheduleFixedRegex = /\b(?:5\/2|2\/2|6\/1|1\/3|3\/3|с\s+9\s+до\s+18|с\s+0?8:00\s+до\s+20:00|с\s+[0-9]{1,2}(?::[0-9]{2})?\s+до\s+[0-9]{1,2}(?::[0-9]{2})?)\b/i;
  const scheduleShiftRegex = /(?:сменный\s+график|сменный|сменная\s+работа|день\s+через\s+день|ночные\s+смены|вахта|вахтовый)/i;
  const scheduleFlexibleRegex = /(?:гибкий\s+график|гибкий|свободный\s+график|удаленн(?:о|ая\s+работа)|дистанционн)/i;
  const scheduleAmbiguousRegex = /(?:график\s+обсуждается|по\s+договор[её]нности|договорный\s+график|время\s+обсуждается)/i;

  const fixMatches = findExactMatches(text, scheduleFixedRegex);
  const shiftMatches = findExactMatches(text, scheduleShiftRegex);
  const flexMatches = findExactMatches(text, scheduleFlexibleRegex);
  const ambigSchedMatches = findExactMatches(text, scheduleAmbiguousRegex);

  // Check contradiction: e.g. "5/2" AND "сменный график"
  const has52 = fixMatches.some(m => m.quote.includes("5/2") || m.quote.includes("6/1"));
  const hasShift = shiftMatches.length > 0;

  if (has52 && hasShift) {
    const q1 = fixMatches.find(m => m.quote.includes("5/2") || m.quote.includes("6/1"))!.quote;
    const q2 = shiftMatches[0].quote;
    fields.push({
      key: "schedule",
      label: "График работы",
      status: "contradiction",
      value: `${q1} / ${q2}`,
      quotes: [q1, q2],
      note: "В тексте одновременно указаны пятидневка и сменный график работы"
    });
    questions.push("Какой именно график предусмотрен: фиксированная пятидневка или сменный режим?");
  } else if (ambigSchedMatches.length > 0) {
    const q = ambigSchedMatches[0].quote;
    fields.push({
      key: "schedule",
      label: "График работы",
      status: "ambiguous",
      value: q.trim(),
      quotes: [q],
      note: "График не зафиксирован, условия оставлены на обсуждение"
    });
    questions.push("Какие конкретные часы работы и дни смен предполагаются на этой позиции?");
  } else if (fixMatches.length > 0 || shiftMatches.length > 0 || flexMatches.length > 0) {
    const foundQuotes = [...fixMatches, ...shiftMatches, ...flexMatches];
    const q = foundQuotes[0].quote;
    fields.push({
      key: "schedule",
      label: "График работы",
      status: "found",
      value: q.trim(),
      quotes: [q]
    });
  } else {
    fields.push({
      key: "schedule",
      label: "График работы",
      status: "missing",
      value: null,
      quotes: []
    });
    questions.push("Какой точный график работы (рабочие часы и выходные дни)?");
  }

  // ================= 5. ОБЯЗАННОСТИ =================
  const respRegex = /(?:обязанности|задачи|что\s+предстоит\s+делать|в\s+обязанности\s+входит|функции)[:\s]+([^\n]+(?:\n[^\n]+)?)/i;
  const respMatches = findExactMatches(text, respRegex);
  if (respMatches.length > 0) {
    const q = respMatches[0].quote;
    fields.push({
      key: "responsibilities",
      label: "Обязанности",
      status: "found",
      value: q.trim(),
      quotes: [q]
    });
  } else {
    // Check for common duty keywords: приготовление, расчет, уборка, звонки, продажи, консультирование
    const dutyActionsRegex = /(?:приготовление|расчет\s+гостей|консультирование|продажи|ведение\s+кассы|прием\s+звонков|обработка\s+заявок|доставка)/i;
    const dutyMatches = findExactMatches(text, dutyActionsRegex);
    if (dutyMatches.length > 0) {
      const q = dutyMatches[0].quote;
      fields.push({
        key: "responsibilities",
        label: "Обязанности",
        status: "found",
        value: q.trim(),
        quotes: [q]
      });
    } else {
      fields.push({
        key: "responsibilities",
        label: "Обязанности",
        status: "missing",
        value: null,
        quotes: []
      });
      questions.push("Какие конкретные должностные обязанности и задачи нужно выполнять ежедневно?");
    }
  }

  // ================= 6. ТРЕБОВАНИЯ =================
  const reqRegex = /(?:требования|от\s+вас|кого\s+мы\s+ищем|навыки|компетенции)[:\s]+([^\n]+(?:\n[^\n]+)?)/i;
  const reqMatches = findExactMatches(text, reqRegex);
  if (reqMatches.length > 0) {
    const q = reqMatches[0].quote;
    fields.push({
      key: "requirements",
      label: "Требования",
      status: "found",
      value: q.trim(),
      quotes: [q]
    });
  } else {
    const generalReqRegex = /(?:знание\s+[а-яa-z0-9]+|наличие\s+медкнижки|вежливость|пунктуальность|грамотная\s+речь)/i;
    const genMatches = findExactMatches(text, generalReqRegex);
    if (genMatches.length > 0) {
      const q = genMatches[0].quote;
      fields.push({
        key: "requirements",
        label: "Требования",
        status: "found",
        value: q.trim(),
        quotes: [q]
      });
    } else {
      fields.push({
        key: "requirements",
        label: "Требования",
        status: "missing",
        value: null,
        quotes: []
      });
      questions.push("Какие требования предъявляются к кандидату (образование, знание языков, специальные навыки)?");
    }
  }

  // ================= 7. ОПЫТ РАБОТЫ =================
  const noExpRegex = /(?:без\s+опыта|опыт\s+не\s+требуется|берем\s+без\s+опыта|можно\s+без\s+опыта)/i;
  const expWelcomeRegex = /(?:опыт\s+приветствуется|опыт\s+желателен|желателен\s+опыт|будет\s+плюсом)/i;
  const expRequiredRegex = /(?:опыт\s+(?:работы\s+)?от\s+[0-9]+\s*(?:года|лет|мес)|стаж\s+от\s+[0-9]+\s*(?:года|лет)|обязателен\s+опыт\s+от\s+[0-9]+)/i;

  const noExpMatches = findExactMatches(text, noExpRegex);
  const expWelcomeMatches = findExactMatches(text, expWelcomeRegex);
  const expRequiredMatches = findExactMatches(text, expRequiredRegex);

  // Check contradiction: both "без опыта" and "опыт от X лет"
  if (noExpMatches.length > 0 && expRequiredMatches.length > 0) {
    const q1 = noExpMatches[0].quote;
    const q2 = expRequiredMatches[0].quote;
    fields.push({
      key: "experience",
      label: "Опыт работы",
      status: "contradiction",
      value: `${q1} vs ${q2}`,
      quotes: [q1, q2],
      note: "Противоречие: одновременно заявлено отсутствие требований к опыту и требование стажа"
    });
    questions.push("Требуется ли обязательный стаж работы или вакансия действительно открыта без опыта?");
  } else if (expWelcomeMatches.length > 0) {
    const q = expWelcomeMatches[0].quote;
    fields.push({
      key: "experience",
      label: "Опыт работы",
      status: "ambiguous",
      value: q.trim(),
      quotes: [q],
      note: "обязательность не установлена"
    });
    questions.push("Является ли опыт работы обязательным условием для отбора?");
  } else if (expRequiredMatches.length > 0) {
    const q = expRequiredMatches[0].quote;
    fields.push({
      key: "experience",
      label: "Опыт работы",
      status: "found",
      value: q.trim(),
      quotes: [q]
    });
  } else if (noExpMatches.length > 0) {
    const q = noExpMatches[0].quote;
    fields.push({
      key: "experience",
      label: "Опыт работы",
      status: "found",
      value: "не требуется",
      quotes: [q]
    });
  } else {
    fields.push({
      key: "experience",
      label: "Опыт работы",
      status: "missing",
      value: null,
      quotes: []
    });
    questions.push("Обязателен ли опыт работы в аналогичной сфере и какой минимальный стаж?");
  }

  // ================= 8. АДРЕС / РАЙОН =================
  const addressRegex = /(?:г\.\s*Бишкек|Бишкек|г\.\s*Ош|Ош|Чуй|район|пересечение|ул\.|улица|мкр|микрорайон|Дордой|ЦУМ|Азия\s+Молл|Орто-Сай|Аламедин|Токтогула|Советская|Киевская|Манаса|Ахунбаева|Байтик\s+Баатыра|Южные\s+ворота|Боконбаева|Тоголок\s+Молдо|удаленн)/i;
  const fullAddressRegex = /(?:адрес|локация|место\s+работы)[:\s]+([^\n]+)/i;

  const fullAddrMatches = findExactMatches(text, fullAddressRegex);
  const addrMatches = findExactMatches(text, addressRegex);

  if (fullAddrMatches.length > 0) {
    const q = fullAddrMatches[0].quote;
    fields.push({
      key: "address",
      label: "Адрес / район",
      status: "found",
      value: q.trim(),
      quotes: [q]
    });
  } else if (addrMatches.length > 0) {
    const q = addrMatches[0].quote;
    fields.push({
      key: "address",
      label: "Адрес / район",
      status: "found",
      value: q.trim(),
      quotes: [q]
    });
  } else {
    // Check if vague address mentioned
    const vagueAddrRegex = /(?:в\s+центре|в\s+черте\s+города|в\s+городе)/i;
    const vagueMatches = findExactMatches(text, vagueAddrRegex);
    if (vagueMatches.length > 0) {
      const q = vagueMatches[0].quote;
      fields.push({
        key: "address",
        label: "Адрес / район",
        status: "ambiguous",
        value: q.trim(),
        quotes: [q],
        note: "Точный адрес или район расположения не указан"
      });
      questions.push("По какому точному адресу или ориентиру находится место работы?");
    } else {
      fields.push({
        key: "address",
        label: "Адрес / район",
        status: "missing",
        value: null,
        quotes: []
      });
      questions.push("В каком районе города или по какому адресу предстоит работать?");
    }
  }

  // ================= 9. ИСПЫТАТЕЛЬНЫЙ СРОК =================
  const probationRegex = /(?:испытательный\s+срок|стажировка|стажировочный\s+период|обучение\s+[0-9]+\s*(?:дн|нед|мес))[:\s]*([^\n.,;]+)?/i;
  const probationMatches = findExactMatches(text, probationRegex);

  if (probationMatches.length > 0) {
    const q = probationMatches[0].quote;
    const lower = q.toLowerCase();
    if (lower.includes("оплачива") || lower.includes("дн") || lower.includes("мес") || lower.includes("нед") || lower.includes("без испытательного")) {
      fields.push({
        key: "probation",
        label: "Испытательный срок",
        status: "found",
        value: q.trim(),
        quotes: [q]
      });
    } else {
      fields.push({
        key: "probation",
        label: "Испытательный срок",
        status: "ambiguous",
        value: q.trim(),
        quotes: [q],
        note: "Условия или оплата испытательного срока не раскрыты"
      });
      questions.push("Какова длительность стажировки (испытательного срока) и оплачивается ли она?");
    }
  } else {
    fields.push({
      key: "probation",
      label: "Испытательный срок",
      status: "missing",
      value: null,
      quotes: []
    });
    questions.push("Предусмотрен ли испытательный срок и как он будет оплачиваться?");
  }

  // ================= 10. ПРОЖИВАНИЕ =================
  const housingRegex = /(?:проживание\s+не\s+предоставляется|предоставляется\s+(?:жилье|жиль[её]|общежитие|проживание)|жилье\s+предоставляется|помощь\s+с\s+жильем|с\s+проживанием|проживание\s+за\s+счет)/i;
  const housingMatches = findExactMatches(text, housingRegex);

  if (housingMatches.length > 0) {
    const q = housingMatches[0].quote;
    fields.push({
      key: "housing",
      label: "Проживание",
      status: "found",
      value: q.trim(),
      quotes: [q]
    });
  } else {
    fields.push({
      key: "housing",
      label: "Проживание",
      status: "missing",
      value: null,
      quotes: []
    });
  }

  // ================= 11. ДОПОЛНИТЕЛЬНЫЕ РАСХОДЫ ДЛЯ СОИСКАТЕЛЯ =================
  const expCoveredRegex = /(?:за\s+счет\s+компании|за\s+счет\s+работодателя|без\s+взносов|никаких\s+взносов|дополнительные\s+расходы\s+отсутствуют|бесплатная\s+форма|бесплатное\s+обучение)/i;
  const applicantFeeRegex = /(?:взнос|залог|предоплата|оплата\s+за\s+(?:оформление|обучение|справку|спецодежду|материалы|трудоустройство))/i;

  const coveredMatches = findExactMatches(text, expCoveredRegex);
  const feeMatches = findExactMatches(text, applicantFeeRegex);

  if (feeMatches.length > 0) {
    const q = feeMatches[0].quote;
    fields.push({
      key: "additional_expenses",
      label: "Дополнительные расходы для соискателя",
      status: "contradiction",
      value: "Требуются финансовые траты от соискателя",
      quotes: [q],
      note: "Внимание: в объявлении упомянута оплата или взнос со стороны кандидата"
    });
    questions.push("Почему для трудоустройства требуются предварительные денежные вложения или взносы?");
  } else if (coveredMatches.length > 0) {
    const q = coveredMatches[0].quote;
    fields.push({
      key: "additional_expenses",
      label: "Дополнительные расходы для соискателя",
      status: "found",
      value: "Отсутствуют (за счет работодателя)",
      quotes: [q]
    });
  } else {
    fields.push({
      key: "additional_expenses",
      label: "Дополнительные расходы для соискателя",
      status: "missing",
      value: null,
      quotes: [],
      note: "В тексте не указано, требуются ли расходы на форму, медкнижку или оформление"
    });
    questions.push("Предусмотрены ли какие-либо расходы со стороны соискателя (на спецодежду, медкнижку, документы)?");
  }

  // ================= 12. КОНТАКТ ДЛЯ ОТКЛИКА =================
  const contactPhoneRegex = /(?:\+?996\s*\(?[0-9]{3}\)?\s*[0-9]{2}[-\s]?[0-9]{2}[-\s]?[0-9]{2}|0\s*[0-9]{3}\s*[0-9]{2}[-\s]?[0-9]{2}[-\s]?[0-9]{2})/i;
  const contactMessengerRegex = /(?:whatsapp|ватсап|ватсапп|telegram|телеграм|почта|e-mail|email|резюме\s+на|откликайтесь\s+на)[:\s]+([^\n.,;]+)/i;
  const contactWordRegex = /(?:контакт(?:ы)?|телефон|номер|связь)[:\s]+([^\n]+)/i;

  const phoneMatches = findExactMatches(text, contactPhoneRegex);
  const messMatches = findExactMatches(text, contactMessengerRegex);
  const wordMatches = findExactMatches(text, contactWordRegex);

  if (phoneMatches.length > 0 || messMatches.length > 0 || wordMatches.length > 0) {
    const allContacts = [...phoneMatches, ...messMatches, ...wordMatches];
    const q = allContacts[0].quote;
    fields.push({
      key: "contact",
      label: "Контакт для отклика",
      status: "found",
      value: q.trim(),
      quotes: [q]
    });
  } else {
    const vagueContactRegex = /(?:в\s+лс|в\s+директ|пишите\s+в\s+личку)/i;
    const vagueMatches = findExactMatches(text, vagueContactRegex);
    if (vagueMatches.length > 0) {
      const q = vagueMatches[0].quote;
      fields.push({
        key: "contact",
        label: "Контакт для отклика",
        status: "ambiguous",
        value: q.trim(),
        quotes: [q],
        note: "Прямой телефон или официальный канал связи компании не указан"
      });
      questions.push("Какой прямой номер телефона или официальный канал связи компании можно использовать?");
    } else {
      fields.push({
        key: "contact",
        label: "Контакт для отклика",
        status: "missing",
        value: null,
        quotes: []
      });
      questions.push("По каким прямым контактам или каналам связи можно направить отклик?");
    }
  }

  // ================= RED FLAGS =================
  // 1. Fee requests
  const feeFlagRegex = /(?:страховой\s+взнос|взнос|залог|предоплата|оплата\s+за\s+оформление|оплата\s+за\s+обучение|оплата\s+за\s+справку|оплата\s+спецодежды|оплата\s+за\s+трудоустройство|купить\s+материалы)/gi;
  const feeFlagMatches = findExactMatches(text, feeFlagRegex);
  for (const m of feeFlagMatches) {
    redFlags.push({
      title: "Запрос оплаты или взноса от соискателя",
      quote: m.quote
    });
  }

  // 2. Passport in messenger
  const passportRegex = /(?:отправьте\s+паспорт(?:\s+в\s+мессенджер)?|паспорт\s+в\s+(?:мессенджер|whatsapp|ватсап|телеграм|telegram)|фото\s+паспорта|скан\s+паспорта)/gi;
  const passportMatches = findExactMatches(text, passportRegex);
  for (const m of passportMatches) {
    redFlags.push({
      title: "Запрос фото или скана паспорта через мессенджер",
      quote: m.quote
    });
  }

  // 3. Guaranteed income without effort
  const effortlessRegex = /(?:гарантированный\s+доход\s+без\s+усилий|доход\s+без\s+усилий|быстрый\s+доход\s+без\s+вложений|легкий\s+заработок|заработок\s+без\s+усилий)/gi;
  const effortlessMatches = findExactMatches(text, effortlessRegex);
  for (const m of effortlessMatches) {
    redFlags.push({
      title: "Обещание гарантированного дохода без усилий",
      quote: m.quote
    });
  }

  // Remove duplicate red flags by title + quote
  const uniqueRedFlags: { title: string; quote: string }[] = [];
  const seenRedFlags = new Set<string>();
  for (const rf of redFlags) {
    const key = `${rf.title}:${rf.quote}`;
    if (!seenRedFlags.has(key)) {
      seenRedFlags.add(key);
      uniqueRedFlags.push(rf);
    }
  }

  // Deduplicate questions and limit to max 10
  const uniqueQuestions: string[] = [];
  const seenQuestions = new Set<string>();
  for (const q of questions) {
    if (!seenQuestions.has(q)) {
      seenQuestions.add(q);
      uniqueQuestions.push(q);
      if (uniqueQuestions.length >= 10) break;
    }
  }

  const analysisId = "an_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

  return {
    id: analysisId,
    createdAt: new Date().toISOString(),
    sourceUrl: sourceUrl?.trim() || undefined,
    text,
    fields,
    redFlags: uniqueRedFlags,
    questions: uniqueQuestions
  };
}

export function selfTest(): { passed: boolean; message: string; results: unknown[] } {
  const results: unknown[] = [];

  // Test 1: Full vacancy (Demo 1)
  const an1 = analyze(DEMO_EXAMPLES[0].text);
  const sal1 = an1.fields.find(f => f.key === "salary");
  if (!sal1 || sal1.status !== "found") {
    throw new Error(`SelfTest Failed: Demo 1 expected salary 'found', got '${sal1?.status}'`);
  }
  results.push({ test: "Demo 1", salary: sal1.status });

  // Test 2: Ambiguous vacancy "до 40 000 сом" (Demo 2)
  const an2 = analyze(DEMO_EXAMPLES[1].text);
  const sal2 = an2.fields.find(f => f.key === "salary");
  if (!sal2 || sal2.status !== "ambiguous") {
    throw new Error(`SelfTest Failed: Demo 2 expected salary 'ambiguous', got '${sal2?.status}'`);
  }
  if (!sal2.note || !sal2.note.includes("Это верхняя граница, а не гарантированная сумма")) {
    throw new Error(`SelfTest Failed: Demo 2 note missing required text: ${sal2?.note}`);
  }
  const sched2 = an2.fields.find(f => f.key === "schedule");
  if (!sched2 || sched2.status !== "ambiguous") {
    throw new Error(`SelfTest Failed: Demo 2 expected schedule 'ambiguous', got '${sched2?.status}'`);
  }
  const exp2 = an2.fields.find(f => f.key === "experience");
  if (!exp2 || exp2.status !== "ambiguous") {
    throw new Error(`SelfTest Failed: Demo 2 expected experience 'ambiguous', got '${exp2?.status}'`);
  }
  results.push({ test: "Demo 2", salary: sal2.status, sched: sched2.status, exp: exp2.status });

  // Test 3: Contradictory vacancy (Demo 3)
  const an3 = analyze(DEMO_EXAMPLES[2].text);
  const sal3 = an3.fields.find(f => f.key === "salary");
  const exp3 = an3.fields.find(f => f.key === "experience");
  const sched3 = an3.fields.find(f => f.key === "schedule");
  if (!sal3 || sal3.status !== "contradiction") {
    throw new Error(`SelfTest Failed: Demo 3 expected salary 'contradiction', got '${sal3?.status}'`);
  }
  if (!exp3 || exp3.status !== "contradiction") {
    throw new Error(`SelfTest Failed: Demo 3 expected experience 'contradiction', got '${exp3?.status}'`);
  }
  if (!sched3 || sched3.status !== "contradiction") {
    throw new Error(`SelfTest Failed: Demo 3 expected schedule 'contradiction', got '${sched3?.status}'`);
  }
  // Check that quotes are exact substrings
  for (const q of [...sal3.quotes, ...exp3.quotes, ...sched3.quotes]) {
    if (!DEMO_EXAMPLES[2].text.includes(q)) {
      throw new Error(`SelfTest Failed: Quote is not an exact substring: ${q}`);
    }
  }
  results.push({ test: "Demo 3", contradictions: [sal3.status, exp3.status, sched3.status] });

  // Test 4: Red flags vacancy (Demo 4)
  const an4 = analyze(DEMO_EXAMPLES[3].text);
  if (an4.redFlags.length < 2) {
    throw new Error(`SelfTest Failed: Demo 4 expected at least 2 red flags, got ${an4.redFlags.length}`);
  }
  for (const rf of an4.redFlags) {
    if (!DEMO_EXAMPLES[3].text.includes(rf.quote)) {
      throw new Error(`SelfTest Failed: Red flag quote not exact substring: ${rf.quote}`);
    }
  }
  results.push({ test: "Demo 4", redFlagsCount: an4.redFlags.length });

  // Test 5: Short text validation (Demo 5)
  const valError = validate(DEMO_EXAMPLES[4].text);
  if (!valError) {
    throw new Error(`SelfTest Failed: Demo 5 expected validation error for short text`);
  }
  results.push({ test: "Demo 5", validationError: valError });

  return { passed: true, message: "All self-tests passed successfully!", results };
}
