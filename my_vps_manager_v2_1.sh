#!/usr/bin/env bash
set -Eeuo pipefail

VERSION="2.1.0-owned"
REPO="https://raw.githubusercontent.com/Becauseiloveyo/racknerd-v2ray-agent-manager/main"
SELF="/root/my_vps_manager.sh"
BIN_LINK="/usr/local/bin/myvps"
LOG="/var/log/my_vps_manager.log"
REPORT_DIR="/root/my-vps-reports"
CONFIG_FILE="/etc/myvps-manager.conf"
LOCK_DIR="/run/lock"

# Defaults for this RackNerd VPS. Override in /etc/myvps-manager.conf.
BLOG_DOMAIN="blog.gooffu.tech"
AD_DOMAIN="ad.gooffu.tech"
VPN_DOMAIN="2b.gooffu.tech"
REALITY_SNI="www.microsoft.com"
REALITY_DEST="www.microsoft.com:443"
LOCAL_HTTPS_PORT="10443"
XRAY_LOCAL_PORT="24443"
BLOG_BACKEND="127.0.0.1:3000"
ADGUARD_BACKEND="127.0.0.1:8080"

XRAY_SERVICE="xray-racknerd-443"
XRAY_BASE="/etc/xray-racknerd-443"
XRAY_BIN="/usr/local/bin/xray"
XRAY_CONFIG="$XRAY_BASE/config.json"
XRAY_CLIENT="$XRAY_BASE/client.txt"
NGINX_STREAM_DIR="/etc/nginx/stream.d"
NGINX_STREAM_CONF="$NGINX_STREAM_DIR/443-sni.conf"

# Separated encrypted backups.
VPS_BACKUP_REMOTE="ggdrive:VPS-Backups/racknerd/full"
VPS_INVENTORY_REMOTE="ggdrive:VPS-Backups/racknerd/inventory"
BLOG_BACKUP_REMOTE="gdrive:Blog-Backups/moyan-blog/full"
BLOG_INVENTORY_REMOTE="gdrive:Blog-Backups/moyan-blog/inventory"
BACKUP_PASS_FILE="/root/.myvps_backup_pass"
BACKUP_WORKDIR="/root/my-vps-backups"
BLOG_ROOT="/root/my-b"
RETENTION_COUNT="8"

if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi

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
  echo -e "版本: $VERSION"
  echo -e "模式: 自有 Xray Reality 443 + nginx stream SNI 分流 + 分离加密备份\n"
}

write_default_config(){
  need_root
  if [[ -f "$CONFIG_FILE" ]]; then
    ok "配置文件已存在：$CONFIG_FILE"
    return
  fi
  cat > "$CONFIG_FILE" <<EOF_CONF
# My VPS manager config
BLOG_DOMAIN="blog.gooffu.tech"
AD_DOMAIN="ad.gooffu.tech"
VPN_DOMAIN="2b.gooffu.tech"
REALITY_SNI="www.microsoft.com"
REALITY_DEST="www.microsoft.com:443"
LOCAL_HTTPS_PORT="10443"
XRAY_LOCAL_PORT="24443"
BLOG_BACKEND="127.0.0.1:3000"
ADGUARD_BACKEND="127.0.0.1:8080"
VPS_BACKUP_REMOTE="ggdrive:VPS-Backups/racknerd/full"
VPS_INVENTORY_REMOTE="ggdrive:VPS-Backups/racknerd/inventory"
BLOG_BACKUP_REMOTE="gdrive:Blog-Backups/moyan-blog/full"
BLOG_INVENTORY_REMOTE="gdrive:Blog-Backups/moyan-blog/inventory"
BACKUP_PASS_FILE="/root/.myvps_backup_pass"
BACKUP_WORKDIR="/root/my-vps-backups"
BLOG_ROOT="/root/my-b"
RETENTION_COUNT="8"
EOF_CONF
  chmod 600 "$CONFIG_FILE"
  ok "已写入默认配置：$CONFIG_FILE"
}

