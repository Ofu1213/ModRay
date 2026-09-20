// src/pages/EditorPage.tsx
import { ProjectInfo } from "../App";
import FileExplorer from "../components/FileExplorer";
import Editor from "../components/Editor";
import Console from "../components/Console";
import { useState, useRef, useEffect } from "react";
import { sendAiChatRequest } from "../services/ai";

export interface EditorPageProps {
  project: ProjectInfo;
  onBack: () => void;

  // Build-related props
  buildLogs?: string[];
  runLogs?: string[];
  isBuilding?: boolean;
  isRunning?: boolean;
  onRunBuild?: () => void;
  onRunMinecraft?: () => void;
  onClearBuildLogs?: () => void;
  onClearRunLogs?: () => void;
}

type ConsoleTab = "problems" | "terminal" | "output" | "build" | "run";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
};
type ChatSession = { id: number; title: string; messages: ChatMessage[] };

type CodexFileChange = {
  path: string;
  kind: {
    type: string;
    move_path?: string | null;
  };
  diff: string;
};

type CodexFileChangeRequest = {
  requestId: number;
  threadId: string;
  turnId: string;
  itemId: string;
  reason?: string;
  grantRoot?: string;
  changes: CodexFileChange[];
};
export default function EditorPage({
  project,
  onBack,
  buildLogs = [],
  runLogs = [],
  isBuilding = false,
  isRunning = false,
  onRunBuild,
  onRunMinecraft,
  onClearBuildLogs,
  onClearRunLogs,
}: EditorPageProps) {
  const [logs, setLogs] = useState<string[]>([
    "[ModRay] Project loaded successfully.",
    `[System] Path: ${project.path}`,
  ]);
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("terminal");

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

  const [isAiResponding, setIsAiResponding] = useState(false);

  // Resize state
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [consoleHeight, setConsoleHeight] = useState(200);
  const [aiPanelWidth, setAiPanelWidth] = useState(360);
  const [aiPanelVisible, setAiPanelVisible] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("");
  const [inputHeight, setInputHeight] = useState(20);
  type AiModel = {
    id: string;
    model: string;
    displayName: string;
    hidden?: boolean;
    isDefault?: boolean;
  };

  const [aiModels, setAiModels] = useState<AiModel[]>([]);
  const [selectedAiModel, setSelectedAiModel] = useState("");
  const [isLoadingAiModels, setIsLoadingAiModels] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: 1,
      title: "Session 1",
      messages: [],
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState<number>(1);
const [pendingChange, setPendingChange] = useState<{
  fileName: string;
  filePath: string;
  originalContent: string;
  newContent: string;
} | null>(null);

  const isResizingSidebar = useRef(false);
  const isResizingConsole = useRef(false);
  const isResizingAiPanel = useRef(false);
  const aiInputRef = useRef<HTMLTextAreaElement | null>(null);

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
  const chatMessages = activeSession?.messages ?? [];

  const [codexFileChangeRequest, setCodexFileChangeRequest] =
    useState<CodexFileChangeRequest | null>(null);

  const [editorReloadKey, setEditorReloadKey] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`modray-ai-sessions-${project.path}`);
      if (!raw) return;

      const parsed = JSON.parse(raw) as ChatSession[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSessions(parsed);
        setActiveSessionId(parsed[0].id);
      }
    } catch (error) {
      console.warn("Failed to load AI sessions:", error);
    }
  }, [project.path]);

  useEffect(() => {
    try {
      localStorage.setItem(`modray-ai-sessions-${project.path}`, JSON.stringify(sessions));
    } catch (error) {
      console.warn("Failed to save AI sessions:", error);
    }
  }, [project.path, sessions]);

  useEffect(() => {
    let cancelled = false;

    const loadAiModels = async () => {
      try {
        setIsLoadingAiModels(true);

        const result = await window.api.getCodexModels();

        if (cancelled) return;

        if (result?.success && Array.isArray(result.models)) {
          const models = result.models.filter(
            (model: AiModel) => !model.hidden,
          );

          setAiModels(models);

          const defaultModel =
            models.find((model: any) => model.isDefault) ?? models[0];

          if (defaultModel) {
            setSelectedAiModel(defaultModel.id);
          }
        }
      } catch (error) {
        console.error("Failed to load Codex models:", error);
      } finally {
        if (!cancelled) {
          setIsLoadingAiModels(false);
        }
      }
    };

    loadAiModels();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = window.api.onCodexFileChangeRequest((request: any) => {
      console.log("[CODEX] File change approval requested:", request);

      setCodexFileChangeRequest(request);
    });

    return unsubscribe;
  }, []);
  
