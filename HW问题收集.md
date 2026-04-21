## HW 问题收集

### 已解决

1. 如何建立 Domain Store 来封装领域对象状态？
   1. **上下文**：codex-review.md 指出真实游戏主流程未接入 Game/Sudoku 领域对象，而是继续使用旧的 stores（grid、userGrid）。这导致了双重状态源和 OOD 受损。
   2. **解决手段**：
      - 创建 `src/stores/gameInstance.js`，使用 Svelte 的 `writable` 包装 Game 实例
      - 导出 `derived` store（`currentGrid`、`originalGrid`、`canUndoStore`、`canRedoStore`）来提供组件所需的派生状态
      - 导出如 `initGame()`、`makeGuess()`、`undo()`、`redo()` 等操作函数，确保所有状态修改都经过领域对象的校验

2. 如何在保持兼容性的情况下，逐步将用户输入从直接修改数组改为调用领域操作？
   1. **上下文**：Keyboard.svelte 直接调用 `userGrid.set()`，绕过了 Game.guess() 的规则校验和历史管理。
   2. **解决手段**：
      - 在 Keyboard.svelte 中导入 `gameInstance` 和 `makeGuess`
      - 修改 `handleKeyButton()` 添加条件判断：如果 `$gameInstance` 存在则调用 `makeGuess()`，否则使用旧的 `userGrid.set()` 作为后备
      - 这样既不破坏现有功能，又能逐步过渡到新架构

3. 如何使用"先验证再执行"模式防止失败操作污染历史栈？
   1. **上下文**：原始 Game.guess() 先把状态压入历史栈，再执行猜数操作。如果猜数因规则冲突失败，历史栈已被污染。
   2. **解决手段**：
      - 在 Game.js 的 guess() 方法中，先用 `clone()` 创建一个副本
      - 在副本上尝试 `guess()`，如果抛错则直接返回（不改任何状态）
      - 验证通过后才把原实例推入历史栈，再执行真实操作
      - 这样保证了历史栈和棋盘状态的一致性

4. 冲突检测方法的参数设计如何改进以避免歧义？
   1. **上下文**：Sudoku.js 的 `#hasConflictInRow()` 等方法注释说"除了目标位置"，但实现中没有排除目标位置。这导致覆盖自己的值也被报为冲突。
   2. **解决手段**：
      - 修改冲突检测方法签名，从 `#hasConflictInRow(row, value)` 改为 `#hasConflictInRow(row, col, value)`
      - 在实现中明确排除目标位置：`c !== col && val === value && val !== 0`
      - 这样 API 语义更清晰，调用者一眼就能看出需要排除哪个位置

### 未解决

1. 旧的 stores（grid、userGrid、candidates 等）与新的 gameInstance store 如何深度集成？
   1. **上下文**：Board 组件、Actions 组件等仍然依赖旧的 @sudoku stores，而新的 gameInstance store 是独立的。当用户操作时，两边的状态可能不同步。
   2. **尝试解决手段**：
      - 在 Board.svelte 中添加了 `displayGrid = $currentGrid || $userGrid` 的逻辑，优先使用领域对象的状态
      - 但这只是表层的兼容，没有真正的双向绑定
      - 需要更完整的适配层来实现状态同步

2. 如何在不修改 @sudoku 包的情况下，使用 gameInstance 初始化游戏？
   1. **上下文**：Welcome.svelte 调用 `startNew()` 和 `startCustom()` 这两个函数来初始化游戏，但这些函数的实现在 @sudoku 包中。要真正接入领域对象，需要在这些函数的回调中调用 `gameInstance.initGame()`。
   2. **尝试解决手段**：
      - 理想方案是修改 @sudoku/game 的实现，但这超出了作业范围
      - 可以考虑在 App.svelte 或其他顶级组件中监听旧 stores 的变化，然后同步到 gameInstance
      - 但这样做会增加复杂度且容易引入 bug

3. 数独规则冲突检测与当前 UI 交互模型的矛盾如何解决？
   1. **上下文**：Sudoku.guess() 将冲突定义为异常并拒绝写入。但现有界面通过 `invalidCells` 高亮冲突，并允许用户录入冲突的数字（以便用户可以看到哪里出错）。这两种设计理念不一致。
   2. **尝试解决手段**：
      - 修改 Sudoku.guess() 的行为，改为允许写入但标记为"冲突"状态
      - 或者修改 makeGuess() 中的错误处理，在冲突时不抛出异常而是返回错误状态
      - 但这需要与设计文档中的规则定义进行协调
