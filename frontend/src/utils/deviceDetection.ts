export interface DeviceInfo {
  browser: string;
  version: string;
  os: string;
  isMobile: boolean;
  supportsWebSpeech: boolean;
  recommendedMethod: 'web-speech' | 'azure-speech';
}

export class DeviceDetector {
  /**
   * Detect device and browser information
   */
  static detect(): DeviceInfo {
    const ua = navigator.userAgent;

    const browser = this.detectBrowser(ua);
    const version = this.detectVersion(ua, browser);
    const os = this.detectOS(ua);
    const isMobile = this.isMobileDevice(ua);
    const supportsWebSpeech = this.checkWebSpeechSupport();
    const recommendedMethod = this.getRecommendedMethod(browser, version, supportsWebSpeech);

    return {
      browser,
      version,
      os,
      isMobile,
      supportsWebSpeech,
      recommendedMethod
    };
  }

  /**
   * Check if Web Speech API is available
   */
  private static checkWebSpeechSupport(): boolean {
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition
    );
  }

  /**
   * Detect browser name
   */
  private static detectBrowser(ua: string): string {
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
    if (ua.includes('SamsungBrowser')) return 'Samsung Internet';
    return 'Unknown';
  }

  /**
   * Detect browser version
   */
  private static detectVersion(ua: string, browser: string): string {
    let match;
    switch (browser) {
      case 'Chrome':
        match = ua.match(/Chrome\/(\d+)/);
        break;
      case 'Edge':
        match = ua.match(/Edg\/(\d+)/);
        break;
      case 'Safari':
        match = ua.match(/Version\/(\d+)/);
        break;
      case 'Firefox':
        match = ua.match(/Firefox\/(\d+)/);
        break;
      case 'Opera':
        match = ua.match(/(?:OPR|Opera)\/(\d+)/);
        break;
      case 'Samsung Internet':
        match = ua.match(/SamsungBrowser\/(\d+)/);
        break;
    }
    return match ? match[1] : 'Unknown';
  }

  /**
   * Detect operating system
   */
  private static detectOS(ua: string): string {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS X')) return 'macOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown';
  }

  /**
   * Check if device is mobile
   */
  private static isMobileDevice(ua: string): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  }

  /**
   * Get recommended speech recognition method
   */
  private static getRecommendedMethod(
    browser: string,
    version: string,
    supportsWebSpeech: boolean
  ): 'web-speech' | 'azure-speech' {
    // Opera always uses Azure
    if (browser === 'Opera') return 'azure-speech';

    // Safari version check
    if (browser === 'Safari') {
      const versionNum = parseInt(version);
      if (isNaN(versionNum) || versionNum < 14) {
        return 'azure-speech';
      }
    }

    // Samsung Internet uses Azure
    if (browser === 'Samsung Internet') return 'azure-speech';

    // Firefox mobile uses Azure
    if (browser === 'Firefox' && this.isMobileDevice(navigator.userAgent)) {
      return 'azure-speech';
    }

    // If Web Speech is not supported, use Azure
    if (!supportsWebSpeech) return 'azure-speech';

    // Default to Web Speech for supported browsers
    return 'web-speech';
  }

  /**
   * Get user preference from localStorage
   */
  static getUserPreference(): 'web-speech' | 'azure-speech' | null {
    const preference = localStorage.getItem('voice_speech_method');
    if (preference === 'web-speech' || preference === 'azure-speech') {
      return preference;
    }
    return null;
  }

  /**
   * Save user preference to localStorage
   */
  static saveUserPreference(method: 'web-speech' | 'azure-speech'): void {
    localStorage.setItem('voice_speech_method', method);
  }

  /**
   * Get final speech method (considering user preference)
   */
  static getSpeechMethod(): 'web-speech' | 'azure-speech' {
    const preference = this.getUserPreference();
    if (preference) return preference;

    const deviceInfo = this.detect();
    return deviceInfo.recommendedMethod;
  }

  /**
   * Check if browser is Safari
   */
  static isSafari(): boolean {
    return this.detectBrowser(navigator.userAgent) === 'Safari';
  }

  /**
   * Check if browser is Opera
   */
  static isOpera(): boolean {
    return this.detectBrowser(navigator.userAgent) === 'Opera';
  }

  /**
   * Check if browser is Firefox Mobile
   */
  static isFirefoxMobile(): boolean {
    const ua = navigator.userAgent;
    return this.detectBrowser(ua) === 'Firefox' && this.isMobileDevice(ua);
  }

  /**
   * Check if browser is Samsung Internet
   */
  static isSamsungInternet(): boolean {
    return this.detectBrowser(navigator.userAgent) === 'Samsung Internet';
  }

  /**
   * Get Safari version number
   */
  static getSafariVersion(): number | null {
    const ua = navigator.userAgent;
    if (!this.isSafari()) return null;
    const version = this.detectVersion(ua, 'Safari');
    const versionNum = parseInt(version);
    return isNaN(versionNum) ? null : versionNum;
  }

  /**
   * Check if browser should use Azure Speech by default
   */
  static shouldUseAzureSpeech(): boolean {
    const deviceInfo = this.detect();
    return deviceInfo.recommendedMethod === 'azure-speech';
  }

  /**
   * Get detailed browser information string
   */
  static getBrowserInfo(): string {
    const deviceInfo = this.detect();
    return `${deviceInfo.browser} ${deviceInfo.version} on ${deviceInfo.os}${deviceInfo.isMobile ? ' (Mobile)' : ''}`;
  }
}
