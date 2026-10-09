import { useState, type FormEvent } from "react";
import { Icon } from "../../app/icons";
import { useTranslation } from "../../i18n";
import { ApiError } from "../../lib/api/client";
import { useLogin, useRegister } from "./session";

const input = "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-100";
const DEMO = { email: "ramesh@dukaanos.dev", password: "demo1234" };

export function AuthPage() {
  const { t, problem, language } = useTranslation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const login = useLogin();
  const register = useRegister();
  const active = mode === "login" ? login : register;

  // In English the backend's own message is shown. Elsewhere a wrong password and a taken email get their
  // own lines: the general "logged out" and "clashes" lines would not tell the merchant what went wrong.
  function failure(error: Error) {
    if (language !== "en" && error instanceof ApiError) {
      if (mode === "login" && error.code === "unauthorized") return t("auth.wrongLogin");
      if (mode === "register" && error.code === "conflict") return t("auth.emailTaken");
    }
    return problem(error);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    if (mode === "login") {
      login.mutate({ email, password });
    } else {
      register.mutate({ email, password, name: String(f.get("name")), store_name: String(f.get("store_name")) });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="rounded-xl bg-emerald-600 p-2 text-white">
            <Icon name="store" className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">DukaanOS</h1>
        </div>
        <p className="mt-2 text-sm text-slate-500">{t("app.productLine")}</p>
        <p className="mb-3 mt-6 text-sm font-medium text-slate-900">
          {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {mode === "register" && (
            <>
              <input name="name" placeholder={t("auth.yourName")} required className={input} />
              <input name="store_name" placeholder={t("auth.storeName")} required className={input} />
            </>
          )}
          <input
            name="email"
            type="email"
            placeholder={t("auth.email")}
            required
            defaultValue={mode === "login" ? DEMO.email : ""}
            className={input}
          />
          <input
            name="password"
            type="password"
            placeholder={t("auth.password")}
            required
            minLength={mode === "register" ? 8 : undefined}
            defaultValue={mode === "login" ? DEMO.password : ""}
            className={input}
          />
          {active.error && <p className="text-sm text-red-600">{failure(active.error)}</p>}
          <button
            type="submit"
            disabled={active.isPending}
            className="mt-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {active.isPending ? t("auth.pleaseWait") : mode === "login" ? t("auth.logIn") : t("auth.createAccount")}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="mt-4 text-sm text-emerald-700 hover:underline"
        >
          {mode === "login" ? t("auth.toRegister") : t("auth.toLogin")}
        </button>
        {mode === "login" && <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">{t("auth.demo", DEMO)}</p>}
      </div>
    </div>
  );
}
