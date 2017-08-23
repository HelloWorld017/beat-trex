class TrexBrain {
	constructor() {
		this.seeing_obstacles = 4;
		this.num_inputs = 2 + this.seeing_obstacles * 4;
		this.actions = ['walk', 'jump', 'duck'];
		this.temporal_window = 2; //Previous input feeded by forward function

		this.layer_defs = [
			{type: 'input', out_sx: 1, out_sy: 1, out_depth: this.network_size},
			{type: 'fc', num_neurons: 40, activation: 'relu'},
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
			experience_size: 10000,
			start_learn_threshold: 3000,
			gamma: 0.6,
			learning_steps_total: 10000,
			learning_steps_burnin: 500,
			epsilon_min: 0.05,
			epsilon_test_time: 0.05,
			layer_defs: this.layer_defs,
			tdtrainer_options: this.tdtrainer_options
		};


		this.brain = new Brain(this.num_inputs, this.num_actions, this.opt);
		localStorage.setItem('trex-log.dat',
			'Time,Age,AverageReward,AverageLoss,HighScore' + '\n' +
			`${Date.now()},0,-1,-1,0` + '\n'
		);

		this.highScore = 0;
		this.latest_jumped_obs = 0;
		this.visElem = document.querySelector('#vis');

		this.calculator = this.calcReward.bind(this);
	}

	get num_actions() {
		return this.actions.length;
	}

	get network_size() {
		return this.num_inputs * this.temporal_window + this.num_actions * this.temporal_window + this.num_inputs;
	}

	calcReward(experience) {
		let reward = experience.rewardData.crashed ? -1 : 0;

		/*
		//tRex loves doing same thing
		if(experience.rewardData.before === experience.action0)
			reward += 0.01;

		//tRex loves walking straight.
		if(experience.action0 === 'walk')
			reward += 0.01;
		*/

		this.latest_jumped_obs = experience.rewardData.jumpedObstacles;

		if(!experience.rewardData.crashed)
			reward += experience.rewardData.jumpedObstacles / 20;

		return reward;
	}

	async backward(data, instanceId) {
		await this.brain.backward(data, instanceId, this.calculator);
		const vis = this.visualize();
		vis.jumpedObs = this.latest_jumped_obs;
		const visKeys = Object.keys(vis);

		if(data.score > this.highScore) this.highScore = data.score;

		//readline.moveCursor(process.stdout, 0, visKeys.length);
		//readline.cursorTo(process.stdout, 0);

		this.visElem.innerText = visKeys.map((k) => `${k}: ${vis[k]}`).join('\n');

		if(this.brain.age % 1000 === 0)
			localStorage.setItem('trex-log.dat',
				localStorage.getItem('trex-log.dat') +
				`${Date.now()},${this.brain.age},${vis.reward},${vis.loss},${this.highScore}`
			);
	}

	forward(inputArray, instanceId) {
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
			localStorage.setItem("trex-brain.dat", JSON.stringify(this.brain.value_net.toJSON()));
		}catch(e) {
			return e;
		}
	}

	importValue() {
		try{
			this.brain.value_net.fromJSON(JSON.parse(localStorage.getItem("trex-brain.dat")));
		}catch(e) {
			return e;
		}
	}
}
