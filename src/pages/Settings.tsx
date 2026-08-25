import { useState, useEffect } from "react";

interface JavaVersion {
  version: string;
  path: string;
  installed: boolean;
}

type SettingsTab =
  | "general"
  | "java"
  | "build"
  | "editor"
  | "appearance"
  | "about";

export default function Settings() {
  const [currentTab, setCurrentTab] =
    useState<SettingsTab>("java");

  const [javaVersions, setJavaVersions] = useState<
    JavaVersion[]
  >([
    {
      version: "25",
      path: "",
      installed: false,
    },
    {
      version: "21",
      path: "",
      installed: false,
    },
    {
      version: "17",
      path: "",
      installed: false,
    },
  ]);

    const scanJava = async () => {
  try {
    const result = await window.api.scanJava();

    if (result.success) {
      setJavaVersions(result.versions);
    } else {
      console.error(
        "Failed to scan for Java installations:",
        result.message
      );
    }
  } catch (error) {
    console.error(
      "An error occurred while scanning for Java installations:",
      error
    );
  }
};

useEffect(() => {
  scanJava();
}, []);

  const [projectDirectory, setProjectDirectory] =
    useState("");

  const [language, setLanguage] =
    useState("English");

  const [confirmDelete, setConfirmDelete] =
    useState(true);

  const [gradleDaemon, setGradleDaemon] =
    useState(true);

  const [offlineMode, setOfflineMode] =
    useState(false);

  const [fontSize, setFontSize] =
    useState(14);

  const [wordWrap, setWordWrap] =
    useState(true);

  const [minimap, setMinimap] =
    useState(true);

  const [theme, setTheme] =
    useState("Dark");

  const [uiScale, setUiScale] =
    useState(100);

  const handlePathChange = (
    version: string,
    value: string
  ) => {
    setJavaVersions((prev) =>
      prev.map((java) =>
        java.version === version
          ? { ...java, path: value }
          : java
      )
    );
  };

const handleInstall = async (version: string) => {
  console.log(
    `Starting Java ${version} installation`
  );

  try {
    const result =
      await window.api.downloadJava(version);

    if (!result.success) {
      console.error(
        `Failed to install Java ${version}:`,
        result.message
      );
      return;
    }

    console.log(
      `Java ${version} installation completed`
    );

    // Rescan Java installations
    const scanResult =
      await window.api.scanJava();

    if (scanResult.success) {
      setJavaVersions(
        scanResult.versions
      );

      console.log(
        "Java installations rescanned:",
        scanResult.versions
      );
    } else {
      console.error(
        "Failed to rescan Java installations:",
        scanResult.message
      );
    }

  } catch (error) {
    console.error(
      `Error installing Java ${version}:`,
      error
    );
  }
};

  const tabStyle = (
    tab: SettingsTab
  ): React.CSSProperties => ({
    width: "100%",
    padding: "10px 12px",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    textAlign: "left",
    background:
      currentTab === tab
        ? "#00AF5C"
        : "transparent",
    color:
      currentTab === tab
        ? "#fff"
        : "#aaa",
    fontSize: "14px",
    transition: "all 0.2s",
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
  };

  const descriptionStyle: React.CSSProperties = {
    color: "#888",
    fontSize: "13px",
    marginTop: 0,
    marginBottom: "24px",
  };

  const cardStyle: React.CSSProperties = {
    background: "#1a1a1a",
    border: "1px solid #2d2d2d",
    borderRadius: "10px",
    padding: "18px",
    marginBottom: "14px",
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Left: settings categories */}
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
        <button
          onClick={() => setCurrentTab("general")}
          style={tabStyle("general")}
        >
          General
        </button>

        <button
          onClick={() => setCurrentTab("java")}
          style={tabStyle("java")}
        >
          Java
        </button>

        <button
          onClick={() => setCurrentTab("build")}
          style={tabStyle("build")}
        >
          Build
        </button>

        <button
          onClick={() => setCurrentTab("editor")}
          style={tabStyle("editor")}
        >
          Editor
        </button>

        <button
          onClick={() => setCurrentTab("appearance")}
          style={tabStyle("appearance")}
        >
          Appearance
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setCurrentTab("about")}
          style={tabStyle("about")}
        >
          About
        </button>
      </div>

      {/* Right: settings content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: "auto",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >

        {/* General */}
        {currentTab === "general" && (
          <>
            <h2 style={sectionTitleStyle}>
              General
            </h2>

            <p style={descriptionStyle}>
              Configure general ModRay settings.
            </p>

            <div style={cardStyle}>
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Default project directory
              </div>

              <input
                value={projectDirectory}
                onChange={(e) =>
                  setProjectDirectory(e.target.value)
                }
                placeholder="C:\\Users\\YourName\\ModRayProjects"
                style={inputStyle}
              />
            </div>

            <div style={cardStyle}>
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Language
              </div>

              <select
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value)
                }
                style={inputStyle}
              >
                <option>English</option>
                <option>Japanese</option>
              </select>
            </div>

            <SettingToggle
              title="Confirm before deleting"
              description="Show a confirmation dialog before deleting files."
              value={confirmDelete}
              onChange={setConfirmDelete}
            />
          </>
        )}

        {/* Java */}
        {currentTab === "java" && (
          <>
            <h2 style={sectionTitleStyle}>
              Java
            </h2>

            <p style={descriptionStyle}>
              Manage Java installations used for Minecraft development.
            </p>

            {javaVersions.map((java) => (
              <div
                key={java.version}
                style={cardStyle}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                      }}
                    >
                      Java {java.version}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        color: java.installed
                          ? "#00AF5C"
                          : "#888",
                        marginTop: "4px",
                      }}
                    >
                      {java.installed
                        ? "Installed"
                        : "Not installed"}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      handleInstall(java.version)
                    }
                    disabled={java.installed}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "7px",
                      border: "none",
                      cursor: java.installed
                        ? "not-allowed"
                        : "pointer",
                      background: java.installed
                        ? "#333"
                        : "#00AF5C",
                      color: java.installed
                        ? "#777"
                        : "#fff",
                      fontWeight: 600,
                    }}
                  >
                    {java.installed
                      ? "Installed"
                      : "Install"}
                  </button>
                </div>

                <input
                  value={java.path}
                  onChange={(e) =>
                    handlePathChange(
                      java.version,
                      e.target.value
                    )
                  }
                  placeholder={`C:\\Program Files\\Java\\jdk-${java.version}`}
                  style={{
                    ...inputStyle,
                    fontFamily: "monospace",
                  }}
                />
              </div>
            ))}
          </>
        )}

        {/* Build */}
        {currentTab === "build" && (
          <>
            <h2 style={sectionTitleStyle}>
              Build
            </h2>

            <p style={descriptionStyle}>
              Configure Gradle and project build behavior.
            </p>

            <SettingToggle
              title="Gradle Daemon"
              description="Keep Gradle running in the background to speed up builds."
              value={gradleDaemon}
              onChange={setGradleDaemon}
            />

            <SettingToggle
              title="Offline mode"
              description="Build projects without downloading dependencies."
              value={offlineMode}
              onChange={setOfflineMode}
            />
          </>
        )}

        {/* Editor */}
        {currentTab === "editor" && (
          <>
            <h2 style={sectionTitleStyle}>
              Editor
            </h2>

            <p style={descriptionStyle}>
              Customize the ModRay code editor.
            </p>

            <div style={cardStyle}>
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: "10px",
                }}
              >
                Font size
              </div>

              <input
                type="number"
                value={fontSize}
                min="10"
                max="32"
                onChange={(e) =>
                  setFontSize(Number(e.target.value))
                }
                style={inputStyle}
              />
            </div>

            <SettingToggle
              title="Word wrap"
              description="Wrap long lines in the editor."
              value={wordWrap}
              onChange={setWordWrap}
            />

            <SettingToggle
              title="Minimap"
              description="Show the code minimap."
              value={minimap}
              onChange={setMinimap}
            />
          </>
        )}

        {/* Appearance */}
        {currentTab === "appearance" && (
          <>
            <h2 style={sectionTitleStyle}>
              Appearance
            </h2>

            <p style={descriptionStyle}>
              Customize the appearance of ModRay.
            </p>

            <div style={cardStyle}>
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Theme
              </div>

              <select
                value={theme}
                onChange={(e) =>
                  setTheme(e.target.value)
                }
                style={inputStyle}
              >
                <option>Dark</option>
                <option>Light</option>
                <option>System</option>
              </select>
            </div>

            <div style={cardStyle}>
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                UI Scale: {uiScale}%
              </div>

              <input
                type="range"
                min="75"
                max="150"
                step="5"
                value={uiScale}
                onChange={(e) =>
                  setUiScale(Number(e.target.value))
                }
                style={{
                  width: "100%",
                }}
              />
            </div>
          </>
        )}

        {/* About */}
        {currentTab === "about" && (
          <>
            <h2 style={sectionTitleStyle}>
              About ModRay
            </h2>

            <p style={descriptionStyle}>
              Information about your ModRay installation.
            </p>

            <div style={cardStyle}>
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: "6px",
                }}
              >
                ModRay
              </div>

              <div
                style={{
                  color: "#888",
                  fontSize: "13px",
                }}
              >
                Version 0.1.0
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface SettingToggleProps {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function SettingToggle({
  title,
  description,
  value,
  onChange,
}: SettingToggleProps) {
  return (
    <div
      style={{
        background: "#1a1a1a",
        border: "1px solid #2d2d2d",
        borderRadius: "10px",
        padding: "18px",
        marginBottom: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
      }}
    >
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: "5px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "#888",
          }}
        >
          {description}
        </div>
      </div>

      <button
        onClick={() => onChange(!value)}
        style={{
          width: "44px",
          height: "24px",
          borderRadius: "20px",
          border: "none",
          cursor: "pointer",
          padding: "3px",
          background: value
            ? "#00AF5C"
            : "#444",
          transition: "0.2s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "#fff",
            transform: value
              ? "translateX(20px)"
              : "translateX(0)",
            transition: "0.2s",
          }}
        />
      </button>
    </div>
  );
}