export interface PageContext {
  title: string;
  metaDescription: string;
  headings: string[];
  url: string;
}

export function scrapePageContext(): PageContext {
  const title = document.title || '';
  
  const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  
  const headings: string[] = [];
  const headingElements = document.querySelectorAll('h1, h2, h3');
  headingElements.forEach((element) => {
    const text = element.textContent?.trim();
    if (text && text.length > 0) {
      headings.push(text);
    }
  });

  return {
    title,
    metaDescription,
    headings: headings.slice(0, 5), // Limit to first 5 headings
    url: window.location.href
  };
}

export function getContextSummary(context: PageContext): string {
  const parts = [];
  
  if (context.title) {
    parts.push(`Page Title: ${context.title}`);
  }
  
  if (context.metaDescription) {
    parts.push(`Description: ${context.metaDescription}`);
  }
  
  if (context.headings.length > 0) {
    parts.push(`Key Topics: ${context.headings.join(', ')}`);
  }
  
  return parts.join(' | ');
}
