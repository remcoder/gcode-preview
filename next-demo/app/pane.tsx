import { PropsWithChildren } from 'react';
import classNames from 'classnames';

type PaneProps = {
  top?: boolean;
  left?: boolean;
  right?: boolean;
  bottom?: boolean;
};
export const Pane = ({ children, top, left, right, bottom }: PropsWithChildren<PaneProps>) => {
  return (
    <div
      className={classNames({
        pane: true,
        'is-top': top,
        'is-left': left,
        'is-right': right,
        'is-bottom': bottom
      })}
    >
      {children}
    </div>
  );
};
