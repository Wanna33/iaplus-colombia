// Web delivery variants only: preserve generated composition and text.
const path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..');
const sharp=require(require.resolve('sharp',{paths:[path.join(root,'whatsapp-bot')]}));
const jobs=[
 ['navidad-portada-2026.png','navidad-portada-2026.webp',1120,840,'webp',83],
 ['navidad-portada-2026.png','navidad-portada-2026-640.webp',640,480,'webp',80],
 ['navidad-confianza-2026.png','navidad-confianza-2026.webp',1280,720,'webp',83],
 ['navidad-confianza-2026.png','navidad-confianza-2026-720.webp',720,405,'webp',80],
 ['navidad-bienvenida-2026.png','navidad-bienvenida-2026.webp',1280,720,'webp',86],
 ['navidad-bienvenida-2026.png','navidad-bienvenida-enlace-2026.jpg',1200,630,'jpeg',88],
 ['navidad-enlaces-2026.png','navidad-enlaces-2026.jpg',1200,630,'jpeg',88]
];
(async()=>{
 for(const [source,target,width,height,format,quality] of jobs){
  const output=path.join(root,'assets',target);
  await sharp(path.join(root,'assets',source)).resize(width,height,{fit:'contain',background:source.includes('bienvenida')?'#0c2c20':'#fbf6e9'}).toFormat(format,{quality}).toFile(output);
  console.log(`${target}: ${width}x${height}, ${Math.round(fs.statSync(output).size/1024)} KB`);
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
