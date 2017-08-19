const Brain = require('./brain');
const fs = require('fs');

class TrexBrain {
	constructor() {
		this.num_inputs = 0; //TODO
		this.actions = ['walk', 'jump', 'duck'];
		this.temporal_window = 2;

		this.tdtrainer_options = {
			learning_rate: 0.05,
			momentum: 0.0,
			batch_size: 64,
			l2_decay: 0.01
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
	}

	get num_actions() {
		return this.actions.length;
	}

	get network_size() {
		return this.num_inputs * this.temporal_window + this.num_actions * this.temporal_window + this.num_inputs;
	}

	calcReward(data) {
		//TODO
	}

	backward(data, instanceId) {
		await this.brain.backward(calcReward(data), instanceId, data);
	}

	forward(instanceId) {
		return this.brain.forward(this.actions, instanceId);
	}

	createInstance() {
		return this.brain.generateInstance();
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
