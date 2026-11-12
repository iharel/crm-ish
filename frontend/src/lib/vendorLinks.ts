/** vendorLinks — deep links into each vendor's console for the setting being configured. */
export const VENDOR_LINKS = {
  googleCredentials: 'https://console.cloud.google.com/apis/credentials',
  googleOAuthConsent: 'https://console.cloud.google.com/auth/overview',
  googleEnableGmail: 'https://console.cloud.google.com/apis/library/gmail.googleapis.com',
  googleEnableCalendar: 'https://console.cloud.google.com/apis/library/calendar-json.googleapis.com',
  googlePubSubTopics: 'https://console.cloud.google.com/cloudpubsub/topic/list',
  anthropicKeys: 'https://console.anthropic.com/settings/keys',
  anthropicModels: 'https://docs.anthropic.com/en/docs/about-claude/models',
  voyageKeys: 'https://dashboard.voyageai.com/api-keys',
} as const
