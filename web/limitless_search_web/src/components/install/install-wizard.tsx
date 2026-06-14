"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Database, FileText, Loader2, ShieldCheck, XCircle } from "lucide-react";

type InstallWizardProps = {
  licenseText: string;
};

type CheckResult = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
};

type InstallStatus = {
  ok: boolean;
  checks: CheckResult[];
  installState: {
    installed: boolean;
    setupRequired: boolean;
    adminPath: string;
  };
};

const steps = [
  { id: 0, label: "License", icon: FileText },
  { id: 1, label: "Environment", icon: Database },
  { id: 2, label: "Admin", icon: ShieldCheck },
];

export function InstallWizard({ licenseText }: InstallWizardProps) {
  const [step, setStep] = useState(0);
  const [licenseScrolled, setLicenseScrolled] = useState(false);
  const [licenseAccepted, setLicenseAccepted] = useState(false);
  const [status, setStatus] = useState<InstallStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminPath, setAdminPath] = useState("/manage");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const licenseRef = useRef<HTMLDivElement | null>(null);

  const canContinueLicense = licenseScrolled && licenseAccepted;
  const environmentOk = Boolean(status?.ok);

  const activeIcon = useMemo(() => steps[step]?.icon || FileText, [step]);
  const ActiveIcon = activeIcon;

  const refreshStatus = async () => {
    setLoadingStatus(true);
    setError(null);
    try {
      const response = await fetch("/api/install/status", { cache: "no-store" });
      const json = (await response.json()) as InstallStatus;
      setStatus(json);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to load install status.");
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (step === 1) {
      void refreshStatus();
    }
  }, [step]);

  const handleLicenseScroll = () => {
    const el = licenseRef.current;
    if (!el) return;
    const reachedBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 12;
    if (reachedBottom) {
      setLicenseScrolled(true);
    }
  };

  const submitInstall = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password || !confirmPassword) {
      setError("Enter admin email and password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!licenseAccepted) {
      setError("Accept the license before installing.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          confirmPassword,
          adminPath,
          licenseAccepted,
        }),
      });

      const json = (await response.json()) as { message?: string; adminPath?: string };
      if (!response.ok) {
        setError(json.message || "Install failed.");
        return;
      }

      window.location.href = json.adminPath || adminPath;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Install failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-950 dark:bg-neutral-950 dark:text-white">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-6 dark:border-neutral-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Limitless Search</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Installation</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold dark:border-neutral-800 dark:bg-neutral-900">
            <ActiveIcon className="h-4 w-4" />
            {steps[step]?.label}
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-2">
            {steps.map((item) => {
              const Icon = item.icon;
              const active = item.id === step;
              const done = item.id < step;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.id <= step && setStep(item.id)}
                  className={`flex w-full items-center gap-3 rounded border px-4 py-3 text-left text-sm font-semibold ${
                    active
                      ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-neutral-200 bg-white text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  {item.label}
                </button>
              );
            })}
          </aside>

          <section className="rounded border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            {step === 0 ? (
              <div>
                <h2 className="text-2xl font-black tracking-tight">Open Source License</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                  Read to the bottom before continuing. The installer records acceptance when setup is completed.
                </p>
                <div
                  ref={licenseRef}
                  onScroll={handleLicenseScroll}
                  className="mt-5 h-[420px] overflow-auto rounded border border-neutral-200 bg-neutral-50 p-4 font-mono text-xs leading-6 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300"
                >
                  <pre className="whitespace-pre-wrap">{licenseText}</pre>
                </div>
                <label className="mt-5 flex items-center gap-3 rounded border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-950">
                  <input
                    type="checkbox"
                    disabled={!licenseScrolled}
                    checked={licenseAccepted}
                    onChange={(event) => setLicenseAccepted(event.target.checked)}
                  />
                  I have read and agree to the open-source license.
                </label>
                {!licenseScrolled ? (
                  <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">Scroll to the bottom to enable agreement.</p>
                ) : null}
                <button
                  type="button"
                  disabled={!canContinueLicense}
                  onClick={() => setStep(1)}
                  className="mt-6 rounded bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  Continue
                </button>
              </div>
            ) : null}

            {step === 1 ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">Environment Check</h2>
                    <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                      Docker should provide these services automatically. Fix blocking checks before creating the admin account.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshStatus()}
                    disabled={loadingStatus}
                    className="inline-flex items-center gap-2 rounded border border-neutral-200 px-4 py-2.5 text-sm font-semibold dark:border-neutral-800"
                  >
                    {loadingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                    Refresh
                  </button>
                </div>
                <div className="mt-6 space-y-3">
                  {(status?.checks || []).map((check) => (
                    <div key={check.key} className="flex items-start gap-3 rounded border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
                      {check.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <XCircle className="mt-0.5 h-5 w-5 text-red-600" />}
                      <div>
                        <div className="font-semibold">{check.label}</div>
                        <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{check.detail}</p>
                      </div>
                    </div>
                  ))}
                  {!status && loadingStatus ? (
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking environment
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={!environmentOk}
                  onClick={() => setStep(2)}
                  className="mt-6 rounded bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  Continue
                </button>
              </div>
            ) : null}

            {step === 2 ? (
              <form onSubmit={submitInstall}>
                <h2 className="text-2xl font-black tracking-tight">Admin Account</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                  The login page will only be exposed through the configured admin path after installation.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-sm font-semibold">Admin Email</span>
                    <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="w-full rounded border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-950" />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-semibold">Password</span>
                    <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="w-full rounded border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-950" />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-semibold">Repeat Password</span>
                    <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" className="w-full rounded border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-950" />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-sm font-semibold">Admin Path</span>
                    <input value={adminPath} onChange={(event) => setAdminPath(event.target.value)} className="w-full rounded border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-950" placeholder="/manage" />
                  </label>
                </div>
                {error ? (
                  <div className="mt-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
                    {error}
                  </div>
                ) : null}
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-6 inline-flex items-center gap-2 rounded bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Install
                </button>
              </form>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
