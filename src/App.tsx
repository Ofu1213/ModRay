import TitleBar from "./components/TitleBar";
import { useState, useEffect } from "react";
import { Home } from "./pages/Home";
import Sidebar from "./components/Sidebar";
import NewProject from "./pages/NewProject";
import EditorPage from "./pages/EditorPage";
import Settings from "./pages/Settings";

declare global {
  interface Window {
    api: {
      createProject: (data: {
        projectName: string;
        groupId: string;
        mcVersion: string;
        loader: string;
      }) => Promise<{ success: boolean; message?: string; path?: string }>;

      checkFileExists: (filePath: string) => Promise<boolean>;

      onJavaInstallLog: (
  callback: (log: string) => void
) => () => void;

      downloadJava: (version: string) => Promise<{
  success: boolean;
  message?: string;
  path?: string;
  installPath?: string;
  javaPath?: string;
}>;

      getProjects: () => Promise<{
        success: boolean;
        projects: Array<{ name: string; path: string; groupId?: string; loader?: string; updatedAt?: number }>;
        message?: string;
      }>;

      loadFile: (filePath: string) => Promise<{ success: boolean; content?: string; message?: string }>;
      saveFile: (data: { filePath: string; content: string }) => Promise<{ success: boolean; message?: string }>;
      windowMinimize: () => Promise<void>;
      windowMaximize: () => Promise<void>;
      windowClose: () => Promise<void>;

      // Build support
      runBuild: (projectPath: string) => Promise<{ success: boolean; message?: string }>;
      onBuildLog: (callback: (log: string) => void) => () => void;

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
  const [currentProject, setCurrentProject] = useState<ProjectInfo | null>(null);
  const [statusText, setStatusText] = useState<string>("No running processes");
  const [overlay, setOverlay] = useState<"account" | "settings" | null>(null);

  // Build state and logs
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);

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
  if (window.api && window.api.onJavaInstallLog) {
    const cleanup = window.api.onJavaInstallLog((log: string) => {
      setBuildLogs((prev) => [...prev, log]);
    });

    return () => cleanup();
  }
}, []);

  // Run the build
  const handleRunBuild = async () => {
    if (isBuilding || !currentProject) return;

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

  const handleOpenProject = (project: ProjectInfo) => {
    setCurrentProject(project);
    setCurrentTab("editor");
    setStatusText("Ready");
  };

  const handleProjectCreated = (
  projectPath: string,
  groupId: string,
  loader: string
) => {
  const projectName =
    projectPath.split(/[\\/]/).pop() || "Project";

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
    />

    <div
      style={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSidebarSelect}
      />

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
            isBuilding={isBuilding}
            onRunBuild={handleRunBuild}
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
                }}
              >
                <span className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>

            <div
              style={{
                flex: 1,
                color: "#ccc",
                overflow: "hidden",
              }}
            >
              {overlay === "account" && (
                <p>Account settings content</p>
              )}

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