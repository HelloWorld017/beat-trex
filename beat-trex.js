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

let before = 'walk';
let next = postSync('api')(`id=${id}`);

const fetchSync = (method) => (url) => (data = null) => {
	let xhr = new XMLHttpRequest;
	xhr.open(method, `${location.href}/${url}`, false);
	xhr.send(data);

	return xhr.responseText;
};

const getSync = fetchSync('GET');
const postSync = fetchSync('POST');

const id = getSync('create')();

const save = getSync('save');
const load = getSync('load');

let jumped = 0;

const learn = () => {
	if(!Runner.instance_.playing && !Runner.instance_.crashed) return;
	//if(Runner.instance_.horizon.obstacles.length <= 0) return;

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

	const canvas = Runner.instance_.canvas;
	let input = canvas.getImageData(0, 0, canvas.width, canvas.height);

	next = postSync('api')(`id=${id}&data=${encodeURIComponent(rewardData)}`);

	setTimeout(learn, 20);
};

window.onGameOver = () => jumped = 0;
learn();