install_deps(){
  need_root
  has apt-get || die "当前脚本按 Debian/Ubuntu apt 系设计。"
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y \
    curl wget ca-certificates jq unzip openssl dnsutils iproute2 lsof tar gzip cron rclone iptables netfilter-persistent fail2ban
  systemctl enable --now cron >/dev/null 2>&1 || true
  ok "基础依赖已安装"
}

install_base(){
  need_root
  write_default_config
  install_deps
  if has timedatectl; then timedatectl set-ntp true || true; fi
  cat >/etc/sysctl.d/98-my-vps.conf <<'EOF_SYSCTL'
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
net.ipv4.tcp_fastopen=3
net.ipv4.tcp_mtu_probing=1
EOF_SYSCTL
  sysctl --system >/dev/null || true
  install_shortcut
  ok "首次准备完成"
}

install_shortcut(){
  need_root
  curl -fsSL --retry 3 -o "$SELF" "$REPO/my_vps_manager_v2_1.sh"
  chmod 700 "$SELF"
  ln -sf "$SELF" "$BIN_LINK"
  ok "已安装快捷命令：myvps"
}

update_self(){ install_shortcut; }

vps_info(){
  echo "系统: $(grep -E '^PRETTY_NAME=' /etc/os-release 2>/dev/null | cut -d= -f2- | tr -d '"' || echo unknown)"
  echo "内核: $(uname -r)"
  echo "CPU: $(nproc) 核"
  free -h || true
  df -h / || true
  df -i / || true
  echo
  echo "IPv4: $(curl -4 -s --max-time 8 https://api.ipify.org || true)"
  if has jq; then curl -4 -s --max-time 8 https://ipinfo.io/json | jq -r '"地区: \(.country) \(.city)\nASN: \(.org)"' || true; fi
}

preflight(){
  need_root
  echo "== 基础信息 =="
  vps_info
  echo

  echo "== 配置 =="
  echo "BLOG_DOMAIN=$BLOG_DOMAIN"
  echo "AD_DOMAIN=$AD_DOMAIN"
  echo "VPN_DOMAIN=$VPN_DOMAIN"
  echo "REALITY_SNI=$REALITY_SNI"
  echo "LOCAL_HTTPS_PORT=$LOCAL_HTTPS_PORT"
  echo "XRAY_LOCAL_PORT=$XRAY_LOCAL_PORT"
  echo "VPS_BACKUP_REMOTE=$VPS_BACKUP_REMOTE"
  echo "BLOG_BACKUP_REMOTE=$BLOG_BACKUP_REMOTE"
  echo

  echo "== 关键命令 =="
  for c in nginx curl jq openssl tar rclone iptables systemctl ss dig; do
    if has "$c"; then echo "OK $c"; else echo "MISS $c"; fi
  done
  echo

  echo "== nginx stream 支持 =="
  if nginx -V 2>&1 | grep -q -- '--with-stream'; then
    echo "OK nginx static stream"
  elif [[ -f /usr/lib/nginx/modules/ngx_stream_module.so ]]; then
    echo "OK nginx dynamic stream module exists"
  else
    echo "WARN nginx stream not detected. Do not install VPN 443 until fixed."
  fi
  echo

  echo "== 当前监听 =="
  ss -tulnp | grep -E ':53\b|:80\b|:443\b|:10443\b|:24443\b|:3000\b|:8080\b|nginx|xray|node|AdGuardHome' || true
  echo

  echo "== 域名解析 =="
  local server_ip vpn_ip blog_ip ad_ip
  server_ip="$(curl -4 -s --max-time 8 https://api.ipify.org || true)"
  vpn_ip="$(dig +short A "$VPN_DOMAIN" | tail -1 || true)"
  blog_ip="$(dig +short A "$BLOG_DOMAIN" | tail -1 || true)"
  ad_ip="$(dig +short A "$AD_DOMAIN" | tail -1 || true)"
  echo "Server IPv4: ${server_ip:-unknown}"
  echo "$VPN_DOMAIN: ${vpn_ip:-unknown}"
  echo "$BLOG_DOMAIN: ${blog_ip:-unknown}"
  echo "$AD_DOMAIN: ${ad_ip:-unknown}"
  if [[ -n "${server_ip:-}" && -n "${vpn_ip:-}" && "$server_ip" != "$vpn_ip" ]]; then
    warn "$VPN_DOMAIN 没有直接解析到本机。Reality 域名需要 DNS only/灰云。"
  fi
  echo

  echo "== rclone remote =="
  if has rclone; then rclone listremotes || true; else echo "rclone missing"; fi
  echo

  echo "== HTTP 检查 =="
  curl -I --max-time 10 "https://$BLOG_DOMAIN" 2>/dev/null | sed -n '1,6p' || true
  curl -I --max-time 10 "https://$AD_DOMAIN" 2>/dev/null | sed -n '1,6p' || true
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
  systemctl --failed > "$dir/system-failed.txt" 2>/dev/null || true
  pm2 list > "$dir/pm2-list.txt" 2>/dev/null || true
  echo "$dir" > /root/last-owned-change-backup.txt
  ok "运行前备份完成：$dir"
}

