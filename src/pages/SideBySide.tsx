import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OperatorView from '../operator/OperatorView';

/** Phone on the left (driver flow in an iframe), live operator view on the right. */
export default function SideBySide() {
  const [highlight, setHighlight] = useState<string | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'cicely:report-sent') setHighlight(e.data.id);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div className="flex h-dvh min-h-0 bg-cream">
      <aside className="flex w-[430px] shrink-0 flex-col items-center gap-3 bg-[#2a2a33] p-4">
        <Link to="/" className="self-start text-sm text-cream underline underline-offset-4">
          Back to the start
        </Link>
        <div className="h-full max-h-[864px] w-[390px] overflow-hidden rounded-[44px] border-[10px] border-[#111] bg-white shadow-2xl">
          <iframe title="Driver view in the Go app" src="/driver?bare=1" className="h-full w-full border-0" />
        </div>
      </aside>
      <div className="min-w-0 flex-1 overflow-auto">
        <OperatorView embedded highlightId={highlight} />
      </div>
    </div>
  );
}
