import createServer from './createServer.js';

const server = createServer();
const port = process.env.PORT || '8081';

server.listen(port, () => {
  console.log('Server listening on port %s, Ctrl+C to quit', port);
});
