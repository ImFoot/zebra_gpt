@echo off
setlocal
set "GODOT_EXE=%LOCALAPPDATA%\Programs\Godot\Godot_v4.7.2-stable_win64.exe"
if exist "%GODOT_EXE%" goto launch
for %%G in (godot.exe) do if not "%%~$PATH:G"=="" set "GODOT_EXE=%%~$PATH:G"
if exist "%GODOT_EXE%" goto launch
echo Godot 4.7 was not found. Open game\project.godot in Godot and press F6 from chase.tscn, or use F5.
pause
exit /b 1
:launch
start "" "%GODOT_EXE%" --path "%~dp0game"

