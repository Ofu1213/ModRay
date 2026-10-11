import { app, BrowserWindow, ipcMain, Menu } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import { fileURLToPath } from "url";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import iconv from "iconv-lite";
import AdmZip from "adm-zip";
import { shell } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let buildProcess: ChildProcessWithoutNullStreams | null = null;
let runProcess: ChildProcessWithoutNullStreams | null = null;
let codexProcess: ChildProcessWithoutNullStreams | null = null;
// const codexLoginId: string | null = null;
let codexBuffer = "";
let codexThreadId: string | null = null;
let codexInitialized = false;
let codexInitPromise: Promise<void> | null = null;
let codexInitResolve: (() => void) | null = null;
let codexTurnId: string | null = null;


type PendingCodexRequest = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  text: string;
  cwd?: string;
  responseText: string;
};

let pendingCodexModelsRequest: {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
} | null = null;

let pendingCodexRequest: PendingCodexRequest | null = null;

let pendingCodexFileChanges: {
  itemId: string;
  changes: Array<{
    path: string;
    kind: {
      type: string;
      move_path?: string | null;
    };
    diff: string;
  }>;
} | null = null;



interface JavaInstallation {
  version: string;
  path: string;
  installed: boolean;
}

const getProjectsRoot = () => {
  const homeDir = app.getPath("home");
  return path.join(homeDir, "ModRayProjects");
};

const getJavaRoot = () => {
  return path.join(app.getPath("userData"), "Java");
};

function getFabricTemplateCacheRoot() {
  return path.join(app.getPath("userData"), "templates", "fabric");
}

function getFabricTemplateCachePath(mcVersion: string) {
  return path.join(getFabricTemplateCacheRoot(), mcVersion);
}

const FABRIC_TEMPLATE_VERSIONS = new Set([
  "1.20",
  "1.20.1",
  "1.20.2",
  "1.20.3",
  "1.20.4",
  "1.20.5",
  "1.20.6",
  "1.21",
  "1.21.1",
  "1.21.2",
  "1.21.3",
  "1.21.4",
  "1.21.5",
  "1.21.6",
  "1.21.7",
  "1.21.8",
  "1.21.9",
  "1.21.10",
  "1.21.11",
  "26.1",
  "26.1.1",
  "26.1.2",
  "26.2",
  "26.3",
]);

async function getFabricTemplate(
  mcVersion: string,
  sendLog?: (message: string) => void,
): Promise<string> {
  const log = sendLog || console.log;

  if (!FABRIC_TEMPLATE_VERSIONS.has(mcVersion)) {
    throw new Error(
      `Fabric templates are not supported for Minecraft ${mcVersion}.`,
    );
  }

  const cachePath = getFabricTemplateCachePath(mcVersion);

  const wrapperJar = path.join(
    cachePath,
    "gradle",
    "wrapper",
    "gradle-wrapper.jar",
  );

  // =========================
  // Check cache
  // =========================

  if (fs.existsSync(wrapperJar)) {
    log(`[TEMPLATE] Use the cache for Fabric ${mcVersion} `);

    return cachePath;
  }

  // =========================
  // Download
  // =========================

  log(`[TEMPLATE] Fabric download the ${mcVersion} template...`);

  const url = `https://github.com/FabricMC/fabric-example-mod/archive/refs/heads/${mcVersion}.zip`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to retrieve the Fabric template: HTTP ${response.status}`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  const tempRoot = path.join(
    app.getPath("temp"),
    `modray-fabric-${Date.now()}`,
  );

  const zipPath = path.join(tempRoot, "template.zip");

  const extractPath = path.join(tempRoot, "extracted");

  await fsPromises.mkdir(tempRoot, { recursive: true });

  await fsPromises.writeFile(zipPath, buffer);

  log("[TEMPLATE] Unzipping ZIP file...");

  const zip = new AdmZip(zipPath);

  zip.extractAllTo(extractPath, true);

  const entries = await fsPromises.readdir(extractPath, {
    withFileTypes: true,
  });

  const rootDirectory = entries.find((entry) => entry.isDirectory());

  if (!rootDirectory) {
    throw new Error("The root folder for the templates cannot be found.");
  }

  const sourceRoot = path.join(extractPath, rootDirectory.name);

  // =========================
  // Copy to cache
  // =========================

  await fsPromises.mkdir(cachePath, { recursive: true });

  await fsPromises.cp(sourceRoot, cachePath, {
    recursive: true,
  });

  await fsPromises.rm(tempRoot, {
    recursive: true,
    force: true,
  });

  log(`[TEMPLATE] Fabric ${mcVersion} has been cached.`);

  return cachePath;
}

function getNeoForgeTemplateCacheRoot() {
  return path.join(app.getPath("userData"), "templates", "neoforge");
}

function getNeoForgeTemplateCachePath(mcVersion: string) {
  return path.join(getNeoForgeTemplateCacheRoot(), mcVersion);
}

async function getNeoForgeTemplate(
  mcVersion: string,
  sendLog?: (message: string) => void,
): Promise<string> {
  const log = sendLog || console.log;

  const cachePath = getNeoForgeTemplateCachePath(mcVersion);

  const wrapperJar = path.join(
    cachePath,
    "gradle",
    "wrapper",
    "gradle-wrapper.jar",
  );

  // =========================
  // Check cache
  // =========================

  if (fs.existsSync(wrapperJar)) {
    log(`[TEMPLATE] Use the cache for NeoForge ${mcVersion}.`);

    return cachePath;
  }

  // =========================
  // Download
  // =========================

  log(`[TEMPLATE] Download the NeoForge ${mcVersion} template...`);

  const repo =
    mcVersion === "1.20.1"
      ? `MDK-Forge-${mcVersion}-ModDevGradle`
      : `MDK-${mcVersion}-NeoGradle`;

  const url = `https://github.com/NeoForgeMDKs/${repo}/archive/refs/heads/main.zip`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to retrieve the NeoForge template: HTTP ${response.status}`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  const tempRoot = path.join(
    app.getPath("temp"),
    `modray-neoforge-${Date.now()}`,
  );

  const zipPath = path.join(tempRoot, "template.zip");

  const extractPath = path.join(tempRoot, "extracted");

  await fsPromises.mkdir(tempRoot, { recursive: true });

  await fsPromises.writeFile(zipPath, buffer);

  log("[TEMPLATE] Unzipping ZIP file...");

  const zip = new AdmZip(zipPath);

  zip.extractAllTo(extractPath, true);

  const entries = await fsPromises.readdir(extractPath, {
    withFileTypes: true,
  });

  const rootDirectory = entries.find((entry) => entry.isDirectory());

  if (!rootDirectory) {
    throw new Error(
      "The root folder for the NeoForge template cannot be found.",
    );
  }

  const sourceRoot = path.join(extractPath, rootDirectory.name);

  // =========================
  // Copy to cache
  // =========================

  await fsPromises.mkdir(cachePath, { recursive: true });

  await fsPromises.cp(sourceRoot, cachePath, {
    recursive: true,
  });

  await fsPromises.rm(tempRoot, {
    recursive: true,
    force: true,
  });

  log(`[TEMPLATE] NeoForge ${mcVersion} has been cached.`);

  return cachePath;
}

