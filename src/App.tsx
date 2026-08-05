import Toolbar from "./components/Toolbar";
import Editor from "./components/Editor";

function App() {
  return (
    <>
    <Toolbar />
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      {/* サイドバー */}
      <div
        style={{
          width: "250px",
          background: "#202225",
          color: "white",
          padding: "10px",
        }}
      >
        <h2>📦 ModRay</h2>

        <hr />

        <p>📁 Main.java</p>
        <p>📁 Items.java</p>
        <p>📁 Blocks.java</p>
        <p>📁 Assets</p>
      </div>

      {/* エディタ */}
      <div
        style={{
          flex: 1,
          background: "#2b2d31",
          color: "white",
          padding: "20px",
        }}
      >
        <h1>Main.java</h1>

        <Editor />{`public class Main {

}`}
      </div>
    </div>
    </>
  );
}

export default App;
