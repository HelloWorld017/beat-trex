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
			start_learn_threshold: 1000,
			gamma: 0.6,
			learning_steps_total: 2000,
			learning_steps_burnin: 500,
			epsilon_min: 0.05,
			epsilon_test_time: 0.05,
			layer_defs: this.layer_defs,
			tdtrainer_options: this.tdtrainer_options
		};


		this.brain = new Brain(this.num_inputs, this.num_actions, this.opt);

		this.highScore = 0;
		this.latest_jumped_obs = 0;
		this.visElem = document.querySelector('#vis');
		this.visCanv = document.querySelector('#viscanv');

		this.scoreGraph = new cnnvis.Graph();
		this.calculator = this.calcReward.bind(this);
		this.latest_jumped_obs = 0;
		this.score_window = new cnnutil.Window(1000, 1);
		this._age = 0;
		this.episode = 0;
		this.crash = 0;

		const vis = this.visualize();

		localStorage.setItem(
			'trex-log.dat',
			Object.keys(vis).join(',') + '\n'
		);
	}

	get num_actions() {
		return this.actions.length;
	}

	get network_size() {
		return this.num_inputs * this.temporal_window + this.num_actions * this.temporal_window + this.num_inputs;
	}

	reset() {
		this.latest_jumped_obs = 0;
	}

	calcReward(experience) {
		let reward = experience.rewardData.crashed ? -1 : 1;


		//tRex loves doing same thing
		//if(experience.rewardData.before === experience.action0)
			//reward += 0.01;

		//tRex loves walking straight.
		//if(experience.action0 === 'walk')
			//reward += 0.01;


		//if(!experience.rewardData.crashed)
			//reward += experience.rewardData.jumpedObstacles / 10 + experience.rewardData.score / 100;
			//reward += experience.rewardData.jumpedObstacles - this.latest_jumped_obs;

		this.latest_jumped_obs = experience.rewardData.jumpedObstacles;

		return reward;
	}

	backward(data, instanceId) {
		if(data.jumpedObstacles <= this.latest_jumped_obs && !data.crashed) return;

		this.episode++;
		if(data.crashed) {
			this.score_window.add(data.score);
			this.crash++;
		}

		this.brain.backward(data, instanceId, this.calculator);
		const vis = this.visualize();
		const visKeys = Object.keys(vis);

		if(data.score > this.highScore) this.highScore = data.score;

		//readline.moveCursor(process.stdout, 0, visKeys.length);
		//readline.cursorTo(process.stdout, 0);

		this.visElem.innerText = visKeys.map((k) => `${k}: ${vis[k]}`).join('\n');

		if(this._age + 100 <= this.brain.age) {
			this._age = Math.floor(this.brain.age / 100) * 100;

			this.scoreGraph.add(this.brain.age, vis.score);
			this.scoreGraph.drawSelf(this.visCanv);

			localStorage.setItem('trex-log.dat',
				localStorage.getItem('trex-log.dat') +
				visKeys.map((k) => vis[k]).join(',') + '\n'
			);
		}
	}

	forward(inputArray, instanceId) {
		this.brain.experienceReplay();
		return this.actions[this.brain.forward(inputArray, instanceId)];
	}

	createInstance() {
		return this.brain.createInstance();
	}

	visualize() {
		const vis = this.brain.visualize();
		vis.time = Date.now();
		vis.jumpedObs = this.latest_jumped_obs;
		vis.score = this.score_window.get_average();
		vis.episode = this.episode;
		vis.crash = this.crash;
		vis.highScore = this.highScore;
		return vis;
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
