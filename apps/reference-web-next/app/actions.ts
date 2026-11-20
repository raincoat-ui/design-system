"use server";

import { redirect } from "next/navigation";

/**
 * Records which button submitted the form. The page shows it in the line at the top, which is
 * how the tests see that an action ran. It works the same with JavaScript, when Next.js calls
 * it from the page, and without, when the browser posts the form.
 */
export async function record(form: FormData) {
  const name = form.get("action");
  redirect(typeof name === "string" ? `/?last=${encodeURIComponent(name)}` : "/");
}
