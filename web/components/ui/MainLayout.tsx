import { Container, Box } from '@chakra-ui/react';
import { FC, memo } from 'react';
import { MetaHead, MetaHeadProps } from './MetaHead';
import { Footer } from './Footer';

export const MainLayout: FC<MetaHeadProps> = memo(
  ({ children, metaTitle, metaDescription, metaImage, metaUrl }) => {
    return (
      <>
        <MetaHead
          metaTitle={metaTitle}
          metaDescription={metaDescription}
          metaImage={metaImage}
          metaUrl={metaUrl}
        />
        <Box minHeight="calc(100vh - 120px)" pb="10">
          <Container maxW="container.xl">
            <Box>{children}</Box>
          </Container>
        </Box>
        <Footer />
      </>
    );
  },
  (prev, next) =>
    prev.metaTitle === next.metaTitle &&
    prev.metaDescription === next.metaDescription &&
    prev.metaImage === next.metaImage &&
    prev.metaUrl === next.metaUrl
);

MainLayout.displayName = 'MainLayout';
