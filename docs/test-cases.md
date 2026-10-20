# 问卷系统测试用例文档

## 一、测试环境
- **后端**：Node.js + Express
- **数据库**：MongoDB (本地端口 27017) + MongoDB Compass
- **测试工具**：VS Code Thunder Client 插件
- **启动命令**：`npm run dev`

## 二、测试用例总览表

| 编号 | 测试模块 | 测试目的 | 请求方法 | 请求路径 | 输入数据（示例） | 预期输出 | 实际结果 |
|---|---|---|---|---|---|---|---|
| T01 | 用户模块 | 注册新用户 | POST | /api/auth/register | `{"username": "test1", "password": "123456"}` | 201 Created，返回 Token 和用户信息 | 通过 |
| T02 | 用户模块 | 重复注册 | POST | /api/auth/register | 同上（再次发送） | 409 Conflict，提示“用户名已存在” | 通过 |
| T03 | 用户模块 | 用户登录 | POST | /api/auth/login | `{"username": "test1", "password": "123456"}` | 200 OK，返回新 Token | 通过 |
| T04 | 问卷管理 | 创建问卷 | POST | /api/surveys | 包含标题、说明、多道题目和跳转规则的 JSON | 201 Created，返回问卷信息和 8 位 share_id | 通过 |
| T05 | 问卷管理 | 发布问卷 | PUT | /api/surveys/:share_id/publish | 无（Header 需带 Token） | 200 OK，status 变为 published | 通过 |
| T06 | 问卷填写 | 提交答卷（正常） | POST | /api/surveys/:share_id/responses | q1 选 opt_yes，q3 填 50000 | 201 Created，返回 jump_path: ["q1", "q3"] | 通过 |
| T07 | 问卷填写 | 提交答卷（匿名） | POST | /api/surveys/:share_id/responses | 不传 Authorization 头，Body 同上 | 201 Created，respondent_id 为 null | 通过 |
| T08 | 校验逻辑 | 必答题未填 | POST | /api/surveys/:share_id/responses | Body 中缺少 q1 的答案 | 400 Bad Request，提示“题目为必答题” | 通过 |
| T09 | 校验逻辑 | 数字超范围 | POST | /api/surveys/:share_id/responses | q3 填写 99999999（最大值 100000） | 400 Bad Request，提示“数值不能大于 100000” | 通过 |
| T10 | 统计模块 | 查看统计结果 | GET | /api/surveys/:share_id/stats | Header 需带创建者 Token | 200 OK，返回各题统计结果 | 通过 |
| T11 | 权限控制 | 越权查看统计 | GET | /api/surveys/:share_id/stats | Header 携带非创建者 Token | 403 Forbidden，提示无权限查看 | 通过 |

## 三、详细测试步骤与记录

### T01 用户注册测试
1. 打开 Thunder Client，新建 POST 请求，URL 填入 `http://localhost:3000/api/auth/register`。
2. 点击 Body -> JSON，输入：
   ```json
   {
     "username": "test1",
     "password": "123456"
   }
   ```
3. 点击 Send。预期状态码为 201 Created，响应体中包含 `token`。
4. **实际结果**：返回了正确的 Token，测试通过。并打开 MongoDB Compass 确认密码字段已被 bcrypt 加密。

### T02 用户注册测试（重复用户名）
1. 保持刚才的 URL 和 Body 不变，再次点击 Send。 
2. 预期返回 409 Conflict，提示“用户名已存在”。
3. **实际结果**：接口成功拦截，返回 409 错误，验证了数据库唯一索引和错误处理逻辑有效。

### T03 用户登录测试
1. 新建 POST 请求，URL 填入 `http://localhost:3000/api/auth/login`。  
2. Body 选 JSON，输入： 
    json
    
    {
      "username": "test1",
      "password": "123456"
    }  
3. 点击 Send。预期返回 200 OK，并且携带新的 Token。
4. **实际结果**：成功返回 Token，后续接口测试均使用此 Token 进行鉴权。

