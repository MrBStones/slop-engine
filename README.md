# Slop Engine

A web-based 3D scene editor built with **Solid.js**, **BabylonJS**, and **Havok Physics**. Create, manipulate, and simulate 3D scenes directly in the browser.

## Features

- **3D Viewport** with gizmo-based object manipulation (translate, rotate, scale)
- **Scene Hierarchy** panel with drag-and-drop reparenting
- **Properties Inspector** for editing mesh, light, and camera properties
- **Physics Simulation** powered by Havok WASM with play/pause controls
- **AI Assistant** panel with configurable providers (Azure OpenAI, OpenRouter, Google Gemini)
- **Script Editor** with Monaco-based code editing
- **Asset Management** panel
- **Console** panel for runtime output
- **Resizable Panel Layout** with persistent sizing via localStorage
- **Dark Mode** UI with Tailwind CSS

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (package manager and runtime)

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
bun run build
bun run serve   # Preview the production build
```

## AI Provider Setup

The AI panel supports multiple providers with per-agent model selection. You can enter API keys directly in the browser (stored in localStorage) or set them as environment variables:

- `AZURE_OPENAI_API_KEY` / `AZURE_OPENAI_RESOURCE_NAME` / `AZURE_OPENAI_DEPLOYMENT`
- `OPENROUTER_API_KEY`
- `GOOGLE_API_KEY` (Gemini via Google AI Studio)

## Tech Stack

- [Solid.js](https://solidjs.com/) - Reactive UI framework
- [BabylonJS](https://www.babylonjs.com/) - 3D rendering engine
- [Havok Physics](https://www.havok.com/) - Physics simulation
- [Vite](https://vitejs.dev/) - Build tooling
- [Tailwind CSS 4](https://tailwindcss.com/) - Styling
- [corvu](https://corvu.dev/) - Resizable panel primitives
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editing
- [Vercel AI SDK](https://sdk.vercel.ai/) - AI provider integrations

## License

MIT
