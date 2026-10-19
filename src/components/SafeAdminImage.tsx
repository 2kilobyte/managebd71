'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';
import { isAllowedAdminImageUrl } from '@/lib/adminImageUrl';

function isAllowedImageSource(src: ImageProps['src']): boolean {
  if (typeof src !== 'string' || (src.startsWith('/') && !src.startsWith('//'))) return true;
  return isAllowedAdminImageUrl(src);
}

export default function SafeAdminImage(props: ImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const sourceKey = typeof props.src === 'string' ? props.src : JSON.stringify(props.src) ?? 'static';
  const failed = failedSource === sourceKey;
  const allowed = isAllowedImageSource(props.src);

  if (!allowed || failed) {
    return (
      <div
        className={props.className}
        style={{
          width: typeof props.width === 'number' ? props.width : undefined,
          height: typeof props.height === 'number' ? props.height : undefined,
        }}
        aria-hidden="true"
      />
    );
  }

  return <Image {...props} alt={props.alt} onError={() => setFailedSource(sourceKey)} />;
}
