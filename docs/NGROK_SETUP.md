# Savora single-domain ngrok setup

Savora uses one HTTPS tunnel for the Vite frontend. Vite proxies backend
traffic privately to NestJS:

- Frontend and public origin: `http://localhost:5173`
- Backend: `http://localhost:3000`
- REST proxy: `/api` -> `http://localhost:3000`
- Socket.IO proxy: `/socket.io` -> `http://localhost:3000`

MongoDB remains private and is used only by the backend.

## 1. Configure the environment

If the local files do not exist, copy the examples once. These commands do not
overwrite existing settings.

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
```

The frontend uses a relative API URL so the browser always talks to the
current frontend origin:

```dotenv
# .env
VITE_API_BASE_URL=/api/v1
VITE_ALLOWED_HOSTS=YOUR-FRONTEND-NGROK-DOMAIN
VITE_LIVE_TRACKING=true
```

Keep backend CORS limited to direct local development origins. Requests from
the public frontend are same-origin in the browser and are forwarded by Vite
without the browser `Origin` header:

```dotenv
# backend/.env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Keep existing MongoDB and JWT settings unchanged. Use hostnames only in
`VITE_ALLOWED_HOSTS` (no scheme or path). Restart Vite after changing
frontend variables.

## 2. Start Savora locally

Backend, in PowerShell window 1:

```powershell
cd "C:\Users\hasan\Desktop\New folder\v2\backend"
npm run start:dev
```

Frontend, in PowerShell window 2:

```powershell
cd "C:\Users\hasan\Desktop\New folder\v2"
npm run dev
```

Verify the frontend and proxied API:

```powershell
Invoke-WebRequest http://localhost:5173
Invoke-WebRequest http://localhost:5173/api/v1/restaurants
```

The restaurants endpoint may require authentication or return an application
error based on database state; a response from the NestJS route confirms the
proxy is forwarding. The direct backend remains available at
`http://localhost:3000` for local diagnostics.

## 3. Start the one ngrok tunnel

In PowerShell window 3:

```powershell
ngrok http 5173
```

Copy the HTTPS hostname printed by ngrok into `VITE_ALLOWED_HOSTS`, restart
Vite, and open that same HTTPS URL on the phone. No backend tunnel is needed.
Never put an ngrok auth token in this repository.

## 4. Verify authentication and live tracking

Open the frontend HTTPS URL on the phone and sign in. REST requests remain
relative (`/api/v1/...`) and are proxied to NestJS. Authenticated bearer
tokens are still attached by the centralized API client.

Socket.IO uses the browser origin with the existing `/tracking` namespace and
`/socket.io` path. Vite proxies both polling and WebSocket upgrade traffic.

1. Sign in as a driver and grant GPS permission.
2. Keep the driver page open during an active delivery.
3. Open the customer tracking page in another device or tab.
4. Confirm location and status snapshots arrive through Socket.IO.
5. Temporarily interrupt the network and confirm Socket.IO reconnects.

## Troubleshooting

- **Invalid Host header / 403 from Vite:** add the exact ngrok hostname,
  without `https://`, to `VITE_ALLOWED_HOSTS`, then restart Vite.
- **API requests use an old public backend URL:** set
  `VITE_API_BASE_URL=/api/v1` and restart Vite.
- **API proxy connection refused:** ensure NestJS is running on port `3000`.
- **Socket.IO errors:** verify both `/socket.io` proxying and the backend
  process, then check that the user is signed in.
- **GPS is unavailable:** use the HTTPS ngrok URL and grant location
  permission in the phone browser.
- **Images do not load:** check that image URLs are HTTPS and that backend
  storage is configured; do not expose MongoDB.
