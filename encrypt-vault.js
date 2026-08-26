#!/usr/bin/env node
/*
 * Bundles the plaintext data files into a single encrypted vault.enc.
 *
 *   node encrypt-vault.js
 *
 * Prompts for the passphrase (hidden). The passphrase is never written to disk,
 * never stored in this repo, and never appears in shell history.
 *
 * Re-run this ANY TIME you change data.js / eccv.js / links.js / emails.js /
 * clusters.js — the app reads vault.enc, not those files.
 *
 * Crypto: PBKDF2-SHA256 (310k iterations) -> AES-256-GCM.
 * Output layout: base64( salt[16] || iv[12] || ciphertext || gcmTag[16] )
 * which is exactly what WebCrypto's AES-GCM decrypt expects (tag appended).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ITER = 310000;
const SOURCES = [
  ["data.js", "PHD_DATA"],
  ["eccv.js", "ECCV_DATA"],
  ["links.js", "PHD_LINKS"],
  ["emails.js", "PHD_EMAILS"],
  ["clusters.js", "PHD_CLUSTERS"],
];

function loadSources() {
  const sandbox = { window: {} };
  for (const [file] of SOURCES) {
    const p = path.join(__dirname, file);
    if (!fs.existsSync(p)) throw new Error("missing source file: " + file);
    // each data file is a single `window.X = {...};` assignment
    new Function("window", fs.readFileSync(p, "utf8")).call(null, sandbox.window);
  }
  const vault = {};
  for (const [file, key] of SOURCES) {
    if (!sandbox.window[key]) throw new Error(`${file} did not define window.${key}`);
    vault[key] = sandbox.window[key];
  }
  return vault;
}

function askPassphrase(prompt) {
  return new Promise((resolve, reject) => {
    if (process.env.VAULT_PASS) return resolve(process.env.VAULT_PASS);
    if (!process.stdin.isTTY) return reject(new Error("no TTY — run this in a terminal, or set VAULT_PASS"));
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    let buf = "";
    const onData = ch => {
      if (ch === "\r" || ch === "\n" || ch === "") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        return resolve(buf);
      }
      if (ch === "") { process.stdout.write("\n"); process.exit(1); }        // ctrl-C
      if (ch === "" || ch === "\b") { buf = buf.slice(0, -1); return; }      // backspace
      buf += ch;
    };
    process.stdin.on("data", onData);
  });
}

(async () => {
  const vault = loadSources();
  const json = JSON.stringify(vault);

  const pass = await askPassphrase("Passphrase: ");
  if (!pass) { console.error("Empty passphrase — aborted."); process.exit(1); }
  if (process.stdin.isTTY && !process.env.VAULT_PASS) {
    const again = await askPassphrase("Confirm:    ");
    if (again !== pass) { console.error("Passphrases did not match — aborted."); process.exit(1); }
  }

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(pass, salt, ITER, 32, "sha256");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const out = Buffer.concat([salt, iv, ct, cipher.getAuthTag()]);

  fs.writeFileSync(path.join(__dirname, "vault.enc"), out.toString("base64") + "\n");
  const kb = n => (n / 1024).toFixed(1) + " KB";
  console.log(`vault.enc written — ${SOURCES.length} sources, ${kb(json.length)} plaintext -> ${kb(out.length * 4 / 3)} encrypted`);
  console.log("Remember: commit vault.enc; the plaintext data files stay local (gitignored).");
})().catch(e => { console.error("Error:", e.message); process.exit(1); });
