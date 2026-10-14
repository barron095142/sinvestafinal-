import asyncio,sys,os
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for name,w,h,scale in [('cover-a',1640,624,2),('cover-c',1640,624,2),('avatar',1080,1080,1)]:
            pg=await b.new_page(viewport={'width':w,'height':h},device_scale_factor=scale)
            await pg.goto(f'file://{os.path.dirname(os.path.abspath(__file__))}/{name}.html'); await pg.wait_for_timeout(500)
            await pg.screenshot(path=f'export/_{name}.png')
        await b.close()
os.chdir(os.path.dirname(os.path.abspath(__file__)))
asyncio.run(main())
from PIL import Image
for n in ['cover-a','cover-c']:
    im=Image.open(f'export/_{n}.png').convert('RGB'); im.save(f'export/Sinvesta-FB-{n}-HD.png')
    im.resize((1640,624),Image.LANCZOS).save(f'export/Sinvesta-FB-{n}.png')
Image.open('export/_avatar.png').convert('RGB').save('export/Sinvesta-FB-avatar.png')
import os
for n in ['cover-a','cover-c','avatar']: os.remove(f'export/_{n}.png')
