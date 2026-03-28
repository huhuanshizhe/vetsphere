# PowerShell 脚本：执行数据库迁移
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "外贸销售场景产品字段迁移" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$SQL_FILE = "execute_migration.sql"
$SQL_FILE_PATH = Join-Path $PSScriptRoot $SQL_FILE

if (-not (Test-Path $SQL_FILE_PATH)) {
    Write-Host "❌ 错误：找不到 $SQL_FILE" -ForegroundColor Red
    Write-Host "请确保脚本在项目根目录运行" -ForegroundColor Yellow
    exit 1
}

Write-Host "📄 SQL 文件位置：$SQL_FILE_PATH" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Supabase 不支持通过 API 直接执行 DDL 语句" -ForegroundColor Yellow
Write-Host ""
Write-Host "请按照以下步骤手动执行迁移：" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 打开浏览器访问：" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard" -ForegroundColor Blue
Write-Host ""
Write-Host "2. 登录并进入 vetsphere 项目" -ForegroundColor White
Write-Host ""
Write-Host "3. 导航到 SQL Editor" -ForegroundColor White
Write-Host ""
Write-Host "4. 复制以下文件的全部内容：" -ForegroundColor White
Write-Host "   $SQL_FILE_PATH" -ForegroundColor Blue
Write-Host ""
Write-Host "5. 粘贴到 SQL Editor 并点击 Run" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "准备打开浏览器..." -ForegroundColor Green
Write-Host ""

# 等待 3 秒
Start-Sleep -Seconds 3

# 打开浏览器
Start-Process "https://supabase.com/dashboard/project/tvxrgbntiksskywsroax/editor/sql"

Write-Host "✅ 浏览器已打开，请按照步骤执行迁移" -ForegroundColor Green
Write-Host ""
