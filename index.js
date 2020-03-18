const http = require('http');
const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');

var staticHandler = serveStatic('./front/dist');

const server = http.createServer((req, res) => {
    staticHandler(req, res, finalhandler(req, res))
});

const io = require('socket.io')(server);
io.on('connection', client => {
    client.on('clap', unsafedata => {
        if ('clipx' in unsafedata && 'clipy' in unsafedata) {
            client.broadcast.emit('clap', {
                clipx: Math.min(1, Math.max(0, parseFloat(unsafedata.clipx))),
                clipy: Math.min(1, Math.max(0, parseFloat(unsafedata.clipy))),
            });
        }
    });
    client.on('disconnect', () => { console.log("disconnect"); });
});

server.listen(process.env.PORT || 3000, "0.0.0.0");