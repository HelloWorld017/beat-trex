const Koa = require('koa');
const TrexBrain = require('./trex-brain');
const SocketIO = require('socket.io');

const bodyParser = require('koa-bodyparser');
const chalk = require('chalk');
const http = require('http');
const path = require('path');
const send = require('koa-send');
const static = require('koa-static');

const app = new Koa;
const trex = new TrexBrain;

app.use(bodyParser());
app.use(static(path.join(__dirname, '..', 'app')));

const port = process.env.PORT ? parseInt(process.env.PORT) : 80;

const server = http.Server(app.callback());
server.listen(port);

const io = SocketIO(server);
io.on('connection', socket => {
	console.log(chalk`{cyan Instance attached!}`);

	socket.emit('instance', trex.createInstance());

	socket.on('api', body => {
		if(!body.id) {
			socket.emit('api', {
				status: ':(',
				ok: false,
				error: 'No Instance!'
			});

			return;
		}

		if(!body.forward) {
			socket.emit('api', {
				status: ':(',
				ok: false,
				error: 'No Input!'
			});
		}

		const action = trex.forward(body.forward, body.id);

		if(body.data)
			trex.backward(
				body.data,
				body.id
			);

		socket.emit('api', action);
	});

	socket.on('vis', () => {
		socket.emit('vis', trex.visualize());
	});

	socket.on('save', () => {
		trex.exportValue();
		socket.emit('save', {status: ":D", ok: true});
	});

	socket.on('load', () => {
		trex.importValue();
		socket.emit('load', {status: ":)", ok: true});
	});
});

console.log(chalk`{cyan Listening} on {bgCyan Port ${port}}...`);
