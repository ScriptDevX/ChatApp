/**
 * Coding File Upload & Base64/Data-URL Service
 * Supports only text/code files: HTML, Python, JS, TS, CSS, JSON, TXT, etc. Max 1MB.
 */

export const ALLOWED_CODE_EXTENSIONS = [
  '.html', '.htm',
  '.py',
  '.css', '.scss', '.sass', '.less',
  '.js', '.jsx', '.mjs', '.cjs',
  '.ts', '.tsx',
  '.json',
  '.txt', '.md',
  '.c', '.cpp', '.h', '.hpp', '.cs',
  '.java', '.kt', '.kts',
  '.php',
  '.rb',
  '.go',
  '.rs',
  '.sql',
  '.sh', '.bash',
  '.xml', '.svg', '.yaml', '.yml'
];

export const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB

export function isAllowedCodeFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_CODE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function readTextFileContent(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => reject(new Error('Failed to read text file'));
    reader.readAsText(file);
  });
}
