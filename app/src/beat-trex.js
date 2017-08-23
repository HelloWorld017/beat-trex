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

window.onGameOver = () => jumped = 0;

const save = () => trex.export();
const load = () => trex.import();
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
		//setTimeout(learn, 20);
		Runner.instance_.startGame();
		setTimeout(learn, 20);
		return;
	}

	const next = trex.forward(getInput(), id);

	//Runner.instance_.update(20);
	//if(Runner.instance_.horizon.obstacles.length <= 0) return;

	actions[next]();

	const lastObstacle = Runner.instance_.horizon.obstacles[0];
	let lastObstacleData = {};
	if(lastObstacle) lastObstacleData = {
		x: lastObstacle.xPos,
		y: lastObstacle.yPos,
		w: lastObstacle.typeConfig.width,
		h: lastObstacle.typeConfig.height
	};

	Runner.instance_.horizon.obstacles.forEach((v) => {
		if(v.xPos < Runner.instance_.tRex.xPos && v.calculated === undefined) {
			jumped++;
			v.calculated = true;
		}
	});

	const rewardData = {
		score: parseInt(Runner.instance_.distanceMeter.digits.join(''), 10),
		crashed: Runner.instance_.crashed,
		before: before,
		speed: Runner.instance_.currentSpeed,
		lastObstacle: lastObstacleData,
		jumpedObstacles: jumped
	};

	before = next;
	trex.backward(rewardData, id);

	setTimeout(learn, 20);
};
