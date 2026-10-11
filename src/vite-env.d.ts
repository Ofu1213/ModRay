export interface CodexModel {
  id: string;
  model: string;
  displayName: string;
  hidden?: boolean;
  isDefault?: boolean;
}

export interface CodexFileChangeRequest {
  requestId: number;
  threadId: string;
  turnId: string;
  itemId: string;
  reason?: string;
  grantRoot?: string;
}

declare global {
  interface Window {
    api: {
      // =========================
      // Mod開発用
      // =========================

      createProject(data: {
        projectName: string;
        groupId: string;
        modId: string;
        mcVersion: string;
        loader: string;
      }): Promise<{
        success: boolean;
        message?: string;
        path?: string;
      }>;

      installJava(version: string): Promise<any>;

      // =========================
      // Codex
      // =========================

      startCodex(): Promise<any>;

      loginCodex(): Promise<any>;

      sendCodex(message: {
        message: string;
        cwd?: string;
        model?: string;
      }): Promise<{
        success: boolean;
        message?: string;
        fileChange?: any;
      }>;

      stopCodex(): Promise<{
        success: boolean;
        message?: string;
      }>;

      // =========================
      // Codex Account
      // =========================

      getCodexAccount(): Promise<any>;

      // =========================
      // Codex Models
      // =========================

      getCodexModels(): Promise<{
        success: boolean;
        models?: CodexModel[];
        message?: string;
      }>;

      // =========================
      // Codex Events
      // =========================

      onCodexMessage(callback: (message: any) => void): () => void;

      onCodexStatus(callback: (status: any) => void): () => void;

      onCodexFileChangeRequest(
        callback: (request: CodexFileChangeRequest) => void,
      ): () => void;

      // =========================
      // Codex File Change Approval
      // =========================

      approveCodexFileChange(
        requestId: number,
        decision: "accept" | "acceptForSession" | "decline" | "cancel",
      ): Promise<{
        success: boolean;
        message?: string;
      }>;
    };
  }
}

export {};
