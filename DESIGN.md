
# 设计文档（DESIGN.md）

## 一、领域对象设计与改进

### 1. Sudoku
Sudoku 负责数独棋盘的全部核心数据与规则校验：
- 持有 9x9 棋盘数据（#board）和初始题面（#original），均为深拷贝，防止外部污染。
- 提供 `guess(row, col, value)` 方法，支持位置/对象两种参数，自动校验输入、不可修改初始数字、自动检测行/列/宫冲突。
- 支持 `clone()` 深拷贝，确保每个实例数据隔离。
- 提供 `toJSON()`/`fromJSON()`，实现序列化/反序列化，便于存档与恢复。
- `isComplete()`/`isValid()` 用于判断棋盘完成与合法性。
- `toString()` 便于调试输出棋盘。

#### 改进点：
- 明确分离棋盘数据与初始题面，防止误操作。
- 所有数据操作均防御性深拷贝，Undo/Redo 绝不串数据。
- 业务校验逻辑内聚，UI 层无需关心数独规则。

### 2. Game
Game 负责游戏会话、历史管理与 UI 交互：
- 持有当前 Sudoku 实例，所有操作都通过 Game 间接完成。
- 维护 `#history`（Undo 栈）和 `#future`（Redo 栈），每步操作前后均深拷贝，保证历史隔离。
- 提供 `guess(row, col, value)`，自动存历史、清 redo、转发到 Sudoku。
- `undo()`/`redo()` 操作严格切换棋盘快照，支持多步撤销重做。
- `canUndo()`/`canRedo()` 便于 UI 判断按钮状态。
- `toJSON()`/`fromJSON()` 支持完整存档与恢复。
- `getGrid()`/`isWon()`/`isValid()` 等接口为 UI 提供便利。

#### 改进点：
- 历史存储采用棋盘快照（深拷贝 Sudoku），保证任意撤销/重做后状态绝对一致。
- UI 只需操作 Game，无需感知底层棋盘细节。

## 二、Svelte 响应式集成方案

### 1. 响应式 store 设计
项目采用 Svelte 3 响应式机制，核心思路：
- 领域对象（Game/Sudoku）作为 store 的核心状态，所有 UI 变更均通过 store 触发。
- 通过 Svelte 的 `$store` 语法，UI 组件自动订阅 Game/Sudoku 状态。
- 领域对象变更（如 guess/undo/redo）后，store 触发 set，Svelte 自动刷新界面。

### 2. 典型流程
1. **开始新游戏**：创建 Game/Sudoku 实例，赋值到 store，UI 自动渲染新棋盘。
2. **界面渲染**：Board 组件通过 `$userGrid` 等 store 变量，直接消费 Game/Sudoku 导出的棋盘数据。
3. **用户输入**：点击单元格、输入数字时，调用 Game 的 guess 方法，store 自动更新。
4. **Undo/Redo**：UI 按钮调用 Game 的 undo/redo，store 更新，界面自动刷新。
5. **自动刷新**：所有领域对象变更均通过 store 触发，Svelte 响应式机制保证 UI 实时同步。

### 3. 关键代码片段（伪代码）
```js
// store/game.js
import { writable } from 'svelte/store';
import { createGame } from '../domain';
export const game = writable(createGame({ sudoku: ... }));

// Board.svelte
import { game } from '../stores/game';
// 通过 $game.getGrid() 获取当前棋盘
```

## 三、UI 层如何消费领域对象

- Board 组件通过 store 订阅 Game/Sudoku，渲染棋盘。
- 用户操作（输入、撤销、重做）均调用 Game 的接口，绝不直接操作数组。
- UI 只需关心 Game/Sudoku 的接口与状态，无需关心其内部实现。
- 领域对象变更后，Svelte store 自动触发 UI 刷新。

## 四、Undo/Redo、序列化与外表化

### 1. Undo/Redo
- Game 内部维护历史栈，所有操作前后均深拷贝 Sudoku，保证撤销/重做绝对安全。
- UI 只需调用 game.undo()/game.redo()，无需关心历史细节。

### 2. 序列化/反序列化
- Sudoku/Game 均实现 toJSON/fromJSON，支持完整存档与恢复。
- 所有引用类型均深拷贝，防止外部污染。

### 3. 外表化接口
- Sudoku.toString() 便于调试输出棋盘。
- Sudoku.toJSON() 便于存档与数据传输。

## 五、设计亮点与合理性说明

- 领域对象与 UI 解耦，所有业务逻辑内聚于 Sudoku/Game，UI 只需消费接口。
- Svelte 响应式机制与领域对象无缝集成，保证界面与数据一致性。
- Undo/Redo、序列化、外表化等机制均有严格数据隔离，防止状态串改。
- 设计充分考虑可维护性、可扩展性与调试便利。

## 六、附：关键接口示例

```js
// Sudoku
guess(row, col, value)
clone()
toJSON()/fromJSON()
isComplete()/isValid()
toString()

// Game
guess(row, col, value)
undo()/redo()
canUndo()/canRedo()
getGrid()
toJSON()/fromJSON()
reset(newSudoku)
```