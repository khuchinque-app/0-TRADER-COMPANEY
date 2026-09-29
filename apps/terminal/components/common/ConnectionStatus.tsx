export default function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-1.5 h-1.5 ${isConnected ? 'bg-[var(--gain)]' : 'bg-[var(--loss)]'}`} />
      <span className="text-[var(--text-muted)] text-[10px]">
        {isConnected ? 'Engine Connected' : 'Disconnected'}
      </span>
    </div>
  );
}
