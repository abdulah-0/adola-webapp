// Web Optimizations Component - Handles web-specific features and optimizations
import React, { useEffect } from 'react';
import { Platform } from 'react-native';

interface WebOptimizationsProps {
  children: React.ReactNode;
}

export default function WebOptimizations({ children }: WebOptimizationsProps) {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Add web-specific optimizations
      setupWebOptimizations();
      setupPWAFeatures();
      setupSEOOptimizations();
    }
  }, []);

  const setupWebOptimizations = () => {
    // Disable context menu on right click for better app-like experience
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Disable text selection for better app-like experience
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    // Disable drag and drop
    document.addEventListener('dragstart', (e) => {
      e.preventDefault();
    });

    // Add app-loaded class to hide loading screen
    setTimeout(() => {
      document.body.classList.add('app-loaded');
    }, 1000);

    // Optimize for mobile web
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
      );
    }
  };

  const setupPWAFeatures = () => {
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }

    // Handle PWA install prompt
    let deferredPrompt: any;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install button or banner
      showInstallPrompt(deferredPrompt);
    });

    // Handle PWA installation
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      deferredPrompt = null;
    });
  };

  const setupSEOOptimizations = () => {
    // Dynamic meta tag updates based on current page
    const updateMetaTags = () => {
      const path = window.location.pathname;
      let title = 'Adola Gaming Platform';
      let description = 'Complete mobile gaming platform with 19 casino games, secure payments, and referral system';

      // Update title and description based on current route
      switch (path) {
        case '/games':
          title = 'Games - Adola Gaming Platform';
          description = '19 exciting casino games including Aviator, Crash, Dice, Slots, and more';
          break;
        case '/wallet':
          title = 'Wallet - Adola Gaming Platform';
          description = 'Secure wallet with deposits, withdrawals, and transaction history';
          break;
        case '/admin':
          title = 'Admin Dashboard - Adola Gaming Platform';
          description = 'Administrative dashboard for managing users, transactions, and games';
          break;
      }

      document.title = title;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      }

      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', title);
      }

      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', description);
      }
    };

    // Update meta tags on route change
    updateMetaTags();
    window.addEventListener('popstate', updateMetaTags);
  };

  const showInstallPrompt = (deferredPrompt: any) => {
    // Create install prompt UI
    const installBanner = document.createElement('div');
    installBanner.id = 'install-banner';
    installBanner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(45deg, #00FFFF, #FFD700);
      color: #000;
      padding: 12px 16px;
      text-align: center;
      font-weight: bold;
      z-index: 10000;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    installBanner.innerHTML = `
      <span>🎮 Install Adola Gaming for the best experience!</span>
      <div>
        <button id="install-btn" style="background: #000; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; margin-right: 8px; cursor: pointer;">Install</button>
        <button id="dismiss-btn" style="background: transparent; border: 1px solid #000; padding: 8px 12px; border-radius: 4px; cursor: pointer;">×</button>
      </div>
    `;

    document.body.appendChild(installBanner);

    // Handle install button click
    const installBtn = document.getElementById('install-btn');
    installBtn?.addEventListener('click', () => {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        deferredPrompt = null;
        installBanner.remove();
      });
    });

    // Handle dismiss button click
    const dismissBtn = document.getElementById('dismiss-btn');
    dismissBtn?.addEventListener('click', () => {
      installBanner.remove();
    });

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (installBanner.parentNode) {
        installBanner.remove();
      }
    }, 10000);
  };

  // Only render children, optimizations are handled in useEffect
  return <>{children}</>;
}

// Web-specific utility functions
export const webUtils = {
  // Check if running on web
  isWeb: () => Platform.OS === 'web',

  // Check if PWA is installed
  isPWA: () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  },

  // Get device type for responsive design
  getDeviceType: () => {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  },

  // Copy text to clipboard
  copyToClipboard: async (text: string) => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  },

  // Share content (Web Share API)
  share: async (data: { title?: string; text?: string; url?: string }) => {
    if (navigator.share) {
      await navigator.share(data);
    } else {
      // Fallback to copying URL
      await webUtils.copyToClipboard(data.url || window.location.href);
      alert('Link copied to clipboard!');
    }
  },

  // Vibrate (if supported)
  vibrate: (pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  },

  // Full screen API
  requestFullscreen: () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
      (elem as any).msRequestFullscreen();
    }
  },

  exitFullscreen: () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  }
};