useEffect(() => {
  const unsubscribe = window.api.onCodexMessage((message: any) => {
    if (
      message.method === "item/completed" &&
      message.params?.item?.type === "fileChange"
    ) {
      const fileChange = message.params.item;

      console.log("[EDITOR] Codex fileChange completed:", fileChange);

      if (fileChange.status !== "completed") {
        console.log(
          "[EDITOR] File change was not completed:",
          fileChange.status,
        );
        return;
      }

      const changedPath = fileChange.changes?.[0]?.path;

      console.log("[EDITOR] Changed path:", changedPath);
      console.log("[EDITOR] Current path:", currentFilePath);

      if (!changedPath) {
        return;
      }

      const normalizePath = (value: string) =>
        value.replace(/\//g, "\\").toLowerCase();

      if (normalizePath(changedPath) !== normalizePath(currentFilePath)) {
        console.log("[EDITOR] Different file. Skip reload.");
        return;
      }

      console.log("[EDITOR] MATCH! Reloading editor...");

      setEditorReloadKey((prev) => prev + 1);
    }
  });

  return unsubscribe;
}, [currentFilePath]);


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

  // --- AI panel width adjustment ---
  const startResizingAiPanel = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingAiPanel.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingAiPanel.current) return;

      const nextWidth = Math.max(window.innerWidth - moveEvent.clientX, 0);

      if (nextWidth <= 90) {
        setAiPanelWidth(0);
        setAiPanelVisible(false);
        return;
      }

      setAiPanelVisible(true);
      setAiPanelWidth(Math.min(Math.max(nextWidth, 220), 600));
    };

    const handleMouseUp = () => {
      isResizingAiPanel.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Build handler
  const handleBuild = () => {
    setConsoleTab("build");

    if (isBuilding || isRunning) return;

    if (onRunBuild) {
      onRunBuild();
    } else {
      addLog("Build function is not available.");
    }
  };

  const handleRunMinecraft = () => {
    setConsoleTab("run");

    if (isBuilding) return;

    if (onRunMinecraft) {
      onRunMinecraft();
      return;
    }

    addLog("Minecraft launch function is not available.");
  };

  // Combine regular logs with build logs from App

  const syncSessionMessages = (nextMessages: ChatMessage[]) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSessionId
          ? { ...session, messages: nextMessages }
          : session
      )
    );
  };

