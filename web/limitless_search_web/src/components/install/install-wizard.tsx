"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Lock, ShieldCheck } from "lucide-react";
import { type Language, languages } from "@/lib/i18n";

type InstallWizardProps = {
  initialLanguage: Language;
};

type InstallCopy = {
  badge: string;
  title: string;
  subtitle: string;
  language: string;
  steps: string[];
  licenseTitle: string;
  licenseHint: string;
  agree: string;
  environmentTitle: string;
  environmentItems: Array<{ label: string; detail: string }>;
  adminTitle: string;
  email: string;
  password: string;
  repeatPassword: string;
  submit: string;
  submitting: string;
  errors: {
    scroll: string;
    agree: string;
    email: string;
    password: string;
    mismatch: string;
    failed: string;
  };
  locked: string;
};

const copies: Record<Language, InstallCopy> = {
  zh: {
    badge: "安装向导",
    title: "初始化 Limitless Search",
    subtitle: "完成开源协议确认、环境检查和管理员账号创建后，安装页将自动锁定。",
    language: "语言",
    steps: ["同意协议", "检查环境", "创建管理员"],
    licenseTitle: "开源协议",
    licenseHint: "请滑动到底部后勾选同意。",
    agree: "我已阅读并同意协议",
    environmentTitle: "环境检查",
    environmentItems: [
      { label: "Next.js 前端", detail: "当前页面已成功渲染。" },
      { label: "管理数据库", detail: "管理员存储可用，安装状态可写入。" },
      { label: "Docker 双服务", detail: "前端与 Go 后端保持双服务结构。" },
    ],
    adminTitle: "管理员账号",
    email: "管理员邮箱",
    password: "密码",
    repeatPassword: "重复密码",
    submit: "完成安装",
    submitting: "正在安装",
    errors: {
      scroll: "请先滑动阅读协议到底部。",
      agree: "请先同意协议。",
      email: "请输入管理员邮箱。",
      password: "密码至少需要 8 位。",
      mismatch: "两次输入的密码不一致。",
      failed: "安装失败，请稍后重试。",
    },
    locked: "安装完成后此页面将被锁定，不能再次打开。",
  },
  "zh-TW": {
    badge: "安裝精靈",
    title: "初始化 Limitless Search",
    subtitle: "完成授權確認、環境檢查與管理員帳號建立後，安裝頁會自動鎖定。",
    language: "語言",
    steps: ["同意協議", "檢查環境", "建立管理員"],
    licenseTitle: "開源協議",
    licenseHint: "請滑動到底部後勾選同意。",
    agree: "我已閱讀並同意協議",
    environmentTitle: "環境檢查",
    environmentItems: [
      { label: "Next.js 前端", detail: "目前頁面已成功渲染。" },
      { label: "管理資料庫", detail: "管理員儲存可用，安裝狀態可寫入。" },
      { label: "Docker 雙服務", detail: "前端與 Go 後端保留雙服務結構。" },
    ],
    adminTitle: "管理員帳號",
    email: "管理員信箱",
    password: "密碼",
    repeatPassword: "重複密碼",
    submit: "完成安裝",
    submitting: "正在安裝",
    errors: {
      scroll: "請先滑動閱讀協議到底部。",
      agree: "請先同意協議。",
      email: "請輸入管理員信箱。",
      password: "密碼至少需要 8 位。",
      mismatch: "兩次輸入的密碼不一致。",
      failed: "安裝失敗，請稍後重試。",
    },
    locked: "安裝完成後此頁面會被鎖定，不能再次開啟。",
  },
  en: {
    badge: "Install Wizard",
    title: "Initialize Limitless Search",
    subtitle: "Confirm the license, check the environment, and create the first admin account. The install page locks after setup.",
    language: "Language",
    steps: ["Accept License", "Check Environment", "Create Admin"],
    licenseTitle: "Open Source License",
    licenseHint: "Scroll to the bottom before accepting.",
    agree: "I have read and accept the license",
    environmentTitle: "Environment Check",
    environmentItems: [
      { label: "Next.js frontend", detail: "This page rendered successfully." },
      { label: "Admin database", detail: "Admin storage is available for installation state." },
      { label: "Docker dual service", detail: "The frontend and Go backend remain separate services." },
    ],
    adminTitle: "Admin Account",
    email: "Admin email",
    password: "Password",
    repeatPassword: "Repeat password",
    submit: "Finish Installation",
    submitting: "Installing",
    errors: {
      scroll: "Scroll to the bottom of the license first.",
      agree: "Accept the license first.",
      email: "Enter the admin email.",
      password: "Password must be at least 8 characters.",
      mismatch: "Passwords do not match.",
      failed: "Installation failed. Try again later.",
    },
    locked: "After installation this page is locked and cannot be opened again.",
  },
  ja: {
    badge: "インストール",
    title: "Limitless Search を初期化",
    subtitle: "ライセンス確認、環境チェック、管理者作成を完了すると、このページはロックされます。",
    language: "言語",
    steps: ["同意", "環境確認", "管理者作成"],
    licenseTitle: "オープンソースライセンス",
    licenseHint: "最後までスクロールしてから同意してください。",
    agree: "ライセンスを読み、同意します",
    environmentTitle: "環境チェック",
    environmentItems: [
      { label: "Next.js フロントエンド", detail: "このページは正常に表示されています。" },
      { label: "管理データベース", detail: "管理者情報を保存できます。" },
      { label: "Docker 二重サービス", detail: "フロントエンドと Go バックエンドは分離されています。" },
    ],
    adminTitle: "管理者アカウント",
    email: "管理者メール",
    password: "パスワード",
    repeatPassword: "パスワード再入力",
    submit: "インストール完了",
    submitting: "インストール中",
    errors: {
      scroll: "先にライセンス末尾までスクロールしてください。",
      agree: "ライセンスに同意してください。",
      email: "管理者メールを入力してください。",
      password: "パスワードは 8 文字以上です。",
      mismatch: "パスワードが一致しません。",
      failed: "インストールに失敗しました。",
    },
    locked: "インストール後、このページは開けなくなります。",
  },
  ru: {
    badge: "Установка",
    title: "Инициализация Limitless Search",
    subtitle: "Подтвердите лицензию, проверьте окружение и создайте администратора. Затем страница установки будет заблокирована.",
    language: "Язык",
    steps: ["Лицензия", "Проверка", "Администратор"],
    licenseTitle: "Открытая лицензия",
    licenseHint: "Прокрутите до конца перед согласием.",
    agree: "Я прочитал и принимаю лицензию",
    environmentTitle: "Проверка окружения",
    environmentItems: [
      { label: "Next.js frontend", detail: "Страница успешно отрисована." },
      { label: "База администратора", detail: "Хранилище администратора доступно." },
      { label: "Docker dual service", detail: "Frontend и Go backend остаются отдельными сервисами." },
    ],
    adminTitle: "Учетная запись администратора",
    email: "Email администратора",
    password: "Пароль",
    repeatPassword: "Повторите пароль",
    submit: "Завершить установку",
    submitting: "Установка",
    errors: {
      scroll: "Сначала прокрутите лицензию до конца.",
      agree: "Сначала примите лицензию.",
      email: "Введите email администратора.",
      password: "Пароль должен быть не короче 8 символов.",
      mismatch: "Пароли не совпадают.",
      failed: "Установка не удалась.",
    },
    locked: "После установки эта страница будет заблокирована.",
  },
  fr: {
    badge: "Installation",
    title: "Initialiser Limitless Search",
    subtitle: "Confirmez la licence, vérifiez l’environnement et créez le premier compte administrateur. La page sera ensuite verrouillée.",
    language: "Langue",
    steps: ["Licence", "Vérification", "Administrateur"],
    licenseTitle: "Licence open source",
    licenseHint: "Faites défiler jusqu’en bas avant d’accepter.",
    agree: "J’ai lu et j’accepte la licence",
    environmentTitle: "Vérification de l’environnement",
    environmentItems: [
      { label: "Frontend Next.js", detail: "Cette page s’est rendue correctement." },
      { label: "Base administrateur", detail: "Le stockage administrateur est disponible." },
      { label: "Double service Docker", detail: "Le frontend et le backend Go restent séparés." },
    ],
    adminTitle: "Compte administrateur",
    email: "Email administrateur",
    password: "Mot de passe",
    repeatPassword: "Répéter le mot de passe",
    submit: "Terminer l’installation",
    submitting: "Installation",
    errors: {
      scroll: "Faites d’abord défiler la licence jusqu’en bas.",
      agree: "Acceptez d’abord la licence.",
      email: "Saisissez l’email administrateur.",
      password: "Le mot de passe doit contenir au moins 8 caractères.",
      mismatch: "Les mots de passe ne correspondent pas.",
      failed: "L’installation a échoué.",
    },
    locked: "Après installation, cette page sera verrouillée.",
  },
};

