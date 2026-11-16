#!/usr/bin/env node
// Waits until a URL answers 200: `node tools/release/wait-for-url.mjs <url> [minutes]`.
// GitHub Pages takes a minute or two to serve what was pushed to its branch.
const [url, minutes = "10"] = process.argv.slice(2);
if (!url) {
  console.error("usage: wait-for-url.mjs <url> [minutes]");
  process.exit(2);
}
const deadline = Date.now() + Number(minutes) * 60_000;
for (;;) {
  let status = "no answer";
  try {
    status = (await fetch(url, { method: "HEAD", cache: "no-store" })).status;
  } catch {}
  if (status === 200) {
    console.log(`${url} is being served.`);
    break;
  }
  if (Date.now() > deadline) {
    console.error(`${url} was not served within ${minutes} minutes (last answer: ${status}).`);
    process.exit(1);
  }
  await new Promise((resolve) => setTimeout(resolve, 10_000));
}