const handleSendAiMessage = async () => {
  const trimmed = aiPrompt.trim();
  if (!trimmed || isAiResponding) return;

  const userMessage: ChatMessage = {
    id: Date.now(),
    role: "user",
    text: trimmed,
  };

  const pendingAssistantId = Date.now() + 1;

  const nextMessagesWithUser: ChatMessage[] = [...chatMessages, userMessage];

  syncSessionMessages(nextMessagesWithUser);

  setAiPrompt("");
  setInputHeight(20);
  setIsAiResponding(true);

  try {
    const currentFileName = currentFilePath.split(/[\\/]/).pop() || "this file";

    let currentFileContent = "";

    try {
      const fileResult = await window.api.loadFile(currentFilePath);

      if (
        fileResult &&
        fileResult.success &&
        fileResult.content !== undefined
      ) {
        currentFileContent = fileResult.content;
      }
    } catch (error) {
      console.warn("Failed to load current file for AI:", error);
    }

    const history = nextMessagesWithUser.map((message) => ({
      role: message.role,
      content: message.text,
    }));

    const response = await sendAiChatRequest(
      [
        ...history,
        {
          role: "user",
          content: `
Current opened file:
${currentFileName}

Current file path:
${currentFilePath}

Current file content:
--------------------
${currentFileContent}
--------------------

User request:
${trimmed}
`,
        },
      ],
      {
        cwd: project.path,
        model: selectedAiModel,
      },
    );

    if (response.fileChange) {
      const changedFileName =
        response.fileChange.filePath === "CURRENT_FILE"
          ? currentFileName
          : response.fileChange.filePath.split(/[\\/]/).pop() ||
            response.fileChange.filePath;

      setPendingChange({
        fileName: changedFileName,
        filePath: currentFilePath,
        originalContent: currentFileContent,
        newContent: response.fileChange.content,
      });

      syncSessionMessages([
        ...nextMessagesWithUser,
        {
          id: pendingAssistantId,
          role: "assistant",
          text: `${response.message}\n\n変更内容を確認してください。`,
        },
      ]);

      return;
    }

    syncSessionMessages([
      ...nextMessagesWithUser,
      {
        id: pendingAssistantId,
        role: "assistant",
        text: response.message,
      },
    ]);
  } catch (error) {
    console.error("AI request failed:", error);

    syncSessionMessages([
      ...nextMessagesWithUser,
      {
        id: pendingAssistantId,
        role: "assistant",
        text: error instanceof Error ? error.message : "AI request failed.",
      },
    ]);
  } finally {
    setIsAiResponding(false);
  }
};

const handleStopAiMessage = async () => {
  if (!isAiResponding) return;

  try {
    await window.api.stopCodex();
  } catch (error) {
    console.error("Failed to stop AI:", error);
  }
};

const createDiffLines = (
  original: string,
  updated: string
) => {
  const oldLines = original.replace(/\r\n/g, "\n").split("\n");
  const newLines = updated.replace(/\r\n/g, "\n").split("\n");

  const result: {
    type: "same" | "removed" | "added";
    text: string;
  }[] = [];

  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    const oldLine = oldLines[i];
    const newLine = newLines[j];

    if (oldLine === newLine) {
      result.push({
        type: "same",
        text: oldLine ?? "",
      });

      i++;
      j++;
      continue;
    }

    if (oldLine !== undefined) {
      result.push({
        type: "removed",
        text: oldLine,
      });

      i++;
    }

    if (newLine !== undefined) {
      result.push({
        type: "added",
        text: newLine,
      });

      j++;
    }
  }

  return result;
};

const handleKeepAiChange = async () => {
  if (codexFileChangeRequest) {
    try {
      const result = await window.api.approveCodexFileChange(
        codexFileChangeRequest.requestId,
        "accept",
      );

      if (!result.success) {
        console.error("Failed to approve Codex file change:", result.message);
        return;
      }

      setCodexFileChangeRequest(null);
    } catch (error) {
      console.error("Failed to approve Codex file change:", error);
    }

    return;
  }

  if (!pendingChange) return;

  try {
    await window.api.saveFile({
      filePath: currentFilePath,
      content: pendingChange.newContent,
    });

    setPendingChange(null);

    syncSessionMessages([
      ...chatMessages,
      {
        id: Date.now(),
        role: "assistant",
        text: `Saved ${pendingChange.fileName}.`,
      } as ChatMessage,
    ]);
  } catch (error) {
    console.error("Failed to apply AI change:", error);
  }
};

