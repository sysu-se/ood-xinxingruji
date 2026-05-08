# EVOLUTION.md - Homework 2 Design Evolution

## 问题 1：你如何实现提示功能？

提示功能在 `Sudoku` 领域对象中实现，包含两个核心方法：

### 候选提示（Candidate Hint）
- **方法**：`Sudoku.getCandidates(row, col)` 
- **实现逻辑**：
  - 检查所有约束：目标行、目标列、所属3x3盒子
  - 返回该单元格的有效候选数数组 `[1-9]`
  - 如果该单元格已填数字，返回空数组

### 下一步提示（Next-Step Hint）
- **方法**：`Sudoku.getNextStepHint()` 
- **实现逻辑**：
  - 扫描整个棋盘，查找 `getCandidates()` 返回恰好一个候选数的单元格
  - 找到即刻返回 `{ row, col, value }`，表示该位置唯一确定的值
  - 如无此类单元格，返回 `null`

### UI 集成
- `Actions.svelte` 中的 `handleHint()` 方法支持两种模式：
  - **笔记模式**：显示候选数列表给用户
  - **正常模式**：自动填写下一步值

---

## 问题 2：你认为提示功能更属于 Sudoku 还是 Game？为什么？

**答**：提示功能属于 `Sudoku`，`Game` 负责转发。

### 理由

1. **职责分离**：
   - 提示的本质是对棋盘状态的**纯分析**，不涉及会话、历史或状态切换
   - `Sudoku` 的职责是"棋盘规则"，这完全在职责范围内

2. **可复用性**：
   - `Sudoku` 是独立的领域模型，不应该知道 `Game` 的历史机制
   - 若提示属于 `Game`，则 `Game` 必须提供 `getCandidates()` 的代理，导致职责混淆

3. **设计演进的启示**：
   - 在 `Sudoku` 中实现提示，让我们认识到：**规则引擎和会话管理应该解耦**
   - 这为未来更复杂的分析功能（如高级求解器）的扩展留下了空间

4. **当前实现**：
   - `Game.getCandidateHint(row, col)` 和 `Game.getNextStepHint()` 仅作为代理
   - 它们不添加任何会话层逻辑，直接委托给 `Sudoku`
   - 这体现了"组合优于继承"的设计原则

---

## 问题 3：你如何实现探索模式？

探索模式实现为 `Game` 中的**临时会话**机制，支持平行的历史栈。

### 数据结构
```javascript
// Game 类中的探索状态
_explore = {
  active: false,           // 是否处于探索模式
  root: null,              // 探索起点的 Sudoku 快照
  history: [],             // 探索过程的移动历史
  future: [],              // 探索过程的撤销栈
  failed: Set(),           // 失败的棋盘状态哈希
  lastFailure: null        // 最后一次失败的信息
}
```

### 生命周期

#### 进入探索（startExplore）
```javascript
startExplore() {
  // 1. 保存当前 Sudoku 为快照
  this._explore.root = this._sudoku.clone();
  
  // 2. 初始化探索栈
  this._explore.active = true;
  this._explore.history = [];
  this._explore.future = [];
  this._explore.failed.clear();
}
```

#### 探索中填写（guess）
```javascript
guess(row, col, value) {
  if (this._explore.active) {
    // 允许填写冲突数字（稍后检测）
    this._sudoku.guess(row, col, value, { allowConflict: true });
    this._explore.history.push({ row, col, value });
    
    // 检测失败状态
    this._updateExploreFailure();
  } else {
    // 正常模式：标准填写
    this._sudoku.guess(row, col, value);
    this._history.push(this._sudoku.clone());
  }
}
```

#### 冲突检测（_updateExploreFailure）
```javascript
_updateExploreFailure() {
  const gridHash = this._sudoku.toString();
  
  if (this._sudoku.isValid() === false) {
    // 冲突被检测
    this._explore.lastFailure = { 
      reason: 'conflict', 
      key: gridHash 
    };
    this._explore.failed.add(gridHash);
  } else if (this._explore.failed.has(gridHash)) {
    // 到达了已知失败的状态
    this._explore.lastFailure = { 
      reason: 'repeat', 
      key: gridHash 
    };
  }
}
```

