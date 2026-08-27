export interface DriveFileArtifact {
  id?: string;
  name: string;
  content: string | Blob;
  mimeType: string;
  description?: string;
  status?: 'idle' | 'uploading' | 'success' | 'error';
  driveViewUrl?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
}

export interface GoogleUserSession {
  accessToken: string;
  expiresAt: number;
}