const handleRejectAiChange = async () => {
  if (codexFileChangeRequest) {
    try {
      const result = await window.api.approveCodexFileChange(
        codexFileChangeRequest.requestId,
        "decline",
      );

      if (!result.success) {
        console.error("Failed to reject Codex file change:", result.message);
        return;
      }

      setCodexFileChangeRequest(null);
    } catch (error) {
      console.error("Failed to reject Codex file change:", error);
    }

    return;
  }

  setPendingChange(null);

  syncSessionMessages([
    ...chatMessages,
    {
      id: Date.now(),
      role: "assistant",
      text: `Rejected the change for ${
        currentFilePath.split(/[\\/]/).pop() || "this file"
      }.`,
    } as ChatMessage,
  ]);
};

  const handleNewSession = () => {
    const nextId = Date.now();
    const newSession: ChatSession = {
      id: nextId,
      title: `Session ${sessions.length + 1}`,
      messages: [
        {
          id: 1,
          role: "assistant",
          text: `New session started for ${currentFilePath.split(/[\\/]/).pop() || "this file"}.`,
        },
      ],
    };

    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(nextId);
    setPendingChange(null);
    setAiPrompt("");
    setInputHeight(20);
  };

  const handleAiInputChange = (value: string) => {
    setAiPrompt(value);

    const textarea = aiInputRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = `${nextHeight}px`;
    setInputHeight(Math.max(20, nextHeight));
  };


