const Brain = require('./brain');

let selectedMethod = 0;
let num1 = 0;
let num2 = 0;
let res = 0;

const startGame = () => {
	num1 = Math.floor(Math.random() * 9) + 1;
	num2 = Math.floor(Math.random() * 9) + 1;
	selectedMethod = Math.floor(Math.random() * 3);
	switch(selectedMethod){
		case 0:
			res = num1 + num2;
			break;

		case 1:
			res = num1 - num2;
			break;

		case 2:
			res = num1 * num2;
	}
};

const select = (number) => {
	const _ans = selectedMethod;
	startGame();
	if(_ans === number) return 1;
	return 0;
};


const num_inputs = 3;
const num_actions = 3;
const temporal_window = 1; // amount of temporal memory. 0 = agent lives in-the-moment :)
const network_size = num_inputs*temporal_window + num_actions*temporal_window + num_inputs;

const layer_defs = [];
layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:network_size});
layer_defs.push({type:'fc', num_neurons: 5, activation:'relu'});
layer_defs.push({type:'fc', num_neurons: 5, activation:'relu'});
layer_defs.push({type:'regression', num_neurons:num_actions});

const tdtrainer_options = {learning_rate:0.1, momentum:0.0, batch_size:64, l2_decay:0.01};

const opt = {};
opt.temporal_window = temporal_window;
opt.experience_size = 30000;
opt.start_learn_threshold = 1000;
opt.gamma = 0.7;
opt.learning_steps_total = 20000;
opt.learning_steps_burnin = 300;
opt.epsilon_min = 0.05;
opt.epsilon_test_time = 0.05;
opt.layer_defs = layer_defs;
opt.tdtrainer_options = tdtrainer_options;

const brain = new Brain(num_inputs, num_actions, opt);
const id = brain.generateInstance();

startGame();

setInterval(() => {
	let input_array = [num1, num2, res];

	const action = brain.forward(input_array, id);

	brain.backward(select(action), id, {});
	brain.visSelf();
}, 1);
