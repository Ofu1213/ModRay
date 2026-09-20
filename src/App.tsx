import TitleBar from "./components/TitleBar";
import { useState, useEffect } from "react";
import { Home } from "./pages/Home";
import Sidebar from "./components/Sidebar";
import NewProject from "./pages/NewProject";
import EditorPage from "./pages/EditorPage";
import Settings from "./pages/Settings";
import Account from "./pages/Account";

interface CodexModel {
  id: string;
  model: string;
  displayName: string;
  hidden?: boolean;
  isDefault?: boolean;
}

interface CodexFileChangeRequest {
  requestId: number;
  threadId: string;
  turnId: string;
  itemId: string;
  reason?: string;
  grantRoot?: string;
}

declare global {
  interface Window {
    api: {
      // =========================
      // Project
      // =========================

      createProject: (data: {
        projectName: string;
        groupId: string;
        mcVersion: string;
        loader: string;
      }) => Promise<{
        success: boolean;
        message?: string;
        path?: string;
      }>;

      checkFileExists: (filePath: string) => Promise<boolean>;

      // =========================
      // Java
      // =========================

      onJavaInstallLog: (callback: (log: string) => void) => () => void;

      downloadJava: (version: string) => Promise<{
        success: boolean;
        message?: string;
        path?: string;
        installPath?: string;
        javaPath?: string;
      }>;

      scanJava: () => Promise<{
        success: boolean;
        versions: Array<{
          version: string;
          path: string;
          installed: boolean;
        }>;
        message?: string;
      }>;

      installJava: (version: string) => Promise<{
        success: boolean;
        path?: string;
        message?: string;
      }>;

      // =========================
      // Projects
      // =========================

      getProjects: () => Promise<{
        success: boolean;
        projects: Array<{
          name: string;
          path: string;
          groupId?: string;
          loader?: string;
          updatedAt?: number;
        }>;
        message?: string;
      }>;

      selectDirectory: () => Promise<{
        success: boolean;
        canceled?: boolean;
        path?: string;
        message?: string;
      }>;

      // =========================
      // Files
      // =========================

      loadFile: (filePath: string) => Promise<{
        success: boolean;
        content?: string;
        message?: string;
      }>;

      saveFile: (data: { filePath: string; content: string }) => Promise<{
        success: boolean;
        message?: string;
      }>;

      // =========================
      // Window
      // =========================

      windowMinimize: () => Promise<void>;
      windowMaximize: () => Promise<void>;
      windowClose: () => Promise<void>;

      // =========================
      // Build
      // =========================

      runBuild: (projectPath: string) => Promise<{
        success: boolean;
        message?: string;
      }>;

      runMinecraft: (projectPath: string) => Promise<{
        success: boolean;
        message?: string;
      }>;

      stopMinecraft: () => Promise<{
        success: boolean;
        message?: string;
      }>;

      onBuildLog: (callback: (log: string) => void) => () => void;

      onRunLog: (callback: (log: string) => void) => () => void;

      // =========================
      // Codex
      // =========================

      startCodex: () => Promise<any>;

      loginCodex: () => Promise<any>;

      sendCodex: (message: {
        message: string;
        cwd?: string;
        model?: string;
      }) => Promise<{
        success: boolean;
        message?: string;
        fileChange?: any;
      }>;

      stopCodex: () => Promise<{
        success: boolean;
        message?: string;
      }>;

      getCodexAccount: () => Promise<any>;

      getCodexModels: () => Promise<{
        success: boolean;
        models?: CodexModel[];
        message?: string;
      }>;

      onCodexMessage: (callback: (message: any) => void) => () => void;

      onCodexStatus: (callback: (status: any) => void) => () => void;

      onCodexFileChangeRequest: (
        callback: (request: CodexFileChangeRequest) => void,
      ) => () => void;

      approveCodexFileChange: (
        requestId: number,
        decision: "accept" | "acceptForSession" | "decline" | "cancel",
      ) => Promise<{
        success: boolean;
        message?: string;
      }>;
    };
  }
}

export interface ProjectInfo {
  name: string;
  path: string;
  groupId?: string;
  loader?: string;
  updatedAt?: number;
}

