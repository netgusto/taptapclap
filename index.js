const http = require('http');
const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');
const url = require('url');

var staticHandler = serveStatic('./front/dist');

const server = http.createServer((req, res) => {
    if(req.headers['x-forwarded-proto']!='https') {
        // Redirect to https
        res.writeHead(302, {
            'Location': `https://${req.headers.host}${req.url}`
        });
        res.end();
    } else {
        staticHandler(req, res, finalhandler(req, res));
    }
});

const io = require('socket.io')(server);
io.on('connection', client => {
    client.on('clap', unsafedata => {
        if ('clipx' in unsafedata && 'clipy' in unsafedata) {
            const safedata = {
                clipx: Math.min(1, Math.max(0, parseFloat(unsafedata.clipx))),
                clipy: Math.min(1, Math.max(0, parseFloat(unsafedata.clipy))),
            };
            console.log(new Date().toUTCString(), safedata)
            client.broadcast.emit('clap', safedata);
        }
    });
    client.on('disconnect', () => { console.log("disconnect"); });
});

server.listen(process.env.PORT || 3000, "0.0.0.0");