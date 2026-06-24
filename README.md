# Railway Leave Flow

Railway Leave Flow is a leave management web app for railway station staff. It tracks employees, stations, leave requests, dashboard statistics, reports, and employee leave history.

## Features

- Dashboard with total stations, employees, on-leave count, and pending requests
- Station-wise employee counts and leave status
- Employee list with searchable cards
- Add and edit employee details
- Create, approve, reject, and delete leave requests
- Employee leave history and monthly leave usage
- Station-wise and employee-wise reports
- MongoDB-backed backend with seed data

## Tech Stack

- React 19
- TanStack Router
- Vite
- TypeScript
- Tailwind CSS
- Express
- MongoDB with Mongoose

## Requirements

- Node.js
- npm
- MongoDB connection string

## Environment Variables

Create a `.env` file in the project root.

```env
MONGODB_URI=mongodb://localhost:27017/rail-leave-flow
PORT=3000
MONTHLY_LEAVE_LIMIT=4
```

Optional variables:

```env
VITE_API_BASE=http://localhost:3000
MAIL_USER=
MAIL_PASS=
MAIL_ALLOW_INSECURE_TLS=false
```

`MONGODB_URI` is required. Mail settings are only needed if email-based leave request checking is used.

## Installation

```bash
npm install
```

## Development

Run the frontend:

```bash
npm run dev
```

Run the backend:

```bash
npm run backend
```

By default, the backend runs on:

```text
http://localhost:3000
```

If the frontend and backend are running separately, set `VITE_API_BASE` so frontend API calls go to the backend.

## Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Useful Scripts

```bash
npm run dev        # Start Vite frontend
npm run backend    # Start Express backend
npm run start      # Start backend
npm run build      # Build frontend
npm run lint       # Run ESLint
npm run format     # Format files with Prettier
```

## Project Structure

```text
src/
  backend/
    controllers/   # API request handlers
    data/          # Seed/static railway employee and station data
    models/        # Mongoose models
    routes/        # Express routes
    services/      # Shared backend logic
  components/      # Shared React components
  routes/          # Frontend pages/routes
  lib/             # Frontend helpers
```

## Notes

- Seed data is loaded from `src/backend/seed-data.js` and employee data files under `src/backend/data/`.
- Station/employee count exclusions are managed in `src/backend/data/stationRules.js`.
- The backend serves the built frontend from `dist` in production.
