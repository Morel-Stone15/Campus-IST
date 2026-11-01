# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['start.py'],
    pathex=[],
    binaries=[],
    datas=[('c:/Users/user/Desktop/IST Campus/index.html', '.'), ('c:/Users/user/Desktop/IST Campus/css', 'css'), ('c:/Users/user/Desktop/IST Campus/js', 'js'), ('c:/Users/user/Desktop/IST Campus/assets', 'assets'), ('c:/Users/user/Desktop/IST Campus/campus-plus', 'campus-plus')],
    hiddenimports=['waitress', 'sqlite3', 'sqlalchemy', 'flask_sqlalchemy', 'flask_jwt_extended', 'flask_cors'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='CampusPlus',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
