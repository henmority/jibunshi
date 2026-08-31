#!/bin/sh
set -eu

osascript -e 'set the clipboard to (do shell script "/usr/bin/security find-generic-password -a admin -s jibunshi-admin.takatsugumihara.workers.dev -w")'

echo '管理者パスワードをクリップボードへコピーしました。'
