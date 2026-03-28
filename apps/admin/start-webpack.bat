@echo off
REM 不使用 Turbopack，启动标准 Next.js 开发服务器

echo ================================================================
echo   启动 Next.js 开发服务器 (不使用 Turbopack)
echo ================================================================
echo.

REM 设置环境变量禁用 Turbopack
set NEXT_TURBOPACK=0
set TURBOPACK=0

REM 进入目录
cd /d %~dp0

REM 启动服务器
echo 正在启动...
npm run dev -- --no-turbopack

echo.
echo 服务器已停止
