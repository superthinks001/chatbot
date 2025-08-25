(function() {
  'use strict';
  
  // Configuration
  const CONFIG = {
    API_URL: 'http://localhost:4000/api/chat', // Change this to your deployed backend URL
    SEARCH_API_URL: 'http://localhost:4000/api/chat/search',
    WIDGET_ID: 'aldeia-advisor-widget',
    MINIMIZED_ID: 'aldeia-advisor-minimized',
    STYLES_ID: 'aldeia-advisor-styles'
  };

  // Check if already loaded
  if (document.getElementById(CONFIG.WIDGET_ID)) {
    return;
  }

  // Inject CSS
  const styles = document.createElement('style');
  styles.id = CONFIG.STYLES_ID;
  styles.textContent = `
    #${CONFIG.WIDGET_ID} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 380px;
      height: 500px;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    #${CONFIG.MINIMIZED_ID} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      transition: all 0.3s ease;
    }
    
    .aldeia-header {
      padding: 16px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .aldeia-messages {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      max-height: 240px;
    }
    
    .aldeia-message {
      margin-bottom: 12px;
      text-align: left;
    }
    
    .aldeia-message.user {
      text-align: right;
    }
    
    .aldeia-message-bubble {
      display: inline-block;
      background: #f8f9fa;
      border-radius: 12px;
      padding: 8px 12px;
      min-width: 60px;
      max-width: 300px;
      word-break: break-word;
      border: 1px solid #e0e0e0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      font-size: 13px;
      line-height: 1.4;
    }
    
    .aldeia-message-bubble.user {
      background: #e3f2fd;
    }
    
    .aldeia-message-bubble.greeting {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 16px 20px;
      border: 2px solid #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
      font-size: 14px;
      color: #2c3e50;
    }
    
    .aldeia-input-container {
      border-top: 1px solid #e0e0e0;
      padding: 12px 16px;
    }
    
    .aldeia-input-row {
      display: flex;
      gap: 8px;
    }
    
    .aldeia-input {
      flex: 1;
      padding: 12px 16px;
      border-radius: 24px;
      border: 1px solid #e0e0e0;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s ease;
    }
    
    .aldeia-input:disabled {
      background: #f5f5f5;
    }
    
    .aldeia-send-btn {
      padding: 12px 20px;
      border-radius: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
      min-width: 60px;
    }
    
    .aldeia-send-btn:disabled {
      background: #e0e0e0;
      cursor: not-allowed;
    }
    
    .aldeia-loading {
      padding: 8px 0;
      font-size: 12px;
      color: #666;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .aldeia-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #e0e0e0;
      border-top: 2px solid #667eea;
      border-radius: 50%;
      animation: aldeia-spin 1s linear infinite;
    }
    
    @keyframes aldeia-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .aldeia-docs {
      background: #fffde7;
      border: 1px solid #ffe082;
      border-radius: 8px;
      padding: 8px 12px;
      max-width: 320px;
      margin: 0 auto;
    }
    
    .aldeia-docs-title {
      font-weight: bold;
      margin-bottom: 6px;
    }
    
    .aldeia-doc-link {
      margin-bottom: 8px;
    }
    
    .aldeia-doc-link a {
      color: #1976d2;
      text-decoration: underline;
      cursor: pointer;
      font-size: 13px;
      color: #333;
    }
  `;
  document.head.appendChild(styles);

  // Utility functions
  function scrapePageContext() {
    const title = document.title || '';
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const headings = [];
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
      headings: headings.slice(0, 5),
      url: window.location.href
    };
  }

  function getContextSummary(context) {
    const parts = [];
    if (context.title) parts.push(`Page Title: ${context.title}`);
    if (context.metaDescription) parts.push(`Description: ${context.metaDescription}`);
    if (context.headings.length > 0) parts.push(`Key Topics: ${context.headings.join(', ')}`);
    return parts.join(' | ');
  }

  // Chat widget class
  class AldeiaAdvisor {
    constructor() {
      this.messages = [];
      this.loading = false;
      this.pageContext = scrapePageContext();
      this.hasGreeted = false;
      this.createWidget();
      this.autoGreet();
    }

    createWidget() {
      // Create minimized button
      const minimized = document.createElement('div');
      minimized.id = CONFIG.MINIMIZED_ID;
      minimized.innerHTML = '<div style="color: white; font-size: 24px;">💬</div>';
      minimized.onclick = () => this.showWidget();
      document.body.appendChild(minimized);

      // Create main widget
      const widget = document.createElement('div');
      widget.id = CONFIG.WIDGET_ID;
      widget.style.display = 'none';
      
      widget.innerHTML = `
        <div class="aldeia-header">
          <div>
            <div style="font-weight: bold; font-size: 16px;">Aldeia Advisor</div>
            <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">
              Context: ${this.pageContext.title}
            </div>
          </div>
          <button onclick="document.getElementById('${CONFIG.WIDGET_ID}').style.display='none';document.getElementById('${CONFIG.MINIMIZED_ID}').style.display='flex';" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 4px;">−</button>
        </div>
        <div class="aldeia-messages" id="aldeia-messages"></div>
        <div class="aldeia-input-container">
          <div class="aldeia-input-row">
            <input type="text" class="aldeia-input" id="aldeia-input" placeholder="Ask about fire recovery, permits, debris removal..." />
            <button class="aldeia-send-btn" id="aldeia-send-btn" onclick="window.aldeiaAdvisor.sendMessage()">Send</button>
          </div>
          <div class="aldeia-loading" id="aldeia-loading" style="display: none;">
            <div class="aldeia-spinner"></div>
            Aldeia is thinking...
          </div>
        </div>
      `;
      
      document.body.appendChild(widget);

      // Add event listeners
      const input = document.getElementById('aldeia-input');
      const sendBtn = document.getElementById('aldeia-send-btn');
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    showWidget() {
      document.getElementById(CONFIG.WIDGET_ID).style.display = 'flex';
      document.getElementById(CONFIG.MINIMIZED_ID).style.display = 'none';
      document.getElementById('aldeia-input').focus();
    }

    async autoGreet() {
      setTimeout(() => {
        if (!this.hasGreeted) {
          this.handleGreeting();
          this.hasGreeted = true;
        }
      }, 1000);
    }

    async handleGreeting() {
      this.loading = true;
      this.updateLoading();
      
      try {
        const requestBody = {
          message: '',
          context: getContextSummary(this.pageContext),
          pageUrl: this.pageContext.url,
          isFirstMessage: true
        };

        const res = await fetch(CONFIG.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        const data = await res.json();
        
        this.addMessage('bot', data.response, data.confidence, data.bias, data.uncertainty, true);
      } catch (err) {
        console.error('Greeting error:', err);
      } finally {
        this.loading = false;
        this.updateLoading();
      }
    }

    async sendMessage() {
      const input = document.getElementById('aldeia-input');
      const text = input.value.trim();
      
      if (!text || this.loading) return;
      
      input.value = '';
      this.addMessage('user', text);
      this.loading = true;
      this.updateLoading();
      
      try {
        const requestBody = {
          message: text,
          context: getContextSummary(this.pageContext),
          pageUrl: this.pageContext.url,
          isFirstMessage: false
        };

        const res = await fetch(CONFIG.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        const data = await res.json();
        
        this.addMessage('bot', data.response, data.confidence, data.bias, data.uncertainty);

        // Get document matches
        const searchRes = await fetch(CONFIG.SEARCH_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text }),
        });
        const searchData = await searchRes.json();
        
        if (searchData.matches && searchData.matches.length > 0) {
          this.addDocumentMatches(searchData.matches.slice(0, 3));
        }
      } catch (err) {
        this.addMessage('bot', 'I apologize, but something went wrong. Please try again.');
      } finally {
        this.loading = false;
        this.updateLoading();
      }
    }

    addMessage(sender, text, confidence, bias, uncertainty, isGreeting = false) {
      this.messages.push({ sender, text, confidence, bias, uncertainty, isGreeting });
      this.renderMessages();
    }

    addDocumentMatches(matches) {
      this.messages.push({ sender: 'docs', matches });
      this.renderMessages();
    }

    renderMessages() {
      const container = document.getElementById('aldeia-messages');
      container.innerHTML = '';
      
      this.messages.forEach((msg, idx) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `aldeia-message ${msg.sender}`;
        
        if (msg.sender === 'docs' && msg.matches) {
          messageDiv.innerHTML = `
            <div class="aldeia-docs">
              <div class="aldeia-docs-title">Relevant Documents:</div>
              ${msg.matches.map(match => `
                <div class="aldeia-doc-link">
                  <a href="/${encodeURIComponent(match.source.toLowerCase().includes('pasadena') ? 'Pasadena County' : 'LA County')}/${encodeURIComponent(match.source)}" target="_blank">
                    <div>${match.text.slice(0, 220)}${match.text.length > 220 ? '...' : ''}</div>
                  </a>
                </div>
              `).join('')}
            </div>
          `;
        } else {
          const bubbleClass = `aldeia-message-bubble ${msg.sender}${msg.isGreeting ? ' greeting' : ''}`;
          messageDiv.innerHTML = `<div class="${bubbleClass}">${msg.text}</div>`;
        }
        
        container.appendChild(messageDiv);
      });
      
      container.scrollTop = container.scrollHeight;
    }

    updateLoading() {
      const loading = document.getElementById('aldeia-loading');
      const input = document.getElementById('aldeia-input');
      const sendBtn = document.getElementById('aldeia-send-btn');
      
      if (this.loading) {
        loading.style.display = 'flex';
        input.disabled = true;
        sendBtn.disabled = true;
      } else {
        loading.style.display = 'none';
        input.disabled = false;
        sendBtn.disabled = false;
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.aldeiaAdvisor = new AldeiaAdvisor();
    });
  } else {
    window.aldeiaAdvisor = new AldeiaAdvisor();
  }
})(); 