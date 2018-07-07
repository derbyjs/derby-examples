# BUILD-USING: docker build -t derbyjs/derby-examples .
# RUN-USING: docker run --name derby-examples --rm derbyjs/derby-examples

# specify base docker image
FROM node:10

# copy over dependencies
WORKDIR /var
RUN mkdir derby-examples

ADD package.json /var/derby-examples/
ADD server.js /var/derby-examples/
ADD charts /var/derby-examples/charts
ADD chat /var/derby-examples/chat
ADD codemirror /var/derby-examples/codemirror
ADD directory /var/derby-examples/directory
ADD hello /var/derby-examples/hello
ADD sink /var/derby-examples/sink
ADD todos /var/derby-examples/todos
ADD widgets /var/derby-examples/widgets
ADD render /var/derby-examples/render

# npm install all the things
WORKDIR /var/derby-examples
RUN npm_config_spin=false npm_config_loglevel=warn npm install --production

# expose any ports we need
EXPOSE 8001
EXPOSE 8002
EXPOSE 8003
EXPOSE 8004
EXPOSE 8005
EXPOSE 8006
EXPOSE 8007
EXPOSE 8008
EXPOSE 8009
# the command that gets run inside the docker container
CMD ["/usr/local/bin/node", "/var/derby-examples/server.js"]
