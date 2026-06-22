import { execSync } from "node:child_process";
import net from "node:net";
import os from "node:os";

const PORT = 3001;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "::");
  });
}

function killWindowsPortHolder(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set(
      output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.includes("LISTENING"))
        .map((line) => line.split(/\s+/).pop())
        .filter(Boolean),
    );

    for (const pid of pids) {
      execSync(`wmic process where processid=${pid} delete`, { stdio: "ignore" });
    }
  } catch {
    // ignore
  }
}

async function freePort(port) {
  for (let attempt = 0; attempt < 5; attempt++) {
    if (await isPortFree(port)) return true;

    try {
      execSync(`npx kill-port ${port}`, { stdio: "inherit" });
    } catch {
      // ignore
    }

    if (os.platform() === "win32") {
      killWindowsPortHolder(port);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return isPortFree(port);
}

if (process.env.CLEAN_NEXT === "1" || !(await isPortFree(PORT))) {
  try {
    execSync("npx rimraf .next", { stdio: "inherit" });
  } catch {
    try {
      execSync(process.platform === "win32" ? "rmdir /s /q .next" : "rm -rf .next", {
        stdio: "ignore",
      });
    } catch {
      // ignore
    }
  }
}

const ready = await freePort(PORT);
if (!ready) {
  console.error(
    `\nPort ${PORT} is still in use. Close any old AgentPlatform terminal, then run:\n  npm run dev\n`,
  );
  process.exit(1);
}

execSync(`npx next dev -p ${PORT}`, { stdio: "inherit" });
