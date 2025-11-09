# 🧪 Agentic Medicinal Chemist (AMC)

<div align="center">

[![Built with Lovable](https://img.shields.io/badge/Built%20with-Lovable-FF69B4)](https://lovable.dev/projects/61a791b0-575c-4aa8-a07d-68a25b250a5b)
[![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite)](https://vitejs.dev)

AI-Powered Drug Discovery and Molecular Optimization Platform

[Getting Started](#-getting-started) •
[Features](#-key-features) •
[Documentation](#-documentation) •
[Contributing](#-contributing)

</div>

---

## 🚀 Project Overview

The Agentic Medicinal Chemist (AMC) is a cutting-edge platform that combines modern web technologies with advanced AI to revolutionize drug discovery and molecular optimization. Using a multi-agent system architecture, it enables researchers to:

- 🔍 Explore chemical space efficiently
- 🧬 Optimize molecular structures
- 📊 Analyze drug-like properties
- 🎯 Target specific molecular characteristics

## ✨ Key Features

- 🧪 **Interactive Molecular Design**
  - SMILES-based structure input
  - Real-time 3D visualization
  - Instant property calculation

- 🤖 **AI-Powered Optimization**
  - Multi-agent collaboration system
  - Constraint-based optimization
  - Machine learning predictions

- 📈 **Real-time Analysis**
  - Live property updates
  - Comprehensive reports
  - Visual progress tracking

## 🛠️ Tech Stack

### Frontend Architecture
- ⚛️ **React 18** - Component-based UI with hooks
- 📘 **TypeScript** - Type-safe development
- ⚡ **Vite** - Next-generation frontend tooling
- 🎨 **shadcn/ui** - Beautiful, accessible components
- 🌈 **Tailwind CSS** - Utility-first styling
- 🔄 **React Query** - Server state management

### Backend Technologies
- 🐍 **FastAPI** - Modern Python web framework
- 🔌 **SSE** - Real-time server events
- 🧬 **RDKit** - Chemical informatics engine
- 🤝 **Multi-agent System** - Collaborative AI architecture

## 📦 Installation

### Prerequisites
```bash
# Node.js 18+ and Python 3.8+ required
node --version  # Should be >= 18.0.0
python --version  # Should be >= 3.8.0
```

### Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Backend Setup
```bash
# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\\Scripts\\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Start backend server
python main.py
```

## 🔧 Development Workflow

1. **Start Development Servers**
   ```bash
   # Terminal 1 - Frontend
   npm run dev

   # Terminal 2 - Backend
   python main.py
   ```

2. **Access the Application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## � Project Structure

```
/
├── src/                    # Frontend source
│   ├── components/         # React components
│   │   ├── ControlPanel/  # Molecule input & controls
│   │   ├── LabMonitor/    # Research monitoring
│   │   └── ui/            # shadcn/ui components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   └── pages/             # Route components
├── server/                # Backend source
│   ├── main.py           # FastAPI server
│   ├── graph.py          # Agent interaction
│   └── tools.py          # Molecular tools
└── public/               # Static assets
```

## 🚀 Deployment

### Development Build
```bash
npm run build:dev
```

### Production Deployment
1. Via Lovable Platform
   - Open [Lovable Project](https://lovable.dev/projects/61a791b0-575c-4aa8-a07d-68a25b250a5b)
   - Click Share -> Publish

2. Manual Deployment
   ```bash
   npm run build
   # Deploy the 'dist' directory
   ```

## 🌐 Custom Domain Setup

1. Navigate to Project > Settings > Domains
2. Click "Connect Domain"
3. Follow DNS configuration instructions
4. [Detailed Setup Guide](https://docs.lovable.dev/features/custom-domain#custom-domain)

## 👥 Contributing

1. Fork the repository
2. Create your feature branch
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your changes
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. Push to the branch
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a Pull Request

## 📝 License

This project is part of the Lovable platform. See [LICENSE](LICENSE) for details.

## 🤝 Support

- Documentation: [Project Docs](https://docs.lovable.dev)
- Issues: [GitHub Issues](https://github.com/EmilioVenegas/hacknation-Falcon270/issues)
- Community: [Lovable Discord](https://discord.gg/lovable)
