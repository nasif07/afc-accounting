export default function Skeleton({ count = 1, height = 'h-4', className = '' }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 rounded animate-pulse ${height} ${className}`}
          style={{ marginBottom: i < count - 1 ? '0.5rem' : '0' }}
        />
      ))}
    </>
  );
}
