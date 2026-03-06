/**
 * Type augmentation for @daily-co/daily-js
 *
 * Extends the Daily.co SDK type definitions to include properties and
 * config options used by this project that are missing or outdated
 * in the installed version of the package types.
 */

import '@daily-co/daily-js';

declare module '@daily-co/daily-js' {
  /**
   * Extend DailyAdvancedConfig to include the experimental Chrome
   * video-mute camera indicator light option. This was present in
   * older versions of the SDK but renamed/removed in newer type defs.
   * The runtime SDK still supports it.
   */
  interface DailyAdvancedConfig {
    experimentalChromeVideoMuteLightOff?: boolean;
  }
}
