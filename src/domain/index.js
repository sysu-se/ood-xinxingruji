// index.js
import { Sudoku } from './Sudoku.js';
import { Game } from './Game.js';

// 作业要求的4个标准工厂函数
export function createSudoku(input) {
  return new Sudoku(input);
}

export function createSudokuFromJSON(json) {
  return Sudoku.fromJSON(json);
}

export function createGame({ sudoku }) {
  return new Game({ sudoku });
}

export function createGameFromJSON(json) {
  return Game.fromJSON(json);
}