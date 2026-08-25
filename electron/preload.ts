// electron/preload.ts (preload implementation)
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  createProject: (data: any) => ipcRenderer.invoke('create-project', data),
  getProjects: () => ipcRenderer.invoke('get-projects'),
  loadFile: (filePath: string) => ipcRenderer.invoke('load-file', filePath),
  saveFile: (data: any) => ipcRenderer.invoke('save-file', data),
  
  // File existence check
  checkFileExists: (filePath: string) => ipcRenderer.invoke('check-file-exists', filePath),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  runCommand: (payload: { command: string; projectPath: string }) =>
    ipcRenderer.send('run-command', payload),
  onCommandOutput: (callback: (output: string) => void) => {
    // Remove existing listeners before registering to prevent duplicates
    ipcRenderer.removeAllListeners('command-output');
    ipcRenderer.on('command-output', (_event, value) => callback(value));
  },
  createTerminal: (payload: { terminalId: string; shellType: 'powershell' | 'cmd'; projectPath: string }) =>
    ipcRenderer.send('create-terminal', payload),
  sendTerminalCommand: (payload: { terminalId: string; command: string }) =>
    ipcRenderer.send('send-terminal-command', payload),
  closeTerminal: (payload: { terminalId: string }) =>
    ipcRenderer.send('close-terminal', payload),
  onTerminalOutput: (callback: (data: { terminalId: string; data: string }) => void) => {
    ipcRenderer.removeAllListeners('terminal-output');
    ipcRenderer.on('terminal-output', (_event, value) => callback(value));
  },
  runBuild: (projectPath: string) => ipcRenderer.invoke("run-build", projectPath),
  
  // Build log listener
  onBuildLog: (callback: (log: string) => void) => {
    const subscription = (_: any, log: string) => callback(log);
    ipcRenderer.on("on-build-log", subscription);
    return () => {
      ipcRenderer.removeListener("on-build-log", subscription);
    };
  },
  deleteFile: (filePath: string) => ipcRenderer.invoke('delete-file', filePath),
  getFiles: (dirPath: string) => ipcRenderer.invoke('get-files', dirPath),
  renameFile: (data: { oldPath: string; newPath: string }) => ipcRenderer.invoke('rename-file', data),
    scanJava: () => ipcRenderer.invoke('scan-java'),

  installJava: (version: string) =>
    ipcRenderer.invoke('install-java', version),

  downloadJava: (version: string) =>
    ipcRenderer.invoke('download-java', version),

  onJavaInstallLog: (callback: (log: string) => void) => {
    const subscription = (_: any, log: string) => callback(log);

    ipcRenderer.on('java-install-log', subscription);

    return () => {
      ipcRenderer.removeListener(
        'java-install-log',
        subscription
      );
    };
  },

  downloadFabricTemplate: (
  data: {
    mcVersion: string;
    destination: string;
  }
) =>
  ipcRenderer.invoke(
    "download-fabric-template",
    data
  ),

onFabricTemplateLog: (
  callback: (message: string) => void
) => {
  ipcRenderer.on(
    "fabric-template-log",
    (_event, message) => {
      callback(message);
    }
  );
},
});