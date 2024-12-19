import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
      <html lang="en">
      <head>
        {/* Add your meta tags and other head elements here */}
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Your App</title>
      </head>
      <body>
      {/* You can add global styles, a header, footer, or anything you want here */}
      {children}
      </body>
      </html>
  );
}
