/*const TYPE_CACTUS_LARGE = 0;
const TYPE_CACTUS_SMALL = 1;
const TYPE_PTERODACTYL = 2;*/

const ACTION_WALK = 0;
const ACTION_JUMP = 1;
const ACTION_DUCK = 2;

//const num_inputs = 25; // tRex yPos, 6 * obstacle xPos yPos width height
const seeing_obstacles = 4;
const num_inputs = 2 + seeing_obstacles * 4; // tRex yPos, current speed, 2 * obstacle xPos yPos width height
const num_actions = 3; // jump, duck, no action
const temporal_window = 2; // amount of temporal memory. 0 = agent lives in-the-moment :)
const network_size = num_inputs*temporal_window + num_actions*temporal_window + num_inputs;

const layer_defs = [];
layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:network_size});
layer_defs.push({type:'fc', num_neurons: 20, activation:'relu'});
layer_defs.push({type:'fc', num_neurons: 8, activation:'relu'});
layer_defs.push({type:'regression', num_neurons:num_actions});

const tdtrainer_options = {learning_rate:0.05, momentum:0.0, batch_size:64, l2_decay:0.01};

const opt = {};
opt.temporal_window = temporal_window;
opt.experience_size = 30000;
opt.start_learn_threshold = 2500;
opt.gamma = 0.9; //Future-seeing tRex
opt.learning_steps_total = 50000;
opt.learning_steps_burnin = 500;
opt.epsilon_min = 0.05;
opt.epsilon_test_time = 0.05;
opt.layer_defs = layer_defs;
opt.tdtrainer_options = tdtrainer_options;

const brain = new deepqlearn.Brain(num_inputs, num_actions, opt);

const actions = {};
actions[ACTION_WALK] = () => {
	Runner.instance_.tRex.setDuck(false);
};

actions[ACTION_JUMP] =  () => {
	Runner.instance_.tRex.setDuck(false);
	Runner.instance_.tRex.startJump(Runner.instance_.currentSpeed);
};

actions[ACTION_DUCK] = () => {
	if (Runner.instance_.tRex.jumping) {
		// Speed drop, activated only when jump key is not pressed.
		Runner.instance_.tRex.setSpeedDrop();
	}else Runner.instance_.tRex.setDuck(true);
};

setInterval(() => {
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

	//tRex loves doing same thing
	if(index - 1 >= 0 && brain.experience[index].action0 === brain.experience[index - 1].action0)
		reward += 0.01;

	//tRex loves walking straight.
	if(index >= 0 && brain.experience[index].action0 === ACTION_WALK)
		reward += 0.01;

	brain.backward(reward);

	draw_net();
	draw_reward();
	brain.visSelf(document.getElementById('vis_area'));
}, 25);

function draw_net() {
	var canvas = document.getElementById("net_canvas");
	var ctx = canvas.getContext("2d");
	var W = canvas.width;
	var H = canvas.height;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	var L = brain.value_net.layers;
	var dx = (W - 50)/L.length;
	var x = 10;
	var y = 40;
	ctx.font="12px Verdana";
	ctx.fillStyle = "rgb(0,0,0)";
	ctx.fillText("Value Function Approximating Neural Network:", 10, 14);
	for(var k=0;k<L.length;k++) {
		if(typeof(L[k].out_act)==='undefined') continue; // maybe not yet ready
		var kw = L[k].out_act.w;
		var n = kw.length;
		var dy = (H-50)/n;
		ctx.fillStyle = "rgb(0,0,0)";
		ctx.fillText(L[k].layer_type + "(" + n + ")", x, 35);
		for(var q=0;q<n;q++) {
			var v = Math.floor(kw[q]*100);
			if(v >= 0) ctx.fillStyle = "rgb(0,0," + v + ")";
			if(v < 0) ctx.fillStyle = "rgb(" + (-v) + ",0,0)";
			ctx.fillRect(x,y,10,10);
			y += 12;
			if(y>H-25) { y = 40; x += 12};
		}
		x += 50;
		y = 40;
	}
}

function draw_reward() {
	const canvas = document.getElementById('reward_canvas');
	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.font="12px Verdana";
	ctx.fillStyle = "#000";

	ctx.fillText("Recent Rewards:", 10, 14);
	ctx.fillText("Recent Inputs:", 210, 14);
	ctx.fillText("Recent Actions:", 410, 14);

	for(let i = 0; i < 10; i++){
		const index = brain.experience.length - 1 - i;
		if(index < 0) continue;
		const experience = brain.experience[index];
		for(let j = 0; j < experience.state0.length; j++){
			ctx.fillStyle = `rgb(0, 0, ${experience.state0[j]}`;
			ctx.fillRect(210 + i * 15, 20 + j * 15, 10, 10);
		}

		//Recent Rewards
		const reward0 = Math.round(brain.experience[index].reward0 * 255);
		ctx.fillStyle = `rgb(${reward0}, ${reward0}, ${reward0})`;
		ctx.fillRect(10 + i * 15, 20, 10, 10);

		//Recent Actions
		switch(brain.experience[index].action0){
			case 0:
				ctx.fillStyle = '#ff0000';
				break;

			case 1:
				ctx.fillStyle = '#00ff00';
				break;

			case 2:
				ctx.fillStyle = '#0000ff';
				break;
		}

		ctx.fillRect(410 + i * 15, 20, 10, 10);
	}
}

function save(){
	const resp = window.confirm("현재 네트워크를 로컬 스토리지에 저장합니다. 계속하시겠습니까?");
	if(!resp) return;
	localStorage.setItem("network", JSON.stringify(brain.value_net.toJSON()));
	alert("성공적으로 가중치를 저장하였습니다!");
}

function load(){
	const resp = result = window.confirm("현재 네트워크를 로컬 스토리지에 저장된 가중치로 교체합니다. 계속하시겠습니까?");
	if(!resp) return;
	brain.value_net.fromJSON(JSON.parse(localStorage.getItem("network")));
	alert("가중치가 성공적으로 업데이트되었습니다!")
}
