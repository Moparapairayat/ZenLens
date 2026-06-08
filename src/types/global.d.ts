import type React from 'react';

declare global {
  namespace JSX {
    type Element = React.ReactElement;
    interface ElementClass extends React.Component<unknown> {
      render(): React.ReactNode;
    }
    interface IntrinsicAttributes extends React.Attributes {}
    interface IntrinsicElements {
      [elemName: string]: unknown;
    }
  }
}
