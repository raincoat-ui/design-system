"use server";

import { redirect } from "next/navigation";

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

/** Saves the draft, then shows the page again with its title. */
export async function saveDraft(form: FormData) {
  redirect(`/?saved=${encodeURIComponent(field(form, "title") || "Untitled")}`);
}

/**
 * Subscribes an email address, or, when it is not one, shows the form again with the field in
 * error and the address as it was typed.
 */
export async function subscribe(form: FormData) {
  const email = field(form, "email");
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
    redirect(`/input?invalid=email&email=${encodeURIComponent(email)}`);
  }
  redirect(`/input?subscribed=${encodeURIComponent(email)}`);
}

/** Sends the invitation. Its button is busy, so this never runs; the tests check that. */
export async function sendInvitation(form: FormData) {
  redirect(`/?invited=${encodeURIComponent(field(form, "email"))}`);
}
