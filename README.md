# CineBook 🎬

A full-stack movie ticket booking web application built with **Go** and **React + TypeScript**.

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Backend    | Go, Chi router, JWT, bcrypt, pgx/v5             |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS        |
| Database   | PostgreSQL                                      |
| API Spec   | OpenAPI 3.0 (`openapi.yaml`)                    |

---

## Features

- Browse now-showing movies with search and genre filters
- View showtimes grouped by date and theater
- Interactive seat map (Regular / Premium / VIP tiers)
- Atomic seat reservation — no double-booking under concurrent load
- JWT-based authentication with persistent sessions
- Profile page with booking history and cancellation support

---

## Project Structure

```
movie-booking/
├── backend/
│   ├── cmd/server/          # Entry point
│   ├── internal/
│   │   ├── config/          # Environment configuration
│   │   ├── handler/         # HTTP handlers
│   │   ├── middleware/       # Auth + logger middleware
│   │   ├── model/           # Domain types
│   │   ├── repository/      # Database access (interface-backed)
│   │   └── service/         # Business logic
│   └── pkg/
│       ├── database/        # Connection, migrations, seeder
│       └── utils/           # JWT helpers, response helpers
├── frontend/
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── context/         # Auth context
│       ├── pages/           # Route-level page components
│       ├── services/        # API service layer
│       ├── types/           # Shared TypeScript interfaces
│       └── utils/           # Formatters
└── openapi.yaml             # Full API specification
```

---

## Getting Started

### Prerequisites

- Go 1.22+
- Node.js 18+
- PostgreSQL 15+

### 1. Database Setup

Create a PostgreSQL database named `cinebook`. The schema and seed data are applied automatically on first run.

### 2. Backend

```bash
cd backend
go run ./cmd/server
```

Environment variables (defaults shown):

| Variable      | Default     |
|---------------|-------------|
| PORT          | 8080        |
| DB_HOST       | localhost   |
| DB_PORT       | 5432        |
| DB_USER       | postgres    |
| DB_PASSWORD   | —           |
| DB_NAME       | cinebook    |
| JWT_SECRET    | secret      |

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## API

The full API is documented in [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.0).  
Paste it into [editor.swagger.io](https://editor.swagger.io) for an interactive explorer.

### Endpoints summary

| Method | Path                              | Auth | Description                  |
|--------|-----------------------------------|------|------------------------------|
| POST   | /api/auth/register                |      | Register a new user          |
| POST   | /api/auth/login                   |      | Login and receive JWT        |
| GET    | /api/movies                       |      | List / search movies         |
| GET    | /api/movies/{id}                  |      | Get movie details            |
| GET    | /api/movies/{movieID}/showtimes   |      | Showtimes for a movie        |
| GET    | /api/showtimes/{id}               |      | Showtime details             |
| GET    | /api/showtimes/{id}/seats         |      | Seat map for a showtime      |
| POST   | /api/bookings                     | JWT  | Create a booking             |
| GET    | /api/bookings                     | JWT  | My bookings                  |
| GET    | /api/bookings/{id}                | JWT  | Single booking               |
| PATCH  | /api/bookings/{id}/cancel         | JWT  | Cancel a booking             |
