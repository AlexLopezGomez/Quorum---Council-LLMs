class SSEManager {
  constructor() {
    this.connections = new Map();
    this.heartbeatInterval = 15000;
  }

  addConnection(jobId, res) {
    if (!this.connections.has(jobId)) {
      this.connections.set(jobId, new Set());
    }
    this.connections.get(jobId).add(res);

    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': heartbeat\n\n');
      } else {
        clearInterval(heartbeat);
      }
    }, this.heartbeatInterval);

    res.on('close', () => {
      clearInterval(heartbeat);
      this.removeConnection(jobId, res);
    });
  }

  removeConnection(jobId, res) {
    const jobConnections = this.connections.get(jobId);
    if (jobConnections) {
      jobConnections.delete(res);
      if (jobConnections.size === 0) {
        this.connections.delete(jobId);
      }
    }
  }

  emit(jobId, event, data) {
    const jobConnections = this.connections.get(jobId);
    if (!jobConnections) return;

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const res of jobConnections) {
      if (!res.writableEnded) {
        res.write(message);
      }
    }
  }

  broadcast(event, data) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const [, jobConnections] of this.connections) {
      for (const res of jobConnections) {
        if (!res.writableEnded) {
          res.write(message);
        }
      }
    }
  }

  closeAll() {
    for (const [jobId, jobConnections] of this.connections) {
      for (const res of jobConnections) {
        if (!res.writableEnded) {
          res.end();
        }
      }
      jobConnections.clear();
    }
    this.connections.clear();
  }

  getConnectionCount(jobId) {
    return this.connections.get(jobId)?.size || 0;
  }
}

export function setSSEHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

export const sseManager = new SSEManager();