function findJavaInstallations(): JavaInstallation[] {
  const versions = ["25", "21", "17"];

  const possibleRoots = [
    "C:\\Program Files\\Eclipse Adoptium",
    "C:\\Program Files\\Java",
    "C:\\Program Files\\Microsoft",
  ];

  // Search below the specified folders for Java homes
  // containing bin/java.exe.
  const findJavaHome = (dir: string): string | null => {
    if (!fs.existsSync(dir)) return null;

    const javaExe = path.join(dir, "bin", "java.exe");

    // This folder itself is a Java home
    if (fs.existsSync(javaExe)) {
      return dir;
    }

    try {
      const entries = fs.readdirSync(dir, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const result = findJavaHome(path.join(dir, entry.name));

          if (result) {
            return result;
          }
        }
      }
    } catch (error) {
      console.error("ModRay Java Search Error:", error);
    }

    return null;
  };

  return versions.map((version) => {
    // =========================
    // Java installed by ModRay
    // =========================

    const modRayVersionPath = path.join(getJavaRoot(), version);

    const modRayJavaPath = findJavaHome(modRayVersionPath);

    if (modRayJavaPath) {
      return {
        version,
        path: modRayJavaPath,
        installed: true,
      };
    }

    // =========================
    // Java already installed on the PC
    // =========================

    for (const root of possibleRoots) {
      if (!fs.existsSync(root)) continue;

      try {
        const folders = fs.readdirSync(root, {
          withFileTypes: true,
        });

        for (const folder of folders) {
          if (!folder.isDirectory()) continue;

          const folderLower = folder.name.toLowerCase();

          // Check whether the version number is included
          if (
            folderLower.includes(version) &&
            (folderLower.includes("jdk") || folderLower.includes("temurin"))
          ) {
            const javaHome = path.join(root, folder.name);

            const javaExe = path.join(javaHome, "bin", "java.exe");

            if (fs.existsSync(javaExe)) {
              return {
                version,
                path: javaHome,
                installed: true,
              };
            }
          }
        }
      } catch (error) {
        console.error("Java Search Error:", error);
      }
    }

    // Not found
    return {
      version,
      path: "",
      installed: false,
    };
  });
}

const terminalSessions = new Map<string, ChildProcessWithoutNullStreams>();



function startCodexServer(mainWindow: BrowserWindow) {
  console.log(
    "[CODEX] startCodexServer called",
    "existing process:",
    !!codexProcess,
  );
  if (codexProcess) {
    return;
  }

  codexInitialized = false;

  codexInitPromise = new Promise((resolve) => {
    codexInitResolve = resolve;
  });

  console.log("[CODEX] Starting Codex app-server...");

  codexProcess = spawn("codex", ["app-server"], {
    shell: true,
    stdio: ["pipe", "pipe", "pipe"],
  });

  codexProcess.on("error", (error) => {
    console.error("[CODEX ERROR]", error);
  });

  codexProcess.on("exit", (code, signal) => {
    console.log("[CODEX EXIT]", "code:", code, "signal:", signal);

    codexProcess = null;
    codexInitialized = false;
    codexThreadId = null;
  });

  codexProcess.on("close", (code, signal) => {
    console.log("[CODEX CLOSE]", "code:", code, "signal:", signal);
  });

  codexProcess.stderr.on("data", (data: Buffer) => {
    console.error("[CODEX STDERR]", data.toString());
  });

  codexProcess.stdin.write(
    JSON.stringify({
      method: "initialize",
      id: 1,
      params: {
        clientInfo: {
          name: "ModRay",
          title: "ModRay",
          version: "0.2.1",
        },
      },
    }) + "\n",
  );

  console.log("[CODEX] Initialize request sent");

  codexProcess.stdout.on("data", async (data: Buffer) => {
    console.log("[CODEX RAW]", data.toString());

    codexBuffer += data.toString();

    const lines = codexBuffer.split("\n");
    codexBuffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);

        if (message.id === 1 && message.result) {
          console.log("[CODEX] Initialized");

          codexInitialized = true;

          codexProcess?.stdin.write(
            JSON.stringify({
              method: "initialized",
              params: {},
            }) + "\n",
          );

          codexInitResolve?.();
          codexInitResolve = null;

          console.log("[CODEX] Initialized notification sent");
        }

        // ChatGPT login
        if (message.id === 1001 && message.result?.authUrl) {
          await shell.openExternal(message.result.authUrl);
        }

        // Codex thread created
        if (message.id === 2001 && message.result?.thread?.id) {
          codexThreadId = message.result.thread.id;

          console.log("[CODEX] Thread started:", codexThreadId);

          const pending = pendingCodexRequest;

          if (!pending) {
            console.warn("[CODEX] No pending request for new thread.");
          } else if (!codexProcess) {
            console.error("[CODEX] Process disappeared before first turn.");
          } else {
            try {
              codexProcess.stdin.write(
                JSON.stringify({
                  method: "turn/start",
                  id: 2002,
                  params: {
                    threadId: codexThreadId,
                    input: [
                      {
                        type: "text",
                        text: pending.text,
                      },
                    ],
                    ...(pending.cwd
                      ? {
                          cwd: pending.cwd,
                        }
                      : {}),
                  },
                }) + "\n",
              );

              console.log("[CODEX] First turn started");
            } catch (error) {
              console.error("[CODEX] Failed to start first turn:", error);

              pendingCodexRequest = null;
              pending.reject(error);
            }
          }
        }

        // 👇 ここから外側！！！

        if (message.method === "item/fileChange/requestApproval") {
          console.log(
            "[CODEX] File change approval requested:",
            message.params,
          );

          mainWindow.webContents.send("codex-file-change-request", {
            requestId: message.id,
            threadId: message.params?.threadId,
            turnId: message.params?.turnId,
            itemId: message.params?.itemId,
            reason: message.params?.reason,
            grantRoot: message.params?.grantRoot,
            changes:
              pendingCodexFileChanges?.itemId === message.params?.itemId
                ? pendingCodexFileChanges?.changes
                : [],
          });

          return;
        }

        if (
          message.method === "item/started" &&
          message.params?.item?.type === "fileChange"
        ) {
          const item = message.params.item;

          pendingCodexFileChanges = {
            itemId: item.id,
            changes: item.changes ?? [],
          };

          console.log("[CODEX] File change detected:", pendingCodexFileChanges);
        }

        // Codexのストリーミング回答
        if (message.method === "item/agentMessage/delta") {
          const delta = message.params?.delta;

          if (typeof delta === "string" && pendingCodexRequest) {
            pendingCodexRequest.responseText += delta;
          }
        }

        if (message.method === "turn/started") {
          codexTurnId = message.params?.turn?.id ?? null;

          console.log("[CODEX] Turn started:", codexTurnId);
          
        }

        // ターン完了
        if (message.method === "turn/completed") {
          codexTurnId = null;
          const pending = pendingCodexRequest;

          if (pending) {
            pendingCodexRequest = null;

            const status = message.params?.turn?.status;

            if (status === "completed") {
              pending.resolve({
                success: true,
                message: pending.responseText,
              });
            } else {
              const errorMessage =
                message.params?.turn?.error?.message ||
                `Codex turn ended with status: ${status}`;

              pending.resolve({
                success: false,
                message: errorMessage,
              });
            }
          }
        }

        if (message.id === 1003) {
          if (message.result?.data) {
            pendingCodexModelsRequest?.resolve({
              success: true,
              models: message.result.data,
            });
          } else {
            pendingCodexModelsRequest?.resolve({
              success: false,
              models: [],
              message: message.error?.message || "Failed to get Codex models.",
            });
          }

          pendingCodexModelsRequest = null;
          return;
        }

        mainWindow.webContents.send("codex-message", message);
      } catch (error) {
        console.error("[CODEX] Message processing failed:", error);
        console.error("[CODEX] Raw line:", line);
      }
    }
  });
}

