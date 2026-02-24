# Campaign & Rule Management Frontend

A Next.js 15 frontend for managing advertising campaigns and rules on aircraft systems.

## Architecture

- **Backend**: Flask API running on port 9001
- **Frontend**: Next.js 15 app with SWR data fetching and Tailwind CSS styling
- **Communication**: Next.js proxy routes forward requests to Flask API with CORS enabled

## Setup

### Backend (Flask)

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the Flask server:
   ```bash
   python dashboard.py  # or your entry point
   ```
   The Flask API will be available at `http://localhost:9001`

### Frontend (Next.js)

1. Install dependencies:
   ```bash
   npm install
   # or: pnpm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```
   The Next.js app will be available at `http://localhost:3000`

## Features

### Dashboard Pages

- **Home**: Overview of active campaigns, fleet status, and recent activity
- **Campaigns**: Browse campaigns grouped by campaign ID with filtering
- **Campaign Detail**: View campaign rules, ads, screen placements, and broadcast history
- **Ads**: Full library of all creatives across all campaigns
- **Aircraft**: Real-time fleet status and ping health
- **Activity**: Audit log of all campaign updates and broadcasts

### User Operations

- **New Campaign Update**: Multi-step wizard to create and push new campaign updates
  - Step 1: Campaign info (adload version, display name)
  - Step 2: Define campaigns with impression caps and language settings
  - Step 3: Add creatives (ads) with date ranges
  - Step 4: Select screen placements (welcome, mid-roll, post-roll, etc.)
  - Step 5: Choose target aircraft
  - Step 6: Review and push

- **Rename Rules**: Change the display name of existing rules for better identification
- **Reapply Rules**: Broadcast an existing rule to new aircraft
- **Rollback**: Send undo commands to aircraft to revert to previous state

## API Integration

The frontend communicates with the Flask backend through a Next.js proxy at `/api/proxy/*`. This approach:

- Handles CORS automatically
- Allows the frontend and backend to run on different ports during development
- Can be easily deployed to separate services in production

### Key Endpoints Used

- `GET /api/aircraft` - List all aircraft
- `POST /api/send_full` - Push new campaign update
- `POST /api/send_patch` - Send patch/update
- `POST /api/send_rollback` - Send rollback command
- `GET /api/v1/campaign-updates/rules/all` - Get all rules
- `PATCH /api/v1/campaign-updates/rules/:id` - Rename rule
- `POST /api/v1/campaign-updates/rules/:id/reapply` - Reapply rule
- `GET /api/v1/campaign-updates/history` - Get broadcast history

## Environment Configuration

The `.env.local` file configures the backend API URL:

```
NEXT_PUBLIC_API_BASE=http://localhost:9001
```

This should match the Flask server's address.

## Technology Stack

- **Framework**: Next.js 15 (React 19)
- **Styling**: Tailwind CSS v4
- **Data Fetching**: SWR (client-side) with Server-Side Rendering
- **Icons**: Lucide React
- **Type Safety**: TypeScript

## Design

The UI follows a clean, operator-friendly design:

- **Light SaaS aesthetic** with neutral colors and blue accent
- **Sidebar navigation** for easy section access
- **Status badges** for quick health indicators (green/amber/red)
- **Card-based layouts** for data organization
- **Responsive design** that works on desktop and tablet
- **Technical details toggles** to hide complexity from non-technical operators

All screens avoid jargon and use simple language:
- "Ads" instead of "Creatives"
- "Screen Placements" instead of "Targeting Zones"
- "Push to Aircraft" instead of "FULL broadcast"
- "Undo Last Push" instead of "ROLLBACK"

## Development Notes

- All component state is managed with React hooks
- Data fetching uses SWR for caching and real-time updates
- Dialog/modal interactions use a custom Dialog component
- The push wizard is the main complex component handling multi-step form state
- Campaign grouping logic derives summaries from flat rule records

## Future Enhancements

- Real-time WebSocket updates for aircraft status
- Export campaign rules to CSV/JSON
- Bulk aircraft operations
- Campaign scheduling/scheduling rules
- Performance analytics dashboard
- Advanced filtering and search