rollback_last(){
  need_root
  local last
  last="$(cat /root/last-owned-change-backup.txt 2>/dev/null || true)"
  [[ -n "$last" && -d "$last" ]] || die "找不到 /root/last-owned-change-backup.txt 指向的备份目录"

  warn "将回滚：$last"
  systemctl disable --now "$XRAY_SERVICE" 2>/dev/null || true
  rm -f "/etc/systemd/system/$XRAY_SERVICE.service"
  systemctl daemon-reload

  if [[ -d "$last/nginx" ]]; then
    rm -rf /etc/nginx
    cp -a "$last/nginx" /etc/nginx
  fi
  if [[ -f "$last/iptables.rules" ]]; then
    iptables-restore < "$last/iptables.rules" || true
    has netfilter-persistent && netfilter-persistent save || true
  fi
  nginx -t && systemctl reload nginx
  ok "已回滚 nginx/iptables 并停止 $XRAY_SERVICE"
}

ensure_xray(){
  need_root
  if [[ -x "$XRAY_BIN" ]] && "$XRAY_BIN" version >/dev/null 2>&1; then
    ok "Xray 已存在：$($XRAY_BIN version | head -1)"
    return
  fi
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
  has nginx || die "未安装 nginx。"
  if nginx -V 2>&1 | grep -q -- '--with-stream'; then
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
  die "当前 nginx 未发现 stream 支持。为避免破坏 nginx.org mainline 包，脚本不会自动强装模块。请先处理 nginx stream。"
}

