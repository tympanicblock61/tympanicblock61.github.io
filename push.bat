@echo off
setlocal enabledelayedexpansion

:: Get the current directory name
for %%I in (.) do set REPO_NAME=%%~nxI

:: Check if it's a Git repository
if not exist ".git" (
    echo This is not a Git repository. Initializing...
    git init
    git remote add origin https://github.com/tympanicblock61/tympanicblock61.github.io.git
)

:: Add all changes
git add .

:: Commit with a timestamp
set "TIMESTAMP=%DATE% %TIME%"
git commit -m "Auto-commit: !TIMESTAMP!"

:: Push to the repository
git push origin main

echo Push completed.
pause
