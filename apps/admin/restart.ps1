# 🔧 产品管理按钮修复 - 一键重启脚本
# 使用方法：右键点击此文件，选择"使用 PowerShell 运行"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  产品管理按钮修复 - 重启脚本" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# 1. 停止所有 Node.js 进程
Write-Host "[1/4] 停止所有 Node.js 进程..." -ForegroundColor Yellow
try {
    Get-Process node -ErrorAction Stop | Stop-Process -Force
    Write-Host "  ✓ Node.js 进程已停止" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ 没有找到运行中的 Node.js 进程" -ForegroundColor Gray
}
Write-Host ""

# 2. 清除 Next.js 缓存
Write-Host "[2/4] 清除 Next.js 缓存..." -ForegroundColor Yellow
try {
    $nextPath = Join-Path $PSScriptRoot ".next"
    if (Test-Path $nextPath) {
        Remove-Item -Recurse -Force $nextPath
        Write-Host "  ✓ 缓存已清除" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ 缓存目录不存在" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠ 清除缓存失败：$($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  请手动删除 .next 文件夹后继续" -ForegroundColor Yellow
    pause
}
Write-Host ""

# 3. 进入目录
Write-Host "[3/4] 进入应用目录..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
Write-Host "  ✓ 当前目录：$PWD" -ForegroundColor Green
Write-Host ""

# 4. 启动开发服务器
Write-Host "[4/4] 启动开发服务器..." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 提示：" -ForegroundColor Cyan
Write-Host "  1. 服务器启动后，访问 http://localhost:3002/admin/products" -ForegroundColor White
Write-Host "  2. 按 Ctrl+C 可以停止服务器" -ForegroundColor White
Write-Host "  3. 按 F12 打开开发者工具，Ctrl+Shift+R 强制刷新浏览器" -ForegroundColor White
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# 启动服务器
npm run dev
