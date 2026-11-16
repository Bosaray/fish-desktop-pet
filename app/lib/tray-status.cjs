'use strict';
function statusIcon(nativeImage,file,connected){
 const size=24,base=nativeImage.createFromPath(file).resize({width:18,height:18}).toBitmap(),out=Buffer.alloc(size*size*4),rgb=connected?[230,133,35]:[35,190,245];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4;if((x-11.5)**2+(y-11.5)**2>144)continue;
  out[i]=rgb[0];out[i+1]=rgb[1];out[i+2]=rgb[2];out[i+3]=255;
  if(x>=3&&x<21&&y>=3&&y<21){const j=((y-3)*18+x-3)*4,a=base[j+3]/255;for(let k=0;k<3;k++)out[i+k]=Math.round(base[j+k]*a+out[i+k]*(1-a));}
 }
 return nativeImage.createFromBitmap(out,{width:size,height:size,scaleFactor:1});
}
module.exports={statusIcon};
