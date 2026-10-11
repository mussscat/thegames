type NavigatorLike = { readonly vibrate?: unknown };

/** Vibration exists on Android browsers, not on iOS: the setting is hidden where it cannot work. */
export function canVibrate(nav: NavigatorLike | undefined = typeof navigator === 'undefined' ? undefined : navigator): boolean {
  return typeof nav?.vibrate === 'function';
}
