import { useState, useEffect, useRef } from "react";

interface FileExplorerProps {
  projectName: string;
  projectPath: string;
  groupId: string;
  loader?: "fabric" | "neoforge";
  mcVersion?: string;
  currentFilePath: string;
  onBack: () => void;
  onSelectFile: (filePath: string) => void;
}

type FileItem = {
  name: string;
  path: string;
};

type FileType = "java" | "client" | "config" | "lang";

const PRESET_LANGUAGES = [
  { code: "en_us", name: "English (US)" },
  { code: "en_gb", name: "English (UK)" },
  { code: "zh_cn", name: "简体中文 (Chinese Simplified)" },
  { code: "zh_tw", name: "繁體中文 (Chinese Traditional)" },
  { code: "ko_kr", name: "한국어 (Korean)" },
  { code: "ja_jp", name: "Japanese" },
  { code: "vi_vn", name: "Tiếng Việt (Vietnamese)" },
  { code: "th_th", name: "ไทย (Thai)" },
  { code: "id_id", name: "Bahasa Indonesia (Indonesian)" },
  { code: "ms_my", name: "Bahasa Melayu (Malay)" },
  { code: "tl_ph", name: "Filipino (Tagalog)" },
  { code: "hi_in", name: "हिन्दी (Hindi)" },
  { code: "bn_bd", name: "বাংলা (Bengali)" },
  { code: "ta_in", name: "தமிழ் (Tamil)" },
  { code: "te_in", name: "తెలుగు (Telugu)" },
  { code: "mr_in", name: "मराठी (Marathi)" },
  { code: "ur_pk", name: "اُردُو (Urdu)" },
  { code: "my_mm", name: "မြန်မာ (Burmese)" },

  { code: "de_de", name: "Deutsch (German)" },
  { code: "fr_fr", name: "Français (French)" },
  { code: "es_es", name: "Español (Spanish)" },
  { code: "it_it", name: "Italiano (Italian)" },
  { code: "nl_nl", name: "Nederlands (Dutch)" },
  { code: "pl_pl", name: "Polski (Polish)" },
  { code: "ru_ru", name: "Русский (Russian)" },
  { code: "uk_ua", name: "Українська (Ukrainian)" },
  { code: "sv_se", name: "Svenska (Swedish)" },
  { code: "no_no", name: "Norsk (Norwegian)" },
  { code: "fi_fi", name: "Suomi (Finnish)" },
  { code: "da_dk", name: "Dansk (Danish)" },
  { code: "cs_cz", name: "Čeština (Czech)" },
  { code: "el_gr", name: "Ελληνικά (Greek)" },
  { code: "hu_hu", name: "Magyar (Hungarian)" },
  { code: "ro_ro", name: "Română (Romanian)" },
  { code: "bg_bg", name: "Български (Bulgarian)" },
  { code: "sk_sk", name: "Slovenčina (Slovak)" },
  { code: "hr_hr", name: "Hrvatski (Croatian)" },
  { code: "ca_es", name: "Català (Catalan)" },
  { code: "ga_ie", name: "Gaeilge (Irish)" },

  { code: "ar_eg", name: "العربية (Arabic)" },
  { code: "tr_tr", name: "Türkçe (Turkish)" },
  { code: "he_il", name: "עברית (Hebrew)" },
  { code: "fa_ir", name: "فارسی (Persian)" },
  { code: "sw_ke", name: "Kiswahili (Swahili)" },
  { code: "am_et", name: "አማርኛ (Amharic)" },
  { code: "zu_za", name: "isiZulu (Zulu)" },
  { code: "pt_br", name: "Português (Brazilian Portuguese)" },
  { code: "pt_pt", name: "Português (European Portuguese)" },
  { code: "es_mx", name: "Español (Latin American Spanish)" },
  { code: "fr_ca", name: "Français (Canadian French)" },
];

