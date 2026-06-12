/** PostHog client config — project keys are public (safe in browser). */

/** Baked-in fallback so CI builds without env vars still ship analytics. */
const POSTHOG_KEY_FALLBACK =
  "phc_xRW8fkiKkedq3MaeVDBn2wRPQtUmcyvRvSGgSVWkqqv2";

export const POSTHOG_KEY =
  import.meta.env.PUBLIC_POSTHOG_KEY || POSTHOG_KEY_FALLBACK;

export const POSTHOG_HOST =
  import.meta.env.PUBLIC_POSTHOG_HOST || "https://z.e2.agency";

/** Only send analytics from this hostname (blocks localhost + preview URLs). */
export const POSTHOG_TRACKING_HOST =
  import.meta.env.PUBLIC_POSTHOG_TRACKING_HOST || "workwith.e2.agency";

export const POSTHOG_ENABLED = import.meta.env.PROD;
