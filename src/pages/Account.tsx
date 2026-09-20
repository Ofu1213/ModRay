
import { useState, useEffect } from "react";

type AccountTab = "profile" | "security" | "connections" | "about";

type ConnectionStatus = "disconnected" | "connecting" | "connected";

type Provider =
  | "codex"
  | "gemini"
  | "openai"
  | "claude"
  | "modrinth"
  | "github";

export default function Account() {
  const [currentTab, setCurrentTab] = useState<AccountTab>("profile");
  const [username, setUsername] = useState("Guest");
  const [email, setEmail] = useState("example@example.com");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [saved, setSaved] = useState(false);

  const [connections, setConnections] = useState<
    Record<Provider, ConnectionStatus>
  >({
    codex: "disconnected",
    gemini: "disconnected",
    openai: "disconnected",
    claude: "disconnected",
    modrinth: "disconnected",
    github: "disconnected",
  });

  // Codexなどのログイン完了を監視＆起動時にアカウント状態を確認
  useEffect(() => {
    if (!window.api?.onCodexMessage) return;

    const unsubscribe = window.api.onCodexMessage((message: any) => {
      if (
        message.method === "account/login/completed" &&
        message.params?.success === true
      ) {
        setConnections((prev) => ({ ...prev, codex: "connected" }));
      }

      if (message.method === "account/updated") {
        const isConnected = message.params?.authMode === "chatgpt";
        setConnections((prev) => ({
          ...prev,
          codex: isConnected ? "connected" : "disconnected",
        }));
      }

      if (message.id === 1002) {
        console.log("[CODEX ACCOUNT]", message);
        if (message.result?.account?.type === "chatgpt") {
          setConnections((prev) => ({ ...prev, codex: "connected" }));
        }
      }
    });

    // 起動時にアカウント状態を問い合わせ
    if (window.api?.getCodexAccount) {
      window.api.getCodexAccount();
    }

    return unsubscribe;
  }, []);

  const handleConnect = async (provider: Provider) => {
    if (provider !== "codex") {
      return;
    }

    setConnections((prev) => ({
      ...prev,
      [provider]: "connecting",
    }));

    try {
      console.log("OpenAI Codex connect clicked");

      const result = await window.api.loginCodex();

      console.log("Codex login result:", result);
    } catch (error) {
      console.error(`Failed to connect ${provider}:`, error);

      setConnections((prev) => ({
        ...prev,
        [provider]: "disconnected",
      }));
    }
  };

  const renderConnectionButton = (provider: Provider) => {
    const status = connections[provider];
    const isConnecting = status === "connecting";
    const isConnected = status === "connected";

    return (
      <button
        onClick={() => handleConnect(provider)}
        disabled={provider !== "codex" || isConnecting || isConnected}
        style={{
          padding: "8px 16px",
          borderRadius: "7px",
          border: "1px solid #00AF5C",
          background: isConnected ? "rgba(0,175,92,0.12)" : "transparent",
          color: "#00AF5C",
          cursor:
            provider !== "codex"
              ? "not-allowed"
              : isConnecting
                ? "wait"
                : isConnected
                  ? "default"
                  : "pointer",
          fontWeight: 600,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          if (!isConnected && !isConnecting) {
            e.currentTarget.style.background = "rgba(0,175,92,0.12)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isConnected && !isConnecting) {
            e.currentTarget.style.background = "transparent";
          }
        }}
      >
        {isConnecting
          ? "Connecting..."
          : isConnected
            ? "Connected ✓"
            : "Connect"}
      </button>
    );
  };

  const tabStyle = (tab: AccountTab): React.CSSProperties => ({
    width: "100%",
    padding: "10px 12px",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    textAlign: "left",
    background: currentTab === tab ? "#00AF5C" : "transparent",
    color: currentTab === tab ? "#fff" : "#aaa",
    fontSize: "14px",
    transition: "all 0.2s",
    boxShadow: currentTab === tab ? "0 0 0 1px rgba(0,175,92,0.18)" : "none",
    userSelect: "none",
  });

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: "#111",
    border: "1px solid #333",
    borderRadius: "7px",
    padding: "10px 12px",
    color: "#ddd",
    outline: "none",
    fontSize: "13px",
  };

  const sectionTitleStyle: React.CSSProperties = {
    marginTop: 0,
    marginBottom: "6px",
    fontSize: "22px",
    color: "#fff",
    userSelect: "none",
  };

  const descriptionStyle: React.CSSProperties = {
    color: "#888",
    fontSize: "13px",
    marginTop: 0,
    marginBottom: "24px",
    userSelect: "none",
  };

  const cardStyle: React.CSSProperties = {
    background: "#1a1a1a",
    border: "1px solid #2d2d2d",
    borderRadius: "10px",
    padding: "18px",
    marginBottom: "14px",
    userSelect: "none",
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
    }, 2000);
  };

  const renderTabButton = (tab: AccountTab, label: string) => (
    <button
      onClick={() => setCurrentTab(tab)}
      style={tabStyle(tab)}
      onMouseEnter={(e) => {
        if (currentTab !== tab) {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
        }
      }}
      onMouseLeave={(e) => {
        if (currentTab !== tab) {
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        minHeight: 0,
      }}
    >
      <style>{`
        .account-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .account-scroll::-webkit-scrollbar-track {
          background: #141414;
        }
        .account-scroll::-webkit-scrollbar-thumb {
          background: #333333;
          border-radius: 4px;
        }
        .account-scroll::-webkit-scrollbar-thumb:hover {
          background: #00AF5C;
        }
      `}</style>

      {/* Left: account categories */}
      <div
        style={{
          width: "150px",
          flexShrink: 0,
          borderRight: "1px solid #333",
          padding: "16px 10px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 4px 14px 4px",
            marginBottom: "6px",
            borderBottom: "1px solid #333",
          }}
        >
          <img
            src="/assets/guest.png"
            alt="Guest"
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              minWidth: 0,
            }}
          >
            {isEditingUsername ? (
              <input
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setIsEditingUsername(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setIsEditingUsername(false);
                  }
                }}
                style={{
                  width: "80px",
                  background: "#111",
                  border: "1px solid #333",
                  borderRadius: "5px",
                  padding: "5px 7px",
                  color: "#fff",
                  outline: "none",
                  fontSize: "13px",
                }}
              />
            ) : (
              <>
                <span
                  style={{
                    color: "#ddd",
                    fontSize: "14px",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {username}
                </span>
                <button
                  onClick={() => setIsEditingUsername(true)}
                  title="Edit username"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#777",
                    cursor: "pointer",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "16px" }}
                  >
                    edit
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {renderTabButton("profile", "Profile")}
        {renderTabButton("security", "Security")}
        {renderTabButton("connections", "Connections")}
        <div style={{ flex: 1 }} />
        {renderTabButton("about", "About")}
      </div>

      {/* Right: account content */}
      <div
        className="account-scroll"
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: "auto",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        {/* Profile */}
        {currentTab === "profile" && (
          <>
            <h2 style={sectionTitleStyle}>Account</h2>
            <p style={descriptionStyle}>
              Manage your ModRay account information.
            </p>
            <div style={cardStyle}>
              <div style={{ fontWeight: 600, marginBottom: "8px" }}>Email</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="Email address"
                type="email"
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: "12px",
              }}
            >
              {saved && (
                <span style={{ color: "#00AF5C", fontSize: "13px" }}>
                  Changes saved
                </span>
              )}
              <button
                onClick={handleSave}
                style={{
                  padding: "9px 18px",
                  borderRadius: "7px",
                  border: "none",
                  background: "#00AF5C",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "13px",
                }}
              >
                Save changes
              </button>
            </div>
          </>
        )}

        {/* Security */}
        {currentTab === "security" && (
          <>
            <h2 style={sectionTitleStyle}>Security</h2>
            <p style={descriptionStyle}>Manage your account security.</p>
            <div style={cardStyle}>
              <div style={{ fontWeight: 600, marginBottom: "6px" }}>
                Password
              </div>
              <button
                disabled
                style={{
                  padding: "9px 16px",
                  borderRadius: "7px",
                  border: "1px solid #333",
                  background: "#222",
                  color: "#777",
                }}
              >
                Change password
              </button>
            </div>
          </>
        )}

        {/* Connections */}
        {currentTab === "connections" && (
          <>
            <h2 style={sectionTitleStyle}>Connections</h2>
            <p style={descriptionStyle}>
              Manage services connected to your ModRay account.
            </p>

            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#ddd",
                marginBottom: "10px",
              }}
            >
              AI Providers
            </div>

            {/* OpenAI Codex */}
            <div style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "5px" }}>
                    OpenAI Codex
                  </div>
                  <div style={{ color: "#888", fontSize: "12px" }}>
                    Use Codex with your ChatGPT account.
                  </div>
                </div>
                {renderConnectionButton("codex")}
              </div>
            </div>

            {/* Google Gemini */}
            <div style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "5px" }}>
                    Google Gemini
                  </div>
                  <div style={{ color: "#888", fontSize: "12px" }}>
                    Connect Google Gemini to ModRay.
                  </div>
                </div>
                {renderConnectionButton("gemini")}
              </div>
            </div>

            {/* OpenAI API */}
            <div style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "5px" }}>
                    OpenAI API
                  </div>
                  <div style={{ color: "#888", fontSize: "12px" }}>
                    Use OpenAI models through the API.
                  </div>
                </div>
                {renderConnectionButton("openai")}
              </div>
            </div>

            {/* Anthropic Claude */}
            <div style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "5px" }}>
                    Anthropic Claude
                  </div>
                  <div style={{ color: "#888", fontSize: "12px" }}>
                    Connect Claude to ModRay.
                  </div>
                </div>
                {renderConnectionButton("claude")}
              </div>
            </div>

            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#ddd",
                marginTop: "26px",
                marginBottom: "10px",
              }}
            >
              Development
            </div>

            {/* Modrinth */}
            <div style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "5px" }}>
                    Modrinth
                  </div>
                  <div style={{ color: "#888", fontSize: "12px" }}>
                    Connect your Modrinth account to ModRay.
                  </div>
                </div>
                {renderConnectionButton("modrinth")}
              </div>
            </div>

            {/* GitHub */}
            <div style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "5px" }}>
                    GitHub
                  </div>
                  <div style={{ color: "#888", fontSize: "12px" }}>
                    Connect GitHub for project and repository features.
                  </div>
                </div>
                {renderConnectionButton("github")}
              </div>
            </div>
          </>
        )}

        {/* About */}
        {currentTab === "about" && (
          <>
            <h2 style={sectionTitleStyle}>About Account</h2>
            <p style={descriptionStyle}>
              Information about your ModRay account.
            </p>
            <div style={cardStyle}>
              <div style={{ fontWeight: 600, marginBottom: "6px" }}>
                ModRay Account
              </div>
              <div style={{ color: "#888", fontSize: "13px" }}>
                Your ModRay account allows you to synchronize your projects and
                settings.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
