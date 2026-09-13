Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies "System.Drawing.dll" -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class GoatLogoRepair {
  static byte[] Read(Bitmap bitmap, out BitmapData data) {
    data = bitmap.LockBits(new Rectangle(0, 0, bitmap.Width, bitmap.Height), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    var bytes = new byte[Math.Abs(data.Stride) * bitmap.Height];
    Marshal.Copy(data.Scan0, bytes, 0, bytes.Length); return bytes;
  }
  public static void Run(string sourcePath, string maskedPath, string assetDir) {
    using (var source = new Bitmap(sourcePath)) using (var masked = new Bitmap(maskedPath)) {
      BitmapData sd, md; var sb = Read(source, out sd); var mb = Read(masked, out md);
      int w = masked.Width, h = masked.Height, stride = Math.Abs(md.Stride);
      var exterior = new bool[w * h]; var queue = new Queue<int>();
      Action<int,int> add = (x, y) => { int i = y*w+x; if (exterior[i] || mb[y*stride+x*4+3] >= 250) return; exterior[i]=true; queue.Enqueue(i); };
      for (int x=0; x<w; x++) { add(x,0); add(x,h-1); }
      for (int y=0; y<h; y++) { add(0,y); add(w-1,y); }
      while (queue.Count>0) { int i=queue.Dequeue(), x=i%w, y=i/w; if(x>0)add(x-1,y); if(x+1<w)add(x+1,y); if(y>0)add(x,y-1); if(y+1<h)add(x,y+1); }
      for (int y=0; y<h; y++) for(int x=0;x<w;x++) { int i=y*w+x, o=y*stride+x*4; if(exterior[i]) { mb[o]=0; mb[o+1]=0; mb[o+2]=0; mb[o+3]=0; } else if(y<760 && mb[o+3]<250) { mb[o]=sb[o]; mb[o+1]=sb[o+1]; mb[o+2]=sb[o+2]; mb[o+3]=255; } }
      Marshal.Copy(mb,0,md.Scan0,mb.Length); source.UnlockBits(sd); masked.UnlockBits(md);
      SaveCrop(masked,new Rectangle(0,0,w,h),System.IO.Path.Combine(assetDir,"goat-logo-cutout.png"),24);
      SaveCrop(masked,new Rectangle(0,0,w,760),System.IO.Path.Combine(assetDir,"goat-symbol-cutout.png"),18);
      SaveCrop(masked,new Rectangle(0,760,w,h-760),System.IO.Path.Combine(assetDir,"goat-wordmark-cutout.png"),18);
    }
  }
  static void SaveCrop(Bitmap bitmap, Rectangle scan, string path, int padding) {
    int minX=scan.Right,minY=scan.Bottom,maxX=scan.Left,maxY=scan.Top;
    var d=bitmap.LockBits(scan,ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb); int stride=Math.Abs(d.Stride); var b=new byte[stride*scan.Height]; Marshal.Copy(d.Scan0,b,0,b.Length); bitmap.UnlockBits(d);
    for(int y=0;y<scan.Height;y++) for(int x=0;x<scan.Width;x++) if(b[y*stride+x*4+3]>8){minX=Math.Min(minX,scan.Left+x);minY=Math.Min(minY,scan.Top+y);maxX=Math.Max(maxX,scan.Left+x);maxY=Math.Max(maxY,scan.Top+y);}
    int left=Math.Max(scan.Left,minX-padding),top=Math.Max(scan.Top,minY-padding),right=Math.Min(scan.Right-1,maxX+padding),bottom=Math.Min(scan.Bottom-1,maxY+padding);
    using(var crop=bitmap.Clone(new Rectangle(left,top,right-left+1,bottom-top+1),PixelFormat.Format32bppArgb)) crop.Save(path,ImageFormat.Png);
  }
}
'@
$assetDir = (Resolve-Path "$PSScriptRoot/../artifacts/goat-mobile/assets/images").Path
[GoatLogoRepair]::Run((Join-Path $assetDir "goat-logo-full.png"),(Join-Path $assetDir "goat-logo-transparent.png"),$assetDir)
