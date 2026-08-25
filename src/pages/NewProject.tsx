// src/pages/NewProject.tsx
import { useState } from "react";

interface NewProjectProps {
  onBack: () => void;

  onProjectCreated: (
    projectPath: string,
    groupId: string,
    loader: string
  ) => void;
}

const minecraftVersions = [
  {
    group: "26.2.x",
    versions: ["26.2"],
  },
  {
    group: "26.1.x",
    versions: ["26.1", "26.1.1", "26.1.2"],
  },
  {
    group: "1.21.x",
    versions: [
      "1.21",
      "1.21.1",
      "1.21.2",
      "1.21.3",
      "1.21.4",
      "1.21.5",
      "1.21.6",
      "1.21.7",
      "1.21.8",
      "1.21.9",
      "1.21.10",
      "1.21.11",
    ],
  },
  {
    group: "1.20.x",
    versions: [
      "1.20",
      "1.20.1",
      "1.20.2",
      "1.20.3",
      "1.20.4",
      "1.20.5",
      "1.20.6",
    ],
  },
];



export default function NewProject({ onBack, onProjectCreated }: NewProjectProps) {
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("com.example");
  const [mcVersion, setMcVersion] = useState("1.20.1");
  const [loader, setLoader] = useState("fabric");
  const [status, setStatus] = useState("");

  async function createProject() {
    if (!name.trim()) {
      setStatus("Please enter a project name!");
      return;
    }

    if (!groupId.trim()) {
      setStatus("Please enter a Group ID!");
      return;
    }

    try {
      setStatus("Creating project...");

      const result = await window.api.createProject({
        projectName: name,
        groupId,
        mcVersion,
        loader,
      });

      if (result && result.success) {
  setStatus("✓ Project Created!");

  if (result.success && result.path) {
  onProjectCreated(
    result.path,
    groupId,
    loader
  );
  } else {
    setStatus("The project was created, but its path could not be retrieved.");
  }
}
    } catch (e) {
      console.error(e);
      setStatus("Communication failed.");
    }
  }

  return (
    <div
    className="new-project-page"
      style={{
        padding: "40px",
        color: "#fff",
        maxWidth: "1000px",
        margin: "0 auto",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "30px" }}>
        <div
          style={{
            fontSize: "12px",
            color: "#777",
            marginBottom: "7px",
            letterSpacing: "0.5px",
          }}
        >
          PROJECT
        </div>

        <h1
          style={{
            margin: "0 0 6px 0",
            fontSize: "28px",
            fontWeight: "700",
            letterSpacing: "0.5px",
          }}
        >
          New Project
        </h1>

        <p
          style={{
            color: "#a0a0a0",
            fontSize: "14px",
            margin: 0,
          }}
        >
          Create a new Minecraft mod project
        </p>
      </div>

      {/* Project Name */}
      <div style={{ marginBottom: "24px" }}>
        <p
          style={{
            fontSize: "14px",
            fontWeight: "500",
            marginBottom: "8px",
            color: "#e0e0e0",
          }}
        >
          Project Name
        </p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="MyMod"
          style={{
            padding: "10px 12px",
            width: "350px",
            boxSizing: "border-box",
            background: "#1a1a1a",
            color: "#fff",
            border: "1px solid #2a2a2a",
            borderRadius: "6px",
            outline: "none",
            fontSize: "14px",
          }}
        />
      </div>

      {/* Group ID */}
      <div style={{ marginBottom: "28px" }}>
        <p
          style={{
            fontSize: "14px",
            fontWeight: "500",
            marginBottom: "8px",
            color: "#e0e0e0",
          }}
        >
          Group ID / Package
        </p>

        <input
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          placeholder="com.example.mymod"
          style={{
            padding: "10px 12px",
            width: "450px",
            boxSizing: "border-box",
            background: "#1a1a1a",
            color: "#fff",
            border: "1px solid #2a2a2a",
            borderRadius: "6px",
            outline: "none",
            fontSize: "14px",
          }}
        />

        <p
          style={{
            fontSize: "12px",
            color: "#666",
            marginTop: "7px",
            marginBottom: 0,
          }}
        >
          It is used as part of Java's package structure.
        </p>
      </div>

      {/* Minecraft Version */}
<div style={{ marginBottom: "28px" }}>
  <p
    style={{
      fontSize: "14px",
      fontWeight: "500",
      marginBottom: "10px",
      color: "#e0e0e0",
    }}
  >
    Minecraft Version
  </p>

  {/* Scrollbar */}
<style>{`
  /* Minecraft Version */
  .version-list::-webkit-scrollbar {
    width: 8px;
  }

  .version-list::-webkit-scrollbar-track {
    background: #141414;
  }

  .version-list::-webkit-scrollbar-thumb {
    background: #333333;
    border-radius: 4px;
  }

  .version-list::-webkit-scrollbar-thumb:hover {
    background: #00AF5C;
  }

  /* New Project page */
  .new-project-page::-webkit-scrollbar {
    width: 8px;
  }

  .new-project-page::-webkit-scrollbar-track {
    background: #141414;
  }

  .new-project-page::-webkit-scrollbar-thumb {
    background: #333333;
    border-radius: 4px;
  }

  .new-project-page::-webkit-scrollbar-thumb:hover {
    background: #00AF5C;
  }
`}</style>

  {/* Scroll the full version list */}
  <div
    className="version-list"
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "18px",
      maxWidth: "650px",
      maxHeight: "280px",
      overflowY: "auto",
      paddingRight: "8px",
    }}
  >
    {minecraftVersions.map((group) => (
      <div key={group.group}>
        {/* Version group */}
        <div
          style={{
            fontSize: "12px",
            color: "#777",
            marginBottom: "8px",
          }}
        >
          {group.group}
        </div>

        {/* Versions */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "7px",
          }}
        >
          {group.versions.map((version) => {
            const enabled = version === "1.20.1";
            const selected = mcVersion === version;

            return (
              <button
                key={version}
                disabled={!enabled}
                onClick={() => setMcVersion(version)}
                style={{
                  minWidth: "72px",
                  padding: "8px 10px",
                  borderRadius: "5px",
                  border: selected
                    ? "1px solid #00AF5C"
                    : "1px solid #2a2a2a",
                  background: enabled
                    ? selected
                      ? "#123d29"
                      : "#1a1a1a"
                    : "#151515",
                  color: enabled
                    ? selected
                      ? "#fff"
                      : "#ccc"
                    : "#555",
                  cursor: enabled
                    ? "pointer"
                    : "not-allowed",
                  fontSize: "12px",
                  fontWeight: selected ? "600" : "400",
                  opacity: enabled ? 1 : 0.65,
                }}
              >
                {version}

                {!enabled && (
                  <span
                    style={{
                      marginLeft: "4px",
                      fontSize: "9px",
                    }}
                  >
                    🔒
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </div>

  <p
    style={{
      fontSize: "12px",
      color: "#666",
      marginTop: "10px",
    }}
  >
    Currently Supported Version: 1.20.1
  </p>
</div>

      {/* Loader */}
      <div style={{ marginBottom: "30px" }}>
        <p
          style={{
            fontSize: "14px",
            fontWeight: "500",
            marginBottom: "10px",
            color: "#e0e0e0",
          }}
        >
          Mod Loader
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
            maxWidth: "650px",
          }}
        >
          {/* Fabric */}
          <button
            onClick={() => setLoader("fabric")}
            style={{
              flex: 1,
              padding: "14px",
              background:
                loader === "fabric" ? "#123d29" : "#1a1a1a",
              color: "#fff",
              border:
                loader === "fabric"
                  ? "1px solid #00AF5C"
                  : "1px solid #2a2a2a",
              borderRadius: "7px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              Fabric
            </div>

            <div
              style={{
                marginTop: "4px",
                fontSize: "11px",
                color: "#777",
              }}
            >
              Lightweight mod loader
            </div>
          </button>

          {/* NeoForge */}
<button
  disabled
  onClick={() => setLoader("neoforge")}
  style={{
    flex: 1,
    padding: "14px",
    background: "#151515",
    color: "#555",
    border: "1px solid #222",
    borderRadius: "7px",
    cursor: "not-allowed",
    textAlign: "left",
    opacity: 0.65,
  }}
>
  <div
    style={{
      fontSize: "14px",
      fontWeight: "600",
    }}
  >
    NeoForge 🔒
  </div>

  <div
    style={{
      marginTop: "4px",
      fontSize: "11px",
      color: "#555",
    }}
  >
    Coming soon
  </div>
</button>
        </div>
      </div>

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "35px",
        }}
      >
        <button
          onClick={createProject}
          style={{
            padding: "10px 20px",
            background: "#00AF5C",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          Create Project
        </button>

        <button
          onClick={onBack}
          style={{
            padding: "10px 20px",
            background: "#1a1a1a",
            color: "#ccc",
            border: "1px solid #2a2a2a",
            borderRadius: "6px",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>

      {/* Status */}
      {status && (
        <p
          style={{
            marginTop: "15px",
            color: "#ffeb3b",
            fontSize: "13px",
          }}
        >
          {status}
        </p>
      )}
    </div>
  );
}