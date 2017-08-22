const Experience = require('./experience.js');
const convnetjs = require('./convnetjs/convnet.js');
const cnnutil = require('./convnetjs/util.js');

class Brain{
	// A Brain object does all the magic.
	// over time it receives some inputs and some rewards
	// and its job is to set the outputs to maximize the expected reward
	constructor(num_states, num_actions, opt) {
		var opt = opt || {};
		// in number of time steps, of temporal memory
		// the ACTUAL input to the net will be (x,a) temporal_window times, and followed by current x
		// so to have no information from previous time step going into value function, set to 0.
		this.temporal_window = typeof opt.temporal_window !== 'undefined' ? opt.temporal_window : 1;
		// size of experience replay memory
		this.experience_size = typeof opt.experience_size !== 'undefined' ? opt.experience_size : 30000;
		// number of examples in experience replay memory before we begin learning
		this.start_learn_threshold = typeof opt.start_learn_threshold !== 'undefined'? opt.start_learn_threshold : Math.floor(Math.min(this.experience_size*0.1, 1000));
		// gamma is a crucial parameter that controls how much plan-ahead the agent does. In [0,1]
		this.gamma = typeof opt.gamma !== 'undefined' ? opt.gamma : 0.8;

		// number of steps we will learn for
		this.learning_steps_total = typeof opt.learning_steps_total !== 'undefined' ? opt.learning_steps_total : 100000;
		// how many steps of the above to perform only random actions (in the beginning)?
		this.learning_steps_burnin = typeof opt.learning_steps_burnin !== 'undefined' ? opt.learning_steps_burnin : 3000;
		// what epsilon value do we bottom out on? 0.0 => purely deterministic policy at end
		this.epsilon_min = typeof opt.epsilon_min !== 'undefined' ? opt.epsilon_min : 0.05;
		// what epsilon to use at test time? (i.e. when learning is disabled)
		this.epsilon_test_time = typeof opt.epsilon_test_time !== 'undefined' ? opt.epsilon_test_time : 0.01;

		// advanced feature. Sometimes a random action should be biased towards some values
		// for example in flappy bird, we may want to choose to not flap more often
		if(typeof opt.random_action_distribution !== 'undefined') {
			// this better sum to 1 by the way, and be of length this.num_actions
			this.random_action_distribution = opt.random_action_distribution;
			if(this.random_action_distribution.length !== num_actions)
				console.log('TROUBLE. random_action_distribution should be same length as num_actions.');
			var a = this.random_action_distribution;
			var s = 0.0; for(var k=0;k<a.length;k++) { s+= a[k]; }
			if(Math.abs(s-1.0)>0.0001) console.log('TROUBLE. random_action_distribution should sum to 1!');
		} else {
			this.random_action_distribution = [];
		}

		// states that go into neural net to predict optimal action look as
		// x0,a0,x1,a1,x2,a2,...xt
		// this variable controls the size of that temporal window. Actions are
		// encoded as 1-of-k hot vectors
		//this.net_inputs = num_states * this.temporal_window + num_actions * this.temporal_window + num_states;
		this.net_inputs = num_states * (this.temporal_window + 1);
		this.num_states = num_states;
		this.num_actions = num_actions;
		this.window_size = Math.max(this.temporal_window, 2); // must be at least 2, but if we want more context even more
		this.state_window = [];
		this.action_window = [];
		this.reward_window = [];
		this.net_window = [];

		// create [state -> value of all possible actions] modeling net for the value function
		var layer_defs = [];
		if(typeof opt.layer_defs !== 'undefined') {
			// this is an advanced usage feature, because size of the input to the network, and number of
			// actions must check out. This is not very pretty Object Oriented programming but I can't see
			// a way out of it :(
			layer_defs = opt.layer_defs;
			if(layer_defs.length < 2) console.log('TROUBLE! must have at least 2 layers');
			if(layer_defs[0].type !== 'input') console.log('TROUBLE! first layer must be input layer!');
			if(layer_defs[layer_defs.length-1].type !== 'regression') console.log('TROUBLE! last layer must be input regression!');
			if(layer_defs[0].out_depth * layer_defs[0].out_sx * layer_defs[0].out_sy !== this.net_inputs) {
				console.log('TROUBLE! Number of inputs must be num_states * temporal_window + num_actions * temporal_window + num_states!');
			}
			if(layer_defs[layer_defs.length-1].num_neurons !== this.num_actions) {
				console.log('TROUBLE! Number of regression neurons should be num_actions!');
			}
		} else {
			// create a very simple neural net by default
			layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:this.net_inputs});
			if(typeof opt.hidden_layer_sizes !== 'undefined') {
				// allow user to specify this via the option, for convenience
				var hl = opt.hidden_layer_sizes;
				for(var k=0;k<hl.length;k++) {
					layer_defs.push({type:'fc', num_neurons:hl[k], activation:'relu'}); // relu by default
				}
			}
			layer_defs.push({type:'regression', num_neurons:num_actions}); // value function output
		}
		this.value_net = new convnetjs.Net();
		this.value_net.makeLayers(layer_defs);

		// and finally we need a Temporal Difference Learning trainer!
		var tdtrainer_options = {learning_rate:0.01, momentum:0.0, batch_size:64, l2_decay:0.01};
		if(typeof opt.tdtrainer_options !== 'undefined') {
			tdtrainer_options = opt.tdtrainer_options; // allow user to overwrite this
		}
		this.tdtrainer = new convnetjs.Trainer(this.value_net, tdtrainer_options);

		// experience replay
		this.experience = [];

		// various housekeeping variables
		this.age = 0; // incremented every backward()
		this.forward_passes = []; // incremented every forward()
		this.epsilon = 1.0; // controls exploration exploitation tradeoff. Should be annealed over time
		this.latest_reward = 0;
		this.last_input_array = [];
		this.average_reward_window = new cnnutil.Window(1000, 10);
		this.average_loss_window = new cnnutil.Window(1000, 10);
		this.learning = true;
		this.instances = 0;
		this.activeInstances = 0;
	}

	random_action(){
		// a bit of a helper function. It returns a random action
		// we are abstracting this away because in future we may want to
		// do more sophisticated things. For example some actions could be more
		// or less likely at "rest"/default state.
		if(this.random_action_distribution.length === 0) {
			return convnetjs.randi(0, this.num_actions);
		} else {
			// okay, lets do some fancier sampling:
			var p = convnetjs.randf(0, 1.0);
			var cumprob = 0.0;
			for(var k=0;k<this.num_actions;k++) {
				cumprob += this.random_action_distribution[k];
				if(p < cumprob) { return k; }
			}
		}
	}

	policy(s) {
		// compute the value of doing any action in this state
		// and return the argmax action and its value
		var svol = new convnetjs.Vol(1, 1, this.net_inputs);
		svol.w = s;
		var action_values = this.value_net.forward(svol);
		var maxk = 0;
		var maxval = action_values.w[0];
		for (var k = 1; k < this.num_actions; k++) {
			if (action_values.w[k] > maxval) {
				maxk = k;
				maxval = action_values.w[k];
			}
		}
		return {
			action: maxk,
			value: maxval
		};
	}

	getNetInput(xt, instanceId) {
		// return s = (x,a,x,a,x,a,xt) state vector.
		// It's a concatenation of last window_size (x,a) pairs and current state x
		const w = [];
		//w = w.concat(xt); // start with current state
		w.push(xt);
		// and now go backwards and append states and actions from history temporal_window times
		var n = this.window_size;
		for (var k = 0; k < this.temporal_window; k++) {
			// state
			//w = w.concat(this.state_window[instanceId][n - 1 - k]);
			w.push(this.state_window[instanceId][n - 1 - k]);
			// action, encoded as 1-of-k indicator vector. We scale it up a bit because
			// we dont want weight regularization to undervalue this information, as it only exists once
			/*var action1ofk = new Array(this.num_actions);
			for (var q = 0; q < this.num_actions; q++) action1ofk[q] = 0.0;
			action1ofk[this.action_window[instanceId][n - 1 - k]] = 1.0 * this.num_states;
			w = w.concat(action1ofk);*/
		}
		return w;
	}

	createInstance() {
		let instanceId = this.instances;

		if(this.activeInstances > 128) {
			console.error("Cannot allocate, deleting first one!");
			instanceId = instanceId % 128;
			this.activeInstances--;
		}

		this.forward_passes[instanceId] = 0;
		this.net_window[instanceId] = new Array(this.window_size);
		this.state_window[instanceId] = new Array(this.window_size);
		this.action_window[instanceId] = new Array(this.window_size);
		this.reward_window[instanceId] = new Array(this.window_size);

		this.instances++;
		this.activeInstances++;

		return instanceId;
	}

	forward(input_array, instanceId) {
		// compute forward (behavior) pass given the input neuron signals from body
		this.forward_passes[instanceId] += 1;
		this.last_input_array = input_array; // back this up

		// create network input
		var action;
		if (this.forward_passes[instanceId] > this.temporal_window) {
			// we have enough to actually do something reasonable
			var net_input = this.getNetInput(input_array, instanceId);
			if (this.learning) {
				// compute epsilon for the epsilon-greedy policy
				this.epsilon = Math.min(1.0, Math.max(this.epsilon_min, 1.0 - (this.age - this.learning_steps_burnin) / (this.learning_steps_total - this.learning_steps_burnin)));
			} else {
				this.epsilon = this.epsilon_test_time; // use test-time value
			}
			var rf = convnetjs.randf(0, 1);
			if (rf < this.epsilon) {
				// choose a random action with epsilon probability
				action = this.random_action();
			} else {
				// otherwise use our policy to make decision
				var maxact = this.policy(net_input);
				action = maxact.action;
			}
		} else {
			// pathological case that happens first few iterations
			// before we accumulate window_size inputs
			var net_input = [];
			action = this.random_action();
		}

		// remember the state and action we took for backward pass
		this.net_window[instanceId].shift();
		this.net_window[instanceId].push(net_input);
		this.state_window[instanceId].shift();
		this.state_window[instanceId].push(input_array);
		this.action_window[instanceId].shift();
		this.action_window[instanceId].push(action);

		return action;
	}

	async backward(wholeData, instanceId, calc) {
		const e = new Experience();
		const n = this.window_size;
		e.state0 = this.net_window[instanceId][n - 2];
		e.action0 = this.action_window[instanceId][n - 2];
		e.state1 = this.net_window[instanceId][n - 1];
		e.rewardData = wholeData;

		const reward = calc(e);
		this.latest_reward = reward;
		this.average_reward_window.add(reward);
		this.reward_window[instanceId].shift();
		this.reward_window[instanceId].push(reward);

		e.reward0 = this.reward_window[instanceId][n - 2];

		if (!this.learning) {
			return;
		}

		// various book-keeping
		this.age += 1;

		// it is time t+1 and we have to store (s_t, a_t, r_t, s_{t+1}) as new experience
		// (given that an appropriate number of state measurements already exist, of course)
		if (this.forward_passes[instanceId] > this.temporal_window + 1) {
			if(global.db) {
				await global.db
					.collection('experiences')
					.insertOne(e.exportData());
			}

			this.addToExperiences(e);
		}

		this.experienceReplay();
	}

	addToExperiences(e) {
		if (this.experience.length < this.experience_size) {
			this.experience.push(e);
		} else {
			// replace. finite memory!
			var ri = convnetjs.randi(0, this.experience_size);
			this.experience[ri] = e;
		}
	}

	experienceReplay() {
		// learn based on experience, once we have some samples to go on
		// this is where the magic happens...
		if (this.experience.length > this.start_learn_threshold) {
			var avcost = 0.0;
			for (var k = 0; k < this.tdtrainer.batch_size; k++) {
				var re = convnetjs.randi(0, this.experience.length);
				var e = this.experience[re];
				var x = new convnetjs.Vol(1, 1, this.net_inputs);
				x.w = e.state0;
				var maxact = this.policy(e.state1);
				var r = e.reward0 + this.gamma * maxact.value;
				var ystruct = {
					dim: e.action0,
					val: r
				};
				var loss = this.tdtrainer.train(x, ystruct);
				avcost += loss.loss;
			}
			avcost = avcost / this.tdtrainer.batch_size;
			this.average_loss_window.add(avcost);
		}
	}

	async loadFromDatabase(rewardFunction) {
		const dbCount = await global.db
			.collection('experiences')
			.count({});

		for(let i = 0; i < Math.ceil(dbCount / 500); i++) {
			const arrays = await global.db
				.collection('experiences')
				.find({}, {
					skip: i * 500,
					limit: 500
				}).toArray();

			for(let v of arrays) {
				const e = new Experience();
				[e.state0, e.action0, e.state1, e.rewardData] = [v.state0, v.action0, v.state1, v.rewardData];
				e.reward1 = rewardFunction(e);

				this.addToExperiences(e);
				this.experienceReplay();
			}
		}
	}

	visSelf() {
		let t = '';
		t += 'experience replay size: ' + this.experience.length + '\n';
		t += 'exploration epsilon: ' + this.epsilon + '\n';
		t += 'age: ' + this.age + '\n';
		t += 'average Q-learning loss: ' + this.average_loss_window.get_average() + '\n';
		t += 'smooth-ish reward: ' + this.average_reward_window.get_average() + '\n';
		console.log(t);
	}

	visualize() {
		return {
			'replaySize': this.experience.length,
			'epsilon': this.epsilon,
			'age': this.age,
			'loss': this.average_loss_window.get_average(),
			'reward': this.average_reward_window.get_average()
		};
	}
}


// A Brain object does all the magic.
// over time it receives some inputs and some rewards
// and its job is to set the outputs to maximize the expected reward
module.exports = Brain;
