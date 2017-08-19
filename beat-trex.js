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

const learn = () => {
	if(!Runner.instance_.playing && !Runner.instance_.crashed) return;
	//if(Runner.instance_.horizon.obstacles.length <= 0) return;

	let input_array = [Runner.instance_.tRex.yPos, Runner.instance_.currentSpeed];
	Runner.instance_.horizon.obstacles.slice(0, seeing_obstacles).forEach((v) => {
		input_array.push(v.xPos, v.yPos, v.typeConfig.width, v.typeConfig.height);
	});

	while(input_array.length < num_inputs){
		input_array.push(-10, 100, 0, 0);
	}

	if(input_array.length !== num_inputs) alert("Error! input array size!");

	const action = brain.forward(input_array);
	actions[action]();

	const lastObstacle = Runner.instance_.horizon.obstacles[0];
	let lastObstacleData = '{}';
	if(lastObstacle) lastObstacleData = {
		x: lastObstacle.xPos,
		y: lastObstacle.yPos,
		w: lastObstacle.typeConfig.width,
		h: lastObstacle.typeConfig.height
	};

	const rewardData = JSON.stringify({
		score: parseInt(Runner.instance_.distanceMeter.digits.join(''), 10),
		crashed: Runner.instance_.crashed,
		before: before,
		speed: Runner.instance_.currentSpeed,
		lastObstacle: lastObstacleData
	});

	before = action;
	next = postSync('api')(`id=${id}&data=${encodeURIComponent(rewardData)}`);

	setTimeout(learn, 20);
};

learn();
