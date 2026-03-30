import { Href, Link } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string };

const isSafeExternalHref = (href: string) => href.startsWith('https://');

export function ExternalLink({ href, onPress, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (process.env.EXPO_OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          event.preventDefault();

          if (!isSafeExternalHref(href)) {
            if (__DEV__) {
              console.warn('Blocked non-https external link:', href);
            }
            onPress?.(event);
            return;
          }

          // Open the link in an in-app browser.
          try {
            await openBrowserAsync(href, {
              presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
            });
          } catch (err) {
            if (__DEV__) {
              console.warn('Failed to open external link:', href, err);
            }
          }
        }

        onPress?.(event);
      }}
    />
  );
}
