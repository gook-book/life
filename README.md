# 人生觉醒测试

手机端探索性成长自评。Next.js App Router + Supabase PostgreSQL，无 AI 接口。

## 当前功能

- 服务端校验8位授权码；16道基础题、0–8道条件追问；支持修改和本机续答。
- 四维规则报告，保存后每码锁定一份；相同答案得到相同分析内容（记录ID、生成时间不同）。
- 管理员令牌校验、每批1–100码、CSV导出、分页查询、禁用未用码、售后恢复。
- 授权码只存带服务端 pepper 的 SHA-256 摘要；明文仅生码响应返回一次。
- 原子激活、幂等重试、带签名HttpOnly会话、数据库分布式限流、RLS与显式权限撤销。

## 本地验证

Node.js 22或24；使用锁文件：

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run test:integration
```

`test:integration` 启动真正的生产Next服务，数据库传输使用隔离PostgREST模拟服务，不能当作线上全链路验收。真实数据库测试记录见 `docs/VERIFICATION.md`。

## Render 部署（当前选择）

单个 Node Web Service，数据库继续使用现有Supabase。

- 仓库：`https://github.com/gook-book/life`，分支 `main`，根目录留空。源码通过GitHub网页恢复提交。
- 构建：`npm ci --include=dev && npm run build`。
- 启动：`npm start`，监听 `0.0.0.0`；Next读取Render提供的`PORT`。
- 环境变量：`NODE_VERSION=22`，`SUPABASE_URL`，`SUPABASE_SERVICE_ROLE_KEY`，`SESSION_SECRET`，`CODE_PEPPER`，`ADMIN_TOKEN`。秘密值只在平台环境变量设置中填写。
- 默认域名自动采用Render的`RENDER_EXTERNAL_URL`；自定义域名时设置`APP_ORIGIN`。
- 拟先用free计算方案试运行，不自动开通付费服务。使用既有服务 life-awakening-test，不新建服务或数据库。
- 服务配置通过Render管理接口管理，不另设Blueprint覆盖它。

## 通用环境配置（含Vercel备选）

1. 在已有 Supabase 项目执行 `supabase.sql`。脚本可重复执行，不重置已发售码。本次已执行，详情见验证记录。
2. 以 `.env.example` 为字段清单。在托管平台的环境变量页面填写，不把真实值写入Git、聊天、截图或公开文档。
3. 配置 `SUPABASE_URL` 为现有项目地址；`SUPABASE_SERVICE_ROLE_KEY` 为该项目服务端密钥。
4. `SESSION_SECRET`、`CODE_PEPPER`、`ADMIN_TOKEN` 分别使用独立密码学随机值（推荐32随机字节的hex，即64字符）。不使用示例值。保管管理员令牌。
5. `APP_ORIGIN` 填最终 `https://域名`，无末尾斜杠。Render默认域名可由RENDER_EXTERNAL_URL自动提供。环境变量不使用 `NEXT_PUBLIC_` 前缀。
6. Vercel 导入仓库根目录，Framework选Next.js；安装 `npm ci`；构建 `npm run build`；Node.js 22。配置后部署。首页 `/`，后台 `/admin`。
7. HTTPS正式环境重新执行完整浏览器验收后再售卖。

Vercel Hobby仅限非商业个人用途；本项目销售授权码需符合商业计划条件。未获得费用授权前不要开通付费计划。可另行评估Render等托管平台，不应将Hobby称为免费商业正式方案。

## 授权码生成与发货

1. 打开 `/admin`，输入管理员令牌，选择1–100个，点击“批量生成”。
2. 立即下载CSV并确认文件可打开。CSV包含完整授权码与记录UUID。数据库无法找回明文码；未保存的批次不能发货。
3. 一张订单对应一个码，在自己的订单记录中保留 `record_id`。发给买家的只有网站链接、8位码、使用说明。
4. 发货前检查码为“未使用”。若批量生成请求因网络中断状态不明，先刷新列表核对；不要盲目反复点击生成。确认失去明文的未售码可按记录ID禁用。
5. 用户在同一浏览器刷新、中途退出后，可点击“继续探索”；进度保存本机。报告保存在服务器。提交前可修改，提交后锁定。
6. 管理令牌仅放页面内存；用完点击退出并关闭页面，不在公共电脑操作。

## 换机、清缓存与售后

1. 先核验电商订单与CSV的记录ID。不要仅凭授权码末四位认定身份（会重复）。
2. 后台找到对应已激活记录，点击“售后恢复”。将一次性链接私下发给原买家。
3. 链接24小时有效。买家领取后会话迁移，旧会话失效；报告保留；未提交答案只在旧浏览器保存，无法跨设备恢复。
4. 恢复链接用URL fragment传递，数据库只存摘要；领取后清除地址栏fragment。不可公开或放在群里。
5. 同一次激活或恢复的网络失败可在原浏览器重试；不要在重试前清除存储。
6. 会话有效30天，过期后走同一售后恢复流程。此版本不提供账号登录、多设备同时访问或每码无限次重测。

## 运维与边界

- 保护 `CODE_PEPPER`：更换它将使旧授权码及未领恢复链接失效。更换 `SESSION_SECRET` 会使全部现有会话失效。迁移应先备份并规划。
- 限流默认：激活/恢复每IP每15分钟10次、全站300次；其他API每IP每分钟120次、各桶全站2000次。共享网络可能触发限制。部署平台还应配置边缘防滥用，以避免大量被拒请求仍消耗后端资源。
- IP取Vercel转发头，其他托管平台须检查可信代理配置；全局限额独立于IP头。
- RLS启用但无公开策略是刻意设计：仅服务端 `service_role` 访问，anon/authenticated还显式撤销了表和RPC权限。
- 本测评未经心理测量学信效度验证，不是临床测评或标准化心理测试。
- `docs/original-human3.md` 是原始参考材料，未据此声明第三方材料商用授权。
