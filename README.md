# OpsDesk — Manual Deployment Starter

A small IT support ticket application for practising a React frontend on Amazon S3/CloudFront and an Express API on Ubuntu EC2.

## Included
- `frontend/`: React + Vite dashboard
- `backend/`: Express REST API with JSON-file persistence
- No Jenkinsfile, Dockerfile, Docker Compose, or container configuration is included in this starter.

## Requirements
- Node.js 20 or later
- npm
- An S3 bucket and CloudFront distribution for the frontend
- An Ubuntu EC2 instance for the backend

## 1. Run locally

Open two terminals.

### Backend
```bash
cd backend
npm install
npm run dev
```
The API listens on `http://localhost:3001`. The first run creates `backend/data/tickets.json`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open the Vite URL shown in the terminal (normally `http://localhost:5173`). Vite proxies `/api` requests to the backend.

## 2. Frontend build for S3

Set the API base URL before building.

For a CloudFront setup that routes `/api/*` to the EC2 backend, create `frontend/.env.production`:
```env
VITE_API_BASE_URL=/api
```

Then build:
```bash
cd frontend
npm run build
```
Upload the **contents** of `frontend/dist/` to the S3 bucket's website object root (not the whole source project). Configure CloudFront's default root object as `index.html`.

If you are not routing `/api/*` through CloudFront yet, set `VITE_API_BASE_URL` to your backend URL, for example:
```env
VITE_API_BASE_URL=http://YOUR_EC2_PUBLIC_DNS_OR_IP:3001
```
This direct-URL approach is suitable only for a temporary test. Configure HTTPS and restrict the backend security group before using it beyond a lab. The backend CORS allow-list is configurable with `FRONTEND_ORIGIN`.

## 3. Run backend on Ubuntu EC2

Copy the `backend/` folder to EC2, then:
```bash
cd backend
npm install --omit=dev
PORT=3001 FRONTEND_ORIGIN=https://YOUR_CLOUDFRONT_DOMAIN pm2 start src/server.js --name opsdesk-api
pm2 save
```
If PM2 is not installed:
```bash
sudo npm install -g pm2
```

For a production-like setup, put Nginx in front of Express and proxy `/api/` to `127.0.0.1:3001`. Keep the Node port private; allow public access only through your chosen HTTPS entry point. If CloudFront will call EC2 directly as a separate origin, configure the origin path/behaviors carefully.

## API routes
- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/tickets`
- `POST /api/tickets`
- `PATCH /api/tickets/:id`
- `DELETE /api/tickets/:id`

## Notes
- JSON-file persistence is for learning only. It is not suitable for concurrent multi-instance production use.
- The API has basic input validation and CORS configuration, but no authentication. Do not expose this as a public production service with real personal data.
- The frontend uses `VITE_API_BASE_URL`; Vite environment values are embedded at build time. Rebuild after changing the value.
