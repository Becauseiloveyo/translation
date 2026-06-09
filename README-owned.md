# 我的 RackNerd VPS 自有管理脚本

这个版本不再把 `mack-a/v2ray-agent` 当作安装入口，也不会打开别人的菜单。

主脚本：

```text
my_vps_manager_owned.sh
```

## 一行运行

```bash
bash <(curl -Ls https://raw.githubusercontent.com/Becauseiloveyo/racknerd-v2ray-agent-manager/main/my_vps_manager_owned.sh)
```

第一次运行后，菜单里选：

```text
1. 首次准备
```

之后可以直接运行：

```bash
myvps
```

## 设计目标

适配当前 RackNerd VPS：

```text
blog.gooffu.tech -> nginx HTTPS -> 127.0.0.1:3000 -> blog
ad.gooffu.tech   -> nginx HTTPS -> 127.0.0.1:8080 -> AdGuardHome
2b.gooffu.tech   -> nginx stream 443 SNI -> 127.0.0.1:24443 -> Xray Reality
```

公网 443 仍然由 nginx 统一监听。脚本不会让 Xray 直接抢占公网 443。

## 主要功能

```text
1. 首次准备          装依赖、时间、BBR、快捷命令
2. 安装/重建 443 VPN 自有 Reality 节点
3. 查看状态          nginx/blog/ad/VPN/端口
4. 查看客户端配置    vless:// 链接
5. 立即备份 VPS      加密上传到 ggdrive:VPS-Backups
6. 立即备份 blog     加密上传到 gdrive:Blog-Backups
7. 配置每周备份      VPS 和 blog 分离备份
8. 客户端/Cloudflare 建议
9. 查看日志
10. 更新本脚本
20. 卸载 VPN 部分    不动 blog/ad/pm2
0. 退出
```

## VPN 设计

脚本自建：

```text
Xray-core 官方二进制
VLESS Reality Vision
公网端口 443
本机 Xray 端口 127.0.0.1:24443
nginx stream SNI 分流
```

不再调用：

```text
mack-a/v2ray-agent
vasma
/etc/v2ray-agent
```

## Cloudflare 要求

```text
2b.gooffu.tech 必须 DNS only / 灰云
blog.gooffu.tech 可以继续橙云
ad.gooffu.tech 可以继续橙云
```

Reality 客户端连接的是：

```text
2b.gooffu.tech:443
```

但 nginx stream 会把非 blog/ad 的 443 流量转给本机 Xray。

## 分离加密备份

脚本支持两个独立备份：

```text
VPS 整机加密备份 -> ggdrive:VPS-Backups
blog 加密备份    -> gdrive:Blog-Backups
```

这样 blog 恢复和 VPS 整机恢复互不混在一起。

加密使用：

```text
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000
```

密码文件默认：

```text
/root/.myvps_backup_pass
```

必须额外保存这个文件。没有它，`.enc` 备份无法解密。

## 每周备份

菜单选：

```text
7. 配置每周备份
```

会写入：

```text
/etc/cron.d/myvps-weekly-backups
```

默认每周日执行：

```text
04:20 VPS 整机备份
04:40 blog 独立备份
```

## 安全提醒

不要公开：

```text
UUID
PrivateKey
ShortId
PublicKey
vless:// 节点链接
/root/.myvps_backup_pass
加密备份文件
证书私钥
```
