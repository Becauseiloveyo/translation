#!/usr/bin/env bash
set -Eeuo pipefail

VERSION="2.0.0-owned"
REPO="https://raw.githubusercontent.com/Becauseiloveyo/racknerd-v2ray-agent-manager/main"
SELF="/root/my_vps_manager.sh"
BIN_LINK="/usr/local/bin/myvps"
LOG="/var/log/my_vps_manager.log"
REPORT_DIR="/root/my-vps-reports"

# Your VPS layout
BLOG_DOMAIN="${BLOG_DOMAIN:-blog.gooffu.tech}"
AD_DOMAIN="${AD_DOMAIN:-ad.gooffu.tech}"
VPN_DOMAIN="${VPN_DOMAIN:-2b.gooffu.tech}"
REALITY_SNI="${REALITY_SNI:-www.microsoft.com}"
REALITY_DEST="${REALITY_DEST:-www.microsoft.com:443}"
LOCAL_HTTPS_PORT="${LOCAL_HTTPS_PORT:-10443}"
XRAY_LOCAL_PORT="${XRAY_LOCAL_PORT:-24443}"
BLOG_BACKEND="${BLOG_BACKEND:-127.0.0.1:3000}"
ADGUARD_BACKEND="${ADGUARD_BACKEND:-127.0.0.1:8080}"

XRAY_SERVICE="xray-racknerd-443"
XRAY_BASE="/etc/xray-racknerd-443"
XRAY_BIN="/usr/local/bin/xray"
XRAY_CONFIG="$XRAY_BASE/config.json"
XRAY_CLIENT="$XRAY_BASE/client.txt"
NGINX_STREAM_DIR="/etc/nginx/stream.d"
NGINX_STREAM_CONF="$NGINX_STREAM_DIR/443-sni.conf"

# Backup layout. VPS and blog are intentionally separated for easier restore.
VPS_BACKUP_REMOTE="${VPS_BACKUP_REMOTE:-ggdrive:VPS-Backups}"
BLOG_BACKUP_REMOTE="${BLOG_BACKUP_REMOTE:-gdrive:Blog-Backups}"
BACKUP_PASS_FILE="${BACKUP_PASS_FILE:-/root/.myvps_backup_pass}"
BACKUP_WORKDIR="${BACKUP_WORKDIR:-/root/my-vps-backups}"
BLOG_ROOT="${BLOG_ROOT:-/root/my-b}"

