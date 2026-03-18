#!/bin/bash

# 重启 Vite 开发服务器脚本
# 使用方法: ./restart.sh

PORT=5180

echo "正在停止端口 $PORT 上的服务..."

# Windows 下使用 netstat 查找占用端口的进程
PID=$(netstat -ano | grep ":$PORT" | grep LISTENING | awk '{print $5}' | head -1)

if [ -n "$PID" ]; then
  echo "找到进程 PID: $PID，正在停止..."
  taskkill //F //PID $PID 2>/dev/null || echo "进程已停止或不存在"
  sleep 1
else
  echo "端口 $PORT 没有被占用"
fi

echo "正在启动开发服务器..."
npm run dev
