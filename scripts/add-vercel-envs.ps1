# PowerShell script to add Vercel environment variables
# Run this script in the project root directory

Write-Host "=== Configuring Vercel Environment Variables ===" -ForegroundColor Cyan
Write-Host ""

# Intl Project
Write-Host "Configuring intl project (vetsphere.net)..." -ForegroundColor Yellow
Set-Location e:\连川科技\vetsphere\apps\intl

Write-Host "Adding NEXT_PUBLIC_SITE_URL for intl..." -ForegroundColor Green
vercel env add NEXT_PUBLIC_SITE_URL production https://vetsphere.net

Write-Host "Adding NEXT_PUBLIC_SITE_URL for intl (development)..." -ForegroundColor Green
vercel env add NEXT_PUBLIC_SITE_URL development https://vetsphere.net

Write-Host "Adding NEXT_PUBLIC_SITE_URL for intl (preview)..." -ForegroundColor Green
vercel env add NEXT_PUBLIC_SITE_URL preview https://vetsphere.net

# CN Project
Write-Host "`nConfiguring cn project (vetsphere.cn)..." -ForegroundColor Yellow
Set-Location e:\连川科技\vetsphere\apps\cn

Write-Host "Adding NEXT_PUBLIC_SITE_URL for cn..." -ForegroundColor Green
vercel env add NEXT_PUBLIC_SITE_URL production https://vetsphere.cn

Write-Host "Adding NEXT_PUBLIC_SITE_URL for cn (development)..." -ForegroundColor Green
vercel env add NEXT_PUBLIC_SITE_URL development https://vetsphere.cn

Write-Host "Adding NEXT_PUBLIC_SITE_URL for cn (preview)..." -ForegroundColor Green
vercel env add NEXT_PUBLIC_SITE_URL preview https://vetsphere.cn

Write-Host "`n=== Configuration Complete! ===" -ForegroundColor Cyan
Write-Host "Please verify the environment variables in Vercel Dashboard:" -ForegroundColor Yellow
Write-Host "  - intl: https://vercel.com/adrians-projects-ca577ff4/intl/settings/environment-variables" -ForegroundColor White
Write-Host "  - cn: https://vercel.com/adrians-projects-ca577ff4/vetsphere-cn/settings/environment-variables" -ForegroundColor White
