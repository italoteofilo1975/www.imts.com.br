import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { syntheticJourney } from "../app/prototype/controls.mjs";

const exec = promisify(execFile);
const startedAt = new Date().toISOString();
const personas = ["solution", "relations", "initiative", "technology", "partnership", "talent", "capital"];
let testResult;
try {
  const { stdout } = await exec(process.execPath, ["--test", "tests/prototype-controls.test.mjs"]);
  testResult = { status: "passed", output: stdout.trim().split("\n").slice(-8) };
} catch (error) {
  testResult = { status: "failed", output: String(error.stdout || error.message).trim().split("\n").slice(-8) };
}

const report = {
  title: "IMTS Prototype Evidence Lab",
  classification: "SIMULATED — NOT PRODUCTION EVIDENCE",
  startedAt,
  completedAt: new Date().toISOString(),
  evidenceLevel: "E2",
  suite: testResult,
  journeys: personas.map((persona) => syntheticJourney(persona)),
  productionGatesStillRequired: [
    "OIDC/JWT and MFA active in the production identity provider",
    "distributed rate limiting against the real multi-instance topology",
    "provider backup restore with approved RPO/RTO",
    "Resend delivery, SPF, DKIM and DMARC",
    "public DNS, TLS, HSTS and canonical redirects",
    "manual NVDA, VoiceOver and real-device accessibility evidence",
    "DPO/legal approval and real data-subject process",
    "live alerts received by named operational responders",
  ],
};

await mkdir("evidence", { recursive: true });
await writeFile("evidence/prototype-latest.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ classification: report.classification, evidenceLevel: report.evidenceLevel, status: testResult.status, journeys: report.journeys.length }));
if (testResult.status !== "passed") process.exitCode = 1;