export default function FileExplorer({
  projectName,
  projectPath,
  groupId,
  loader,
  mcVersion,
  currentFilePath,
  onBack,
  onSelectFile,
}: FileExplorerProps) {
  const cleanGroupId = groupId
    ? groupId.replace(/^\.+/, "")
    : "com.example";

  const separator = projectPath.includes("/") ? "/" : "\\";

  const groupPath = cleanGroupId
    .split(".")
    .filter(Boolean)
    .join(separator);

  const [validConfigFiles, setValidConfigFiles] = useState<FileItem[]>([]);
  const [javaFiles, setJavaFiles] = useState<FileItem[]>([]);
  const [clientJavaFiles, setClientJavaFiles] = useState<FileItem[]>([]);
  const [langFiles, setLangFiles] = useState<FileItem[]>([]);

  const [isAddingJava, setIsAddingJava] = useState(false);
  const [newJavaName, setNewJavaName] = useState("");

  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientJavaName, setNewClientJavaName] = useState("");

  const javaInputRef = useRef<HTMLInputElement>(null);
  const clientInputRef = useRef<HTMLInputElement>(null);

  const [renamingPath, setRenamingPath] =
    useState<string | null>(null);

  const [renameValue, setRenameValue] = useState("");

  const [showLangModal, setShowLangModal] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    filePath: string;
    fileName: string;
    type: FileType;
  } | null>(null);

  const mainJavaDir =
    `${projectPath}${separator}src${separator}main${separator}java${separator}${groupPath}`;

  const clientJavaDir =
    `${projectPath}${separator}src${separator}client${separator}java${separator}${groupPath}${separator}client`;

  const langDir =
    `${projectPath}${separator}src${separator}main${separator}resources${separator}assets${separator}${projectName.toLowerCase()}${separator}lang`;

  const candidateConfigFiles: FileItem[] = [
    {
      name: "build.gradle",
      path: `${projectPath}${separator}build.gradle`,
    },
    {
      name: "gradle.properties",
      path: `${projectPath}${separator}gradle.properties`,
    },
    {
      name: "settings.gradle",
      path: `${projectPath}${separator}settings.gradle`,
    },
    {
      name: "gradle-wrapper.properties",
      path:
        `${projectPath}${separator}gradle${separator}wrapper${separator}gradle-wrapper.properties`,
    },
  ];

  if (loader === "fabric") {
    candidateConfigFiles.push({
      name: "fabric.mod.json",
      path:
        `${projectPath}${separator}src${separator}main${separator}resources${separator}fabric.mod.json`,
    });
  }

  if (loader === "neoforge" && mcVersion === "1.20.1") {
    candidateConfigFiles.push({
      name: "mods.toml",
      path:
        `${projectPath}${separator}src${separator}main${separator}resources${separator}META-INF${separator}mods.toml`,
    });
  }

  if (
    loader === "neoforge" &&
    mcVersion &&
    mcVersion !== "1.20.1"
  ) {
    candidateConfigFiles.push({
      name: "neoforge.mods.toml",
      path:
        `${projectPath}${separator}src${separator}main${separator}resources${separator}META-INF${separator}neoforge.mods.toml`,
    });
  }

  useEffect(() => {
    async function loadInitialFiles() {
      const loadJavaFiles = async (
        dir: string
      ): Promise<FileItem[]> => {
        if (!window.api || !(window.api as any).getFiles) {
          return [];
        }

        try {
          const files: string[] =
            await (window.api as any).getFiles(dir);

          return files
            .filter((file) => file.endsWith(".java"))
            .map((file) => ({
              name: file,
              path: `${dir}${separator}${file}`,
            }));
        } catch (e) {
          console.error("Error loading Java files:", e);
          return [];
        }
      };

      const detectedMainJavaFiles =
        await loadJavaFiles(mainJavaDir);

      const detectedClientJavaFiles =
        await loadJavaFiles(clientJavaDir);

      setJavaFiles(detectedMainJavaFiles);
      setClientJavaFiles(detectedClientJavaFiles);

      const existingConfigs: FileItem[] = [];

      for (const file of candidateConfigFiles) {
        if (
          window.api &&
          (window.api as any).checkFileExists
        ) {
          const exists =
            await (window.api as any).checkFileExists(
              file.path
            );

          if (exists) {
            existingConfigs.push(file);
          }
        } else {
          existingConfigs.push(file);
        }
      }

      setValidConfigFiles(existingConfigs);

      const existingLangs: FileItem[] = [];

      for (const lang of PRESET_LANGUAGES) {
        const langPath =
          `${langDir}${separator}${lang.code}.json`;

        if (
          window.api &&
          (window.api as any).checkFileExists
        ) {
          const exists =
            await (window.api as any).checkFileExists(
              langPath
            );

          if (exists) {
            existingLangs.push({
              name: `${lang.code}.json`,
              path: langPath,
            });
          }
        }
      }

      setLangFiles(existingLangs);
    }

    loadInitialFiles();
  }, [
    projectPath,
    groupId,
    projectName,
    loader,
    mcVersion,
  ]);

  useEffect(() => {
    if (isAddingJava) {
      javaInputRef.current?.focus();
    }
  }, [isAddingJava]);

  useEffect(() => {
    if (isAddingClient) {
      clientInputRef.current?.focus();
    }
  }, [isAddingClient]);

  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
    };

    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, []);

  const createJavaFile = async (
    rawName: string,
    type: "main" | "client"
  ): Promise<FileItem | null> => {
    const trimmedName = rawName.trim();

    if (!trimmedName) {
      return null;
    }

    const fileName = trimmedName.endsWith(".java")
      ? trimmedName
      : `${trimmedName}.java`;

    const javaClassName =
      trimmedName.replace(/\.java$/, "");

    const baseDir =
      type === "main"
        ? mainJavaDir
        : clientJavaDir;

    const targetPath =
      `${baseDir}${separator}${fileName}`;

    const packageName =
      type === "main"
        ? cleanGroupId
        : `${cleanGroupId}.client`;

    const initialContent =
`package ${packageName};

public class ${javaClassName} {
    // TODO: Write code here
}
`;

    try {
      if (
        window.api &&
        (window.api as any).saveFile
      ) {
        await (window.api as any).saveFile({
          filePath: targetPath,
          content: initialContent,
        });
      }

      return {
        name: fileName,
        path: targetPath,
      };
    } catch (e) {
      console.error("Error creating Java file:", e);
      alert("Failed to create Java file");
      return null;
    }
  };

  const handleConfirmJava = async () => {
    const file =
      await createJavaFile(newJavaName, "main");

    if (file) {
      setJavaFiles((prev) => {
        if (prev.some((f) => f.path === file.path)) {
          return prev;
        }

        return [...prev, file];
      });

      onSelectFile(file.path);
    }

    setIsAddingJava(false);
    setNewJavaName("");
  };

  const handleConfirmClientJava = async () => {
    const file =
      await createJavaFile(
        newClientJavaName,
        "client"
      );

    if (file) {
      setClientJavaFiles((prev) => {
        if (prev.some((f) => f.path === file.path)) {
          return prev;
        }

        return [...prev, file];
      });

      onSelectFile(file.path);
    }

    setIsAddingClient(false);
    setNewClientJavaName("");
  };

  const handleConfirmRename = async (
    oldPath: string,
    type: "java" | "client"
  ) => {
    const rawName = renameValue.trim();

    if (!rawName) {
      setRenamingPath(null);
      setRenameValue("");
      return;
    }

    const newFileName =
      rawName.endsWith(".java")
        ? rawName
        : `${rawName}.java`;

    const baseDir =
      type === "java"
        ? mainJavaDir
        : clientJavaDir;

    const newPath =
      `${baseDir}${separator}${newFileName}`;

    try {
      if (oldPath !== newPath) {
        if (
          window.api &&
          (window.api as any).renameFile
        ) {
          await (window.api as any).renameFile({
            oldPath,
            newPath,
          });
        }

        if (type === "java") {
          setJavaFiles((prev) =>
            prev.map((f) =>
              f.path === oldPath
                ? {
                    name: newFileName,
                    path: newPath,
                  }
                : f
            )
          );
        } else {
          setClientJavaFiles((prev) =>
            prev.map((f) =>
              f.path === oldPath
                ? {
                    name: newFileName,
                    path: newPath,
                  }
                : f
            )
          );
        }

        if (currentFilePath === oldPath) {
          onSelectFile(newPath);
        }
      }
    } catch (e) {
      console.error("Rename error:", e);
      alert("Failed to rename file");
    }

    setRenamingPath(null);
    setRenameValue("");
  };

  const handleDuplicateFile = async (
    filePath: string,
    fileName: string,
    type: FileType
  ) => {
    if (type === "lang") {
      return;
    }

    const dotIndex =
      fileName.lastIndexOf(".");

    const baseName =
      dotIndex !== -1
        ? fileName.substring(0, dotIndex)
        : fileName;

    const ext =
      dotIndex !== -1
        ? fileName.substring(dotIndex)
        : "";

    let targetFiles: FileItem[] = [];

    if (type === "java") {
      targetFiles = javaFiles;
    } else if (type === "client") {
      targetFiles = clientJavaFiles;
    } else {
      targetFiles = validConfigFiles;
    }

    let counter = 1;

    let newFileName =
      `${baseName} (${counter})${ext}`;

    while (
      targetFiles.some(
        (file) => file.name === newFileName
      )
    ) {
      counter++;

      newFileName =
        `${baseName} (${counter})${ext}`;
    }

    let baseDir = projectPath;

    if (type === "java") {
      baseDir = mainJavaDir;
    }

    if (type === "client") {
      baseDir = clientJavaDir;
    }

    const newPath =
      `${baseDir}${separator}${newFileName}`;

    try {
      let content = "";

      if (
        window.api &&
        (window.api as any).loadFile
      ) {
        const result =
          await (window.api as any).loadFile(
            filePath
          );

        if (result?.success) {
          content = result.content;
        }
      }

      if (
        window.api &&
        (window.api as any).saveFile
      ) {
        await (window.api as any).saveFile({
          filePath: newPath,
          content,
        });
      }

      const newFile = {
        name: newFileName,
        path: newPath,
      };

      if (type === "java") {
        setJavaFiles((prev) => [
          ...prev,
          newFile,
        ]);
      }

      if (type === "client") {
        setClientJavaFiles((prev) => [
          ...prev,
          newFile,
        ]);
      }

      if (type === "config") {
        setValidConfigFiles((prev) => [
          ...prev,
          newFile,
        ]);
      }

      onSelectFile(newPath);
    } catch (e) {
      console.error("Duplicate error:", e);
      alert("Failed to duplicate file");
    }

    setContextMenu(null);
  };

  const handleDeleteFile = async (
    filePath: string,
    fileName: string
  ) => {
    if (
      !confirm(
        `Delete file "${fileName}"?`
      )
    ) {
      return;
    }

    try {
      if (
        window.api &&
        (window.api as any).deleteFile
      ) {
        const result =
          await (window.api as any).deleteFile(
            filePath
          );

        if (
          result &&
          result.success === false
        ) {
          alert(
            `Failed to delete file: ${
              result.message || ""
            }`
          );

          return;
        }
      }

      setJavaFiles((prev) =>
        prev.filter(
          (file) => file.path !== filePath
        )
      );

      setClientJavaFiles((prev) =>
        prev.filter(
          (file) => file.path !== filePath
        )
      );

      setLangFiles((prev) =>
        prev.filter(
          (file) => file.path !== filePath
        )
      );

      setValidConfigFiles((prev) =>
        prev.filter(
          (file) => file.path !== filePath
        )
      );

      if (currentFilePath === filePath) {
        onSelectFile("");
      }
    } catch (e) {
      console.error("Delete error:", e);
      alert(
        "An error occurred while deleting the file"
      );
    }

    setContextMenu(null);
  };

  const handleOpenLangModal = () => {
    setSelectedLangs([]);
    setLangSearch("");
    setShowLangModal(true);
  };

  const handleConfirmLangs = async () => {
    if (selectedLangs.length === 0) {
      return;
    }

    const updatedLangFiles = [
      ...langFiles,
    ];

    for (const code of selectedLangs) {
      const fileName =
        `${code}.json`;

      const targetPath =
        `${langDir}${separator}${fileName}`;

      if (
        updatedLangFiles.some(
          (file) => file.name === fileName
        )
      ) {
        continue;
      }

      const initialContent =
`{
  "item.${projectName.toLowerCase()}.example_item": "Example Item"
}
`;

      try {
        if (
          window.api &&
          (window.api as any).saveFile
        ) {
          await (window.api as any).saveFile({
            filePath: targetPath,
            content: initialContent,
          });
        }

        updatedLangFiles.push({
          name: fileName,
          path: targetPath,
        });
      } catch (e) {
        console.error(
          "Error creating language file:",
          e
        );
      }
    }

    setLangFiles(updatedLangFiles);
    setShowLangModal(false);
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    filePath: string,
    fileName: string,
    type: FileType
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      filePath,
      fileName,
      type,
    });
  };

  const addedCodes =
    langFiles.map((file) =>
      file.name.replace(".json", "")
    );

  const filteredLangs =
    PRESET_LANGUAGES.filter(
      (lang) =>
        lang.name
          .toLowerCase()
          .includes(
            langSearch.toLowerCase()
          ) ||
        lang.code
          .toLowerCase()
          .includes(
            langSearch.toLowerCase()
          )
    );

  const renderJavaFiles = (
    files: FileItem[],
    type: "java" | "client"
  ) =>
    files.map((file) => {
      if (
        renamingPath === file.path
      ) {
        return (
          <li
            key={file.path}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 6px",
              borderRadius: "4px",
              background: "#1e1e1e",
              border:
                "1px solid #00AF5C",
              marginTop: "2px",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: "16px",
                color: "#9cdcfe",
              }}
            >
              code
            </span>

            <input
              autoFocus
              type="text"
              value={renameValue}
              onChange={(e) =>
                setRenameValue(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleConfirmRename(
                    file.path,
                    type
                  );
                }

                if (e.key === "Escape") {
                  setRenamingPath(null);
                }
              }}
              onBlur={() =>
                handleConfirmRename(
                  file.path,
                  type
                )
              }
              style={{
                flex: 1,
                background:
                  "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontSize: "12px",
                width: "100%",
              }}
            />
          </li>
        );
      }

      return (
        <TreeItem
          key={file.path}
          icon="code"
          color="#9cdcfe"
          label={file.name}
          isSelected={
            currentFilePath ===
            file.path
          }
          onClick={() =>
            onSelectFile(
              file.path
            )
          }
          onContextMenu={(e) =>
            handleContextMenu(
              e,
              file.path,
              file.name,
              type
            )
          }
        />
      );
    });

  return (
    <div
      style={{
        padding: "8px",
        fontSize: "13px",
        color: "#ccc",
        userSelect: "none",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <button
        onClick={onBack}
        style={{
          width: "100%",
          background: "transparent",
          color: "#aaa",
          border: "1px solid #333",
          padding: "6px 10px",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "12px",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: "16px",
          }}
        >
          arrow_back
        </span>

        Back to Projects
      </button>

      <div
        style={{
          fontSize: "11px",
          fontWeight: "700",
          color: "#777",
          letterSpacing: "0.5px",
          marginBottom: "12px",
          paddingLeft: "4px",
        }}
      >
        EXPLORER
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <TreeSection
          title="Java"
          onAdd={() =>
            setIsAddingJava(true)
          }
        >
          {renderJavaFiles(
            javaFiles,
            "java"
          )}

          {isAddingJava && (
            <li
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "3px 6px",
                borderRadius: "4px",
                background: "#1e1e1e",
                border:
                  "1px solid #00AF5C",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: "16px",
                  color: "#9cdcfe",
                }}
              >
                code
              </span>

              <input
                ref={javaInputRef}
                type="text"
                value={newJavaName}
                onChange={(e) =>
                  setNewJavaName(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleConfirmJava();
                  }

                  if (e.key === "Escape") {
                    setIsAddingJava(false);
                    setNewJavaName("");
                  }
                }}
                onBlur={
                  handleConfirmJava
                }
                style={{
                  flex: 1,
                  background:
                    "transparent",
                  border: "none",
                  outline: "none",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </li>
          )}
        </TreeSection>

        <TreeSection
          title="Client Java"
          onAdd={() =>
            setIsAddingClient(true)
          }
        >
          {renderJavaFiles(
            clientJavaFiles,
            "client"
          )}

          {isAddingClient && (
            <li
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "3px 6px",
                borderRadius: "4px",
                background: "#1e1e1e",
                border:
                  "1px solid #00AF5C",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: "16px",
                  color: "#9cdcfe",
                }}
              >
                code
              </span>

              <input
                ref={clientInputRef}
                type="text"
                value={newClientJavaName}
                onChange={(e) =>
                  setNewClientJavaName(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleConfirmClientJava();
                  }

                  if (e.key === "Escape") {
                    setIsAddingClient(false);
                    setNewClientJavaName("");
                  }
                }}
                onBlur={
                  handleConfirmClientJava
                }
                style={{
                  flex: 1,
                  background:
                    "transparent",
                  border: "none",
                  outline: "none",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </li>
          )}
        </TreeSection>

        <TreeSection title="Settings">
          {validConfigFiles.map(
            (file) => (
              <TreeItem
                key={file.path}
                icon="settings"
                color="#ce9178"
                label={file.name}
                isSelected={
                  currentFilePath ===
                  file.path
                }
                onClick={() =>
                  onSelectFile(
                    file.path
                  )
                }
                onContextMenu={(e) =>
                  handleContextMenu(
                    e,
                    file.path,
                    file.name,
                    "config"
                  )
                }
              />
            )
          )}
        </TreeSection>

        <TreeSection
          title="Lang"
          onAdd={
            handleOpenLangModal
          }
        >
          {langFiles.length === 0 ? (
            <div
              style={{
                padding: "4px 8px",
                color: "#666",
                fontSize: "12px",
                fontStyle: "italic",
              }}
            >
              (No file)
            </div>
          ) : (
            langFiles.map((file) => (
              <TreeItem
                key={file.path}
                icon="language"
                color="#b5cea8"
                label={file.name}
                isSelected={
                  currentFilePath ===
                  file.path
                }
                onClick={() =>
                  onSelectFile(
                    file.path
                  )
                }
                onContextMenu={(e) =>
                  handleContextMenu(
                    e,
                    file.path,
                    file.name,
                    "lang"
                  )
                }
              />
            ))
          )}
        </TreeSection>

        <TreeSection title="Assets">
          <div
            style={{
              padding: "4px 8px",
              color: "#666",
              fontSize: "12px",
              fontStyle: "italic",
            }}
          >
            (Not configured)
          </div>
        </TreeSection>

        <TreeSection title="Data">
          <div
            style={{
              padding: "4px 8px",
              color: "#666",
              fontSize: "12px",
              fontStyle: "italic",
            }}
          >
            (Not configured)
          </div>
        </TreeSection>
      </div>

      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "#252526",
            border:
              "1px solid #3c3c3c",
            borderRadius: "6px",
            boxShadow:
              "0 4px 12px rgba(0,0,0,0.5)",
            zIndex: 10000,
            padding: "4px 0",
            minWidth: "160px",
          }}
          onClick={(e) =>
            e.stopPropagation()
          }
        >
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                contextMenu.filePath
              );

              setContextMenu(null);
            }}
            style={contextButtonStyle}
          >
            Copy path
          </button>

          <button
            disabled={
              contextMenu.type ===
              "lang"
            }
            onClick={() =>
              handleDuplicateFile(
                contextMenu.filePath,
                contextMenu.fileName,
                contextMenu.type
              )
            }
            style={{
              ...contextButtonStyle,
              color:
                contextMenu.type ===
                "lang"
                  ? "#555"
                  : "#ccc",
              cursor:
                contextMenu.type ===
                "lang"
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            Duplicate
          </button>

          {(contextMenu.type ===
            "java" ||
            contextMenu.type ===
              "client") && (
            <button
              onClick={() => {
                const rawName =
                  contextMenu.fileName.replace(
                    /\.java$/,
                    ""
                  );

                setRenamingPath(
                  contextMenu.filePath
                );

                setRenameValue(
                  rawName
                );

                setContextMenu(null);
              }}
              style={
                contextButtonStyle
              }
            >
              Rename
            </button>
          )}

          <button
            onClick={() =>
              handleDeleteFile(
                contextMenu.filePath,
                contextMenu.fileName
              )
            }
            style={{
              ...contextButtonStyle,
              color: "#ff5555",
            }}
          >
            Delete
          </button>
        </div>
      )}

      {showLangModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "480px",
              maxHeight: "85vh",
              background: "#252526",
              border:
                "1px solid #3c3c3c",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px 24px",
                borderBottom:
                  "1px solid #333",
                fontWeight: "700",
                fontSize: "18px",
                color: "#fff",
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span>
                Add language
              </span>

              <button
                onClick={() =>
                  setShowLangModal(false)
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "#888",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding: "14px 24px",
                borderBottom:
                  "1px solid #333",
              }}
            >
              <input
                type="text"
                placeholder="Search languages..."
                value={langSearch}
                onChange={(e) =>
                  setLangSearch(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  boxSizing:
                    "border-box",
                  background: "#2a2a2a",
                  border:
                    "1px solid #444",
                  outline: "none",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: "8px",
                }}
              />
            </div>

            <div
              style={{
                flex: 1,
                maxHeight: "360px",
                overflowY: "auto",
                padding: "12px 18px",
              }}
            >
              {filteredLangs.map(
                (lang) => {
                  const isAlreadyAdded =
                    addedCodes.includes(
                      lang.code
                    );

                  const isChecked =
                    selectedLangs.includes(
                      lang.code
                    );

                  return (
                    <label
                      key={lang.code}
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "space-between",
                        padding:
                          "10px 14px",
                        cursor:
                          isAlreadyAdded
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          isAlreadyAdded
                            ? 0.5
                            : 1,
                      }}
                    >
                      <div>
                        <input
                          type="checkbox"
                          disabled={
                            isAlreadyAdded
                          }
                          checked={
                            isChecked ||
                            isAlreadyAdded
                          }
                          onChange={() => {
                            if (
                              isAlreadyAdded
                            ) {
                              return;
                            }

                            setSelectedLangs(
                              (prev) =>
                                isChecked
                                  ? prev.filter(
                                      (code) =>
                                        code !==
                                        lang.code
                                    )
                                  : [
                                      ...prev,
                                      lang.code,
                                    ]
                            );
                          }}
                        />

                        {" "}

                        {lang.name}

                        {isAlreadyAdded &&
                          " (Already added)"}
                      </div>

                      <span
                        style={{
                          color: "#888",
                          fontFamily:
                            "monospace",
                        }}
                      >
                        {lang.code}
                      </span>
                    </label>
                  );
                }
              )}
            </div>

            <div
              style={{
                padding: "16px 24px",
                borderTop:
                  "1px solid #333",
                display: "flex",
                justifyContent:
                  "flex-end",
                gap: "12px",
              }}
            >
              <button
                onClick={() =>
                  setShowLangModal(false)
                }
              >
                Cancel
              </button>

              <button
                disabled={
                  selectedLangs.length ===
                  0
                }
                onClick={
                  handleConfirmLangs
                }
              >
                Apply and save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const contextButtonStyle = {
  width: "100%",
  padding: "6px 12px",
  background: "transparent",
  border: "none",
  color: "#ccc",
  textAlign: "left" as const,
  fontSize: "13px",
  cursor: "pointer",
};

