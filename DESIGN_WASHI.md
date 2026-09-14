# 和の親しみやすさを取り入れたデザイン

参考：https://obunko.org/

参考にした要素は、淡い紙色、山吹色と青緑の組み合わせ、切り絵風の人物、伝統的な文字と軽やかな構成。参考サイトの画像・ロゴ・文章・コードはコピーしていない。

利用者の画面構成・保存・設問・AI設定・印刷処理は維持する。挿絵はトップ画面に限定し、入力画面には色調だけを展開する。A4印刷用スタイルは変更しない。

## 挿絵

- 生成：内蔵の画像生成ツール（imagegenスキル、CLIではない）
- ファイル：`public/life-memories-washi.png`
- 内容：暮らし・学校・人との時間と、思い出をノートに書く場面。特定の利用者の人生を描いたものではない。
- 利用者の個人情報や回答データを生成へ送信していない。
- 画面上のイラストは装飾として扱い、見出し・説明・操作はHTMLで表示する。
- 現行Vinextで next/image が Invalid hook call を起こすため、寸法指定した標準imgで静的配信する。ページ表示のアニメーション待ちや画像変換APIへの依存は設けない。

## 最終生成プロンプト

Use case: illustration-story. Asset type: original hero illustration for a Japanese life-history writing web application. Create a refined, friendly contemporary Japanese cut-paper and woodblock-print collage, landscape 3:2 composition, not a web page mockup. Subject: a few gently connected memories of an ordinary life, with a person sitting and writing in an open notebook as the main scene, a small Japanese school building and two schoolchildren in the distance, two adults sharing tea, a simple house and a leafy tree, and a small bird. Express the idea that everyday memories become a life story. Modern everyday clothing, no historical costumes, no shrines, no temples, no festival processions. Simple human figures with coherent anatomy and subtly expressive poses, not childish mascots, no 3D. Medium: tactile washi-paper cutouts, softly irregular handmade edges, ink and gouache grain, restrained flat shapes with abundant breathing room between the scenes. Palette: warm pale cream background #f5efdf, mustard golden yellow, deep indigo teal, muted turquoise, small persimmon red accents. Loosely meandering golden cloud shapes tie the scenes together. An art-directed editorial composition, warm and welcoming, not a stock corporate vector illustration. Background at all outer edges should be very light cream and mostly empty so it can blend into a cream website. No rectangular border, no cards, no lettering, no logos, no watermark, no text of any kind. All objects comfortably inside the frame. This is an original generic illustration, not any specific real person's biography.
