const router = require('koa-router')();
const send = require('koa-send');

router.post('/api', async (ctx, next) => {
	const body = ctx.request.body;
	if(!body.instanceId) return next(new Error("No Instance!"));
	if(!body.forward) return next(new Error("No input!"));
	
	const action = global.tRex.forward(body.instanceId);
	ctx.body = action;

	if(!body.data) return;

	await global.tRex.backward(
		JSON.parse(body.data),
		body.instanceId
	);
});

router.get('/vis', async ctx => {
	ctx.body = global.tRex.visualize();
});

router.get('/create', async ctx => {
	ctx.body = global.tRex.createInstance();
});

router.get('/save', async ctx => {
	global.tRex.exportValue();
	ctx.body = '{status: ":D"}';
});

router.get('/load', async ctx => {
	global.tRex.importValue();
	ctx.body = '{status: ":)"}';
});

router.get('/', async ctx => {
	await send(ctx, '/index.html');
});

module.exports = router;
