# GitHub + Cloudflare Workers 公開手順

このアプリは現在、設問を編集する管理者向け画面である。利用者向け画面が完成するまでは一般公開せず、Cloudflare Accessで管理者だけが開けるようにする。

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

CloudflareのWorker設定から、次の通常変数を追加する。

| 名前 | 値 |
| --- | --- |
| `SITE_URL` | 最終的な管理画面URL。例: `https://admin.example.com` |

AI連携を実装した後は、APIキーを通常変数ではなくSecretとして追加する。

| Secret名 | 用途 |
| --- | --- |
| `OPENAI_API_KEY` | AI生成APIの認証 |

秘密鍵を `.env`、GitHub、ブラウザのコードへ保存しない。

## 5. 管理画面をAccessで保護

独自ドメインをCloudflareで管理している場合、先にZero Trust側で `admin.example.com` を保護する。

1. `Zero Trust` を開く
2. `Access controls` → `Applications`
3. `Create new application`
4. `Self-hosted` を選ぶ
5. Public hostnameへ `admin.example.com` を入力する
6. `Allow` ポリシーを作る
7. 自分のメールアドレス、またはCloudflare Account Memberだけを許可する
8. セッション時間を設定して保存する

Accessを設定した後、Workerで次の操作を行う。

1. `Workers & Pages` → `jibunshi-admin`
2. `Settings` → `Domains & Routes`
3. `Add` → `Custom Domain`
4. `admin.example.com` を追加する

ログインしていないブラウザから開き、管理画面ではなくAccessの認証画面が表示されることを確認する。

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