export function App() {
  const [currentTab, setCurrentTab] = useState<string>("home");
  const [currentProject, setCurrentProject] = useState<ProjectInfo | null>(
    null,
  );
  const [statusText, setStatusText] = useState<string>("No running processes");
  const [overlay, setOverlay] = useState<"account" | "settings" | null>(null);

  // Build state and logs
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Receive build logs in real time
  useEffect(() => {
    if (window.api && window.api.onBuildLog) {
      const cleanup = window.api.onBuildLog((log: string) => {
        setBuildLogs((prev) => [...prev, log]);
      });
      return () => cleanup();
    }
  }, []);

  useEffect(() => {
    if (window.api && window.api.onRunLog) {
      const cleanup = window.api.onRunLog((log: string) => {
        setRunLogs((prev) => [...prev, log]);
      });
      return () => cleanup();
    }
  }, []);

  useEffect(() => {
    if (window.api && window.api.onJavaInstallLog) {
      const cleanup = window.api.onJavaInstallLog((log: string) => {
        setBuildLogs((prev) => [...prev, log]);
      });

      return () => cleanup();
    }
  }, []);

  // Run the build
  const clearBuildLogs = () => setBuildLogs([]);
  const clearRunLogs = () => setRunLogs([]);

  const handleRunBuild = async () => {
    if (isBuilding || isRunning || !currentProject) return;

    setIsBuilding(true);
    setStatusText("Building project...");
    setBuildLogs(["[INFO] Starting Gradle build...\n"]);

    try {
      const res = await window.api.runBuild(currentProject.path);
      if (res.success) {
        setStatusText("Build Succeeded");
      } else {
        setStatusText("Build Failed");
      }
    } catch (err) {
      setBuildLogs((prev) => [...prev, `\n[ERROR] Execution failed: ${err}`]);
      setStatusText("Build Error");
    } finally {
      setIsBuilding(false);
    }
  };

  const handleRunMinecraft = async () => {
    if (!currentProject || isBuilding) return;

    if (isRunning) {
      setStatusText("Stopping Minecraft...");
      setRunLogs((prev) => [...prev, "\n[INFO] Stop requested from ModRay.\n"]);

      try {
        const res = await window.api.stopMinecraft();
        if (res.success) {
          setStatusText("Minecraft stopping...");
        } else {
          setStatusText("Stop request failed");
        }
      } catch (err) {
        setRunLogs((prev) => [...prev, `\n[ERROR] Stop failed: ${err}\n`]);
        setStatusText("Stop error");
      }

      return;
    }

    setIsRunning(true);
    setStatusText("Launching Minecraft...");
    setRunLogs([
      `[INFO] Starting ${currentProject.name} with Gradle runClient...\n`,
    ]);

    try {
      const res = await window.api.runMinecraft(currentProject.path);
      if (res.success) {
        setStatusText("Minecraft launched");
      } else {
        setStatusText("Minecraft launch failed");
      }
    } catch (err) {
      setRunLogs((prev) => [...prev, `\n[ERROR] Launch failed: ${err}\n`]);
      setStatusText("Minecraft launch error");
    } finally {
      setIsRunning(false);
    }
  };

  const handleOpenProject = (project: ProjectInfo) => {
    setCurrentProject(project);
    setCurrentTab("editor");
    setStatusText("Ready");
  };

  const handleProjectCreated = (
    projectPath: string,
    groupId: string,
    loader: string,
  ) => {
    const projectName = projectPath.split(/[\\/]/).pop() || "Project";

    const project: ProjectInfo = {
      name: projectName,
      path: projectPath,
      groupId,
      loader,
    };

    setCurrentProject(project);
    setCurrentTab("editor");
    setStatusText("Ready");
  };

  const handleBackToHome = () => {
    setCurrentProject(null);
    setCurrentTab("home");
    setStatusText("No running processes");
  };

  const handleSidebarSelect = (tab: string) => {
    if (tab === "account" || tab === "settings") {
      setOverlay(tab);
    } else {
      setCurrentTab(tab);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#121212",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      <style>{`
      .app-scroll::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      .app-scroll::-webkit-scrollbar-track {
        background: #141414;
      }

      .app-scroll::-webkit-scrollbar-thumb {
        background: #333333;
        border-radius: 4px;
      }

      .app-scroll::-webkit-scrollbar-thumb:hover {
        background: #00AF5C;
      }
    `}</style>

      <TitleBar
        projectName={currentProject?.name}
        statusText={statusText}
        onMenuAction={(action) => {
          switch (action) {
            case "new-project":
              setCurrentTab("newproject");
              setOverlay(null);
              break;
            case "open-home":
              setCurrentTab("home");
              setOverlay(null);
              break;
            case "open-settings":
              setOverlay("settings");
              break;
            case "open-account":
              setOverlay("account");
              break;
            case "about":
              setOverlay("settings");
              break;
            case "shortcuts":
              setStatusText(
                "Shortcuts: Ctrl+N for new project, Ctrl+W to close window",
              );
              break;
            case "undo":
              setStatusText("Undo is not available in this view.");
              break;
            case "redo":
              setStatusText("Redo is not available in this view.");
              break;
            case "app-exit":
              void window.api?.windowClose?.();
              break;
            default:
              break;
          }
        }}
      />

      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Sidebar currentTab={currentTab} onSelectTab={handleSidebarSelect} />

        <div
          className="app-scroll"
          style={{
            flex: 1,
            overflowY: currentTab === "editor" ? "hidden" : "auto",
            position: "relative",
            height: "100%",
          }}
        >
          {currentTab === "home" && (
            <Home
              openNewProject={() => setCurrentTab("newproject")}
              onOpenProject={handleOpenProject}
            />
          )}

          {currentTab === "newproject" && (
            <NewProject
              onBack={handleBackToHome}
              onProjectCreated={handleProjectCreated}
            />
          )}

          {currentTab === "editor" && currentProject && (
            <EditorPage
              project={currentProject}
              onBack={handleBackToHome}
              buildLogs={buildLogs}
              runLogs={runLogs}
              isBuilding={isBuilding}
              isRunning={isRunning}
              onRunBuild={handleRunBuild}
              onRunMinecraft={handleRunMinecraft}
              onClearBuildLogs={clearBuildLogs}
              onClearRunLogs={clearRunLogs}
            />
          )}
        </div>

        {overlay && (
          <div
            onClick={() => setOverlay(null)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "900px",
                height: "600px",
                maxWidth: "90vw",
                maxHeight: "85vh",
                background: "#1e1e1e",
                border: "1px solid #333",
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    userSelect: "none",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: "#00AF5C" }}
                  >
                    {overlay === "account" ? "person" : "settings"}
                  </span>

                  {overlay === "account" ? "Account" : "Settings"}
                </h2>

                <button
                  onClick={() => setOverlay(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#aaa",
                    cursor: "pointer",
                    borderRadius: "6px",
                    padding: "6px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#aaa";
                  }}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  color: "#ccc",
                  overflow: "hidden",
                }}
              >
                {overlay === "account" && <Account />}

                {overlay === "settings" && <Settings />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
