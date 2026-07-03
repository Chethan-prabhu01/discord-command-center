const nacl = require("tweetnacl");

/**
 * Verifies every incoming request against Discord's Ed25519 signature.
 * Discord signs: timestamp + rawBody, using the app's public key.
 * This MUST run before any JSON parsing that would alter the raw bytes,
 * which is why server.js captures `req.rawBody` in the json() verify hook.
 *
 * Discord will disable your interactions endpoint if this check is wrong,
 * and a forged/replayed request without a valid signature must be rejected
 * with 401 before any command logic runs.
 */
function verifyDiscordRequest(req, res, next) {
  const signature = req.get("X-Signature-Ed25519");
  const timestamp = req.get("X-Signature-Timestamp");
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!signature || !timestamp || !publicKey) {
    return res.status(401).send("invalid request signature");
  }

  const rawBody = req.rawBody; // Buffer set in server.js
  if (!rawBody) {
    return res.status(401).send("missing raw body for verification");
  }

  const isValid = nacl.sign.detached.verify(
    Buffer.concat([Buffer.from(timestamp), rawBody]),
    Buffer.from(signature, "hex"),
    Buffer.from(publicKey, "hex")
  );

  if (!isValid) {
    return res.status(401).send("invalid request signature");
  }

  next();
}

module.exports = verifyDiscordRequest;