console.log("[MAIN] createWindow called");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
  });

  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error("[PRELOAD ERROR]");
    console.error("Path:", preloadPath);
    console.error("Error:", error);
  });

  console.log(
    "[PRELOAD PATH]",
    path.join(__dirname, "../dist-electron/preload.mjs"),
  );

  console.log(
    "[PRELOAD EXISTS]",
    fs.existsSync(path.join(__dirname, "../dist-electron/preload.mjs")),
  );

  mainWindow.webContents.openDevTools();

  ipcMain.handle("codex-start", async () => {
    if (!codexProcess) {
      startCodexServer(mainWindow);
    }

    if (!codexInitialized) {
      return {
        success: false,
        message: "Codex is still initializing.",
      };
    }

    return {
      success: true,
    };
  });

  ipcMain.handle("codex-login", async () => {
    if (!codexProcess) {
      startCodexServer(mainWindow);
    }

    if (!codexInitialized) {
      return {
        success: false,
        message: "Codex is still initializing.",
      };
    }

    if (!codexProcess) {
      return {
        success: false,
        message: "Codex app-server is not running.",
      };
    }

    try {
      const request = {
        method: "account/login/start",
        id: 1001,
        params: {
          type: "chatgpt",
          useHostedLoginSuccessPage: true,
          appBrand: "chatgpt",
        },
      };

      codexProcess.stdin.write(JSON.stringify(request) + "\n");

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to start ChatGPT login.",
      };
    }
  });

  ipcMain.handle(
    "codex-file-change-approval",
    async (
      _event,
      data: {
        requestId: number;
        decision: "accept" | "acceptForSession" | "decline" | "cancel";
      },
    ) => {
      if (!codexProcess) {
        return {
          success: false,
          message: "Codex app-server is not running.",
        };
      }

      try {
        codexProcess.stdin.write(
          JSON.stringify({
            id: data.requestId,
            result: {
              decision: data.decision,
            },
          }) + "\n",
        );

        console.log("[CODEX] File change decision:", data.decision);

        return {
          success: true,
        };
      } catch (error: any) {
        return {
          success: false,
          message: error?.message || "Failed to send file change approval.",
        };
      }
    },
  );

  ipcMain.handle("codex-account", async () => {
    if (!codexProcess) {
      startCodexServer(mainWindow);
    }

    if (!codexProcess) {
      return {
        success: false,
        connected: false,
      };
    }

    if (!codexInitialized && codexInitPromise) {
      await codexInitPromise;
    }

    const request = {
      method: "account/read",
      id: 1002,
      params: {
        refreshToken: false,
      },
    };

    codexProcess.stdin.write(JSON.stringify(request) + "\n");

    return {
      success: true,
    };
  });

  ipcMain.handle("codex-send", async (_event, message: unknown) => {
    console.log(
      "[CODEX SEND]",
      "process:",
      !!codexProcess,
      "initialized:",
      codexInitialized,
      "thread:",
      codexThreadId,
    );
    if (!codexProcess) {
      startCodexServer(mainWindow);
    }

    if (!codexProcess) {
      return {
        success: false,
        message: "Codex app-server is not running.",
      };
    }

    if (!codexInitialized && codexInitPromise) {
      await codexInitPromise;
    }

    if (!codexProcess) {
      return {
        success: false,
        message: "Codex app-server is not running.",
      };
    }

    try {
      const payload =
        typeof message === "string"
          ? {
              message,
            }
          : (message as {
              message?: string;
              cwd?: string;
              model?: string;
            });

      const text = payload.message?.trim();
      const cwd = payload.cwd;
      const model = payload.model;

      if (!text) {
        return {
          success: false,
          message: "No message was provided.",
        };
      }

      if (pendingCodexRequest) {
        return {
          success: false,
          message: "Codex is already processing a request.",
        };
      }

      const sendTurn = () => {
        if (!codexProcess || !codexThreadId) {
          throw new Error("Codex thread is not ready.");
        }

        codexProcess.stdin.write(
          JSON.stringify({
            method: "turn/start",
            id: 2002,
            params: {
              threadId: codexThreadId,
              input: [
                {
                  type: "text",
                  text,
                },
              ],
              ...(cwd ? { cwd } : {}),
              ...(model ? { model } : {}),
            },
          }) + "\n",
        );

        console.log("[CODEX] Turn started");
      };

      return await new Promise((resolve, reject) => {
        pendingCodexRequest = {
          resolve,
          reject,
          text,
          cwd,
          responseText: "",
        };

        // まだ会話スレッドがない
        if (!codexThreadId) {
          console.log("[CODEX] Starting new thread...");

          codexProcess!.stdin.write(
            JSON.stringify({
              method: "thread/start",
              id: 2001,
              params: {
                ...(cwd ? { cwd } : {}),
                ...(model ? { model } : {}),
              },
            }) + "\n",
          );

          return;
        }

        // 既存スレッド
        sendTurn();
      });
    } catch (error: any) {
      pendingCodexRequest = null;

      return {
        success: false,
        message: error?.message || "Failed to send message to Codex.",
      };
    }
  });

  ipcMain.handle("codex-stop", async () => {
    if (!codexProcess || !codexThreadId || !codexTurnId) {
      return {
        success: false,
        message: "No active Codex turn.",
      };
    }

    try {
      codexProcess.stdin.write(
        JSON.stringify({
          method: "turn/interrupt",
          id: 3001,
          params: {
            threadId: codexThreadId,
            turnId: codexTurnId,
          },
        }) + "\n",
      );

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to stop Codex.",
      };
    }
  });

  ipcMain.handle("codex-models", async () => {
    if (!codexProcess) {
      startCodexServer(mainWindow);
    }

    if (!codexProcess) {
      return {
        success: false,
        models: [],
        message: "Codex app-server is not running.",
      };
    }

    if (!codexInitialized && codexInitPromise) {
      await codexInitPromise;
    }

    if (!codexProcess) {
      return {
        success: false,
        models: [],
        message: "Codex app-server is not running.",
      };
    }

    try {
      codexProcess.stdin.write(
        JSON.stringify({
          method: "model/list",
          id: 1003,
          params: {
            limit: 50,
            includeHidden: false,
          },
        }) + "\n",
      );

      return await new Promise((resolve, reject) => {
        pendingCodexModelsRequest = {
          resolve,
          reject,
        };
      });
    } catch (error: any) {
      pendingCodexModelsRequest = null;

      return {
        success: false,
        models: [],
        message: error?.message || "Failed to request Codex models.",
      };
    }
  });

  ipcMain.handle("install-java", async (_event, version: string) => {
    try {
      console.log(`[JAVA] Starting the installation of Java ${version}...`);

      const javaRoot = getJavaRoot();
      const installPath = path.join(javaRoot, version);

      await fsPromises.mkdir(installPath, { recursive: true });

      console.log(`[JAVA] Install path: ${installPath}`);

      return {
        success: true,
        path: installPath,
      };
    } catch (error: any) {
      console.error("[JAVA] Failed to prepare for installation:", error);

      return {
        success: false,
        message: error?.message || "Failed to install Java",
      };
    }
  });

  ipcMain.handle("download-java", async (event, version: string) => {
    const sendLog = (message: string) => {
      event.sender.send("java-install-log", message);
    };

    try {
      const javaRoot = getJavaRoot();
      const versionDir = path.join(javaRoot, version);

      fs.mkdirSync(versionDir, { recursive: true });

      const downloadUrl = `https://api.adoptium.net/v3/binary/latest/${version}/ga/windows/x64/jdk/hotspot/normal/eclipse`;

      const zipPath = path.join(versionDir, `temurin-${version}.zip`);

      sendLog(`[JAVA] Starting the download of Java ${version}...\n`);

      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error(
          `Failed to download Java ${version}: HTTP ${response.status}`,
        );
      }

      sendLog(`[JAVA] Downloading...\n`);

      const buffer = Buffer.from(await response.arrayBuffer());

      await fsPromises.writeFile(zipPath, buffer);

      sendLog(`[JAVA] Download completed\n`);
      sendLog(`[JAVA] Unzipping ZIP file...\n`);

      const extractDir = path.join(versionDir, "jdk");

      if (fs.existsSync(extractDir)) {
        await fsPromises.rm(extractDir, {
          recursive: true,
          force: true,
        });
      }

      const zip = new AdmZip(zipPath);

      zip.extractAllTo(extractDir, true);

      sendLog(`[JAVA] Unfolding Complete\n`);
      sendLog(`[JAVA] Searching for java.exe...\n`);

      const findJavaExe = (dir: string): string | null => {
        if (!fs.existsSync(dir)) return null;

        const entries = fs.readdirSync(dir, {
          withFileTypes: true,
        });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isFile() && entry.name.toLowerCase() === "java.exe") {
            return fullPath;
          }

          if (entry.isDirectory()) {
            const result = findJavaExe(fullPath);

            if (result) {
              return result;
            }
          }
        }

        return null;
      };

      const javaExePath = findJavaExe(extractDir);

      if (!javaExePath) {
        throw new Error(
          `java.exe was not found after extracting Java ${version}.`,
        );
      }

      sendLog(`[JAVA] java.exe found: ${javaExePath}\n`);

      sendLog(
        `\n[JAVA SUCCESS] Java ${version} installation completed successfully!\n`,
      );

      return {
        success: true,
        path: zipPath,
        installPath: path.dirname(path.dirname(javaExePath)),
        javaPath: javaExePath,
      };
    } catch (error: any) {
      console.error("[JAVA] Download Failed:", error);

      sendLog(
        `\n[JAVA ERROR] ${error?.message || "Java installation failed"}\n`,
      );

      return {
        success: false,
        message: error?.message || "Failed to download Java",
      };
    }
  });

  ipcMain.on(
    "create-terminal",
    (event, { terminalId, shellType, projectPath }) => {
      const shell = shellType === "cmd" ? "cmd.exe" : "powershell.exe";
      // Set PowerShell output encoding to UTF-8
      const args =
        shellType === "cmd"
          ? ["/K", "chcp 65001"]
          : [
              "-NoExit",
              "-Command",
              "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8",
            ];

      const proc = spawn(shell, args, {
        cwd: projectPath,
        shell: true,
        env: {
          ...process.env,
          TERM: "xterm-256color",
          LANG: "ja_JP.UTF-8",
        },
      });

      terminalSessions.set(terminalId, proc);

      proc.stdout.on("data", (data: Buffer) => {
        const text = iconv.decode(data, "utf-8");
        event.reply("terminal-output", { terminalId, data: text });
      });

      proc.stderr.on("data", (data: Buffer) => {
        const text = iconv.decode(data, "utf-8");
        event.reply("terminal-output", { terminalId, data: text });
      });

      proc.on("close", (code) => {
        event.reply("terminal-output", {
          terminalId,
          data: `\n[Process terminated with code ${code}]\n`,
        });
        terminalSessions.delete(terminalId);
      });
    },
  );

  ipcMain.on("send-terminal-command", (_event, { terminalId, command }) => {
    const proc = terminalSessions.get(terminalId);
    if (proc) {
      if (command === "\x03") {
        proc.kill("SIGINT");
      } else {
        proc.stdin.write(command);
      }
    }
  });

  ipcMain.on("close-terminal", (_event, { terminalId }) => {
    const proc = terminalSessions.get(terminalId);
    if (proc) {
      proc.kill();
      terminalSessions.delete(terminalId);
    }
  });

  ipcMain.handle("window-minimize", () => mainWindow.minimize());
  ipcMain.handle("window-maximize", () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.handle("window-close", () => mainWindow.close());

  Menu.setApplicationMenu(null);

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown" && input.key === "F12") {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

function killProcessTree(proc: ChildProcessWithoutNullStreams | null) {
  if (!proc || proc.killed || !proc.pid) return;

  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(proc.pid), "/T", "/F"], {
        stdio: "ignore",
      });
      return;
    }

    try {
      process.kill(-proc.pid, "SIGKILL");
    } catch {
      proc.kill("SIGKILL");
    }
  } catch {
    // Ignore process cleanup errors and continue shutdown.
  }
}

