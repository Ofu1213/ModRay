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

type ConsoleTab = "problems" | "terminal" | "output" | "build" | "run";

interface ConsoleProps {
  logs: string[];
  buildLogs?: string[];
  runLogs?: string[];
  projectPath: string;
  isBuilding?: boolean;
  isRunning?: boolean;
  onRunBuild?: () => void;
  onStopRun?: () => void;
  activeTab?: ConsoleTab;
  onTabChange?: (tab: ConsoleTab) => void;
  onClearBuildLogs?: () => void;
  onClearRunLogs?: () => void;
}

export default function Console({
  logs,
  buildLogs = [],
  runLogs = [],
  projectPath,
  isBuilding = false,
  isRunning = false,
  onRunBuild,
  onStopRun,
  activeTab,
  onTabChange,
  onClearBuildLogs,
  onClearRunLogs,
}: ConsoleProps) {
  const [mainTab, setMainTab] = useState<ConsoleTab>(activeTab ?? "terminal");
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
    if (activeTab) {
      setMainTab(activeTab);
    }
  }, [activeTab]);

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
  }, [terminals, logs, buildLogs, runLogs, mainTab, activeTerminalId, currentInput]);

  const setConsoleTab = (tab: ConsoleTab) => {
    setMainTab(tab);
    onTabChange?.(tab);
  };

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

  const problems = [
    ...buildLogs,
    ...runLogs,
    ...logs,
  ].filter((entry) => {
    const text = entry.toLowerCase();
    return (
      text.includes("error") ||
      text.includes("failed") ||
      text.includes("exception") ||
      text.includes("warning") ||
      text.includes("cannot") ||
      text.includes("not found")
    );
  });

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
            onClick={() => setConsoleTab("problems")}
            style={{
              ...topTabStyle,
              borderBottom: mainTab === "problems" ? "2px solid #00AF5C" : "2px solid transparent",
              color: mainTab === "problems" ? "#fff" : "#888",
              background: mainTab === "problems" ? "rgba(255,255,255,0.02)" : "transparent",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (mainTab !== "problems") {
                e.currentTarget.style.color = "#dfe8ee";
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }
            }}
            onMouseLeave={(e) => {
              if (mainTab !== "problems") {
                e.currentTarget.style.color = "#888";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            Problems
          </button>
          <button
            onClick={() => setConsoleTab("terminal")}
            style={{
              ...topTabStyle,
              borderBottom: mainTab === "terminal" ? "2px solid #00AF5C" : "2px solid transparent",
              color: mainTab === "terminal" ? "#fff" : "#888",
              background: mainTab === "terminal" ? "rgba(255,255,255,0.02)" : "transparent",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (mainTab !== "terminal") {
                e.currentTarget.style.color = "#dfe8ee";
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }
            }}
            onMouseLeave={(e) => {
              if (mainTab !== "terminal") {
                e.currentTarget.style.color = "#888";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            Terminal
          </button>
          <button
            onClick={() => setConsoleTab("output")}
            style={{
              ...topTabStyle,
              borderBottom: mainTab === "output" ? "2px solid #00AF5C" : "2px solid transparent",
              color: mainTab === "output" ? "#fff" : "#888",
              background: mainTab === "output" ? "rgba(255,255,255,0.02)" : "transparent",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (mainTab !== "output") {
                e.currentTarget.style.color = "#dfe8ee";
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }
            }}
            onMouseLeave={(e) => {
              if (mainTab !== "output") {
                e.currentTarget.style.color = "#888";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            Output Logs
          </button>
          <button
            onClick={() => setConsoleTab("run")}
            style={{
              ...topTabStyle,
              borderBottom: mainTab === "run" ? "2px solid #00AF5C" : "2px solid transparent",
              color: mainTab === "run" ? "#fff" : "#888",
              background: mainTab === "run" ? "rgba(255,255,255,0.02)" : "transparent",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (mainTab !== "run") {
                e.currentTarget.style.color = "#dfe8ee";
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }
            }}
            onMouseLeave={(e) => {
              if (mainTab !== "run") {
                e.currentTarget.style.color = "#888";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            Run Logs
          </button>
          {/* Build log tab */}
          <button
            onClick={() => setConsoleTab("build")}
            style={{
              ...topTabStyle,
              borderBottom: mainTab === "build" ? "2px solid #00AF5C" : "2px solid transparent",
              color: mainTab === "build" ? "#fff" : "#888",
              background: mainTab === "build" ? "rgba(255,255,255,0.02)" : "transparent",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (mainTab !== "build") {
                e.currentTarget.style.color = "#dfe8ee";
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }
            }}
            onMouseLeave={(e) => {
              if (mainTab !== "build") {
                e.currentTarget.style.color = "#888";
                e.currentTarget.style.background = "transparent";
              }
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={onRunBuild}
              disabled={isBuilding || isRunning}
              style={{
                background: isBuilding || isRunning ? "#1f1f1f" : "transparent",
                border: `1px solid ${isBuilding || isRunning ? "#3a3a3a" : "#00AF5C"}`,
                color: isBuilding || isRunning ? "#6a6a6a" : "#00AF5C",
                borderRadius: "5px",
                padding: "3px 10px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: isBuilding || isRunning ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                opacity: isBuilding || isRunning ? 0.75 : 1,
                transition: "all 0.2s ease",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>build</span>
              {isBuilding ? "Building..." : "Build"}
            </button>
            <button
              onClick={onClearBuildLogs}
              style={{
                background: "transparent",
                border: "1px solid #444",
                color: "#ccc",
                borderRadius: "5px",
                padding: "3px 8px",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.borderColor = "#666";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "#444";
                e.currentTarget.style.color = "#ccc";
              }}
            >
              Clear
            </button>
          </div>
        )}

        {mainTab === "run" && onStopRun && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={isBuilding ? undefined : onStopRun}
              disabled={isBuilding}
              style={{
                background: isRunning ? "#d32f2f" : "#00AF5C",
                border: `1px solid ${isRunning ? "#d32f2f" : "#00AF5C"}`,
                color: "#ffffff",
                borderRadius: "5px",
                padding: "3px 10px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: isBuilding ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                opacity: isBuilding ? 0.7 : 1,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (!isBuilding) {
                  e.currentTarget.style.filter = "brightness(1.08)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>{isRunning ? "stop" : "play_arrow"}</span>
              {isRunning ? "Stop Minecraft" : "Run Minecraft"}
            </button>
            <button
              onClick={onClearRunLogs}
              style={{
                background: "transparent",
                border: "1px solid #444",
                color: "#ccc",
                borderRadius: "5px",
                padding: "3px 8px",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.borderColor = "#666";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "#444";
                e.currentTarget.style.color = "#ccc";
              }}
            >
              Clear
            </button>
          </div>
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
          {mainTab === "problems" ? (
            problems.length === 0 ? (
              <div style={{ color: "#555", fontStyle: "italic" }}>
                No problems reported.
              </div>
            ) : (
              problems.map((log, i) => (
                <div key={i} style={{ color: "#ff8a8a", lineHeight: "1.6", marginBottom: "6px" }}>
                  {log}
                </div>
              ))
            )
          ) : mainTab === "output" ? (
            logs.map((log, i) => (
              <div key={i} style={{ color: "#aaa", lineHeight: "1.5" }}>
                {log}
              </div>
            ))
          ) : mainTab === "run" ? (
            runLogs.length === 0 ? (
              <div style={{ color: "#555", fontStyle: "italic" }}>
                Run logs will appear here when you launch Minecraft...
              </div>
            ) : (
              runLogs.map((log, i) => (
                <div key={i} style={{ color: "#dcdcdc", lineHeight: "1.5" }}>
                  {log}
                </div>
              ))
            )
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