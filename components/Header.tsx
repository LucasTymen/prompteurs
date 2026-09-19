"use client";

type Props = {
  onTheme: () => void;
  onFullscreen: () => void;
};

// Barre supérieure compacte : identité du produit + actions globales.
export default function Header({ onTheme, onFullscreen }: Props) {
  return (
    <header className="app-header">
      <p className="app-title">SquidSpeakerine</p>
      <div className="app-header-actions">
        <button type="button" onClick={onTheme} aria-label="Basculer le thème">Thème</button>
        <button type="button" onClick={onFullscreen} aria-label="Plein écran">Plein écran</button>
      </div>
    </header>
  );
}
