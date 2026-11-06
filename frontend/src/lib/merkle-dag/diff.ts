import type { CharacterDiffItem } from './types';

export function computeCharacterDiff(
  oldText: string,
  newText: string,
  newAuthor = 'Editor'
): CharacterDiffItem[] {
  const m = oldText.length;
  const n = newText.length;

  // Matrix for Longest Common Subsequence (LCS)
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (oldText[i] === newText[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to build diff
  let i = m;
  let j = n;
  const diffReverse: CharacterDiffItem[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldText[i - 1] === newText[j - 1]) {
      diffReverse.push({
        type: 'unchanged',
        char: oldText[i - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diffReverse.push({
        type: 'added',
        char: newText[j - 1],
        author: newAuthor,
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diffReverse.push({
        type: 'removed',
        char: oldText[i - 1],
      });
      i--;
    }
  }

  return diffReverse.reverse();
}

export function groupDiffItems(diffItems: CharacterDiffItem[]): Array<{
  type: 'added' | 'removed' | 'unchanged';
  text: string;
  author?: string;
}> {
  if (diffItems.length === 0) return [];

  const groups: Array<{
    type: 'added' | 'removed' | 'unchanged';
    text: string;
    author?: string;
  }> = [];

  let currentType = diffItems[0].type;
  let currentAuthor = diffItems[0].author;
  let currentText = diffItems[0].char;

  for (let i = 1; i < diffItems.length; i++) {
    const item = diffItems[i];
    if (item.type === currentType && item.author === currentAuthor) {
      currentText += item.char;
    } else {
      groups.push({ type: currentType, text: currentText, author: currentAuthor });
      currentType = item.type;
      currentAuthor = item.author;
      currentText = item.char;
    }
  }

  groups.push({ type: currentType, text: currentText, author: currentAuthor });
  return groups;
}
