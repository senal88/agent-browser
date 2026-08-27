import React, { useState, useEffect, useCallback } from 'react';
import { googleDriveService } from '../services/googleDriveService';
import type { DriveFileArtifact, DriveFolder } from '../types/drive';

interface GoogleDriveHubProps {
  artifacts: DriveFileArtifact[];
  clientId?: string;
  defaultFolderName?: string;
}

function waitForGoogleIdentityServices(timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const started = Date.now();
    const interval = window.setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        window.clearInterval(interval);
        resolve();
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(interval);
        reject(new Error('Google Identity Services não carregou a tempo.'));
      }
    }, 100);
  });
}

export const GoogleDriveHub: React.FC<GoogleDriveHubProps> = ({
  artifacts: initialArtifacts,
  clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  defaultFolderName = import.meta.env.VITE_DEFAULT_FOLDER_NAME || '40_Dias_SMA_Artefatos',
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [targetFolder, setTargetFolder] = useState<DriveFolder | null>(null);
  const [folderNameInput, setFolderNameInput] = useState<string>(defaultFolderName);
  const [artifacts, setArtifacts] = useState<DriveFileArtifact[]>(initialArtifacts);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [gisReady, setGisReady] = useState<boolean>(false);

  useEffect(() => {
    setArtifacts(initialArtifacts);
  }, [initialArtifacts]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await waitForGoogleIdentityServices();
        if (cancelled) return;
        setGisReady(true);

        const restored = googleDriveService.restoreSession();
        if (restored) {
          setIsAuthenticated(true);
          setStatusMessage('Sessão Google Drive restaurada.');
        }

        if (clientId) {
          googleDriveService.initTokenClient(clientId, () => {
            if (cancelled) return;
            setIsAuthenticated(true);
            setStatusMessage('Conexão com Google Drive estabelecida.');
          });
        } else {
          setStatusMessage('Configure VITE_GOOGLE_CLIENT_ID no .env.local');
        }
      } catch (err) {
        if (!cancelled) {
          setStatusMessage(err instanceof Error ? err.message : 'Erro ao carregar GIS.');
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const handleConnect = () => {
    try {
      googleDriveService.requestToken('consent');
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Erro ao iniciar autenticação.');
    }
  };

  const handleSelectOrCreateFolder = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage(`Localizando ou criando pasta "${folderNameInput}"...`);
      const folder = await googleDriveService.findOrCreateFolder(folderNameInput);
      setTargetFolder(folder);
      setStatusMessage(`Pasta pronta: ${folder.name} (ID: ${folder.id})`);
    } catch (err) {
      setStatusMessage(`Erro na pasta: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveArtifact = useCallback(
    async (index: number) => {
      if (!targetFolder) {
        setStatusMessage('Defina uma pasta de destino antes de salvar.');
        return;
      }

      const updated = [...artifacts];
      updated[index] = { ...updated[index], status: 'uploading' };
      setArtifacts(updated);

      try {
        const viewUrl = await googleDriveService.uploadArtifact(updated[index], targetFolder.id);
        updated[index] = { ...updated[index], status: 'success', driveViewUrl: viewUrl };
        setArtifacts([...updated]);
        setStatusMessage(`"${updated[index].name}" salvo com sucesso.`);
      } catch (err) {
        updated[index] = { ...updated[index], status: 'error' };
        setArtifacts([...updated]);
        setStatusMessage(
          `Erro ao salvar "${updated[index].name}": ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
        );
      }
    },
    [artifacts, targetFolder],
  );

  const handleSaveAll = async () => {
    if (!targetFolder) {
      setStatusMessage('Defina uma pasta de destino primeiro.');
      return;
    }

    setIsProcessing(true);
    for (let i = 0; i < artifacts.length; i++) {
      if (artifacts[i].status !== 'success') {
        await handleSaveArtifact(i);
      }
    }
    setIsProcessing(false);
    setStatusMessage('Todos os artefatos foram processados.');
  };

  return (
    <div
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        maxWidth: '800px',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ margin: 0 }}>Google Drive Hub — Sincronização de Artefatos</h3>
        <div>
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={handleConnect}
              disabled={!gisReady || !clientId}
              style={{
                background: '#4285F4',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: gisReady && clientId ? 'pointer' : 'not-allowed',
                opacity: gisReady && clientId ? 1 : 0.6,
              }}
            >
              Conectar Google Drive
            </button>
          ) : (
            <span style={{ color: '#0F9D58', fontWeight: 'bold' }}>✓ Conectado</span>
          )}
        </div>
      </header>

      {isAuthenticated && (
        <section
          style={{
            background: '#f8f9fa',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
          }}
        >
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
            Pasta de Destino no Drive:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={folderNameInput}
              onChange={(e) => setFolderNameInput(e.target.value)}
              placeholder="Nome da pasta"
              style={{ flex: 1, padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button
              type="button"
              onClick={handleSelectOrCreateFolder}
              disabled={isProcessing}
              style={{
                background: '#5f6368',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {targetFolder?.name === folderNameInput ? 'Pasta Ativa' : 'Definir Pasta'}
            </button>
          </div>
          {targetFolder && (
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#5f6368' }}>
              Destino ativo: <strong>{targetFolder.name}</strong> (<code>{targetFolder.id}</code>)
            </p>
          )}
        </section>
      )}

      {statusMessage && (
        <div
          style={{
            fontSize: '13px',
            padding: '8px 12px',
            borderRadius: '4px',
            marginBottom: '16px',
            background: '#e8f0fe',
            color: '#1a73e8',
          }}
        >
          {statusMessage}
        </div>
      )}

      <section>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <h4 style={{ margin: 0 }}>Artefatos para Exportação ({artifacts.length})</h4>
          {isAuthenticated && targetFolder && artifacts.length > 0 && (
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isProcessing}
              style={{
                background: '#0F9D58',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Salvar Todos no Drive
            </button>
          )}
        </div>

        {artifacts.length === 0 ? (
          <p style={{ color: '#70757a', fontSize: '14px' }}>
            Nenhum artefato disponível para sincronização.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {artifacts.map((art, idx) => (
              <li
                key={art.id ?? `${art.name}-${idx}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  borderBottom: '1px solid #eee',
                }}
              >
                <div>
                  <strong>{art.name}</strong>
                  <span style={{ fontSize: '12px', color: '#70757a', marginLeft: '8px' }}>
                    ({art.mimeType})
                  </span>
                  {art.driveViewUrl && (
                    <div style={{ marginTop: '4px' }}>
                      <a
                        href={art.driveViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '12px', color: '#1a73e8' }}
                      >
                        Visualizar no Google Drive ↗
                      </a>
                    </div>
                  )}
                </div>
                <div>
                  {art.status === 'uploading' && (
                    <span style={{ fontSize: '13px', color: '#f2994a' }}>Enviando...</span>
                  )}
                  {art.status === 'success' && (
                    <span style={{ fontSize: '13px', color: '#0F9D58' }}>✓ Salvo</span>
                  )}
                  {art.status === 'error' && (
                    <span style={{ fontSize: '13px', color: '#d93025' }}>Erro</span>
                  )}
                  {(!art.status || art.status === 'idle' || art.status === 'error') &&
                    isAuthenticated && (
                      <button
                        type="button"
                        onClick={() => void handleSaveArtifact(idx)}
                        disabled={isProcessing || !targetFolder}
                        style={{
                          background: '#f1f3f4',
                          border: '1px solid #dadce0',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Salvar
                      </button>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
