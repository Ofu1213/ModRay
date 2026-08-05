import MonacoEditor from "@monaco-editor/react";

export default function Editor() {
  return (
    <MonacoEditor
      height="100%"
      defaultLanguage="java"
      defaultValue={`public class Main {

}`}
      theme="vs-dark"
    />
  );
}