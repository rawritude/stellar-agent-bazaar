import { Component, type ReactNode } from "react";
import { TerminalShell } from "@/components/terminal/TerminalShell";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error("[CRASH]", error);
    console.error("[CRASH STACK]", info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: "#131110",
          color: "#e25555",
          fontFamily: "monospace",
          padding: "40px",
          minHeight: "100vh",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          <h2 style={{ color: "#d4a843" }}>The Bazaar Has Crashed</h2>
          <p style={{ color: "#e0ddd5" }}>Hakim is investigating. Here's what went wrong:</p>
          <pre style={{ color: "#e25555", marginTop: "20px" }}>
            {this.state.error.message}
          </pre>
          <pre style={{ color: "#706858", marginTop: "10px", fontSize: "12px" }}>
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "#d4a843",
              color: "#131110",
              border: "none",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: "14px",
            }}
          >
            Restart the Bazaar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function TerminalPage() {
  return (
    <ErrorBoundary>
      <TerminalShell />
    </ErrorBoundary>
  );
}
