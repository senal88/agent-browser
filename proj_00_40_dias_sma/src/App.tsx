import { useMemo } from 'react';
import { GoogleDriveHub } from './components/GoogleDriveHub';
import { buildNotebookLmDriveArtifacts } from './data/notebooklm-artifacts';
import './App.css';

function App() {
  const artifacts = useMemo(() => buildNotebookLmDriveArtifacts(), []);

  return (
    <main className="app">
      <header className="app-header">
        <h1>40 Dias SMA — Santo Rosário 2026</h1>
        <p>
          NotebookLM — Dias 1 ao 10. Exporte os artefatos gerados (Markdown e JSON) para o Google
          Drive.
        </p>
      </header>

      <GoogleDriveHub artifacts={artifacts} />
    </main>
  );
}

export default App;
