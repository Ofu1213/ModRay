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

const PROJECT_DIRECTORY_STORAGE_KEY = "modray-project-directory";

const getDefaultProjectDirectory = () => {
  const stored = localStorage.getItem(PROJECT_DIRECTORY_STORAGE_KEY);
  if (stored && stored.trim()) {
    return stored;
  }

  const env = (window as any).process?.env ?? {};
  const home =
    env.USERPROFILE ||
    env.HOMEDRIVE && env.HOMEPATH
      ? `${env.HOMEDRIVE}${env.HOMEPATH}`
      : env.HOME ||
        "C:\\Users\\Default";

  return `${home.replace(/[\\/]$/, "")}\\ModRayProjects`;
};

export default function Settings() {
  const [currentTab, setCurrentTab] =
    useState<SettingsTab>("general");

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

  const [projectDirectory, setProjectDirectory] = useState<string>(() => {
    const saved = localStorage.getItem(PROJECT_DIRECTORY_STORAGE_KEY);
    return saved && saved.trim() ? saved : getDefaultProjectDirectory();
  });

  const [pathWarning, setPathWarning] = useState("");

  const [language, setLanguage] =
    useState("English");

  const [confirmDelete, setConfirmDelete] =
    useState(true);

  useEffect(() => {
    localStorage.setItem(PROJECT_DIRECTORY_STORAGE_KEY, projectDirectory);
  }, [projectDirectory]);

  const validateProjectDirectory = async (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      setPathWarning("Please enter a path.");
      return false;
    }

    const isAbsolutePath = /^[A-Za-z]:[\\/]|^\\\\|^\//.test(trimmed);
    if (!isAbsolutePath) {
      setPathWarning("Please enter an absolute path. Example: C:\\ModRayProjects");
      return false;
    }

    try {
      const exists = await window.api.checkFileExists(trimmed);
      if (!exists) {
        setPathWarning("This path does not exist. Please create the folder first or specify a different path.");
        return false;
      }
    } catch (error) {
      console.error("Failed to validate project directory:", error);
      setPathWarning("Failed to validate the path. Please check your input.");
      return false;
    }

    setPathWarning("");
    return true;
  };

  const handleProjectDirectoryChange = async (value: string) => {
    setProjectDirectory(value);
    await validateProjectDirectory(value);
  };

  const handleProjectDirectorySelect = async () => {
    try {
      const result = await window.api.selectDirectory();

      if (result.success && result.path) {
        setProjectDirectory(result.path);
        await validateProjectDirectory(result.path);
      }
    } catch (error) {
      console.error("Failed to select project directory:", error);
      setPathWarning("Failed to select a folder. Please try again.");
    }
  };

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
    boxShadow: currentTab === tab ? "0 0 0 1px rgba(0,175,92,0.18)" : "none",
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
          style={{ ...tabStyle("general"), userSelect: "none" }}
          onMouseEnter={(e) => {
            if (currentTab !== "general") {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            }
            e.currentTarget.style.userSelect = "none";
          }}
          onMouseLeave={(e) => {
            if (currentTab !== "general") {
              e.currentTarget.style.background = "transparent";
            }
            e.currentTarget.style.userSelect = "none";
          }}
        >
          General
        </button>

        <button
          onClick={() => setCurrentTab("java")}
          style={{ ...tabStyle("java"), userSelect: "none" }}
          onMouseEnter={(e) => {
            if (currentTab !== "java") {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            }
            e.currentTarget.style.userSelect = "none";
          }}
          onMouseLeave={(e) => {
            if (currentTab !== "java") {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          Java
        </button>

        <button
          onClick={() => setCurrentTab("build")}
          style={{ ...tabStyle("build"), userSelect: "none" }}
          onMouseEnter={(e) => {
            if (currentTab !== "build") {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            }
            e.currentTarget.style.userSelect = "none";
          }}
          onMouseLeave={(e) => {
            if (currentTab !== "build") {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          Build
        </button>

        <button
          onClick={() => setCurrentTab("editor")}
          style={{ ...tabStyle("editor"), userSelect: "none" }}
          onMouseEnter={(e) => {
            if (currentTab !== "editor") {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            }
            e.currentTarget.style.userSelect = "none";
          }}
          onMouseLeave={(e) => {
            if (currentTab !== "editor") {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          Editor
        </button>

        <button
          onClick={() => setCurrentTab("appearance")}
          style={{ ...tabStyle("appearance"), userSelect: "none" }}
          onMouseEnter={(e) => {
            if (currentTab !== "appearance") {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            }
            e.currentTarget.style.userSelect = "none";
          }}
          onMouseLeave={(e) => {
            if (currentTab !== "appearance") {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          Appearance
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setCurrentTab("about")}
          style={{ ...tabStyle("about"), userSelect: "none" }}
          onMouseEnter={(e) => {
            if (currentTab !== "about") {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            }
            e.currentTarget.style.userSelect = "none";
          }}
          onMouseLeave={(e) => {
            if (currentTab !== "about") {
              e.currentTarget.style.background = "transparent";
            }
          }}
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

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <input
                  value={projectDirectory}
                  onChange={(e) => handleProjectDirectoryChange(e.target.value)}
                  placeholder="C:\\Users\\YourName\\ModRayProjects"
                  style={{
                    ...inputStyle,
                    flex: 1,
                  }}
                />

                <button
                  type="button"
                  onClick={handleProjectDirectorySelect}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "7px",
                    border: "1px solid #333",
                    background: "#1d1d1d",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#2a2a2a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#1d1d1d";
                  }}
                >
                  Select folder
                </button>
              </div>

              {pathWarning && (
                <div
                  style={{
                    marginTop: "8px",
                    color: "#ff8a80",
                    fontSize: "12px",
                    userSelect: "none",
                  }}
                >
                  {pathWarning}
                </div>
              )}
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
                disabled
                style={{
                  ...inputStyle,
                  background: "#0e0e0e",
                  color: "#6d6d6d",
                  cursor: "not-allowed",
                  opacity: 0.7,
                }}
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
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!java.installed) {
                        e.currentTarget.style.filter = "brightness(0.9)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = "brightness(1)";
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
            <h2 style={sectionTitleStyle}>Build</h2>
            <p style={descriptionStyle}>Coming soon.</p>

            <div style={cardStyle}>
              <div style={{ fontWeight: 600, marginBottom: "6px" }}>Coming soon</div>
              <div style={{ color: "#888", fontSize: "13px" }}>
                Build settings are not available yet.
              </div>
            </div>
          </>
        )}

        {/* Editor */}
        {currentTab === "editor" && (
          <>
            <h2 style={sectionTitleStyle}>Editor</h2>
            <p style={descriptionStyle}>Coming soon.</p>

            <div style={cardStyle}>
              <div style={{ fontWeight: 600, marginBottom: "6px" }}>Coming soon</div>
              <div style={{ color: "#888", fontSize: "13px" }}>
                Editor settings are not available yet.
              </div>
            </div>
          </>
        )}

        {/* Appearance */}
        {currentTab === "appearance" && (
          <>
            <h2 style={sectionTitleStyle}>Appearance</h2>
            <p style={descriptionStyle}>Coming soon.</p>

            <div style={cardStyle}>
              <div style={{ fontWeight: 600, marginBottom: "6px" }}>Coming soon</div>
              <div style={{ color: "#888", fontSize: "13px" }}>
                Appearance settings are not available yet.
              </div>
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
                Version 0.2.1
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
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = "brightness(0.9)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = "brightness(1)";
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