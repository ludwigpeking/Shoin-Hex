class Cell {
  constructor(i, j, tiles) {
    this.i = i;
    this.j = j;
    this.collapsed = false;
    this.options = tiles.slice(); // Copy array
    this.chosen = null;
  }

  checkNeighbors(grid) {
    if (this.j < rows - 1) {
      let up = grid[this.i][this.j + 1];
      if (!up.collapsed) {
        up.options = checkValid(up.options, this.chosen.up);
      }
    }
    if (this.i < cols - 1) {
      let right = grid[this.i + 1][this.j];
      if (!right.collapsed) {
        right.options = checkValid(right.options, this.chosen.right);
      }
    }
    if (this.j > 0) {
      let down = grid[this.i][this.j - 1];
      if (!down.collapsed) {
        down.options = checkValid(down.options, this.chosen.down);
      }
    }
    if (this.i > 0) {
      let left = grid[this.i - 1][this.j];
      if (!left.collapsed) {
        left.options = checkValid(left.options, this.chosen.left);
      }
    }
  }
}

function checkValid(arr, valid) {
  for (let i = arr.length - 1; i >= 0; i--) {
    let element = arr[i];
    if (valid.indexOf(element) === -1) {
      arr.splice(i, 1);
    }
  }
  return arr;
}

export default Cell;
