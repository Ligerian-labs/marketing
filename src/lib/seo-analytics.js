// This source is embedded unchanged in Base so the SDK is never requested on
// local/preview hosts. Page queries, fragments, referrers and form text stay out.
(() => {
  if (!["ligerianlabs.fr", "www.ligerianlabs.fr"].includes(window.location.hostname)) return;
  try {
    if (window.localStorage.getItem("ll_analytics_disabled") === "1") return;
  } catch { return; }
  const publicPaths = new Set(LL_PUBLIC_PAGE_PATHS);
  const paths = {
    "/": "home", "/offres/": "offres", "/expertise/": "expertise", "/contact/": "contact", "/approche/": "approche",
    "/ia-angers/": "angers", "/ia-angers-pme/": "angers_pme", "/a-propos/": "about",
    "/blog/": "blog", "/formations/": "formations", "/kit-presse/": "press", "/mentions-legales/": "legal",
    "/developpement-logiciel-sur-mesure/": "software", "/integration-ia/": "ai", "/realisations/": "projects",
  };
  const path = window.location.pathname.replace(/\/*$/, "/");
  if (!publicPaths.has(path)) return;
  const page = paths[path] || (path.startsWith("/blog/") ? "blog_article" : path.startsWith("/realisations/") ? "project" : "other");
  if (page === "other") return;
  const channels = new Set(["direct", "organic", "maps", "social", "referral", "campaign"]);
  const incomingChannel = () => {
    const query = new URLSearchParams(window.location.search);
    const source = (query.get("utm_source") || "").toLowerCase();
    const medium = (query.get("utm_medium") || "").toLowerCase();
    if (["google_maps", "google-business-profile", "gbp", "gmb"].includes(source)) return "maps";
    if (["google", "bing", "duckduckgo"].includes(source) && medium === "organic") return "organic";
    if (query.has("utm_source") || query.has("utm_medium") || query.has("utm_campaign")) return "campaign";
    let referrer;
    try { referrer = new URL(document.referrer); } catch { return null; }
    if (referrer.origin === window.location.origin) return null;
    const host = referrer.hostname.replace(/^www\./, "");
    if (["maps.google.com", "maps.google.fr"].includes(host)) return "maps";
    if (["google.com", "google.fr", "bing.com", "duckduckgo.com", "search.yahoo.com", "search.brave.com"].includes(host)) return "organic";
    if (["linkedin.com", "l.linkedin.com", "facebook.com", "l.facebook.com", "instagram.com", "x.com", "t.co"].includes(host)) return "social";
    return "referral";
  };
  // Keep only public path IDs and a channel enum for this browser tab. This
  // is first-touch context, not a visitor ID or cross-visit identity store.
  let context;
  try { context = JSON.parse(window.sessionStorage.getItem("ll_analytics_context") || "null"); } catch {}
  const incoming = incomingChannel();
  if (incoming || !context || !publicPaths.has(context.landing_page_id) || !channels.has(context.channel)) {
    context = { landing_page_id: path, channel: incoming || "direct" };
  }
  context = { landing_page_id: context.landing_page_id, channel: context.channel };
  try { window.sessionStorage.setItem("ll_analytics_context", JSON.stringify(context)); } catch {}
  const projectTypes = new Set(["new-application", "existing-software", "maintenance", "ai-integration", "other"]);
  const events = new Set(["$pageview", "blog_post_viewed", "email_contact_click", "service_enquiry_click", "contact_form_submitted"]);
  const token = "phc_RWvhEosblAK0FyygISQWlIb0ljI7EoYwQLQYlMh6wK4";
  const beforeSend = (event) => {
    if (!event || !events.has(event.event)) return null;
    const input = event.properties || {};
    const properties = { page, page_id: path, landing_page_id: context.landing_page_id, channel: context.channel, token };
    // Fresh memory-only anonymous SDK identifiers, never an identified profile.
    for (const key of ["distinct_id", "$device_id", "$session_id", "$window_id"]) {
      if (typeof input[key] === "string" && /^[0-9a-f-]{36}$/i.test(input[key])) properties[key] = input[key];
    }
    if (event.event === "contact_form_submitted" && projectTypes.has(input.project_type)) properties.project_type = input.project_type;
    return { ...event, properties };
  };
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageviewId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  window.posthog.init(token, {
    api_host: "https://ligerianlabs.fr/ingest",
    ui_host: "https://eu.posthog.com",
    person_profiles: "never",
    persistence: "memory",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    disable_surveys: true,
    advanced_disable_feature_flags: true,
    capture_exceptions: false,
    before_send: beforeSend,
  });
  const capture = (name) => {
    try { window.posthog?.capture(name, { page }); } catch { /* Navigation remains usable without analytics. */ }
  };
  capture("$pageview");
  document.addEventListener("click", (event) => {
    const anchor = event.target?.closest?.("a[href]");
    if (!anchor) return;
    const href = anchor.getAttribute("href") || "";
    if (href.startsWith("mailto:")) { capture("email_contact_click"); return; }
    let target;
    try { target = new URL(href, window.location.origin); } catch { return; }
    if (target.origin !== window.location.origin || target.pathname.replace(/\/*$/, "/") !== "/contact/") return;
    if (["offres", "expertise", "software", "ai", "angers", "angers_pme"].includes(page)) capture("service_enquiry_click");
  });
})();
