import { useEffect, useRef, useState } from "react";

/**
 * Bouton WhatsApp flottant : ouvre une conversation WhatsApp avec le
 * numero de la boutique. Le produit courant est pre-rempli dans le message
 * pour que le client n'ait pas a le resaisir.
 */

// Numero de la boutique au format international sans « + », renseigne par
// VITE_WHATSAPP_NUMBER. La valeur de secours sert de garde-fou tant que
// l'identifiant n'est pas configure.
const DEFAULT_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "33773163772";

type Props = {
  /** Numero de la boutique, format international sans « + ». */
  number?: string;
  /** Produit affiche dans la modale, pour pre-remplir le message. */
  productName?: string;
  productPrice?: number;
  /** Devise du prix, pour l'ecrire dans le message. */
  currency?: string;
};

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value || 0);

function buildMessage(productName?: string, productPrice?: number, currency?: string) {
  if (!productName) {
    return "Bonjour Tawes Store, je souhaite des informations sur vos produits.";
  }
  const price = productPrice ? ` (${money(productPrice, currency ?? "MAD")})` : "";
  return `Bonjour Tawes Store, je souhaite commander « ${productName} »${price}. Est-il toujours disponible ?`;
}

export default function WhatsAppButton({
  number = DEFAULT_NUMBER,
  productName,
  productPrice,
  currency = "MAD",
}: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Le message se construit a l'ouverture, pour refleter le produit
  // choisi au moment ou le client clique.
  useEffect(() => {
    if (!open) return;
    setText(buildMessage(productName, productPrice, currency));
    // Le focus est differe : la modale doit etre montee d'abord.
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open, productName, productPrice, currency]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const href = `https://wa.me/${number}?text=${encodeURIComponent(text || buildMessage(productName, productPrice, currency))}`;

  return (
    <>
      <button
        type="button"
        className="wa-float"
        onClick={() => setOpen((value) => !value)}
        aria-label="Discuter sur WhatsApp"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true">
          <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35zM12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15c-1.53 0-3.03-.41-4.34-1.19l-.31-.18-3.12.82.83-3.04-.2-.32a8.1 8.1 0 0 1-1.25-4.33c0-4.49 3.66-8.15 8.16-8.15 2.18 0 4.23.85 5.77 2.39a8.11 8.11 0 0 1 2.39 5.77c0 4.5-3.66 8.16-8.15 8.16z" />
        </svg>
        {!open && <span className="wa-float-label">Commander sur WhatsApp</span>}
      </button>

      {open && (
        <>
          <div className="wa-backdrop" onClick={() => setOpen(false)} />
          <div className="wa-panel" role="dialog" aria-label="Commander sur WhatsApp">
            <div className="wa-head">
              <div className="wa-avatar">T</div>
              <div className="wa-head-text">
                <strong>Tawes Store</strong>
                <span>Répond sur WhatsApp</span>
              </div>
              <button className="wa-close" onClick={() => setOpen(false)} aria-label="Fermer">×</button>
            </div>

            <div className="wa-body">
              <p className="wa-hint">
                {productName
                  ? <>Vous souhaitez commander <strong>{productName}</strong>{productPrice ? <> à <strong>{money(productPrice, currency)}</strong></> : null}. Confirmez ou modifiez le message.</>
                  : "Dites-nous ce que vous cherchez, nous confirmons la disponibilité et le prix."}
              </p>
              <textarea
                ref={inputRef}
                className="wa-input"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={3}
                aria-label="Votre message"
              />
            </div>

            <a className="wa-send" href={href} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35zM12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2z" />
              </svg>
              Ouvrir WhatsApp
            </a>
            <span className="wa-note">La commande se finalise directement dans WhatsApp.</span>
          </div>
        </>
      )}
    </>
  );
}