if [[ -t 1 ]]; then
  R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'; C='\033[0;36m'; W='\033[1m'; N='\033[0m'
else
  R=''; G=''; Y=''; C=''; W=''; N=''
fi

log(){ mkdir -p "$(dirname "$LOG")" >/dev/null 2>&1 || true; echo -e "[$(date '+%F %T')] $*" | tee -a "$LOG"; }
ok(){ log "${G}[OK]${N} $*"; }
warn(){ log "${Y}[注意]${N} $*"; }
err(){ log "${R}[错误]${N} $*"; }
die(){ err "$*"; exit 1; }
has(){ command -v "$1" >/dev/null 2>&1; }
need_root(){ [[ ${EUID:-0} -eq 0 ]] || die "请用 root 运行"; }
pause(){ read -rp "按回车返回..." _ || true; }

header(){
  clear || true
  echo -e "${C}${W}╔══════════════════════════════════════╗${N}"
  echo -e "${C}${W}║   我的 RackNerd VPS 自有管理脚本     ║${N}"
  echo -e "${C}${W}╚══════════════════════════════════════╝${N}"
  echo -e "版本: $VERSION    主脚本: my_vps_manager.sh"
  echo -e "模式: 自有 Xray Reality 443 + nginx SNI 分流，不调用 mack-a/v2ray-agent\n"
}

install_deps(){
  need_root
  if ! has apt-get; then die "当前脚本按 Debian/Ubuntu apt 系设计。"; fi
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y \
    curl wget ca-certificates jq unzip openssl dnsutils iproute2 lsof tar gzip cron rclone iptables netfilter-persistent fail2ban
  systemctl enable --now cron >/dev/null 2>&1 || true
  ok "基础依赖已安装"
}

install_base(){
  need_root
  install_deps
  if has timedatectl; then timedatectl set-ntp true || true; fi
  cat >/etc/sysctl.d/98-my-vps.conf <<'EOF_SYSCTL'
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
net.ipv4.tcp_fastopen=3
net.ipv4.tcp_mtu_probing=1
EOF_SYSCTL
  sysctl --system >/dev/null || true
  ok "时间同步、BBR/网络参数已处理"
  echo
  vps_info
}

vps_info(){
  echo "系统: $(grep -E '^PRETTY_NAME=' /etc/os-release 2>/dev/null | cut -d= -f2- | tr -d '"' || echo unknown)"
  echo "内核: $(uname -r)"
  echo "CPU: $(nproc) 核"
  free -h || true
  df -h / || true
  echo
  echo "IPv4: $(curl -4 -s --max-time 8 https://api.ipify.org || true)"
  if has jq; then curl -4 -s --max-time 8 https://ipinfo.io/json | jq -r '"地区: \(.country) \(.city)\nASN: \(.org)"' || true; fi
}

ensure_xray(){
  need_root
  if [[ -x "$XRAY_BIN" ]] && "$XRAY_BIN" version >/dev/null 2>&1; then
    ok "Xray 已存在：$($XRAY_BIN version | head -1)"
    return
  fi
  log "安装 Xray-core 官方二进制..."
  local tmp asset
  tmp="/tmp/xray-install-$$"
  mkdir -p "$tmp"
  asset="$(curl -fsSL https://api.github.com/repos/XTLS/Xray-core/releases/latest | jq -r '.assets[].browser_download_url' | grep 'Xray-linux-64.zip$' | head -1)"
  [[ -n "$asset" && "$asset" != "null" ]] || die "找不到 Xray-linux-64.zip 下载地址"
  curl -fL --retry 3 -o "$tmp/xray.zip" "$asset"
  unzip -o "$tmp/xray.zip" -d "$tmp/xray" >/dev/null
  install -m 755 "$tmp/xray/xray" "$XRAY_BIN"
  mkdir -p /usr/local/share/xray
  [[ -f "$tmp/xray/geoip.dat" ]] && install -m 644 "$tmp/xray/geoip.dat" /usr/local/share/xray/geoip.dat
  [[ -f "$tmp/xray/geosite.dat" ]] && install -m 644 "$tmp/xray/geosite.dat" /usr/local/share/xray/geosite.dat
  rm -rf "$tmp"
  ok "Xray 已安装：$($XRAY_BIN version | head -1)"
}

ensure_nginx_stream(){
  need_root
  has nginx || die "未安装 nginx。先确认 blog/ad 的 nginx 环境。"
  local nginx_v
  nginx_v="$(nginx -V 2>&1 || true)"

  if echo "$nginx_v" | grep -q -- '--with-stream'; then
    ok "nginx 已静态支持 stream"
    return
  fi

  if [[ -f /usr/lib/nginx/modules/ngx_stream_module.so ]]; then
    if ! grep -q 'ngx_stream_module.so' /etc/nginx/nginx.conf; then
      cp -a /etc/nginx/nginx.conf "/etc/nginx/nginx.conf.bak.stream.$(date +%F_%H%M%S)"
      sed -i '1iload_module /usr/lib/nginx/modules/ngx_stream_module.so;' /etc/nginx/nginx.conf
    fi
    ok "nginx 已加载动态 stream 模块"
    return
  fi

  warn "当前 nginx 未发现 stream。尝试安装 stream 模块。"
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y libnginx-mod-stream || \
  DEBIAN_FRONTEND=noninteractive apt-get install -y nginx-module-stream || \
  die "无法安装 nginx stream 模块。请先发 nginx -V 输出。"

  if [[ -f /usr/lib/nginx/modules/ngx_stream_module.so ]] && ! grep -q 'ngx_stream_module.so' /etc/nginx/nginx.conf; then
    sed -i '1iload_module /usr/lib/nginx/modules/ngx_stream_module.so;' /etc/nginx/nginx.conf
  fi
  ok "stream 模块处理完成"
}

backup_runtime_state(){
  need_root
  local dir="/root/before-owned-change-$(date +%F_%H%M%S)"
  mkdir -p "$dir"
  [[ -d /etc/nginx ]] && cp -a /etc/nginx "$dir/nginx"
  [[ -d "$XRAY_BASE" ]] && cp -a "$XRAY_BASE" "$dir/xray-racknerd-443"
  [[ -f "/etc/systemd/system/$XRAY_SERVICE.service" ]] && cp -a "/etc/systemd/system/$XRAY_SERVICE.service" "$dir/"
  iptables-save > "$dir/iptables.rules" 2>/dev/null || true
  ss -tulnp > "$dir/ports.txt" 2>/dev/null || true
  pm2 list > "$dir/pm2-list.txt" 2>/dev/null || true
  echo "$dir" > /root/last-owned-change-backup.txt
  ok "运行前备份完成：$dir"
}

check_domains(){
  local server_ip vpn_ip
  server_ip="$(curl -4 -s --max-time 8 https://api.ipify.org || true)"
  vpn_ip="$(dig +short A "$VPN_DOMAIN" | tail -1 || true)"
  echo "服务器公网 IPv4: ${server_ip:-unknown}"
  echo "$VPN_DOMAIN 解析 IPv4: ${vpn_ip:-unknown}"
  if [[ -n "${server_ip:-}" && -n "${vpn_ip:-}" && "$server_ip" != "$vpn_ip" ]]; then
    warn "$VPN_DOMAIN 当前没有直接解析到本机。Reality 节点域名必须 DNS only/灰云，不能走 Cloudflare 橙云。"
  fi
}

write_xray_reality(){
  need_root
  ensure_xray
  mkdir -p "$XRAY_BASE"
  chmod 700 "$XRAY_BASE"

  local uuid keyout private public sid
  uuid="$($XRAY_BIN uuid)"
  keyout="$($XRAY_BIN x25519)"
  private="$(echo "$keyout" | awk -F': ' '/Private key/{print $2}')"
  public="$(echo "$keyout" | awk -F': ' '/Public key/{print $2}')"
  sid="$(openssl rand -hex 8)"
  [[ -n "$uuid" && -n "$private" && -n "$public" && -n "$sid" ]] || die "生成 Reality 参数失败"

  cat > "$XRAY_CONFIG" <<EOF_XRAY
{
  "log": {
    "loglevel": "warning",
    "access": "$XRAY_BASE/access.log",
    "error": "$XRAY_BASE/error.log"
  },
  "inbounds": [
    {
      "tag": "vless-reality-443",
      "listen": "127.0.0.1",
      "port": $XRAY_LOCAL_PORT,
      "protocol": "vless",
      "settings": {
        "clients": [
          {
            "id": "$uuid",
            "flow": "xtls-rprx-vision",
            "email": "racknerd-owned-443"
          }
        ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": false,
          "dest": "$REALITY_DEST",
          "xver": 0,
          "serverNames": ["$REALITY_SNI"],
          "privateKey": "$private",
          "shortIds": ["$sid"]
        }
      }
    }
  ],
  "outbounds": [
    { "tag": "direct", "protocol": "freedom" },
    { "tag": "block", "protocol": "blackhole" }
  ]
}
EOF_XRAY
  chmod 600 "$XRAY_CONFIG"

  cat > "/etc/systemd/system/$XRAY_SERVICE.service" <<EOF_SERVICE
[Unit]
Description=My RackNerd Xray Reality 443 Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=$XRAY_BIN run -config $XRAY_CONFIG
Restart=on-failure
RestartSec=5s
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
EOF_SERVICE

  systemctl daemon-reload
  systemctl enable "$XRAY_SERVICE"
  systemctl restart "$XRAY_SERVICE"

  cat > "$XRAY_CLIENT" <<EOF_CLIENT
VLESS Reality 443 节点

地址: $VPN_DOMAIN
端口: 443
协议: VLESS
传输: TCP
安全: Reality
SNI/serverName: $REALITY_SNI
Fingerprint: chrome
Flow: xtls-rprx-vision
PublicKey: $public
ShortId: $sid
UUID: $uuid

v2rayN/v2rayNG 链接：
vless://$uuid@$VPN_DOMAIN:443?encryption=none&security=reality&sni=$REALITY_SNI&fp=chrome&pbk=$public&sid=$sid&type=tcp&flow=xtls-rprx-vision#RackNerd-Reality-443
EOF_CLIENT
  chmod 600 "$XRAY_CLIENT"
  ok "Xray Reality 配置完成：$XRAY_CONFIG"
}

configure_nginx_443_split(){
  need_root
  ensure_nginx_stream
  backup_runtime_state

  log "把现有 blog/ad HTTPS 从公网 443 移到本机 127.0.0.1:$LOCAL_HTTPS_PORT"
  if grep -RqsE "listen[[:space:]]+443([[:space:]]|;)" /etc/nginx/conf.d 2>/dev/null; then
    find /etc/nginx/conf.d -type f -name "*.conf" -print0 | \
      xargs -0 sed -i -E "s/listen[[:space:]]+443([^;]*);/listen 127.0.0.1:$LOCAL_HTTPS_PORT\1;/g"
  fi

  mkdir -p "$NGINX_STREAM_DIR"
  cat > "$NGINX_STREAM_CONF" <<EOF_STREAM
map \$ssl_preread_server_name \$my_443_backend {
    $BLOG_DOMAIN local_https_backend;
    $AD_DOMAIN   local_https_backend;
    default      xray_reality_backend;
}

upstream local_https_backend {
    server 127.0.0.1:$LOCAL_HTTPS_PORT;
}

upstream xray_reality_backend {
    server 127.0.0.1:$XRAY_LOCAL_PORT;
}

server {
    listen 443;
    proxy_pass \$my_443_backend;
    ssl_preread on;
}
EOF_STREAM

  if ! grep -q 'include /etc/nginx/stream.d/\*.conf;' /etc/nginx/nginx.conf; then
    if grep -qE '^[[:space:]]*stream[[:space:]]*\{' /etc/nginx/nginx.conf; then
      die "nginx.conf 已有 stream 块，请手动合并 include /etc/nginx/stream.d/*.conf;"
    fi
    cat >> /etc/nginx/nginx.conf <<'EOF_NGINX_STREAM'

stream {
    include /etc/nginx/stream.d/*.conf;
}
EOF_NGINX_STREAM
  fi

  log "测试 nginx 配置..."
  if ! nginx -t; then
    local last
    last="$(cat /root/last-owned-change-backup.txt 2>/dev/null || true)"
    warn "nginx -t 失败，尝试恢复备份：$last"
    if [[ -n "$last" && -d "$last/nginx" ]]; then
      rm -rf /etc/nginx
      cp -a "$last/nginx" /etc/nginx
      nginx -t && systemctl reload nginx || true
    fi
    die "nginx 配置失败，已尝试回滚。"
  fi
  systemctl reload nginx
  ok "公网 443 已由 nginx stream 接管，blog/ad 与 VPN 已按 SNI 分流"
}

install_reality_443(){
  need_root
  install_deps
  check_domains
  write_xray_reality
  configure_nginx_443_split
  status
  echo
  show_client
}

show_client(){
  if [[ -f "$XRAY_CLIENT" ]]; then
    cat "$XRAY_CLIENT"
  else
    warn "还没有客户端配置。请先安装 Reality 443。"
  fi
}

status(){
  echo "== 服务失败项 =="
  systemctl --failed || true
  echo
  echo "== 关键服务 =="
  for s in nginx "$XRAY_SERVICE" fail2ban netfilter-persistent; do
    systemctl --no-pager status "$s" 2>/dev/null | sed -n '1,10p' || true
    echo
  done
  echo "== 端口 =="
  ss -tulnp | grep -E ':53\b|:80\b|:443\b|:10443\b|:24443\b|:3000\b|:8080\b|nginx|xray|node|AdGuardHome' || true
  echo
  echo "== nginx VPN 残留/分流检查 =="
  grep -RniE 'v2ray-agent|mack-a|v2ray|trojan|vmess|vless|sing-box|24443|10443|stream.d' /etc/nginx /etc/systemd/system 2>/dev/null || true
}

uninstall_vpn_only(){
  need_root
  backup_runtime_state
  systemctl disable --now "$XRAY_SERVICE" 2>/dev/null || true
  rm -f "/etc/systemd/system/$XRAY_SERVICE.service"
  rm -rf "$XRAY_BASE"
  rm -f "$NGINX_STREAM_CONF"
  systemctl daemon-reload
  warn "已删除 Xray Reality 服务和 stream 配置文件。"
  warn "注意：nginx conf.d 里的 listen 127.0.0.1:$LOCAL_HTTPS_PORT 不会自动改回公网 443，以避免误伤。需要回滚请用最近备份恢复 /etc/nginx。"
  nginx -t && systemctl reload nginx || true
}

ensure_backup_pass(){
  need_root
  if [[ ! -f "$BACKUP_PASS_FILE" ]]; then
    umask 077
    openssl rand -base64 48 > "$BACKUP_PASS_FILE"
    chmod 600 "$BACKUP_PASS_FILE"
    ok "已生成加密密码文件：$BACKUP_PASS_FILE"
    warn "一定要另外保存这个文件；没有它，.enc 备份无法解密。"
  fi
}

check_rclone_remote(){
  local remote_spec="$1"
  local remote_name="${remote_spec%%:*}:"
  has rclone || die "未安装 rclone"
  rclone listremotes | grep -qx "$remote_name" || die "未找到 rclone remote：$remote_name。当前 remote：$(rclone listremotes | tr '\n' ' ')"
}

encrypt_file(){
  local src="$1" dst="$2"
  ensure_backup_pass
  openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -in "$src" -out "$dst" -pass "file:$BACKUP_PASS_FILE"
  chmod 600 "$dst"
}

upload_file(){
  local file="$1" remote="$2"
  check_rclone_remote "$remote"
  rclone mkdir "$remote" >/dev/null 2>&1 || true
  rclone copyto "$file" "$remote/$(basename "$file")" --progress
}

backup_vps_now(){
  need_root
  install_deps
  ensure_backup_pass
  local ts dir tarfile encfile inventory
  ts="$(date +%F_%H%M%S)"
  dir="$BACKUP_WORKDIR/vps-$ts"
  mkdir -p "$dir"
  inventory="$dir/inventory.txt"
  {
    echo "VPS encrypted backup inventory"
    echo "time=$ts"
    echo "hostname=$(hostname)"
    echo "remote=$VPS_BACKUP_REMOTE"
    echo
    df -h || true
    echo
    ss -tulnp || true
    echo
    systemctl --failed || true
    echo
    rclone listremotes || true
  } > "$inventory"

  tarfile="$dir/racknerd-vps-$ts.tar.gz"
  encfile="$tarfile.enc"
  log "创建 VPS 备份包：$tarfile"
  tar --one-file-system --acls --xattrs --numeric-owner --warning=no-file-changed --ignore-failed-read \
    -czpf "$tarfile" / \
    --exclude=/proc --exclude=/sys --exclude=/dev --exclude=/run --exclude=/tmp \
    --exclude=/mnt --exclude=/media --exclude=/lost+found \
    --exclude="$BACKUP_WORKDIR" \
    --exclude=/root/blog-backups \
    --exclude=/root/my-vps-backups \
    --exclude=/var/cache/apt/archives || true
  encrypt_file "$tarfile" "$encfile"
  rm -f "$tarfile"
  upload_file "$encfile" "$VPS_BACKUP_REMOTE"
  ok "VPS 加密备份已上传：$VPS_BACKUP_REMOTE/$(basename "$encfile")"
}

backup_blog_now(){
  need_root
  install_deps
  ensure_backup_pass
  local ts dir tarfile encfile
  ts="$(date +%F_%H%M%S)"
  dir="$BACKUP_WORKDIR/blog-$ts"
  mkdir -p "$dir"
  tarfile="$dir/blog-$ts.tar.gz"
  encfile="$tarfile.enc"
  log "创建 blog 独立备份：$tarfile"
  tar --warning=no-file-changed --ignore-failed-read -czpf "$tarfile" \
    "$BLOG_ROOT" /root/.pm2 /etc/nginx /var/www /nginxweb 2>/dev/null || true
  encrypt_file "$tarfile" "$encfile"
  rm -f "$tarfile"
  upload_file "$encfile" "$BLOG_BACKUP_REMOTE"
  ok "blog 加密备份已上传：$BLOG_BACKUP_REMOTE/$(basename "$encfile")"
}

setup_weekly_backups(){
  need_root
  install_deps
  ensure_backup_pass
  cat > /etc/cron.d/myvps-weekly-backups <<EOF_CRON
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# VPS full encrypted backup to ggdrive, separated from blog for easier restore.
20 4 * * 0 root $BIN_LINK backup-vps >> $LOG 2>&1

# Blog encrypted backup to gdrive, separated from VPS backup.
40 4 * * 0 root $BIN_LINK backup-blog >> $LOG 2>&1
EOF_CRON
  chmod 644 /etc/cron.d/myvps-weekly-backups
  systemctl enable --now cron >/dev/null 2>&1 || true
  ok "每周加密备份已配置：/etc/cron.d/myvps-weekly-backups"
  warn "VPS 备份 remote：$VPS_BACKUP_REMOTE；blog 备份 remote：$BLOG_BACKUP_REMOTE。"
}

update_self(){
  need_root
  curl -fsSL --retry 3 -o "$SELF" "$REPO/my_vps_manager_owned.sh"
  chmod 700 "$SELF"
  ln -sf "$SELF" "$BIN_LINK"
  ok "已更新到自有脚本：$SELF；命令：myvps"
}

install_shortcut(){
  need_root
  cp -a "$0" "$SELF" 2>/dev/null || curl -fsSL --retry 3 -o "$SELF" "$REPO/my_vps_manager_owned.sh"
  chmod 700 "$SELF"
  ln -sf "$SELF" "$BIN_LINK"
  ok "已安装快捷命令：myvps"
}

show_logs(){
  echo "== Manager log =="
  tail -n 160 "$LOG" 2>/dev/null || true
  echo
  echo "== Xray log =="
  journalctl -u "$XRAY_SERVICE" -n 120 --no-pager 2>/dev/null || true
  echo
  echo "== nginx error log =="
  tail -n 120 /var/log/nginx/error.log 2>/dev/null || true
}

client_tips(){
  cat <<EOF_TIPS
v2rayN / v2rayNG 建议：

地址：$VPN_DOMAIN
端口：443
协议：VLESS
安全：Reality
SNI：$REALITY_SNI
Fingerprint：chrome
Flow：xtls-rprx-vision
Mux：关闭
IPv6：先关闭或优先 IPv4

Cloudflare：
- $VPN_DOMAIN 必须 DNS only/灰云。
- $BLOG_DOMAIN 和 $AD_DOMAIN 可以继续橙云。

当前脚本不打印或上传你的节点密钥；客户端链接保存在：
$XRAY_CLIENT
EOF_TIPS
}

menu(){
  while true; do
    header
    echo -e "${G}1${N}. 首次准备          装依赖、时间、BBR、快捷命令"
    echo -e "${G}2${N}. 安装/重建 443 VPN 自有 Reality 节点"
    echo -e "${G}3${N}. 查看状态          nginx/blog/ad/VPN/端口"
    echo -e "${G}4${N}. 查看客户端配置    vless:// 链接"
    echo -e "${G}5${N}. 立即备份 VPS      加密上传到 $VPS_BACKUP_REMOTE"
    echo -e "${G}6${N}. 立即备份 blog     加密上传到 $BLOG_BACKUP_REMOTE"
    echo -e "${G}7${N}. 配置每周备份      VPS 和 blog 分离备份"
    echo -e "${G}8${N}. 客户端/Cloudflare 建议"
    echo -e "${G}9${N}. 查看日志"
    echo -e "${G}10${N}. 更新本脚本"
    echo -e "${R}20${N}. 卸载 VPN 部分    不动 blog/ad/pm2"
    echo -e "${G}0${N}. 退出"
    echo
    read -rp "请选择: " c || true
    case "$c" in
      1) header; install_base; install_shortcut; pause ;;
      2) header; install_reality_443; pause ;;
      3) header; status; pause ;;
      4) header; show_client; pause ;;
      5) header; backup_vps_now; pause ;;
      6) header; backup_blog_now; pause ;;
      7) header; setup_weekly_backups; pause ;;
      8) header; client_tips; pause ;;
      9) header; show_logs; pause ;;
      10) header; update_self; pause ;;
      20) header; uninstall_vpn_only; pause ;;
      0) exit 0 ;;
      *) warn "无效选择"; sleep 1 ;;
    esac
  done
}

case "${1:-menu}" in
  menu) menu ;;
  install-base) install_base; install_shortcut ;;
  install-vpn|install-reality) install_reality_443 ;;
  status) status ;;
  show|show-client) show_client ;;
  backup-vps) backup_vps_now ;;
  backup-blog) backup_blog_now ;;
  setup-weekly-backups) setup_weekly_backups ;;
  update) update_self ;;
  uninstall-vpn) uninstall_vpn_only ;;
  logs) show_logs ;;
  *) echo "用法: $0 {menu|install-base|install-vpn|status|show-client|backup-vps|backup-blog|setup-weekly-backups|update|uninstall-vpn|logs}"; exit 1 ;;
esac
