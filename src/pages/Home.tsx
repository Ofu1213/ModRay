// src/pages/Home.tsx
import { useEffect, useState } from "react";
import { ProjectInfo } from "../App";

interface HomeProps {
  openNewProject: () => void;
  onOpenProject: (project: ProjectInfo) => void;
}

export function Home({ openNewProject, onOpenProject }: HomeProps) {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);

const newsItems = [
  {
    id: 1,
    title: "ModRay development is progressing",
    image: "",
    summary:
      "ModRay continues to evolve with improvements to project management, the integrated terminal, Java configuration, and the development workflow.",
    tag: "Development",
  },
  {
    id: 2,
    title: "Smarter Java management",
    image: "",
    summary:
      "ModRay is improving Java runtime detection and configuration, making it easier to manage the Java versions required for different Minecraft projects.",
    tag: "Feature",
  },
  {
    id: 3,
    title: "Expanding Minecraft loader support",
    image: "",
    summary:
      "Support for Fabric and NeoForge project workflows is being developed, with the goal of making multi-loader mod development easier in ModRay.",
    tag: "Development",
  },
];

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
    <div
      className="home-no-select"
      style={{
        width: "100%",
        height: "100%",
        color: "#fff",
        background: "#121212",
        boxSizing: "border-box",
        display: "flex",
      }}
    >
      <style>{`
        .home-no-select {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          cursor: default;
        }

        .project-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .project-scroll::-webkit-scrollbar-track {
          background: #141414;
        }

        .project-scroll::-webkit-scrollbar-thumb {
          background: #333333;
          border-radius: 4px;
        }

        .project-scroll::-webkit-scrollbar-thumb:hover {
          background: #00AF5C;
        }

        .home-news-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .home-news-scroll::-webkit-scrollbar-track {
          background: #141414;
        }

        .home-news-scroll::-webkit-scrollbar-thumb {
          background: #333333;
          border-radius: 4px;
        }

        .home-news-scroll::-webkit-scrollbar-thumb:hover {
          background: #00AF5C;
        }
      `}</style>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          padding: "40px 24px 40px 40px",
          boxSizing: "border-box",
        }}
      >
        <div
          className="project-scroll"
          style={{
            height: "100%",
            overflowY: "auto",
            paddingRight: "8px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ minHeight: "100%" }}>
            <h1 style={{ fontSize: "28px", fontWeight: "700", margin: "0 0 6px 0", letterSpacing: "0.5px" }}>
              ModRay IDE
            </h1>
            <p style={{ color: "#a0a0a0", fontSize: "14px", margin: 0 }}>
              Minecraft Mod Development Environment
            </p>

            <div style={{ marginTop: "28px" }}>
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
                      gap: "20px",
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
                      <span className="material-symbols-outlined" style={{ color: "#00AF5C", fontSize: "20px" }}>
                        folder
                      </span>

                      <span style={{ fontSize: "15px", fontWeight: "500", color: "#fff", marginRight: "6px" }}>
                        {project.name}
                      </span>

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

                    <span
                      style={{
                        color: "#777",
                        fontSize: "12px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        direction: "rtl",
                        textAlign: "left",
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
        </div>
      </div>

      <aside
        style={{
          position: "sticky",
          top: 0,
          right: 0,
          width: "320px",
          minWidth: "320px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          padding: "18px 10px 18px 0",
          boxSizing: "border-box",
          background: "transparent",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            minHeight: 0,
            flex: "1 1 auto",
            height: "0",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: "700",
              letterSpacing: "0.8px",
              color: "#dfe8ee",
              padding: "0 8px",
            }}
          >
            News
          </div>

          <div
            className="home-news-scroll"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              overflowY: "auto",
              padding: "0 8px",
              minHeight: 0,
              flex: "1 1 auto",
              alignSelf: "stretch",
              height: "0",
            }}
          >
            {newsItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                style={{
                  background: "rgba(26, 26, 26, 0.9)",
                  borderRadius: "8px",
                  overflow: "hidden",
                  flex: "0 0 auto",
                }}
              >
                <div
                  style={{
                    height: "104px",
                    background: "linear-gradient(135deg, rgba(0,175,92,0.28), rgba(255,255,255,0.02))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#8de4b6",
                    fontSize: "12px",
                    fontWeight: "600",
                    letterSpacing: "0.5px",
                  }}
                >
                  {item.image || "IMAGE"}
                </div>

                <div style={{ padding: "10px 12px 12px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      marginBottom: "8px",
                      background: "rgba(0,175,92,0.18)",
                      color: "#8ce1ad",
                      borderRadius: "999px",
                      fontSize: "10px",
                      padding: "4px 8px",
                      fontWeight: "700",
                      letterSpacing: "0.4px",
                    }}
                  >
                    {item.tag}
                  </span>

                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#f2f2f2", marginBottom: "6px" }}>
                    {item.title}
                  </div>

                  <div style={{ fontSize: "12px", color: "#a7a7a7", lineHeight: "1.5" }}>
                    {item.summary}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: "0 8px" }}>
            <a
              href="https://example.com/news"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "block",
                textAlign: "center",
                color: "#dfe8ee",
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: "600",
                background: "rgba(255,255,255,0.02)",
                borderRadius: "6px",
                padding: "8px 10px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,175,92,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.02)";
              }}
            >
              View all news
            </a>
          </div>
        </div>

        <div
          style={{
            background: "rgba(26, 26, 26, 0.9)",
            borderRadius: "10px",
            height: "220px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8d8d8d",
            fontSize: "13px",
            fontWeight: "600",
            letterSpacing: "0.5px",
            marginLeft: "8px",
            marginRight: "0",
          }}
        >
          (Ad)
        </div>
      </aside>
    </div>
  );
}