app.on("before-quit", () => {
  killProcessTree(runProcess);
  runProcess = null;
});

app.whenReady().then(() => {
  createWindow();
});

ipcMain.handle("stop-minecraft", async () => {
  if (!runProcess) {
    return { success: false, message: "Minecraft is not running." };
  }

  try {
    killProcessTree(runProcess);
    runProcess = null;
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to stop Minecraft.",
    };
  }
});

ipcMain.handle("scan-java", async () => {
  try {
    const installations = findJavaInstallations();

    return {
      success: true,
      versions: installations,
    };
  } catch (error: any) {
    return {
      success: false,
      versions: [],
      message: error?.message || "Failed to search for Java",
    };
  }
});

ipcMain.handle("delete-file", async (_event, filePath: string) => {
  try {
    await fsPromises.unlink(filePath);
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to delete file",
    };
  }
});

ipcMain.handle("get-files", async (_event, dirPath: string) => {
  try {
    const files = await fsPromises.readdir(dirPath);
    return files;
  } catch (error) {
    return [];
  }
});

ipcMain.handle(
  "rename-file",
  async (
    _event,
    { oldPath, newPath }: { oldPath: string; newPath: string },
  ) => {
    try {
      await fsPromises.rename(oldPath, newPath);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "The name change failed.",
      };
    }
  },
);

