#!/usr/bin/env bash
set -Eeuo pipefail

VERSION="1.0.1-exit-switch"
XRAY_SERVICE="xray-racknerd-443"
XRAY_CONFIG="/etc/xray-racknerd-443/config.json"
WARP_WG_SERVICE="wg-quick@warp"

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
pause(){ read -rp "按回车返回..." _ || true; }

header(){
  clear || true
  echo -e "${C}${W}╔══════════════════════════════════════╗${N}"
  echo -e "${C}${W}║       VPS 出口切换工具               ║${N}"
  echo -e "${C}${W}╚══════════════════════════════════════╝${N}"
  echo "版本: $VERSION"
  echo "用途: 原生出口 / WARP 出口 / 住宅IP预留"
  echo
}

current_exit_ip(){
  curl -4 -s --max-time 10 https://api.ipify.org || true
}

restart_xray(){
  if systemctl list-unit-files | grep -q "^$XRAY_SERVICE.service"; then
    systemctl restart "$XRAY_SERVICE"
    ok "已重启 $XRAY_SERVICE"
  else
    warn "未发现 $XRAY_SERVICE，跳过重启。"
  fi
}

show_exit_status(){
  need_root
  echo "== 当前出口 =="
  echo "IPv4: $(current_exit_ip)"
  echo
  echo "== 默认路由 =="
  ip route get 1.1.1.1 2>/dev/null || true
  echo
  echo "== WARP 相关服务 =="
  systemctl list-units --type=service --all | grep -Ei 'warp|wgcf|wireguard|wg-quick|cloudflared' || true
  echo
  echo "== 判断 =="
  if systemctl is-active --quiet "$WARP_WG_SERVICE" 2>/dev/null; then
    warn "当前 $WARP_WG_SERVICE 正在运行，VPS 出站大概率走 WARP。"
  else
    ok "当前 $WARP_WG_SERVICE 未运行，VPS 出站大概率走 RackNerd 原生出口。"
  fi
  if [[ -f "$XRAY_CONFIG" ]]; then
    echo
    echo "== Xray 出站配置摘要 =="
    jq -r '.outbounds[]? | "tag=\(.tag // "") protocol=\(.protocol // "")"' "$XRAY_CONFIG" 2>/dev/null || true
  fi
}

use_native_exit(){
  need_root
  warn "将切换到 RackNerd 原生出口，并关闭 WARP WireGuard 自启。"
  systemctl stop "$WARP_WG_SERVICE" 2>/dev/null || true
  systemctl disable "$WARP_WG_SERVICE" 2>/dev/null || true
  restart_xray
  echo
  show_exit_status
  echo
  ok "已切换为 RackNerd 原生出口。Grok 当前建议用这个模式。"
}

use_warp_exit(){
  need_root
  warn "将切换到 WARP 出口。某些网站可能更容易访问，但 Grok 可能再次被拦。"
  systemctl enable --now "$WARP_WG_SERVICE" 2>/dev/null || die "启动 $WARP_WG_SERVICE 失败。请确认 /etc/wireguard/warp.conf 存在。"
  sleep 2
  restart_xray
  echo
  show_exit_status
  echo
  ok "已切换为 WARP 出口。"
}

residential_placeholder(){
  cat <<'EOF_INFO'
== 住宅 IP 出口预留 ==

这个选项现在只做预留和说明，不会修改 Xray 配置，也不会改系统路由。

准确原理：
VPS 的入站 IP 不会变，2b.gooffu.tech 仍然指向 107.175.229.180。
真正能改变的是“目标网站看到的出口 IP”。以后如果接入正规住宅/ISP 代理，链路会变成：

手机 → VLESS Reality 443 → RackNerd VPS → 住宅/ISP 代理 → 目标网站

到时候目标网站看到的是住宅/ISP 代理出口，而不是 RackNerd 或 WARP。

以后需要的代理商参数：
- 协议：SOCKS5 或 HTTP
- 地址：host
- 端口：port
- 用户名：username，若有
- 密码：password，若有
- 类型：建议固定静态住宅 IP / ISP proxy，不建议频繁轮换的动态住宅 IP

当前建议：
- 先继续用 RackNerd 原生出口；你已经验证 Grok 可用。
- WARP 保留备用。
- 买住宅/ISP 代理前，先确认代理商允许你的使用场景、支持长会话、支持固定地区和固定出口。
EOF_INFO
}

menu(){
  while true; do
    header
    echo -e "${G}1${N}. 查看当前出口状态"
    echo -e "${G}2${N}. 切换到 RackNerd 原生出口"
    echo -e "${G}3${N}. 切换到 WARP 出口"
    echo -e "${G}4${N}. 住宅 IP 出口预留说明"
    echo -e "${G}0${N}. 退出"
    echo
    read -rp "请选择: " c || true
    case "$c" in
      1) header; show_exit_status; pause ;;
      2) header; use_native_exit; pause ;;
      3) header; use_warp_exit; pause ;;
      4) header; residential_placeholder; pause ;;
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
  residential|resi|resi-placeholder) residential_placeholder ;;
  *) echo "用法: $0 {menu|status|native|warp|residential}"; exit 1 ;;
esac
