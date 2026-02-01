# Texas Poker - Vue 3 + TypeScript + Vite

A Texas Hold'em poker game built with Vue 3, TypeScript, Vite, Express, and Socket.io.

## Project Setup

### Development
```bash
npm install
npm run dev
```

### Docker Deployment

The application is containerized with Docker and exposed on **port 7456** on the host machine to avoid using common ports.

```bash
docker-compose up -d
```

The application will be accessible at `http://localhost:7456`

**Note:** 
- Container port: 3001 (internal)
- Host port: 7456 (external access)

### Architecture

- **Frontend**: Vue 3 with TypeScript, Vite, and Tailwind CSS
- **Backend**: Express.js API server with Socket.io for real-time communication
- **Game Engine**: Texas Hold'em poker game logic
- **Room Manager**: Multiplayer game session management

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).
