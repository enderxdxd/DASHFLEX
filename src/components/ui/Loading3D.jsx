import { useMemo } from 'react';
import Lottie from 'lottie-react';
import Loader1 from '../../assets/Loader1.json';
import Loader2 from '../../assets/Loader2.json';
import Loader3 from '../../assets/Loader3.json';

const loaders = [Loader1, Loader2, Loader3];

export default function Loading3D({ 
  style, 
  size = 180, 
  speed = 1,
  className = '',
  autoplay = true,
  loop = true 
}) {
  const animationData = useMemo(() => {
    const idx = Math.floor(Math.random() * loaders.length);
    return loaders[idx];
  }, []);

  return (
    <div 
      className={`loading-3d ${className}`}
      style={{ 
        width: size, 
        height: size,
        margin: '0 auto', 
        ...style 
      }}
    >
      <Lottie 
        animationData={animationData} 
        loop={loop}
        autoplay={autoplay}
        speed={speed}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}