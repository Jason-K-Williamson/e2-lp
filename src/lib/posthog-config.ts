/** PostHog client config — PUBLIC_* vars are safe in the browser (project API keys). */

export const POSTHOG_KEY = import.meta.env.PUBLIC_POSTHOG_KEY ?? "";
export const POSTHOG_HOST =
  import.meta.env.PUBLIC_POSTHOG_HOST ?? "https://z.e2.agency";
/** Only send analytics from this hostname (blocks localhost + preview URLs). */
export const POSTHOG_TRACKING_HOST =
  import.meta.env.PUBLIC_POSTHOG_TRACKING_HOST ?? "workwith.e2.agency";

export const POSTHOG_ENABLED =
  Boolean(POSTHOG_KEY) && import.meta.env.PROD;
