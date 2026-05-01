/* eslint-disable no-console */
// Genereer VAPID keys voor web push.
// Gebruik: `node scripts/generate-vapid-keys.js`
// Voeg de output toe aan .env.local en aan Vercel Environment Variables.
const webpush = require("web-push")

const keys = webpush.generateVAPIDKeys()
console.log("\nGenereer onderstaande env vars:\n")
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log("VAPID_SUBJECT=mailto:willem@bamalite.com")
console.log("\nOptioneel:")
console.log("NOTIFICATIONS_TEST_MODE=true\n")
