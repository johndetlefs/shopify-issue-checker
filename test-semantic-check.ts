import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.universalstore.com/');
  
  const result = await page.evaluate(() => {
    const headerLinks = Array.from(document.querySelectorAll('header a, header button'))
      .filter((el: any) => {
        const rect = el.getBoundingClientRect();
        const text = el.innerText?.trim() || '';
        const href = el.href || '';
        
        const isUtility = text.toLowerCase().includes('search') ||
                         text.toLowerCase().includes('cart') ||
                         text.toLowerCase().includes('account') ||
                         text.toLowerCase().includes('login') ||
                         href.includes('/account') ||
                         href.includes('/cart') ||
                         href.includes('/search');
        
        return rect.top < 300 && text.length > 1 && text.length < 30 && !isUtility;
      });
    
    if (headerLinks.length === 0) return null;
    
    const navElements = document.querySelectorAll('nav, [role="navigation"]');
    const hasSemanticNav = navElements.length > 0;
    
    const linksInSemanticNav = headerLinks.filter((link: any) => 
      link.closest('nav') || link.closest('[role="navigation"]')
    );
    
    const linksWithRoles = headerLinks.filter((link: any) => 
      link.hasAttribute('role') && 
      (link.getAttribute('role') === 'menuitem' || link.getAttribute('role') === 'link')
    );
    
    return {
      totalMainNavLinks: headerLinks.length,
      linksInSemanticNav: linksInSemanticNav.length,
      linksWithRoles: linksWithRoles.length,
      hasNavElement: hasSemanticNav,
      percentageOutsideNav: Math.round(((headerLinks.length - linksInSemanticNav.length) / headerLinks.length) * 100),
      sampleLinks: headerLinks.slice(0, 5).map((link: any) => ({
        text: link.innerText?.substring(0, 20),
        href: link.href?.substring(0, 50),
        inNav: npx ts-node test-semantic-check.ts(link.closest('nav') || link.closest('[role="navigation"]')),
        hasRole: link.hasAttribute('role')
      }))
    };
  });
  
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
