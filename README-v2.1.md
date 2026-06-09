# my_vps_manager_v2_1.sh

v2.1 是自有 RackNerd VPS 管理脚本的硬化版本。

它不调用 `mack-a/v2ray-agent`，也不打开别人的菜单。

## 一行运行

```bash
bash <(curl -Ls https://raw.githubusercontent.com/Becauseiloveyo/racknerd-v2ray-agent-manager/main/my_vps_manager_v2_1.sh)
```

首次运行建议顺序：

```text
1. 首次准备
2. 预检 443 VPN 环境
3. 安装/重建 443 VPN
8. 配置每周分离备份
```

## 当前 VPS 设计

```text
公网 443
  ↓
nginx stream SNI 分流
  ├─ blog.gooffu.tech  → 127.0.0.1:10443 → nginx HTTPS → 127.0.0.1:3000 → blog
  ├─ ad.gooffu.tech    → 127.0.0.1:10443 → nginx HTTPS → 127.0.0.1:8080 → AdGuardHome
  ├─ www.microsoft.com → 127.0.0.1:24443 → Xray Reality
  └─ default           → 127.0.0.1:10443 → nginx HTTPS
```

注意：Reality 客户端使用的 SNI 是 `www.microsoft.com`，所以 v2.1 只把这个 SNI 转给 Xray，默认流量回落到网站后端，避免未来新增网站域名时被误送进 Xray。

## 配置文件

首次准备会生成：

```text
/etc/myvps-manager.conf
```

默认：

```bash
BLOG_DOMAIN="blog.gooffu.tech"
AD_DOMAIN="ad.gooffu.tech"
VPN_DOMAIN="2b.gooffu.tech"
REALITY_SNI="www.microsoft.com"
REALITY_DEST="www.microsoft.com:443"
LOCAL_HTTPS_PORT="10443"
XRAY_LOCAL_PORT="24443"
VPS_BACKUP_REMOTE="ggdrive:VPS-Backups/racknerd/full"
VPS_INVENTORY_REMOTE="ggdrive:VPS-Backups/racknerd/inventory"
BLOG_BACKUP_REMOTE="gdrive:Blog-Backups/moyan-blog/full"
BLOG_INVENTORY_REMOTE="gdrive:Blog-Backups/moyan-blog/inventory"
BACKUP_PASS_FILE="/root/.myvps_backup_pass"
BLOG_ROOT="/root/my-b"
RETENTION_COUNT="8"
```

以后改域名、备份路径、保留数量，改这个文件，不需要改脚本。

## 443 安装安全流程

菜单 `2. 预检 443 VPN 环境` 不修改系统，只检查：

```text
nginx stream 支持
当前端口监听
域名解析
rclone remote
ggdrive/gdrive 是否存在
blog/ad HTTPS 是否可访问
磁盘空间和 inode
```

菜单 `3. 安装/重建 443 VPN` 会先要求输入：

```text
YES
```

然后才会修改 nginx 和 Xray。

## 回滚

菜单：

```text
21. 回滚上一次 443/VPN 修改
```

会读取：

```text
/root/last-owned-change-backup.txt
```

并恢复：

```text
/etc/nginx
iptables
停止 xray-racknerd-443
reload nginx
```

## 备份设计

VPS 和 blog 分离备份：

```text
VPS 整机加密备份 → ggdrive:VPS-Backups/racknerd/full
VPS 清单/SHA256   → ggdrive:VPS-Backups/racknerd/inventory
blog 加密备份     → gdrive:Blog-Backups/moyan-blog/full
blog 清单/SHA256  → gdrive:Blog-Backups/moyan-blog/inventory
```

加密：

```text
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000
```

密码文件：

```text
/root/.myvps_backup_pass
```

必须单独保存。没有它，`.enc` 无法解密。

备份硬化：

```text
flock 防重复运行
sha256sum 校验文件
inventory 独立上传
保留最近 RETENTION_COUNT 个加密备份
```

## Cloudflare

```text
2b.gooffu.tech 必须 DNS only / 灰云
blog.gooffu.tech 可以继续橙云
ad.gooffu.tech 可以继续橙云
```

## 快捷命令

首次准备后可运行：

```bash
myvps
```

命令行模式：

```bash
myvps preflight
myvps install-vpn
myvps status
myvps show-client
myvps backup-vps
myvps backup-blog
myvps setup-weekly-backups
myvps rollback
```
