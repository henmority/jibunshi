#!/bin/sh
set -eu

security find-generic-password \
  -a admin \
  -s 'jibunshi-admin.takatsugumihara.workers.dev' \
  -w | tr -d '\n' | pbcopy

echo '管理者パスワードをクリップボードへコピーしました。'