function TreeSection({
  title,
  children,
  onAdd,
}: {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
}) {
  return (
    <div
      style={{
        marginBottom: "16px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          color: "#aaa",
          fontSize: "12px",
          fontWeight: "600",
          marginBottom: "4px",
          padding: "0 4px",
        }}
      >
        <span>
          ▼ {title}
        </span>

        {onAdd && (
          <button
            onClick={onAdd}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            +
          </button>
        )}
      </div>

      <ul
        style={{
          listStyle: "none",
          paddingLeft: "8px",
          margin: 0,
        }}
      >
        {children}
      </ul>
    </div>
  );
}

function TreeItem({
  icon,
  color,
  label,
  isSelected,
  onClick,
  onContextMenu,
}: {
  icon: string;
  color: string;
  label: string;
  isSelected?: boolean;
  onClick?: () => void;
  onContextMenu?: (
    e: React.MouseEvent
  ) => void;
}) {
  return (
    <li
      onClick={onClick}
      onContextMenu={
        onContextMenu
      }
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 6px",
        borderRadius: "4px",
        cursor: "pointer",
        background: isSelected
          ? "#043927"
          : "transparent",
        color: isSelected
          ? "#fff"
          : "#ccc",
        fontSize: "12px",
        marginTop: "1px",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background =
            "#2a2a2a";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background =
            "transparent";
        }
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: "16px",
          color,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>

      <span
        style={{
          overflow: "hidden",
          textOverflow:
            "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </li>
  );
}
