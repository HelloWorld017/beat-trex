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

const trex = new TrexBrain;

let id = trex.createInstance();
let jumped = 0;
let before = 'walk';

window.onGameOver = () => {
	jumped = 0;
	trex.reset();
};

const save = () => trex.exportValue();
const load = () => trex.importValue();
const luminosity = (r, g, b) =>
	0.2126 * Math.pow(r / 255, 2.2) + 0.7152 * Math.pow(g / 255, 2.2) + 0.0722 * Math.pow(b / 255, 2.2);
const blend = (channel, alpha) =>
	channel * alpha + 247 * (1 - alpha);

const getInput = () => {
	const data = getRewardData();
	let input_array = [Runner.instance_.tRex.yPos / 150, data.speed / 10];
	Runner.instance_.horizon.obstacles.slice(0, trex.seeing_obstacles).forEach((v) => {
		input_array.push(v.xPos / 600, v.yPos / 150, v.typeConfig.width / 600, v.typeConfig.height / 150);
	});

	while(input_array.length < trex.num_inputs){
		input_array.push(-10 / 600, 100 / 150, 0, 0);
	}

	return input_array;
};

const getRewardData = () => {
	const lastObstacle = Runner.instance_.horizon.obstacles[0];
	let lastObstacleData = {};
	if(lastObstacle) lastObstacleData = {
		x: lastObstacle.xPos,
		y: lastObstacle.yPos,
		w: lastObstacle.typeConfig.width,
		h: lastObstacle.typeConfig.height
	};

	Runner.instance_.horizon.obstacles.forEach((v) => {
		if(v.xPos + v.typeConfig.width < Runner.instance_.tRex.xPos && v.calculated === undefined) {
			jumped++;
			v.calculated = true;
		}
	});

	return {
		score: parseInt(Runner.instance_.distanceMeter.digits.join(''), 10),
		crashed: Runner.instance_.crashed,
		before: before,
		speed: Runner.instance_.currentSpeed,
		lastObstacle: lastObstacleData,
		jumpedObstacles: jumped
	};
};

const learn = () => {
	if(!Runner.instance_.playing && !Runner.instance_.crashed){
		//setTimeout(learn, 20);
		Runner.instance_.startGame();
		return;
	}

	if(!Runner.instance_.crashed) {
		if(Runner.instance_.horizon.obstacles.length <= 0) return;
		if(Runner.instance_.horizon.obstacles[0].xPos - Runner.instance_.tRex.xPos >= 200) return;
	}

	const next = trex.forward(getInput(), id);

	//Runner.instance_.update(20);

	actions[next]();

	const rewardData = getRewardData();

	before = next;
	trex.backward(rewardData, id);

	if(rewardData.crashed) Runner.instance_.restart();
};

setInterval(learn, 20);
