const Koa = require('koa');
const Router = require('koa-router');
const TrexBrain = require('./trex-brain');

const bodyParser = require('koa-bodyparser');
const chalk = require('chalk');
const path = require('path');
const send = require('koa-send');
const static = require('koa-static');

const app = new Koa;
const router = new Router;
const trex = new TrexBrain;

router
	.post('/api', async ctx => {
		const body = ctx.request.body;
		if(!body.id) {
			ctx.status = 403;
			ctx.body = JSON.stringify({
				status: ':(',
				ok: false,
				error: 'No Instance!'
			});
			return;
		}

		if(!body.forward) {
			ctx.status = 403;
			ctx.body = JSON.stringify({
				status: ':(',
				ok: false,
				error: 'No Input!'
			});
		}

		const action = trex.forward(body.forward, body.id);
		ctx.body = action;

		if(!body.data) return;

		await trex.backward(
			body.data,
			body.id
		);
	})
	.get('/vis', async ctx => {
		ctx.body = trex.visualize();
	})
	.get('/create', async ctx => {
		ctx.body = trex.createInstance();
		console.log(chalk`{cyan Instance attached!}`);
	})
	.get('/save', async ctx => {
		trex.exportValue();
		ctx.body = JSON.stringify({status: ":D", ok: true});
	})
	.get('/load', async ctx => {
		trex.importValue();
		ctx.body = JSON.stringify({status: ":)", ok: true});
	});

app.use(bodyParser({
	enableTypes: 'json'
}));
app.use(static(path.join(__dirname, '..', 'app')));
app.use(router.routes());
app.use(router.allowedMethods());
app.listen(80);

console.log(chalk`{cyan Listening...}`);
