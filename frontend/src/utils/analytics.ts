// src/utils/analytics.ts
interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

class Analytics {
  private isProduction = process.env.NODE_ENV === 'production';

  track(event: AnalyticsEvent) {
    if (!this.isProduction) {
      console.log('Analytics Event:', event);
      return;
    }

    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value
      });
    }

    // Alternative: Facebook Pixel, Mixpanel, etc.
  }

  pageView(path: string) {
    if (!this.isProduction) {
      console.log('Page View:', path);
      return;
    }

    if (typeof gtag !== 'undefined') {
      gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: path
      });
    }
  }

  // Événements prédéfinis pour votre app
  letterCreated() {
    this.track({
      action: 'letter_created',
      category: 'engagement'
    });
  }

  letterCompleted() {
    this.track({
      action: 'letter_completed', 
      category: 'conversion'
    });
  }

  subscriptionStarted(plan: string) {
    this.track({
      action: 'subscription_started',
      category: 'revenue',
      label: plan
    });
  }

  aiGenerationUsed() {
    this.track({
      action: 'ai_generation_used',
      category: 'feature_usage'
    });
  }
}

export const analytics = new Analytics();