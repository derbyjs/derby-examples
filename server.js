require('coffeescript/register');

//Docker related configuration, can disregard if not using Docker
if (process.env.MONGO_PORT_27017_TCP_ADDR) {
  process.env.MONGO_HOST = process.env.MONGO_PORT_27017_TCP_ADDR;
}
if (process.env.MONGO_PORT_27017_TCP_PORT) {
  process.env.MONGO_PORT = process.env.MONGO_PORT_27017_TCP_PORT;
}
if (process.env.REDIS_PORT_6379_TCP_ADDR != void 0 && process.env.REDIS_PORT_6379_TCP_PORT != void 0) {
  process.env.REDIS_HOST = process.env.REDIS_PORT_6379_TCP_ADDR;
  process.env.REDIS_PORT = process.env.REDIS_PORT_6379_TCP_PORT;
}
process.env.NODE_ENV = "production";

require('./charts/server');
require('./chat/server');
require('./codemirror/server');
require('./directory/server');
require('./hello/server');
require('./sink/server');
require('./todos/server');
require('./widgets/server');
require('./render/server');
