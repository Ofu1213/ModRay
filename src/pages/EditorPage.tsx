// src/pages/EditorPage.tsx
import { ProjectInfo } from "../App";
import FileExplorer from "../components/FileExplorer";
import Editor from "../components/Editor";
import Console from "../components/Console";
import { useState, useRef } from "react";

export interface EditorPageProps {
  project: ProjectInfo;
  onBack: () => void;

  // Build-related props
  buildLogs?: string[];
  isBuilding?: boolean;
  onRunBuild?: () => void;
}

export default function EditorPage({
  project,
  onBack,
  buildLogs = [],
  isBuilding = false,
  onRunBuild,
}: EditorPageProps) {
  const [logs, setLogs] = useState<string[]>([
    "[ModRay] Project loaded successfully.",
    `[System] Path: ${project.path}`,
  ]);

  const addLog = (msg: string) => {
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${msg}`,
    ]);
  };

  const className =
    project.name.charAt(0).toUpperCase() + project.name.slice(1);

  const rawGroupId = project.groupId || "com.example";
  const cleanGroupId = rawGroupId.replace(/^\.+/, "");
  const groupPath = cleanGroupId
    .split(".")
    .filter(Boolean)
    .join("\\");

  const defaultJavaPath =
    `${project.path}\\src\\main\\java\\${groupPath}\\${className}.java`;

  const [currentFilePath, setCurrentFilePath] =
    useState<string>(defaultJavaPath);

  // Resize state
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [consoleHeight, setConsoleHeight] = useState(200);

  const isResizingSidebar = useRef(false);
  const isResizingConsole = useRef(false);

  // --- Explorer width adjustment ---
  const startResizingSidebar = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingSidebar.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingSidebar.current) return;

      const newWidth = Math.min(
        Math.max(moveEvent.clientX, 120),
        600
      );

      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizingSidebar.current = false;

      document.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      document.removeEventListener(
        "mouseup",
        handleMouseUp
      );
    };

    document.addEventListener(
      "mousemove",
      handleMouseMove
    );

    document.addEventListener(
      "mouseup",
      handleMouseUp
    );
  };

  // --- Console height adjustment ---
  const startResizingConsole = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingConsole.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingConsole.current) return;

      const newHeight = Math.min(
        Math.max(
          window.innerHeight - moveEvent.clientY,
          80
        ),
        600
      );

      setConsoleHeight(newHeight);
    };

    const handleMouseUp = () => {
      isResizingConsole.current = false;

      document.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      document.removeEventListener(
        "mouseup",
        handleMouseUp
      );
    };

    document.addEventListener(
      "mousemove",
      handleMouseMove
    );

    document.addEventListener(
      "mouseup",
      handleMouseUp
    );
  };

  // Build handler
  const handleBuild = () => {
    if (isBuilding) return;

    if (onRunBuild) {
      onRunBuild();
    } else {
      addLog("Build function is not available.");
    }
  };

  // Combine regular logs with build logs from App
  

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        background: "#1e1e1e",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      {/* Left sidebar */}
      <div
        style={{
          width: `${sidebarWidth}px`,
          background: "#141414",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <FileExplorer
          projectName={project.name}
          projectPath={project.path}
          groupId={project.groupId || "com.example"}
          currentFilePath={currentFilePath}
          onBack={onBack}
          onSelectFile={(path) =>
            setCurrentFilePath(path)
          }
        />
      </div>

      {/* Horizontal resize bar */}
      <div
        onMouseDown={startResizingSidebar}
        style={{
          width: "5px",
          cursor: "ew-resize",
          background: "#282828",
          transition: "background 0.2s",
          zIndex: 10,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "#00AF5C")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "#282828")
        }
      />

      {/* Center: editor and console */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Editor; the built-in Build button calls handleBuild */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
          }}
        >
          <Editor
            projectName={project.name}
            filePath={currentFilePath}
            onBuild={handleBuild}
            onRun={() => {
              addLog(
                "Launching Minecraft... (Not implemented)"
              );
            }}
          />
        </div>

        {/* Vertical resize bar */}
        <div
          onMouseDown={startResizingConsole}
          style={{
            height: "5px",
            cursor: "ns-resize",
            background: "#282828",
            transition: "background 0.2s",
            zIndex: 10,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "#00AF5C")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "#282828")
          }
        />

        {/* Console */}
        <div
          style={{
            height: `${consoleHeight}px`,
            flexShrink: 0,
          }}
        >
          <Console
  logs={
    isBuilding
      ? [
          ...logs,
          "[ModRay] Build is running...",
        ]
      : logs
  }
  buildLogs={buildLogs}
  isBuilding={isBuilding}
  onRunBuild={handleBuild}
  projectPath={project.path}
/>
        </div>
      </div>
    </div>
  );
}