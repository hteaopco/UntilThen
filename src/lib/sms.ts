// Thin Twilio wrapper. Best-effort send like the Resend helper:
// if Twilio isn't configured or the call fails, we log and
// return null so callers don't have to wrap every send in
// try/catch. Uses the REST API directly so we don't pull the
// twilio npm package (5MB+) just to POST a form.
//
// Two sender paths:
//   TWILIO_FROM_NUMBER         — single E.164 number, simple.
//   TWILIO_MESSAGING_SERVICE_SID — Twilio Messaging Service
//                                  (failover, sender pools,
//                                  opt-out keyword handling).
// If both are set, MessagingServiceSid wins.

interface SendSmsOpts {
  /** E.164 destination, e.g. "+13372702621". */
  to: string;
  /** SMS body. Twilio segments at 160 chars (GSM-7) or 70
   *  (UCS-2 once any non-GSM character — emoji, smart quote —
   *  is included). Each segment is billed separately. */
  body: string;
}

export async function sendSms(opts: SendSmsOpts): Promise<string | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken) {
    console.warn("[sms] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set");
    return null;
  }
  if (!fromNumber && !messagingServiceSid) {
    console.warn(
      "[sms] need TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID",
    );
    return null;
  }

  const params = new URLSearchParams();
  params.set("To", opts.to);
  params.set("Body", opts.body);
  if (messagingServiceSid) {
    params.set("MessagingServiceSid", messagingServiceSid);
  } else if (fromNumber) {
    params.set("From", fromNumber);
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${auth}`,
        },
        body: params.toString(),
      },
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[sms] Twilio rejected:", res.status, errText);
      return null;
    }
    const data = (await res.json()) as { sid?: string };
    return data.sid ?? null;
  } catch (err) {
    console.error("[sms] send failed:", err);
    return null;
  }
}
