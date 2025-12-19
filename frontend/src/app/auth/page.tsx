"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { useAuth } from "../../state/auth";
import { useI18n } from "../../state/i18n";

export default function AuthPage() {
  const t = useI18n();
  const router = useRouter();
  const { setSession } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@neonix.app");
  const [pass, setPass] = useState("Password123!");
  const [confirm, setConfirm] = useState("");
  const [displayName, setDisplayName] = useState("Demo User");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (mode === "register" && pass !== confirm) {
      alert("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res =
        mode === "login"
          ? await api.auth.login({ email, password: pass })
          : await api.auth.register({ email, password: pass, displayName });
      setSession(res.token, res.user);
      router.push("/profile");
    } catch (e: any) {
      alert(e?.message || "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  const emailId = "auth-email";
  const passId = "auth-pass";
  const confirmId = "auth-confirm";
  const displayNameId = "auth-displayName";

  return (
    <section className="page">
      <div className="grid2">
        <div className="card">
          <div className="hd">
            <div>
              <h2 className="title">{t(mode === "login" ? "authTitle" : "regTitle")}</h2>
              <p className="subtitle">{t("authDesc")}</p>
            </div>
            <span className="pill">{t("authPill")}</span>
          </div>

          <div className="bd">
            <div className="seg">
              <button
                type="button"
                className={`segBtn ${mode === "login" ? "active" : ""}`}
                onClick={() => setMode("login")}
              >
                {t("tabLogin")}
              </button>
              <button
                type="button"
                className={`segBtn ${mode === "register" ? "active" : ""}`}
                onClick={() => setMode("register")}
              >
                {t("tabRegister")}
              </button>
            </div>

            <div className="row2 mt10">
              <div className="field">
                <label className="label" htmlFor={emailId}>
                  {t("lblEmail")}
                </label>
                <input
                  id={emailId}
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="field">
                <label className="label" htmlFor={passId}>
                  {t("lblPassword")}
                </label>
                <input
                  id={passId}
                  className="input"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                />
              </div>
            </div>

            {mode === "register" && (
              <div className="row2">
                <div className="field">
                  <label className="label" htmlFor={confirmId}>
                    {t("lblConfirm")}
                  </label>
                  <input
                    id={confirmId}
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor={displayNameId}>
                    {t("lblDisplayNameReg")}
                  </label>
                  <input
                    id={displayNameId}
                    className="input"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="actionsRow">
              <button className="btn primary" type="button" onClick={submit} disabled={loading}>
                {loading ? t("btnLoading") : mode === "login" ? t("btnAuthSubmit") : t("btnRegisterSubmit")}
              </button>
            </div>

            <p className="help">
              {mode === "login" ? t("authHelpLogin") : t("authHelpRegister")}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="hd">
            <div>
              <h2 className="title">{t("authSideTitle")}</h2>
              <p className="subtitle">{t("authSideDesc")}</p>
            </div>
          </div>
          <div className="bd">
            <div className="list">
              <div className="item">
                <b>{t("as1")}</b>
                <div className="meta">{t("as1d")}</div>
              </div>
              <div className="item">
                <b>{t("as2")}</b>
                <div className="meta">{t("as2d")}</div>
              </div>
              <div className="item">
                <b>{t("as3")}</b>
                <div className="meta">{t("as3d")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
