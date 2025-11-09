// proxy-client.js
class ProxyInterceptor {
  constructor(proxyBaseUrl = 'http://localhost:3001/proxy') {
    this.proxyBaseUrl = proxyBaseUrl;
    this.setupFetchInterceptor();
    this.setupXHRInterceptor();
  }

  // Intercept fetch requests
  setupFetchInterceptor() {
    const originalFetch = window.fetch;
    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input.url;
      const config = typeof input === 'object' ? input : init;
      
      // Skip if already proxied or is a relative URL
      if (url.startsWith(this.proxyBaseUrl) || url.startsWith('/') || url.startsWith('.')) {
        return originalFetch(input, init);
      }

      // Build proxy URL with original target as parameter
      const proxyUrl = `${this.proxyBaseUrl}?target=${encodeURIComponent(url)}`;
      
      // Clone and modify config
      const proxiedConfig = {
        ...config,
        headers: {
          ...config.headers,
          // Add original target as header for consistency
          'X-Proxy-Target': url
        }
      };

      // Handle Request object
      if (typeof input === 'object' && input instanceof Request) {
        return originalFetch(
          new Request(proxyUrl, {
            method: input.method,
            headers: { ...input.headers, 'X-Proxy-Target': url },
            body: input.body,
            mode: 'cors',
            credentials: 'include'
          })
        );
      }

      console.log(`[Proxy] Intercepted: ${url}`);
      return originalFetch(proxyUrl, proxiedConfig);
    };
  }

  // Intercept XMLHttpRequest
  setupXHRInterceptor() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    let currentUrl = '';

    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      currentUrl = url;
      
      // Skip if already proxied or is relative
      if (url.startsWith('http://localhost:3001/proxy') || url.startsWith('/') || url.startsWith('.')) {
        return originalOpen.apply(this, arguments);
      }

      // Replace URL with proxy URL
      const proxyUrl = `http://localhost:3001/proxy?target=${encodeURIComponent(url)}`;
      console.log(`[Proxy] Intercepted XHR: ${url}`);
      
      // Call original with proxy URL
      return originalOpen.call(this, method, proxyUrl, async, user, password);
    };

    // Override setRequestHeader to add original target
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
      if (header.toLowerCase() === 'x-proxy-target') {
        return; // Prevent overriding
      }
      return originalSetRequestHeader.apply(this, arguments);
    };

    // Add original target header before sending
    XMLHttpRequest.prototype.send = function(data) {
      if (currentUrl && !currentUrl.startsWith('/') && !currentUrl.startsWith('.')) {
        this.setRequestHeader('X-Proxy-Target', currentUrl);
      }
      return originalSend.apply(this, arguments);
    };
  }
}

// Usage: Initialize in your app entry point
// new ProxyInterceptor('http://localhost:3001/proxy');