#### 回溯（backtrackExplore）
```javascript
backtrackExplore() {
  // 立即恢复探索根
  this._sudoku = this._explore.root.clone();
  this._explore.history = [];
  this._explore.future = [];
  this._explore.lastFailure = null;
}
```

#### 提交探索（commitExplore）
```javascript
commitExplore() {
  // 1. 将探索根推入主历史
  this._history.push(this._explore.root.clone());
  
  // 2. 将当前 Sudoku（包含探索的所有填写）也作为新的节点
  this._history.push(this._sudoku.clone());
  
  // 3. 清空探索状态
  this._explore.active = false;
  this._explore.root = null;
}
```

#### 放弃探索（cancelExplore）
```javascript
cancelExplore() {
  // 恢复到探索前的状态
  this._sudoku = this._explore.root.clone();
  
  // 清空探索状态
  this._explore.active = false;
  this._explore.root = null;
  this._explore.history = [];
  this._explore.future = [];
}
```

---

## 问题 4：主局面与探索局面的关系是什么？

### 对象关系

| 方面 | 说明 |
|-----|------|
| **Sudoku 实例** | **共享同一个** - `Game._sudoku` |
| **根快照** | **各自独立** - 探索有 `_explore.root` |
| **History 栈** | **完全独立** - 主history vs 探索history |
| **Future 栈** | **完全独立** - 主future vs 探索future |

### 具体案例

```
主棋盘状态：[ A → B → C ]  (主 history)

进入探索:
  快照 C 作为根
  当前棋盘仍是 C
  清空临时栈

探索中:
  C → D → E → (冲突)
  主 history 不变：[ A → B → C ]
  探索 history：[ D → E ]

回溯:
  立即回到 C（根）
  main board = C
  主 history 不变：[ A → B → C ]

提交:
  将 C 和当前棋盘推入主 history
  主 history 变为：[ A → B → C → C → 最终结果 ]
  清空探索状态

放弃:
  棋盘回到 C
  主 history 不变：[ A → B → C ]
  所有探索操作被丢弃
```

### 深拷贝与引用问题

- **使用快照机制**：每次进入探索时，通过 `Sudoku.clone()` 创建独立副本
- **Sudoku.clone() 实现**：
  ```javascript
  clone() {
    const cloned = new Sudoku(this._original.clone());
    cloned._board = this._board.map(row => [...row]);
    return cloned;
  }
  ```
- **避免污染**：主棋盘和探索根不会相互影响，因为它们是独立的对象引用

---

## 问题 5：你的 history 结构在本次作业中是否发生了变化？

### 结构本身

**否** - History 仍然是**线性栈**，未引入树状分支。

### 变化点

但在使用方式上有重大变化：

#### 变化前（Homework 1）
```javascript
Game._history  // 单一栈：所有操作都推入这里
Game._future   // 单一栈：Undo 后的操作
```

#### 变化后（Homework 2）
```javascript
// 正常模式
Game._history   // 主局面的操作历史
Game._future    // 主局面的撤销操作

// 探索模式
Game._explore.history  // 探索局面的操作
Game._explore.future   // 探索中的撤销操作
```

### 关键特性

1. **路由逻辑**：`guess()` 检查 `_explore.active` 决定推入哪个栈
2. **Undo/Redo 的适配**：
   ```javascript
   undo() {
     const stack = this._explore.active ? this._explore : this;
     // 从活跃栈中弹出
   }
   ```
3. **提交时的合并**：
   - 探索根 + 探索结果作为两个连续节点推入主 history
   - 这保持了主 history 的线性性

### 为什么不用树状结构？

1. **设计目标**：探索模式是**短期试验**，不是长期分支
2. **用户期望**：用户希望"探索、提交或放弃"，而非保存多个平行分支
3. **实现简洁性**：线性栈配合回溯足以支持所有必要操作
4. **未来扩展**：若将来需要树状分支，可在此基础上演进

---

## 问题 6：Homework 1 中的哪些设计在 Homework 2 中暴露出了局限？

