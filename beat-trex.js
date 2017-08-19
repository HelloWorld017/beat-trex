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

setInterval(() => {
	let xhr = new XMLHttpRequest;
	xhr.open(location.href + "/api");
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

	//const reward = Runner.instance_.crashed ? 0 : 0.8;
	//brain.backward(reward);

	/*
	//const s1 = parseInt(Runner.instance_.distanceMeter.digits.join(''), 10);
	setTimeout(() => {
		//const s2 = parseInt(Runner.instance_.distanceMeter.digits.join(''), 10);
		//const deltaS = s2 - s1;

		//const reward = Runner.instance_.crashed ? -10000 : deltaS;

	}, 500);*/

	//if(Runner.instance_.horizon.obstacles.length <= 0) return;


	//tRex hates being crashed.
	let reward = Runner.instance_.crashed ? 0 : 0.54;
	//tRex loves passing the obstacle

	if(
		!Runner.instance_.crashed &&
		Runner.instance_.horizon.obstacles.length > 0 &&
		Runner.instance_.horizon.obstacles[0].xPos - Runner.instance_.tRex.xPos <= 0) reward += 0.44;

	let index = brain.experience.length - 1;

	//tRex
}, 25);

