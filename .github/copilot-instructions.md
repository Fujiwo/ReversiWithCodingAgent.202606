# Copilot Instructions

このリポジトリは、GitHub Copilot にブラウザー版リバーシゲームを生成させるためのプロンプトと、その生成結果を比較するためのワークスペースです。

## リポジトリ構成

- Visual Studio Code GitHub Copilot 用の生成先は `Source/VisualStudioCodeGitHubCopilot` です。
- GitHub Copilot Coding Agent 用の生成先は `Source/GitHubCopilotCodingAgent` です。
- プロンプトファイルは `.github/prompts` 配下に置きます。
- 2つの生成先を混在させたり、片方の実装をもう片方のフォルダーへ移動したりしないでください。

## 実装方針

- 生成するゲームは、HTML、CSS、バニラJavaScriptだけで完結させてください。
- 外部ライブラリ、パッケージマネージャー、ビルド工程は追加しないでください。
- リバーシのルール、AI難易度、テスト要件は、対応する `.github/prompts/*.prompt.md` の内容を優先してください。
- `game.js` では、テスト対象の関数を `window.ReversiGame` から参照できるようにしてください。
- `tests/tests.js` は import 文を使わず、`tests/tests.html` から `<script>` タグで読み込める形にしてください。

## UIと品質

- デスクトップとモバイルの両方で遊べるレスポンシブなUIにしてください。
- 合法手、現在の手番、スコア、最後に置いた石、反転した石が分かるようにしてください。
- 石の配置と反転には、プロンプトで指定されたCSS 3Dフリップアニメーションを使ってください。
- 未実装のTODO、ダミー処理、プレースホルダーを残さないでください。

## 検証

- 可能な場合は、対応する生成先フォルダーの `tests/tests.html` でテストを実行してください。
- ブラウザー実行が必要で自動検証できない場合は、確認した範囲と手動検証手順を明記してください。
- 変更後は、生成先フォルダーとプロンプトファイルの対応が崩れていないか確認してください。