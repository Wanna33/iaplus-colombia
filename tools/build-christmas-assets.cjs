// Web delivery variants only: preserve generated composition and text.
const path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..');
const sharp=require(require.resolve('sharp',{paths:[path.join(root,'whatsapp-bot')]}));
const jobs=[
 ['navidad-santa-portada-2026.png','navidad-santa-portada-2026.webp',1120,840,'webp',83],
 ['navidad-santa-portada-2026.png','navidad-santa-portada-2026-640.webp',640,480,'webp',80],
 ['navidad-santa-confianza-2026.png','navidad-santa-confianza-2026.webp',1280,720,'webp',83],
 ['navidad-santa-confianza-2026.png','navidad-santa-confianza-2026-720.webp',720,405,'webp',80],
 ['navidad-santa-bienvenida-2026.png','navidad-santa-bienvenida-2026.webp',1280,720,'webp',86],
 ['navidad-santa-bienvenida-2026.png','navidad-santa-bienvenida-enlace-2026.jpg',1200,630,'jpeg',88],
 ['navidad-santa-enlaces-2026.png','navidad-santa-enlaces-2026.jpg',1200,630,'jpeg',88]
];
(async()=>{
 for(const [source,target,width,height,format,quality] of jobs){
  const output=path.join(root,'assets',target);
  await sharp(path.join(root,'assets',source)).resize(width,height,{fit:'contain',background:'#092b1d'}).toFormat(format,{quality}).toFile(output);
  console.log(`${target}: ${width}x${height}, ${Math.round(fs.statSync(output).size/1024)} KB`);
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
