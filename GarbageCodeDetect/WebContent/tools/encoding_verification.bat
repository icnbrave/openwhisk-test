@echo off
ping 127.0.0.1 -n 3 -w 1000 > nul
echo %1:FR_FR:UTF-8:pass
