const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const index = require('./router');

const app = new Koa();

app.use(bodyParser());
app.use(index);

app.listen(8080);
