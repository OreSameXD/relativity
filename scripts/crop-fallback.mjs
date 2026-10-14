// Обрезает полосу прокрутки у снятого кадра и сохраняет как JPEG-подложку для версии без WebGL.
// Использование: node scripts/crop-fallback.mjs <src> <dst> [правый отступ px]
import sharp from 'sharp';
const [,, src, dst, trim = '16'] = process.argv;
const img = sharp(src);
const meta = await img.metadata();
await img.extract({ left: 0, top: 0, width: meta.width - Number(trim), height: meta.height }).jpeg({ quality: 82 }).toFile(dst);
console.log(dst, meta.width - Number(trim), meta.height);
