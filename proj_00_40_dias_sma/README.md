# proj_00_40_dias_sma

App Vite + React para exportação de artefatos do NotebookLM (Santo Rosário 2026, Dias 1–10) para o Google Drive.

## Configuração

1. Copie `.env.example` para `.env.local` e preencha as credenciais do [Google Cloud Console](https://console.cloud.google.com/):

   - OAuth 2.0 Client ID (tipo Web application)
   - Origem autorizada: `http://localhost:5173`

2. Instale dependências (isolado do monorepo pai):

```bash
pnpm install --ignore-workspace
```

3. Inicie o servidor de desenvolvimento:

```bash
pnpm dev
```

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `VITE_GOOGLE_CLIENT_ID` | Client ID OAuth 2.0 do Google |
| `VITE_GOOGLE_API_KEY` | API key opcional |
| `VITE_GOOGLE_DRIVE_SCOPES` | Escopo OAuth (padrão: `drive.file`) |
| `VITE_DEFAULT_FOLDER_NAME` | Pasta padrão no Drive (`40_Dias_SMA_Artefatos`) |

## Google Drive Hub

O componente `GoogleDriveHub` permite:

- Autenticação via Google Identity Services (GIS)
- Seleção ou criação de pasta de destino
- Upload individual ou em lote de artefatos Markdown/JSON

## Referências

- Repositório: [senal88/proj_00_40_dias_sma](https://github.com/senal88/proj_00_40_dias_sma)
- Fonte: NotebookLM — Santo Rosário 2026 (Dias 1 ao 10)
