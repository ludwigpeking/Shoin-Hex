class SeededRandom {
  constructor(seed = Date.now()) {
    this.m = 0x80000000; // 2**31;
    this.a = 1103515245;
    this.c = 321321;
    this.initialState = seed % this.m; // Store the initial state
    this.state = this.initialState;
  }

  // Reset the internal state to its initial value
  reset() {
    this.state = this.initialState;
  }

  // Return a random float in [0, 1)
  nextFloat() {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / this.m;
  }

  // Return a random int in [0, m)
  nextInt(m) {
    return Math.floor(this.nextFloat() * m);
  }
}

export default SeededRandom;
