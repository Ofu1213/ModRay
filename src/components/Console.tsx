import { useState, useRef, useEffect } from "react";
import Ansi from "ansi-to-html";

const convertAnsi = new Ansi({
  fg: "#CCCCCC",
  bg: "#141414",
  newline: true,
  escapeXML: true,
  colors: {
    1: "#FF5555",
    2: "#50FA7B",
    3: "#F1FA8C",
    4: "#BD93F9",
  },
});



export interface TerminalTab {
  id: string;
  name: string;
  type: "powershell" | "cmd";
  output: string;
}

interface ConsoleProps {
  logs: string[];
  buildLogs?: string[]; // Build log property
  projectPath: string;
  isBuilding?: boolean; // Build-in-progress flag
  onRunBuild?: () => void; // Run the build from the console
}

export default function Console({
  logs,
  buildLogs = [],
  projectPath,
  isBuilding = false,
  onRunBuild,
}: ConsoleProps) {
  // Add "build" to the main tab type
  const [mainTab, setMainTab] = useState<"terminal" | "output" | "build">("terminal");
  const [terminals, setTerminals] = useState<TerminalTab[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string>("");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
  if (mainTab !== "terminal" || !activeTerminalId) return;

  e.preventDefault();

  const pastedText = e.clipboardData.getData("text");

  if (pastedText) {
    setCurrentInput((prev) => prev + pastedText);
  }
};

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isInitialized.current || terminals.length > 0) return;
    isInitialized.current = true;
    createNewTerminal("powershell");
  }, []);

  useEffect(() => {
    if (window.api && (window.api as any).onTerminalOutput) {
      (window.api as any).onTerminalOutput(({ terminalId, data }: { terminalId: string; data: string }) => {
        setTerminals((prev) =>
          prev.map((term) =>
            term.id === terminalId ? { ...term, output: term.output + data } : term
          )
        );
      });
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminals, logs, buildLogs, mainTab, activeTerminalId, currentInput]);

  const createNewTerminal = (type: "powershell" | "cmd") => {
    const id = `term-${Date.now()}`;
    const count = terminals.filter((t) => t.type === type).length + 1;
    const name = `${type === "powershell" ? "powershell" : "cmd"} ${count}`;

    const newTerm: TerminalTab = { id, name, type, output: "" };
    setTerminals((prev) => [...prev, newTerm]);
    setActiveTerminalId(id);
    setShowAddMenu(false);

    if (window.api && (window.api as any).createTerminal) {
      (window.api as any).createTerminal({ terminalId: id, shellType: type, projectPath });
    }
  };

  const closeTerminal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = terminals.filter((t) => t.id !== id);
    setTerminals(filtered);

    if (window.api && (window.api as any).closeTerminal) {
      (window.api as any).closeTerminal({ terminalId: id });
    }

    if (activeTerminalId === id && filtered.length > 0) {
      setActiveTerminalId(filtered[filtered.length - 1].id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (mainTab !== "terminal" || !activeTerminalId) return;

    if (e.ctrlKey && e.key.toLowerCase() === "c") {
  const selectedText = window.getSelection()?.toString();

  // Allow normal copying when text is selected
  if (selectedText && selectedText.length > 0) {
    return;
  }

  // Send Ctrl+C to the terminal process when nothing is selected
  e.preventDefault();

  if (window.api && (window.api as any).sendTerminalCommand) {
    (window.api as any).sendTerminalCommand({
      terminalId: activeTerminalId,
      command: "\x03",
    });
  }

  return;
}
    if (e.key === "Enter") {
      e.preventDefault();
      const commandToSend = currentInput + "\r\n";
      setCurrentInput("");

      if (window.api && (window.api as any).sendTerminalCommand) {
        (window.api as any).sendTerminalCommand({ terminalId: activeTerminalId, command: commandToSend });
      }
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      setCurrentInput((prev) => prev.slice(0, -1));
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      setCurrentInput((prev) => prev + e.key);
    }
  };

  const currentTerminal = terminals.find((t) => t.id === activeTerminalId);

  return (
    <div
      style={{
        height: "100%",
        background: "#141414",
        color: "#ccc",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Fira Code', 'Consolas', monospace",
        fontSize: "14px",
      }}
    >
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .terminal-cursor {
  display: inline-block;
  width: 8px;
  height: 15px;
  background-color: #ffffff;
  vertical-align: middle;
  margin-left: 2px;
}

.terminal-cursor.active {
  animation: blink 1s infinite;
}

        div::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        div::-webkit-scrollbar-track {
          background: #141414;
        }

        div::-webkit-scrollbar-thumb {
          background: #333333;
          border-radius: 4px;
        }

        div::-webkit-scrollbar-thumb:hover {
          background: #00AF5C;
        }
      `}</style>

      {/* Top tab bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#1e1e1e",
          borderBottom: "1px solid #282828",
          userSelect: "none",
          paddingRight: "10px",
        }}
      >
        <div style={{ display: "flex" }}>
          <button
            onClick={() => setMainTab("terminal")}
            style={{
              ...topTabStyle,
              borderBottom: mainTab === "terminal" ? "2px solid #00AF5C" : "2px solid transparent",
              color: mainTab === "terminal" ? "#fff" : "#888",
            }}
          >
            Terminal
          </button>
          <button
            onClick={() => setMainTab("output")}
            style={{
              ...topTabStyle,
              borderBottom: mainTab === "output" ? "2px solid #00AF5C" : "2px solid transparent",
              color: mainTab === "output" ? "#fff" : "#888",
            }}
          >
            Output Logs
          </button>
          {/* Build log tab */}
          <button
            onClick={() => setMainTab("build")}
            style={{
              ...topTabStyle,
              borderBottom: mainTab === "build" ? "2px solid #00AF5C" : "2px solid transparent",
              color: mainTab === "build" ? "#fff" : "#888",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            Build Logs
            {isBuilding && (
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#4CAF50",
                  display: "inline-block",
                }}
              />
            )}
          </button>
        </div>

        {/* Action button shown when Build Logs is selected */}
        {mainTab === "build" && onRunBuild && (
          <button
            onClick={onRunBuild}
            disabled={isBuilding}
            style={{
              background: isBuilding ? "#333" : "#4CAF50",
              color: isBuilding ? "#888" : "#fff",
              border: "1px solid #4CAF50",
              borderRadius: "4px",
              padding: "3px 10px",
              fontSize: "12px",
              cursor: isBuilding ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            {isBuilding ? "Building..." : "🔨 Build Mod"}
          </button>
        )}
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        
        {/* Console output */}
        <div
  tabIndex={0}
  onKeyDown={handleKeyDown}
  onPaste={handlePaste}
  onFocus={() => setIsFocused(true)}
  onBlur={() => setIsFocused(false)}
          style={{
            flex: 1,
            padding: "10px 14px",
            overflowY: "auto",
            outline: "none",
            background: "#121212",
            cursor: "text",
            userSelect: "text",
          }}
        >
          {mainTab === "output" ? (
            logs.map((log, i) => (
              <div key={i} style={{ color: "#aaa", lineHeight: "1.5" }}>
                {log}
              </div>
            ))
          ) : mainTab === "build" ? (
            /* Build log display area */
            buildLogs.length === 0 ? (
              <div style={{ color: "#555", fontStyle: "italic" }}>
                Gradle build logs will appear here when you run a build...
              </div>
            ) : (
              buildLogs.map((log, i) => (
                <div key={i} style={{ color: "#dcdcdc", lineHeight: "1.5" }}>
                  {log}
                </div>
              ))
            )
          ) : (
            <div>
              <span
                dangerouslySetInnerHTML={{
                  __html: convertAnsi.toHtml(currentTerminal?.output || ""),
                }}
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  lineHeight: "1.5",
                }}
              />
              <span style={{ color: "#fff", whiteSpace: "pre-wrap" }}>{currentInput}</span>
              <span
              className={`terminal-cursor ${isFocused ? "active" : ""}`}
              style={{
               opacity: isFocused ? 1 : 0.4,
              }}
              />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Right sidebar */}
        {mainTab === "terminal" && (
          <div
            style={{
              width: "160px",
              background: "#181818",
              borderLeft: "1px solid #282828",
              display: "flex",
              flexDirection: "column",
              userSelect: "none",
            }}
          >
            <div
              ref={menuRef}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 10px",
                borderBottom: "1px solid #252525",
                fontSize: "12px",
                color: "#888",
                position: "relative",
              }}
            >
              <span>PROCESSES</span>
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                style={iconBtnStyle}
                title="Open a new terminal"
              >
                ＋
              </button>

              {showAddMenu && (
                <div
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "100%",
                    marginTop: "4px",
                    background: "#252525",
                    border: "1px solid #3c3c3c",
                    borderRadius: "4px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                    zIndex: 100,
                    width: "140px",
                  }}
                >
                  <div
                    onClick={() => createNewTerminal("powershell")}
                    style={menuItemStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#333")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    PowerShell
                  </div>
                  <div
                    onClick={() => createNewTerminal("cmd")}
                    style={menuItemStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#333")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    Command Prompt
                  </div>
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {terminals.map((t) => {
                const isActive = t.id === activeTerminalId;
                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveTerminalId(t.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: "12px",
                      background: isActive ? "#252525" : "transparent",
                      color: isActive ? "#ffffff" : "#aaaaaa",
                      borderLeft: isActive ? "3px solid #00AF5C" : "3px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = "#1f1f1f";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span>{t.name}</span>
                    <button
                      onClick={(e) => closeTerminal(t.id, e)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#777",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#ff5555")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#777")}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const topTabStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: "8px 16px",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
};

const iconBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#ccc",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  padding: "0 4px",
};

const menuItemStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: "12px",
  color: "#ccc",
  cursor: "pointer",
};