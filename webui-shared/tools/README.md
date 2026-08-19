# 生成器

两个脚本，都从 ani-rss 的**源码**直接抽，不手抄、不靠猜。

先把上游拉下来（浅克隆即可）：

```bash
git clone --depth 1 -b test https://github.com/wushuo894/ani-rss upstream
```

## gen-types.mjs

从 Java 实体生成 `webui-shared/types.ts`。

```bash
node webui-shared/tools/gen-types.mjs upstream            # 默认写回 webui-shared/types.ts
node webui-shared/tools/gen-types.mjs upstream out.ts     # 指定输出
```

**带自校验**：生成的字段数必须等于源码里的 `private` 字段数，对不上直接退出非 0。
这道校验不是形式主义 —— 开发过程中它揪出过 4 个静默丢字段的解析 bug：

- 注解里的嵌套括号（`@Schema(description = "密码 (MD5摘要)")`）会吞掉整个字段
- 类注释的捕获跨过类声明，吞掉每个类的第一个字段
- 靠缩进猜类边界，两层嵌套的内部类解析错
- 跨文件的内部类引用（`List<Mikan.Group>`）没解析成扁平名

全都不报错，只是少东西。上游改字段后重跑一次，diff 就是本次接口变更。

## extract-api.mjs

从 controller 抽出全部端点，生成 `spec-api.md`。

```bash
node webui-shared/tools/extract-api.mjs upstream
```

同样带自校验：抽出的端点必须覆盖源码里声明的每一条 mapping 路径。
当前结果为 66 个端点 / 22 个 controller。
