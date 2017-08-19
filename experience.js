class Experience{
	constructor(state0, action0, reward0, state1) {
		this.state0 = state0;
		this.action0 = action0;
		this.reward0 = reward0;
		this.state1 = state1;
	}

	exportData() {
		return this;
	}
}

module.exports = Experience;
