const router = require('koa-router')();

router.post('/backward', async (ctx, next) => {
	const body = ctx.request.body;
	if(!body.instanceId) return next(new Error("No Instance!"));
	if(!body.data) return next(new Error("No Data"));

	await global.tRex.backward(
		JSON.parse(body.data),
		body.instanceId
	);

	ctx.body = '{}';
});

router.post('/forward', async ctx => {
	const body = ctx.request.body;
	if(!body.instanceId) return next(new Error("No Instance!"));

	const action = global.tRex.forward(body.instanceId);

	ctx.body = action;
});

router.get('/vis', async ctx => {
	ctx.body = global.tRex.visualize();
});

router.get('/create', async ctx => {
	ctx.body = global.tRex.createInstance();
});

module.exports = router;