### T04 创建问卷测试
1. 新建 POST 请求，URL 填入 `http://localhost:3000/api/surveys`。   
2. 在 Headers 中添加 `Authorization: Bearer <你的Token>`。   
3. Body 选 JSON，输入包含题目、选项、校验规则和跳转规则的复杂问卷结构：   
    json
    
    {
      "title": "大学生就业调查",
      "description": "感谢您的参与",
      "allow_anonymous": true,
      "questions": [
        {
          "question_id": "q1",
          "type": "single",
          "title": "你是否有工作？",
          "required": true,
          "options": [
            { "option_id": "opt_yes", "label": "有", "value": "yes" },
            { "option_id": "opt_no", "label": "没有", "value": "no" }
          ],
          "jump_rules": [
            { "operator": "equals", "value": "opt_yes", "action": "jump", "target_question_id": "q3" }
          ]
        },
        {
          "question_id": "q3",
          "type": "number",
          "title": "你的期望薪资是多少？",
          "required": false,
          "validation": { "min_value": 1000, "max_value": 100000 }
        }      ]
   }
4. 点击 Send。预期返回 201 Created，并返回包含 8 位 share_id 的问卷对象。  
5. **实际结果**：成功返回 `share_id: "95d01833"`，嵌套文档结构成功保存至 MongoDB。
   
### T05 问卷发布测试
1. 之前创建的问卷默认状态是 `draft`（草稿），直接提交答卷会报 403 错误。
2. 新建 PUT 请求 `http://localhost:3000/api/surveys/95d01833/publish`。
3. 在 Headers 添加 `Authorization: Bearer <Token>`。
4. 点击 Send，返回 200 OK，status 更新为 published。
5. **实际结果**：发布成功，为后续提交答卷铺平了道路。

### T06 & T07 提交答卷与匿名测试
1. 新建 POST 请求 `http://localhost:3000/api/surveys/95d01833/responses`。
2. **测试匿名提交**：不加 Headers 里的 Authorization，Body 输入 q1 和 q3 的答案，点击 Send，返回 201 Created。
3. **测试登录提交**：添加 Authorization 头，再次发送，依然返回 201 Created，且 `jump_path` 计算正确。
4. **实际结果**：成功提交了多份答卷，跳转逻辑按预期执行。

### T08 校验逻辑测试（必答题未填）
1. 发送 POST 请求到 `/api/surveys/95d01833/responses`。  
2. Body 中故意缺少必答题 q1 的答案.
3. 预期返回 400 Bad Request，提示“题目为必答题”。   
4. **实际结果**：接口成功拦截，返回 400 错误，验证了必答校验逻辑有效。
   
### T09 数字超范围校验测试
1. 提交答卷时，把 q3（期望薪资，最大限制 100000）的值填成 `99999999`。
2. 点击 Send。
3. **实际结果**：接口返回 400 Bad Request，响应体为 `{"message": "答案校验失败", "question_id": "q3", "error": "数值不能大于 100000"}`，成功拦截了非法数据。

### T10 统计接口测试
1. 新建 GET 请求 `http://localhost:3000/api/surveys/95d01833/stats`。
2. 在 Headers 携带创建者 `test1` 的 Token。
3. 点击 Send。
4. **实际结果**：成功返回 `200 OK`。单选题 q1 统计结果为：`"opt_yes": 3` 票，`"opt_no": 1` 票；数字题 q3 返回 `average: 57500`，样本数 `count: 4`。数据与提交的答卷完全吻合，证明聚合管道逻辑正确。

### T11 权限控制测试（越权查看统计）
1. 使用另一个账号（如 `test2`）登录获取 Token。
2. 发送 GET 请求 `http://localhost:3000/api/surveys/95d01833/stats`，带上 test2 的 Token。
3. 预期返回 403 Forbidden。
4. **实际结果**：接口返回 403 并提示无权限，验证了权限校验逻辑的严密性。

## 四、测试结论
经过全面的接口测试，本系统在第一阶段实现了完整的功能闭环：用户鉴权安全可靠、问卷数据结构设计合理、跳转与校验逻辑严密、统计聚合准确无误。系统运行稳定，无严重 Bug。