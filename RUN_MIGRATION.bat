@echo off
chcp 65001 >nul
echo ========================================
echo 外贸销售场景产品字段迁移
echo ========================================
echo.
echo 数据库迁移文件：execute_migration.sql
echo.
echo 请按照以下步骤执行迁移：
echo.
echo 1. 打开浏览器访问:
echo    https://supabase.com/dashboard
echo.
echo 2. 登录并进入 vetsphere 项目
echo.
echo 3. 导航到 SQL Editor
echo.
echo 4. 复制 execute_migration.sql 的全部内容
echo.
echo 5. 粘贴到 SQL Editor 并点击 Run
echo.
echo ========================================
echo 正在打开浏览器...
timeout /t 3 >nul
start https://supabase.com/dashboard/project/tvxrgbntiksskywsroax/editor/sql
echo.
echo 浏览器已打开，请按照步骤执行迁移
echo.
pause