ipcMain.handle("get-config-files", async (_event, projectPath: string) => {
  const candidateConfigFiles = [
    { name: "build.gradle", path: path.join(projectPath, "build.gradle") },
    {
      name: "settings.gradle",
      path: path.join(projectPath, "settings.gradle"),
    },
    {
      name: "gradle.properties",
      path: path.join(projectPath, "gradle.properties"),
    },
    {
      name: "gradle-wrapper.properties",
      path: path.join(
        projectPath,
        "gradle",
        "wrapper",
        "gradle-wrapper.properties",
      ),
    },
    {
      name: "fabric.mod.json",
      path: path.join(
        projectPath,
        "src",
        "main",
        "resources",
        "fabric.mod.json",
      ),
    },
    {
      name: "neoforge.mods.toml",
      path: path.join(
        projectPath,
        "src",
        "main",
        "resources",
        "neoforge.mods.toml",
      ),
    },
  ];

  return candidateConfigFiles.filter((file) => fs.existsSync(file.path));
});

ipcMain.handle(
  "download-fabric-template",
  async (
    event,
    data: {
      mcVersion: string;
      destination: string;
    },
  ) => {
    const { mcVersion } = data;

    const templatePath = await getFabricTemplate(mcVersion, (message: string) =>
      event.sender.send("fabric-template-log", message),
    );

    return {
      success: true,
      path: templatePath,
    };
  },
);

