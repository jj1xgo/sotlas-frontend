# CLAUDE.md

## Best Practices（教訓蒸留）運用ルール

- 学びは `.claude/lessons.md` に随時記録する（git 管理外・コミット不要）
- `/update-best-practices`（グローバルコマンド、Opus 実行）が `.claude/lessons.md` を再分析し、
  `.claude/best_practices.md`（git 管理対象）を再合成する
  - 蒸留観点: 手戻り防止 / 判断コスト削減 / 信頼性の担保 / コンテキスト継続 / 仕様と実装の整合
  - 原則数目安: 14〜18件（増えすぎたら統合する）
  - 除外: プロジェクト固有の技術詳細は原則に含めない
  - 実行後、`.claude/best_practices.md` と `.claude/best_practices_watermark` はコマンド内でコミットまで完結する
- lessons.md が一定量増えるとセッション開始時に実行が自動的に推奨される（hooks 側で検知）
