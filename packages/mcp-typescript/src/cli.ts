import EventSource from "eventsource";
import WebSocket from "ws";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).EventSource = EventSource;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).WebSocket = WebSocket;

import express from "express";
import { Client } from "./client/index.js";
import { SSEClientTransport } from "./client/sse.js";
import { Server } from "./server/index.js";
import { SSEServerTransport } from "./server/sse.js";
import { WebSocketClientTransport } from "./client/websocket.js";
import { StdioClientTransport } from "./client/stdio.js";
import { StdioServerTransport } from "./server/stdio.js";

async function runClient(url_or_command: string, args: string[]) {
  const client = new Client({
    name: "mcp-typescript test client",
    version: "0.1.0",
  });

  let clientTransport;

  let url: URL | undefined = undefined;
  try {
    url = new URL(url_or_command);
  } catch {
    // Ignore
  }

  if (url?.protocol === "http:" || url?.protocol === "https:") {
    clientTransport = new SSEClientTransport();
    await clientTransport.connect(new URL(url_or_command));
  } else if (url?.protocol === "ws:" || url?.protocol === "wss:") {
    clientTransport = new WebSocketClientTransport();
    await clientTransport.connect(new URL(url_or_command));
  } else {
    clientTransport = new StdioClientTransport();
    await clientTransport.spawn({
      command: url_or_command,
      args,
    });
  }

  console.log("Connected to server.");

  await client.connect(clientTransport);
  console.log("Initialized.");

  await client.close();
  console.log("Closed.");
}

async function runServer(port: number | null) {
  if (port !== null) {
    const app = express();

    let servers: Server[] = [];

    app.get("/sse", async (req, res) => {
      console.log("Got new SSE connection");

      const transport = new SSEServerTransport("/message");
      const server = new Server({
        name: "mcp-typescript test server",
        version: "0.1.0",
      });

      servers.push(server);

      server.onclose = () => {
        console.log("SSE connection closed");
        servers = servers.filter((s) => s !== server);
      };

      await transport.connectSSE(req, res);
      await server.connect(transport);
    });

    app.post("/message", async (req, res) => {
      console.log("Received message");

      const sessionId = req.query.sessionId as string;
      const transport = servers
        .map((s) => s.transport as SSEServerTransport)
        .find((t) => t.sessionId === sessionId);
      if (!transport) {
        res.status(404).send("Session not found");
        return;
      }

      await transport.handlePostMessage(req, res);
    });

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}/sse`);
    });
  } else {
    const server = new Server({
      name: "mcp-typescript test server",
      version: "0.1.0",
    });

    const transport = new StdioServerTransport();
    await transport.start();
    await server.connect(transport);

    console.log("Server running on stdio");
  }
}

const args = process.argv.slice(2);
const command = args[0];
switch (command) {
  case "client":
    if (args.length < 2) {
      console.error("Usage: client <server_url_or_command> [args...]");
      process.exit(1);
    }

    runClient(args[1], args.slice(2)).catch((error) => {
      console.error(error);
      process.exit(1);
    });

    break;

  case "server": {
    const port = args[1] ? parseInt(args[1]) : null;
    runServer(port).catch((error) => {
      console.error(error);
      process.exit(1);
    });

    break;
  }

  default:
    console.error("Unrecognized command:", command);
}