# Becauseiloveyo 自用 GKD 订阅

这是放在 `Becauseiloveyo/subscription` 仓库中的自用 GKD 订阅文件，不改动现有 LiteDict 项目代码。

## 订阅地址

GitHub raw：

```text
https://raw.githubusercontent.com/Becauseiloveyo/subscription/main/gkd.json5
```

版本检查文件：

```text
https://raw.githubusercontent.com/Becauseiloveyo/subscription/main/gkd.version.json5
```

## 当前规则策略

当前版本偏保守，避免误触：

- 默认启用：`开屏广告-通用跳过`
- 默认关闭：通用弹窗关闭、青少年模式提示、微信电脑登录确认、哔哩哔哩青少年提示、百度网盘会员活动弹窗

建议先只使用默认启用规则。确认某个弹窗确实需要自动处理后，再在 GKD 内手动启用对应规则组。

## 更新规则

每次修改 `gkd.json5` 后，需要同步把两个文件里的 `version` 加 1：

```text
gkd.json5
gkd.version.json5
```

`id` 不要随意修改。GKD 使用 `id` 判断是否为同一个订阅，修改后会导致更新失败或被识别为新订阅。

## 添加新应用规则的建议流程

1. 在 GKD 中对目标弹窗抓取快照。
2. 用网页审查工具测试选择器。
3. 先把新规则 `enable: false` 加入订阅。
4. 在手机上单独启用并观察是否误触。
5. 稳定后再决定是否默认启用。

## 维护原则

- 自用订阅不追求覆盖全部应用。
- 优先使用应用内规则，其次才使用全局规则。
- 全局规则只放低风险、短时间、明确按钮的规则。
- 弹窗类规则默认关闭，防止误点取消、确认、登录、支付等按钮。
