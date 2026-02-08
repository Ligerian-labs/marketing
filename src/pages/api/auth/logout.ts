export const prerender = false;
import type { APIRoute } from "astro";
import { getSessionFromCookies, deleteSession, clearSessionCookie } from "../../../lib/auth";

export const GET: APIRoute = async ({ cookies, redirect }) => {
  const session = getSessionFromCookies(cookies);
  if (session) {
    deleteSession(session.id);
  }
  clearSessionCookie(cookies);
  return redirect("/");
};
