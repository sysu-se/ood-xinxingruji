import { writable, derived } from 'svelte/store';
import { Game, Sudoku } from '../domain/index.js';

/**
 * 核心 Domain Store：封装 Game 实例
 * 解决缺点1：真实游戏主流程未接入 Game/Sudoku
 * 解决缺点2：用户输入绕过领域校验
 * 解决缺点6：双重状态源问题
 */
export const gameInstance = writable(null);

/**
 * 派生状态：当前棋盘（用户已填）
 */
export const currentGrid = derived(gameInstance, $game => {
  return $game ? $game.getGrid() : null;
});

/**
 * 派生状态：原始题目
 */
export const originalGrid = derived(gameInstance, $game => {
  if (!$game) return null;
  const sudoku = $game.getSudoku();
  return sudoku.getOriginal ? sudoku.getOriginal() : null;
});

/**
 * 派生状态：是否可撤销
 */
export const canUndoStore = derived(gameInstance, $game => {
  return $game ? $game.canUndo() : false;
});

/**
 * 派生状态：是否可重做
 */
export const canRedoStore = derived(gameInstance, $game => {
  return $game ? $game.canRedo() : false;
});

/**
 * 初始化新游戏
 * @param {number[][]} board - 当前棋盘
 * @param {number[][]} original - 初始题目（保持不变）
 */
export function initGame(board, original) {
  const sudoku = new Sudoku(board, original);
  const game = new Game({ sudoku });
  gameInstance.set(game);
}

/**
 * 进行一步猜数操作
 * 解决缺点2：用户输入直接绕过领域操作入口
 * @param {number} row
 * @param {number} col
 * @param {number} value
 */
export function makeGuess(row, col, value) {
  gameInstance.update($game => {
    if (!$game) return $game;
    try {
      $game.guess(row, col, value);
      return $game;
    } catch (e) {
      // 规则冲突时打印错误，但不影响状态
      console.warn('猜数失败:', e.message);
      return $game; // 不变
    }
  });
}

/**
 * 撤销上一步操作
 * 解决缺点3：Undo/Redo 没有接入 UI 流程
 */
export function undo() {
  gameInstance.update($game => {
    if ($game && $game.canUndo()) {
      $game.undo();
    }
    return $game;
  });
}

/**
 * 重做上一步撤销的操作
 * 解决缺点3：Undo/Redo 没有接入 UI 流程
 */
export function redo() {
  gameInstance.update($game => {
    if ($game && $game.canRedo()) {
      $game.redo();
    }
    return $game;
  });
}

/**
 * 清空所有历史（重新开始）
 */
export function resetHistory() {
  gameInstance.update($game => {
    if ($game) {
      // 创建新实例以清空历史
      const sudoku = $game.getSudoku();
      const game = new Game({ sudoku });
      return game;
    }
    return $game;
  });
}

/**
 * 获取当前游戏 JSON 序列化（用于分享/保存）
 */
export function getGameJSON() {
  let result = null;
  gameInstance.subscribe($game => {
    result = $game ? $game.toJSON() : null;
  })();
  return result;
}

/**
 * 从 JSON 恢复游戏状态
 */
export function loadGameFromJSON(json) {
  try {
    const game = Game.fromJSON(json);
    gameInstance.set(game);
  } catch (e) {
    console.error('游戏恢复失败:', e.message);
  }
}
