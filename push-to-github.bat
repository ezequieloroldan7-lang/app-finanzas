@echo off
cd /d "%~dp0"
echo.
echo ========================================
echo   Subiendo app-finanzas a GitHub
echo ========================================
echo.

:: Inicializar git si no existe
if not exist ".git" (
    echo [1/5] Inicializando repositorio git...
    git init
) else (
    echo [1/5] Repositorio git ya existe, continuando...
)

:: Configurar remote
echo [2/5] Configurando remote origin...
git remote remove origin 2>nul
git remote add origin https://github.com/ezequieloroldan7-lang/app-finanzas.git

:: Agregar todos los archivos
echo [3/5] Agregando archivos...
git add -A

:: Commit (allow-empty por si ya todo estaba commiteado)
echo [4/5] Creando commit...
git commit -m "feat: app de finanzas personales" --allow-empty

:: Renombrar rama a main (funcione desde master o cualquier otro nombre)
echo Renombrando rama a main...
git branch -M main

:: Push
echo [5/5] Subiendo a GitHub...
echo.
echo  NOTA: Si te pide usuario y contrasena, usa tu token de GitHub como contrasena.
echo.
git push -u origin main --force

echo.
if %ERRORLEVEL% == 0 (
    echo ========================================
    echo   Listo! Repositorio subido con exito.
    echo   https://github.com/ezequieloroldan7-lang/app-finanzas
    echo ========================================
) else (
    echo ========================================
    echo   Error al pushear. Posibles causas:
    echo   - Autenticacion: necesitas un Personal Access Token
    echo     github.com -> Settings -> Developer settings
    echo     -> Personal access tokens -> Generate new token (classic)
    echo     Scope: repo. Usalo como contrasena cuando lo pida.
    echo   - El repo no existe aun: crealo en github.com primero
    echo     (sin inicializar con README)
    echo ========================================
)
echo.
pause
