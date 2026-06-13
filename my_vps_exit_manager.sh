#!/usr/bin/env bash
set -Eeuo pipefail

VERSION="1.0.0-exit-manager"
XRAY_SERVICE="xray-racknerd-443"
XRAY_CONFIG="/etc/xray-racknerd-443/config.json"
RESI_CONF="/etc/myvps-residential-proxy.conf"

if [[ -t 1 ]]; then
  R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'; C='\033[0;36m'; W='\033[1m'; N='\033[0m'
else
  R=''; G=''; Y=''; C=''; W=''; N=''
fi

ok(){ echo -e "${G}[OK]${N} $*"; }
warn(){ echo -e "${Y}[注意]${N} $*"; }
err(){ echo -e "${R}[错误]${N} $*"; }
die(){ err "$*"; exit 1; }
need_root(){ [[ ${EUID:-0} -eq 0 ]] || die "请用 root 运行"; }
has(){ command -v "$1" >/dev/null 2>&1; }
pause(){ read -rp "按回车返回..." _ || true; }

header(){
  clear || true
  echo -e "${C}${W}╔══════════════════════════════════════╗${N}"
  echo -e "${C}${W}║       VPS 出口管理工具               ║${N}"
  echo -e "${C}${W}╚══════════════════════════════════════╝${N}"
  echo "版本: $VERSION"
  echo "用途: RackNerd 原生出口 / WARP 出口 / 住宅代理出口"
  echo
}

current_exit_ip(){
  curl -4 -s --max-time 10 https://api.ipify.org || true
}

show_exit_status(){
  need_root
  echo "== 当前出口 =="
  echo "IPv4: $(current_exit_ip)"
  echo
  echo "== 默认路由 =="
  ip route get 1.1.1.1 2>/dev/null || true
  echo
  echo "== WARP / WireGuard 服务 =="
  systemctl list-units --type=service --all | grep -Ei 'warp|wgcf|wireguard|wg-quick|cloudflared' || true
  echo
  echo "== Xray 出站模式 =="
  if [[ -f "$XRAY_CONFIG" ]]; then
    jq -r '.outbounds[]? | "tag=\(.tag // "") protocol=\(.protocol // "")"' "$XRAY_CONFIG" 2>/dev/null || true
  else
    warn "未找到 $XRAY_CONFIG"
  fi
  echo
  if systemctl is-active --quiet wg-quick@warp 2>/dev/null; then
    warn "当前系统级 WARP WireGuard 已启用，VPS 出站大概率走 WARP。"
  else
    ok "系统级 wg-quick@warp 未运行，VPS 出站通常走 RackNerd 原生出口，除非你配置了 Xray 住宅代理出站。"
  fi
}

restart_xray(){
  if systemctl list-unit-files | grep -q "^$XRAY_SERVICE.service"; then
    systemctl restart "$XRAY_SERVICE"
    ok "已重启 $XRAY_SERVICE"
  else
    warn "未发现 $XRAY_SERVICE，跳过重启。"
  fi
}

use_native_exit(){
  need_root
  warn "将切换到 RackNerd 原生出口。"
  systemctl stop wg-quick@warp 2>/dev/null || true
  systemctl disable wg-quick@warp 2>/dev/null || true
  # 只停 WireGuard WARP，不卸载官方 warp-svc，避免破坏已有环境。
  restart_xray
  echo
  show_exit_status
  echo
  ok "已切换为原生出口。目标网站看到的通常是 RackNerd VPS IP。"
}

use_warp_exit(){
  need_root
  warn "将切换到 WARP 出口。某些网站可能更容易访问，但 Grok 这类站点可能被 WARP IP 拦截。"
  systemctl enable --now wg-quick@warp 2>/dev/null || die "启动 wg-quick@warp 失败。请确认 /etc/wireguard/warp.conf 存在。"
  sleep 2
  restart_xray
  echo
  show_exit_status
  echo
  ok "已切换为 WARP 出口。目标网站看到的通常是 Cloudflare/WARP IP。"
}

backup_xray_config(){
  [[ -f "$XRAY_CONFIG" ]] || die "未找到 $XRAY_CONFIG"
  local bak="$XRAY_CONFIG.bak.$(date +%F_%H%M%S)"
  cp -a "$XRAY_CONFIG" "$bak"
  chmod 600 "$bak"
  ok "已备份 Xray 配置：$bak"
}

set_xray_direct_outbound(){
  need_root
  has jq || die "需要 jq"
  backup_xray_config
  tmp="$(mktemp)"
  jq '.outbounds = [{"tag":"direct","protocol":"freedom"},{"tag":"block","protocol":"blackhole"}]' "$XRAY_CONFIG" > "$tmp"
  install -m 600 "$tmp" "$XRAY_CONFIG"
  rm -f "$tmp"
  restart_xray
  ok "Xray 出站已改回 direct/freedom。"
}

write_resi_conf(){
  need_root
  echo "住宅代理需要正规代理商提供的 host、port、用户名、密码。"
  echo "协议一般是 socks 或 http。推荐 socks5。"
  echo
  read -rp "协议 [socks/http]: " proto
  proto="${proto,,}"
  [[ "$proto" == "socks" || "$proto" == "http" ]] || die "协议只能是 socks 或 http"
  read -rp "代理 host: " host
  read -rp "代理 port: " port
  read -rp "用户名，若无认证直接回车: " user
  read -rsp "密码，若无认证直接回车: " pass; echo
  [[ -n "$host" && "$port" =~ ^[0-9]+$ ]] || die "host/port 无效"
  umask 077
  cat > "$RESI_CONF" <<EOF_CONF
RESI_PROTO="$proto"
RESI_HOST="$host"
RESI_PORT="$port"
RESI_USER="$user"
RESI_PASS="$pass"
EOF_CONF
  chmod 600 "$RESI_CONF"
  ok "住宅代理配置已保存：$RESI_CONF"
  warn "这个文件含有代理账号密码，不要公开。"
}

apply_resi_outbound(){
  need_root
  has jq || die "需要 jq"
  [[ -f "$RESI_CONF" ]] || die "未找到 $RESI_CONF，请先配置住宅代理。"
  # shellcheck disable=SC1090
  source "$RESI_CONF"
  [[ -n "${RESI_PROTO:-}" && -n "${RESI_HOST:-}" && -n "${RESI_PORT:-}" ]] || die "住宅代理配置不完整"
  backup_xray_config
  local tmp users_json
  tmp="$(mktemp)"
  if [[ -n "${RESI_USER:-}" ]]; then
    users_json="[{\"user\":\"$RESI_USER\",\"pass\":\"${RESI_PASS:-}\"}]"
  else
    users_json="[]"
  fi
  jq --arg proto "$RESI_PROTO" --arg host "$RESI_HOST" --argjson port "$RESI_PORT" --argjson users "$users_json" \
    '.outbounds = [
      {"tag":"resi-proxy","protocol":$proto,"settings":{"servers":[{"address":$host,"port":$port,"users":$users}]}},
      {"tag":"direct","protocol":"freedom"},
      {"tag":"block","protocol":"blackhole"}
    ]' "$XRAY_CONFIG" > "$tmp"
  install -m 600 "$tmp" "$XRAY_CONFIG"
  rm -f "$tmp"
  restart_xray
  ok "Xray 出站已切换为住宅代理：$RESI_PROTO://$RESI_HOST:$RESI_PORT"
  warn "手机 VPN 重新连接后，目标网站看到的应是住宅代理出口 IP。"
}

test_resi_proxy_from_server(){
  need_root
  [[ -f "$RESI_CONF" ]] || die "未找到 $RESI_CONF"
  # shellcheck disable=SC1090
  source "$RESI_CONF"
  local auth="" url="https://api.ipify.org"
  if [[ -n "${RESI_USER:-}" ]]; then auth="${RESI_USER}:${RESI_PASS:-}@"; fi
  echo "== 从 VPS 直接测试住宅代理出口 =="
  if [[ "$RESI_PROTO" == "socks" ]]; then
    curl -4 --max-time 20 -s --socks5-hostname "${auth}${RESI_HOST}:${RESI_PORT}" "$url"; echo
  else
    curl -4 --max-time 20 -s -x "http://${auth}${RESI_HOST}:${RESI_PORT}" "$url"; echo
  fi
}

explain_residential(){
  cat <<'EOF_INFO'
== 住宅代理出口说明 ==

原理：
手机连接你的 VLESS Reality 节点后，请求先到 VPS，再由 VPS 的 Xray 出站转发到你购买的住宅代理。目标网站看到的是住宅代理 IP，而不是 RackNerd VPS IP。

链路：
手机 → VLESS Reality 443 → RackNerd VPS → 住宅 SOCKS5/HTTP 代理 → 目标网站

优点：
- 更像普通家庭宽带/移动网络出口。
- Grok、流媒体、部分风控严格的网站可能更容易通过。

缺点：
- 住宅代理通常比 VPS 原生出口慢。
- 价格更高，流量可能按 GB 计费。
- 代理商质量差会导致频繁掉线或被封。
- 账号密码会保存在 /etc/myvps-residential-proxy.conf，必须保护好。

注意：
只使用来源合法、服务条款允许的住宅代理。不要用它做刷号、欺诈、垃圾注册、爬虫滥用等行为。
EOF_INFO
}

menu(){
  while true; do
    header
    echo -e "${G}1${N}. 查看当前出口状态"
    echo -e "${G}2${N}. 切换到 RackNerd 原生出口"
    echo -e "${G}3${N}. 切换到 WARP 出口"
    echo -e "${G}4${N}. 配置住宅代理账号"
    echo -e "${G}5${N}. 让 Xray 出站走住宅代理"
    echo -e "${G}6${N}. 让 Xray 出站恢复 direct"
    echo -e "${G}7${N}. 从 VPS 测试住宅代理出口 IP"
    echo -e "${G}8${N}. 住宅代理说明"
    echo -e "${G}0${N}. 退出"
    echo
    read -rp "请选择: " c || true
    case "$c" in
      1) header; show_exit_status; pause ;;
      2) header; use_native_exit; pause ;;
      3) header; use_warp_exit; pause ;;
      4) header; write_resi_conf; pause ;;
      5) header; apply_resi_outbound; pause ;;
      6) header; set_xray_direct_outbound; pause ;;
      7) header; test_resi_proxy_from_server; pause ;;
      8) header; explain_residential; pause ;;
      0) exit 0 ;;
      *) warn "无效选择"; sleep 1 ;;
    esac
  done
}

case "${1:-menu}" in
  menu) menu ;;
  status) show_exit_status ;;
  native) use_native_exit ;;
  warp) use_warp_exit ;;
  resi-config) write_resi_conf ;;
  resi-on) apply_resi_outbound ;;
  direct) set_xray_direct_outbound ;;
  resi-test) test_resi_proxy_from_server ;;
  explain) explain_residential ;;
  *) echo "用法: $0 {menu|status|native|warp|resi-config|resi-on|direct|resi-test|explain}"; exit 1 ;;
esac