write_xray_reality(){
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
  "log": {"loglevel": "warning", "access": "$XRAY_BASE/access.log", "error": "$XRAY_BASE/error.log"},
  "inbounds": [{
    "tag": "vless-reality-443",
    "listen": "127.0.0.1",
    "port": $XRAY_LOCAL_PORT,
    "protocol": "vless",
    "settings": {"clients": [{"id": "$uuid", "flow": "xtls-rprx-vision", "email": "racknerd-owned-443"}], "decryption": "none"},
    "streamSettings": {"network": "tcp", "security": "reality", "realitySettings": {"show": false, "dest": "$REALITY_DEST", "xver": 0, "serverNames": ["$REALITY_SNI"], "privateKey": "$private", "shortIds": ["$sid"]}}
  }],
  "outbounds": [{"tag": "direct", "protocol": "freedom"}, {"tag": "block", "protocol": "blackhole"}]
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
  ensure_nginx_stream
  mkdir -p "$NGINX_STREAM_DIR"

  # Idempotent: only convert public listen 443 lines, not already-local 10443 lines.
  if grep -RqsE '^[[:space:]]*listen[[:space:]]+443([^0-9]|;)' /etc/nginx/conf.d 2>/dev/null; then
    find /etc/nginx/conf.d -type f -name "*.conf" -print0 | \
      xargs -0 sed -i -E "s/^[[:space:]]*listen[[:space:]]+443([^;]*);/    listen 127.0.0.1:$LOCAL_HTTPS_PORT\1;/g"
  fi

  cat > "$NGINX_STREAM_CONF" <<EOF_STREAM
# Managed by my_vps_manager_v2_1.sh
# Public 443 stays on nginx stream. Only the Reality SNI goes to Xray.
# Unknown SNI falls back to local HTTPS to reduce accidental website breakage.

map \$ssl_preread_server_name \$my_443_backend {
    $BLOG_DOMAIN  local_https_backend;
    $AD_DOMAIN    local_https_backend;
    $REALITY_SNI  xray_reality_backend;
    default       local_https_backend;
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

  nginx -t || { warn "nginx -t 失败，准备回滚"; rollback_last || true; die "nginx 配置失败"; }
  systemctl reload nginx
  ok "443 SNI 分流完成"
}

install_reality_443(){
  need_root
  install_deps
  preflight
  echo
  read -rp "确认安装/重建自有 Reality 443？输入 YES 继续: " ans
  [[ "$ans" == "YES" ]] || die "已取消"
  backup_runtime_state
  write_xray_reality
  configure_nginx_443_split
  status
  show_client
}

show_client(){ [[ -f "$XRAY_CLIENT" ]] && cat "$XRAY_CLIENT" || warn "还没有客户端配置。"; }

status(){
  echo "== 服务失败项 =="; systemctl --failed || true; echo
  echo "== 关键服务 =="
  for s in nginx "$XRAY_SERVICE" fail2ban netfilter-persistent; do systemctl --no-pager status "$s" 2>/dev/null | sed -n '1,10p' || true; echo; done
  echo "== 端口 =="
  ss -tulnp | grep -E ':53\b|:80\b|:443\b|:10443\b|:24443\b|:3000\b|:8080\b|nginx|xray|node|AdGuardHome' || true
  echo
  echo "== 网站检查 =="
  curl -I --max-time 10 "https://$BLOG_DOMAIN" 2>/dev/null | sed -n '1,5p' || true
  curl -I --max-time 10 "https://$AD_DOMAIN" 2>/dev/null | sed -n '1,5p' || true
}

uninstall_vpn_only(){
  need_root
  backup_runtime_state
  systemctl disable --now "$XRAY_SERVICE" 2>/dev/null || true
  rm -f "/etc/systemd/system/$XRAY_SERVICE.service"
  rm -rf "$XRAY_BASE"
  rm -f "$NGINX_STREAM_CONF"
  systemctl daemon-reload
  nginx -t && systemctl reload nginx || true
  warn "已卸载 VPN 服务和 stream 文件。若需要恢复公网 443 到原 http 配置，请用回滚功能。"
}

ensure_backup_pass(){
  need_root
  if [[ ! -f "$BACKUP_PASS_FILE" ]]; then
    umask 077
    openssl rand -base64 48 > "$BACKUP_PASS_FILE"
    chmod 600 "$BACKUP_PASS_FILE"
    ok "已生成加密密码文件：$BACKUP_PASS_FILE"
    warn "必须另外保存这个文件；没有它，.enc 备份无法解密。"
  fi
}

check_rclone_remote(){
  local remote_spec="$1" remote_name
  remote_name="${remote_spec%%:*}:"
  has rclone || die "未安装 rclone"
  rclone listremotes | grep -qx "$remote_name" || die "未找到 rclone remote：$remote_name。当前 remote：$(rclone listremotes | tr '\n' ' ')"
}

encrypt_file(){
  local src="$1" dst="$2"
  ensure_backup_pass
  openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -in "$src" -out "$dst" -pass "file:$BACKUP_PASS_FILE"
  chmod 600 "$dst"
}

upload_with_checks(){
  local file="$1" remote="$2" inv_remote="$3" sha="$file.sha256"
  sha256sum "$file" > "$sha"
  check_rclone_remote "$remote"
  rclone mkdir "$remote" >/dev/null 2>&1 || true
  rclone mkdir "$inv_remote" >/dev/null 2>&1 || true
  rclone copyto "$file" "$remote/$(basename "$file")" --progress
  rclone copyto "$sha" "$inv_remote/$(basename "$sha")" --progress
  ok "已上传：$remote/$(basename "$file")"
  ok "SHA256：$inv_remote/$(basename "$sha")"
}

prune_remote(){
  local remote="$1" keep="${2:-$RETENTION_COUNT}"
  [[ "$keep" =~ ^[0-9]+$ ]] || keep=8
  [[ "$keep" -gt 0 ]] || return 0
  check_rclone_remote "$remote"
  mapfile -t old < <(rclone lsf "$remote" --files-only | sort | head -n -"$keep" || true)
  for f in "${old[@]:-}"; do
    [[ -n "$f" ]] && rclone deletefile "$remote/$f" || true
  done
}

backup_vps_now(){
  need_root
  install_deps
  mkdir -p "$BACKUP_WORKDIR"
  exec 9>"$LOCK_DIR/myvps-backup-vps.lock"
  flock -n 9 || die "已有 VPS 备份在运行"
  local ts dir tarfile encfile inventory
  ts="$(date +%F_%H%M%S)"; dir="$BACKUP_WORKDIR/vps-$ts"; mkdir -p "$dir"
  inventory="$dir/racknerd-vps-$ts.inventory.txt"
  { echo "VPS encrypted backup inventory"; echo "time=$ts"; echo "hostname=$(hostname)"; echo "remote=$VPS_BACKUP_REMOTE"; df -h; df -i; ss -tulnp || true; systemctl --failed || true; } > "$inventory"
  tarfile="$dir/racknerd-vps-$ts.tar.gz"; encfile="$tarfile.enc"
  tar --one-file-system --acls --xattrs --numeric-owner --warning=no-file-changed --ignore-failed-read -czpf "$tarfile" / \
    --exclude=/proc --exclude=/sys --exclude=/dev --exclude=/run --exclude=/tmp --exclude=/mnt --exclude=/media --exclude=/lost+found \
    --exclude="$BACKUP_WORKDIR" --exclude=/root/blog-backups --exclude=/root/my-vps-backups --exclude=/var/cache/apt/archives || true
  encrypt_file "$tarfile" "$encfile"; rm -f "$tarfile"
  upload_with_checks "$encfile" "$VPS_BACKUP_REMOTE" "$VPS_INVENTORY_REMOTE"
  rclone copyto "$inventory" "$VPS_INVENTORY_REMOTE/$(basename "$inventory")" --progress || true
  prune_remote "$VPS_BACKUP_REMOTE" "$RETENTION_COUNT"
}

backup_blog_now(){
  need_root
  install_deps
  mkdir -p "$BACKUP_WORKDIR"
  exec 9>"$LOCK_DIR/myvps-backup-blog.lock"
  flock -n 9 || die "已有 blog 备份在运行"
  local ts dir tarfile encfile inventory
  ts="$(date +%F_%H%M%S)"; dir="$BACKUP_WORKDIR/blog-$ts"; mkdir -p "$dir"
  inventory="$dir/blog-$ts.inventory.txt"
  { echo "Blog encrypted backup inventory"; echo "time=$ts"; echo "remote=$BLOG_BACKUP_REMOTE"; du -sh "$BLOG_ROOT" /etc/nginx /root/.pm2 2>/dev/null || true; pm2 list 2>/dev/null || true; } > "$inventory"
  tarfile="$dir/blog-$ts.tar.gz"; encfile="$tarfile.enc"
  tar --warning=no-file-changed --ignore-failed-read -czpf "$tarfile" "$BLOG_ROOT" /root/.pm2 /etc/nginx /var/www /nginxweb 2>/dev/null || true
  encrypt_file "$tarfile" "$encfile"; rm -f "$tarfile"
  upload_with_checks "$encfile" "$BLOG_BACKUP_REMOTE" "$BLOG_INVENTORY_REMOTE"
  rclone copyto "$inventory" "$BLOG_INVENTORY_REMOTE/$(basename "$inventory")" --progress || true
  prune_remote "$BLOG_BACKUP_REMOTE" "$RETENTION_COUNT"
}

setup_weekly_backups(){
  need_root
  install_deps
  ensure_backup_pass
  cat > /etc/cron.d/myvps-weekly-backups <<EOF_CRON
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
20 4 * * 0 root $BIN_LINK backup-vps >> $LOG 2>&1
40 4 * * 0 root $BIN_LINK backup-blog >> $LOG 2>&1
EOF_CRON
  chmod 644 /etc/cron.d/myvps-weekly-backups
  systemctl enable --now cron >/dev/null 2>&1 || true
  ok "每周分离加密备份已配置"
}

show_logs(){
  echo "== Manager log =="; tail -n 160 "$LOG" 2>/dev/null || true; echo
  echo "== Xray log =="; journalctl -u "$XRAY_SERVICE" -n 120 --no-pager 2>/dev/null || true; echo
  echo "== nginx error log =="; tail -n 120 /var/log/nginx/error.log 2>/dev/null || true
}

client_tips(){
  cat <<EOF_TIPS
v2rayN / v2rayNG：
地址：$VPN_DOMAIN
端口：443
协议：VLESS
安全：Reality
SNI：$REALITY_SNI
Fingerprint：chrome
Flow：xtls-rprx-vision
Mux：关闭

Cloudflare：
- $VPN_DOMAIN 必须 DNS only/灰云。
- $BLOG_DOMAIN 和 $AD_DOMAIN 可以继续橙云。

客户端链接保存在：$XRAY_CLIENT
EOF_TIPS
}

menu(){
  while true; do
    header
    echo -e "${G}1${N}. 首次准备             依赖、配置文件、快捷命令"
    echo -e "${G}2${N}. 预检 443 VPN 环境    不修改系统"
    echo -e "${G}3${N}. 安装/重建 443 VPN   自有 Xray Reality"
    echo -e "${G}4${N}. 查看状态"
    echo -e "${G}5${N}. 查看客户端配置"
    echo -e "${G}6${N}. 立即备份 VPS         加密上传到 ggdrive"
    echo -e "${G}7${N}. 立即备份 blog        加密上传到 gdrive"
    echo -e "${G}8${N}. 配置每周分离备份"
    echo -e "${G}9${N}. 客户端/Cloudflare 建议"
    echo -e "${G}10${N}. 查看日志"
    echo -e "${G}11${N}. 更新本脚本"
    echo -e "${R}20${N}. 卸载 VPN 部分       不动 blog/ad/pm2"
    echo -e "${R}21${N}. 回滚上一次 443/VPN 修改"
    echo -e "${G}0${N}. 退出"
    echo
    read -rp "请选择: " c || true
    case "$c" in
      1) header; install_base; pause ;;
      2) header; preflight; pause ;;
      3) header; install_reality_443; pause ;;
      4) header; status; pause ;;
      5) header; show_client; pause ;;
      6) header; backup_vps_now; pause ;;
      7) header; backup_blog_now; pause ;;
      8) header; setup_weekly_backups; pause ;;
      9) header; client_tips; pause ;;
      10) header; show_logs; pause ;;
      11) header; update_self; pause ;;
      20) header; uninstall_vpn_only; pause ;;
      21) header; rollback_last; pause ;;
      0) exit 0 ;;
      *) warn "无效选择"; sleep 1 ;;
    esac
  done
}

case "${1:-menu}" in
  menu) menu ;;
  install-base) install_base ;;
  preflight) preflight ;;
  install-vpn|install-reality) install_reality_443 ;;
  status) status ;;
  show|show-client) show_client ;;
  backup-vps) backup_vps_now ;;
  backup-blog) backup_blog_now ;;
  setup-weekly-backups) setup_weekly_backups ;;
  update) update_self ;;
  uninstall-vpn) uninstall_vpn_only ;;
  rollback) rollback_last ;;
  logs) show_logs ;;
  *) echo "用法: $0 {menu|install-base|preflight|install-vpn|status|show-client|backup-vps|backup-blog|setup-weekly-backups|update|uninstall-vpn|rollback|logs}"; exit 1 ;;
esac