const licenseText = [
  "Limitless Search 2.0 is distributed under BYCC4. Copyright belongs to Maishan Inc.",
  "You may share and adapt the work under the terms of the license. Keep attribution and follow the license requirements.",
  "This installer creates the first administrator account for the current deployment. Keep the administrator password private.",
  "After installation, this page is locked by the presence of the administrator account and cannot be opened again.",
].join("\n\n");

export function InstallWizard({ initialLanguage }: InstallWizardProps) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [licenseScrolled, setLicenseScrolled] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const licenseRef = useRef<HTMLDivElement | null>(null);

  const copy = copies[language];
  const activeStep = accepted ? 2 : licenseScrolled ? 1 : 0;

  const languageLabel = useMemo(
    () => languages.find((entry) => entry.code === language)?.name || "Language",
    [language],
  );

  useEffect(() => {
    const element = licenseRef.current;
    if (!element) return;

    const update = () => {
      const reachedBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 8;
      setLicenseScrolled(reachedBottom);
    };

    update();
    element.addEventListener("scroll", update);
    return () => element.removeEventListener("scroll", update);
  }, [language]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!licenseScrolled) {
      setError(copy.errors.scroll);
      return;
    }
    if (!accepted) {
      setError(copy.errors.agree);
      return;
    }
    if (!email.trim()) {
      setError(copy.errors.email);
      return;
    }
    if (password.length < 8) {
      setError(copy.errors.password);
      return;
    }
    if (password !== confirmPassword) {
      setError(copy.errors.mismatch);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          confirmPassword,
        }),
      });
      const json = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(json.message || copy.errors.failed);
        return;
      }
      window.location.href = "/admin/dashboard";
    } catch (installError) {
      setError(installError instanceof Error ? installError.message : copy.errors.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8 text-neutral-950 dark:bg-black dark:text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
            <Lock className="h-4 w-4" />
            {copy.badge}
          </div>

          <label className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950">
            <span className="text-neutral-500">{copy.language}</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              className="bg-transparent font-semibold outline-none"
              aria-label={copy.language}
            >
              {languages.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.name}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          </label>
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[8px] border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">{copy.title}</h1>
            <p className="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{copy.subtitle}</p>

            <div className="mt-8 grid gap-3">
              {copy.steps.map((step, index) => (
                <div
                  key={step}
                  className={`flex items-center gap-3 rounded-[8px] border px-4 py-3 text-sm ${
                    index <= activeStep
                      ? "border-black bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900"
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-current text-xs font-bold">
                    {index < activeStep ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="font-semibold">{step}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              {copy.locked}
            </div>
          </div>

          <form onSubmit={submit} className="rounded-[8px] border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="grid gap-6">
              <section>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black">{copy.licenseTitle}</h2>
                    <p className="mt-1 text-sm text-neutral-500">{copy.licenseHint}</p>
                  </div>
                </div>
                <div
                  ref={licenseRef}
                  className="mt-4 h-44 overflow-y-auto rounded-[8px] border border-neutral-200 bg-neutral-50 p-4 text-sm leading-7 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  {licenseText.split("\n").map((line, index) => (
                    <p key={`${line}-${index}`} className="mb-4 last:mb-0">
                      {line || "\u00a0"}
                    </p>
                  ))}
                  <div className="h-10" />
                </div>
                <label className="mt-4 flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={accepted}
                    disabled={!licenseScrolled}
                    onChange={(event) => setAccepted(event.target.checked)}
                    className="h-4 w-4"
                  />
                  {copy.agree}
                </label>
              </section>

              <section>
                <h2 className="text-xl font-black">{copy.environmentTitle}</h2>
                <div className="mt-4 grid gap-3">
                  {copy.environmentItems.map((item) => (
                    <div key={item.label} className="flex gap-3 rounded-[8px] border border-neutral-200 p-4 dark:border-neutral-800">
                      <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-500" />
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-xl font-black">{copy.adminTitle}</h2>
                <div className="mt-4 grid gap-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={copy.email}
                    className="w-full rounded-[8px] border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-900"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={copy.password}
                    className="w-full rounded-[8px] border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-900"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={copy.repeatPassword}
                    className="w-full rounded-[8px] border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-900"
                  />
                </div>
              </section>

              {error ? (
                <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {loading ? copy.submitting : copy.submit}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
