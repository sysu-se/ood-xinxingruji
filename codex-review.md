# con-oo-xinxingruji-2 - Review

## Review 结论

领域层有一定封装基础，但当前提交并未把 Game/Sudoku 接入真实 Svelte 游戏主流程；真实开局、渲染、输入、胜负判断、撤销重做仍由旧 stores 驱动，因此按作业要求应判为未完成关键接入，OOD 也因双状态源而明显受损。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | poor |
| OOD | poor |

## 缺点

### 1. 真实游戏主流程没有接入 Game/Sudoku

- 严重程度：core
- 位置：src/components/Modal/Types/Welcome.svelte:16-23; src/node_modules/@sudoku/game.js:13-33; src/components/Board/index.svelte:40-51
- 原因：开局仍通过 grid.generate/grid.decodeSencode 创建旧 store 状态，棋盘渲染也直接消费 $userGrid/$grid。静态检索 src 未发现 UI 对 src/domain 的导入，因此领域对象没有成为单一事实来源，不满足作业最关键的真实接入要求。

### 2. 用户输入直接修改二维数组，绕过领域操作入口

- 严重程度：core
- 位置：src/components/Controls/Keyboard.svelte:10-25; src/node_modules/@sudoku/stores/grid.js:73-87
- 原因：键盘输入直接调用 userGrid.set/applyHint 改写数组，没有经过 Game.guess 或 Sudoku 接口。这样规则校验、历史管理、序列化边界都被拆散到 store/组件中，违背了由对象维护自身状态演进的 OOP/OOD 原则。

### 3. Undo/Redo 没有接入 UI 流程

- 严重程度：core
- 位置：src/components/Controls/ActionBar/Actions.svelte:26-35; src/domain/Game.js:38-70
- 原因：领域层实现了 undo/redo/canUndo/canRedo，但操作栏两个按钮没有任何 on:click，也没有绑定可用状态，真实界面无法调用领域对象历史逻辑。这直接缺失了作业要求中的关键流程。

### 4. 失败的 guess 会污染历史栈

- 严重程度：major
- 位置：src/domain/Game.js:25-33; src/domain/Sudoku.js:84-107
- 原因：Game.guess 先把当前状态压入 history，再调用 Sudoku.guess；而 Sudoku.guess 会因越界、修改题目、冲突等抛错。静态推导可知，一旦 guess 失败，棋盘未变但 history 已新增快照，undo/redo 状态机会失真。

### 5. 领域规则与当前数独交互模型不一致

- 严重程度：major
- 位置：src/domain/Sudoku.js:97-112; src/components/Board/index.svelte:49-51; src/node_modules/@sudoku/stores/game.js:7-19
- 原因：Sudoku.guess 把出现冲突定义为异常并拒绝写入；但现有界面通过 invalidCells 高亮冲突，并以可录入但未获胜表达中间错误状态。这说明领域模型没有贴合当前游戏业务，若后续强行接入会与现有 UI 语义冲突。

### 6. 存在并行状态模型，职责边界重复

- 严重程度：major
- 位置：src/node_modules/@sudoku/stores/grid.js:44-91; src/domain/Game.js:100-130
- 原因：grid/userGrid 负责棋盘与提示写入，Game 同时又定义了 getGrid/reset/clearHistory 等 UI 便利接口，但两者没有关联。结果是同一业务概念在 store 与领域对象中重复建模，缺少单一事实来源，后续很难维护。

### 7. 冲突检测辅助方法的语义不够自洽

- 严重程度：minor
- 位置：src/domain/Sudoku.js:50-57; src/domain/Sudoku.js:60-71; src/domain/Sudoku.js:97-112
- 原因：注释写的是除了目标位置，实现却没有排除目标格；因此对已有用户数字重复填写同一个值也会报冲突。这个 API 行为并不直观，说明规则方法仍偏向为测试凑接口，而不是稳定的领域语义。

### 8. Svelte store 通过原地 mutate 返回同一引用，可工作但不够稳妥

- 严重程度：minor
- 位置：src/node_modules/@sudoku/stores/grid.js:73-87; src/node_modules/@sudoku/stores/candidates.js:10-25
- 原因：update 回调里直接改数组或对象再返回原引用，Svelte 当前实现通常仍会通知订阅者，但这种写法不利于推理，也削弱了和领域对象、快照式历史的配合。对 JS 与 Svelte 代码习惯而言不够稳健。

## 优点

### 1. Sudoku 封装了输入校验与防御性拷贝

- 位置：src/domain/Sudoku.js:7-42
- 原因：构造函数同时校验 9x9 结构、数值范围，并复制 board/original，避免外部直接破坏内部状态；这体现了基本的封装意识。

### 2. 历史与序列化职责集中在 Game

- 位置：src/domain/Game.js:9-97
- 原因：undo/redo、clone、toJSON/fromJSON 都收敛在 Game，而不是散落到组件事件中，领域层边界本身是清晰的。

### 3. 现有 Svelte 视图链路具备响应式渲染基础

- 位置：src/components/Board/index.svelte:40-51; src/node_modules/@sudoku/stores/grid.js:93-137; src/node_modules/@sudoku/stores/game.js:7-19
- 原因：棋盘渲染、冲突高亮和胜利判定都建立在 store/derived 之上，而不是手写 DOM 同步；如果后续换成 domain adapter，这条响应式消费链是可以复用的。

### 4. 领域导出面向构建和反序列化较完整

- 位置：src/domain/index.js:8-22
- 原因：同时提供类导出和 create/fromJSON 工厂，便于测试、持久化和后续做 Svelte store adapter。

## 补充说明

- 本次结论仅基于静态阅读，未运行测试，也未实际操作界面验证行为。
- 审查范围限制在 src/domain/* 及其关联的 Svelte 接入代码，主要查看了 App、Board、Controls、Welcome，以及 @sudoku 的 game/grid/game/keyboard store。
- 领域对象未接入 Svelte 主流程的判断来自静态检索和代码阅读：在 src 中未发现真实 UI 对 src/domain 下 Game/Sudoku 的导入与调用。
- 关于 history 污染、规则冲突等问题均是基于控制流推演得出的静态结论，而非运行时观测。
