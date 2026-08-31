# GitHub + Cloudflare Workers 公開手順

このアプリは現在、設問を編集する管理者向け画面である。利用者向け画面が完成するまでは一般公開せず、Worker内認証で管理者だけが開けるようにする。

## 1. ローカルで確認

```bash
npm install
npm run typecheck
npm run build
npx wrangler deploy --dry-run
```

すべて成功してからGitHubへ送る。

## 2. GitHubの非公開リポジトリへ送る

GitHubで `jibunshi` という空のPrivateリポジトリを作る。README、`.gitignore`、ライセンスはGitHub側で追加しない。

```bash
git add .
git commit -m "Prepare Cloudflare Workers deployment"
git remote add origin https://github.com/YOUR_ACCOUNT/jibunshi.git
git push -u origin main
```

すでに `origin` がある場合は、追加せず `git remote -v` で接続先を確認する。

## 3. Cloudflare Workersへ接続

Cloudflareダッシュボードで次の順に操作する。

1. `Workers & Pages` を開く
2. `Create application` を選ぶ
3. `Import a repository` を選ぶ
4. GitHubを接続し、`jibunshi` リポジトリを選ぶ
5. Worker名を `jibunshi-admin` にする
6. Production branchを `main` にする
7. 次のビルド設定を入力する

| 項目 | 設定値 |
| --- | --- |
| Root directory | `/` |
| Build command | `npm ci && npm run build` |
| Deploy command | `npx wrangler deploy` |
| Preview deploy command | `npx wrangler versions upload` |

Worker名は `wrangler.jsonc` の `name` と一致させる。

## 4. 環境変数

公開URLは `wrangler.jsonc` の通常変数へ設定する。

| 名前 | 値 |
| --- | --- |
| `SITE_URL` | 最終的な管理画面URL |

管理画面の認証情報はCloudflare Secretへ設定する。

| Secret名 | 用途 |
| --- | --- |
| `ADMIN_PASSWORD` | 管理者ログイン用パスワード |
| `AUTH_COOKIE_SECRET` | 12時間有効なログインCookieの署名鍵 |

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put AUTH_COOKIE_SECRET
```

Secretの値を `.env`、GitHub、ブラウザのコードへ保存しない。このMacでは管理者パスワードをmacOSキーチェーンへ保存している。次のコマンドで、画面に表示せずクリップボードへコピーできる。

```bash
npm run auth:copy-password
```

AI連携を実装した後は、APIキーを通常変数ではなくSecretとして追加する。

| Secret名 | 用途 |
| --- | --- |
| `OPENAI_API_KEY` | AI生成APIの認証 |

AIの秘密鍵も `.env`、GitHub、ブラウザのコードへ保存しない。

## 5. 管理画面の認証を確認

デプロイ後、ログインしていないブラウザで公開URLを開き、管理画面ではなく「設問編集室へログイン」が表示されることを確認する。

1. `npm run auth:copy-password` でパスワードをコピーする
2. ログイン画面へ貼り付ける
3. 管理画面が表示されることを確認する
4. ヘッダーの「ログアウト」でログイン画面へ戻ることを確認する

ログインCookieは `HttpOnly`、`Secure`、`SameSite=Strict` で、12時間後に失効する。パスワードを変更する場合は `ADMIN_PASSWORD` を再登録し、macOSキーチェーンの同名項目も更新する。

### Cloudflare Accessへ移行する場合

複数管理者やメール認証が必要になった段階で、Worker単位のCloudflare Accessへ移行する。Zero Trust Freeの有効化画面では、無料枠超過分の支払い手段と請求同意を求められる場合があるため、カード登録と課金条件を確認してから有効化する。

## 6. 公開後の更新

通常の変更は作業ブランチで行う。

```bash
git switch -c feature/変更内容
git add .
git commit -m "変更内容"
git push -u origin feature/変更内容
```

Cloudflareが作る確認用URLで動作を確認し、GitHubのPull Requestを `main` へマージする。`main` の更新後、本番へ自動公開される。

問題が起きた場合は、CloudflareのWorkerにあるDeployments画面から直前の正常な版へ戻す。

## 7. 後から追加するもの

初回公開では、現在のブラウザ保存とJSON入出力を使用する。次の段階で追加する。

- D1による設問の下書き、公開版、変更履歴の保存
- 管理画面からのワンクリック公開・復元
- AI中継APIと利用回数制限
- 利用者向け画面と管理画面の分離

写真と利用者の回答は、利用者が明示的にクラウド保存を選ばない限りIndexedDBへ保存する。

## 公式資料

- [Cloudflare Workers Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/)
- [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare Access applications](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/)
- [Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
