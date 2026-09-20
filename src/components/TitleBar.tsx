// src/components/TitleBar.tsx
import { useEffect, useRef, useState } from "react";

interface TitleBarProps {
  projectName?: string;
  statusText?: string;
  onMenuAction?: (action: string) => void;
}

const menuItems: Record<string, Array<{ label: string; action: string }>> = {
  File: [
    { label: "New Project", action: "new-project" },
    { label: "Open Home", action: "open-home" },
    { label: "Exit", action: "app-exit" },
  ],
  Edit: [
    { label: "Undo", action: "undo" },
    { label: "Redo", action: "redo" },
  ],
  View: [
    { label: "Home", action: "open-home" },
    { label: "Settings", action: "open-settings" },
    { label: "Account", action: "open-account" },
  ],
  Help: [
    { label: "About ModRay", action: "about" },
    { label: "Keyboard Shortcuts", action: "shortcuts" },
  ],
};

export default function TitleBar({ projectName, statusText = "No running processes", onMenuAction }: TitleBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleMinimize = () => (window.api as any)?.windowMinimize?.();
  const handleMaximize = () => (window.api as any)?.windowMaximize?.();
  const handleClose = () => (window.api as any)?.windowClose?.();

  const handleMenuClick = (action: string) => {
    onMenuAction?.(action);
    setActiveMenu(null);
  };

  return (
    <div
      style={{
        height: "48px",
        background: "#111111",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #222222",
        color: "#a0a0a0",
        fontSize: "13px",
        userSelect: "none",
        WebkitAppRegion: "drag",
        paddingRight: "8px",
      } as any}
    >
      {/* Left: logo, menu, and project name */}
      <div style={{ display: "flex", alignItems: "center", WebkitAppRegion: "no-drag" } as any}>
        <span
          style={{
            padding: "0 16px",
            fontWeight: "700",
            color: "#00AF5C",
            letterSpacing: "0.5px",
            fontSize: "15px",
          }}
        >
          ModRay
        </span>

        {/* Menu bar */}
        <div ref={menuRef} style={{ display: "flex", gap: "2px", alignItems: "center", position: "relative" }}>
          {Object.keys(menuItems).map((menu) => (
            <div key={menu} style={{ position: "relative" }}>
              <div
                onClick={() => setActiveMenu(activeMenu === menu ? null : menu)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: activeMenu === menu ? "#222" : "transparent",
                  color: activeMenu === menu ? "#fff" : "#a0a0a0",
                  fontSize: "13px",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (activeMenu !== menu) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (activeMenu !== menu) e.currentTarget.style.background = "transparent";
                }}
              >
                {menu}
              </div>

              {activeMenu === menu && (
                <div
                  style={{
                    position: "absolute",
                    top: "34px",
                    left: 0,
                    minWidth: "180px",
                    background: "#1b1b1b",
                    border: "1px solid #333",
                    borderRadius: "8px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                    zIndex: 50,
                    overflow: "hidden",
                  }}
                >
                  {menuItems[menu].map((item) => (
                    <div
                      key={item.action}
                      onClick={() => handleMenuClick(item.action)}
                      style={{
                        padding: "10px 12px",
                        color: "#ddd",
                        cursor: "pointer",
                        fontSize: "12px",
                        background: "transparent",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Show the project name next to Help */}
          {projectName && (
            <div style={{ marginLeft: "12px", display: "flex", alignItems: "center" }}>
              <span
                style={{
                  color: "#00AF5C",
                  fontWeight: "600",
                  background: "rgba(0,175,92,0.12)",
                  padding: "3px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  border: "1px solid rgba(0,175,92,0.25)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>
                  folder
                </span>
                {projectName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: status and window controls */}
      <div style={{ display: "flex", alignItems: "center", height: "100%", gap: "6px", WebkitAppRegion: "no-drag" } as any}>
        {/* Status badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginRight: "12px",
            fontSize: "12px",
            color: "#888",
            background: "#1a1a1a",
            padding: "4px 12px",
            borderRadius: "14px",
            border: "1px solid #2a2a2a",
          }}
        >
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#00AF5C" }}></span>
          {statusText}
        </div>

        {/* Minimize button */}
        <button
          onClick={handleMinimize}
          style={roundBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          title="Minimize"
        >
          -
        </button>

        {/* Maximize button */}
        <button
          onClick={handleMaximize}
          style={roundBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          title="Maximize"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
            crop_square
          </span>
        </button>

        {/* Close button */}
        <button
          onClick={handleClose}
          style={roundBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#e81123")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          title="Close"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
            close
          </span>
        </button>
      </div>
    </div>
  );
}

const roundBtnStyle: React.CSSProperties = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  background: "transparent",
  border: "none",
  color: "#cccccc",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  fontWeight: "bold",
  transition: "background 0.2s, color 0.2s",
};