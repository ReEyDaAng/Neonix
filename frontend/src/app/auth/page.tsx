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
  const [displayName, setDisplayName] = useState("Maksym");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (mode === "register" && pass !== confirm) {
      alert(t("errPasswords"));
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
            <div className="tabs" role="tablist">
              <button className={`tab ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>
                {t("tabLogin")}
              </button>
              <button className={`tab ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>
                {t("tabRegister")}
              </button>
            </div>

            <div className="row2 mt10">
              <div className="field">
                <div className="label">{t("lblEmail")}</div>
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="field">
                <div className="label">{t("lblPassword")}</div>
                <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
              </div>
            </div>

            {mode === "register" && (
              <div className="row2">
                <div className="field">
                  <div className="label">{t("lblConfirm")}</div>
                  <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                <div className="field">
                  <div className="label">{t("lblDisplayNameReg")}</div>
                  <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
              </div>
            )}

            <div className="actionsRow">
              <button className="btn primary" onClick={submit} disabled={loading}>
                {loading ? t("btnLoading") : mode === "login" ? t("btnAuthSubmit") : t("btnRegisterSubmit")}
              </button>
              <button className="btn ghost" onClick={() => router.push("/landing")}>
                {t("btnBackLanding")}
              </button>
            </div>

            <p className="hint mt10">
              {t("hintDemo")}
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
              <div className="item"><b>{t("as1")}</b><div className="meta">{t("as1d")}</div></div>
              <div className="item"><b>{t("as2")}</b><div className="meta">{t("as2d")}</div></div>
              <div className="item"><b>{t("as3")}</b><div className="meta">{t("as3d")}</div></div>
              <div className="item"><b>{t("as4")}</b><div className="meta">{t("as4d")}</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
