# Tourgether


### 1. Clone the Repository
```bash
git clone https://github.com/Jemerylim/Tourgether.git
cd Tourgether
```

### Configuration
URLs, ports and credentials come from environment files, not the code. To move to another domain, change these values:

| Setting | File | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `client/.env.development` (dev), `client/.env.production` (build) | Where the client sends API requests. Empty = same host, through the nginx `/api` proxy |
| `CLIENT_URL` | `backend/.env` or AWS secret | Where the website lives; invite and password-reset emails link here |
| `CORS_ORIGINS` | `backend/.env` or AWS secret | Comma-separated sites allowed to call the API (defaults to `CLIENT_URL`) |
| `PORT`, `DATABASE_URL`, `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS` | `backend/.env` or AWS secret | Server settings |

Copy `backend/.env.example` to `backend/.env` and `client/.env.example` to `client/.env.local` to get started.

### 2. Frontend
In the Client Folder

Build the Frontend
```bash
npm install
```

Run the Frontend
```bash
npm run dev
```

### 3. Backend
In the Backend Folder

Build the Backend
```bash
npm install
```

Run the Backend
```bash
npm start
```

CTRL C or command C to end server

### 4. Docker Set up
In the Root Folder:

Build the whole thing
```bash
docker-compose up --build
```

Stop both containers
```bash
docker-compose stop
```

Stop and delete both containers
```bash
docker-compose down
```