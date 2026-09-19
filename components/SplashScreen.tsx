"use client";

import { useEffect, useState } from "react";

const SPLASH_DURATION_MS = 4500;

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), SPLASH_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className="splash" role="dialog" aria-modal="true" aria-label="Présentation de SquidSpeakerine">
      <picture className="splash-art">
        <source media="(max-width: 640px)" srcSet="/images/squidspeakerine-mobile.png" />
        <source media="(max-width: 1024px)" srcSet="/images/squidspeakerine-medium.png" />
        <img src="/images/squidspeakerine-wide.png" alt="SquidSpeakerine" />
      </picture>
      <div className="splash-shade" />
      <div className="splash-content">
        <p className="splash-kicker">SquidSpeakerine</p>
        <p className="splash-caption">Prépare ta prise, puis laisse le texte défiler.</p>
        <button type="button" className="splash-close" onClick={() => setVisible(false)}>
          Fermer
        </button>
      </div>
      <div className="splash-progress" aria-hidden="true" />
    </div>
  );
}
