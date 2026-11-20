"use server";

import { redirect } from "next/navigation";

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

/** Saves the draft, then shows the page again with its title. */
export async function saveDraft(form: FormData) {
  redirect(`/?saved=${encodeURIComponent(field(form, "title") || "Untitled")}`);
}

/** Sends the invitation. Its button is busy, so this never runs; the tests check that. */
export async function sendInvitation(form: FormData) {
  redirect(`/?invited=${encodeURIComponent(field(form, "email"))}`);
}