return (
  <>
    <style>{`
      .modray-ai-scroll::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      .modray-ai-scroll::-webkit-scrollbar-track {
        background: #111111;
        border-radius: 999px;
      }

      .modray-ai-scroll::-webkit-scrollbar-thumb {
        background: #3a3a3a;
        border-radius: 999px;
        border: 1px solid #1d1d1d;
      }

      .modray-ai-scroll::-webkit-scrollbar-thumb:hover {
        background: #4f4f4f;
      }
    `}</style>

    <div
      style={{
        display: "flex",
        height: "100%",
        background: "#1e1e1e",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      {/* ========================================== */}
      {/* File Explorer */}
      {/* ========================================== */}

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
          onSelectFile={(path) => setCurrentFilePath(path)}
        />
      </div>

      {/* Sidebar resize handle */}

      <div
        onMouseDown={startResizingSidebar}
        style={{
          width: "5px",
          cursor: "ew-resize",
          background: "#282828",
          transition: "background 0.2s",
          zIndex: 10,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#00AF5C")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#282828")}
      />

      {/* ========================================== */}
      {/* Main Editor Area */}
      {/* ========================================== */}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <Editor
            projectName={project.name}
            filePath={currentFilePath}
            isBuilding={isBuilding}
            isRunning={isRunning}
            onBuild={handleBuild}
            onRun={handleRunMinecraft}
            onStop={handleRunMinecraft}
            reloadKey={editorReloadKey}
          />
        </div>

        {/* Console resize handle */}

        <div
          onMouseDown={startResizingConsole}
          style={{
            height: "5px",
            cursor: "ns-resize",
            background: "#282828",
            transition: "background 0.2s",
            zIndex: 10,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#00AF5C")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#282828")}
        />

        {/* Console */}

        <div
          style={{
            height: `${consoleHeight}px`,
            minHeight: 80,
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <Console
            logs={isBuilding ? [...logs, "[ModRay] Build is running..."] : logs}
            buildLogs={buildLogs}
            runLogs={runLogs}
            isBuilding={isBuilding}
            isRunning={isRunning}
            onRunBuild={handleBuild}
            onStopRun={handleRunMinecraft}
            activeTab={consoleTab}
            onTabChange={setConsoleTab}
            projectPath={project.path}
            onClearBuildLogs={onClearBuildLogs}
            onClearRunLogs={onClearRunLogs}
          />
        </div>
      </div>

      {/* ========================================== */}
      {/* AI Panel Resize Handle */}
      {/* ========================================== */}

      <div
        onMouseDown={startResizingAiPanel}
        style={{
          width: "5px",
          cursor: "ew-resize",
          background: "#282828",
          transition: "background 0.2s",
          zIndex: 10,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#00AF5C")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#282828")}
      />

      {/* ========================================== */}
      {/* AI Panel */}
      {/* ========================================== */}

      {!aiPanelVisible ? (
        <button
          onClick={() => {
            setAiPanelVisible(true);
            setAiPanelWidth(220);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#262626";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#1d1d1d";
          }}
          style={{
            position: "absolute",
            right: "16px",
            bottom: "20px",
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            border: "1px solid #333",
            background: "#1d1d1d",
            color: "#fff",
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            transition: "background 0.15s ease",
          }}
          title="Show AI"
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: "20px",
              color: "#00AF5C",
            }}
          >
            smart_toy
          </span>
        </button>
      ) : (
        <aside
          style={{
            width: `${aiPanelWidth}px`,
            minWidth: "220px",
            maxWidth: "600px",
            background: "#171717",
            borderLeft: "1px solid #2a2a2a",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {/* ========================================== */}
          {/* AI Header */}
          {/* ========================================== */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderBottom: "1px solid #2a2a2a",
              background: "#1d1d1d",
              fontWeight: 700,
              fontSize: "12px",
              letterSpacing: "0.8px",
              color: "#dfe8ee",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: "16px",
                  color: "#00AF5C",
                }}
              >
                smart_toy
              </span>
              AI
            </div>

            <button
              onClick={() => {
                setAiPanelVisible(false);
                setAiPanelWidth(0);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#242424";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#aaa";
              }}
              style={{
                background: "transparent",
                color: "#aaa",
                border: "1px solid #333",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: "pointer",
                transition: "background 0.15s ease, color 0.15s ease",
              }}
            >
              Hide
            </button>
          </div>

          {/* ========================================== */}
          {/* Sessions */}
          {/* ========================================== */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              borderBottom: "1px solid #2a2a2a",
              background: "#1a1a1a",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "#bdbdbd",
                fontWeight: 600,
              }}
            >
              Sessions
            </span>

            <button
              onClick={handleNewSession}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#00c968";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#00AF5C";
              }}
              style={{
                background: "#00AF5C",
                border: "none",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 700,
                padding: "6px 8px",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
            >
              + New
            </button>
          </div>

          {/* ========================================== */}
          {/* Sessions List */}
          {/* ========================================== */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              overflowX: "auto",
              borderBottom: "1px solid #2a2a2a",
              flexShrink: 0,
            }}
          >
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                onMouseEnter={(e) => {
                  if (session.id !== activeSessionId) {
                    e.currentTarget.style.background = "#292929";
                  }
                }}
                onMouseLeave={(e) => {
                  if (session.id !== activeSessionId) {
                    e.currentTarget.style.background = "#202020";
                  }
                }}
                style={{
                  background:
                    session.id === activeSessionId ? "#00AF5C" : "#202020",
                  color: "#fff",
                  border: "1px solid #333",
                  borderRadius: "999px",
                  padding: "6px 10px",
                  fontSize: "11px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "background 0.15s ease",
                }}
              >
                {session.title}
              </button>
            ))}
          </div>

          {/* ========================================== */}
          {/* AI Content */}
          {/* ========================================== */}

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              padding: "12px",
              gap: "10px",
              overflow: "hidden",
            }}
          >
            {/* ======================================== */}
            {/* Codex File Change Approval */}
            {/* ======================================== */}

            {(pendingChange || codexFileChangeRequest) && (
              <div
                style={{
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  background: "#151515",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  overflow: "hidden",
                  fontSize: "12px",
                  maxHeight: "320px",
                }}
              >
                {/* Approval Header */}

                <div
                  style={{
                    padding: "10px 12px",
                    background: "rgba(0,175,92,0.12)",
                    borderBottom: "1px solid #333",
                    color: "#eafaf1",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: "4px",
                    }}
                  >
                    AIが{" "}
                    {pendingChange
                      ? pendingChange.fileName
                      : codexFileChangeRequest?.changes?.[0]?.path
                          ?.split(/[\\/]/)
                          .pop() || "ファイル"}{" "}
                    を変更しようとしています
                  </div>

                  <div
                    style={{
                      color: "#999",
                      fontSize: "10px",
                    }}
                  >
                    変更内容を確認してから適用してください。
                  </div>
                </div>

                {/* Diff */}

                <div
                  className="modray-ai-scroll"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    maxHeight: "220px",
                    overflowY: "auto",
                    fontFamily: "'Fira Code', 'Consolas', monospace",
                    fontSize: "11px",
                    lineHeight: "1.5",
                    background: "#101010",
                  }}
                >
                  {pendingChange
                    ? createDiffLines(
                        pendingChange.originalContent,
                        pendingChange.newContent,
                      ).map((line, index) => (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            whiteSpace: "pre",
                            background:
                              line.type === "added"
                                ? "rgba(0,175,92,0.16)"
                                : line.type === "removed"
                                  ? "rgba(220,60,60,0.16)"
                                  : "transparent",
                            color:
                              line.type === "added"
                                ? "#8ff0b7"
                                : line.type === "removed"
                                  ? "#ff9292"
                                  : "#bbb",
                            padding: "0 10px",
                          }}
                        >
                          <span
                            style={{
                              width: "18px",
                              flexShrink: 0,
                              userSelect: "none",
                              color:
                                line.type === "added"
                                  ? "#00AF5C"
                                  : line.type === "removed"
                                    ? "#f44336"
                                    : "#555",
                            }}
                          >
                            {line.type === "added"
                              ? "+"
                              : line.type === "removed"
                                ? "-"
                                : " "}
                          </span>

                          <span>{line.text || " "}</span>
                        </div>
                      ))
                    : codexFileChangeRequest?.changes?.map((change) => (
                        <div key={change.path}>
                          <div
                            style={{
                              padding: "8px 10px 4px 10px",
                              color: "#8f8f8f",
                              fontSize: "10px",
                              fontWeight: 700,
                            }}
                          >
                            {change.path}
                          </div>

                          {change.diff.split("\n").map((line, index) => {
                            const type =
                              line.startsWith("+") && !line.startsWith("+++")
                                ? "added"
                                : line.startsWith("-") &&
                                    !line.startsWith("---")
                                  ? "removed"
                                  : "context";

                            return (
                              <div
                                key={index}
                                style={{
                                  display: "flex",
                                  whiteSpace: "pre",
                                  background:
                                    type === "added"
                                      ? "rgba(0,175,92,0.16)"
                                      : type === "removed"
                                        ? "rgba(220,60,60,0.16)"
                                        : "transparent",
                                  color:
                                    type === "added"
                                      ? "#8ff0b7"
                                      : type === "removed"
                                        ? "#ff9292"
                                        : "#bbb",
                                  padding: "0 10px",
                                }}
                              >
                                <span
                                  style={{
                                    width: "18px",
                                    flexShrink: 0,
                                    userSelect: "none",
                                    color:
                                      type === "added"
                                        ? "#00AF5C"
                                        : type === "removed"
                                          ? "#f44336"
                                          : "#555",
                                  }}
                                >
                                  {type === "added"
                                    ? "+"
                                    : type === "removed"
                                      ? "-"
                                      : " "}
                                </span>

                                <span>{line || " "}</span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                </div>

                {/* Approval Buttons */}

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    padding: "10px 12px",
                    borderTop: "1px solid #333",
                    background: "#181818",
                    flexShrink: 0,
                  }}
                >
                  <button
                    onClick={handleKeepAiChange}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#00c968";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#00AF5C";
                    }}
                    style={{
                      background: "#00AF5C",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "7px 12px",
                      cursor: "pointer",
                      fontWeight: 700,
                      transition: "background 0.15s ease",
                    }}
                  >
                    ✓ Apply Changes
                  </button>

                  <button
                    onClick={handleRejectAiChange}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#242424";
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#ddd";
                    }}
                    style={{
                      background: "transparent",
                      color: "#ddd",
                      border: "1px solid #333",
                      borderRadius: "6px",
                      padding: "7px 12px",
                      cursor: "pointer",
                      fontWeight: 600,
                      transition: "background 0.15s ease, color 0.15s ease",
                    }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            )}

            {/* ======================================== */}
            {/* Chat Messages */}
            {/* ======================================== */}

            <div
              className="modray-ai-scroll"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                paddingRight: "4px",
                scrollbarWidth: "thin",
                scrollbarColor: "#3a3a3a #111111",
              }}
            >
              {chatMessages.map((message) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={message.id}
                    style={{
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "82%",
                        padding: isUser ? "8px 11px" : "2px 0",
                        borderRadius: isUser ? "12px" : "0",
                        background: isUser ? "#292929" : "transparent",
                        color: "#f5f5f5",
                        fontSize: "12px",
                        lineHeight: "1.6",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {message.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ======================================== */}
            {/* AI Input */}
            {/* ======================================== */}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                background: "#121212",
                border: "1px solid #333",
                borderRadius: "10px",
                padding: "8px 8px 7px 10px",
                flexShrink: 0,
              }}
            >
              <textarea
                ref={aiInputRef}
                className="modray-ai-scroll"
                value={aiPrompt}
                onChange={(e) => handleAiInputChange(e.target.value)}
                placeholder="Ask AI..."
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendAiMessage();
                  }
                }}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  resize: "none",
                  outline: "none",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  fontFamily: "inherit",
                  minHeight: "20px",
                  maxHeight: "120px",
                  height: `${inputHeight}px`,
                  overflowY: inputHeight >= 120 ? "auto" : "hidden",
                  padding: "6px 0",
                  display: "block",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#3a3a3a #111111",
                  textAlign: "left",
                }}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "6px",
                  minHeight: "28px",
                }}
              >
                {/* Agent / Model */}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {/* Agent */}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "#1c1c1c",
                      border: "1px solid #303030",
                      borderRadius: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#777",
                        paddingLeft: "8px",
                        fontWeight: 600,
                      }}
                    >
                      Agent
                    </span>

                    <select
                      value="codex"
                      disabled
                      style={{
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "#ddd",
                        fontSize: "11px",
                        padding: "5px 7px",
                        cursor: "default",
                      }}
                    >
                      <option value="codex">Codex</option>
                    </select>
                  </div>

                  {/* Model */}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "#1c1c1c",
                      border: "1px solid #303030",
                      borderRadius: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#777",
                        paddingLeft: "8px",
                        fontWeight: 600,
                      }}
                    >
                      Model
                    </span>

                    <select
                      value={selectedAiModel}
                      onChange={(e) => setSelectedAiModel(e.target.value)}
                      disabled={isLoadingAiModels || aiModels.length === 0}
                      style={{
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "#ddd",
                        fontSize: "11px",
                        padding: "5px 7px",
                        maxWidth: "130px",
                        cursor:
                          isLoadingAiModels || aiModels.length === 0
                            ? "default"
                            : "pointer",
                      }}
                    >
                      {isLoadingAiModels ? (
                        <option value="">Loading...</option>
                      ) : aiModels.length === 0 ? (
                        <option value="">No models</option>
                      ) : (
                        aiModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.displayName || model.model}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Send */}

                <button
                  onClick={
                    isAiResponding ? handleStopAiMessage : handleSendAiMessage
                  }
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#00c968";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#00AF5C";
                  }}
                  style={{
                    width: "30px",
                    height: "30px",
                    minWidth: "30px",
                    borderRadius: "7px",
                    border: "none",
                    background: "#00AF5C",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "17px",
                    fontWeight: 700,
                    transition: "background 0.15s ease",
                  }}
                  title={isAiResponding ? "Stop" : "Send"}
                >
                  {isAiResponding ? "■" : "↑"}
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  </>
);}