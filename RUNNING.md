## Running the Application

### 1. Start Flask Backend

```bash
# From project root
python dashboard.py
# Server runs at http://localhost:9001
```

### 2. Start Next.js Frontend (in a new terminal)

```bash
# From project root
npm run dev
# App opens at http://localhost:3000
```

### 3. Access the Dashboard

Open your browser to `http://localhost:3000` and start managing campaigns!

## Build & Production

### Build for Production

```bash
npm run build
npm run start
```

### Environment Variables

For production deployments, update `.env.local`:

```
NEXT_PUBLIC_API_BASE=https://your-flask-api.com
```

The `NEXT_PUBLIC_` prefix makes it available to the browser. The proxy route will forward requests accordingly.

## Troubleshooting

### CORS Errors

If you see CORS errors, ensure:
- Flask is running with CORS enabled (already configured in app.py)
- The Next.js proxy route is working (`/api/proxy/*`)
- Both backend and frontend are accessible

### API Not Responding

- Check Flask is running on port 9001: `curl http://localhost:9001/api/aircraft`
- Check `.env.local` has correct `NEXT_PUBLIC_API_BASE`
- Check browser console for network errors

### Build Errors

- Run `npm install` to ensure all dependencies are installed
- Check Node.js version is 18+
- Clear `.next` folder: `rm -rf .next`
