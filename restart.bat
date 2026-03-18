@echo off
REM 重启 Vite 开发服务器脚本
REM 使用方法: restart.bat

set PORT=5180

echo 正在停止端口 %PORT% 上的服务...

REM 查找占用端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%" ^| findstr LISTENING') do (
    set PID=%%a
)

if defined PID (
    echo 找到进程 PID: %PID%，正在停止...
    taskkill /F /PID %PID% 2>nul || echo 进程已停止或不存在
    timeout /t 1 /nobreak >nul
) else (
    echo 端口 %PORT% 没有被占用
)

echo 正在启动开发服务器...
npm run dev
