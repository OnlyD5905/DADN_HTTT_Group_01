# FEA Solver - Phân tích Phần tử Hữu hạn

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A professional Finite Element Analysis (FEA) web application for solving 2D structural mechanics problems. Built with FastAPI backend, React frontend, and sparse matrix optimization for efficient computation.

## 🌟 Features

### 🔧 Core Capabilities
- **2D Structural Analysis**: Solve plane stress and plane strain problems
- **Multiple Element Types**: Support for Q4 (4-node quadrilateral) and T3 (3-node triangular) elements
- **Sparse Matrix Optimization**: Efficient memory usage with scipy sparse matrices
- **Boundary Conditions**: Fixed, hinge-roller, and beam support configurations
- **Real-time Visualization**: Interactive mesh and result visualization with Three.js

### 🎯 Advanced Features
- **Mesh Generation**: Automatic quadrilateral/triangular mesh generation
- **Stress Analysis**: Calculate displacement and stress distributions
- **Project Management**: Save and manage multiple FEA projects with PostgreSQL
- **Error Handling**: Singular matrix detection and validation
- **RESTful API**: Complete API with async support

### 🖥️ Frontend Features
- **Modern UI**: Built with React 18, TypeScript, and TailwindCSS
- **Responsive Design**: Mobile, tablet, and desktop layouts
- **Real-time Validation**: PSLG validation with instant feedback
- **3D Visualization**: Interactive mesh viewing with OrbitControls
- **Authentication**: User registration and login system

## 🏗️ Architecture

```
┌─────────────────┐     HTTP/REST API      ┌──────────────────┐
│                 │ ◄────────────────────► │                  │
│    Frontend     │    Port 3000           │     Backend      │
│   (React 18)    │                        │   (FastAPI)      │
│  TypeScript     │                        │  Port 8000       │
│   Three.js      │                        │                  │
└────────┬────────┘                        └────────┬─────────┘
         │                                          │
         │          ┌──────────────────┐            │
         │          │   PostgreSQL     │            │
         └─────────►│   (Database)     │◄───────────┘
                    └──────────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │   Meshingcode/   │
                    │  Python Core FEA │
                    │   Engine         │
                    └──────────────────┘
```

## 📋 Prerequisites

- **Python** 3.11 or higher
- **Node.js** 18 or higher
- **PostgreSQL** 14 or higher
- **Git**

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd DADN_HTTT_Group_01
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
copy .env.example .env  # Windows
cp .env.example .env    # macOS/Linux

# Edit .env with your database credentials:
# DATABASE_URL=postgresql+asyncpg://user:password@localhost/fea_db
```

**Backend Dependencies**:
- FastAPI 0.115+ - Modern web framework
- SQLAlchemy 2.0+ - Async ORM
- Pydantic 2.8+ - Data validation
- SciPy 1.10+ - Sparse matrix operations
- NumPy 1.24+ - Numerical computing

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Set up environment
echo "VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1" > .env
```

**Frontend Dependencies**:
- React 18 - UI library
- TypeScript 5 - Type safety
- Vite 5 - Build tool
- TailwindCSS 3 - Styling
- Three.js - 3D visualization
- React Router 6 - Navigation

### 4. Database Setup

```bash
# Create PostgreSQL database
createdb fea_db

# Or using psql
psql -U postgres -c "CREATE DATABASE fea_db;"

# Tables are auto-created on first backend startup
```

## 💻 Usage

### Start the Backend Server

```bash
cd backend

# Activate virtual environment (if not already activated)
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Run the server
uvicorn app.main:app --reload --port 8000

# Server will be available at:
# - API: http://127.0.0.1:8000
# - Documentation: http://127.0.0.1:8000/docs
```

### Start the Frontend Development Server

```bash
cd frontend

# Run dev server
npm run dev

# Frontend will be available at:
# http://localhost:3000
```

### Access the Application

1. Open your browser to `http://localhost:3000`
2. Sign in or register a new account
3. Create a new project or open existing one
4. Configure geometry, mesh, and material properties
5. Set boundary conditions and loads
6. Run the solver
7. View results with 3D visualization

## 📊 API Documentation

### Key Endpoints

#### Projects
- `POST /api/v1/projects/` - Create new project
- `GET /api/v1/projects/` - List all projects
- `GET /api/v1/projects/{id}` - Get project details
- `PUT /api/v1/projects/{id}/boundary-conditions` - Set BCs
- `POST /api/v1/projects/{id}/solve` - Run FEA solver

#### Solver
- `POST /api/v1/solver/solve` - Direct solver endpoint
- `GET /api/v1/solver/health` - Health check

### Example API Call

```bash
# Solve a problem directly
curl -X POST http://127.0.0.1:8000/api/v1/solver/solve \
  -H "Content-Type: application/json" \
  -d '{
    "geometry": {
      "d1": 10.0,
      "d2": 10.0,
      "elementType": "D2QU4N",
      "bcType": "FIXED"
    },
    "mesh": {
      "p": 10,
      "m": 10
    },
    "physical": {
      "E": 200000000000.0,
      "nu": 0.3,
      "planeState": "PLANE_STRESS"
    },
    "loads": {
      "loadVal": 1000.0,
      "loadDirection": "y"
    },
    "scaleFactor": 100.0
  }'
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 📁 Project Structure

```
DADN_HTTT_Group_01/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # FEA engine
│   │   ├── db/             # Database setup
│   │   ├── models/         # SQLAlchemy models
│   │   └── schemas/        # Pydantic schemas
│   ├── requirements.txt
│   └── README.md
├── frontend/               # React frontend
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utilities
│   ├── package.json
│   └── README.md
├── Meshingcode/           # Core FEA algorithms
│   ├── MeshCreate.py
│   └── DisplaymentCal.py
├── ai/                    # AI integration
├── report/                # Documentation
└── README.md
```

## 🔬 FEA Solver Details

### Supported Element Types

| Element | Nodes | Description |
|---------|-------|-------------|
| D2QU4N  | 4     | 4-node quadrilateral (Q4) |
| D2TR3N  | 3     | 3-node triangle (T3) |

### Material Models

- **Plane Stress**: Thin plates, σz = 0
- **Plane Strain**: Thick sections, εz = 0

### Boundary Conditions

- **FIXED**: All DOFs restrained at x=0
- **HINGE_ROLLER**: Hinge at origin, roller on y=0
- **BEAM_SUPPORT**: Simply supported beam configuration

### Sparse Matrix Optimization

The solver uses `scipy.sparse` for efficient memory usage:
- `lil_matrix` for assembly
- `csr_matrix` for solving
- Handles meshes up to 100x100 elements with minimal RAM

## 🛠️ Development

### Backend Development

```bash
cd backend

# Run with auto-reload
uvicorn app.main:app --reload --port 8000

# Format code
black app/

# Type checking
mypy app/
```

### Frontend Development

```bash
cd frontend

# Run dev server
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

## 📝 Configuration

### Environment Variables

**Backend (.env)**:
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost/fea_db
SECRET_KEY=your-secret-key-here
DEBUG=True
```

**Frontend (.env)**:
```
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- FastAPI team for the excellent web framework
- React team for the UI library
- Three.js community for 3D visualization
- SciPy/NumPy contributors for numerical computing

## 📞 Support

For questions or support:
- Open an issue on GitHub
- Contact the development team
- Check the API documentation at `/docs`

---

**Built with ❤️ by DADN_HTTT_Group_01**
