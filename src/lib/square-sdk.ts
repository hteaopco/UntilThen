"use client";

/**
 * Client-side Square Web Payments SDK loader + typed handle.
 *
 * The SDK script is loaded from Square's CDN the first time a
 * checkout component mounts. Subsequent calls short-circuit to
 * the cached promise so the script is only inserted once per
 * page load.
 *
 * Types are declared locally (rather than pulling in an extra
 * @types dep) because we only touch a thin surface:
 *
 *   Square.payments(appId, locationId) → payments
 *   payments.card() → card
 *   card.attach("#el-id")
 *   card.tokenize() → { status, token, errors }
 *
 * Enough to stand up the card-on-file + one-time payment flows.
 */

export type SquareTokenizeResult =
  | { status: "OK"; token: string; details?: unknown }
  | {
      status: "Invalid";
      errors?: { message?: string; type?: string; field?: string }[];
    };

export type SquareCard = {
  attach(selector: string): Promise<void>;
  tokenize(): Promise<SquareTokenizeResult>;
  destroy(): Promise<void>;
};

export type SquarePayments = {
  card(): Promise<SquareCard>;
};

type SquareGlobal = {
  payments(applicationId: string, locationId: string): SquarePayments;
};

declare global {
  interface Window {
    Square?: SquareGlobal;
  }
}

let loader: Promise<void> | null = null;

export function loadSquareSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Square SDK requires a browser."));
  }
  if (window.Square) return Promise.resolve();
  if (loader) return loader;

  loader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-square-sdk="true"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Square SDK failed to load.")),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://web.squarecdn.com/v1/square.js";
    script.async = true;
    script.dataset.squareSdk = "true";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Square SDK failed to load."));
    document.head.appendChild(script);
  });

  return loader;
}

/**
 * Convenience: load + initialize + attach a card input in one
 * call. Returns the `SquareCard` handle so the caller can
 * tokenize + destroy on submit / unmount.
 */
export async function createSquareCardInput(
  applicationId: string,
  locationId: string,
  elementSelector: string,
): Promise<SquareCard> {
  await loadSquareSdk();
  if (!window.Square) {
    throw new Error("Square SDK isn't available after load.");
  }
  const payments = window.Square.payments(applicationId, locationId);
  const card = await payments.card();
  await card.attach(elementSelector);
  return card;
}
