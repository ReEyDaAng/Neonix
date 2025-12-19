"use client";

import { useUiPrefs } from "./uiPrefs";

const dict = {
  en: {
    brandTag: "prototype",
    navLanding: "Landing",
    navAuth: "Auth",
    navProfile: "Profile",
    navChat: "Chat",
    navSettings: "Settings",
    btnQuickSettings: "Settings",
    btnGetStarted: "Get started",
    btnGoChat: "Go to chat",

    heroTitle: "Neonix — rooms in real time with a calm neon vibe.",
    heroText: "Chat, voice/video calls, screen sharing, and on-screen annotations — designed as a modern web app.",
    heroCtaPrimary: "Start",
    heroCtaSecondary: "Preview Chat",
    heroCtaTertiary: "Customize look",
    pillFeature1: "Voice & video",
    pillFeature2: "Screen share",
    pillFeature3: "Mark & draw",
    pillFeature4: "Rooms & roles",

    landingCard1Title: "What is Neonix?",
    landingCard1Desc: "A Discord-like space for calls + shared screen + markup.",
    landingCard2Title: "Why it matters",
    landingCard2Desc: "Designed for study sessions, teamwork and movie nights.",

    l1a: "Rooms & channels", l1ad: "Server → channels → chat context",
    l1b: "Context roles", l1bd: "Roles depend on room/channel, not only account",
    l1c: "Neon UI", l1cd: "Theme, accent, glow intensity",

    l2a: "Access control", l2ad: "Host permissions, guest access, moderation",
    l2b: "Safety", l2bd: "Reporting + bans (planned)",
    l2c: "Realtime", l2cd: "Socket transport later (MVP uses REST mock)",

    authTitle: "Sign in",
    regTitle: "Register",
    authDesc: "Email + password. Prototype starter.",
    authPill: "🔒 Secure by design (HTTPS in prod)",
    tabLogin: "Login",
    tabRegister: "Register",
    lblEmail: "Email",
    lblPassword: "Password",
    lblConfirm: "Confirm password",
    lblDisplayNameReg: "Display name (optional)",
    btnAuthSubmit: "Sign in",
    btnRegisterSubmit: "Create account",
    btnBackLanding: "Back",
    btnLoading: "Loading…",
    errPasswords: "Passwords do not match",
    hintDemo: "Demo login: demo@neonix.app / Password123!",
    authHelpLogin: "Sign in to access chat and profile features.",
    authHelpRegister: "Create an account to start using Neonix.",
    
    authSideTitle: "What you get",
    authSideDesc: "Core modules planned in Neonix.",
    as1: "Rooms & roles", as1d: "Owner/host, moderators, participants, guests",
    as2: "Calls & sharing", as2d: "Voice/video + screen share (planned)",
    as3: "Annotations", as3d: "Markers, drawing tools (planned)",
    as4: "Safety", as4d: "Access control policies + reports (planned)"
  },
  uk: {
    brandTag: "прототип",
    navLanding: "Головна",
    navAuth: "Авторизація",
    navProfile: "Профіль",
    navChat: "Чат",
    navSettings: "Налаштування",
    btnQuickSettings: "Налаштування",
    btnGetStarted: "Почати",
    btnGoChat: "До чату",

    heroTitle: "Neonix — кімнати в реальному часі зі спокійним неоном.",
    heroText: "Чат, дзвінки, шаринг екрана та анотації — як сучасний веб-додаток.",
    heroCtaPrimary: "Старт",
    heroCtaSecondary: "Переглянути чат",
    heroCtaTertiary: "Налаштувати вигляд",
    pillFeature1: "Голос і відео",
    pillFeature2: "Шаринг екрана",
    pillFeature3: "Позначки/малювання",
    pillFeature4: "Кімнати й ролі",

    landingCard1Title: "Що таке Neonix?",
    landingCard1Desc: "Простір як Discord: дзвінки + спільний екран + позначки.",
    landingCard2Title: "Навіщо це",
    landingCard2Desc: "Для навчання, команди та спільного перегляду.",

    l1a: "Кімнати та канали", l1ad: "Сервер → канали → контекст чату",
    l1b: "Контекстні ролі", l1bd: "Ролі залежать від кімнати/каналу",
    l1c: "Неон UI", l1cd: "Тема, акцент, інтенсивність glow",

    l2a: "Контроль доступу", l2ad: "Дозволи хоста, гості, модерація",
    l2b: "Безпека", l2bd: "Скарги + бан (планується)",
    l2c: "Realtime", l2cd: "Socket пізніше (поки REST mock)",

    authTitle: "Вхід",
    regTitle: "Реєстрація",
    authDesc: "Email + пароль. Стартовий каркас.",
    authPill: "🔒 Безпека (HTTPS у проді)",
    tabLogin: "Вхід",
    tabRegister: "Реєстрація",
    lblEmail: "Email",
    lblPassword: "Пароль",
    lblConfirm: "Підтвердіть пароль",
    lblDisplayNameReg: "Ім’я (опц.)",
    btnAuthSubmit: "Увійти",
    btnRegisterSubmit: "Створити акаунт",
    btnBackLanding: "Назад",
    btnLoading: "Завантаження…",
    errPasswords: "Паролі не співпадають",
    hintDemo: "Демо: demo@neonix.app / Password123!",
    authHelpLogin: "Увійдіть, щоб отримати доступ до чату та профілю.",
    authHelpRegister: "Створіть акаунт, щоб почати користування Neonix.",

    authSideTitle: "Що буде",
    authSideDesc: "Основні модулі Neonix.",
    as1: "Кімнати й ролі", as1d: "Host/owner, модератори, учасники, гість",
    as2: "Дзвінки та шаринг", as2d: "Голос/відео + шаринг екрана (планується)",
    as3: "Анотації", as3d: "Маркери, малювання (планується)",
    as4: "Безпека", as4d: "Політики доступу + репорти (планується)"
  }
};

export function useI18n() {
  const { lang } = useUiPrefs();
  const resolved = lang === "auto" ? "en" : lang;
  const d = (dict as any)[resolved] || dict.en;
  return (key: keyof typeof dict.en) => d[key] ?? dict.en[key] ?? String(key);
}
