import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const targetPaths = [
  path.join(repoRoot, 'src', 'i18n', 'translations.ts'),
  path.join(repoRoot, 'src', 'screens', 'admin'),
];

const walk = (targetPath: string): string[] => {
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return [targetPath];
  return fs.readdirSync(targetPath).flatMap((entry) => walk(path.join(targetPath, entry)));
};

describe('encoding guard', () => {
  it('does not contain mojibake or replacement characters in admin/i18n sources', () => {
    const files = targetPaths.flatMap((targetPath) => walk(targetPath)).filter((filePath) =>
      /\.(ts|tsx)$/.test(filePath),
    );

    const invalidPatterns = [/\uFFFD/, /�/, /Ù[^\w]/, /Ø[^\w]/, /Ã[^\w]/, /Â[^\w]/];
    const offenders = files.filter((filePath) => {
      const text = fs.readFileSync(filePath, 'utf8');
      return invalidPatterns.some((pattern) => pattern.test(text));
    });

    expect(offenders).toEqual([]);
  });
});
