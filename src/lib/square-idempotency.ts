/**
 * Square's idempotency keys are capped at 45 characters and
 * enforce a strict "same key, same params" rule. When a prior
 * request failed with one set of params and a later request
 * reuses the same key with different params (new card, new
 * customer after a reset, drifted prorated amount, etc.),
 * Square returns 400 IDEMPOTENCY_KEY_REUSED.
 *
 * The cached failure means no Square-side state change actually
 * happened, so the safe recovery is to retry with a fresh key.
 * This helper wraps any Square create/pay call with that
 * recovery: try the stable key, if Square rejects with the
 * specific reuse error, append a short timestamp suffix and go
 * again.
 *
 *   const resp = await retryOnIdempotencyReuse(
 *     `crd-${user.id}`,
 *     (key) => square.cards.create({ idempotencyKey: key, ... }),
 *   );
 */
export async function retryOnIdempotencyReuse<T>(
  baseKey: string,
  run: (idempotencyKey: string) => Promise<T>,
): Promise<T> {
  try {
    return await run(baseKey);
  } catch (err) {
    const code = (err as { errors?: { code?: string }[] }).errors?.[0]?.code;
    if (code !== "IDEMPOTENCY_KEY_REUSED") throw err;
    console.log(
      `[square] idempotency key reused (${baseKey}) — retrying with fresh key`,
    );
    return await run(freshKey(baseKey));
  }
}

/**
 * Append a short retry suffix and fit under Square's 45-char
 * idempotency limit. Prefers preserving the base key when it
 * already has room; truncates from the right when it doesn't.
 */
export function freshKey(baseKey: string): string {
  const suffix = `-r${Date.now().toString(36)}`;
  const MAX = 45;
  if (baseKey.length + suffix.length <= MAX) return baseKey + suffix;
  return baseKey.slice(0, MAX - suffix.length) + suffix;
}
