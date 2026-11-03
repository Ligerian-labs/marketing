// This source is embedded unchanged in Base so the SDK is never requested on
// local/preview hosts. Page queries, fragments, referrers and form text stay out.
(() => {
  if (!["ligerianlabs.fr", "www.ligerianlabs.fr"].includes(window.location.hostname)) return;
  try {
    if (window.localStorage.getItem("ll_analytics_disabled") === "1") return;
  } catch { return; }
  const paths = {
    "/": "home", "/offres/": "offres", "/contact/": "contact", "/approche/": "approche",
    "/ia-angers/": "angers", "/ia-angers-pme/": "angers_pme", "/a-propos/": "about",
    "/blog/": "blog", "/formations/": "formations", "/kit-presse/": "press", "/mentions-legales/": "legal",
    "/developpement-logiciel-sur-mesure/": "software", "/integration-ia/": "ai", "/realisations/": "projects",
  };
  const path = window.location.pathname.replace(/\/*$/, "/");
  const page = paths[path] || (path.startsWith("/blog/") ? "blog_article" : path.startsWith("/realisations/") ? "project" : "other");
  if (page === "other") return;
  const projectTypes = new Set(["new-application", "existing-software", "ai-integration", "other"]);
  const events = new Set(["$pageview", "blog_post_viewed", "email_contact_click", "service_enquiry_click", "contact_form_submitted"]);
  const token = "phc_RWvhEosblAK0FyygISQWlIb0ljI7EoYwQLQYlMh6wK4";
  const beforeSend = (event) => {
    if (!event || !events.has(event.event)) return null;
    const input = event.properties || {};
    const properties = { page, token };
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
    if (["offres", "software", "ai", "angers", "angers_pme"].includes(page)) capture("service_enquiry_click");
  });
})();
