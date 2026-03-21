# FEA Solver Frontend

A professional Finite Element Analysis (FEA) web application with React, TypeScript, and TailwindCSS.

## Features

### Authentication Pages
- **Sign-In Page** (`/signin`) - Login with email/password
- **Registration Page** (`/register`) - Create new account with password strength indicator

### FEA Solver Input Form (`/solver`)
- **Geometry Parameters**: Domain dimensions (d₁, d₂) and element type selection
- **Mesh Configuration**: Element divisions in x and y directions
- **Physical Properties**: Young's modulus (E) and Poisson's ratio (ν)
- **Loads & Boundary Conditions**: Applied traction loads and direction
- **Scale Factor**: Displacement visualization multiplier

### PSLG Validation
Real-time validation prevents Planar Straight Line Graph violations:
- Positive geometry dimensions (1e-10 to 1e6)
- Valid mesh divisions (1-10000 elements)
- Poisson's ratio constraint (0 ≤ ν < 0.5 for stability)
- Reasonable material property ranges
- Load magnitude limits

## Responsive Design

Three responsive breakpoints:
- **Mobile**: < 640px - Single column layout
- **Tablet**: 640px - 1024px - Adapted spacing
- **Desktop**: > 1024px - Full side-by-side layout with branding panel

## Cross-Browser Compatibility

- Chrome/Edge (Chromium)
- Firefox (Gecko)
- Safari (WebKit)
- Uses standard CSS features and TailwindCSS
- No CSS prefixes needed for modern browsers

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: TailwindCSS 3
- **Routing**: React Router 6
- **Icons**: Lucide React

## Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Server

The dev server runs at `http://localhost:3000` by default.

## Project Structure

```
frontend/
├── public/
│   └── vite.svg
├── src/
│   ├── pages/
│   │   ├── SignIn.tsx       # Authentication page
│   │   ├── Register.tsx     # Registration page
│   │   └── FEASolver.tsx    # Main solver form
│   ├── types/
│   │   ├── fea.ts           # FEA type definitions
│   │   └── index.ts
│   ├── utils/
│   │   └── validation.ts     # PSLG validation logic
│   ├── App.tsx              # Routing configuration
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Redirects to `/signin` | Entry point |
| `/signin` | SignIn | Login page |
| `/register` | Register | Registration page |
| `/solver` | FEASolver | FEA input form |

## Validation Constraints

### Geometry
- d₁, d₂: 1e-10 to 1e6 meters
- Element types: D2QU4N (4-node quad), D2TR3N (3-node triangle)

### Mesh
- p, m: 1 to 10000 elements per direction
- Maximum total elements: 10,000

### Physical Properties
- Young's modulus (E): 1e-100 to 1e15 Pa
- Poisson's ratio (ν): 0 to 0.4999 (stability constraint)

### Loads
- Load value: -1e12 to 1e12 N/m

### Scale Factor
- 0.001 to 10000 for visualization

