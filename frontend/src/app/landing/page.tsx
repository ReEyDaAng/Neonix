"use client";

import Link from "next/link";
import { useI18n } from "../../state/i18n";
import { MagicIcon } from "../components/icons/MagicIcon";
import { RocketIcon } from "../components/icons/RocketIcon";
import { LightbulbIcon } from "../components/icons/LightbulbIcon";

export default function LandingPage() {
  const t = useI18n();

  return (
    <section className="page">
      <div className="hero">
        <div className="heroRow">
          <div className="heroLeft">
            <h1>{t("heroTitle")}</h1>
            <p>{t("heroText")}</p>

            <div className="cta">
              <Link className="btn primary" href="/auth">{t("heroCtaPrimary")}</Link>
              <Link className="btn" href="/chat">{t("heroCtaSecondary")}</Link>
              <Link className="btn ghost" href="/settings">{t("heroCtaTertiary")}</Link>
            </div>

            <div className="mini">
              <span className="pill"><RocketIcon /> {t("pillFeature1")}</span>
              <span className="pill"><MagicIcon /> {t("pillFeature2")}</span>
              <span className="pill"><LightbulbIcon /> {t("pillFeature3")}</span>
              <span className="pill">🧩 {t("pillFeature4")}</span>
            </div>
          </div>

          <div className="heroMark" aria-hidden="true">
            <div className="markCard">
              <div className="markTop">
                <div className="markDot" />
                <div className="markDot" />
                <div className="markDot" />
              </div>
              <div className="markBody">
                <div className="markLine" />
                <div className="markLine short" />
                <div className="markLine" />
                <div className="markGlow" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid2 mt18">
          <div className="card">
            <div className="hd">
              <div>
                <h2 className="title">{t("landingCard1Title")}</h2>
                <p className="subtitle">{t("landingCard1Desc")}</p>
              </div>
              <span className="pill">⚡ MVP</span>
            </div>
            <div className="bd">
              <div className="list">
                <div className="item"><b>{t("l1a")}</b><div className="meta">{t("l1ad")}</div></div>
                <div className="item"><b>{t("l1b")}</b><div className="meta">{t("l1bd")}</div></div>
                <div className="item"><b>{t("l1c")}</b><div className="meta">{t("l1cd")}</div></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="hd">
              <div>
                <h2 className="title">{t("landingCard2Title")}</h2>
                <p className="subtitle">{t("landingCard2Desc")}</p>
              </div>
              <span className="pill">🛡️</span>
            </div>
            <div className="bd">
              <div className="list">
                <div className="item"><b>{t("l2a")}</b><div className="meta">{t("l2ad")}</div></div>
                <div className="item"><b>{t("l2b")}</b><div className="meta">{t("l2bd")}</div></div>
                <div className="item"><b>{t("l2c")}</b><div className="meta">{t("l2cd")}</div></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
