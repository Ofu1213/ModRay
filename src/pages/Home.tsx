// src/pages/Home.tsx
import { useEffect, useState } from "react";
import { ProjectInfo } from "../App";

interface HomeProps {
  openNewProject: () => void;
  onOpenProject: (project: ProjectInfo) => void;
}

export function Home({ openNewProject, onOpenProject }: HomeProps) {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);

  useEffect(() => {
    async function loadProjects() {
      if (window.api && window.api.getProjects) {
        const res = await window.api.getProjects();
        if (res.success && res.projects) {
          setProjects(res.projects);
        }
      }
    }
    loadProjects();
  }, []);

  return (
    <div style={{ padding: "40px", color: "#fff", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Rocket emoji removed */}
      <h1 style={{ fontSize: "28px", fontWeight: "700", margin: "0 0 6px 0", letterSpacing: "0.5px" }}>
        ModRay IDE
      </h1>
      <p style={{ color: "#a0a0a0", fontSize: "14px", margin: 0 }}>
        Minecraft Mod Development Environment
      </p>

      <div style={{ marginTop: "28px" }}>
        {/* Use the Material Symbols add icon with Modrinth green */}
        <button
          onClick={openNewProject}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            background: "#00AF5C",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#00c869")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#00AF5C")}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
          New Project
        </button>
      </div>

      <h2 style={{ marginTop: "40px", borderBottom: "1px solid #222", paddingBottom: "12px", fontSize: "18px", color: "#e0e0e0" }}>
        Recent Projects
      </h2>

      {projects.length === 0 ? (
        <p style={{ color: "#666", fontSize: "14px" }}>No projects yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
          {projects.map((project) => (
            <div
              key={project.path}
              onClick={() => onOpenProject(project)}
              style={{
                padding: "14px 18px",
                background: "#1a1a1a",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid #2a2a2a",
                transition: "all 0.2s",
                gap: "20px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#222222";
                e.currentTarget.style.borderColor = "#00AF5C";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#1a1a1a";
                e.currentTarget.style.borderColor = "#2a2a2a";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", minWidth: 0, flexShrink: 0, gap: "10px" }}>
                {/* Use the Material Symbols folder icon */}
                <span className="material-symbols-outlined" style={{ color: "#00AF5C", fontSize: "20px" }}>
                  folder
                </span>
                
                <span style={{ fontSize: "15px", fontWeight: "500", color: "#fff", marginRight: "6px" }}>
                  {project.name}
                </span>

                {/* Loader badge */}
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    background: project.loader === "neoforge" ? "#e65100" : "#2e7d32",
                    color: "#fff",
                  }}
                >
                  {project.loader || "fabric"}
                </span>
              </div>

              {/* Project path */}
              <span
                style={{
                  color: "#777",
                  fontSize: "12px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  direction: "rtl",
                  textAlign: "left"
                }}
                title={project.path}
              >
                {project.path}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}