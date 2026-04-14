import { Sudoku } from './Sudoku.js';

export class Game {
  // 私有字段：当前棋盘、历史栈、未来栈
  #sudoku;
  #history;
  #future;

  constructor({ sudoku }) {
    // 校验必须传入 Sudoku 实例
    if (!(sudoku instanceof Sudoku)) throw new Error('必须传入 Sudoku 实例');
    // 深拷贝初始棋盘，避免外部修改
    this.#sudoku = sudoku.clone();
    // 初始化双栈
    this.#history = [];
    this.#future = [];
  }

  // 获取当前棋盘（深拷贝，避免外部修改内部状态）
  getSudoku() {
    return this.#sudoku.clone();
  }

  // ========== 核心修复：guess 方法先存历史，再修改棋盘 ==========
  guess(row, col, value) {
    // 1. 【关键】先把操作前的当前状态，深拷贝存入历史栈
    this.#history.push(this.#sudoku.clone());
    // 2. 执行猜数操作（直接修改当前 #sudoku 实例，适配 Sudoku 类的行为）
    this.#sudoku.guess(row, col, value);
    // 3. 新操作后，清空 redo 历史（不可再重做之前的操作）
    this.#future = [];
    // 4. 支持链式调用
    return this;
  }
  // ==============================================================

  // 撤销上一步操作
  undo() {
    // 无历史可撤销，直接返回
    if (this.#history.length === 0) return this;

    // 1. 把当前状态存入未来栈（用于 redo）
    this.#future.push(this.#sudoku.clone());
    // 2. 从历史栈取出上一个状态，替换当前棋盘
    this.#sudoku = this.#history.pop();
    // 3. 支持链式调用
    return this;
  }

  // 重做上一步撤销的操作
  redo() {
    // 无操作可重做，直接返回
    if (this.#future.length === 0) return this;

    // 1. 把当前状态存入历史栈
    this.#history.push(this.#sudoku.clone());
    // 2. 从未来栈取出状态，替换当前棋盘
    this.#sudoku = this.#future.pop();
    // 3. 支持链式调用
    return this;
  }

  // 判断是否可撤销
  canUndo() {
    return this.#history.length > 0;
  }

  // 判断是否可重做
  canRedo() {
    return this.#future.length > 0;
  }

  // 深拷贝当前 Game 实例
  clone() {
    const newGame = new Game({ sudoku: this.#sudoku });
    // 深拷贝双栈，保证克隆实例完全独立
    newGame.#history = this.#history.map(sudoku => sudoku.clone());
    newGame.#future = this.#future.map(sudoku => sudoku.clone());
    return newGame;
  }

  // 序列化为 JSON【关键修复】：确保返回的是纯数据快照，不暴露内部引用
  toJSON() {
    return {
      sudoku: this.#sudoku.toJSON(),
      history: this.#history.map(s => s.toJSON()),
      future: this.#future.map(s => s.toJSON())
    };
  }

  // 从 JSON 反序列化恢复 Game 实例
  static fromJSON(json) {
    const sudoku = Sudoku.fromJSON(json.sudoku);
    const newGame = new Game({ sudoku });
    newGame.#history = json.history.map(s => Sudoku.fromJSON(s));
    newGame.#future = json.future.map(s => Sudoku.fromJSON(s));
    return newGame;
  }

  // ========== UI 层便利接口 ==========

  // 获取当前棋盘的网格（UI 层直接显示用）
  getGrid() {
    return this.#sudoku.getGrid();
  }

  // 判断游戏是否赢了（棋盘是否完成且有效）
  isWon() {
    return this.#sudoku.isComplete() && this.#sudoku.isValid();
  }

  // 判断棋盘当前是否有效
  isValid() {
    return this.#sudoku.isValid();
  }

  // 重新开始游戏（用新的 Sudoku 替换当前棋盘，清空历史）
  reset(newSudoku) {
    if (!(newSudoku instanceof Sudoku)) throw new Error('必须传入 Sudoku 实例');
    this.#sudoku = newSudoku.clone();
    this.#history = [];
    this.#future = [];
    return this;
  }

  // 清空所有操作历史（用于新局开始）
  clearHistory() {
    this.#history = [];
    this.#future = [];
    return this;
  }

  // 获取棋盘的字符串表示（用于调试）
  toString() {
    return this.#sudoku.toString();
  }
  // ==============================================================
}