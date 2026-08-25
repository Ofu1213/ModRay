// src/components/Sidebar.tsx
interface SidebarProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
}

export default function Sidebar({ currentTab = "home", onSelectTab }: SidebarProps) {
  return (
    <div
      style={{
        width: "56px",
        height: "100%",
        background: "#0d0d0d",
        borderRight: "1px solid #222222",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        boxSizing: "border-box",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {/* Top: home, always shown in the selected green state */}
      <button
        onClick={() => onSelectTab?.("home")}
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: currentTab === "home" ? "#00AF5C" : "transparent",
          color: currentTab === "home" ? "#ffffff" : "#888888",
          transition: "all 0.2s",
        }}
        title="Home"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
          home
        </span>
      </button>

      {/* Bottom: account and settings buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <button
          onClick={() => onSelectTab?.("account")}
          style={subBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          title="Account"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
            person
          </span>
        </button>

        <button
          onClick={() => onSelectTab?.("settings")}
          style={subBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          title="Settings"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
            settings
          </span>
        </button>
      </div>
    </div>
  );
}

const subBtnStyle: React.CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  color: "#888888",
  transition: "all 0.2s",
};