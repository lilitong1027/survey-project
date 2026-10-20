# 基于 MongoDB 的问卷系统开发 - 第一阶段项目报告

## 一、项目目标
本项目旨在开发一个简化版的在线问卷系统（类似问卷星）。第一阶段的核心目标是：
1. 支持用户注册、登录与鉴权（JWT）。
2. 支持用户创建问卷，问卷包含单选、多选、文本、数字四种题型。
3. 支持在问卷中配置题目跳转规则（选A跳转第5题等），且规则必须存储在数据库中，不能硬编码。
4. 支持其他人通过分享链接填写问卷，并进行严格的答案校验（必答、字数、范围等）。
5. 支持创建者查看问卷的自动统计结果（基于 MongoDB 聚合管道）。

## 二、系统设计

### 1. 技术栈
- **后端**：Node.js + Express
- **数据库**：MongoDB + Mongoose
- **认证**：JWT (jsonwebtoken) + bcryptjs（密码加密）
- **测试工具**：Thunder Client + MongoDB Compass
- **文档与 AI**：Markdown + ChatGPT (GPT-4)

### 2. 系统架构（MVC 分层设计）
项目采用了清晰的分层架构，便于第二阶段的扩展：
- `models/`：定义 MongoDB Schema（User, Survey, Response）。
- `controllers/`：处理 HTTP 请求和响应，参数校验，业务调度。
- `services/`：封装核心业务逻辑（validationService, jumpService, statsService）。
- `routes/`：定义 API 路由，绑定中间件和控制器。
- `middlewares/`：拦截器，包括 protect（强制登录）和 optionalAuth（可选登录）。
- `docs/`：存放项目文档、测试用例和 AI 日志。

## 三、MongoDB 数据库设计（重点，35分）

### 1. 集合拆分与设计
- **users 集合**：存储用户信息。密码使用 bcrypt 进行哈希加密，查询时默认不返回密码 (`select: false`)。
- **surveys 集合**：存储问卷。采用**内嵌文档（Embedded Documents）**设计，将题目数组 `questions`、选项 `options`、校验规则 `validation` 和跳转规则 `jump_rules` 全部内嵌在 Survey 文档中。
- **responses 集合**：存储答卷。`answers` 使用内嵌数组记录每道题的作答，并利用 `Mixed` 类型兼容不同题型的答案。

### 2. 为什么这样设计？（报告得分点）
- **为什么不用关系型数据库结构**：问卷题目和跳转规则是动态的，字段不固定。如果用 MySQL，需要拆分出 Question 表、Option 表、JumpRule 表，读写需要多次 JOIN，非常繁琐。
- **为什么适合 MongoDB**：问卷系统通常是一次性读取整份问卷（包含所有题目和逻辑），MongoDB 的文档模型天然契合这种聚合读取，一次查询即可获取所有内容。不同题型不同的字段（比如多选有限制，填空有字数限制），用 MongoDB 的 Dynamic Schema 极其灵活。
- **稳定 ID 设计**：题目和选项使用自定义的 `question_id` 和 `option_id`（字符串），而不是数组下标。这样即使题目顺序发生改变，跳转规则依然有效。
- **索引优化**：为 `share_id` 建立了唯一索引，为 `owner_id` 和 `survey_id` 建立了查询索引，提升了检索效率。

## 四、API 接口说明

| 模块 | 方法 | 路径 | 功能 | 权限 |
|---|---|---|---|---|
| 认证 | POST | /api/auth/register | 用户注册 | 公开 |
| 认证 | POST | /api/auth/login | 用户登录 | 公开 |
| 问卷 | POST | /api/surveys | 创建问卷 | 需登录 |
| 问卷 | GET | /api/surveys/mine | 获取我的问卷列表 | 需登录 |
| 问卷 | PUT | /api/surveys/:share_id/publish | 发布问卷 | 需登录 |
| 答卷 | POST | /api/surveys/:share_id/responses | 提交答卷 | 可选登录（匿名） |
| 统计 | GET | /api/surveys/:share_id/stats | 查看统计结果 | 需登录（仅创建者） |

