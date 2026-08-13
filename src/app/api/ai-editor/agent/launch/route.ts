import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { DEFAULT_AGENT_BASE_URL } from "@/lib/aiEditor/agentProtocol";
import { isAiEditorEnabled } from "@/lib/aiEditor/featureFlag";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Desktop Agent can only be spawned on a local workstation, never on Vercel/Lambda. */
function isCloudServerlessHost(): boolean {
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.FUNCTION_TARGET) ||
    process.env.NEXT_RUNTIME === "edge"
  );
}

async function agentHealthy(baseUrl = DEFAULT_AGENT_BASE_URL): Promise<boolean> {
  try {
    // Keep generous: older agents blocked /health on Whisper CLI cold-start.
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function requestAgentShutdown(baseUrl = DEFAULT_AGENT_BASE_URL): Promise<void> {
  try {
    await fetch(`${baseUrl.replace(/\/$/, "")}/v1/shutdown`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer restart",
      },
      body: "{}",
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    /* already down or old agent without /shutdown */
  }
}

/** Last resort on Windows if graceful shutdown is unavailable. */
function forceKillAgentPort(port = 17865): void {
  if (process.platform !== "win32") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require("child_process") as typeof import("child_process");
    const out = execSync(
      `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess"`,
      { encoding: "utf8" }
    ).trim();
    const pids = [...new Set(out.split(/\s+/).map((s) => s.trim()).filter(Boolean))];
    for (const pid of pids) {
      if (!/^\d+$/.test(pid)) continue;
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

function resolveAgentEntry(): string | null {
  const candidates = [
    path.join(process.cwd(), "desktop-agent", "src", "server.mjs"),
    path.join(process.cwd(), "..", "desktop-agent", "src", "server.mjs"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Merge latest Machine+User PATH so newly installed FFmpeg is visible to the agent. */
function refreshedEnv(): NodeJS.ProcessEnv {
  const machine = process.env.Path ?? process.env.PATH ?? "";
  let user = "";
  try {
    if (process.platform === "win32") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { execSync } = require("child_process") as typeof import("child_process");
      user = execSync(
        'powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'Path\',\'User\')"',
        { encoding: "utf8" }
      ).trim();
    }
  } catch {
    /* keep process PATH */
  }
  const merged = [machine, user].filter(Boolean).join(";");
  return {
    ...process.env,
    Path: merged || process.env.Path,
    PATH: merged || process.env.PATH,
  };
}

async function waitForHealthy(ms = 12000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await agentHealthy()) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return agentHealthy();
}

async function waitForStopped(ms = 8000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (!(await agentHealthy())) return;
    await new Promise((r) => setTimeout(r, 300));
  }
}

function resolveLogDir(agentCwd: string): string {
  const preferred = path.join(agentCwd, "..", ".tmp-smoke");
  try {
    fs.mkdirSync(preferred, { recursive: true });
    fs.accessSync(preferred, fs.constants.W_OK);
    return preferred;
  } catch {
    const fallback = path.join(os.tmpdir(), "shootspine-agent-launch");
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function spawnAgent(entry: string) {
  const cwd = path.dirname(path.dirname(entry));
  const logDir = resolveLogDir(cwd);
  const outLog = path.join(logDir, "agent-launch-stdout.log");
  const errLog = path.join(logDir, "agent-launch-stderr.log");

  let outFd: number | "ignore" = "ignore";
  let errFd: number | "ignore" = "ignore";
  try {
    outFd = fs.openSync(outLog, "a");
    errFd = fs.openSync(errLog, "a");
    fs.writeSync(
      errFd,
      `\n--- spawn ${new Date().toISOString()} node=${process.execPath} entry=${entry}\n`
    );
  } catch {
    outFd = "ignore";
    errFd = "ignore";
  }

  const child = spawn(process.execPath, [entry], {
    cwd,
    detached: true,
    stdio: ["ignore", outFd, errFd],
    windowsHide: true,
    env: refreshedEnv(),
  });
  child.unref();
  for (const fd of [outFd, errFd]) {
    if (typeof fd === "number") {
      try {
        fs.closeSync(fd);
      } catch {
        /* child may keep fds on Windows */
      }
    }
  }
}

/**
 * Start (or restart) the Desktop Agent when Next.js is running on this workstation.
 * Body: { restart?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAiEditorEnabled()) {
      return NextResponse.json({ error: "AI Editor is disabled" }, { status: 404 });
    }
    const { appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);

    if (isCloudServerlessHost()) {
      return NextResponse.json(
        {
          error:
            "Desktop Agent must run on your editing PC, not on the hosted ShootSpine server. On that workstation run start-agent.cmd (or npm run agent), then use AI Editor from the same machine — or use local Next.js (npm run dev).",
          code: "AGENT_NOT_LOCAL",
        },
        { status: 503 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { restart?: boolean };
    const restart = Boolean(body.restart);

    if (!restart && (await agentHealthy())) {
      return NextResponse.json({
        ok: true,
        alreadyRunning: true,
        baseUrl: DEFAULT_AGENT_BASE_URL,
      });
    }

    if (restart && (await agentHealthy())) {
      await requestAgentShutdown();
      await waitForStopped(4000);
      if (await agentHealthy()) {
        forceKillAgentPort(17865);
        await waitForStopped(4000);
      }
    }

    const entry = resolveAgentEntry();
    if (!entry) {
      return NextResponse.json(
        {
          error:
            "Desktop Agent files not found on this server. Run start-agent.cmd on your workstation, or use local Next.js (npm run dev) on the editing PC.",
          code: "AGENT_NOT_LOCAL",
        },
        { status: 503 }
      );
    }

    // If something is already listening (stale agent), don't double-spawn — wait for it.
    if (!(await agentHealthy())) {
      spawnAgent(entry);
    }

    const healthy = await waitForHealthy(15000);
    if (!healthy) {
      return NextResponse.json(
        {
          error:
            "Agent process was started but did not become healthy. Check that Node can run desktop-agent/src/server.mjs, port 17865 is free, and .tmp-smoke/agent-launch-stderr.log for startup errors. Or run: npm run agent",
          code: "AGENT_START_TIMEOUT",
          baseUrl: DEFAULT_AGENT_BASE_URL,
        },
        { status: 504 }
      );
    }

    return NextResponse.json({
      ok: true,
      alreadyRunning: false,
      started: true,
      restarted: restart,
      baseUrl: DEFAULT_AGENT_BASE_URL,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to launch agent";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
