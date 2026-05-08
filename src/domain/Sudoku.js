export class Sudoku {
  // 私有字段：当前棋盘 + 初始题目（校验不可修改）
  _board;
  _original;

  // 构造函数：深拷贝输入，防御性拷贝测试通过
  constructor(board, original = null) {
    // 1. 校验9x9棋盘合法性
    if (!Array.isArray(board) || board.length !== 9 || board.some(row => !Array.isArray(row) || row.length !==9)) {
      throw new Error('必须传入9x9二维数组棋盘');
    }
    
    // 2. 校验棋盘中的数值：必须是0-9的整数
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const val = board[i][j];
        if (!Number.isInteger(val) || val < 0 || val > 9) {
          throw new Error(`棋盘位置[${i},${j}]必须是0-9的整数，收到: ${val}`);
        }
      }
    }
    
    // 3. 深拷贝当前棋盘（避免外部修改）
    this._board = board.map(row => [...row]);
    
    // 4. 深拷贝初始题目。若传入了 original，则使用；否则当前棋盘就是初始题目
    if (original !== null) {
      if (!Array.isArray(original) || original.length !== 9 || original.some(row => !Array.isArray(row) || row.length !== 9)) {
        throw new Error('original 必须是9x9二维数组');
      }
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          const val = original[i][j];
          if (!Number.isInteger(val) || val < 0 || val > 9) {
            throw new Error(`original 位置[${i},${j}]必须是0-9的整数，收到: ${val}`);
          }
        }
      }
      this._original = original.map(row => [...row]);
    } else {
      this._original = board.map(row => [...row]);
    }
  }

  // 工厂函数：createSudoku 调用
  static create(board) {
    return new Sudoku(board);
  }

  // 检查指定值在行中是否有冲突（除了目标位置）
  _hasConflictInRow(row, value) {
    return this._board[row].some((val, col) => val === value && val !== 0);
  }

  // 检查指定值在列中是否有冲突（除了目标位置）
  _hasConflictInCol(col, value) {
    return this._board.some((row, idx) => this._board[idx][col] === value && value !== 0);
  }

  // 检查指定值在九宫格中是否有冲突
  _hasConflictInBox(row, col, value) {
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = boxRow; i < boxRow + 3; i++) {
      for (let j = boxCol; j < boxCol + 3; j++) {
        if (this._board[i][j] === value && value !== 0) {
          return true;
        }
      }
    }
    return false;
  }

  // 获取指定单元格的候选数列表（行/列/宫约束）
  getCandidates(row, col) {
    if (!Number.isInteger(row) || row < 0 || row >= 9 || !Number.isInteger(col) || col < 0 || col >= 9) {
      throw new Error('位置超出范围');
    }

    if (this._original[row][col] !== 0) return [];
    if (this._board[row][col] !== 0) return [];

    const candidates = [];
    for (let value = 1; value <= 9; value++) {
      if (!this._hasConflictInRow(row, value) && !this._hasConflictInCol(col, value) && !this._hasConflictInBox(row, col, value)) {
        candidates.push(value);
      }
    }

    return candidates;
  }

  // 寻找“唯一候选值”的下一步提示
  getNextStepHint() {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (this._board[row][col] !== 0) continue;

        const candidates = this.getCandidates(row, col);
        if (candidates.length === 1) {
          return { row, col, value: candidates[0] };
        }
      }
    }

    return null;
  }

  // guess 直接修改原实例；冲突不在这里拦截，交给 UI 的红色标记提示
  guess(row, col, value, options = {}) {
    // 1. 兼容测试的两种传参：{row,col,value} 或 单独参数
    let r = row, c = col, v = value;
    let allowConflict = Boolean(options && options.allowConflict);
    if (typeof row === 'object' && row !== null) {
      r = row.row;
      c = row.col;
      v = row.value;
      allowConflict = Boolean(row.allowConflict);
    }

    // 2. 基础校验（位置/数字范围）
    if (!Number.isInteger(r) || r < 0 || r >= 9 || !Number.isInteger(c) || c < 0 || c >= 9) {
      throw new Error('位置超出范围');
    }
    if (!Number.isInteger(v) || v < 0 || v > 9) {
      throw new Error('数字必须在0-9之间');
    }

    // 3. 检查初始数字不可修改
    if (this._original[r][c] !== 0) {
      throw new Error('不能修改题目初始数字');
    }

    // 4. 直接修改原实例的 _board（测试不接收返回值，必须改原对象）
    this._board[r][c] = v;
    return this; // 可选，支持链式调用，不影响测试
  }
  // ==============================================================

  // 获取当前棋盘（深拷贝，防御性拷贝测试通过）
  getGrid() {
    return this._board.map(row => [...row]);
  }

  // 深拷贝实例（clone测试用）【关键修复】：保持 original 的引用，不重新初始化
  clone() {
    return new Sudoku(this._board, this._original);
  }

  // 序列化【关键修复】：返回深拷贝的纯数据，不暴露内部可变引用
  toJSON() {
    return {
      board: this._board.map(row => [...row]),
      original: this._original.map(row => [...row])
    };
  }

  // 反序列化（contract测试用）
  static fromJSON(json) {
    // 确保从 JSON 创建的实例有正确的 original 值
    const sudoku = new Sudoku(json.board, json.original);
    return sudoku;
  }

  // 判断棋盘是否完成（所有格子都被填满）
  isComplete() {
    return this._board.every(row => row.every(val => val !== 0));
  }

  // 判断棋盘当前状态是否有效（无冲突）
  isValid() {
    // 逐个检查每个非零数字
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const val = this._board[i][j];
        if (val !== 0) {
          // 临时移除当前位置，检查是否有冲突
          this._board[i][j] = 0;
          const hasConflict = 
            this._hasConflictInRow(i, val) ||
            this._hasConflictInCol(j, val) ||
            this._hasConflictInBox(i, j, val);
          this._board[i][j] = val;
          
          if (hasConflict) return false;
        }
      }
    }
    return true;
  }

  // ========== 核心修复：toString 正确生成长字符串，通过长度测试 ==========
  toString() {
    // 9行×每行9个数字+空格，总长度远大于20，完全符合测试要求
    return this._board.map(row => row.join(' ')).join('\n');
  }
  // ==============================================================
}