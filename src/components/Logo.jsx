const logoSources = {
  word: 'brand/logo-word.png',
  symbol: 'brand/logo-symbol.png',
  wordSymbol: 'brand/logo-word-symbol.png',
};

const Logo = ({
  variant = 'wordSymbol',
  alt = 'OpenTo',
  className = '',
  ...props
}) => {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const src = `${baseUrl}${logoSources[variant] || logoSources.wordSymbol}`;
  const combinedClassName = ['logo', className].filter(Boolean).join(' ');

  return (
    <span className={combinedClassName} {...props}>
      <img src={src} alt={alt} />
    </span>
  );
};

export default Logo;
