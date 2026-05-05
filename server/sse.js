let clients = [];

export function sseHandler(req, res, next) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };

  clients.push(newClient);

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
}

export function broadcastEvent(type, payload) {
  const data = JSON.stringify({ type, payload });
  clients.forEach(client => {
    client.res.write(`data: ${data}\n\n`);
  });
}