ipcMain.handle("create-project", async (_event, data) => {
  try {
    const { projectName, groupId, modId, mcVersion, loader } = data;

    if (typeof modId !== "string" || !/^[a-z][a-z0-9_]{0,63}$/.test(modId)) {
      return {
        success: false,
        message:
          "Mod ID must start with a lowercase letter and contain only lowercase letters, numbers, or underscores (up to 64 characters).",
      };
    }

    let templatePath: string | undefined = undefined;

    if (loader === "fabric") {
      templatePath = await getFabricTemplate(mcVersion, (message: string) => {
        console.log(message);
      });
    }

    if (loader === "neoforge") {
      templatePath = await getNeoForgeTemplate(mcVersion, (message: string) => {
        console.log(message);
      });
    }
    const projectsRoot = getProjectsRoot();

    const projectPath = path.join(projectsRoot, projectName);

    if (fs.existsSync(projectPath)) {
      return {
        success: false,
        message: "A project with the same name already exists!",
      };
    }

    const safeGroupId =
      groupId && groupId.trim() !== "" ? groupId : "com.example";
    const cleanGroupId = safeGroupId.replace(/^\.+/, "");
    const groupFolders = cleanGroupId.split(".").filter(Boolean);

    const javaRootPath = path.join(projectPath, "src", "main", "java");

    const clientJavaRootPath = path.join(projectPath, "src", "client", "java");

    const resourcesDirPath = path.join(projectPath, "src", "main", "resources");

    const gradleWrapperDirPath = path.join(projectPath, "gradle", "wrapper");

    const javaDirPath = path.join(javaRootPath, ...groupFolders);

    const clientJavaDirPath = path.join(
      clientJavaRootPath,
      ...groupFolders,
      "client",
    );

    if (loader === "neoforge" && templatePath) {
      console.log(
        `[TEMPLATE] NeoForge ${mcVersion} Copying the template to the project...`,
      );

      await fsPromises.mkdir(projectPath, {
        recursive: true,
      });

      await fsPromises.cp(templatePath, projectPath, {
        recursive: true,
      });

      console.log(
        `[TEMPLATE] NeoForge ${mcVersion} The template has been copied!`,
      );
    }

    if (loader === "neoforge" && mcVersion === "1.20.1" && templatePath) {
      console.log(
        `[TEMPLATE] We are beginning work on the ModRay edit for NeoForge ${mcVersion}...`,
      );

      // =========================
      // Delete the template Java source
      // =========================

      const templateMainJavaPath = path.join(
        projectPath,
        "src",
        "main",
        "java",
      );

      const templateClientJavaPath = path.join(
        projectPath,
        "src",
        "client",
        "java",
      );

      if (fs.existsSync(templateMainJavaPath)) {
        await fsPromises.rm(templateMainJavaPath, {
          recursive: true,
          force: true,
        });
      }

      if (fs.existsSync(templateClientJavaPath)) {
        await fsPromises.rm(templateClientJavaPath, {
          recursive: true,
          force: true,
        });
      }

      console.log(
        "[TEMPLATE] I deleted the NeoForge template Java source code.",
      );

      // =========================
      // Create Java directories
      // =========================

      fs.mkdirSync(javaDirPath, {
        recursive: true,
      });

      fs.mkdirSync(clientJavaDirPath, {
        recursive: true,
      });

      // =========================
      // Class name and mod ID
      // =========================

      const className =
        projectName.charAt(0).toUpperCase() + projectName.slice(1);

      const clientClassName = className + "Client";

      // =========================
      // Main Java
      // =========================

      const mainJavaContent = `
package ${safeGroupId};

import net.minecraftforge.fml.common.Mod;

@Mod(${className}.MOD_ID)
public class ${className} {

    public static final String MOD_ID = "${modId}";

    public ${className}() {
    }
}
`.trim();

      await fsPromises.writeFile(
        path.join(javaDirPath, `${className}.java`),
        mainJavaContent,
        "utf-8",
      );

      // =========================
      // Client Java
      // =========================

      const clientJavaContent = `
package ${safeGroupId}.client;

public class ${clientClassName} {

}
`.trim();

      await fsPromises.writeFile(
        path.join(clientJavaDirPath, `${clientClassName}.java`),
        clientJavaContent,
        "utf-8",
      );

      // =========================
      // mods.toml
      // =========================

      const modsTomlPath = path.join(
        projectPath,
        "src",
        "main",
        "templates",
        "META-INF",
        "mods.toml",
      );

      const modsTomlContent = `
modLoader="javafml"
loaderVersion="[47,)"
license="MIT"

[[mods]]
modId="${modId}"
version="\${mod_version}"
displayName="${projectName}"
authors="ModRay"
description='''
A Minecraft mod created with ModRay.
'''

[[dependencies.${modId}]]
modId="forge"
mandatory=true
versionRange="[47,)"
ordering="NONE"
side="BOTH"

[[dependencies.${modId}]]
modId="minecraft"
mandatory=true
versionRange="[1.20.1,1.20.2)"
ordering="NONE"
side="BOTH"
`.trim();

      await fsPromises.writeFile(modsTomlPath, modsTomlContent, "utf-8");

      console.log(
        `[TEMPLATE] NeoForge ${mcVersion} ModRay customization completed!`,
      );
    }

    if (loader === "fabric" && templatePath) {
      console.log(
        `[TEMPLATE] Copying the Fabric ${mcVersion} template to the project...`,
      );

      await fsPromises.mkdir(projectPath, {
        recursive: true,
      });

      await fsPromises.cp(templatePath, projectPath, {
        recursive: true,
      });

      // =========================
      // Delete the template Java source
      // =========================

      const templateMainJavaPath = path.join(
        projectPath,
        "src",
        "main",
        "java",
      );

      const templateClientJavaPath = path.join(
        projectPath,
        "src",
        "client",
        "java",
      );

      if (fs.existsSync(templateMainJavaPath)) {
        await fsPromises.rm(templateMainJavaPath, {
          recursive: true,
          force: true,
        });
      }

      if (fs.existsSync(templateClientJavaPath)) {
        await fsPromises.rm(templateClientJavaPath, {
          recursive: true,
          force: true,
        });
      }

      console.log("[TEMPLATE] Deleted the Java source files.");

      fs.mkdirSync(javaDirPath, { recursive: true });
      fs.mkdirSync(clientJavaDirPath, { recursive: true });

      const className =
        projectName.charAt(0).toUpperCase() + projectName.slice(1);

      const clientClassName = className + "Client";

      const mainJavaContent = `
package ${safeGroupId};

import net.fabricmc.api.ModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ${className} implements ModInitializer {

    public static final String MOD_ID = "${modId}";
    public static final Logger LOGGER =
        LoggerFactory.getLogger(MOD_ID);

    @Override
    public void onInitialize() {
        LOGGER.info("Hello Fabric world from ${projectName}!");
    }
}
`.trim();

      await fsPromises.writeFile(
        path.join(javaDirPath, `${className}.java`),
        mainJavaContent,
        "utf-8",
      );

      const clientJavaContent = `
package ${safeGroupId}.client;

import net.fabricmc.api.ClientModInitializer;

public class ${clientClassName}
    implements ClientModInitializer {

    @Override
    public void onInitializeClient() {
        // Client-side initialization
    }
}
`.trim();

      await fsPromises.writeFile(
        path.join(clientJavaDirPath, `${clientClassName}.java`),
        clientJavaContent,
        "utf-8",
      );

      const fabricModJsonPath = path.join(resourcesDirPath, "fabric.mod.json");

      const fabricModJsonBase: Record<string, unknown> = JSON.parse(
        await fsPromises.readFile(fabricModJsonPath, "utf-8"),
      );
      delete fabricModJsonBase.mixins;
      const fabricModJson = {
        ...fabricModJsonBase,
        schemaVersion: 1,
        id: modId,
        version: "${version}",
        name: projectName,
        description: "A Minecraft mod created with ModRay.",
        authors: ["ModRay"],
        license: "MIT",
        icon: `assets/${modId}/icon.png`,
        entrypoints: {
          main: [`${safeGroupId}.${className}`],
          client: [`${safeGroupId}.client.${clientClassName}`],
        },
      };

      await fsPromises.writeFile(
        fabricModJsonPath,
        JSON.stringify(fabricModJson, null, 2),
        "utf-8",
      );

      const mixinFiles = [
        path.join(resourcesDirPath, `${modId}.mixins.json`),
        path.join(resourcesDirPath, `${modId}.client.mixins.json`),
      ];

      for (const mixinFile of mixinFiles) {
        if (fs.existsSync(mixinFile)) {
          await fsPromises.rm(mixinFile, {
            force: true,
          });
        }
      }

      console.log(
        `[TEMPLATE] Fabric ${mcVersion} template copied successfully!`,
      );
    }

    const settingsGradlePath = path.join(projectPath, "settings.gradle");
    const settingsGradle = fs.existsSync(settingsGradlePath)
      ? await fsPromises.readFile(settingsGradlePath, "utf-8")
      : "";
    const rootProjectName = `rootProject.name = '${modId}'`;
    const updatedSettingsGradle = /^\s*rootProject\.name\s*=.*$/m.test(
      settingsGradle,
    )
      ? settingsGradle.replace(
          /^\s*rootProject\.name\s*=.*$/m,
          rootProjectName,
        )
      : `${settingsGradle.trimEnd()}${settingsGradle ? "\n" : ""}${rootProjectName}\n`;

    await fsPromises.writeFile(
      settingsGradlePath,
      updatedSettingsGradle,
      "utf-8",
    );

    fs.mkdirSync(javaDirPath, { recursive: true });
    fs.mkdirSync(clientJavaDirPath, { recursive: true });
    fs.mkdirSync(resourcesDirPath, { recursive: true });
    fs.mkdirSync(gradleWrapperDirPath, { recursive: true });

    console.log(`Project created successfully (${loader}): ${projectPath}`);

    return {
      success: true,
      path: projectPath,
    };
  } catch (error: any) {
    console.error("Project creation failed:", error);
    return {
      success: false,
      message: error.message,
    };
  }
});

