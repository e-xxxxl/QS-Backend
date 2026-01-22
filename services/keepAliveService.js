// services/keepAliveService.js
const cron = require('node-cron');
const axios = require('axios');
const https = require('https');

class KeepAliveService {
  constructor() {
    this.isRunning = false;
    this.pingHistory = [];
    this.maxHistory = 50;
    
    // Configuration
    this.config = {
      // Your QuickShip backend URLs
      urls: [
        process.env.BACKEND_URL || 'https://qs-backend-ekqy.onrender.com',
        // Add frontend if separate
        // process.env.FRONTEND_URL || 'https://quickship-dashboard.onrender.com'
      ],
      endpoints: ['/api/health', '/api/dashboard/stats', '/ping'],
      interval: '*/14 * * * *', // Every 14 minutes
      timeout: 15000, // 15 seconds
      retryAttempts: 2,
      logToFile: process.env.NODE_ENV === 'production'
    };
    
    // HTTP agent for better performance
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true,
      maxSockets: 5
    });
  }

  async pingServer(url, endpoint = '/api/health') {
    const fullUrl = `${url}${endpoint}`;
    const startTime = Date.now();
    
    try {
      const response = await axios.get(fullUrl, {
        timeout: this.config.timeout,
        httpsAgent: this.httpsAgent,
        headers: {
          'User-Agent': 'QuickShip-KeepAlive/1.0',
          'X-KeepAlive-Timestamp': new Date().toISOString()
        }
      });
      
      const latency = Date.now() - startTime;
      const status = response.status;
      
      // Log success
      this.logPing({
        timestamp: new Date().toISOString(),
        url: fullUrl,
        status,
        latency,
        success: true,
        data: response.data
      });
      
      return { success: true, latency, status, data: response.data };
      
    } catch (error) {
      const latency = Date.now() - startTime;
      
      this.logPing({
        timestamp: new Date().toISOString(),
        url: fullUrl,
        status: error.response?.status || 0,
        latency,
        success: false,
        error: error.message
      });
      
      return { 
        success: false, 
        latency, 
        status: error.response?.status,
        error: error.message 
      };
    }
  }

  logPing(data) {
    // Add to in-memory history
    this.pingHistory.unshift(data);
    if (this.pingHistory.length > this.maxHistory) {
      this.pingHistory.pop();
    }
    
    // Console log with colors
    const timestamp = new Date().toLocaleTimeString();
    if (data.success) {
      console.log(`✅ [${timestamp}] ${data.url} - ${data.status} (${data.latency}ms)`);
    } else {
      console.log(`❌ [${timestamp}] ${data.url} - FAILED: ${data.error}`);
    }
    
    // Optional: Log to file in production
    if (this.config.logToFile) {
      const fs = require('fs');
      const logEntry = `${new Date().toISOString()},${data.url},${data.success ? 'SUCCESS' : 'FAILED'},${data.status},${data.latency},${data.error || ''}\n`;
      fs.appendFileSync('keepalive-logs.csv', logEntry);
    }
  }

  async performHealthCheck() {
    console.log(`🔍 Starting health check at ${new Date().toLocaleTimeString()}`);
    
    const results = [];
    
    for (const url of this.config.urls) {
      // Try primary endpoint first
      let result = await this.pingServer(url, '/api/health');
      
      // If health endpoint fails, try dashboard stats (more likely to be cached)
      if (!result.success) {
        console.log(`🔄 Health endpoint failed, trying dashboard stats...`);
        result = await this.pingServer(url, '/api/dashboard/stats');
      }
      
      // If still failing, try simple ping
      if (!result.success) {
        console.log(`🔄 Dashboard failed, trying simple ping...`);
        result = await this.pingServer(url, '/ping');
      }
      
      results.push({
        url,
        success: result.success,
        latency: result.latency,
        endpointUsed: result.success ? 'working' : 'all failed'
      });
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    console.log(`📊 Summary: ${successful}/${results.length} services responding`);
    
    return results;
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Keep-alive service already running');
      return;
    }
    
    console.log('🚀 Starting QuickShip Keep-Alive Service');
    console.log(`📡 Monitoring: ${this.config.urls.join(', ')}`);
    console.log(`⏰ Schedule: ${this.config.interval}`);
    
    // Schedule the main job
    cron.schedule(this.config.interval, async () => {
      console.log('\n--- Scheduled Ping ---');
      await this.performHealthCheck();
      console.log('--- End Ping ---\n');
    });
    
    // Initial check after 10 seconds
    setTimeout(() => {
      this.performHealthCheck();
    }, 10000);
    
    this.isRunning = true;
    console.log('✅ Keep-alive service started successfully');
  }

  stop() {
    // For future use if you need to stop the service
    this.isRunning = false;
    console.log('🛑 Keep-alive service stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastPings: this.pingHistory.slice(0, 5),
      totalPings: this.pingHistory.length,
      successRate: this.pingHistory.length > 0 
        ? (this.pingHistory.filter(p => p.success).length / this.pingHistory.length * 100).toFixed(1)
        : 0
    };
  }
}

// Singleton instance
const keepAliveService = new KeepAliveService();

// Export for use in your app
module.exports = keepAliveService;