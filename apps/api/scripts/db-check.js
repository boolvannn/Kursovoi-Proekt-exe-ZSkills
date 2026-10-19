/**
 * Проверка подключения к БД для лаунчера.
 * Лаунчер вызывает: npm run db:check (stdin: "SELECT 1;").
 * Код возврата 0 — БД доступна, 1 — недоступна.
 */
const { PrismaClient } = require('@prisma/client');

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(data));
    // На случай если stdin закрыт без данных.
    setTimeout(() => resolve(data), 2000).unref();
  });
}

async function main() {
  const stdinSql = (await readStdin()).trim();
  const sql = stdinSql
    ? stdinSql.replace(/;+\s*$/, '')
    : 'SELECT 1';

  const prisma = new PrismaClient();
  try {
    await prisma.$queryRawUnsafe(sql);
    console.log('Database connection OK.');
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((error) => {
  console.error('Database check failed:',
    error && error.message ? error.message : error);
  process.exitCode = 1;
});
