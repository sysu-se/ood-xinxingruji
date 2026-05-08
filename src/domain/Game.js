import { Sudoku } from './Sudoku.js';

export class Game {
  // 私有字段：当前棋盘、历史栈、未来栈
  _sudoku;
  _history;
  _future;
  _explore;

  constructor({ sudoku }) {
    // 校验必须传入 Sudoku 实例
    if (!(sudoku instanceof Sudoku)) throw new Error('必须传入 Sudoku 实例');
    // 深拷贝初始棋盘，避免外部修改
    this._sudoku = sudoku.clone();
    // 初始化双栈
    this._history = [];
    this._future = [];
    // 探索模式状态
    this._explore = null;
  }

  // 获取当前棋盘（深拷贝，避免外部修改内部状态）
  getSudoku() {
    return this._sudoku.clone();
  }

  // 获取某个格子的候选提示
  getCandidateHint(row, col) {
    return this._sudoku.getCandidates(row, col);
  }

  // 获取下一步唯一候选的提示
  getNextStepHint() {
    return this._sudoku.getNextStepHint();
  }

  // 是否处于探索模式
  isExploring() {
    return Boolean(this._explore && this._explore.active);
  }

  // 进入探索模式
  startExplore() {
    if (this.isExploring()) return false;

    this._explore = {
      active: true,
      root: this._sudoku.clone(),
      history: [],
      future: [],
      failed: new Set(),
      lastFailure: null,
    };

    return true;
  }

  // 提交探索结果
  commitExplore() {
    if (!this.isExploring()) return false;

    this._history.push(this._explore.root.clone());
    this._future = [];
    this._explore = null;
    return true;
  }

  // 放弃探索结果
  cancelExplore() {
    if (!this.isExploring()) return false;

    this._sudoku = this._explore.root.clone();
    this._explore = null;
    return true;
  }

  // 回溯到探索起点
  backtrackExplore() {
    if (!this.isExploring()) return false;

    this._sudoku = this._explore.root.clone();
    this._explore.history = [];
    this._explore.future = [];
    return true;
  }

  _getBoardKey() {
    return this._sudoku.getGrid().flat().join('');
  }

  _updateExploreFailure() {
    if (!this.isExploring()) return null;

    const key = this._getBoardKey();
    if (!this._sudoku.isValid()) {
      this._explore.failed.add(key);
      this._explore.lastFailure = { reason: 'conflict', key };
      return this._explore.lastFailure;
    }

    if (this._explore.failed.has(key)) {
      this._explore.lastFailure = { reason: 'repeat', key };
      return this._explore.lastFailure;
    }

    this._explore.lastFailure = null;
    return null;
  }

  // 获取探索失败信息
  getExploreFailure() {
    return this.isExploring() ? this._explore.lastFailure : null;
  }

  // 获取并清空探索失败信息
  consumeExploreFailure() {
    const failure = this.getExploreFailure();
    if (this.isExploring()) this._explore.lastFailure = null;
    return failure;
  }

  // ========== 核心修复：guess 方法先存历史，再修改棋盘 ==========
  guess(row, col, value) {
    if (this.isExploring()) {
      // 1. 【关键】先把操作前的当前状态，深拷贝存入探索历史栈
      this._explore.history.push(this._sudoku.clone());
      // 2. 执行猜数操作
      this._sudoku.guess(row, col, value, { allowConflict: true });
      // 3. 新操作后，清空探索 redo 历史
      this._explore.future = [];
      // 4. 更新探索失败状态
      this._updateExploreFailure();
      return this;
    }

    // 1. 【关键】先把操作前的当前状态，深拷贝存入历史栈
    this._history.push(this._sudoku.clone());
    // 2. 执行猜数操作（直接修改当前 _sudoku 实例，适配 Sudoku 类的行为）
    this._sudoku.guess(row, col, value);
    // 3. 新操作后，清空 redo 历史（不可再重做之前的操作）
    this._future = [];
    // 4. 支持链式调用
    return this;
  }
  // ==============================================================

  // 撤销上一步操作
  undo() {
    const history = this.isExploring() ? this._explore.history : this._history;
    const future = this.isExploring() ? this._explore.future : this._future;

    // 无历史可撤销，直接返回
    if (history.length === 0) return this;

    // 1. 把当前状态存入未来栈（用于 redo）
    future.push(this._sudoku.clone());
    // 2. 从历史栈取出上一个状态，替换当前棋盘
    this._sudoku = history.pop();
    // 3. 支持链式调用
    return this;
  }

  // 重做上一步撤销的操作
  redo() {
    const history = this.isExploring() ? this._explore.history : this._history;
    const future = this.isExploring() ? this._explore.future : this._future;

    // 无操作可重做，直接返回
    if (future.length === 0) return this;

    // 1. 把当前状态存入历史栈
    history.push(this._sudoku.clone());
    // 2. 从未来栈取出状态，替换当前棋盘
    this._sudoku = future.pop();
    // 3. 支持链式调用
    return this;
  }

  // 判断是否可撤销
  canUndo() {
    if (this.isExploring()) return this._explore.history.length > 0;
    return this._history.length > 0;
  }

  // 判断是否可重做
  canRedo() {
    if (this.isExploring()) return this._explore.future.length > 0;
    return this._future.length > 0;
  }

  // 深拷贝当前 Game 实例
  clone() {
    const newGame = new Game({ sudoku: this._sudoku });
    // 深拷贝双栈，保证克隆实例完全独立
    newGame._history = this._history.map(sudoku => sudoku.clone());
    newGame._future = this._future.map(sudoku => sudoku.clone());
    if (this.isExploring()) {
      newGame._explore = {
        active: true,
        root: this._explore.root.clone(),
        history: this._explore.history.map(sudoku => sudoku.clone()),
        future: this._explore.future.map(sudoku => sudoku.clone()),
        failed: new Set([...this._explore.failed]),
        lastFailure: this._explore.lastFailure ? { ...this._explore.lastFailure } : null,
      };
    }
    return newGame;
  }

  // 序列化为 JSON【关键修复】：确保返回的是纯数据快照，不暴露内部引用
  toJSON() {
    const explore = this.isExploring() ? {
      root: this._explore.root.toJSON(),
      history: this._explore.history.map(s => s.toJSON()),
      future: this._explore.future.map(s => s.toJSON()),
      failed: [...this._explore.failed],
      lastFailure: this._explore.lastFailure,
    } : null;

    return {
      sudoku: this._sudoku.toJSON(),
      history: this._history.map(s => s.toJSON()),
      future: this._future.map(s => s.toJSON()),
      explore,
    };
  }

  // 从 JSON 反序列化恢复 Game 实例
  static fromJSON(json) {
    const sudoku = Sudoku.fromJSON(json.sudoku);
    const newGame = new Game({ sudoku });
    newGame._history = json.history.map(s => Sudoku.fromJSON(s));
    newGame._future = json.future.map(s => Sudoku.fromJSON(s));
    if (json.explore && json.explore.root) {
      newGame._explore = {
        active: true,
        root: Sudoku.fromJSON(json.explore.root),
        history: (json.explore.history || []).map(s => Sudoku.fromJSON(s)),
        future: (json.explore.future || []).map(s => Sudoku.fromJSON(s)),
        failed: new Set(json.explore.failed || []),
        lastFailure: json.explore.lastFailure || null,
      };
    }
    return newGame;
  }
}