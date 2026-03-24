/**
 * Responsive Design Utilities
 * Tailwind breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
 */

export const breakpoints = {
  mobile: 'max-w-md',
  tablet: 'max-w-lg',
  desktop: 'max-w-2xl',
  wide: 'max-w-4xl',
  full: 'max-w-full',
};

export const gridResponsive = {
  // 1 column on mobile, 2 on tablet, 3 on desktop, 4 on wide
  cols3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  // 1 column on mobile, 2 on tablet, 3 on desktop
  cols2: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  // 1 column on mobile, 2 on desktop
  cols1: 'grid-cols-1 lg:grid-cols-2',
};

export const textResponsive = {
  // Large heading: 24px mobile, 32px tablet, 40px desktop
  h1: 'text-2xl md:text-3xl lg:text-4xl',
  // Medium heading: 20px mobile, 24px tablet, 28px desktop
  h2: 'text-xl md:text-2xl lg:text-3xl',
  // Small heading: 18px mobile, 20px tablet, 24px desktop
  h3: 'text-lg md:text-xl lg:text-2xl',
  // Body: 14px mobile, 15px tablet, 16px desktop
  body: 'text-sm md:text-base lg:text-base',
};

export const spacingResponsive = {
  // Padding: 4px mobile, 8px tablet, 16px desktop
  p1: 'p-1 md:p-2 lg:p-4',
  // Padding: 8px mobile, 12px tablet, 24px desktop
  p2: 'p-2 md:p-3 lg:p-6',
  // Padding: 12px mobile, 16px tablet, 32px desktop
  p3: 'p-3 md:p-4 lg:p-8',
  // Gap: 8px mobile, 12px tablet, 16px desktop
  gap1: 'gap-2 md:gap-3 lg:gap-4',
  // Gap: 12px mobile, 16px tablet, 24px desktop
  gap2: 'gap-3 md:gap-4 lg:gap-6',
};

/**
 * Mobile-first responsive component wrapper
 */
export const createResponsiveComponent = (mobileClasses, tabletClasses, desktopClasses) => {
  return `${mobileClasses} md:${tabletClasses} lg:${desktopClasses}`;
};

/**
 * Check if viewport is mobile
 */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

/**
 * Check if viewport is tablet
 */
export const useIsTablet = () => {
  const [isTablet, setIsTablet] = React.useState(
    window.innerWidth >= 768 && window.innerWidth < 1024
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isTablet;
};

/**
 * Check if viewport is desktop
 */
export const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = React.useState(window.innerWidth >= 1024);

  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isDesktop;
};

/**
 * Get current viewport size
 */
export const useViewportSize = () => {
  const [size, setSize] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  React.useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
};
