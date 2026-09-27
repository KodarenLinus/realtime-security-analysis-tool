import { apiClientLaya } from "./laya/client";

async function main() {
  const laya = apiClientLaya({ apiKey: "changeme", timeout: 30000 });

  const res = await laya.predict('db.query("SELECT * FROM users WHERE id = " + req.params.id)', {
    risk: { type: "choice", instructions: "Is this code a security risk?",
            criteria: { risky: "yes, it has a security risk", safe: "no obvious risk" } },
  });
  console.log(JSON.stringify(res, null, 2));
}

main().catch((err) => console.error(err));