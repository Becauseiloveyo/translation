#!/usr/bin/env bash
set -Eeuo pipefail

VERSION="1.0.0-cf-ws"
CF_DOMAIN="${CF_DOMAIN:-cf.gooffu.tech}"
CF_PATH_FILE="/etc/xray-racknerd-cf-ws/path.txt"
CF_BASE="/etc/xray-racknerd-cf-ws"
CF_CONFIG="$CF_BASE/config.json"
CF_CLIENT="$CF_BASE/client.txt"
CF_SERVICE="xray-racknerd-cf-ws"
CF_PORT="${CF_PORT:-23456}"
LOCAL_HTTPS_PORT="${LOCAL_HTTPS_PORT:-10443}"
XRAY_BIN="/usr/local/bin/xray"
NGINX_CONF="/etc/nginx/conf.d/cf-ws-backup.conf"
CERT_DIR="/etc/myvps-certs"
SELF="/root/my_vps_cf_ws_manager.sh"
BIN_LINK="/usr/local/bin/myvps-cf"
REPO="https://raw.githubusercontent.com/Becauseiloveyo/translation/main"

if [[ -t 1 ]]; then
  R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'; C='\033[0;36m'; W='\033[1m'; N='\033[0m'
else
  R=''; G=''; Y=''; C=''; W=''; N=''
fi

ok(){ echo -e "${G}[OK]${N} $*"; }
warn(){ echo -e "${Y}[注意]${N} $*"; }
err(){ echo -e "${R}[错误]${N} $*"; }
die(){ err "$*"; exit 1; }
has(){ command -v "$1" >/dev/null 2>&1; }
need_root(){ [[ ${EUID:-0} -eq 0 ]] || die "请用 root 运行"; }
pause(){ read -rp "按回车返回..." _ || true; }

header(){
  clear || true
  echo -e "${C}${W}╔══════════════════════════════════════╗${N}"
  echo -e "${C}${W}║   Cloudflare WebSocket 备用节点      ║${N}"
  echo -e "${C}${W}╚══════════════════════════════════════╝${N}"
  echo "版本: $VERSION"
  echo "域名: $CF_DOMAIN"
  echo
}

install_shortcut(){
  need_root
  curl -fsSL --retry 3 -o "$SELF" "$REPO/my_vps_cf_ws_manager.sh"
  chmod 700 "$SELF"
  ln -sf "$SELF" "$BIN_LINK"
  ok "已安装快捷命令：myvps-cf"
}

install_deps(){
  need_root
  has apt-get || die "当前脚本按 Debian/Ubuntu apt 系设计。"
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y curl ca-certificates jq openssl nginx iproute2 lsof
  ok "依赖已安装"
}

ensure_xray(){
  need_root
  if [[ -x "$XRAY_BIN" ]] && "$XRAY_BIN" version >/dev/null 2>&1; then
    ok "Xray 已存在：$($XRAY_BIN version | head -1)"
    return
  fi
  local tmp
  tmp="/tmp/xray-cf-install-$$"; mkdir -p "$tmp"
  curl -fL --retry 3 -A "Mozilla/5.0" -o "$tmp/xray.zip" "https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip"
  unzip -o "$tmp/xray.zip" -d "$tmp/xray" >/dev/null
  install -m 755 "$tmp/xray/xray" "$XRAY_BIN"
  rm -rf "$tmp"
  ok "Xray 已安装：$($XRAY_BIN version | head -1)"
}

find_or_create_cert(){
  mkdir -p "$CERT_DIR"
  local cert key
  cert="$(grep -RhsE '^[[:space:]]*ssl_certificate[[:space:]]+' /etc/nginx 2>/dev/null | awk '{print $2}' | sed 's/;//' | grep -v 'ssl_certificate_key' | head -1 || true)"
  key="$(grep -RhsE '^[[:space:]]*ssl_certificate_key[[:space:]]+' /etc/nginx 2>/dev/null | awk '{print $2}' | sed 's/;//' | head -1 || true)"
  if [[ -n "${cert:-}" && -n "${key:-}" && -f "$cert" && -f "$key" ]]; then
    echo "$cert|$key"
    return
  fi
  cert="$CERT_DIR/cf-ws-origin.crt"
  key="$CERT_DIR/cf-ws-origin.key"
  if [[ ! -f "$cert" || ! -f "$key" ]]; then
    openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
      -keyout "$key" -out "$cert" -subj "/CN=$CF_DOMAIN" >/dev/null 2>&1
    chmod 600 "$key"; chmod 644 "$cert"
  fi
  echo "$cert|$key"
}

random_path(){
  if [[ -f "$CF_PATH_FILE" ]]; then
    cat "$CF_PATH_FILE"
  else
    mkdir -p "$CF_BASE"
    local p
    p="/$(openssl rand -hex 12)"
    echo "$p" > "$CF_PATH_FILE"
    chmod 600 "$CF_PATH_FILE"
    echo "$p"
  fi
}

write_xray_cf_ws(){
  ensure_xray
  mkdir -p "$CF_BASE"; chmod 700 "$CF_BASE"
  local uuid path
  uuid="$($XRAY_BIN uuid)"
  path="$(random_path)"
  cat > "$CF_CONFIG" <<EOF_XRAY
{
  "log": {"loglevel": "warning", "access": "$CF_BASE/access.log", "error": "$CF_BASE/error.log"},
  "inbounds": [{
    "tag": "vless-ws-cf",
    "listen": "127.0.0.1",
    "port": $CF_PORT,
    "protocol": "vless",
    "settings": {
      "clients": [{"id": "$uuid", "email": "racknerd-cf-ws"}],
      "decryption": "none"
    },
    "streamSettings": {
      "network": "ws",
      "wsSettings": {"path": "$path"}
    }
  }],
  "outbounds": [
    {"tag": "direct", "protocol": "freedom"},
    {"tag": "block", "protocol": "blackhole"}
  ]
}
EOF_XRAY
  chmod 600 "$CF_CONFIG"
  cat > "/etc/systemd/system/$CF_SERVICE.service" <<EOF_SERVICE
[Unit]
Description=My RackNerd Xray Cloudflare WebSocket Backup Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=$XRAY_BIN run -config $CF_CONFIG
Restart=on-failure
RestartSec=5s
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
EOF_SERVICE
  systemctl daemon-reload
  systemctl enable --now "$CF_SERVICE"
  cat > "$CF_CLIENT" <<EOF_CLIENT
Cloudflare WebSocket 备用节点
地址: $CF_DOMAIN
端口: 443
协议: VLESS
传输: WebSocket
安全: TLS
Host/SNI: $CF_DOMAIN
Path: $path
UUID: $uuid

v2rayN/v2rayNG 链接：
vless://$uuid@$CF_DOMAIN:443?encryption=none&security=tls&sni=$CF_DOMAIN&fp=chrome&type=ws&host=$CF_DOMAIN&path=$(python3 - <<PY 2>/dev/null || printf '%s' "$path"
import urllib.parse
print(urllib.parse.quote('$path', safe=''))
PY
)#RackNerd-CF-WS
EOF_CLIENT
  chmod 600 "$CF_CLIENT"
  ok "Xray Cloudflare WS 配置完成：$CF_CONFIG"
}

write_nginx_cf_ws(){
  local pair cert key path
  pair="$(find_or_create_cert)"
  cert="${pair%%|*}"
  key="${pair##*|}"
  path="$(random_path)"
  cat > "$NGINX_CONF" <<EOF_NGINX
# Managed by my_vps_cf_ws_manager.sh
server {
    listen 127.0.0.1:$LOCAL_HTTPS_PORT ssl http2;
    server_name $CF_DOMAIN;

    ssl_certificate $cert;
    ssl_certificate_key $key;

    location = / {
        return 204;
    }

    location $path {
        proxy_redirect off;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
        proxy_pass http://127.0.0.1:$CF_PORT;
    }
}
EOF_NGINX
  nginx -t
  systemctl reload nginx
  ok "nginx Cloudflare WS 反代完成：$NGINX_CONF"
}

install_cf_ws(){
  need_root
  install_deps
  write_xray_cf_ws
  write_nginx_cf_ws
  install_shortcut
  echo
  show_status
  echo
  show_client
  echo
  warn "Cloudflare 面板里 $CF_DOMAIN 必须是橙云 / Proxied。SSL/TLS 模式建议先用 Full，不要用 Flexible。"
}

show_client(){
  if [[ -f "$CF_CLIENT" ]] && grep -q '^vless://' "$CF_CLIENT"; then
    echo "== Cloudflare 备用节点导入链接 =="
    grep '^vless://' "$CF_CLIENT" | head -1
    echo
    echo "复制整行给对方导入 v2rayN / v2rayNG。不要公开这行链接。"
  else
    warn "还没有 Cloudflare 备用节点链接。请先安装。"
  fi
}

show_status(){
  echo "== 服务状态 =="
  systemctl is-active --quiet "$CF_SERVICE" && echo "[正常] $CF_SERVICE 运行中" || echo "[异常] $CF_SERVICE 未运行"
  systemctl is-active --quiet nginx && echo "[正常] nginx 运行中" || echo "[异常] nginx 未运行"
  echo
  echo "== 监听端口 =="
  ss -tulnp | grep -E ":443\\b|:$LOCAL_HTTPS_PORT\\b|:$CF_PORT\\b|nginx|xray" || true
  echo
  echo "== 本机反代测试 =="
  curl -k -I --resolve "$CF_DOMAIN:$LOCAL_HTTPS_PORT:127.0.0.1" "https://$CF_DOMAIN:$LOCAL_HTTPS_PORT/" --max-time 10 2>/dev/null | sed -n '1,8p' || true
  echo
  echo "== Cloudflare 域名解析 =="
  dig +short A "$CF_DOMAIN" 2>/dev/null || true
}

enable_cf_ws(){
  need_root
  systemctl enable --now "$CF_SERVICE"
  [[ -f "$NGINX_CONF" ]] || write_nginx_cf_ws
  nginx -t && systemctl reload nginx
  ok "Cloudflare WS 备用节点已开启。"
}

disable_cf_ws(){
  need_root
  systemctl disable --now "$CF_SERVICE" 2>/dev/null || true
  if [[ -f "$NGINX_CONF" ]]; then
    mv "$NGINX_CONF" "$NGINX_CONF.disabled.$(date +%F_%H%M%S)"
    nginx -t && systemctl reload nginx
  fi
  ok "Cloudflare WS 备用节点已关闭。"
}

uninstall_cf_ws(){
  need_root
  systemctl disable --now "$CF_SERVICE" 2>/dev/null || true
  rm -f "/etc/systemd/system/$CF_SERVICE.service"
  rm -f "$NGINX_CONF"
  systemctl daemon-reload
  nginx -t && systemctl reload nginx || true
  warn "已卸载 Cloudflare WS 服务和 nginx 配置。客户端链接文件仍在 $CF_CLIENT，可手动删除 $CF_BASE。"
}

menu(){
  while true; do
    header
    echo -e "${G}1${N}. 安装/重建 Cloudflare WS 备用节点"
    echo -e "${G}2${N}. 查看 Cloudflare 备用节点链接"
    echo -e "${G}3${N}. 查看状态"
    echo -e "${G}4${N}. 开启备用节点"
    echo -e "${G}5${N}. 关闭备用节点"
    echo -e "${R}20${N}. 卸载备用节点"
    echo -e "${G}0${N}. 退出"
    echo
    read -rp "请选择: " c || true
    case "$c" in
      1) header; install_cf_ws; pause ;;
      2) header; show_client; pause ;;
      3) header; show_status; pause ;;
      4) header; enable_cf_ws; pause ;;
      5) header; disable_cf_ws; pause ;;
      20) header; uninstall_cf_ws; pause ;;
      0) exit 0 ;;
      *) warn "无效选择"; sleep 1 ;;
    esac
  done
}

case "${1:-menu}" in
  menu) menu ;;
  install) install_cf_ws ;;
  show|show-client) show_client ;;
  status) show_status ;;
  enable|on) enable_cf_ws ;;
  disable|off) disable_cf_ws ;;
  uninstall) uninstall_cf_ws ;;
  update) install_shortcut ;;
  *) echo "用法: CF_DOMAIN=cf.gooffu.tech $0 {menu|install|show-client|status|enable|disable|uninstall|update}"; exit 1 ;;
esac
