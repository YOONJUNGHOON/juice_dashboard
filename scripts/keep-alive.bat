@echo off
REM Supabase keep-alive for Windows Task Scheduler.
REM Register it to run weekly (see README) if you are not using GitHub Actions.
cd /d "%~dp0.."
set KEEPALIVE_SOURCE=windows-task
node scripts\keep-alive.mjs
