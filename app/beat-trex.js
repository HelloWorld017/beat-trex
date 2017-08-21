const actions = {};
actions['walk'] = () => {
	Runner.instance_.tRex.setDuck(false);
};

actions['jump'] =  () => {
	Runner.instance_.tRex.setDuck(false);
	Runner.instance_.tRex.startJump(Runner.instance_.currentSpeed);
};

actions['duck'] = () => {
	if (Runner.instance_.tRex.jumping) {
		// Speed drop, activated only when jump key is not pressed.
		Runner.instance_.tRex.setSpeedDrop();
	}else Runner.instance_.tRex.setDuck(true);
};


const fetchSync = (method) => (url) => (data = null, json = false) => {
	let xhr = new XMLHttpRequest;
	xhr.open(method, `${location.href}${url}`, false);
	if(json) xhr.setRequestHeader('Content-Type', 'application/json')
	xhr.send(data);

	return xhr.responseText;
};

const getSync = fetchSync('GET');
const postSync = fetchSync('POST');

const id = getSync('create')();
let jumped = 0;
let before = 'walk';
let next = undefined;

window.onGameOver = () => jumped = 0;

const save = getSync('save');
const load = getSync('load');
const luminosity = (r, g, b) =>
	0.2126 * Math.pow(r / 255, 2.2) + 0.7152 * Math.pow(g / 255, 2.2) + 0.0722 * Math.pow(b / 255, 2.2);
const blend = (channel, alpha) =>
	channel * alpha + 247 * (1 - alpha);

const getInput = () => {
	const canvas = Runner.instance_.canvas;
	let img = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
	let input = Array(canvas.width);
	for(let y = 0; y < canvas.height; y++) {
		let offset = y * canvas.width * 4;
		let inputX = Array(canvas.width);

		for(let x = 0; x < canvas.width; x++) {
			let alpha = img[offset + x * 4 + 3] / 255;

			if (
				luminosity(
					blend(img[offset + x * 4], alpha),
					blend(img[offset + x * 4 + 1], alpha),
					blend(img[offset + x * 4 + 2], alpha)
				) > 0.5
			) inputX[x] = 0;
			else inputX[x] = 1;
		}

		input[y] = inputX;
	}
	return input;
};

const learn = () => {
	if(!Runner.instance_.playing && !Runner.instance_.crashed){
		setTimeout(learn, 20);
		return;
	}
	//if(Runner.instance_.horizon.obstacles.length <= 0) return;

	if(!next) next = postSync('api')(JSON.stringify({
		id,
		forward: getInput()
	}), true);

	actions[next]();

	const lastObstacle = Runner.instance_.horizon.obstacles[0];
	let lastObstacleData = '{}';
	if(lastObstacle) lastObstacleData = {
		x: lastObstacle.xPos,
		y: lastObstacle.yPos,
		w: lastObstacle.typeConfig.width,
		h: lastObstacle.typeConfig.height
	};

	Runner.instance_.horizon.obstacles.length.forEach((v) => {
		if(v.calculated === undefined){
			jumped++;
			v.calculated = true;
		}
	});

	const rewardData = JSON.stringify({
		score: parseInt(Runner.instance_.distanceMeter.digits.join(''), 10),
		crashed: Runner.instance_.crashed,
		before: before,
		speed: Runner.instance_.currentSpeed,
		lastObstacle: lastObstacleData,
		jumpedObstacles: jumped
	});

	before = action;

	const input = getInput();
	const feed = {
		id,
		data: rewardData,
		forward: input
	};

	next = postSync('api')(JSON.stringify(feed), true);

	setTimeout(learn, 20);
};

learn();
