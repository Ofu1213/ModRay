import { useState, useEffect, useRef } from "react";
import MonacoEditor from "@monaco-editor/react";

interface EditorProps {
  projectName?: string;
  filePath: string;
  onBuild?: () => void;
  onRun?: () => void;
  onStop?: () => void;
  isBuilding?: boolean;
  isRunning?: boolean;
  onContentChange?: (content: string) => void;
  aiContentRequest?: string | null;
  reloadKey?: number;
}

export default function Editor({ filePath, onBuild, onRun, onStop, isBuilding = false, isRunning = false, onContentChange, reloadKey }: EditorProps) {
  const [content, setContent] = useState<string>("// Loading...");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const editorRef = useRef<any>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isExternalReloadRef = useRef(false);

  // 💡 最新の filePath を常に参照できるように ref で保持
  const currentPathRef = useRef<string>(filePath);
  useEffect(() => {
    currentPathRef.current = filePath;
  }, [filePath]);

  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setStatusMessage("");

    async function fetchFile() {
      try {
        const result = await window.api.loadFile(filePath);

        if (result && result.success && result.content !== undefined) {
          isExternalReloadRef.current = true;
          setContent(result.content);

          // React → Monaco の更新が反映されたあとに解除
          setTimeout(() => {
            isExternalReloadRef.current = false;
          }, 0);
        } else {
          setContent(`// Error: ${result?.message || "Failed to load file"}`);
        }
      } catch (e) {
        console.error(e);
        setContent("// A communication error occurred");
      }
    }
    fetchFile();

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [filePath, reloadKey]);

  useEffect(() => {
    console.log("[EDITOR COMPONENT] Reload triggered:", reloadKey, filePath);

    // ...
  }, [filePath, reloadKey]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;

    editor.onDidPaste(() => {
      const currentCode = editor.getValue();
      const cleanedCode = normalizeWhitespaceText(currentCode);

      if (cleanedCode !== currentCode) {
        editor.setValue(cleanedCode);
      }
    });

    editor.onDidChangeModelContent(() => {
        if (isExternalReloadRef.current) {
          return;
        }
      const currentCode = editor.getValue();
      
      onContentChange?.(currentCode);

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      setStatusMessage("Editing...");

      const targetPath = currentPathRef.current;

      saveTimerRef.current = setTimeout(async () => {
        try {
          const res = await window.api.saveFile({ filePath: targetPath, content: currentCode });
          if (res && res.success) {
            setStatusMessage("✓ Saved");
          } else {
            setStatusMessage("❌ Save failed");
          }
        } catch (e) {
          console.error(e);
          setStatusMessage("❌ Save error");
        }
      }, 1000);
    });
  };

  const normalizeWhitespaceText = (text: string): string => {
    const normalized = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, "    ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^[\n\s]+|[\n\s]+$/g, "");

    return normalized
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/g, ""))
      .map((line) => {
        const match = line.match(/^\s+/);
        if (!match) return line;

        const leadingSpaces = match[0].length;
        const normalizedIndent = Math.round(leadingSpaces / 4) * 4;
        return " ".repeat(normalizedIndent) + line.trimStart();
      })
      .join("\n");
  };

  const applyWhitespaceCleanup = () => {
    if (!editorRef.current) return;

    const currentText = editorRef.current.getValue();
    const fixedText = normalizeWhitespaceText(currentText);

    if (currentText !== fixedText) {
      editorRef.current.setValue(fixedText);
      setStatusMessage("✓ Whitespace fixed");
    }
  };

  const handleUndo = () => {
    if (editorRef.current) editorRef.current.trigger("keyboard", "undo", null);
  };

  const handleRedo = () => {
    if (editorRef.current) editorRef.current.trigger("keyboard", "redo", null);
  };

  const fileName = filePath.split(/[\\/]/).pop() || filePath;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#1e1e1e" }}>
      {/* 💡 行番号部分を青い選択領域から除外するためのCSSスタイルを適用 */}
      <style>{`
        .monaco-editor .line-numbers {
          user-select: none !important;
          -webkit-user-select: none !important;
        }
        .monaco-editor .margin {
          user-select: none !important;
          -webkit-user-select: none !important;
        }
      `}</style>

      {/* 1行操作バー */}
      <div
        style={{
          background: "#181818",
          padding: "6px 14px",
          display: "flex",
          gap: "10px",
          borderBottom: "1px solid #282828",
          alignItems: "center",
          userSelect: "none",
        }}
      >
        <button
          onClick={handleUndo}
          style={editorBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1f1f1f")}
          title="Undo"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>undo</span>
        </button>
        <button
          onClick={handleRedo}
          style={editorBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1f1f1f")}
          title="Redo"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>redo</span>
        </button>

        <button
          onClick={applyWhitespaceCleanup}
          style={editorBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1f1f1f")}
          title="Fix whitespace"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>format_clear</span>
        </button>

        <div style={{ height: "14px", width: "1px", background: "#333" }} />

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#00AF5C" }}>
            description
          </span>
          <span style={{ color: "#eee", fontWeight: "600", fontSize: "13px" }}>{fileName}</span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={onBuild}
            disabled={isBuilding || isRunning}
            style={{
              ...actionBtnStyle,
              borderColor: isBuilding || isRunning ? "#3a3a3a" : "#00AF5C",
              color: isBuilding || isRunning ? "#6a6a6a" : "#00AF5C",
              background: isBuilding || isRunning ? "#1f1f1f" : "transparent",
              opacity: isBuilding || isRunning ? 0.75 : 1,
              cursor: isBuilding || isRunning ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isBuilding && !isRunning) e.currentTarget.style.background = "rgba(0, 175, 92, 0.15)";
            }}
            onMouseLeave={(e) => {
              if (!isBuilding && !isRunning) e.currentTarget.style.background = "transparent";
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>build</span>
            Build
          </button>

          <button
            onClick={isBuilding ? undefined : isRunning ? onStop : onRun}
            disabled={isBuilding}
            style={{
              ...actionBtnStyle,
              background: isRunning ? "#d32f2f" : "#00AF5C",
              color: "#ffffff",
              borderColor: isRunning ? "#d32f2f" : "#00AF5C",
              opacity: isBuilding ? 0.7 : 1,
              cursor: isBuilding ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isBuilding) e.currentTarget.style.background = isRunning ? "#b71c1c" : "#009950";
            }}
            onMouseLeave={(e) => {
              if (!isBuilding) e.currentTarget.style.background = isRunning ? "#d32f2f" : "#00AF5C";
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>{isRunning ? "stop" : "play_arrow"}</span>
            {isRunning ? "Stop Minecraft" : "Run Minecraft"}
          </button>

          <span style={{ color: statusMessage.includes("❌") ? "#f44336" : "#00AF5C", fontSize: "11px", fontWeight: "500", minWidth: "80px", textAlign: "right" }}>
            {statusMessage || "● Auto-Save Active"}
          </span>
        </div>
      </div>

      {/* エディタ本体 */}
      <div style={{ flex: 1 }}>
        <MonacoEditor
          key={filePath}
          height="100%"
          defaultLanguage="java"
          theme="vs-dark"
          value={content}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            minimap: { enabled: true },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            fontFamily: "'Fira Code', 'Consolas', monospace",
            selectOnLineNumbers: false, // 💡 行番号クリックによる全選択挙動を抑止
          }}
        />
      </div>
    </div>
  );
}

const editorBtnStyle: React.CSSProperties = {
  background: "#1f1f1f",
  color: "#ccc",
  border: "1px solid #333",
  borderRadius: "4px",
  padding: "3px 8px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 0.2s, color 0.2s",
};

const actionBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid",
  padding: "3px 10px",
  cursor: "pointer",
  borderRadius: "5px",
  fontSize: "12px",
  fontWeight: "600",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  transition: "all 0.2s",
};