ipcMain.handle("select-directory", async () => {
  const { dialog } = await import("electron");
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory", "promptToCreate"],
    title: "Select project directory",
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true, path: "" };
  }

  return { success: true, canceled: false, path: result.filePaths[0] };
});

ipcMain.handle("get-projects", async () => {
  try {
    const projectsRoot = getProjectsRoot();
    if (!fs.existsSync(projectsRoot)) {
      return { success: true, projects: [] };
    }

    const files = fs.readdirSync(projectsRoot);
    const projects = files
      .map((file: string) => {
        const fullPath = path.join(projectsRoot, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          const javaRoot = path.join(fullPath, "src", "main", "java");
          let groupId = "";

          if (fs.existsSync(javaRoot)) {
            const getDirectoriesRecursive = (dir: string): string[] => {
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              const dirs = entries.filter((e: fs.Dirent) => e.isDirectory());
              const hasJava = entries.some(
                (e: fs.Dirent) => e.isFile() && e.name.endsWith(".java"),
              );

              if (hasJava || dirs.length === 0) return [];
              return [
                dirs[0].name,
                ...getDirectoriesRecursive(path.join(dir, dirs[0].name)),
              ];
            };

            const pkgFolders = getDirectoriesRecursive(javaRoot);
            if (pkgFolders.length > 0) {
              groupId = pkgFolders.join(".");
            }
          }

          const gradlePath = path.join(fullPath, "build.gradle");
          if (!groupId && fs.existsSync(gradlePath)) {
            try {
              const gradleContent = fs.readFileSync(gradlePath, "utf-8");
              const match = gradleContent.match(/group\s*=\s*['"]([^'"]+)['"]/);
              if (match && match[1]) {
                groupId = match[1];
              }
            } catch (e) {
              console.error("Failed to read groupId from build.gradle:", e);
            }
          }

          if (!groupId) groupId = "com.example";

          let modId = "";
          const fabricModJsonPath = path.join(
            fullPath,
            "src",
            "main",
            "resources",
            "fabric.mod.json",
          );
          const modsTomlPaths = [
            path.join(
              fullPath,
              "src",
              "main",
              "resources",
              "META-INF",
              "mods.toml",
            ),
            path.join(
              fullPath,
              "src",
              "main",
              "resources",
              "META-INF",
              "neoforge.mods.toml",
            ),
          ];

          try {
            if (fs.existsSync(fabricModJsonPath)) {
              const fabricModJson = JSON.parse(
                fs.readFileSync(fabricModJsonPath, "utf-8"),
              );
              modId =
                typeof fabricModJson.id === "string" ? fabricModJson.id : "";
            } else {
              const modsTomlPath = modsTomlPaths.find((candidate) =>
                fs.existsSync(candidate),
              );
              if (modsTomlPath) {
                const modsToml = fs.readFileSync(modsTomlPath, "utf-8");
                const match = modsToml.match(
                  /^\s*modId\s*=\s*["']([^"']+)["']/m,
                );
                if (match?.[1]) {
                  modId = match[1];
                }
              }
            }
          } catch (e) {
            console.error("Failed to read modId from project files:", e);
          }

          const isNeoForge = fs.existsSync(
            path.join(
              fullPath,
              "src",
              "main",
              "resources",
              "neoforge.mods.toml",
            ),
          );
          const loader = isNeoForge ? "neoforge" : "fabric";

          return {
            name: file,
            path: fullPath,
            groupId: groupId,
            modId: modId || file.toLowerCase(),
            updatedAt: stat.mtimeMs,
            loader: loader,
          };
        }
        return null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    projects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    return { success: true, projects };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "save-file",
  async (_event, data: { filePath: string; content: string }) => {
    try {
      const { filePath, content } = data;
      const dirPath = path.dirname(filePath);

      fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(filePath, content, "utf-8");
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },
);

ipcMain.handle("load-file", async (_event, rawFilePath: string) => {
  try {
    if (!rawFilePath) {
      return { success: false, message: "The file path is empty" };
    }

    const normalizedPath = path.normalize(rawFilePath);

    if (!fs.existsSync(normalizedPath)) {
      return {
        success: false,
        message: `File does not exist: ${normalizedPath}`,
      };
    }

    const content = fs.readFileSync(normalizedPath, "utf-8");
    return { success: true, content };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("check-file-exists", async (_event, filePath: string) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
});

ipcMain.on(
  "run-command",
  (
    event,
    { command, projectPath }: { command: string; projectPath: string },
  ) => {
    const shell = process.platform === "win32" ? "powershell.exe" : "/bin/bash";

    const proc = spawn(shell, ["-Command", command], {
      cwd: projectPath,
      shell: true,
    });

    proc.stdout?.on("data", (data: Buffer) => {
      event.reply("command-output", data.toString());
    });

    proc.stderr?.on("data", (data: Buffer) => {
      event.reply("command-output", `[Error] ${data.toString()}`);
    });

    proc.on("close", (code: number | null) => {
      event.reply("command-output", `\n[Process exited with code ${code}]\n`);
    });
  },
);

ipcMain.handle("run-build", async (event, projectPath: string) => {
  if (buildProcess) {
    return {
      success: false,
      message: "A build is already running.",
    };
  }

  return new Promise((resolve) => {
    const isWin = process.platform === "win32";

    const gradlewPath = path.join(
      projectPath,
      isWin ? "gradlew.bat" : "gradlew",
    );

    const installations = findJavaInstallations();

    const java21 = installations.find(
      (java) => java.version === "21" && java.installed,
    );

    if (!java21 || !java21.path) {
      event.sender.send(
        "on-build-log",
        "\n[BUILD ERROR] Java 21 was not found. Install it from ModRay Java settings.\n",
      );

      resolve({
        success: false,
        message: "Java 21 was not found.",
      });

      return;
    }

    const javaHome = java21.path;

    console.log("[BUILD] gradlew:", gradlewPath);
    console.log("[BUILD] cwd:", projectPath);
    console.log("[BUILD] JAVA_HOME:", javaHome);

    if (isWin) {
      buildProcess = spawn(gradlewPath, ["build"], {
        cwd: projectPath,
        shell: true,
        env: {
          ...process.env,
          JAVA_HOME: javaHome,
        },
      });
    } else {
      buildProcess = spawn("./gradlew", ["build"], {
        cwd: projectPath,
        env: {
          ...process.env,
          JAVA_HOME: javaHome,
        },
      });
    }

    buildProcess.stdout.on("data", (data: Buffer) => {
      const text = iconv.decode(data, "utf-8");
      event.sender.send("on-build-log", text);
    });

    buildProcess.stderr.on("data", (data: Buffer) => {
      const text = iconv.decode(data, "utf-8");
      event.sender.send("on-build-log", text);
    });

    buildProcess.on("close", (code: number | null) => {
      buildProcess = null;

      if (code === 0) {
        event.sender.send(
          "on-build-log",
          "\n[BUILD SUCCESS] Build completed successfully!\n",
        );
        resolve({ success: true });
      } else {
        event.sender.send(
          "on-build-log",
          `\n[BUILD FAILED] Build failed (exit code: ${code})\n`,
        );
        resolve({ success: false });
      }
    });

    buildProcess.on("error", (err: Error) => {
      buildProcess = null;

      event.sender.send(
        "on-build-log",
        `\n[ERROR] Process execution error: ${err.message}\n`,
      );

      resolve({ success: false });
    });
  });
});

ipcMain.handle("run-minecraft", async (event, projectPath: string) => {
  if (runProcess) {
    return {
      success: false,
      message: "Minecraft is already running.",
    };
  }

  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const gradlewPath = path.join(
      projectPath,
      isWin ? "gradlew.bat" : "gradlew",
    );

    if (!fs.existsSync(gradlewPath)) {
      const message =
        "\n[RUN ERROR] Gradle wrapper not found for this project.\n";
      event.sender.send("on-run-log", message);
      resolve({ success: false, message: "Gradle wrapper not found." });
      return;
    }

    const installations = findJavaInstallations();
    const java21 = installations.find(
      (java) => java.version === "21" && java.installed,
    );

    if (!java21 || !java21.path) {
      const message =
        "\n[RUN ERROR] Java 21 was not found. Install it first.\n";
      event.sender.send("on-run-log", message);
      resolve({ success: false, message: "Java 21 was not found." });
      return;
    }

    const javaHome = java21.path;

    event.sender.send(
      "on-run-log",
      `\n[INFO] Launching Minecraft client in ${projectPath}\n`,
    );
    event.sender.send("on-run-log", `[INFO] Using Java: ${javaHome}\n`);

    runProcess = spawn(isWin ? gradlewPath : "./gradlew", ["runClient"], {
      cwd: projectPath,
      shell: isWin,
      env: {
        ...process.env,
        JAVA_HOME: javaHome,
        JAVA_TOOL_OPTIONS: "-Dfile.encoding=UTF-8",
      },
    });

    runProcess.stdout.on("data", (data: Buffer) => {
      const text = iconv.decode(data, "utf-8");
      event.sender.send("on-run-log", text);
    });

    runProcess.stderr.on("data", (data: Buffer) => {
      const text = iconv.decode(data, "utf-8");
      event.sender.send("on-run-log", text);
    });

    runProcess.on("close", (code: number | null) => {
      runProcess = null;

      if (code === 0) {
        event.sender.send(
          "on-run-log",
          "\n[RUN SUCCESS] Minecraft client exited successfully.\n",
        );
        resolve({ success: true });
      } else {
        event.sender.send(
          "on-run-log",
          `\n[RUN FAILED] Minecraft client exited with code ${code}.\n`,
        );
        resolve({ success: false });
      }
    });

    runProcess.on("error", (err: Error) => {
      runProcess = null;
      event.sender.send("on-run-log", `\n[RUN ERROR] ${err.message}\n`);
      resolve({ success: false, message: err.message });
    });
  });
});
