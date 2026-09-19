"use client";

type Props = { value: number };

// Compte à rebours plein écran : 3, 2, 1 avec effet de zoom.
// La clé `value` force le remontage du span à chaque chiffre pour rejouer l'animation.
export default function Countdown({ value }: Props) {
  return (
    <div className="countdown-overlay" aria-hidden>
      <span key={value} className="countdown-number">{value}</span>
    </div>
  );
}
