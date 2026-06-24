import React from 'react';

interface StickyButtonProps {
  link: string;
  title: string;
  classNames: string;
}

const StickyButton: React.FC<StickyButtonProps> = ({ link, title, classNames }) => {
    return (
        <a href={link} className={classNames}>
            {title}
        </a>
    );
};

export default StickyButton;