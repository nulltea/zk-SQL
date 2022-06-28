import Head from 'next/head';
import { FC, memo } from 'react';
import { defaultMetaTags, dappHostname } from '../../config/constants';

export interface MetaHeadProps {
  metaTitle?: string;
  metaDescription?: string;
  metaImage?: string;
  metaUrl?: string;
}

export const MetaHead: FC<MetaHeadProps> = memo(
  ({ metaTitle, metaDescription, metaImage, metaUrl }) => {
    return (
      <Head>
        <title>{metaTitle || defaultMetaTags.title}</title>
        <meta
          name="description"
          content={metaDescription || defaultMetaTags.description}
        />
        <meta name="author" content="Timofey Luin"></meta>
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content={metaTitle || defaultMetaTags.title}
        />
        <meta
          property="og:description"
          content={metaDescription || defaultMetaTags.description}
        />
        <meta
          property="og:image"
          content={metaImage || defaultMetaTags.image}
        />
        <meta property="og:url" content={metaUrl || dappHostname} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={metaTitle || defaultMetaTags.title}
        />
        <meta
          name="twitter:description"
          content={metaDescription || defaultMetaTags.description}
        />
        <meta
          name="twitter:image"
          content={metaImage || defaultMetaTags.image}
        />
        <meta name="twitter:url" content={metaUrl || dappHostname} />
      </Head>
    );
  }
);

MetaHead.displayName = 'MetaHead';
