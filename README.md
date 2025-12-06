# Metro Line 4 — Project Dashboard

A comprehensive, production-ready dashboard web application for visualizing Metro Line 4 project statistics. Built with Next.js, React, Tailwind CSS, and Recharts.

## Features

- **Interactive Charts**: Line charts, bar charts, pie/doughnut charts, and stacked area charts
- **Advanced Data Table**: Sorting, filtering, pagination, global search, and CSV export
- **Real-time KPIs**: Total passengers, average progress, incidents, and budget usage
- **Responsive Design**: Desktop sidebar navigation with mobile-friendly drawer
- **Dark Mode**: Theme toggle with persistent preference
- **Accessibility**: Semantic HTML, keyboard navigation, ARIA labels
- **Data Filtering**: Date range, station, status, and category filters
- **Station Overview**: Dedicated page showing all stations with key metrics

## Tech Stack

- **Framework**: Next.js 16
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4.1
- **Charts**: Recharts
- **Tables**: TanStack Table (React Table)
- **Icons**: Lucide React
- **Date Utilities**: date-fns

## Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)
- Git (for version control)

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production

```bash
npm run build
npm start
```

## Data Structure

The application reads data from `public/data.json`. The expected JSON structure is an array of objects with the following fields (all optional, missing fields show as "N/A"):

```json
{
  "stationId": "ST001",
  "stationName": "Station Name",
  "date": "2024-01-15",
  "passengers": 12500,
  "workProgressPercent": 83,
  "incidents": 2,
  "budgetSpent": 4500000,
  "budgetAllocated": 5500000,
  "contractor": "Contractor Name",
  "status": "on schedule",
  "category": "Civil",
  "remarks": "Additional notes"
}
```

### Field Descriptions

- `stationId`: Unique identifier for the station/segment
- `stationName`: Display name of the station
- `date`: ISO date string (YYYY-MM-DD)
- `passengers`: Number of passengers (integer)
- `workProgressPercent`: Progress percentage (0-100)
- `incidents`: Number of incidents (integer)
- `budgetSpent`: Amount spent (number)
- `budgetAllocated`: Total allocated budget (number)
- `contractor`: Contractor name (string)
- `status`: Status value (e.g., "on schedule", "delayed", "completed")
- `category`: Category/activity type (string)
- `remarks`: Free-text remarks (string)

**Note**: The application dynamically detects available fields and handles missing data gracefully.

## Project Structure

```
my-app/
├── public/
│   └── data.json          # Data source (JSON file)
├── src/
│   ├── app/
│   │   ├── layout.js      # Root layout with providers
│   │   ├── page.js        # Main dashboard page
│   │   ├── stations/      # Stations page
│   │   └── settings/      # Settings page
│   ├── components/
│   │   ├── Charts/        # Chart components (Recharts)
│   │   ├── Filters/       # Filter components
│   │   ├── KPI/           # KPI card components
│   │   ├── Layout/        # Layout components (Sidebar, Header)
│   │   └── Table/         # Table components
│   └── contexts/
│       ├── DataContext.js # Data state management
│       └── ThemeContext.js # Theme state management
├── package.json
└── README.md
```

## Deployment

### GitHub Setup

1. **Initialize Git Repository** (if not already initialized):

```bash
git init
```

2. **Create .gitignore** (if not exists):

```bash
echo "node_modules
.next
.env*.local
.DS_Store
*.log" > .gitignore
```

3. **Add and Commit Files**:

```bash
git add .
git commit -m "Initial commit: Metro Line 4 Dashboard"
```

4. **Create GitHub Repository**:

   - Go to [GitHub](https://github.com/new)
   - Create a new repository (e.g., `metro-line-4-dashboard`)
   - **Do not** initialize with README, .gitignore, or license

5. **Push to GitHub**:

```bash
git remote add origin <GH_REPO_URL>
git branch -M main
git push -u origin main
```

Replace `<GH_REPO_URL>` with your actual GitHub repository URL (e.g., `https://github.com/username/metro-line-4-dashboard.git`).

### Netlify Deployment

1. **Sign up/Login to Netlify**: [https://www.netlify.com](https://www.netlify.com)

2. **Deploy from GitHub**:
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub and select your repository
   - Configure build settings:
     - **Build command**: `npm run build`
     - **Publish directory**: `.next`
     - **Node version**: 18 (or latest LTS)

3. **Alternative: Deploy via Netlify CLI**:

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

4. **Environment Variables** (if needed):
   - Go to Site settings → Environment variables
   - Add any required variables (none required for this app)

5. **Custom Domain** (optional):
   - Go to Domain settings
   - Add your custom domain

### Important Notes for Netlify

- **Publish Directory**: `.next` (Next.js output)
- **Build Command**: `npm run build`
- **Node Version**: Set to 18 or later in Netlify settings
- The app will automatically rebuild on every push to the main branch if connected to GitHub

## Updating Data

To update the dashboard data:

1. **Local Development**:
   - Edit `public/data.json` directly
   - Refresh the browser

2. **Production (Netlify)**:
   - Edit `public/data.json` in your repository
   - Commit and push changes
   - Netlify will automatically rebuild and deploy

3. **Via Settings Page**:
   - The Settings page includes a JSON validator
   - For full upload functionality, backend implementation is required
   - Currently, replace `public/data.json` manually

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Accessibility

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Color contrast compliance (WCAG AA)
- Screen reader friendly

## Performance

- Server-side rendering (SSR) with Next.js
- Optimized bundle size
- Lazy loading for charts
- Efficient data filtering and memoization

## Troubleshooting

### Data Not Loading

- Ensure `public/data.json` exists and is valid JSON
- Check browser console for errors
- Verify file is accessible at `/data.json` route

### Build Errors

- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

### Styling Issues

- Ensure Tailwind CSS is properly configured
- Check `postcss.config.mjs` and `tailwind.config.js` (if exists)
- Verify `globals.css` imports Tailwind

## License

This project is private and proprietary.

## Support

For issues or questions, please contact the development team or create an issue in the repository.

---

**Built with ❤️ for Metro Line 4 Project**
