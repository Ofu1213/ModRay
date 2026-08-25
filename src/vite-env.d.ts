interface Window {
  electron: {
    createProject(name: string): Promise<boolean>;
  };
}