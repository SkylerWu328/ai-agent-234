import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    
    const browser = await puppeteer.launch({
      headless: true,
    });
    
    const page = await browser.newPage();
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
    
    // 等待搜索结果加载
    await page.waitForSelector('div.g');
    
    // 提取搜索结果
    const results = await page.evaluate(() => {
      const items = document.querySelectorAll('div.g');
      return Array.from(items).slice(0, 5).map(item => {
        const titleElement = item.querySelector('h3');
        const snippetElement = item.querySelector('.VwiC3b');
        const linkElement = item.querySelector('a');
        
        return {
          title: titleElement?.textContent || '',
          snippet: snippetElement?.textContent || '',
          link: linkElement?.href || '',
        };
      });
    });
    
    await browser.close();
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('搜索出错:', error);
    return NextResponse.json({ error: '搜索请求失败' }, { status: 500 });
  }
} 