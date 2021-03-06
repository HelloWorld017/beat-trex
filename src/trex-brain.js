const Brain = require('./brain');
const chalk = require('chalk');
const fs = require('fs');
//const readline = require('readline');

class TrexBrain {
	constructor() {
		this.num_inputs = 600 * 150;
		this.actions = ['walk', 'jump', 'duck'];
		this.temporal_window = 2; //Previous input feeded by forward function

		this.layer_defs = [
			{type: 'input', out_sx: 600, out_sy: 150, out_depth: 3},
			{type: 'conv', },
			{type: 'conv', sx: 5, filters: 10, stride: 1, pad: 1, activation: 'relu'},
			{type: 'pool', sx: 3, stride: 3},
			{type: 'conv', sx: 3, filters: 10, stride: 1, activation: 'relu'},
			{type: 'fc', num_neurons: 20, activation: 'relu'},
			{type: 'fc', num_neurons: 8, activation: 'relu'},
			{type: 'regression', num_neurons: this.num_actions}
		];

		this.tdtrainer_options = {
			//learning_rate: 0.05,
			learning_rate: 0.01,
			method: 'adam',
			batch_size: 64,
			l2_decay: 0.001,
			eps: 1e-8,
			beta1: 0.9,
			beta2: 0.99
		};

		this.opt = {
			temporal_window: this.temporal_window,
			experience_size: 50000,
			start_learn_threshold: 5000,
			gamma: 0.6,
			learning_steps_total: 50000,
			learning_steps_burnin: 500,
			epsilon_min: 0.05,
			epsilon_test_time: 0.05,
			layer_defs: this.layer_defs,
			tdtrainer_options: this.tdtrainer_options
		};


		this.brain = new Brain(this.num_inputs, this.num_actions, this.opt);

		if(!fs.existsSync('./trex-log.dat'))
			fs.writeFileSync('./trex-log.dat',
				'Time,Age,AverageReward,AverageLoss,HighScore' + '\n' +
				`${Date.now()},0,-1,-1,0` + '\n'
			);

		this.highScore = 0;
	}

	get num_actions() {
		return this.actions.length;
	}

	get network_size() {
		return this.num_inputs * this.temporal_window + this.num_actions * this.temporal_window + this.num_inputs;
	}

	calcReward(experience) {
		let reward = experience.rewardData.crashed ? -1 : 0;

		//tRex loves doing same thing
		if(experience.rewardData.before === experience.action0)
			reward += 0.01;

		//tRex loves walking straight.
		if(experience.action0 === 'walk')
			reward += 0.01;

		console.log(experience.rewardData);
		console.log(experience.rewardData.jumpedObstacles);
		if(!experience.rewardData.crashed)
			reward += experience.rewardData.score / 1000 + experience.rewardData.jumpedObstacles / 20;

		return reward;
	}

	async backward(data, instanceId) {
		await this.brain.backward(data, instanceId, this.calcReward);
		const vis = this.visualize();
		const visKeys = Object.keys(vis);

		if(data.score > this.highScore) this.highScore = data.score;

		//readline.moveCursor(process.stdout, 0, visKeys.length);
		//readline.cursorTo(process.stdout, 0);

		visKeys.forEach((k) => {
			//readline.clearLine(process.stdout, 0);
			console.log(chalk`{bgBlue ${k}} : {bgCyan ${vis[k]}}`);
		});

		if(this.brain.age % 1000 === 0)
			fs.appendFileSync(
				'./trex-log.dat',
				`${Date.now()},${this.brain.age},${vis.reward},${vis.loss},${this.highScore}`
			);
	}

	forward(inputArray, instanceId) {
		console.log(this.brain.forward(inputArray, instanceId));
		return this.actions[this.brain.forward(inputArray, instanceId)];
	}

	createInstance() {
		return this.brain.createInstance();
	}

	visualize() {
		return this.brain.visualize();
	}

	exportValue() {
		try{
			fs.writeFileSync('trex-brain.dat', JSON.stringify(
				this.brain.value_net.toJSON()
			));
		}catch(e) {
			return e;
		}
	}

	importValue() {
		try{
			this.brain.value_net.fromJSON(
				JSON.parse(fs.readFileSync('trex-brain.dat'))
			);
		}catch(e) {
			return e;
		}
	}
}

module.exports = TrexBrain;