## 五、关键逻辑说明

### 1. 跳转设计（不写死）
- 跳转规则以数据的形式存在 MongoDB 中（`jump_rules` 数组）。
- 后端 `services/jumpService.js` 中的 `calculateJumpPath` 函数负责解析这些规则。它从第一题开始，根据用户的答案和规则匹配，动态计算实际作答路径。
- 为了防止跳转死循环，在计算路径时引入了 `visited` 集合记录已访问题目，并限制了最大步数为题目总数。如果超出了，直接拒绝提交，保证系统不会死机。

### 2. 校验设计
- 校验不仅在创建问卷时进行（Schema的 pre('validate')），在用户提交答卷时也再次进行了严格的后端校验（`validationService.js`）。
- 支持必答校验、选项合法性校验（选项必须是数据库里存在的）、多选最少/最多选择数量校验、文本字数限制校验、数字范围校验。

## 六、AI 使用过程总结（15分拿分项）
在本次开发中，我大量使用了 ChatGPT 作为辅助工具，并详细记录了 `docs/ai-log.md`。主要经验如下：
- **AI 帮了什么**：快速生成了标准的 JWT 认证模板、Mongoose Schema 结构（特别是嵌套数组的设计）、MongoDB 聚合管道（`$unwind`, `$group`）的代码，以及 `optionalAuth` 这种优秀的设计思路。
- **AI 做错了/不完美的地方**：
  1. AI 生成的代码有时不包含路由挂载，导致测试时报 404 错误。
  2. AI 在修改代码时，有时会遗留旧变量名，比如把参数改成 `share_id` 却忘了在 `req.params` 里解构，导致 `ReferenceError`。
  3. AI 提供的接口使用了复杂的 `_id`，我根据用户体验改成了 8 位短 `share_id`。
- **我的修改**：我全面审查了 AI 的代码，补充了 `select: false`、统一了 API 响应格式，增加了 `protect` 和 `optionalAuth` 中间件，并且修复了状态机（Draft -> Published）导致 403 的逻辑漏洞。

## 七、测试结果
（详见 `docs/test-cases.md`）
- 使用 Thunder Client 进行了完整的 API 测试。
- **注册与登录**：密码加密成功，登录返回合法 Token。
- **问卷管理**：成功创建了包含跳转规则的复杂问卷，发布成功。
- **问卷填写**：跳转路径 (`jump_path: ["q1", "q3"]`) 计算正确。校验逻辑生效（故意填超范围数字返回400）。
- **统计接口**：使用 MongoDB 聚合管道，成功计算了单选各选项票数和数字题平均值（如 `average: 57500, count: 4`），数据完全吻合。

## 八、遇到的问题与解决方案
1. **404 Not Found**：原因是 `app.js` 中忘记挂载路由。解决：补全 `app.use('/api/...', routes)`。
2. **500 ReferenceError: survey_id/share_id is not defined**：原因是在重构代码时，只改了下面的查询语句，忘记了在函数头部从 `req.params` 中解构参数。解决：仔细查看终端堆栈报错定位到具体行数并修复。
3. **403 Forbidden 该问卷当前不可填写**：原因是问卷默认是 `draft` 草稿状态。解决：补充实现“发布问卷”的 API，将状态改为 `published` 后再提交。
4. **测试工具 URL 格式报错**：复制粘贴 Markdown 时误把反引号 `` ` `` 也复制进了 URL。解决：删除多余符号。

## 九、第一阶段总结与第二阶段展望
第一阶段我们成功地搭建了完整的基础设施，实现了从创建到统计的全流程闭环。代码严格按照 MVC 模式分层，数据库的文档设计极其贴合业务。
第二阶段，如果需求发生变更（例如新增“评分题”、“用户协作”、“问卷版本控制”），这套系统**不需要推倒重做**。我们可以通过直接在 `Survey` 模型中添加新字段、在 `validationService` 中添加新的校验分支、复用现有的 `Response` 结构和聚合管道，实现平滑的增量升级。