### 局限 1：Sudoku 接口不足

**问题**：Homework 1 中 `Sudoku` 只支持"填数"，不支持"分析"。

**暴露时机**：实现提示功能时

**影响**：
- 最初考虑在 UI 层实现 `getCandidates()` 逻辑
- 这违反了"不在组件中重复棋盘规则"的原则

**解决**：在 `Sudoku` 中新增 `getCandidates()` 和 `getNextStepHint()`

**启示**：**领域模型应该先"包容"而非"刚好够"**

---

### 局限 2：Homework 1 的落子校验太强硬

**问题**：Homework 1 中 `guess()` 严格验证冲突，错误数字无法先进入棋盘。

**暴露时机**：实现探索模式，以及后来调整普通填数体验时

**影响**：
- 普通模式下，错误数字会被直接拦截，用户缺少即时反馈
- 探索模式虽然可以“先试”，但普通模式和探索模式的输入语义不够一致

**解决**：当前实现改为允许普通落子写入棋盘，再由 `invalidCells` 在 UI 层标红提示；探索模式继续使用 `allowConflict: true` 作为显式入口，配合 `Game` 的失败检测。

**启示**：**规则校验和错误提示最好分层处理，不要把“能不能写入”和“如何提示”绑死在一起**

---

### 局限 3：Game 的单一责任制不够灵活

**问题**：Homework 1 中 Game 只管理"主 history"。

**暴露时机**：实现探索临时栈

**影响**：
- 需要为 Game 增加平行的 `_explore` 对象
- 这使 Game 变得更"胖"，但逻辑上是必要的

**解决**：引入 `_explore` 子状态对象，区分主和临时

**启示**：**单一职责并不意味着"简单"，可能需要复合结构来管理多种生命周期**

---

### 局限 4：Undo/Redo 的通用性不足

**问题**：Homework 1 中 `undo()/redo()` 只作用于主 history。

**暴露时机**：探索模式也需要独立的 undo/redo

**影响**：
- `Game.undo()` 需要感知当前是否在探索
- 无法为探索提供独立的撤销功能

**解决**：路由逻辑
```javascript
undo() {
  const stack = this._explore.active ? this._explore : this;
  // 从活跃栈弹出
}
```

**启示**：**通用方法需要预留"上下文感知"的扩展点**

---

### 局限 5：序列化未考虑多栈场景

**问题**：Homework 1 的 `toJSON()/fromJSON()` 只序列化单一 history。

**暴露时机**：Homework 2 中需要在探索和主 history 间切换时保持状态

**影响**：
- 如果中途想保存/恢复游戏，探索状态会丢失
- 序列化格式需要扩展以支持多栈

**解决**：在 `toJSON()` 中包含 `_explore` 对象

**启示**：**序列化格式应该足够灵活，预留"可选状态"的位置**

---

## 问题 7：如果重做一次 Homework 1，你会如何修改原设计？

### 修改 1：让 Sudoku 更"智能"

#### 当前
```javascript
class Sudoku {
  guess(row, col, value) { /* 仅填数 */ }
}
```

#### 改进后
```javascript
class Sudoku {
  // 分析能力
  getCandidates(row, col) { /* 返回有效候选数 */ }
  getNextStepHint() { /* 返回下一步 */ }
  
  // 灵活的填数
  guess(row, col, value, options = {}) {
    if (!options.allowConflict) validateConflict();
    // ... 填数
  }
  
  // 明确的验证
  isValid() { /* 检查冲突 */ }
}
```

**收益**：
- Sudoku 成为真正的"规则引擎"
- Game 和 UI 可以安心依赖 Sudoku 的分析结果
- 预留了高级功能的扩展点

---

### 修改 2：为 Game 预留"会话"架构

#### 当前
```javascript
class Game {
  _history = [];
  _future = [];
}
```

#### 改进后
```javascript
class Game {
  _mainSession = new Session();
  _currentSession = this._mainSession;
  
  // 创建临时会话（用于探索）
  startExplore() {
    const tempSession = new Session(this._sudoku.clone());
    this._currentSession = tempSession;
  }
  
  commitExplore() {
    this._mainSession.merge(this._currentSession);
  }
}

class Session {
  constructor(sudokuSnapshot = null) {
    this.root = sudokuSnapshot || new Sudoku();
    this.history = [];
    this.future = [];
  }
}
```

