// Tiny environment helpers. Use these instead of inlining
// `process.env.NODE_ENV === "production"` checks so the meaning
// of each branch is obvious at the call site.
//
// Next.js types NODE_ENV as the union "development" | "production"
// | "test", but Railway sets NODE_ENV="staging" on the staging
// environment. The string compare is widened to handle that
// without TS warnings.
const nodeEnv = process.env.NODE_ENV as string | undefined;

export const isProduction = nodeEnv === "production";
export const isStaging = nodeEnv === "staging";
export const isDevelopment = nodeEnv === "development";

// Real email + payment side-effects only fire in production.
// Staging still talks to Resend/Square but the upstream keys
// are sandbox keys, so this gates anything that would surprise
// a real user.
export const shouldSendRealEmails = isProduction;
