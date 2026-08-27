import type { DriveFileArtifact, DriveFolder, GoogleUserSession } from '../types/drive';

const SESSION_STORAGE_KEY = 'gdrive_user_session';

interface TokenClient {
  requestAccessToken(options?: { prompt?: string }): void;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
          }): TokenClient;
        };
      };
    };
  }
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

class GoogleDriveService {
  private tokenClient: TokenClient | null = null;
  private accessToken: string | null = null;
  private expiresAt: number | null = null;
  private scope =
    import.meta.env.VITE_GOOGLE_DRIVE_SCOPES ||
    'https://www.googleapis.com/auth/drive.file';

  private persistSession(session: GoogleUserSession): void {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.accessToken = session.accessToken;
    this.expiresAt = session.expiresAt;
  }

  public restoreSession(): GoogleUserSession | null {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    try {
      const session = JSON.parse(raw) as GoogleUserSession;
      if (!session.accessToken || !session.expiresAt) return null;
      if (Date.now() >= session.expiresAt) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }
      this.accessToken = session.accessToken;
      this.expiresAt = session.expiresAt;
      return session;
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }

  public clearSession(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.accessToken = null;
    this.expiresAt = null;
  }

  public isTokenValid(): boolean {
    return Boolean(this.accessToken && this.expiresAt && Date.now() < this.expiresAt);
  }

  public initTokenClient(clientId: string, callback: (token: string) => void): void {
    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
      throw new Error('Google Identity Services ainda não carregou.');
    }

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: this.scope,
      callback: (response: TokenResponse) => {
        if (response.error) {
          throw new Error(`Erro de autenticação: ${response.error}`);
        }
        if (!response.access_token) {
          throw new Error('Token de acesso não recebido.');
        }

        const expiresIn = response.expires_in ?? 3600;
        const session: GoogleUserSession = {
          accessToken: response.access_token,
          expiresAt: Date.now() + expiresIn * 1000 - 60_000,
        };
        this.persistSession(session);
        callback(response.access_token);
      },
    });
  }

  public requestToken(prompt: 'none' | 'consent' = 'consent'): void {
    if (!this.tokenClient) {
      throw new Error('Google Token Client não inicializado.');
    }
    this.tokenClient.requestAccessToken({ prompt });
  }

  public setAccessToken(token: string, expiresAt?: number): void {
    this.accessToken = token;
    this.expiresAt = expiresAt ?? Date.now() + 3_600_000;
    this.persistSession({ accessToken: token, expiresAt: this.expiresAt });
  }

  public getAccessToken(): string | null {
    if (!this.isTokenValid()) {
      this.clearSession();
      return null;
    }
    return this.accessToken;
  }

  private async driveFetch(url: string, init?: RequestInit): Promise<Response> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Usuário não autenticado no Google Drive.');

    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Drive API error (${response.status}): ${errorText}`);
    }

    return response;
  }

  public async findOrCreateFolder(folderName: string, parentId?: string): Promise<DriveFolder> {
    const escapedName = escapeDriveQueryValue(folderName);
    let query = `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
    const searchRes = await this.driveFetch(searchUrl);
    const searchData = (await searchRes.json()) as { files?: DriveFolder[] };

    if (searchData.files && searchData.files.length > 0) {
      return { id: searchData.files[0].id, name: searchData.files[0].name };
    }

    const metadata: Record<string, unknown> = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) metadata.parents = [parentId];

    const createRes = await this.driveFetch(
      'https://www.googleapis.com/drive/v3/files?fields=id,name',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      },
    );

    const createData = (await createRes.json()) as DriveFolder;
    return { id: createData.id, name: createData.name };
  }

  private async buildMultipartBody(
    metadata: Record<string, unknown>,
    mimeType: string,
    content: string | Blob,
  ): Promise<{ body: Blob; boundary: string }> {
    const boundary = `-------${crypto.randomUUID().replace(/-/g, '')}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = new TextEncoder().encode(
      `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`,
    );

    let contentBytes: Uint8Array;
    if (typeof content === 'string') {
      contentBytes = new TextEncoder().encode(content);
    } else {
      contentBytes = new Uint8Array(await content.arrayBuffer());
    }

    const contentHeader = new TextEncoder().encode(
      `${delimiter}Content-Type: ${mimeType}\r\n\r\n`,
    );

    const closeBytes = new TextEncoder().encode(closeDelimiter);
    const combined = new Uint8Array(
      metadataPart.length + contentHeader.length + contentBytes.length + closeBytes.length,
    );
    let offset = 0;
    combined.set(metadataPart, offset);
    offset += metadataPart.length;
    combined.set(contentHeader, offset);
    offset += contentHeader.length;
    combined.set(contentBytes, offset);
    offset += contentBytes.length;
    combined.set(closeBytes, offset);

    const body = new Blob([combined], {
      type: `multipart/related; boundary=${boundary}`,
    });

    return { body, boundary };
  }

  public async uploadArtifact(artifact: DriveFileArtifact, folderId: string): Promise<string> {
    const metadata = {
      name: artifact.name,
      mimeType: artifact.mimeType,
      parents: [folderId],
      description: artifact.description || 'Artefato gerado via proj_00_40_dias_sma',
    };

    const { body, boundary } = await this.buildMultipartBody(
      metadata,
      artifact.mimeType,
      artifact.content,
    );

    const token = this.getAccessToken();
    if (!token) throw new Error('Usuário não autenticado.');

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Falha no upload para o Drive: ${errorText}`);
    }

    const data = (await response.json()) as { id: string; webViewLink?: string };
    return data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`;
  }
}

export const googleDriveService = new GoogleDriveService();