**收益**：
- 代码更清晰，"会话"概念显式化
- 未来支持多个并行会话更容易
- 每个会话独立管理自己的历史

---

### 修改 3：显式设计"模式切换"

#### 当前（被动适应）
- 做了提示和探索后才被迫处理多栈

#### 改进后（主动设计）
```javascript
class Game {
  _mode = 'normal';  // 'normal' | 'explore' | 'analysis'
  
  setMode(newMode) {
    if (newMode === 'explore') {
      this._startExploreMode();
    } else if (newMode === 'normal') {
      this._endExploreMode();
    }
  }
  
  guess(row, col, value) {
    switch (this._mode) {
      case 'normal':
        this._strictGuess(row, col, value);
        break;
      case 'explore':
        this._flexibleGuess(row, col, value);
        break;
    }
  }
}
```

**收益**：
- 显式的模式管理，易于理解和测试
- 新增模式时无需修改核心逻辑
- UI 可以清晰地知道当前处于哪种模式

---

### 修改 4：更完善的序列化策略

#### 当前
```javascript
toJSON() {
  return {
    sudoku: this._sudoku.toJSON(),
    history: this._history.map(s => s.toJSON()),
    future: this._future.map(s => s.toJSON())
  };
}
```

#### 改进后
```javascript
toJSON() {
  return {
    sudoku: this._sudoku.toJSON(),
    mainSession: this._mainSession.toJSON(),
    currentMode: this._mode,
    // 如果在探索中，也序列化探索状态
    ...(this._mode === 'explore' && {
      exploreSession: this._currentSession.toJSON(),
      exploreFailed: Array.from(this._explore.failed)
    })
  };
}

static fromJSON(json) {
  const game = new Game();
  game._sudoku = Sudoku.fromJSON(json.sudoku);
  game._mainSession = Session.fromJSON(json.mainSession);
  
  if (json.currentMode === 'explore') {
    game._mode = 'explore';
    game._currentSession = Session.fromJSON(json.exploreSession);
    game._explore.failed = new Set(json.exploreFailed);
  }
  
  return game;
}
```

**收益**：
- 可以完整保存/恢复包括探索在内的游戏状态
- 序列化格式自描述，支持版本演进

---

### 修改 5：引入"状态机"思想

#### 当前（混合式）
- Game 中混合了正常和探索的逻辑
- 通过条件判断来分发行为

#### 改进后
```javascript
// 定义状态机
const gameStateMachine = {
  normal: {
    enter: () => { /* 初始化 */ },
    guess: (row, col, val) => { /* 严格填数 */ },
    undo: () => { /* 主栈撤销 */ },
    exit: () => { /* 清理 */ }
  },
  explore: {
    enter: () => { /* 快照 */ },
    guess: (row, col, val) => { /* 灵活填数 */ },
    undo: () => { /* 探索栈撤销 */ },
    backtrack: () => { /* 回到根 */ },
    commit: () => { /* 合并 */ },
    exit: () => { /* 清理 */ }
  }
};

class Game {
  switchState(newState) {
    gameStateMachine[this._state].exit();
    this._state = newState;
    gameStateMachine[this._state].enter();
  }
}
```

**收益**：
- 状态转换显式化，易于验证和扩展
- 每个状态的行为边界清晰
- 新增状态时影响范围小

---

## 总结：设计演进的三个洞察

### 1. **预留通道优于硬编码路径**
   - 在最初设计 Sudoku.guess() 时，就应该考虑"可选约束"
   - 这样后续不需要改动现有代码，只需启用新选项

### 2. **显式模型优于隐式适应**
   - Homework 1 完成后被动地发现需要多栈
   - 更好的做法是从一开始就显式设计"会话"或"模式"概念

### 3. **对象协作优于层级耦合**
   - 提示逻辑属于 Sudoku，不属于 UI
   - 这种职责分离让代码更易维护和测试

---


